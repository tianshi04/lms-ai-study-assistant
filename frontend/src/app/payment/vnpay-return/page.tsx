"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  BookOpen,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { PaymentService, PaymentTargetType, PlanType } from "@/gen/payment/v1/payment_pb";
import { useCreateVNPayPaymentUrlMutation } from "@/lib/query_hooks";
import { Button } from "@/components/ui/Button";

const client = getRpcClient(PaymentService);

function VNPayReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("Đang xác thực kết quả thanh toán…");
  const [targetType, setTargetType] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [rawTargetType, setRawTargetType] = useState<PaymentTargetType>(
    PaymentTargetType.UNSPECIFIED,
  );
  const [planType, setPlanType] = useState<PlanType>(PlanType.UNSPECIFIED);
  const [retryError, setRetryError] = useState<string | null>(null);

  const createVNPayUrlMutation = useCreateVNPayPaymentUrlMutation({
    onSuccess: (data) => {
      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setRetryError(data.message || "Không thể khởi tạo liên kết thanh toán mới.");
      }
    },
    onError: (err) => {
      setRetryError(err.message || "Lỗi kết nối khi khởi tạo giao dịch mới.");
    },
  });

  const isRetrying = createVNPayUrlMutation.isPending;

  useEffect(() => {
    async function verifyPayment() {
      const queryMap: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        queryMap[key] = value;
      });

      if (Object.keys(queryMap).length === 0) {
        setLoading(false);
        setSuccess(false);
        setMessage("Không tìm thấy thông tin phản hồi từ cổng thanh toán.");
        return;
      }

      try {
        const response = await client.verifyVNPayPayment({
          queryParams: queryMap,
        });

        setSuccess(response.success);
        setMessage(
          response.message ||
            (response.success ? "Thanh toán thành công!" : "Giao dịch không thành công."),
        );
        setTargetId(response.targetId);
        setRawTargetType(response.targetType);
        setPlanType(response.planType);

        if (response.targetType === PaymentTargetType.COURSE) {
          setTargetType("COURSE");
        } else if (response.targetType === PaymentTargetType.SYSTEM_SUBSCRIPTION) {
          setTargetType("SYSTEM_SUBSCRIPTION");
        }

        if (response.success) {
          queryClient.invalidateQueries({ queryKey: ["userPurchasesAndOrders"] });
          queryClient.invalidateQueries({ queryKey: ["userPaymentAccess"] });
        }
      } catch (err: unknown) {
        setSuccess(false);
        const errMsg = err instanceof Error ? err.message : "Có lỗi xảy ra khi xác thực giao dịch.";
        setMessage(errMsg);
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [searchParams, queryClient]);

  const handleRetryPayment = () => {
    setRetryError(null);
    if (rawTargetType !== PaymentTargetType.UNSPECIFIED && targetId) {
      createVNPayUrlMutation.mutate({
        targetType: rawTargetType,
        targetId: targetId,
        planType: planType,
      });
    } else if (targetId) {
      createVNPayUrlMutation.mutate({
        targetType: PaymentTargetType.COURSE,
        targetId: targetId,
      });
    } else {
      router.push("/courses");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center shadow-lg">
          <Loader2
            aria-hidden="true"
            className="w-12 h-12 text-primary animate-spin mx-auto mb-4"
          />
          <h2 className="text-xl font-bold mb-2">Đang xác nhận giao dịch</h2>
          <p className="text-sm text-muted-foreground">
            Vui lòng chờ trong giây lát, hệ thống đang đối soát chữ ký bảo mật với VNPay…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-lg w-full text-center shadow-xl">
        {success ? (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success">
              <CheckCircle2 aria-hidden="true" className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Thanh toán thành công!</h1>
              <p className="text-sm text-muted-foreground mt-2">{message}</p>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 border border-border text-left text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cổng thanh toán:</span>
                <span className="font-medium text-foreground">VNPay Sandbox</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loại dịch vụ:</span>
                <span className="font-medium text-foreground">
                  {targetType === "COURSE"
                    ? "Mua lẻ Khóa học"
                    : targetType === "SYSTEM_SUBSCRIPTION"
                      ? "Gói Coursera Plus"
                      : "Đơn hàng LMS"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái:</span>
                <span className="font-semibold text-success">Đã mở khóa (Paid Mode)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {targetType === "COURSE" && targetId ? (
                <Link
                  href={`/courses/${targetId}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover px-5 py-3 rounded-lg font-medium transition-colors"
                >
                  <BookOpen aria-hidden="true" className="w-4 h-4" />
                  Vào học ngay
                </Link>
              ) : targetType === "SYSTEM_SUBSCRIPTION" ? (
                <Link
                  href="/my-purchases"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover px-5 py-3 rounded-lg font-medium transition-colors"
                >
                  <ShoppingBag aria-hidden="true" className="w-4 h-4" />
                  Xem quản lý mua hàng
                </Link>
              ) : (
                <Link
                  href="/my-learning"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover px-5 py-3 rounded-lg font-medium transition-colors"
                >
                  <BookOpen aria-hidden="true" className="w-4 h-4" />
                  Góc học tập của tôi
                </Link>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 bg-muted text-muted-foreground hover:bg-muted/80 px-5 py-3 rounded-lg font-medium transition-colors"
              >
                Trang chủ
                <ArrowRight aria-hidden="true" className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
              <XCircle aria-hidden="true" className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {message.includes("hủy bởi người dùng")
                  ? "Đã hủy giao dịch thanh toán"
                  : "Giao dịch không thành công"}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">{message}</p>
            </div>

            <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/20 text-left text-sm space-y-2">
              <p className="text-xs text-muted-foreground">
                Giao dịch của bạn có thể đã bị hủy hoặc gặp sự cố trong quá trình xử lý thanh toán
                trên ngân hàng. Tài khoản của bạn chưa bị trừ tiền.
              </p>
              {retryError && (
                <p className="text-xs text-destructive font-medium border-t border-destructive/20 pt-2">
                  {retryError}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                onClick={handleRetryPayment}
                disabled={isRetrying}
                className="flex-1 px-5 py-3 rounded-lg font-medium"
              >
                <RefreshCw aria-hidden="true" className="w-4 h-4" />
                <span>{"Thử lại"}</span>
              </Button>
              <Link
                href="/courses"
                className="inline-flex items-center justify-center gap-2 bg-muted text-muted-foreground hover:bg-muted/80 px-5 py-3 rounded-lg font-medium transition-colors"
              >
                Danh sách khóa học
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VNPayReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <Loader2 aria-hidden="true" className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <VNPayReturnContent />
    </Suspense>
  );
}
