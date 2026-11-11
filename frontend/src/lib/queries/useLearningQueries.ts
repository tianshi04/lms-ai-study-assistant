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
  LearningService,
  type LearningProgress,
  type PersonalNote,
  type EnrolledCourseSummary,
  type GetLearningStreakResponse,
  type RecordLearningTimeResponse,
  type GetAdminLearningStatsResponse,
} from "@/gen/learning/v1/learning_pb";

/**
 * Super Admin enrollment and completion KPIs owned by the Learning bounded context.
 */
export function useAdminLearningStatsQuery(
  options?: Partial<UseQueryOptions<GetAdminLearningStatsResponse, Error>>,
) {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  return useQuery<GetAdminLearningStatsResponse, Error>({
    queryKey: ["adminLearningStats"],
    queryFn: async () => {
      const client = getRpcClient(LearningService);
      return client.getAdminLearningStats({});
    },
    staleTime: 60 * 1000,
    ...options,
    enabled: isAuthenticated && isSuperAdmin && (options?.enabled ?? true),
  });
}

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
  optionsOrCurrentItemId?: string | Partial<UseQueryOptions<LearningProgress | null, Error>>,
  maybeOptions?: Partial<UseQueryOptions<LearningProgress | null, Error>>,
) {
  const currentItemId =
    typeof optionsOrCurrentItemId === "string" ? optionsOrCurrentItemId : undefined;
  const options =
    typeof optionsOrCurrentItemId === "object" ? optionsOrCurrentItemId : maybeOptions;

  return useQuery<LearningProgress | null, Error>({
    queryKey: ["learningProgress", courseId, currentItemId],
    queryFn: async () => {
      const client = getRpcClient(LearningService);
      const res = await client.getProgress({
        courseId,
        currentItemId: currentItemId || "",
      });
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

export interface SavePersonalNoteInput {
  courseId: string;
  itemId: string;
  highlightedText: string;
  noteComment?: string;
  timestampSeconds?: number;
}

export function useSavePersonalNoteMutation(
  options?: Partial<UseMutationOptions<PersonalNote, Error, SavePersonalNoteInput>>,
) {
  const queryClient = useQueryClient();
  return useMutation<PersonalNote, Error, SavePersonalNoteInput>({
    mutationFn: async (input) => {
      const client = getRpcClient(LearningService);
      const res = await client.savePersonalNote({
        courseId: input.courseId,
        itemId: input.itemId,
        highlightedText: input.highlightedText,
        noteComment: input.noteComment || "",
        timestampSeconds: input.timestampSeconds ?? 0,
      });
      if (!res.note) throw new Error("Không thể lưu ghi chú");
      return res.note;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["personalNotes", variables.courseId] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useDeletePersonalNoteMutation(
  options?: Partial<UseMutationOptions<boolean, Error, { noteId: string; courseId: string }>>,
) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { noteId: string; courseId: string }>({
    mutationFn: async ({ noteId }) => {
      const client = getRpcClient(LearningService);
      const res = await client.deletePersonalNote({ noteId });
      return res.success;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["personalNotes", variables.courseId] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useLearningStreakQuery(
  options?: Partial<UseQueryOptions<GetLearningStreakResponse, Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<GetLearningStreakResponse, Error>({
    queryKey: ["learningStreak"],
    queryFn: async () => {
      const client = getRpcClient(LearningService);
      const clientTimezone =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "Asia/Ho_Chi_Minh";
      return await client.getLearningStreak({ clientTimezone });
    },
    enabled: isAuthenticated && (options?.enabled ?? true),
    ...options,
  });
}

export interface RecordLearningTimeInput {
  courseId: string;
  itemId: string;
  deltaSeconds: number;
}

export function useRecordLearningTimeMutation(
  options?: Partial<UseMutationOptions<RecordLearningTimeResponse, Error, RecordLearningTimeInput>>,
) {
  const queryClient = useQueryClient();
  return useMutation<RecordLearningTimeResponse, Error, RecordLearningTimeInput>({
    mutationFn: async ({ courseId, itemId, deltaSeconds }) => {
      const client = getRpcClient(LearningService);
      const clientTimezone =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "Asia/Ho_Chi_Minh";
      return await client.recordLearningTime({
        courseId,
        itemId,
        deltaSeconds,
        clientTimezone,
      });
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["learningStreak"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}
