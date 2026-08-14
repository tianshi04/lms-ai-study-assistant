import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import {
  CatalogService,
  type Course,
  type Category,
  type CourseReview,
  type CourseCollaboratorDetail,
} from "@/gen/catalog/v1/catalog_pb";

export interface CourseFilters {
  searchQuery?: string;
  subject?: string;
  level?: string;
  sortBy?: string;
  pageSize?: number;
}

/**
 * Custom TanStack Query hook for fetching single course details.
 */
export function useCourseDetailQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<Course | null, Error>>,
) {
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
export function useCourseReviewsQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<CourseReview[], Error>>,
) {
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

/**
 * Custom TanStack Query hook for fetching the course catalog.
 */
export function useCoursesQuery(
  filters?: CourseFilters,
  options?: Partial<UseQueryOptions<Course[], Error>>,
) {
  const normalizedFilters: CourseFilters = {
    searchQuery: filters?.searchQuery || "",
    subject: filters?.subject || "",
    level: filters?.level || "",
    sortBy: filters?.sortBy || "",
    pageSize: filters?.pageSize || 10,
  };

  return useQuery<Course[], Error>({
    queryKey: ["courses", normalizedFilters],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      const res = await client.listCourses(normalizedFilters);
      return res.courses;
    },
    placeholderData: keepPreviousData,
    ...options,
  });
}

/**
 * Custom TanStack Query hook for fetching categories.
 */
export function useCategoriesQuery(
  typeFilter?: string,
  options?: Partial<UseQueryOptions<Category[], Error>>,
) {
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
  options?: Partial<
    UseMutationOptions<Category | undefined, Error, { name: string; type: string }>
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<Category | undefined, Error, { name: string; type: string }>({
    mutationFn: async ({ name, type }) => {
      const client = getRpcClient(CatalogService);
      const res = await client.createCategory({ name, type });
      return res.category;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useDeleteCategoryMutation(
  options?: Partial<UseMutationOptions<boolean, Error, { id: string }>>,
) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const client = getRpcClient(CatalogService);
      const res = await client.deleteCategory({ id });
      return res.success;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

/**
 * Hook fetch danh sách người hợp tác (Co-Instructor & TA) của khóa học
 */
export function useCourseCollaboratorsQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<CourseCollaboratorDetail[], Error>>,
) {
  return useQuery<CourseCollaboratorDetail[], Error>({
    queryKey: ["courseCollaborators", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const client = getRpcClient(CatalogService);
      const res = await client.listCourseCollaborators({ courseId });
      return res.collaborators || [];
    },
    enabled: !!courseId,
    ...options,
  });
}

/**
 * Hook mời thêm người hợp tác (Co-Instructor hoặc TA) cho khóa học
 */
export function useAddCourseCollaboratorMutation(
  options?: Partial<
    UseMutationOptions<
      CourseCollaboratorDetail,
      Error,
      { courseId: string; email: string; role: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    CourseCollaboratorDetail,
    Error,
    { courseId: string; email: string; role: string }
  >({
    mutationFn: async ({ courseId, email, role }) => {
      const client = getRpcClient(CatalogService);
      const res = await client.addCourseCollaborator({ courseId, email, role });
      if (!res.collaborator) throw new Error("Thao tác thêm người hợp tác thất bại.");
      return res.collaborator;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["courseCollaborators", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["courseDetail", variables.courseId] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

/**
 * Hook xóa người hợp tác khỏi khóa học
 */
export function useRemoveCourseCollaboratorMutation(
  options?: Partial<UseMutationOptions<boolean, Error, { courseId: string; userId: string }>>,
) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { courseId: string; userId: string }>({
    mutationFn: async ({ courseId, userId }) => {
      const client = getRpcClient(CatalogService);
      const res = await client.removeCourseCollaborator({ courseId, userId });
      return res.success;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["courseCollaborators", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["courseDetail", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["courseAuditLogs", variables.courseId] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

/**
 * Hook danh sách nhật ký lịch sử khóa học (Course Audit Logs)
 */
export function useListCourseAuditLogsQuery(courseId: string) {
  return useQuery({
    queryKey: ["courseAuditLogs", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const client = getRpcClient(CatalogService);
      const res = await client.listCourseAuditLogs({ courseId });
      return res.logs;
    },
    enabled: Boolean(courseId),
  });
}
