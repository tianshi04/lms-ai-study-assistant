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
  NotificationService,
  type NotificationItem,
  type NotificationCategory,
  type NotificationPreferences,
} from "@/gen/notification/v1/notification_pb";

/**
 * Fetch notifications list for current user.
 */
export function useNotificationsQuery(
  categoryFilter?: NotificationCategory,
  unreadOnly?: boolean,
  pageSize?: number,
  pageToken?: string,
  options?: Partial<
    UseQueryOptions<
      { notifications: NotificationItem[]; unreadCount: number; nextPageToken: string },
      Error
    >
  >,
) {
  const { userId, isAuthenticated } = useAuth();
  return useQuery<
    { notifications: NotificationItem[]; unreadCount: number; nextPageToken: string },
    Error
  >({
    queryKey: ["notifications", userId, categoryFilter, unreadOnly, pageSize, pageToken],
    queryFn: async () => {
      const client = getRpcClient(NotificationService);
      const res = await client.listNotifications({
        categoryFilter: categoryFilter ?? 0,
        unreadOnly: unreadOnly ?? false,
        pageSize: pageSize ?? 20,
        pageToken: pageToken ?? "",
      });
      return {
        notifications: res.notifications || [],
        unreadCount: res.unreadCount || 0,
        nextPageToken: res.nextPageToken || "",
      };
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
    ...options,
  });
}

/**
 * Fetch unread notifications count for badge counter.
 */
export function useUnreadCountQuery(options?: Partial<UseQueryOptions<number, Error>>) {
  const { userId, isAuthenticated } = useAuth();
  return useQuery<number, Error>({
    queryKey: ["unreadNotificationCount", userId],
    queryFn: async () => {
      const client = getRpcClient(NotificationService);
      const res = await client.getUnreadCount({});
      return res.unreadCount || 0;
    },
    enabled: isAuthenticated,
    refetchInterval: 15000,
    ...options,
  });
}

/**
 * Mutation to mark specific notification IDs as read.
 */
export function useMarkAsReadMutation(
  options?: Partial<
    UseMutationOptions<{ success: boolean; updatedCount: number }, Error, string[]>
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; updatedCount: number }, Error, string[]>({
    mutationFn: async (notificationIds: string[]) => {
      const client = getRpcClient(NotificationService);
      const res = await client.markAsRead({ notificationIds });
      return { success: res.success, updatedCount: res.updatedCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
    ...options,
  });
}

/**
 * Mutation to mark all notifications as read.
 */
export function useMarkAllAsReadMutation(
  options?: Partial<
    UseMutationOptions<
      { success: boolean; updatedCount: number },
      Error,
      NotificationCategory | undefined
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; updatedCount: number },
    Error,
    NotificationCategory | undefined
  >({
    mutationFn: async (categoryFilter?: NotificationCategory) => {
      const client = getRpcClient(NotificationService);
      const res = await client.markAllAsRead({ categoryFilter: categoryFilter ?? 0 });
      return { success: res.success, updatedCount: res.updatedCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
    ...options,
  });
}

/**
 * Fetch notification preferences for current user.
 */
export function useNotificationPreferencesQuery(
  options?: Partial<UseQueryOptions<NotificationPreferences | null, Error>>,
) {
  const { userId, isAuthenticated } = useAuth();
  return useQuery<NotificationPreferences | null, Error>({
    queryKey: ["notificationPreferences", userId],
    queryFn: async () => {
      const client = getRpcClient(NotificationService);
      const res = await client.getNotificationPreferences({});
      return res.preferences ?? null;
    },
    enabled: isAuthenticated,
    ...options,
  });
}

/**
 * Mutation to update notification preferences.
 */
export function useUpdateNotificationPreferencesMutation(
  options?: Partial<
    UseMutationOptions<NotificationPreferences | null, Error, NotificationPreferences>
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<NotificationPreferences | null, Error, NotificationPreferences>({
    mutationFn: async (preferences: NotificationPreferences) => {
      const client = getRpcClient(NotificationService);
      const res = await client.updateNotificationPreferences({ preferences });
      return res.preferences ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPreferences"] });
    },
    ...options,
  });
}
