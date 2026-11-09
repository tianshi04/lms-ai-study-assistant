import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { useAuth } from "@/components/providers/AuthProvider";
import { CertificateService, type VerifiedCertificate } from "@/gen/certificate/v1/certificate_pb";

export function useCertificateVerificationQuery(
  certificateId: string,
  options?: Partial<
    UseQueryOptions<{ isValid: boolean; cert?: VerifiedCertificate; message: string }, Error>
  >,
) {
  return useQuery<{ isValid: boolean; cert?: VerifiedCertificate; message: string }, Error>({
    queryKey: ["certificate", certificateId],
    queryFn: async () => {
      const client = getRpcClient(CertificateService);
      const res = await client.verifyCertificatePublic({ certificateId });
      return { isValid: res.isValid, cert: res.certificate, message: res.statusMessage };
    },
    enabled: !!certificateId,
    ...options,
  });
}

/**
 * Custom TanStack Query hook for fetching and caching the user's verified certificates.
 */
export function useMyCertificatesQuery(
  options?: Partial<UseQueryOptions<VerifiedCertificate[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<VerifiedCertificate[], Error>({
    queryKey: ["myCertificates"],
    queryFn: async () => {
      const client = getRpcClient(CertificateService);
      const res = await client.listMyCertificates({});
      return res.certificates || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

/**
 * Custom TanStack Mutation hook for revoking a verified certificate (Super Admin only).
 */
export function useRevokeCertificateMutation(
  options?: Partial<
    UseMutationOptions<
      { success: boolean; message: string },
      Error,
      { certificateId: string; reason: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; message: string },
    Error,
    { certificateId: string; reason: string }
  >({
    mutationFn: async ({ certificateId, reason }) => {
      const client = getRpcClient(CertificateService);
      const res = await client.revokeCertificate({ certificateId, reason });
      return { success: res.success, message: res.message };
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["adminDashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminCertificates"] });
      queryClient.invalidateQueries({ queryKey: ["certificate", variables.certificateId] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}
