import {
  useQuery,
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
  type Category,
  type CourseReview,
  type CourseCollaboratorDetail,
} from "@/gen/catalog/v1/catalog_pb";

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

import {
  IdentityService,
  InvitationType,
  InvitationStatus,
  InvitationAction,
  type User,
  type EnterpriseSeat,
  type InstructorApplication,
  type OrganizationMemberDetail,
  type Invitation,
} from "@/gen/identity/v1/identity_pb";
import { PartnerService, type Partner } from "@/gen/partner/v1/partner_pb";
import {
  LearningService,
  type LearningProgress,
  type PersonalNote,
  type EnrolledCourseSummary,
} from "@/gen/learning/v1/learning_pb";

// --- Learning Hooks ---

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
import {
  AssessmentService,
  type QuizResult,
  type AutoGradedLabResult,
  type QuestionBank,
  type Question,
  type QuestionOption,
} from "@/gen/assessment/v1/assessment_pb";
import { CertificateService, type VerifiedCertificate } from "@/gen/certificate/v1/certificate_pb";
import { ForumService, type ForumThread } from "@/gen/forum/v1/forum_pb";
import {
  PaymentService,
  PlanType,
  PaymentTargetType,
  type CoursePurchase,
  type UserSubscription,
} from "@/gen/payment/v1/payment_pb";

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

// --- Identity Hooks ---

/**
 * Custom TanStack Query hook for fetching current user profile.
 */
export function useUserProfileQuery(
  userId?: string,
  options?: Partial<UseQueryOptions<User, Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<User, Error>({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID provided");
      const client = getRpcClient(IdentityService);
      const res = await client.getUserProfile({ userId });
      if (!res.user) throw new Error("User profile not found");
      return res.user;
    },
    ...options,
    enabled: isAuthenticated && !!userId && (options?.enabled ?? true),
  });
}

/**
 * Custom TanStack Mutation hook for assigning enterprise seat key.
 */
export function useSaveEnterpriseKeyMutation(
  options?: Partial<
    UseMutationOptions<
      { success: boolean; message: string },
      Error,
      { userId: string; enterpriseSeatKey: string }
    >
  >,
) {
  return useMutation<
    { success: boolean; message: string },
    Error,
    { userId: string; enterpriseSeatKey: string }
  >({
    mutationFn: async ({ userId, enterpriseSeatKey }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.assignEnterpriseSeat({ userId, enterpriseSeatKey });
      return { success: res.success, message: res.message };
    },
    ...options,
  });
}

