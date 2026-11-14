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
  AssessmentService,
  type QuizResult,
  type AutoGradedLabResult,
  type QuestionBank,
  type Question,
  type QuestionOption,
  type GetQuizAttemptHistoryResponse,
  type GetQuizAttemptDetailResponse,
  GradingQueueStatus,
  type GradingProvenance,
  type ListGradingQueueResponse,
  type GetGradingSubmissionDetailResponse,
  type ClaimGradingTaskResponse,
  type RenewGradingTaskLockResponse,
  type ReleaseGradingTaskResponse,
  type SubmitStaffGradingResponse,
  type RubricCriteria,
  type ListAdminAssessmentAlertsResponse,
} from "@/gen/assessment/v1/assessment_pb";

/**
 * Super Admin assessment & peer-review quality alerts owned by the Assessment bounded context.
 */
export function useAdminAssessmentAlertsQuery(
  options?: Partial<UseQueryOptions<ListAdminAssessmentAlertsResponse, Error>>,
) {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  return useQuery<ListAdminAssessmentAlertsResponse, Error>({
    queryKey: ["adminAssessmentAlerts"],
    queryFn: async () => {
      const client = getRpcClient(AssessmentService);
      return client.listAdminAssessmentAlerts({});
    },
    staleTime: 60 * 1000,
    ...options,
    enabled: isAuthenticated && isSuperAdmin && (options?.enabled ?? true),
  });
}

