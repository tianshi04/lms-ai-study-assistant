"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";

import { Button } from "@/components/ui/Button";
import { useCreateVNPayPaymentUrlMutation } from "@/lib/query_hooks";
import { PaymentTargetType, PlanType } from "@/gen/payment/v1/payment_pb";
import { CreditCard, Check, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/Progress";

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle?: string;
  priceVnd?: number;
}

export function PaymentCheckoutModal({
  isOpen,
  onClose,
  courseId,
  courseTitle = "Khóa học",
  priceVnd = 1190000,
}: PaymentCheckoutModalProps) {
  const [selectedOption, setSelectedOption] = useState<"SINGLE" | "PLUS_MONTHLY" | "PLUS_YEARLY">(
    "SINGLE",
  );
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const vnpayMutation = useCreateVNPayPaymentUrlMutation({
    onSuccess: (data) => {
      if (data.success && data.paymentUrl) {
        setFeedbackMsg({
          type: "success",
          text: "Đang chuyển hướng sang cổng thanh toán VNPay Sandbox…",
        });
        window.location.href = data.paymentUrl;
      } else {
        setFeedbackMsg({
          type: "error",
          text: data.message || "Không thể tạo liên kết thanh toán VNPay.",
        });
      }
    },
    onError: (err) => {
      setFeedbackMsg({
        type: "error",
        text: err.message || "Lỗi kết nối tới cổng thanh toán VNPay.",
      });
    },
  });

  const isLoading = vnpayMutation.isPending;

  const handleCheckout = () => {
    setFeedbackMsg(null);
    if (selectedOption === "SINGLE") {
      vnpayMutation.mutate({
        targetType: PaymentTargetType.COURSE,
        targetId: courseId,
      });
    } else if (selectedOption === "PLUS_MONTHLY") {
      vnpayMutation.mutate({
        targetType: PaymentTargetType.SYSTEM_SUBSCRIPTION,
        targetId: "coursera_plus",
        planType: PlanType.MONTHLY,
      });
    } else if (selectedOption === "PLUS_YEARLY") {
      vnpayMutation.mutate({
        targetType: PaymentTargetType.SYSTEM_SUBSCRIPTION,
        targetId: "coursera_plus",
        planType: PlanType.YEARLY,
      });
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content size="lg" className="p-6">
        <Dialog.Header>
          <Dialog.Icon icon={<CreditCard className="w-6 h-6 text-primary" aria-hidden="true" />} />
          <Dialog.Title>Nâng Cấp Quyền Truy Cập Paid Mode</Dialog.Title>
          <Dialog.Description>
            Mở khóa trọn vẹn bài thi tính điểm (Graded Quiz), bài tập thực hành Auto-Graded Lab,
            chấm chéo Peer Review và nhận Chứng chỉ Xác thực qua VNPay Gateway.
          </Dialog.Description>
        </Dialog.Header>

        {feedbackMsg && (
          <div
            className={`p-3 rounded-lg text-sm font-medium my-3 flex items-center gap-2 ${
              feedbackMsg.type === "success"
                ? "bg-success/10 text-success border border-success/30"
                : "bg-destructive/10 text-destructive border border-destructive/30"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <Check className="w-5 h-5 text-success" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {/* Mua lẻ */}
          <Button
            type="button"
            variant="outlined"
            aria-label="Chọn Mua Lẻ Khóa"
            onClick={() => setSelectedOption("SINGLE")}
            className={`text-left cursor-pointer p-4 rounded-xl border-2 h-auto flex-col justify-between items-start ${
              selectedOption === "SINGLE"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mua Lẻ Khóa
                </span>
                <span className="w-4 h-4 rounded-full border border-primary flex items-center justify-center">
                  {selectedOption === "SINGLE" && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </span>
              </div>
              <h4 className="font-semibold text-foreground text-base mb-1 min-w-0 line-clamp-1">
                {courseTitle}
              </h4>
              <p className="text-xs text-muted-foreground mb-3 font-normal">
                Quyền truy cập Paid Mode vĩnh viễn riêng khóa học này.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border w-full text-left">
              <span className="text-lg font-bold text-primary">
                {priceVnd.toLocaleString("vi-VN")} VNĐ
              </span>
            </div>
          </Button>

          {/* Coursera Plus - Tháng */}
          <Button
            type="button"
            variant="outlined"
            aria-label="Chọn Coursera Plus Gói Theo Tháng"
            onClick={() => setSelectedOption("PLUS_MONTHLY")}
            className={`text-left cursor-pointer p-4 rounded-xl border-2 h-auto flex-col justify-between relative items-start ${
              selectedOption === "PLUS_MONTHLY"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Coursera Plus
                </span>
                <span className="w-4 h-4 rounded-full border border-primary flex items-center justify-center">
                  {selectedOption === "PLUS_MONTHLY" && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </span>
              </div>
              <h4 className="font-semibold text-foreground text-base mb-1">Gói Theo Tháng</h4>
              <p className="text-xs text-muted-foreground mb-3 font-normal">
                Mở khóa 100% khóa học trên nền tảng trong 30 ngày.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border w-full text-left">
              <span className="text-lg font-bold text-primary">790,000 VNĐ</span>
              <span className="text-xs text-muted-foreground font-normal"> / tháng</span>
            </div>
          </Button>

          {/* Coursera Plus - Năm */}
          <Button
            type="button"
            variant="outlined"
            aria-label="Chọn Coursera Plus Gói Theo Năm"
            onClick={() => setSelectedOption("PLUS_YEARLY")}
            className={`text-left cursor-pointer p-4 rounded-xl border-2 h-auto flex-col justify-between relative items-start ${
              selectedOption === "PLUS_YEARLY"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span className="absolute -top-3 right-3 bg-warning text-warning-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
              Tiết kiệm hơn
            </span>
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-warning">
                  Coursera Plus
                </span>
                <span className="w-4 h-4 rounded-full border border-primary flex items-center justify-center">
                  {selectedOption === "PLUS_YEARLY" && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </span>
              </div>
              <h4 className="font-semibold text-foreground text-base mb-1">Gói Theo Năm</h4>
              <p className="text-xs text-muted-foreground mb-3 font-normal">
                Mở khóa 100% khóa học trong 365 ngày liên tục.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border w-full text-left">
              <span className="text-lg font-bold text-primary">5,900,000 VNĐ</span>
              <span className="text-xs text-muted-foreground font-normal"> / năm</span>
            </div>
          </Button>
        </div>

        <Dialog.Footer className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button variant="text" onClick={onClose} disabled={isLoading}>
            Hủy bỏ
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            variant="filled"
            className="min-w-[160px]"
          >
            {isLoading ? (
              <span aria-live="polite" className="flex items-center gap-2">
                <Progress.Circular size="sm" className="w-4 h-4" ariaLabel="Đang kết nối VNPay" />
                Đang kết nối VNPay…
              </span>
            ) : (
              "Thanh Toán VNPay"
            )}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
