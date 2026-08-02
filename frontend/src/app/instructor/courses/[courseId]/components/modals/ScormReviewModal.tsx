"use client";

import { Modal } from "@/components/ui/Modal";
import { ItemType, type Course } from "@/gen/catalog/v1/catalog_pb";

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
    <Modal isOpen={isOpen} onClose={onClose} title="Import Khóa học Native (Level 1)" size="xl">
      <div className="space-y-6">
        {/* LEVEL 1: NATIVE COURSE */}
        <div className="space-y-4">
          <div className="bg-success/10 p-4 rounded-2xl border border-success/20 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success text-success-foreground">
                Full Fidelity Native
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Level 1 Support</span>
            </div>
            <h4 className="text-sm font-bold text-success">
              {"Phát hiện khóa học Native OpenLMS"}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {
                "Hệ thống sẽ tiến hành nhập và khôi phục toàn bộ cấu trúc Tuần/Bài học/Học liệu và toàn bộ cài đặt nguyên bản vào khóa học hiện tại."
              }
            </p>
          </div>

          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Cấu trúc khóa học sẽ được khôi phục:
          </div>
          <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
            {scormPreviewCourse?.weekModules?.map((wm, wIdx) => (
              <div
                key={wm.id || wIdx}
                className="bg-muted/50 p-4 rounded-xl border border-border space-y-3"
              >
                <div className="font-bold text-sm text-foreground">
                  Tuần {wm.weekNumber}: {wm.title}
                </div>
                <div className="space-y-2 pl-4 border-l-2 border-primary">
                  {wm.lessons?.map((l, lIdx) => (
                    <div key={l.id || lIdx} className="space-y-1">
                      <div className="text-xs font-semibold text-foreground">
                        📖 {l.title} ({l.estimatedMinutes} min)
                      </div>
                      <div className="space-y-1 pl-3">
                        {l.items?.map((item, iIdx) => (
                          <div
                            key={item.id || iIdx}
                            className="text-xs text-muted-foreground flex items-center justify-between bg-card p-2 rounded-lg border border-border"
                          >
                            <span>📄 {item.title}</span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {ItemType[item.type] || "SCORM"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
          >
            {"Hủy"}
          </button>
          <button
            type="button"
            onClick={() => onConfirmImport(scormObjectKey, courseId)}
            disabled={scormImporting}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {scormImporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span aria-live="polite">Đang Import…</span>
              </>
            ) : (
              <span>{"Xác nhận Import"}</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