export function useSubmitQuizMutation(
  options?: Partial<
    UseMutationOptions<
      QuizResult | undefined,
      Error,
      { itemId: string; questionAnswers?: { selectedOptionIndexes: number[] }[] }
    >
  >,
) {
  return useMutation<
    QuizResult | undefined,
    Error,
    { itemId: string; questionAnswers?: { selectedOptionIndexes: number[] }[] }
  >({
    mutationFn: async ({ itemId, questionAnswers }) => {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitGradedQuiz({ itemId, questionAnswers });
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
  const queryClient = useQueryClient();
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
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["questionBanks", variables.courseId] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
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
  const queryClient = useQueryClient();
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
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["questionBanks"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
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

export function useQuizAttemptHistoryQuery(
  itemId: string,
  options?: Partial<UseQueryOptions<GetQuizAttemptHistoryResponse, Error>>,
) {
  return useQuery<GetQuizAttemptHistoryResponse, Error>({
    queryKey: ["quizAttemptHistory", itemId],
    queryFn: async () => {
      const client = getRpcClient(AssessmentService);
      return await client.getQuizAttemptHistory({ itemId });
    },
    enabled: !!itemId,
    ...options,
  });
}

export function useQuizAttemptDetailQuery(
  submissionId: string,
  options?: Partial<UseQueryOptions<GetQuizAttemptDetailResponse, Error>>,
) {
  return useQuery<GetQuizAttemptDetailResponse, Error>({
    queryKey: ["quizAttemptDetail", submissionId],
    queryFn: async () => {
      const client = getRpcClient(AssessmentService);
      return await client.getQuizAttemptDetail({ submissionId });
    },
    enabled: !!submissionId,
    ...options,
  });
}

export interface GradingQueueQueryParams {
  courseId?: string;
  itemId?: string;
  status?: GradingQueueStatus;
  pageSize?: number;
  pageToken?: string;
  searchQuery?: string;
}

export function useGradingQueueQuery(
  params: GradingQueueQueryParams,
  options?: Partial<UseQueryOptions<ListGradingQueueResponse, Error>>,
) {
  return useQuery<ListGradingQueueResponse, Error>({
    queryKey: ["gradingQueue", params],
    queryFn: async () => {
      const client = getRpcClient(AssessmentService);
      return await client.listGradingQueue({
        courseId: params.courseId || "",
        itemId: params.itemId || "",
        status: params.status ?? GradingQueueStatus.ALL,
        pageSize: params.pageSize || 50,
        pageToken: params.pageToken || "",
        searchQuery: params.searchQuery || "",
      });
    },
    enabled:
      options?.enabled !== undefined ? options.enabled : !!params.courseId || !!params.itemId,
    ...options,
  });
}

export function useGradingSubmissionDetailQuery(
  submissionId: string,
  options?: Partial<UseQueryOptions<GetGradingSubmissionDetailResponse, Error>>,
) {
  return useQuery<GetGradingSubmissionDetailResponse, Error>({
    queryKey: ["gradingSubmissionDetail", submissionId],
    queryFn: async () => {
      const client = getRpcClient(AssessmentService);
      return await client.getGradingSubmissionDetail({ submissionId });
    },
    enabled: !!submissionId,
    ...options,
  });
}

export function useClaimGradingTaskMutation(
  options?: Partial<UseMutationOptions<ClaimGradingTaskResponse, Error, { submissionId: string }>>,
) {
  const queryClient = useQueryClient();
  return useMutation<ClaimGradingTaskResponse, Error, { submissionId: string }>({
    mutationFn: async ({ submissionId }) => {
      const client = getRpcClient(AssessmentService);
      return await client.claimGradingTask({ submissionId });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["gradingQueue"] });
      queryClient.invalidateQueries({
        queryKey: ["gradingSubmissionDetail", vars.submissionId],
      });
    },
    ...options,
  });
}

export function useRenewGradingTaskLockMutation(
  options?: Partial<
    UseMutationOptions<
      RenewGradingTaskLockResponse,
      Error,
      { submissionId: string; extendMinutes?: number }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    RenewGradingTaskLockResponse,
    Error,
    { submissionId: string; extendMinutes?: number }
  >({
    mutationFn: async ({ submissionId, extendMinutes = 15 }) => {
      const client = getRpcClient(AssessmentService);
      return await client.renewGradingTaskLock({ submissionId, extendMinutes });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["gradingQueue"] });
      queryClient.invalidateQueries({
        queryKey: ["gradingSubmissionDetail", vars.submissionId],
      });
    },
    ...options,
  });
}

export function useReleaseGradingTaskMutation(
  options?: Partial<
    UseMutationOptions<ReleaseGradingTaskResponse, Error, { submissionId: string }>
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<ReleaseGradingTaskResponse, Error, { submissionId: string }>({
    mutationFn: async ({ submissionId }) => {
      const client = getRpcClient(AssessmentService);
      return await client.releaseGradingTask({ submissionId });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["gradingQueue"] });
      queryClient.invalidateQueries({
        queryKey: ["gradingSubmissionDetail", vars.submissionId],
      });
    },
    ...options,
  });
}

export function useSubmitStaffGradingMutation(
  options?: Partial<
    UseMutationOptions<
      SubmitStaffGradingResponse,
      Error,
      {
        submissionId: string;
        gradedCriteria: RubricCriteria[];
        totalScore: number;
        feedback?: string;
        resolveAppeal?: boolean;
        appealResolutionNotes?: string;
        provenance?: GradingProvenance;
      }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    SubmitStaffGradingResponse,
    Error,
    {
      submissionId: string;
      gradedCriteria: RubricCriteria[];
      totalScore: number;
      feedback?: string;
      resolveAppeal?: boolean;
      appealResolutionNotes?: string;
      provenance?: GradingProvenance;
    }
  >({
    mutationFn: async (payload) => {
      const client = getRpcClient(AssessmentService);
      return await client.submitStaffGrading(payload);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["gradingQueue"] });
      queryClient.invalidateQueries({
        queryKey: ["gradingSubmissionDetail", vars.submissionId],
      });
      queryClient.invalidateQueries({ queryKey: ["courseGradebook"] });
      queryClient.invalidateQueries({ queryKey: ["instructorActionTasks"] });
    },
    ...options,
  });
}
