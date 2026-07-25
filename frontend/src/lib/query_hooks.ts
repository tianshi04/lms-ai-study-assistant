import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course, type Category, type CourseReview } from "@/gen/catalog/v1/catalog_pb";

/**
 * Custom TanStack Query hook for fetching single course details.
 */
export function useCourseDetailQuery(courseId: string, options?: Partial<UseQueryOptions<Course | null, Error>>) {
  return useQuery<Course | null, Error>({
    queryKey: ["courseDetail", courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const client = getRpcClient(CatalogService);
      const res = await client.getCourseDetail({ idOrSlug: courseId });
      return res.course ?? null;
    },
    enabled: !!courseId,
    ...options,
  });
}

/**
 * Custom TanStack Query hook for fetching course reviews.
 */
export function useCourseReviewsQuery(courseId: string, options?: Partial<UseQueryOptions<CourseReview[], Error>>) {
  return useQuery<CourseReview[], Error>({
    queryKey: ["courseReviews", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const client = getRpcClient(CatalogService);
      const res = await client.listCourseReviews({ courseId });
      return res.reviews || [];
    },
    enabled: !!courseId,
    ...options,
  });
}

import { IdentityService, type User, type EnterpriseSeat } from "@/gen/identity/v1/identity_pb";
import { LearningService, type LearningProgress, type PersonalNote } from "@/gen/learning/v1/learning_pb";
import { AssessmentService, type QuizResult, type AutoGradedLabResult } from "@/gen/assessment/v1/assessment_pb";
import { CertificateService, type VerifiedCertificate } from "@/gen/certificate/v1/certificate_pb";
import { ForumService, type ForumThread } from "@/gen/forum/v1/forum_pb";

export interface CourseFilters {
  searchQuery?: string;
  subject?: string;
  level?: string;
  sortBy?: string;
  pageSize?: number;
}

/**
 * Custom TanStack Query hook for fetching the course catalog.
 */
export function useCoursesQuery(filters?: CourseFilters, options?: Partial<UseQueryOptions<Course[], Error>>) {
  return useQuery<Course[], Error>({
    queryKey: ["courses", filters],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      const res = await client.listCourses({
        searchQuery: filters?.searchQuery || "",
        subject: filters?.subject,
        level: filters?.level,
        sortBy: filters?.sortBy || "",
        pageSize: filters?.pageSize || 10,
      });
      return res.courses;
    },
    ...options,
  });
}

/**
 * Custom TanStack Query hook for fetching categories.
 */
export function useCategoriesQuery(typeFilter?: string, options?: Partial<UseQueryOptions<Category[], Error>>) {
  return useQuery<Category[], Error>({
    queryKey: ["categories", typeFilter],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      const res = await client.listCategories({ type: typeFilter || "" });
      return res.categories;
    },
    ...options,
  });
}

export function useCreateCategoryMutation(
  options?: Partial<UseMutationOptions<Category | undefined, Error, { name: string; type: string }>>
) {
  return useMutation<Category | undefined, Error, { name: string; type: string }>({
    mutationFn: async ({ name, type }) => {
      const client = getRpcClient(CatalogService);
      const res = await client.createCategory({ name, type });
      return res.category;
    },
    ...options,
  });
}

export function useDeleteCategoryMutation(
  options?: Partial<UseMutationOptions<boolean, Error, { id: string }>>
) {
  return useMutation<boolean, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const client = getRpcClient(CatalogService);
      const res = await client.deleteCategory({ id });
      return res.success;
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

