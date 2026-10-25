import { PaymentOrderStatus, PaymentTargetType, PlanType } from "@/gen/payment/v1/payment_pb";

export interface SubscriptionStatus {
  daysRemaining: number;
  isPlusActive: boolean;
  formattedExpDate: string;
}

/**
 * Computes subscription status, active flag, remaining days and formatted expiration date.
 */
export function computeSubscriptionStatus(
  activeSubscription?: { expiresAt?: string } | null,
  orders?: Array<{
    status: number | PaymentOrderStatus;
    targetType: number | PaymentTargetType;
    planType: number | PlanType;
    createdAt: string;
  }>,
): SubscriptionStatus {
  const rawSub = activeSubscription;
  let expStr = rawSub?.expiresAt || "";

  // Fallback: If no activeSubscription object, check completed SYSTEM_SUBSCRIPTION orders
  if (!expStr && orders?.length) {
    const completedSubOrders = orders.filter(
      (o) =>
        o.status === PaymentOrderStatus.COMPLETED &&
        o.targetType === PaymentTargetType.SYSTEM_SUBSCRIPTION,
    );
    if (completedSubOrders.length > 0) {
      let accumulatedExp: Date | null = null;
      const sorted = [...completedSubOrders].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      for (const o of sorted) {
        const addDays = o.planType === PlanType.YEARLY ? 365 : 30;
        const orderDate = new Date(o.createdAt);
        if (!accumulatedExp || accumulatedExp.getTime() < orderDate.getTime()) {
          accumulatedExp = new Date(orderDate.getTime() + addDays * 24 * 60 * 60 * 1000);
        } else {
          accumulatedExp = new Date(accumulatedExp.getTime() + addDays * 24 * 60 * 60 * 1000);
        }
      }
      if (accumulatedExp) {
        expStr = accumulatedExp.toISOString();
      }
    }
  }

  if (!expStr) {
    return { daysRemaining: 0, isPlusActive: false, formattedExpDate: "" };
  }

  const expTime = new Date(expStr.trim().replace(" ", "T")).getTime();
  const nowTime = Date.now();
  const diffDays = Math.ceil((expTime - nowTime) / (1000 * 60 * 60 * 24));
  const active = !isNaN(expTime) && diffDays > 0;
  let formattedDate = "";
  try {
    formattedDate = new Date(expTime).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    formattedDate = expStr;
  }

  return {
    daysRemaining: active ? diffDays : 0,
    isPlusActive: active,
    formattedExpDate: formattedDate,
  };
}
