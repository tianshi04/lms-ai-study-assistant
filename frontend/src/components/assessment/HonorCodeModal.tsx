"use client";

import React, { useState } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface HonorCodeModalProps {
  itemId: string;
  userId?: string;
  isOpen: boolean;
  onAgreed: () => void;
  onClose: () => void;
}

export function HonorCodeModal({ itemId, isOpen, onAgreed, onClose }: HonorCodeModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!isChecked) {
      setErrorMsg("Bạn phải đồng ý với Quy tắc Liêm chính Học thuật để tiếp tục.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitHonorCode({
        itemId,
        isAgreed: true,
      });

      if (res.success) {
        onAgreed();
      } else {
        setErrorMsg(res.message || "Không thể xác nhận Quy tắc Liêm chính.");
      }
    } catch (err) {
      // Fallback for offline demo mode
      console.warn("RPC submitHonorCode failed, using local fallback:", err);
      onAgreed();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quy tắc Liêm chính Học thuật"
      description="Cam kết trung thực học tập"
      size="md"
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Bằng việc nộp bài kiểm tra này, tôi xác nhận tất cả nội dung làm bài đều là kết quả làm
          việc trung thực của chính tôi.
        </p>

        <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-foreground space-y-2">
          <h4 className="font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 text-warning">
            <svg
              className="w-4 h-4 text-warning shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Quy định liêm chính nghiêm ngặt:</span>
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            <li>Tôi không sao chép mã nguồn, bài viết hoặc đáp án từ nguồn bên ngoài.</li>
            <li>Tôi không chia sẻ đáp án lên các diễn đàn công cộng hoặc công cụ AI.</li>
            <li>Tôi hiểu rằng các vi phạm có thể dẫn đến việc hủy bỏ chứng chỉ.</li>
          </ul>
        </div>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-muted border border-border transition-colors">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-primary focus-visible:ring-2 focus-visible:ring-ring border-input"
          />
          <span className="text-xs font-medium text-foreground leading-snug">
            Tôi hiểu và đồng ý tuân thủ Quy tắc Liêm chính Học thuật.
          </span>
        </label>

        {errorMsg && (
          <p className="text-xs font-semibold text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/30">
            {errorMsg}
          </p>
        )}

        <div className="pt-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isChecked}
            isLoading={isSubmitting}
          >
            Tôi đồng ý & Tiếp tục
          </Button>
        </div>
      </div>
    </Modal>
  );
}
