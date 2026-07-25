import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";
import { IdentityService, type User, type EnterpriseSeat } from "@/gen/identity/v1/identity_pb";
import { LearningService, type LearningProgress, type PersonalNote } from "@/gen/learning/v1/learning_pb";
import { AssessmentService, type QuizResult, type AutoGradedLabResult } from "@/gen/assessment/v1/assessment_pb";
import { CertificateService, type VerifiedCertificate } from "@/gen/certificate/v1/certificate_pb";
import { ForumService, type ForumThread } from "@/gen/forum/v1/forum_pb";

// --- Catalog Hooks ---

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

// --- Identity Hooks ---

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

/**
 * Custom TanStack Mutation hook for revoking enterprise seat.
 */
export function useRevokeEnterpriseSeatMutation(
  options?: Partial<UseMutationOptions<{ success: boolean; message: string }, Error, { userId: string }>>
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

/**
 * Custom TanStack Query hook for fetching SCORM tracking state.
 */
export function useScormTrackingQuery(
  courseId: string,
  itemId: string,
  options?: Partial<UseQueryOptions<Record<string, string>, Error>>
) {
  return useQuery<Record<string, string>, Error>({
    queryKey: ["scormTracking", courseId, itemId],
    queryFn: async () => {
      if (!courseId || !itemId) throw new Error("Course ID and Item ID are required");
      const client = getRpcClient(LearningService);
      const res = await client.getScormTrackingState({ courseId, itemId });
      return res.cmiData || {};
    },
    enabled: !!courseId && !!itemId,
    ...options,
  });
}

// --- Learning Hooks ---

export function useLearningProgressQuery(courseId: string, options?: Partial<UseQueryOptions<LearningProgress | undefined, Error>>) {
  return useQuery<LearningProgress | undefined, Error>({
    queryKey: ["learningProgress", courseId],
    queryFn: async () => {
      const client = getRpcClient(LearningService);
      const res = await client.getProgress({ courseId });
      return res.progress;
    },
    enabled: !!courseId,
    ...options,
  });
}

/**
 * Custom TanStack Mutation hook for saving SCORM tracking state.
 */
export function useSaveScormTrackingMutation(
  options?: Partial<
    UseMutationOptions<
      boolean,
      Error,
      { courseId: string; itemId: string; cmiData: Record<string, string> }
    >
  >
) {
  return useMutation<
    boolean,
    Error,
    { courseId: string; itemId: string; cmiData: Record<string, string> }
  >({
    mutationFn: async ({ courseId, itemId, cmiData }) => {
      const client = getRpcClient(LearningService);
      const res = await client.saveScormTrackingState({ courseId, itemId, cmiData });
      return res.success;
    },
    ...options,
  });
}

export function usePersonalNotesQuery(courseId: string, options?: Partial<UseQueryOptions<PersonalNote[], Error>>) {
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

// --- Assessment Hooks ---

export function useSubmitQuizMutation(
  options?: Partial<UseMutationOptions<QuizResult | undefined, Error, { itemId: string; selectedOptionIndexes: number[] }>>
) {
  return useMutation<QuizResult | undefined, Error, { itemId: string; selectedOptionIndexes: number[] }>({
    mutationFn: async ({ itemId, selectedOptionIndexes }) => {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitGradedQuiz({ itemId, selectedOptionIndexes });
      return res.result;
    },
    ...options,
  });
}

export function useSubmitLabMutation(
  options?: Partial<UseMutationOptions<AutoGradedLabResult | undefined, Error, { itemId: string; sourceCode: string; language: string }>>
) {
  return useMutation<AutoGradedLabResult | undefined, Error, { itemId: string; sourceCode: string; language: string }>({
    mutationFn: async ({ itemId, sourceCode, language }) => {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitAutoGradedLab({ itemId, sourceCode, language });
      return res.result;
    },
    ...options,
  });
}

// --- Certificate Hooks ---

export function useCertificateVerificationQuery(certificateId: string, options?: Partial<UseQueryOptions<{ isValid: boolean; cert?: VerifiedCertificate; message: string }, Error>>) {
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

// --- Forum Hooks ---

export function useForumThreadsQuery(courseId: string, options?: Partial<UseQueryOptions<ForumThread[], Error>>) {
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
