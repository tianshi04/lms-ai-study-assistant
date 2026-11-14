import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  CatalogService,
  type Course,
  type CourseStatus,
  type Category,
  type CourseReview,
  type CourseCollaboratorDetail,
  type GetCourseDetailResponse,
  type Specialization,
  type InstructorAnalytics,
  type GetInstructorActivityTimelineResponse,
  type CourseBookmark,
  type ToggleCourseReviewHelpfulResponse,
  type GetCourseGradebookResponse,
  type GetInstructorActionTasksResponse,
  type SendStudentReminderResponse,
  type GetAdminCatalogStatsResponse,
  type GetAdminCatalogTrendResponse,
  type ListAdminCourseMetricsResponse,
} from "@/gen/catalog/v1/catalog_pb";

/**
 * Super Admin KPI aggregates and low-rating review queue owned by the Catalog bounded context.
 */
export function useAdminCatalogStatsQuery(
  options?: Partial<UseQueryOptions<GetAdminCatalogStatsResponse, Error>>,
) {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  return useQuery<GetAdminCatalogStatsResponse, Error>({
    queryKey: ["adminCatalogStats"],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      return client.getAdminCatalogStats({});
    },
    staleTime: 60 * 1000,
    ...options,
    enabled: isAuthenticated && isSuperAdmin && (options?.enabled ?? true),
  });
}

/**
 * Daily course review volume and average rating trend for the Admin Dashboard.
 */
export function useAdminCatalogTrendQuery(
  days: number,
  options?: Partial<UseQueryOptions<GetAdminCatalogTrendResponse, Error>>,
) {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  return useQuery<GetAdminCatalogTrendResponse, Error>({
    queryKey: ["adminCatalogTrend", days],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      return client.getAdminCatalogTrend({ days });
    },
    staleTime: 60 * 1000,
    ...options,
    enabled: isAuthenticated && isSuperAdmin && (options?.enabled ?? true),
  });
}

export interface AdminCourseMetricsParams {
  /** 1-based page number. */
  page: number;
  pageSize: number;
  searchQuery: string;
  status: CourseStatus;
}

/**
 * Paginated per-course metrics for the Super Admin dashboard, highest revenue first,
 * with optional search (title / partner) and status filter.
 * The previous page stays on screen while the next one loads.
 */
export function useAdminCourseMetricsQuery({
  page,
  pageSize,
  searchQuery,
  status,
}: AdminCourseMetricsParams) {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  return useQuery<ListAdminCourseMetricsResponse, Error>({
    queryKey: ["adminCourseMetrics", page, pageSize, searchQuery, status],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      return client.listAdminCourseMetrics({ page, pageSize, searchQuery, status });
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    enabled: isAuthenticated && isSuperAdmin,
  });
}

/**
 * Marks a low-rating review as looked at so it leaves the dashboard alert list.
 * The review returns to the list if its author edits it afterwards.
 */
export function useAcknowledgeLowReviewMutation(
  options?: Partial<UseMutationOptions<{ success: boolean; message: string }, Error, string>>,
) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (reviewId) => {
      const client = getRpcClient(CatalogService);
      const res = await client.acknowledgeLowReview({ reviewId });
      return { success: res.success, message: res.message };
    },
    ...options,
    onSuccess: (data, variables, context, mutationContext) => {
      queryClient.invalidateQueries({ queryKey: ["adminCatalogStats"] });
      options?.onSuccess?.(data, variables, context, mutationContext);
    },
  });
}

export interface CourseFilters {
  searchQuery?: string;
  subject?: string;
  level?: string;
  sortBy?: string;
  pageSize?: number;
}

/**
 * Custom TanStack Query hook for fetching single course details,
 * including foundational course and hybrid AI recommendations.
 */
