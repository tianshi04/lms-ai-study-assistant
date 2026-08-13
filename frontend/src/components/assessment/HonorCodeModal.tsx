"use client";

import { useState } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { Dialog } from "@/components/ui/Dialog";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ShieldCheck, AlertTriangle, Send } from "lucide-react";

import { mapConnectError } from "@/lib/connect_error_mapper";

interface HonorCodeModalProps {
  itemId: string;
  isOpen: boolean;
  isSubmitting?: boolean;
  onAgreedAndSubmit: () => Promise<void>;
  onClose: () => void;
}

export function HonorCodeModal({
  itemId,
  isOpen,
  isSubmitting = false,
  onAgreedAndSubmit,
  onClose,
}: HonorCodeModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async () => {
    if (!isChecked) {
      setErrorMsg("Bạn phải tích chọn đồng ý với Quy tắc Liêm chính Học thuật để nộp bài.");
      return;
    }

    setErrorMsg("");

    try {
      const client = getRpcClient(AssessmentService);
      await client.submitHonorCode({
        itemId,
        isAgreed: true,
      });
      await onAgreedAndSubmit();
    } catch (err) {
      setErrorMsg(mapConnectError(err, "Không thể nộp Cam kết Trung thực. Vui lòng thử lại."));
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content size="md">
        <Dialog.Header>
          <Dialog.Icon icon={<ShieldCheck className="w-6 h-6 text-primary" aria-hidden="true" />} />
          <Dialog.Title>Xác nhận Nộp bài & Cam kết Trung thực</Dialog.Title>
          <Dialog.Description>
            Vui lòng kiểm tra kỹ bài làm và cam kết liêm chính học thuật trước khi nộp.
          </Dialog.Description>
        </Dialog.Header>

        <div className="space-y-4 text-sm text-muted-foreground my-4">
          <p className="text-foreground font-medium">
            Bằng việc nộp bài kiểm tra này, tôi xác nhận tất cả nội dung trả lời đều là kết quả làm
            việc trung thực của chính tôi.
          </p>

          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-foreground space-y-2">
            <h4 className="font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 text-warning">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" aria-hidden="true" />
              <span>Quy định liêm chính học thuật:</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              <li>Tôi không sao chép mã nguồn, bài viết hoặc đáp án từ nguồn bên ngoài.</li>
              <li>Tôi không chia sẻ đáp án lên các diễn đàn công cộng hoặc công cụ AI.</li>
              <li>Tôi hiểu rằng các vi phạm có thể dẫn đến việc hủy bỏ kết quả bài thi.</li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border">
            <Checkbox
              id="honor-code-agreement-checkbox"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(!!checked)}
              label="Tôi xác nhận các đáp án trên và đồng ý tuân thủ Quy tắc Liêm chính Học thuật."
            />
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/30">
              {errorMsg}
            </p>
          )}
        </div>

        <Dialog.Footer>
          <Button variant="text" onClick={onClose} disabled={isSubmitting}>
            Hủy / Kiểm tra lại
          </Button>
          <Button
            variant="filled"
            onClick={handleSubmit}
            disabled={!isChecked || isSubmitting || isSubmitting}
          >
            {isSubmitting ? "Đang chấm điểm…" : "Đồng ý & Nộp bài ngay"}
            {!isSubmitting && <Send aria-hidden="true" className="w-3.5 h-3.5 ml-1.5" />}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
