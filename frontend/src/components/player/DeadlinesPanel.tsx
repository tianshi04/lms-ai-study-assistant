"use client";

import { RotateCcw } from "lucide-react";
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
    <div className="max-w-3xl mx-auto space-y-5">
      <Card variant="filled" className="border border-outline-variant p-4 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-on-surface">{"Các mốc Deadline sắp tới"}</h4>
            <p className="text-xs text-on-surface-variant">
              {"Hạn nộp linh hoạt (Flexible Deadlines)"}
            </p>
          </div>
          {hasOverdue && (
            <Button
              type="button"
              onClick={onResetDeadlines}
              className="px-4 py-2 bg-warning hover:bg-warning-hover text-warning-foreground text-xs font-bold rounded-full border border-warning/30 animate-pulse"
            >
              <RotateCcw aria-hidden="true" className="w-3.5 h-3.5" />
              Reset My Deadlines
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {progress.weeklyDeadlines.map((d) => (
            <div
              key={d.weekNumber}
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition-colors ${
                d.status === 2
                  ? "bg-warning/10 border-warning/30 text-warning"
                  : "bg-surface-container-high border-outline-variant text-on-surface"
              }`}
            >
              <div>
                <span className="font-bold block">
                  {"Tuần"} {d.weekNumber}
                </span>
                <span className="text-[10px] opacity-80">{d.dueDate}</span>
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
