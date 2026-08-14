import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { PartnerService, type Partner } from "@/gen/partner/v1/partner_pb";

export function usePartnersQuery(options?: Partial<UseQueryOptions<Partner[], Error>>) {
  return useQuery<Partner[], Error>({
    queryKey: ["partners"],
    queryFn: async () => {
      const client = getRpcClient(PartnerService);
      const res = await client.listPartners({});
      return res.partners || [];
    },
    ...options,
  });
}

export function usePartnerDetailQuery(
  partnerId: string,
  options?: Partial<UseQueryOptions<Partner | null, Error>>,
) {
  return useQuery<Partner | null, Error>({
    queryKey: ["partnerDetail", partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const client = getRpcClient(PartnerService);
      const res = await client.getPartner({ id: partnerId });
      return res.partner ?? null;
    },
    enabled: !!partnerId,
    ...options,
  });
}

export interface CreatePartnerInput {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  websiteUrl: string;
  allowedDomains: string[];
  signatureImageUrl: string;
  signerName: string;
  signerTitle: string;
  publicKeyPem: string;
}

export function useCreatePartnerMutation(
  options?: Partial<UseMutationOptions<Partner | undefined, Error, CreatePartnerInput>>,
) {
  const queryClient = useQueryClient();
  return useMutation<Partner | undefined, Error, CreatePartnerInput>({
    mutationFn: async (input) => {
      const client = getRpcClient(PartnerService);
      const res = await client.createPartner(input);
      return res.partner;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export interface UpdatePartnerInput {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  websiteUrl: string;
  allowedDomains: string[];
  signatureImageUrl: string;
  signerName: string;
  signerTitle: string;
  publicKeyPem: string;
}

export function useUpdatePartnerMutation(
  options?: Partial<UseMutationOptions<Partner | undefined, Error, UpdatePartnerInput>>,
) {
  const queryClient = useQueryClient();
  return useMutation<Partner | undefined, Error, UpdatePartnerInput>({
    mutationFn: async (input) => {
      const client = getRpcClient(PartnerService);
      const res = await client.updatePartner(input);
      return res.partner;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useDeletePartnerMutation(
  options?: Partial<UseMutationOptions<boolean, Error, { id: string }>>,
) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const client = getRpcClient(PartnerService);
      const res = await client.deletePartner({ id });
      return res.success;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useRotatePartnerKeyPairMutation(
  options?: Partial<UseMutationOptions<string, Error, { partnerId: string }>>,
) {
  return useMutation<string, Error, { partnerId: string }>({
    mutationFn: async ({ partnerId }) => {
      const client = getRpcClient(PartnerService);
      const res = await client.rotatePartnerKeyPair({ partnerId });
      return res.publicKeyPem;
    },
    ...options,
  });
}
