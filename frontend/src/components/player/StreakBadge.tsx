"use client";

import { useMemo } from "react";
import { Flame, Trophy, Clock, CheckCircle2 } from "lucide-react";
import { useLearningStreakQuery } from "@/lib/queries/useLearningQueries";
import { Popover } from "@/components/ui/Popover";
import { LinearProgress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

const DAILY_GOAL_SECONDS = 300; // 5 phút mục tiêu mỗi ngày

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours} giờ`;
  }
  return `${hours} giờ ${remainingMins}p`;
}

function getDayLabel(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10),
      );
      const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      return days[d.getDay()] || dateStr.slice(5);
    }
  } catch {
    // fallback
  }
  return dateStr.slice(5);
}

interface StreakBadgeProps {
  className?: string;
}

export function StreakBadge({ className }: StreakBadgeProps) {
  const { data: streakData, isLoading } = useLearningStreakQuery();

  const currentStreak = streakData?.currentStreak ?? 0;
  const longestStreak = streakData?.longestStreak ?? 0;
  const todaySeconds = streakData?.todayStudySeconds ?? 0;
  const totalSeconds = streakData?.totalStudySeconds ?? 0;
  const recentDays = streakData?.recentDays ?? [];

  const progressPercent = useMemo(() => {
    return Math.min(100, Math.round((todaySeconds / DAILY_GOAL_SECONDS) * 100));
  }, [todaySeconds]);

  const isTodayGoalMet = todaySeconds >= DAILY_GOAL_SECONDS;

  if (isLoading) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted animate-pulse h-7 w-16",
          className,
        )}
      />
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-ring border cursor-pointer",
          currentStreak > 0
            ? "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20 shadow-xs"
            : "bg-surface-container text-muted-foreground border-outline-variant/50 hover:bg-surface-container-high",
          className,
        )}
        aria-label={`Chuỗi ngày học: ${currentStreak} ngày liên tục`}
      >
        <Flame
          className={cn(
            "w-3.5 h-3.5 transition-transform",
            currentStreak > 0
              ? "fill-warning text-warning animate-bounce-subtle"
              : "text-muted-foreground",
          )}
          aria-hidden="true"
        />
        <span>{currentStreak} ngày</span>
      </Popover.Trigger>

      <Popover.Popup className="w-80 p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-warning/10 text-warning">
              <Flame className="w-5 h-5 fill-warning" aria-hidden="true" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Chuỗi ngày học liên tục</h4>
              <p className="text-xs text-muted-foreground">
                {currentStreak > 0
                  ? `Bạn đang có chuỗi ${currentStreak} ngày học tập 🔥`
                  : "Học 5 phút hôm nay để bắt đầu chuỗi ngày!"}
              </p>
            </div>
          </div>
        </div>

        {/* Mục tiêu hôm nay */}
        <div className="p-3 rounded-2xl bg-surface-container/60 border border-border/40 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Mục tiêu hôm nay (5 phút)
            </span>
            <span
              className={cn(
                "font-semibold",
                isTodayGoalMet ? "text-success flex items-center gap-1" : "text-foreground",
              )}
            >
              {isTodayGoalMet && <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
              {formatDuration(todaySeconds)} / 5p
            </span>
          </div>
          <LinearProgress value={progressPercent} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground">
            {isTodayGoalMet
              ? "Tuyệt vời! Bạn đã hoàn thành mục tiêu học tập hôm nay 🎉"
              : `Còn ${formatDuration(DAILY_GOAL_SECONDS - todaySeconds)} nữa để giữ chuỗi ngày học!`}
          </p>
        </div>

        {/* 7 ngày gần nhất (Mini activity bar) */}
        {recentDays.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              7 ngày qua
            </span>
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {recentDays.map((day) => {
                const isMet = day.isStreakQualified;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-full h-8 rounded-lg flex items-end justify-center pb-1 transition-colors",
                        isMet
                          ? "bg-warning/20 border border-warning/40 text-warning"
                          : "bg-surface-container border border-border/30 text-muted-foreground/40",
                      )}
                      title={`${day.date}: ${formatDuration(day.totalSeconds)}`}
                    >
                      {isMet ? (
                        <Flame className="w-3 h-3 fill-warning text-warning" aria-hidden="true" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-border" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {getDayLabel(day.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Trophy className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
            <span>
              Kỷ lục: <strong className="text-foreground">{longestStreak} ngày</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
            <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>
              Tổng: <strong className="text-foreground">{formatDuration(totalSeconds)}</strong>
            </span>
          </div>
        </div>
      </Popover.Popup>
    </Popover.Root>
  );
}
