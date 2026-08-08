"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { type Course } from "@/gen/catalog/v1/catalog_pb";

interface ScormReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scormPreviewCourse: Course | null;
  scormObjectKey: string;
  courseId: string;
  scormImporting: boolean;
  onConfirmImport: (scormObjectKey: string, courseId: string) => Promise<void>;
}

export function ScormReviewModal({
  isOpen,
  onClose,
  scormPreviewCourse,
  scormObjectKey,
  courseId,
  scormImporting,
  onConfirmImport,
}: ScormReviewModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Import Khóa học Native (Level 1)</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 my-4">
          <div className="space-y-4">
            <div className="bg-success/10 p-4 rounded-2xl border border-success/20 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="success" className="px-2.5 py-0.5 text-xs font-bold">
                  Full Fidelity Native
                </Badge>
                <span className="text-[10px] font-mono text-muted-foreground">Level 1 Support</span>
              </div>
              <h4 className="text-sm font-bold text-success">Phát hiện khóa học Native OpenLMS</h4>
            </div>

            {scormPreviewCourse && (
              <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border">
                <p className="text-xs font-semibold text-foreground">
                  Tiêu đề: {scormPreviewCourse.title}
                </p>
                <p className="text-xs text-muted-foreground">{scormPreviewCourse.description}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs font-bold"
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onConfirmImport(scormObjectKey, courseId)}
            disabled={scormImporting}
            isLoading={scormImporting}
            className="rounded-xl text-xs font-bold shadow-md"
          >
            Xác nhận Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