export function useCourseDetailQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<GetCourseDetailResponse | null, Error>>,
) {
  return useQuery<GetCourseDetailResponse | null, Error>({
    queryKey: ["courseDetail", courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const client = getRpcClient(CatalogService);
      const res = await client.getCourseDetail({ idOrSlug: courseId });
      return res;
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
      queryClient.invalidateQueries({ queryKey: ["adminCatalogStats"] });
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
      queryClient.invalidateQueries({ queryKey: ["adminCatalogStats"] });
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
// --- Specializations & Instructor Queries ---

/**
 * Hook danh sách khóa học do giảng viên phụ trách (Instructor Courses)
 */
export function useInstructorCoursesQuery(
  pageSize = 50,
  options?: Partial<UseQueryOptions<Course[], Error>>,
) {
  return useQuery<Course[], Error>({
    queryKey: ["instructorCourses", pageSize],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      const res = await client.listInstructorCourses({ pageSize });
      return res.courses || [];
    },
    ...options,
  });
}

/**
 * Hook danh sách chuyên ngành do giảng viên phụ trách (Instructor Specializations)
 */
/**
 * Hook thống kê chi tiết khóa học cho giảng viên (Instructor Analytics & Student Roster)
 */
export function useInstructorAnalyticsQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<InstructorAnalytics | null, Error>>,
) {
  return useQuery<InstructorAnalytics | null, Error>({
    queryKey: ["instructorAnalytics", courseId],
    queryFn: async () => {
      if (!courseId || courseId === "ALL") return null;
      const client = getRpcClient(CatalogService);
      const res = await client.getInstructorAnalytics({ courseId });
      return res.analytics ?? null;
    },
    enabled: !!courseId && courseId !== "ALL",
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * Hook thống kê chi tiết toàn bộ các khóa học của giảng viên (Multi-Course Parallel Analytics)
 */
export function useAllInstructorAnalyticsQueries(
  courses: { id: string }[],
  options?: { enabled?: boolean },
) {
  return useQueries({
    queries: courses.map((c) => ({
      queryKey: ["instructorAnalytics", c.id],
      queryFn: async () => {
        if (!c.id) return null;
        const client = getRpcClient(CatalogService);
        const res = await client.getInstructorAnalytics({ courseId: c.id });
        return res.analytics ?? null;
      },
      enabled: (options?.enabled ?? true) && !!c.id,
      staleTime: 60 * 1000,
    })),
  });
}

/**
 * Hook truy vấn danh sách đánh giá của toàn bộ các khóa học của giảng viên (Multi-Course Reviews)
 */
export function useAllCourseReviewsQueries(
  courses: { id: string }[],
  options?: { enabled?: boolean },
) {
  return useQueries({
    queries: courses.map((c) => ({
      queryKey: ["courseReviews", c.id],
      queryFn: async () => {
        if (!c.id) return [];
        const client = getRpcClient(CatalogService);
        const res = await client.listCourseReviews({ courseId: c.id });
        return res.reviews || [];
      },
      enabled: (options?.enabled ?? true) && !!c.id,
      staleTime: 60 * 1000,
    })),
  });
}

/**
 * Hook truy vấn dữ liệu chuỗi thời gian hoạt động và biểu đồ heatmap của học viên theo khóa học
 */
export function useInstructorActivityTimelineQuery(
  params: {
    courseId?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    learnerFilter?: string;
  },
  options?: Partial<UseQueryOptions<GetInstructorActivityTimelineResponse, Error>>,
) {
  const {
    courseId = "",
    dateRange = "7d",
    startDate = "",
    endDate = "",
    learnerFilter = "all",
  } = params;

  return useQuery<GetInstructorActivityTimelineResponse, Error>({
    queryKey: [
      "instructorActivityTimeline",
      courseId,
      dateRange,
      startDate,
      endDate,
      learnerFilter,
    ],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      return await client.getInstructorActivityTimeline({
        courseId,
        dateRange,
        startDate,
        endDate,
        learnerFilter,
      });
    },
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useInstructorSpecializationsQuery(
  pageSize = 50,
  options?: Partial<UseQueryOptions<Specialization[], Error>>,
) {
  return useQuery<Specialization[], Error>({
    queryKey: ["instructorSpecializations", pageSize],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      const res = await client.listInstructorSpecializations({ pageSize });
      return res.specializations || [];
    },
    ...options,
  });
}

export interface CreateSpecializationInput {
  title: string;
  slug?: string;
  description?: string;
  partnerName?: string;
  partnerLogoUrl?: string;
  courseIds: string[];
  organizationId?: string;
}

/**
 * Hook tạo chuyên ngành mới
 */
export function useCreateSpecializationMutation(
  options?: Partial<UseMutationOptions<Specialization, Error, CreateSpecializationInput>>,
) {
  const queryClient = useQueryClient();
  return useMutation<Specialization, Error, CreateSpecializationInput>({
    mutationFn: async (input) => {
      const client = getRpcClient(CatalogService);
      const res = await client.createSpecialization({
        title: input.title,
        slug: input.slug || "",
        description: input.description || "",
        partnerName: input.partnerName || "",
        partnerLogoUrl: input.partnerLogoUrl || "",
        courseIds: input.courseIds,
        organizationId: input.organizationId || "",
      });
      if (!res.specialization) throw new Error("Tạo chuyên ngành thất bại.");
      return res.specialization;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["instructorSpecializations"] });
      queryClient.invalidateQueries({ queryKey: ["specialization"] });
      queryClient.invalidateQueries({ queryKey: ["courseDetail"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export interface UpdateSpecializationInput {
  id: string;
  title: string;
  description?: string;
  partnerName?: string;
  partnerLogoUrl?: string;
  courseIds: string[];
}

/**
 * Hook cập nhật thông tin chuyên ngành
 */
export function useUpdateSpecializationMutation(
  options?: Partial<UseMutationOptions<Specialization, Error, UpdateSpecializationInput>>,
) {
  const queryClient = useQueryClient();
  return useMutation<Specialization, Error, UpdateSpecializationInput>({
    mutationFn: async (input) => {
      const client = getRpcClient(CatalogService);
      const res = await client.updateSpecialization({
        id: input.id,
        title: input.title,
        description: input.description || "",
        partnerName: input.partnerName || "",
        partnerLogoUrl: input.partnerLogoUrl || "",
        courseIds: input.courseIds,
      });
      if (!res.specialization) throw new Error("Cập nhật chuyên ngành thất bại.");
      return res.specialization;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["instructorSpecializations"] });
      queryClient.invalidateQueries({ queryKey: ["specialization"] });
      queryClient.invalidateQueries({ queryKey: ["courseDetail"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

/**
 * Hook xóa chuyên ngành
 */
export function useDeleteSpecializationMutation(
  options?: Partial<UseMutationOptions<boolean, Error, { id: string }>>,
) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const client = getRpcClient(CatalogService);
      const res = await client.deleteSpecialization({ id });
      return res.success;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["instructorSpecializations"] });
      queryClient.invalidateQueries({ queryKey: ["specialization"] });
      queryClient.invalidateQueries({ queryKey: ["courseDetail"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

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

/**
 * Hook kiểm tra xem một khóa học đã được đánh dấu lưu chưa
 */
export function useIsCourseBookmarkedQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<boolean, Error>>,
) {
  return useQuery<boolean, Error>({
    queryKey: ["isCourseBookmarked", courseId],
    queryFn: async () => {
      if (!courseId) return false;
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.checkCourseBookmarked({ courseId });
        return res.isBookmarked;
      } catch {
        return false;
      }
    },
    enabled: Boolean(courseId),
    ...options,
  });
}

/**
 * Hook lấy danh sách tất cả các khóa học đã đánh dấu lưu của người dùng hiện tại
 */
export function useMyBookmarkedCoursesQuery(
  options?: Partial<UseQueryOptions<CourseBookmark[], Error>>,
) {
  return useQuery<CourseBookmark[], Error>({
    queryKey: ["myBookmarkedCourses"],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      const res = await client.listMyBookmarkedCourses({});
      return res.bookmarks || [];
    },
    ...options,
  });
}

/**
 * Hook đánh dấu lưu một khóa học
 */
export function useBookmarkCourseMutation(
  options?: Partial<UseMutationOptions<CourseBookmark | undefined, Error, { courseId: string }>>,
) {
  const queryClient = useQueryClient();
  return useMutation<CourseBookmark | undefined, Error, { courseId: string }>({
    mutationFn: async ({ courseId }) => {
      const client = getRpcClient(CatalogService);
      const res = await client.bookmarkCourse({ courseId });
      return res.bookmark;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["isCourseBookmarked", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["myBookmarkedCourses"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

/**
 * Hook hủy đánh dấu lưu một khóa học
 */
export function useUnbookmarkCourseMutation(
  options?: Partial<UseMutationOptions<boolean, Error, { courseId: string }>>,
) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { courseId: string }>({
    mutationFn: async ({ courseId }) => {
      const client = getRpcClient(CatalogService);
      const res = await client.unbookmarkCourse({ courseId });
      return res.success;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["isCourseBookmarked", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["myBookmarkedCourses"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export interface ToggleHelpfulContext {
  previousReviews?: CourseReview[];
}

/**
 * Hook đánh dấu / bỏ đánh dấu nhận xét hữu ích (optimistic UI)
 */
export function useToggleCourseReviewHelpfulMutation(
  options?: Partial<
    UseMutationOptions<
      ToggleCourseReviewHelpfulResponse,
      Error,
      { reviewId: string; courseId: string },
      ToggleHelpfulContext
    >
  >,
) {
  const queryClient = useQueryClient();
  const { onMutate, onError, onSettled, ...restOptions } = options || {};

  return useMutation<
    ToggleCourseReviewHelpfulResponse,
    Error,
    { reviewId: string; courseId: string },
    ToggleHelpfulContext
  >({
    ...restOptions,
    mutationFn: async ({ reviewId }) => {
      const client = getRpcClient(CatalogService);
      return await client.toggleCourseReviewHelpful({ reviewId });
    },
    onMutate: async (variables, mutation) => {
      await queryClient.cancelQueries({ queryKey: ["courseReviews", variables.courseId] });
      const previousReviews = queryClient.getQueryData<CourseReview[]>([
        "courseReviews",
        variables.courseId,
      ]);

      if (previousReviews) {
        queryClient.setQueryData<CourseReview[]>(
          ["courseReviews", variables.courseId],
          previousReviews.map((rev) => {
            if (rev.id === variables.reviewId) {
              const nextIsHelpful = !rev.isHelpfulByMe;
              const nextCount = nextIsHelpful
                ? rev.helpfulCount + 1
                : Math.max(0, rev.helpfulCount - 1);
              return {
                ...rev,
                isHelpfulByMe: nextIsHelpful,
                helpfulCount: nextCount,
              } as CourseReview;
            }
            return rev;
          }),
        );
      }

      const userCtx = await onMutate?.(variables, mutation);
      return {
        previousReviews,
        ...(typeof userCtx === "object" && userCtx !== null ? userCtx : {}),
      };
    },
    onError: (err, variables, context, mutation) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(["courseReviews", variables.courseId], context.previousReviews);
      }
      onError?.(err, variables, context, mutation);
    },
    onSettled: (data, error, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: ["courseReviews", variables.courseId] });
      onSettled?.(data, error, variables, context, mutation);
    },
  });
}

/**
 * Hook ghi nhận lịch sử tìm kiếm khóa học của học viên (silent background mutation)
 */
export function useRecordCourseSearchMutation(
  options?: Partial<
    UseMutationOptions<
      boolean,
      Error,
      { searchQuery: string; filtersJson?: string; resultCount?: number }
    >
  >,
) {
  return useMutation<
    boolean,
    Error,
    { searchQuery: string; filtersJson?: string; resultCount?: number }
  >({
    mutationFn: async ({ searchQuery, filtersJson, resultCount }) => {
      const client = getRpcClient(CatalogService);
      const res = await client.recordCourseSearch({
        searchQuery,
        filtersJson: filtersJson || "",
        resultCount: resultCount ?? 0,
      });
      return res.success;
    },
    ...options,
  });
}

export interface CourseGradebookQueryParams {
  courseId: string;
  searchQuery?: string;
  statusFilter?: string;
  pageSize?: number;
  pageToken?: string;
}

export function useCourseGradebookQuery(
  params: CourseGradebookQueryParams,
  options?: Partial<UseQueryOptions<GetCourseGradebookResponse, Error>>,
) {
  return useQuery<GetCourseGradebookResponse, Error>({
    queryKey: ["courseGradebook", params],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      return await client.getCourseGradebook({
        courseId: params.courseId,
        searchQuery: params.searchQuery || "",
        statusFilter: params.statusFilter || "",
        pageSize: params.pageSize || 50,
        pageToken: params.pageToken || "",
      });
    },
    enabled: !!params.courseId,
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useInstructorActionTasksQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<GetInstructorActionTasksResponse, Error>>,
) {
  return useQuery<GetInstructorActionTasksResponse, Error>({
    queryKey: ["instructorActionTasks", courseId],
    queryFn: async () => {
      const client = getRpcClient(CatalogService);
      return await client.getInstructorActionTasks({ courseId });
    },
    enabled: !!courseId,
    ...options,
  });
}

export interface SendStudentReminderInput {
  courseId: string;
  studentIds: string[];
  title: string;
  content: string;
}

/**
 * Hook gửi thông báo đôn đốc/nhắc nhở học viên qua SendStudentReminder RPC
 */
export function useSendStudentReminderMutation(
  options?: Partial<
    UseMutationOptions<SendStudentReminderResponse, Error, SendStudentReminderInput>
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<SendStudentReminderResponse, Error, SendStudentReminderInput>({
    mutationFn: async (input) => {
      const client = getRpcClient(CatalogService);
      return await client.sendStudentReminder(input);
    },
    onSuccess: (res, variables, context) => {
      if (variables.courseId) {
        queryClient.invalidateQueries({
          queryKey: ["instructorAnalytics", variables.courseId],
        });
        queryClient.invalidateQueries({
          queryKey: ["instructorActionTasks", variables.courseId],
        });
      }
      options?.onSuccess?.(res, variables, context as unknown as never, queryClient as never);
    },
    ...options,
  });
}