export function useEnterpriseSeatsQuery(
  options?: Partial<UseQueryOptions<EnterpriseSeat[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<EnterpriseSeat[], Error>({
    queryKey: ["enterpriseSeats"],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listEnterpriseSeats({});
      return res.seats;
    },
    ...options,
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

/**
 * Custom TanStack Mutation hook for revoking enterprise seat.
 */
export function useRevokeEnterpriseSeatMutation(
  options?: Partial<
    UseMutationOptions<{ success: boolean; message: string }, Error, { userId: string }>
  >,
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

// --- Assessment Hooks ---

export function useSubmitQuizMutation(
  options?: Partial<
    UseMutationOptions<
      QuizResult | undefined,
      Error,
      { itemId: string; selectedOptionIndexes: number[] }
    >
  >,
) {
  return useMutation<
    QuizResult | undefined,
    Error,
    { itemId: string; selectedOptionIndexes: number[] }
  >({
    mutationFn: async ({ itemId, selectedOptionIndexes }) => {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitGradedQuiz({ itemId, selectedOptionIndexes });
      return res.result;
    },
    ...options,
  });
}

export function useSubmitLabMutation(
  options?: Partial<
    UseMutationOptions<
      AutoGradedLabResult | undefined,
      Error,
      { itemId: string; sourceCode: string; language: string }
    >
  >,
) {
  return useMutation<
    AutoGradedLabResult | undefined,
    Error,
    { itemId: string; sourceCode: string; language: string }
  >({
    mutationFn: async ({ itemId, sourceCode, language }) => {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitAutoGradedLab({ itemId, sourceCode, language });
      return res.result;
    },
    ...options,
  });
}

// --- Certificate Hooks ---

export function useCertificateVerificationQuery(
  certificateId: string,
  options?: Partial<
    UseQueryOptions<{ isValid: boolean; cert?: VerifiedCertificate; message: string }, Error>
  >,
) {
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

// --- Question Bank Hooks ---

export function useQuestionBanksQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<QuestionBank[], Error>>,
) {
  return useQuery<QuestionBank[], Error>({
    queryKey: ["questionBanks", courseId],
    queryFn: async () => {
      const client = getRpcClient(AssessmentService);
      const res = await client.listQuestionBanks({ courseId });
      return res.banks;
    },
    enabled: !!courseId,
    ...options,
  });
}

export function useCreateQuestionBankMutation(
  options?: Partial<
    UseMutationOptions<
      QuestionBank,
      Error,
      { courseId: string; title: string; category: string; description: string }
    >
  >,
) {
  return useMutation<
    QuestionBank,
    Error,
    { courseId: string; title: string; category: string; description: string }
  >({
    mutationFn: async ({ courseId, title, category, description }) => {
      const client = getRpcClient(AssessmentService);
      const res = await client.createQuestionBank({ courseId, title, category, description });
      if (!res.bank) throw new Error("Failed to create question bank");
      return res.bank;
    },
    ...options,
  });
}

export function useAddQuestionToBankMutation(
  options?: Partial<
    UseMutationOptions<
      Question,
      Error,
      {
        bankId: string;
        questionType: string;
        difficulty: string;
        text: string;
        explanation: string;
        options: Partial<QuestionOption>[];
      }
    >
  >,
) {
  return useMutation<
    Question,
    Error,
    {
      bankId: string;
      questionType: string;
      difficulty: string;
      text: string;
      explanation: string;
      options: Partial<QuestionOption>[];
    }
  >({
    mutationFn: async ({
      bankId,
      questionType,
      difficulty,
      text,
      explanation,
      options: questionOptions,
    }) => {
      const client = getRpcClient(AssessmentService);
      const res = await client.addQuestionToBank({
        bankId,
        questionType,
        difficulty,
        text,
        explanation,
        options: questionOptions as QuestionOption[],
      });
      if (!res.question) throw new Error("Failed to add question to bank");
      return res.question;
    },
    ...options,
  });
}

export function useUpdateQuestionMutation(
  options?: Partial<
    UseMutationOptions<
      Question,
      Error,
      {
        questionId: string;
        questionType: string;
        difficulty: string;
        text: string;
        explanation: string;
        options: Partial<QuestionOption>[];
      }
    >
  >,
) {
  return useMutation<
    Question,
    Error,
    {
      questionId: string;
      questionType: string;
      difficulty: string;
      text: string;
      explanation: string;
      options: Partial<QuestionOption>[];
    }
  >({
    mutationFn: async ({
      questionId,
      questionType,
      difficulty,
      text,
      explanation,
      options: questionOptions,
    }) => {
      const client = getRpcClient(AssessmentService);
      const res = await client.updateQuestion({
        questionId,
        questionType,
        difficulty,
        text,
        explanation,
        options: questionOptions as QuestionOption[],
      });
      if (!res.question) throw new Error("Failed to update question");
      return res.question;
    },
    ...options,
  });
}

export function useDeleteQuestionMutation(
  options?: Partial<
    UseMutationOptions<{ success: boolean; message: string }, Error, { questionId: string }>
  >,
) {
  return useMutation<{ success: boolean; message: string }, Error, { questionId: string }>({
    mutationFn: async ({ questionId }) => {
      const client = getRpcClient(AssessmentService);
      const res = await client.deleteQuestion({ questionId });
      return { success: res.success, message: res.message };
    },
    ...options,
  });
}

/**
 * Custom TanStack Query hook for fetching and caching the user's verified certificates.
 */
export function useMyCertificatesQuery(
  options?: Partial<UseQueryOptions<VerifiedCertificate[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<VerifiedCertificate[], Error>({
    queryKey: ["myCertificates"],
    queryFn: async () => {
      const client = getRpcClient(CertificateService);
      const res = await client.listMyCertificates({});
      return res.certificates || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

// --- Partner Hooks ---

export function usePartnersQuery(options?: Partial<UseQueryOptions<Partner[], Error>>) {
  return useQuery<Partner[], Error>({
    queryKey: ["partners"],
    queryFn: async () => {
      const client = getRpcClient(PartnerService);
      const res = await client.listPartners({});
      return res.partners || [];
    },
    ...options,
  });
}

export function usePartnerDetailQuery(
  partnerId: string,
  options?: Partial<UseQueryOptions<Partner | null, Error>>,
) {
  return useQuery<Partner | null, Error>({
    queryKey: ["partnerDetail", partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const client = getRpcClient(PartnerService);
      const res = await client.getPartner({ id: partnerId });
      return res.partner ?? null;
    },
    enabled: !!partnerId,
    ...options,
  });
}

export interface CreatePartnerInput {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  websiteUrl: string;
  allowedDomains: string[];
  signatureImageUrl: string;
  signerName: string;
  signerTitle: string;
  publicKeyPem: string;
}

export function useCreatePartnerMutation(
  options?: Partial<UseMutationOptions<Partner | undefined, Error, CreatePartnerInput>>,
) {
  const queryClient = useQueryClient();
  return useMutation<Partner | undefined, Error, CreatePartnerInput>({
    mutationFn: async (input) => {
      const client = getRpcClient(PartnerService);
      const res = await client.createPartner(input);
      return res.partner;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export interface UpdatePartnerInput {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  websiteUrl: string;
  allowedDomains: string[];
  signatureImageUrl: string;
  signerName: string;
  signerTitle: string;
  publicKeyPem: string;
}

export function useUpdatePartnerMutation(
  options?: Partial<UseMutationOptions<Partner | undefined, Error, UpdatePartnerInput>>,
) {
  const queryClient = useQueryClient();
  return useMutation<Partner | undefined, Error, UpdatePartnerInput>({
    mutationFn: async (input) => {
      const client = getRpcClient(PartnerService);
      const res = await client.updatePartner(input);
      return res.partner;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useDeletePartnerMutation(
  options?: Partial<UseMutationOptions<boolean, Error, { id: string }>>,
) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const client = getRpcClient(PartnerService);
      const res = await client.deletePartner({ id });
      return res.success;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useRotatePartnerKeyPairMutation(
  options?: Partial<UseMutationOptions<string, Error, { partnerId: string }>>,
) {
  return useMutation<string, Error, { partnerId: string }>({
    mutationFn: async ({ partnerId }) => {
      const client = getRpcClient(PartnerService);
      const res = await client.rotatePartnerKeyPair({ partnerId });
      return res.publicKeyPem;
    },
    ...options,
  });
}

export function useUpdateInstructorProfileMutation(
  options?: Partial<
    UseMutationOptions<User | undefined, Error, { title: string; signatureImageUrl: string }>
  >,
) {
  return useMutation<User | undefined, Error, { title: string; signatureImageUrl: string }>({
    mutationFn: async ({ title, signatureImageUrl }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.updateInstructorProfile({ title, signatureImageUrl });
      return res.user;
    },
    ...options,
  });
}

export function useSubmitInstructorApplicationMutation(
  options?: Partial<
    UseMutationOptions<
      void,
      Error,
      {
        title: string;
        bio: string;
        linkedinUrl?: string;
        cvUrl?: string;
        demoVideoUrl?: string;
      }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      title: string;
      bio: string;
      linkedinUrl?: string;
      cvUrl?: string;
      demoVideoUrl?: string;
    }
  >({
    mutationFn: async ({ title, bio, linkedinUrl, cvUrl, demoVideoUrl }) => {
      const client = getRpcClient(IdentityService);
      await client.submitInstructorApplication({
        title,
        bio,
        linkedinUrl: linkedinUrl || "",
        cvUrl: cvUrl || "",
        demoVideoUrl: demoVideoUrl || "",
      });
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["myInstructorApplication"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useMyInstructorApplicationQuery(
  options?: Partial<UseQueryOptions<InstructorApplication | null, Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<InstructorApplication | null, Error>({
    queryKey: ["myInstructorApplication"],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.getMyInstructorApplication({});
      return res.application ?? null;
    },
    ...options,
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

export function useListInstructorApplicationsQuery(
  statusFilter: string = "",
  options?: Partial<UseQueryOptions<InstructorApplication[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<InstructorApplication[], Error>({
    queryKey: ["instructorApplications", statusFilter],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listInstructorApplications({ statusFilter });
      return res.applications || [];
    },
    ...options,
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

export function useReviewInstructorApplicationMutation(
  options?: Partial<
    UseMutationOptions<
      InstructorApplication | undefined,
      Error,
      { applicationId: string; approve: boolean; rejectionReason?: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    InstructorApplication | undefined,
    Error,
    { applicationId: string; approve: boolean; rejectionReason?: string }
  >({
    mutationFn: async ({ applicationId, approve, rejectionReason }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.reviewInstructorApplication({
        applicationId,
        approve,
        rejectionReason: rejectionReason || "",
      });
      return res.application;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["instructorApplications"] });
      queryClient.invalidateQueries({ queryKey: ["myInstructorApplication"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function usePaymentAccessQuery(
  courseId: string,
  options?: Partial<UseQueryOptions<{ hasPaidAccess: boolean; accessReason: string }, Error>>,
) {
  return useQuery<{ hasPaidAccess: boolean; accessReason: string }, Error>({
    queryKey: ["paymentAccess", courseId],
    queryFn: async () => {
      const client = getRpcClient(PaymentService);
      const res = await client.getUserPaymentAccess({ courseId });
      return {
        hasPaidAccess: res.hasPaidAccess,
        accessReason: res.accessReason,
      };
    },
    ...options,
  });
}

export function usePurchaseCourseMutation(
  options?: Partial<
    UseMutationOptions<
      { success: boolean; message: string; purchase?: CoursePurchase },
      Error,
      { courseId: string; paymentMethod: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; message: string; purchase?: CoursePurchase },
    Error,
    { courseId: string; paymentMethod: string }
  >({
    mutationFn: async ({ courseId, paymentMethod }) => {
      const client = getRpcClient(PaymentService);
      const res = await client.purchaseCourse({ courseId, paymentMethod });
      return {
        success: res.success,
        message: res.message,
        purchase: res.purchase,
      };
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["paymentAccess"] });
      queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] });
      queryClient.invalidateQueries({ queryKey: ["myCourses"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useSubscribeCourseraPlusMutation(
  options?: Partial<
    UseMutationOptions<
      { success: boolean; message: string; subscription?: UserSubscription },
      Error,
      { planType: PlanType; paymentMethod: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; message: string; subscription?: UserSubscription },
    Error,
    { planType: PlanType; paymentMethod: string }
  >({
    mutationFn: async ({ planType, paymentMethod }) => {
      const client = getRpcClient(PaymentService);
      const res = await client.subscribeCourseraPlus({
        planType,
        paymentMethod,
      });
      return {
        success: res.success,
        message: res.message,
        subscription: res.subscription,
      };
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["paymentAccess"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useCreateVNPayPaymentUrlMutation(
  options?: Partial<
    UseMutationOptions<
      {
        success: boolean;
        message: string;
        paymentUrl: string;
        orderId: string;
        vnpTxnRef: string;
      },
      Error,
      { targetType: PaymentTargetType; targetId: string; planType?: PlanType }
    >
  >,
) {
  return useMutation<
    {
      success: boolean;
      message: string;
      paymentUrl: string;
      orderId: string;
      vnpTxnRef: string;
    },
    Error,
    { targetType: PaymentTargetType; targetId: string; planType?: PlanType }
  >({
    mutationFn: async ({ targetType, targetId, planType }) => {
      const client = getRpcClient(PaymentService);
      const res = await client.createVNPayPaymentUrl({
        targetType,
        targetId,
        planType: planType ?? PlanType.UNSPECIFIED,
      });
      return {
        success: res.success,
        message: res.message,
        paymentUrl: res.paymentUrl,
        orderId: res.orderId,
        vnpTxnRef: res.vnpTxnRef,
      };
    },
    ...options,
  });
}

// --- Organization Member Hooks ---

export function useOrganizationMembersQuery(
  organizationId: string = "org_default",
  options?: Partial<UseQueryOptions<OrganizationMemberDetail[], Error>>,
) {
  return useQuery<OrganizationMemberDetail[], Error>({
    queryKey: ["organizationMembers", organizationId],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listOrganizationMembers({ organizationId });
      return res.members || [];
    },
    enabled: !!organizationId,
    ...options,
  });
}

export function useAddOrganizationMemberMutation(
  options?: Partial<
    UseMutationOptions<
      OrganizationMemberDetail,
      Error,
      { email: string; roleId: string; organizationId?: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    OrganizationMemberDetail,
    Error,
    { email: string; roleId: string; organizationId?: string }
  >({
    mutationFn: async ({ email, roleId, organizationId = "org_default" }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.addOrganizationMember({
        email,
        roleId,
        organizationId,
      });
      if (!res.member) {
        throw new Error("Không thể thêm thành viên");
      }
      return res.member;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      const orgId = variables.organizationId || "org_default";
      queryClient.invalidateQueries({ queryKey: ["organizationMembers", orgId] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useRemoveOrganizationMemberMutation(
  options?: Partial<
    UseMutationOptions<boolean, Error, { userId: string; organizationId?: string }>
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, { userId: string; organizationId?: string }>({
    mutationFn: async ({ userId, organizationId = "org_default" }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.removeOrganizationMember({
        userId,
        organizationId,
      });
      return res.success;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      const orgId = variables.organizationId || "org_default";
      queryClient.invalidateQueries({ queryKey: ["organizationMembers", orgId] });
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
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

// --- Notification Hooks ---

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

// --- Invitation Hooks ---

export function useMyInvitationsQuery(
  statusFilter?: InvitationStatus,
  options?: Partial<UseQueryOptions<Invitation[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<Invitation[], Error>({
    queryKey: ["myInvitations", statusFilter],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listMyInvitations({
        statusFilter: statusFilter ?? InvitationStatus.UNSPECIFIED,
      });
      return res.invitations || [];
    },
    enabled: isAuthenticated && (options?.enabled ?? true),
    ...options,
  });
}

export function useSentInvitationsQuery(
  type?: InvitationType,
  targetId?: string,
  options?: Partial<UseQueryOptions<Invitation[], Error>>,
) {
  const { isAuthenticated } = useAuth();
  return useQuery<Invitation[], Error>({
    queryKey: ["sentInvitations", type, targetId],
    queryFn: async () => {
      const client = getRpcClient(IdentityService);
      const res = await client.listSentInvitations({
        type: type ?? InvitationType.UNSPECIFIED,
        targetId: targetId ?? "",
      });
      return res.invitations || [];
    },
    enabled: isAuthenticated && (options?.enabled ?? true),
    ...options,
  });
}

export function useGetInvitationByTokenQuery(
  token: string,
  options?: Partial<UseQueryOptions<Invitation | null, Error>>,
) {
  return useQuery<Invitation | null, Error>({
    queryKey: ["invitationByToken", token],
    queryFn: async () => {
      if (!token) return null;
      const client = getRpcClient(IdentityService);
      const res = await client.getInvitationByToken({ token });
      return res.invitation ?? null;
    },
    enabled: !!token && (options?.enabled ?? true),
    ...options,
  });
}

export function useCreateInvitationMutation(
  options?: UseMutationOptions<
    Invitation,
    Error,
    {
      type: InvitationType;
      inviteeEmail: string;
      targetId: string;
      targetName?: string;
      roleId?: string;
      message?: string;
    }
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars) => {
      const client = getRpcClient(IdentityService);
      const res = await client.createInvitation({
        type: vars.type,
        inviteeEmail: vars.inviteeEmail,
        targetId: vars.targetId,
        targetName: vars.targetName ?? "",
        roleId: vars.roleId ?? "",
        message: vars.message ?? "",
      });
      if (!res.invitation) throw new Error("Không thể khởi tạo lời mời.");
      return res.invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentInvitations"] });
    },
    ...options,
  });
}

export function useRespondToInvitationMutation(
  options?: UseMutationOptions<
    { invitation: Invitation | null; success: boolean; message: string },
    Error,
    { invitationId: string; action: InvitationAction; token?: string }
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars) => {
      const client = getRpcClient(IdentityService);
      const res = await client.respondToInvitation({
        invitationId: vars.invitationId,
        action: vars.action,
        token: vars.token ?? "",
      });
      return {
        invitation: res.invitation ?? null,
        success: res.success,
        message: res.message,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myInvitations"] });
      queryClient.invalidateQueries({ queryKey: ["organizationMembers"] });
      queryClient.invalidateQueries({ queryKey: ["myEnrolledCourses"] });
    },
    ...options,
  });
}

export function useCancelInvitationMutation(
  options?: UseMutationOptions<boolean, Error, { invitationId: string }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitationId }) => {
      const client = getRpcClient(IdentityService);
      const res = await client.cancelInvitation({ invitationId });
      return res.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sentInvitations"] });
    },
    ...options,
  });
}
