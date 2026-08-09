"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
  ArrowRight,
  CreditCard,
  Receipt,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListUserPurchasesQuery,
  useCreateVNPayPaymentUrlMutation,
  useCancelVNPayOrderMutation,
} from "@/lib/query_hooks";
import { PaymentOrderStatus, PaymentTargetType, PlanType } from "@/gen/payment/v1/payment_pb";
import { Button } from "@/components/ui/Button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/AlertDialog";
import { Tabs } from "@/components/ui/Tabs";

type FilterTab = "ALL" | "COMPLETED" | "PENDING" | "EXPIRED";

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + " VNĐ";
}

function formatDate(isoStr: string) {
  if (!isoStr) return "N/A";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

function MyPurchasesContent() {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [isMounted, setIsMounted] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: "success" | "error" | "cancelled";
    title: string;
    message: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useListUserPurchasesQuery();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const createVNPayMutation = useCreateVNPayPaymentUrlMutation({
    onSuccess: (res) => {
      if (res.success && res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else if (!res.success) {
        setActionNotice({
          type: "error",
          title: "Không thể khởi tạo thanh toán VNPay",
          message: res.message || "Cổng thanh toán không phản hồi hoặc thông tin không hợp lệ.",
        });
      }
    },
    onError: (err) => {
      setActionNotice({
        type: "error",
        title: "Lỗi kết nối thanh toán",
        message: err.message || "Không thể kết nối đến máy chủ xử lý đơn hàng VNPay.",
      });
    },
  });

  const cancelVNPayMutation = useCancelVNPayOrderMutation();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["userPurchasesAndOrders"] });
    await queryClient.invalidateQueries({ queryKey: ["userPaymentAccess"] });
    await queryClient.invalidateQueries({ queryKey: ["myEnrolledCourses"] });
    refetch();
  };

  const orders = data?.orders ?? [];

  const { daysRemaining, isPlusActive, formattedExpDate } = React.useMemo(() => {
    if (!isMounted) {
      return { daysRemaining: 0, isPlusActive: false, formattedExpDate: "" };
    }
    const rawSub = data?.activeSubscription;
    let expStr = rawSub?.expiresAt || "";

    // Fallback: If no activeSubscription object, check completed SYSTEM_SUBSCRIPTION orders
    if (!expStr && data?.orders?.length) {
      const completedSubOrders = data.orders.filter(
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
  }, [data, isMounted]);

  const handleSubscribePlus = (plan: PlanType) => {
    createVNPayMutation.mutate({
      targetType: PaymentTargetType.SYSTEM_SUBSCRIPTION,
      targetId: plan === PlanType.YEARLY ? "plus_yearly" : "plus_monthly",
      planType: plan,
    });
  };
  // Summary Metrics
  const totalOrders = orders.length;
  const completedCount = orders.filter(
    (o: any) => o.status === PaymentOrderStatus.COMPLETED,
  ).length;
  const totalSpent = orders
    .filter((o: any) => o.status === PaymentOrderStatus.COMPLETED)
    .reduce((acc: number, o: any) => acc + (o.amount || 0), 0);

  // Filtered Orders
  const filteredOrders = orders.filter((o: any) => {
    if (activeTab === "COMPLETED") {
      return o.status === PaymentOrderStatus.COMPLETED;
    }
    if (activeTab === "PENDING") {
      return o.status === PaymentOrderStatus.PENDING;
    }
    if (activeTab === "EXPIRED") {
      return (
        o.status === PaymentOrderStatus.EXPIRED ||
        o.status === PaymentOrderStatus.FAILED ||
        o.status === PaymentOrderStatus.CANCELLED
      );
    }
    return true;
  });

  const handleContinuePayment = (order: (typeof orders)[0]) => {
    createVNPayMutation.mutate({
      targetType: order.targetType,
      targetId: order.targetId,
      planType: order.planType,
    });
  };

  const handleCancelOrder = (order: (typeof orders)[0]) => {
    setOrderToCancel(order);
  };

  const confirmCancelOrder = () => {
    if (!orderToCancel) return;
    const targetOrder = orderToCancel;
    const txnRef = targetOrder.vnpTxnRef || (targetOrder as any).vnp_txn_ref || "";
    const orderId = targetOrder.id || (targetOrder as any).order_id || "";

    cancelVNPayMutation.mutate(
      {
        vnpTxnRef: txnRef,
        orderId: orderId,
      },
      {
        onSuccess: (res) => {
          setOrderToCancel(null);
          if (res.success) {
            setActionNotice({
              type: "cancelled",
              title: "Đã hủy giao dịch thanh toán VNPay",
              message:
                res.message ||
                `Đơn hàng #${txnRef || orderId.substring(0, 8)} đã được hủy thành công. Tài khoản của bạn không bị trừ tiền và bạn có thể đặt lại bất cứ lúc nào.`,
            });
            handleRefresh();
          } else {
            setActionNotice({
              type: "error",
              title: "Không thể hủy đơn hàng",
              message:
                res.message || "Không tìm thấy thông tin đơn hàng hoặc giao dịch đã hoàn tất.",
            });
          }
        },
        onError: (err) => {
          setOrderToCancel(null);
          setActionNotice({
            type: "error",
            title: "Lỗi xử lý hủy đơn hàng",
            message:
              err.message || "Đã xảy ra lỗi kết nối với máy chủ khi gửi yêu cầu hủy đơn hàng.",
          });
        },
      },
    );
  };

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-20 flex-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2">
            {"Mua hàng của tôi"}
          </h1>
          <p className="text-muted-foreground text-base">
            {
              "Quản lý tất cả đơn hàng, hóa đơn khóa học và lịch sử đối soát giao dịch VNPay của bạn."
            }
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleRefresh}
          disabled={isFetching}
          className="shrink-0 self-start md:self-auto"
        >
          <RefreshCw
            className={`w-4 h-4 text-primary ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isFetching ? "Đang đối soát…" : "Tải lại & Đối soát VNPay"}</span>
        </Button>
      </div>

      {/* VNPay Inline Cancellation & Action Notice Banner (NO TOAST) */}
      {actionNotice && (
        <div
          className={`mb-8 p-5 rounded-2xl border shadow-xs transition-all flex items-start justify-between gap-4 ${
            actionNotice.type === "cancelled"
              ? "bg-destructive/5 border-destructive/20 text-foreground"
              : actionNotice.type === "success"
                ? "bg-success/10 border-success/30 text-foreground"
                : "bg-destructive/10 border-destructive/30 text-foreground"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                actionNotice.type === "cancelled" || actionNotice.type === "error"
                  ? "bg-destructive/15 text-destructive border border-destructive/20"
                  : "bg-success/15 text-success border border-success/20"
              }`}
            >
              {actionNotice.type === "success" ? (
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              ) : (
                <XCircle className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">{actionNotice.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {actionNotice.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer shrink-0"
            aria-label="Đóng thông báo"
          >
            <span className="text-lg leading-none">✕</span>
          </button>
        </div>
      )}

      {/* Coursera Plus Hero Banner Card */}
      <div className="mb-8 p-6 rounded-3xl bg-primary-container/20 border border-primary/20 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-6 h-6 animate-pulse" aria-hidden="true" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">{"Coursera Plus"}</h2>
              {isPlusActive ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-success/10 text-success border border-success/20">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  {"Đang hoạt động"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">
                  {"Chưa kích hoạt"}
                </span>
              )}
            </div>

            {isPlusActive ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {"Tài khoản của bạn đang có quyền học không giới hạn tất cả các khóa học. Còn "}
                <strong className="text-primary font-extrabold text-base">
                  {daysRemaining} ngày
                </strong>
                {" sử dụng (Hết hạn vào "}
                <span className="text-foreground font-semibold">{formattedExpDate}</span>
                {")."}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {
                  "Đăng ký gói Coursera Plus để truy cập không giới hạn hơn 500+ khóa học chất lượng cao và nhận chứng chỉ hoàn tất."
                }
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubscribePlus(PlanType.MONTHLY)}
              isLoading={createVNPayMutation.isPending}
              className="gap-2 px-5 py-3 rounded-xl font-bold text-sm h-auto"
            >
              <CreditCard className="w-4 h-4" aria-hidden="true" />
              <span>{isPlusActive ? "Gia hạn Gói Tháng (+30d)" : "Đăng ký Gói Tháng (790k)"}</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => handleSubscribePlus(PlanType.YEARLY)}
              isLoading={createVNPayMutation.isPending}
              className="gap-2 px-5 py-3 rounded-xl font-bold text-sm h-auto"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>{isPlusActive ? "Gia hạn Gói Năm (+365d)" : "Nâng cấp Gói Năm (5.9Tr)"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {"Tổng số đơn hàng"}
            </p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{totalOrders}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/15 text-success flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {"Khóa học đã hoàn tất"}
            </p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {completedCount}{" "}
              <span className="text-xs font-normal text-muted-foreground">{"giao dịch"}</span>
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {"Tổng tiền đã chi"}
            </p>
            <p className="text-2xl font-bold text-primary mt-0.5">{formatVnd(totalSpent)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as FilterTab)}
        className="mb-6"
      >
        <Tabs.List className="overflow-x-auto pb-1">
          <Tabs.Tab value="ALL">{`Tất cả đơn hàng (${totalOrders})`}</Tabs.Tab>
          <Tabs.Tab value="COMPLETED">{`Đã mở khóa (${completedCount})`}</Tabs.Tab>
          <Tabs.Tab value="PENDING">
            {`Đang chờ thanh toán (${
              orders.filter((o: any) => o.status === PaymentOrderStatus.PENDING).length
            })`}
          </Tabs.Tab>
          <Tabs.Tab value="EXPIRED">
            {`Đã hết hạn / Hủy (${
              orders.filter(
                (o: any) =>
                  o.status === PaymentOrderStatus.EXPIRED ||
                  o.status === PaymentOrderStatus.FAILED ||
                  o.status === PaymentOrderStatus.CANCELLED,
              ).length
            })`}
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.Root>

      {/* Orders List */}
      {!isMounted || isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-6 animate-pulse h-32"
            />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-xl mx-auto shadow-xs my-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-5">
            <ShoppingBag className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{"Chưa có đơn hàng nào"}</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
            {activeTab === "ALL"
              ? "Bạn chưa thực hiện giao dịch mua khóa học hoặc đăng ký gói dịch vụ nào."
              : "Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/my-learning"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>{"Việc học của tôi"}</span>
            </Link>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>{"Khám phá khóa học"}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order: any) => {
            const isCompleted = order.status === PaymentOrderStatus.COMPLETED;
            const isPending = order.status === PaymentOrderStatus.PENDING;
            const isFailed = order.status === PaymentOrderStatus.FAILED;
            const isExpired = order.status === PaymentOrderStatus.EXPIRED;
            const isCancelled = order.status === PaymentOrderStatus.CANCELLED;

            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-2xl p-6 shadow-xs hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-muted text-foreground border border-border">
                      {order.vnpTxnRef || order.id.substring(0, 8)}
                    </span>

                    {/* Status Badge */}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/15 border border-success/30 text-success text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{"Đã mở khóa (Paid Mode)"}</span>
                      </span>
                    )}

                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/15 border border-warning/30 text-warning text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{"Đang chờ thanh toán (VNPay)"}</span>
                      </span>
                    )}

                    {isExpired && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border text-xs font-bold">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{"Đã hết hạn (15 phút)"}</span>
                      </span>
                    )}

                    {isCancelled && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{"Đã hủy giao dịch (VNPay)"}</span>
                      </span>
                    )}

                    {isFailed && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/15 border border-destructive/30 text-destructive text-xs font-bold">
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{"Thanh toán thất bại"}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-foreground line-clamp-1">
                    {order.targetTitle || "Sản phẩm LMS"}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{formatDate(order.createdAt)}</span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{"VNPay Gateway Sandbox"}</span>
                    </span>

                    {order.targetType === PaymentTargetType.SYSTEM_SUBSCRIPTION && (
                      <span className="flex items-center gap-1 text-primary font-semibold">
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{"Gói Thuê Bao hệ thống"}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center gap-4 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-border">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-muted-foreground font-semibold">{"Số tiền"}</p>
                    <p className="text-xl font-bold text-primary">{formatVnd(order.amount)}</p>
                  </div>

                  {isCompleted && (
                    <Link
                      href={
                        order.targetType === PaymentTargetType.COURSE && order.targetId
                          ? `/courses/${order.targetId}`
                          : "/my-learning"
                      }
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" aria-hidden="true" />
                      <span>{"Vào học ngay"}</span>
                    </Link>
                  )}

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleCancelOrder(order)}
                        disabled={cancelVNPayMutation.isPending || createVNPayMutation.isPending}
                        isLoading={cancelVNPayMutation.isPending}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                      >
                        <span>{"Hủy đơn"}</span>
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleContinuePayment(order)}
                        disabled={createVNPayMutation.isPending || cancelVNPayMutation.isPending}
                        isLoading={createVNPayMutation.isPending}
                        className="px-5 py-2.5 rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground text-sm font-semibold"
                      >
                        <CreditCard className="w-4 h-4" aria-hidden="true" />
                        <span>{"Tiếp tục thanh toán"}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Order Cancellation */}
      <AlertDialog
        open={!!orderToCancel}
        onOpenChange={(open) => {
          if (!open && !cancelVNPayMutation.isPending) {
            setOrderToCancel(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy đơn hàng</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToCancel && (
                <span>
                  {"Bạn có chắc chắn muốn hủy đơn hàng "}
                  <strong className="font-mono font-bold text-foreground">
                    {orderToCancel.vnpTxnRef ||
                      (orderToCancel as any).vnp_txn_ref ||
                      orderToCancel.id?.substring(0, 8)}
                  </strong>
                  {" ("}
                  {formatVnd(orderToCancel.amount || 0)}
                  {
                    ")? Đơn hàng sẽ chuyển sang trạng thái đã hủy và bạn có thể đăng ký lại bất cứ lúc nào."
                  }
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setOrderToCancel(null)}
              disabled={cancelVNPayMutation.isPending}
            >
              Quay lại
            </Button>
            <Button
              variant="danger"
              onClick={confirmCancelOrder}
              disabled={cancelVNPayMutation.isPending}
            >
              {cancelVNPayMutation.isPending ? "Đang xử lý..." : "Đồng ý hủy đơn"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export default function MyPurchasesPage() {
  return (
    <Suspense
      fallback={
        <main className="w-full max-w-7xl mx-auto px-6 pt-12 pb-20 flex-1">
          <div className="bg-card border border-border rounded-3xl p-12 text-center max-w-2xl mx-auto animate-pulse h-64" />
        </main>
      }
    >
      <MyPurchasesContent />
    </Suspense>
  );
}
