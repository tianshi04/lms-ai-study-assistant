import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import {
  PaymentService,
  PlanType,
  PaymentTargetType,
  type CoursePurchase,
  type UserSubscription,
} from "@/gen/payment/v1/payment_pb";

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

export function useCancelVNPayOrderMutation(
  options?: Partial<
    UseMutationOptions<
      {
        success: boolean;
        message: string;
      },
      Error,
      { vnpTxnRef?: string; orderId?: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    {
      success: boolean;
      message: string;
    },
    Error,
    { vnpTxnRef?: string; orderId?: string }
  >({
    mutationFn: async ({ vnpTxnRef, orderId }) => {
      const client = getRpcClient(PaymentService);
      const res = await client.cancelVNPayOrder({
        vnpTxnRef: vnpTxnRef ?? "",
        orderId: orderId ?? "",
      });
      return {
        success: res.success,
        message: res.message,
      };
    },
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["userPurchasesAndOrders"] });
      options?.onSuccess?.(data, variables, context as unknown as never, queryClient as never);
    },
  });
}

export function useListUserPurchasesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["userPurchasesAndOrders"],
    queryFn: async () => {
      const client = getRpcClient(PaymentService);
      const res = await client.listUserPurchases({});
      return {
        purchases: res.purchases ?? [],
        orders: res.orders ?? [],
        activeSubscription: res.activeSubscription,
      };
    },
    staleTime: 0,
    refetchOnMount: "always",
    ...options,
  });
}
