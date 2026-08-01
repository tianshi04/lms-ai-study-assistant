"use client";

import type { LearningProgress } from "@/gen/learning/v1/learning_pb";

interface DeadlinesPanelProps {
  progress: LearningProgress | null;
  onResetDeadlines: () => void;
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-card border border-border p-4 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-foreground">{"Các mốc Deadline sắp tới"}</h4>
            <p className="text-xs text-muted-foreground">
              {"Hạn nộp linh hoạt (Flexible Deadlines)"}
            </p>
          </div>
          {hasOverdue && (
            <button
              onClick={onResetDeadlines}
              className="px-4 py-2 bg-warning hover:bg-warning-hover text-warning-foreground text-xs font-bold rounded-xl shadow-lg transition-all border border-warning/30 flex items-center gap-2 animate-pulse cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset My Deadlines
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {progress.weeklyDeadlines.map((d) => (
            <div
              key={d.weekNumber}
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                d.status === 2
                  ? "bg-warning/10 border-warning/30 text-warning"
                  : "bg-muted border-border text-foreground"
              }`}
            >
              <div>
                <span className="font-bold block">
                  {"Tuần"} {d.weekNumber}
                </span>
                <span className="text-[10px] opacity-80">{d.dueDate}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  d.status === 2
                    ? "bg-warning text-warning-foreground"
                    : "bg-primary/10 text-primary border border-primary/30"
                }`}
              >
                {d.status === 2 ? "OVERDUE" : "ON TRACK"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
