import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  LearningService,
  type LearningProgress,
  type PersonalNote,
  type EnrolledCourseSummary,
} from "@/gen/learning/v1/learning_pb";

export function useMyEnrolledCoursesQuery(
  options?: Partial<UseQueryOptions<EnrolledCourseSummary[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<EnrolledCourseSummary[], Error>({
    queryKey: ["myEnrolledCourses"],
    queryFn: async () => {
      const client = getRpcClient(LearningService);
      const res = await client.listMyEnrolledCourses({});
      return res.courses || [];
    },
    ...options,
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

export function useLearningProgressQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<LearningProgress | null, Error>>,
) {
  return useQuery<LearningProgress | null, Error>({
    queryKey: ["learningProgress", courseId],
    queryFn: async () => {
      const client = getRpcClient(LearningService);
      const res = await client.getProgress({ courseId });
      return res.progress ?? null;
    },
    enabled: !!courseId,
    ...options,
  });
}

export function usePersonalNotesQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<PersonalNote[], Error>>,
) {
  return useQuery<PersonalNote[], Error>({
    queryKey: ["personalNotes", courseId],
    queryFn: async () => {
      const client = getRpcClient(LearningService);
      const res = await client.listPersonalNotes({ courseId });
      return res.notes;
    },
    enabled: !!courseId,
    ...options,
  });
}
