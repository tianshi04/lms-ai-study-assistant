"use client";

import { RotateCcw } from "lucide-react";
import type { LearningProgress } from "@/gen/learning/v1/learning_pb";
import { Button } from "@/components/ui/Button";

interface DeadlinesPanelProps {
  progress: LearningProgress | null;
  onResetDeadlines: () => void;
}

function formatDueDate(isoStr: string) {
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr;
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

export function DeadlinesPanel({ progress, onResetDeadlines }: DeadlinesPanelProps) {
  if (!progress) {
    return (
      <div aria-live="polite" className="text-center text-xs text-muted-foreground py-6">
        {"Đang tải…"}
      </div>
    );
  }

  const hasOverdue = progress.weeklyDeadlines.some((d) => d.status === 2);

  return (
    <div className="w-full space-y-3">
      {hasOverdue && (
        <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-warning">Bạn có hạn nộp bài đã quá hạn.</span>
          <Button
            type="button"
            variant="outlined"
            size="sm"
            onClick={onResetDeadlines}
            className="text-xs font-bold rounded-full shrink-0 border-warning/40 text-warning hover:bg-warning/10"
          >
            <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 mr-1" />
            Gia hạn
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5">
        {progress.weeklyDeadlines.map((d) => (
          <div
            key={d.weekNumber}
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
              d.status === 2
                ? "bg-destructive/10 border-destructive/30 text-destructive font-medium"
                : "bg-surface-container-low/50 border-border/80 text-foreground hover:border-primary/40"
            }`}
          >
            <div>
              <span className="font-bold block text-sm">
                {"Tuần"} {d.weekNumber}
              </span>
              <span className="text-[11px] text-muted-foreground">{formatDueDate(d.dueDate)}</span>
            </div>
            {d.status === 2 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                QUÁ HẠN
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/30">
                ĐÚNG HẠN
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
