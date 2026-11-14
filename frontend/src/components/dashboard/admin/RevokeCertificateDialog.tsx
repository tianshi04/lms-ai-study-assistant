"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { AdminCertificateSummary } from "@/gen/certificate/v1/certificate_pb";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useRevokeCertificateMutation } from "@/lib/queries/useCertificateQueries";

interface RevokeCertificateDialogProps {
  /** Certificate being revoked; the dialog is open while this is set. */
  certificate: AdminCertificateSummary | null;
  onClose: () => void;
}

export function RevokeCertificateDialog({ certificate, onClose }: RevokeCertificateDialogProps) {
  const toast = useToast();
  const revokeMutation = useRevokeCertificateMutation();
  const [reason, setReason] = useState("");

  const close = () => {
    setReason("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!certificate || !reason.trim()) return;
    try {
      const res = await revokeMutation.mutateAsync({
        certificateId: certificate.certificateId,
        reason: reason.trim(),
      });
      if (res.success) {
        toast.success(res.message || "Đã thu hồi chứng chỉ.");
        close();
      } else {
        toast.error(res.message || "Thu hồi chứng chỉ thất bại.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Thu hồi chứng chỉ thất bại.");
    }
  };

  return (
    <Dialog
      open={certificate !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Content size="md">
        <Dialog.Header>
          <Dialog.Icon
            icon={<ShieldAlert className="w-6 h-6 text-destructive" aria-hidden="true" />}
          />
          <Dialog.Title>Thu hồi chứng chỉ</Dialog.Title>
        </Dialog.Header>
        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Chứng chỉ{" "}
            <strong className="font-mono text-foreground">{certificate?.certificateId}</strong> của{" "}
            <strong className="text-foreground">{certificate?.learnerName}</strong> sẽ không còn hợp
            lệ khi xác minh công khai. Vui lòng nhập lý do thu hồi.
          </p>
          <div>
            <label htmlFor="revoke-reason" className="block text-xs font-bold mb-1 text-foreground">
              Lý do thu hồi *
            </label>
            <Textarea
              id="revoke-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Ví dụ: Vi phạm quy chế liêm chính học thuật…"
            />
          </div>
        </div>
        <Dialog.Footer className="mt-4">
          <Button type="button" variant="text" size="sm" onClick={close}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="filled"
            size="sm"
            className="bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-active"
            onClick={handleConfirm}
            disabled={revokeMutation.isPending || !reason.trim()}
          >
            <span aria-live="polite">
              {revokeMutation.isPending ? "Đang xử lý…" : "Xác nhận thu hồi"}
            </span>
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
