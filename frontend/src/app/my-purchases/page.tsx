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
  Loader2,
  Sparkles,
} from "lucide-react";
import { useListUserPurchasesQuery, useCreateVNPayPaymentUrlMutation } from "@/lib/query_hooks";
import { PaymentOrderStatus, PaymentTargetType } from "@/gen/payment/v1/payment_pb";

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
  const { data, isLoading, isFetching, refetch } = useListUserPurchasesQuery();
  const createVNPayMutation = useCreateVNPayPaymentUrlMutation({
    onSuccess: (res) => {
      if (res.success && res.paymentUrl) {
        window.location.href = res.paymentUrl;
      }
    },
  });

  const orders: any[] = data?.orders ?? [];

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
      return o.status === PaymentOrderStatus.EXPIRED || o.status === PaymentOrderStatus.FAILED;
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
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 shrink-0 self-start md:self-auto"
        >
          <RefreshCw
            className={`w-4 h-4 text-primary ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{isFetching ? "Đang đối soát…" : "Tải lại & Đối soát VNPay"}</span>
        </button>
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
      <div className="flex items-center gap-2 border-b border-border mb-6 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === "ALL"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {`Tất cả đơn hàng (${totalOrders})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("COMPLETED")}
          className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === "COMPLETED"
              ? "border-success text-success bg-success/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {`Đã mở khóa (${completedCount})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("PENDING")}
          className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === "PENDING"
              ? "border-warning text-warning bg-warning/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {`Đang chờ thanh toán (${
            orders.filter((o: any) => o.status === PaymentOrderStatus.PENDING).length
          })`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("EXPIRED")}
          className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === "EXPIRED"
              ? "border-muted-foreground text-foreground bg-muted/50"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {`Đã hết hạn / Hủy (${
            orders.filter(
              (o: any) =>
                o.status === PaymentOrderStatus.EXPIRED || o.status === PaymentOrderStatus.FAILED,
            ).length
          })`}
        </button>
      </div>

      {/* Orders List */}
      {isLoading ? (
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
                    <button
                      type="button"
                      onClick={() => handleContinuePayment(order)}
                      disabled={createVNPayMutation.isPending}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {createVNPayMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <CreditCard className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span>{"Tiếp tục thanh toán"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
