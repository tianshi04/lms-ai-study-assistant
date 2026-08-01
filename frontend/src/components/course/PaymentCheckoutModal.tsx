"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { usePurchaseCourseMutation, useSubscribeCourseraPlusMutation } from "@/lib/query_hooks";
import { PlanType } from "@/gen/payment/v1/payment_pb";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState<"SINGLE" | "PLUS_MONTHLY" | "PLUS_YEARLY">(
    "SINGLE",
  );
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const purchaseMutation = usePurchaseCourseMutation({
    onSuccess: (data) => {
      if (data.success) {
        setFeedbackMsg({
          type: "success",
          text: data.message || "Thanh toán mua khóa học thành công!",
        });
        queryClient.invalidateQueries({ queryKey: ["paymentAccess", courseId] });
        setTimeout(() => {
          onClose();
          setFeedbackMsg(null);
        }, 1500);
      } else {
        setFeedbackMsg({ type: "error", text: data.message || "Thanh toán thất bại." });
      }
    },
    onError: (err) => {
      setFeedbackMsg({ type: "error", text: err.message || "Lỗi kết nối thanh toán." });
    },
  });

  const subscribeMutation = useSubscribeCourseraPlusMutation({
    onSuccess: (data) => {
      if (data.success) {
        setFeedbackMsg({
          type: "success",
          text: data.message || "Đăng ký Coursera Plus thành công!",
        });
        queryClient.invalidateQueries({ queryKey: ["paymentAccess", courseId] });
        setTimeout(() => {
          onClose();
          setFeedbackMsg(null);
        }, 1500);
      } else {
        setFeedbackMsg({ type: "error", text: data.message || "Đăng ký thuê bao thất bại." });
      }
    },
    onError: (err) => {
      setFeedbackMsg({ type: "error", text: err.message || "Lỗi kết nối thanh toán." });
    },
  });

  const isLoading = purchaseMutation.isPending || subscribeMutation.isPending;

  const handleCheckout = () => {
    setFeedbackMsg(null);
    if (selectedOption === "SINGLE") {
      purchaseMutation.mutate({ courseId, paymentMethod: "MOCK" });
    } else if (selectedOption === "PLUS_MONTHLY") {
      subscribeMutation.mutate({ planType: PlanType.MONTHLY, paymentMethod: "MOCK" });
    } else if (selectedOption === "PLUS_YEARLY") {
      subscribeMutation.mutate({ planType: PlanType.YEARLY, paymentMethod: "MOCK" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Nâng Cấp Quyền Truy Cập Paid Mode
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Mở khóa trọn vẹn bài thi tính điểm (Graded Quiz), bài tập thực hành Auto-Graded Lab,
            chấm chéo Peer Review và nhận Chứng chỉ Xác thực.
          </DialogDescription>
        </DialogHeader>

        {feedbackMsg && (
          <div
            className={`p-3 rounded-lg text-sm font-medium my-3 flex items-center gap-2 ${
              feedbackMsg.type === "success"
                ? "bg-success/10 text-success border border-success/30"
                : "bg-destructive/10 text-destructive border border-destructive/30"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <svg
                className="w-5 h-5 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          {/* Mua lẻ */}
          <div
            onClick={() => setSelectedOption("SINGLE")}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
              selectedOption === "SINGLE"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div>
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
              <h4 className="font-semibold text-foreground text-base mb-1 line-clamp-1">
                {courseTitle}
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Quyền truy cập Paid Mode vĩnh viễn riêng khóa học này.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <span className="text-lg font-bold text-primary">
                {priceVnd.toLocaleString("vi-VN")} VNĐ
              </span>
            </div>
          </div>

          {/* Coursera Plus - Tháng */}
          <div
            onClick={() => setSelectedOption("PLUS_MONTHLY")}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col justify-between relative ${
              selectedOption === "PLUS_MONTHLY"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div>
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
              <p className="text-xs text-muted-foreground mb-3">
                Mở khóa 100% khóa học trên nền tảng trong 30 ngày.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <span className="text-lg font-bold text-primary">399,000 VNĐ</span>
              <span className="text-xs text-muted-foreground font-normal"> / tháng</span>
            </div>
          </div>

          {/* Coursera Plus - Năm */}
          <div
            onClick={() => setSelectedOption("PLUS_YEARLY")}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col justify-between relative ${
              selectedOption === "PLUS_YEARLY"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span className="absolute -top-3 right-3 bg-warning text-warning-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
              Tặng 2 tháng
            </span>
            <div>
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
              <p className="text-xs text-muted-foreground mb-3">
                Mở khóa 100% khóa học trong 365 ngày liên tục.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <span className="text-lg font-bold text-primary">3,990,000 VNĐ</span>
              <span className="text-xs text-muted-foreground font-normal"> / năm</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Hủy bỏ
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            variant="primary"
            className="min-w-[140px]"
          >
            {isLoading ? (
              <span aria-live="polite" className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-primary-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Đang xử lý…
              </span>
            ) : (
              "Thanh Toán Ngay"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
