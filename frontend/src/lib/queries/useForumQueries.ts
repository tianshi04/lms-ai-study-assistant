import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { ForumService, ThreadResolutionFilter, type ForumThread } from "@/gen/forum/v1/forum_pb";

export interface ForumThreadsQueryFilters {
  itemId?: string;
  searchQuery?: string;
  resolutionFilter?: ThreadResolutionFilter;
}

export function useForumThreadsQuery(
  courseId: string,
  filters?: ForumThreadsQueryFilters,
  options?: Partial<UseQueryOptions<ForumThread[], Error>>,
) {
  const itemId = filters?.itemId ?? "";
  const searchQuery = filters?.searchQuery ?? "";
  const resolutionFilter = filters?.resolutionFilter ?? ThreadResolutionFilter.UNSPECIFIED;

  return useQuery<ForumThread[], Error>({
    queryKey: ["forumThreads", courseId, itemId, searchQuery, resolutionFilter],
    queryFn: async () => {
      const client = getRpcClient(ForumService);
      const res = await client.listThreads({
        courseId: courseId.toUpperCase() === "ALL" ? "" : courseId,
        itemId,
        searchQuery,
        resolutionFilter,
      });
      return res.threads;
    },
    enabled: Boolean(courseId),
    ...options,
  });
}
