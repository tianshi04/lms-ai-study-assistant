import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { ForumService, type ForumThread } from "@/gen/forum/v1/forum_pb";

export function useForumThreadsQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<ForumThread[], Error>>,
) {
  return useQuery<ForumThread[], Error>({
    queryKey: ["forumThreads", courseId],
    queryFn: async () => {
      const client = getRpcClient(ForumService);
      const res = await client.listThreads({ courseId });
      return res.threads;
    },
    enabled: !!courseId,
    ...options,
  });
}
