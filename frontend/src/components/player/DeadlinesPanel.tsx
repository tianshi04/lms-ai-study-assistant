"use client";

import type { LearningProgress } from "@/gen/learning/v1/learning_pb";

interface DeadlinesPanelProps {
  progress: LearningProgress | null;
  onResetDeadlines: () => void;
}

export function DeadlinesPanel({ progress, onResetDeadlines }: DeadlinesPanelProps) {
  if (!progress) {
    return (
      <div className="text-center text-xs text-slate-500 py-6">
        Chưa có thông tin tiến độ bài học.
      </div>
    );
  }

  const hasOverdue = progress.weeklyDeadlines.some((d) => d.status === 2);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-white">Lịch Nộp Bài Hàng Tuần (Suggested Deadlines)</h4>
            <p className="text-xs text-slate-400">Duy trì tiến độ học tập để đảm bảo hoàn thành khóa học đúng hạn.</p>
          </div>
          {hasOverdue && (
            <button
              onClick={onResetDeadlines}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all border border-amber-400/30 flex items-center gap-2 animate-pulse"
            >
              <span>🔄</span> Reset My Deadlines
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {progress.weeklyDeadlines.map((d) => (
            <div
              key={d.weekNumber}
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                d.status === 2
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-slate-950 border-slate-800 text-slate-300"
              }`}
            >
              <div>
                <span className="font-bold block">Tuần {d.weekNumber}</span>
                <span className="text-[10px] opacity-80">Hạn nộp: {d.dueDate}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  d.status === 2
                    ? "bg-amber-500 text-slate-950"
                    : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                }`}
              >
                {d.status === 2 ? "OVERDUE (Quá hạn)" : "ON TRACK"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
