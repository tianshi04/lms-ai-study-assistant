import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  IdentityService,
  InvitationType,
  InvitationStatus,
  type InvitationAction,
  type User,
  type EnterpriseSeat,
  type InstructorApplication,
  type OrganizationMemberDetail,
  type UserOrganizationDetail,
  type Invitation,
} from "@/gen/identity/v1/identity_pb";

/**
 * Custom TanStack Query hook for fetching current user profile.
 */
export function useUserProfileQuery(
  userId?: string,
  options?: Partial<UseQueryOptions<User, Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<User, Error>({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID provided");
      const client = getRpcClient(IdentityService);
      const res = await client.getUserProfile({ userId });
      if (!res.user) throw new Error("User profile not found");
      return res.user;
    },
    ...options,
    enabled: isAuthenticated && !!userId && (options?.enabled ?? true),
  });
}

/**
 * Custom TanStack Mutation hook for assigning enterprise seat key.
 */
export function useSaveEnterpriseKeyMutation(
  options?: Partial<
    UseMutationOptions<
      { success: boolean; message: string },
      Error,
      { userId: string; enterpriseSeatKey: string }
    >
  >,
) {
  return useMutation<
    { success: boolean; message: string },
    Error,
    { userId: string; enterpriseSeatKey: string }
  >({
    mutationFn: async ({ userId, enterpriseSeatKey }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.assignEnterpriseSeat({ userId, enterpriseSeatKey });
      return { success: res.success, message: res.message };
    },
    ...options,
  });
}

