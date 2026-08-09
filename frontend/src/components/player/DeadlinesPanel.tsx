"use client";

import { RotateCcw, Calendar } from "lucide-react";
import type { LearningProgress } from "@/gen/learning/v1/learning_pb";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface DeadlinesPanelProps {
  progress: LearningProgress | null;
  onResetDeadlines: () => void;
}

export function DeadlinesPanel({ progress, onResetDeadlines }: DeadlinesPanelProps) {
  if (!progress) {
    return (
      <div aria-live="polite" className="text-center text-xs text-on-surface-variant py-6">
        {"Đang tải…"}
      </div>
    );
  }

  const hasOverdue = progress.weeklyDeadlines.some((d) => d.status === 2);

  return (
    <div className="w-full space-y-4">
      <Card
        variant="outlined"
        className="w-full bg-surface-container-low/50 border border-outline-variant/60 p-4 rounded-2xl space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>{"Các mốc Deadline sắp tới"}</span>
            </h4>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {"Hạn nộp linh hoạt (Flexible Deadlines)"}
            </p>
          </div>
          {hasOverdue && (
            <Button
              type="button"
              onClick={onResetDeadlines}
              className="px-3.5 py-1.5 bg-warning hover:bg-warning-hover text-warning-foreground text-xs font-bold rounded-full border border-warning/30 animate-pulse shrink-0"
            >
              <RotateCcw aria-hidden="true" className="w-3.5 h-3.5" />
              Reset Deadlines
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2.5 pt-1">
          {progress.weeklyDeadlines.map((d) => (
            <div
              key={d.weekNumber}
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                d.status === 2
                  ? "bg-error-container/30 border-error/30 text-on-error-container font-medium"
                  : "bg-surface-container-lowest border-outline-variant/70 text-on-surface hover:border-primary/40 shadow-2xs"
              }`}
            >
              <div>
                <span className="font-bold block">
                  {"Tuần"} {d.weekNumber}
                </span>
                <span className="text-[10px] text-on-surface-variant">{d.dueDate}</span>
              </div>
              <Badge variant={d.status === 2 ? "error" : "primary"}>
                {d.status === 2 ? "OVERDUE" : "ON TRACK"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
