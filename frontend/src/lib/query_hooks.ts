import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";
import { IdentityService, type User, type EnterpriseSeat } from "@/gen/identity/v1/identity_pb";

/**
 * Custom TanStack Query hook for fetching the course catalog.
 */
export function useCoursesQuery(options?: Partial<UseQueryOptions<Course[], Error>>) {
  return useQuery<Course[], Error>({
    queryKey: ["courses"],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      const res = await client.listCourses({});
      return res.courses;
    },
    ...options,
  });
}

/**
 * Custom TanStack Query hook for fetching current user profile.
 */
export function useUserProfileQuery(userId?: string, options?: Partial<UseQueryOptions<User, Error>>) {
  return useQuery<User, Error>({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID provided");
      const client = getRpcClient(IdentityService);
      const res = await client.getUserProfile({ userId });
      if (!res.user) throw new Error("User profile not found");
      return res.user;
    },
    enabled: !!userId,
    ...options,
  });
}

/**
 * Custom TanStack Mutation hook for assigning enterprise seat key.
 */
export function useSaveEnterpriseKeyMutation(
  options?: Partial<UseMutationOptions<{ success: boolean; message: string }, Error, { userId: string; enterpriseSeatKey: string }>>
) {
  return useMutation<{ success: boolean; message: string }, Error, { userId: string; enterpriseSeatKey: string }>({
    mutationFn: async ({ userId, enterpriseSeatKey }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.assignEnterpriseSeat({ userId, enterpriseSeatKey });
      return { success: res.success, message: res.message };
    },
    ...options,
  });
}
export function useEnterpriseSeatsQuery(options?: Partial<UseQueryOptions<EnterpriseSeat[], Error>>) {
  return useQuery<EnterpriseSeat[], Error>({
    queryKey: ["enterpriseSeats"],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listEnterpriseSeats({});
      return res.seats;
    },
    ...options,
  });
}