export function useEnterpriseSeatsQuery(
  options?: Partial<UseQueryOptions<EnterpriseSeat[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<EnterpriseSeat[], Error>({
    queryKey: ["enterpriseSeats"],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listEnterpriseSeats({});
      return res.seats;
    },
    ...options,
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

/**
 * Custom TanStack Mutation hook for revoking enterprise seat.
 */
export function useRevokeEnterpriseSeatMutation(
  options?: Partial<
    UseMutationOptions<{ success: boolean; message: string }, Error, { userId: string }>
  >,
) {
  return useMutation<{ success: boolean; message: string }, Error, { userId: string }>({
    mutationFn: async ({ userId }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.revokeEnterpriseSeat({ userId });
      return { success: res.success, message: res.message };
    },
    ...options,
  });
}

export function useUpdateInstructorProfileMutation(
  options?: Partial<
    UseMutationOptions<User | undefined, Error, { title: string; signatureImageUrl: string }>
  >,
) {
  return useMutation<User | undefined, Error, { title: string; signatureImageUrl: string }>({
    mutationFn: async ({ title, signatureImageUrl }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.updateInstructorProfile({ title, signatureImageUrl });
      return res.user;
    },
    ...options,
  });
}

export function useSubmitInstructorApplicationMutation(
  options?: Partial<
    UseMutationOptions<
      void,
      Error,
      {
        title: string;
        bio: string;
        linkedinUrl?: string;
        cvUrl?: string;
        demoVideoUrl?: string;
      }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      title: string;
      bio: string;
      linkedinUrl?: string;
      cvUrl?: string;
      demoVideoUrl?: string;
    }
  >({
    mutationFn: async ({ title, bio, linkedinUrl, cvUrl, demoVideoUrl }) => {
      const client = getRpcClient(IdentityService);
      await client.submitInstructorApplication({
        title,
        bio,
        linkedinUrl: linkedinUrl || "",
        cvUrl: cvUrl || "",
        demoVideoUrl: demoVideoUrl || "",
      });
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["myInstructorApplication"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useMyInstructorApplicationQuery(
  options?: Partial<UseQueryOptions<InstructorApplication | null, Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<InstructorApplication | null, Error>({
    queryKey: ["myInstructorApplication"],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.getMyInstructorApplication({});
      return res.application ?? null;
    },
    ...options,
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

export function useListInstructorApplicationsQuery(
  statusFilter: string = "",
  options?: Partial<UseQueryOptions<InstructorApplication[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<InstructorApplication[], Error>({
    queryKey: ["instructorApplications", statusFilter],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listInstructorApplications({ statusFilter });
      return res.applications || [];
    },
    ...options,
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

export function useReviewInstructorApplicationMutation(
  options?: Partial<
    UseMutationOptions<
      InstructorApplication | undefined,
      Error,
      { applicationId: string; approve: boolean; rejectionReason?: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    InstructorApplication | undefined,
    Error,
    { applicationId: string; approve: boolean; rejectionReason?: string }
  >({
    mutationFn: async ({ applicationId, approve, rejectionReason }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.reviewInstructorApplication({
        applicationId,
        approve,
        rejectionReason: rejectionReason || "",
      });
      return res.application;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["instructorApplications"] });
      queryClient.invalidateQueries({ queryKey: ["myInstructorApplication"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useOrganizationMembersQuery(
  organizationId: string = "org_default",
  options?: Partial<UseQueryOptions<OrganizationMemberDetail[], Error>>,
) {
  return useQuery<OrganizationMemberDetail[], Error>({
    queryKey: ["organizationMembers", organizationId],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listOrganizationMembers({ organizationId });
      return res.members || [];
    },
    enabled: !!organizationId,
    ...options,
  });
}

export function useAddOrganizationMemberMutation(
  options?: Partial<
    UseMutationOptions<
      OrganizationMemberDetail,
      Error,
      { email: string; roleId: string; organizationId?: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    OrganizationMemberDetail,
    Error,
    { email: string; roleId: string; organizationId?: string }
  >({
    mutationFn: async ({ email, roleId, organizationId = "org_default" }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.addOrganizationMember({
        email,
        roleId,
        organizationId,
      });
      if (!res.member) {
        throw new Error("Không thể thêm thành viên");
      }
      return res.member;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      const orgId = variables.organizationId || "org_default";
      queryClient.invalidateQueries({ queryKey: ["organizationMembers", orgId] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useRemoveOrganizationMemberMutation(
  options?: Partial<
    UseMutationOptions<boolean, Error, { userId: string; organizationId?: string }>
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { userId: string; organizationId?: string }>({
    mutationFn: async ({ userId, organizationId = "org_default" }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.removeOrganizationMember({
        userId,
        organizationId,
      });
      return res.success;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      const orgId = variables.organizationId || "org_default";
      queryClient.invalidateQueries({ queryKey: ["organizationMembers", orgId] });
      queryClient.invalidateQueries({ queryKey: ["organizationAuditLogs", orgId] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useListOrganizationAuditLogsQuery(organizationId: string) {
  return useQuery({
    queryKey: ["organizationAuditLogs", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const client = getRpcClient(IdentityService);
      const res = await client.listOrganizationAuditLogs({ organizationId });
      return res.logs;
    },
    enabled: Boolean(organizationId),
  });
}

export function useMyInvitationsQuery(
  statusFilter?: InvitationStatus,
  options?: Partial<UseQueryOptions<Invitation[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<Invitation[], Error>({
    queryKey: ["myInvitations", statusFilter],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listMyInvitations({
        statusFilter: statusFilter ?? InvitationStatus.UNSPECIFIED,
      });
      return res.invitations || [];
    },
    enabled: isAuthenticated && (options?.enabled ?? true),
    ...options,
  });
}

export function useSentInvitationsQuery(
  type?: InvitationType,
  targetId?: string,
  options?: Partial<UseQueryOptions<Invitation[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<Invitation[], Error>({
    queryKey: ["sentInvitations", type, targetId],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listSentInvitations({
        type: type ?? InvitationType.UNSPECIFIED,
        targetId: targetId ?? "",
      });
      return res.invitations || [];
    },
    enabled: isAuthenticated && (options?.enabled ?? true),
    ...options,
  });
}

export function useGetInvitationByTokenQuery(
  token: string,
  options?: Partial<UseQueryOptions<Invitation | null, Error>>,
) {
  return useQuery<Invitation | null, Error>({
    queryKey: ["invitationByToken", token],
    queryFn: async () => {
      if (!token) return null;
      const client = getRpcClient(IdentityService);
      const res = await client.getInvitationByToken({ token });
      return res.invitation ?? null;
    },
    enabled: !!token && (options?.enabled ?? true),
    ...options,
  });
}

export function useCreateInvitationMutation(
  options?: UseMutationOptions<
    Invitation,
    Error,
    {
      type: InvitationType;
      inviteeEmail: string;
      targetId: string;
      targetName?: string;
      roleId?: string;
      message?: string;
    }
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars) => {
      const client = getRpcClient(IdentityService);
      const res = await client.createInvitation({
        type: vars.type,
        inviteeEmail: vars.inviteeEmail,
        targetId: vars.targetId,
        targetName: vars.targetName ?? "",
        roleId: vars.roleId ?? "",
        message: vars.message ?? "",
      });
      if (!res.invitation) throw new Error("Không thể khởi tạo lời mời.");
      return res.invitation;
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["sentInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["myInvitations"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
    ...options,
  });
}

export function useRespondToInvitationMutation(
  options?: UseMutationOptions<
    { invitation: Invitation | null; success: boolean; message: string },
    Error,
    { invitationId: string; action: InvitationAction; token?: string }
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars) => {
      const client = getRpcClient(IdentityService);
      const res = await client.respondToInvitation({
        invitationId: vars.invitationId,
        action: vars.action,
        token: vars.token ?? "",
      });
      return {
        invitation: res.invitation ?? null,
        success: res.success,
        message: res.message,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["organizationMembers"] });
      queryClient.invalidateQueries({ queryKey: ["myEnrolledCourses"] });
    },
    ...options,
  });
}

export function useCancelInvitationMutation(
  options?: UseMutationOptions<boolean, Error, { invitationId: string }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitationId }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.cancelInvitation({ invitationId });
      return res.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentInvitations"] });
    },
    ...options,
  });
}

export function useMyOrganizationsQuery(
  options?: Partial<UseQueryOptions<UserOrganizationDetail[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<UserOrganizationDetail[], Error>({
    queryKey: ["myOrganizations"],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listMyOrganizations({});
      return res.organizations || [];
    },
    enabled: isAuthenticated && (options?.enabled ?? true),
    ...options,
  });
}
