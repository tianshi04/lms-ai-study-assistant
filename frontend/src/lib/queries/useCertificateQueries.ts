import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  CertificateService,
  type AdminCertificateStatusFilter,
  type GetAdminCertificateStatsResponse,
  type GetAdminCertificateTrendResponse,
  type ListAdminCertificatesResponse,
  type VerifiedCertificate,
} from "@/gen/certificate/v1/certificate_pb";

/**
 * Super Admin certificate and financial-aid KPIs owned by the Certificate bounded context.
 */
export function useAdminCertificateStatsQuery(
  options?: Partial<UseQueryOptions<GetAdminCertificateStatsResponse, Error>>,
) {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  return useQuery<GetAdminCertificateStatsResponse, Error>({
    queryKey: ["adminCertificateStats"],
    queryFn: async () => {
      const client = getRpcClient(CertificateService);
      return client.getAdminCertificateStats({});
    },
    staleTime: 60 * 1000,
    ...options,
    enabled: isAuthenticated && isSuperAdmin && (options?.enabled ?? true),
  });
}

/**
 * Daily issued certificate count trend for the Admin Dashboard.
 */
export function useAdminCertificateTrendQuery(
  days: number,
  options?: Partial<UseQueryOptions<GetAdminCertificateTrendResponse, Error>>,
) {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  return useQuery<GetAdminCertificateTrendResponse, Error>({
    queryKey: ["adminCertificateTrend", days],
    queryFn: async () => {
      const client = getRpcClient(CertificateService);
      return client.getAdminCertificateTrend({ days });
    },
    staleTime: 60 * 1000,
    ...options,
    enabled: isAuthenticated && isSuperAdmin && (options?.enabled ?? true),
  });
}

export interface AdminCertificatesParams {
  /** 1-based page number. */
  page: number;
  pageSize: number;
  searchQuery: string;
  status: AdminCertificateStatusFilter;
}

/**
 * Paginated certificates for the Super Admin dashboard (valid first, then revoked),
 * with optional search (id / learner / course) and valid-or-revoked filter.
 * The previous page stays on screen while the next one loads.
 */
export function useAdminCertificatesQuery({
  page,
  pageSize,
  searchQuery,
  status,
}: AdminCertificatesParams) {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  return useQuery<ListAdminCertificatesResponse, Error>({
    queryKey: ["adminCertificates", page, pageSize, searchQuery, status],
    queryFn: async () => {
      const client = getRpcClient(CertificateService);
      return client.listAdminCertificates({ page, pageSize, searchQuery, status });
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    enabled: isAuthenticated && isSuperAdmin,
  });
}

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
      queryClient.invalidateQueries({ queryKey: ["adminCertificateStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminCertificates"] });
      queryClient.invalidateQueries({ queryKey: ["certificate", variables.certificateId] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}
