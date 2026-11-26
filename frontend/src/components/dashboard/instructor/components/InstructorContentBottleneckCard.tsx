"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Button as BaseButton } from "@base-ui/react/button";
import type { EnrolledStudent } from "@/gen/catalog/v1/catalog_pb";
import type { CalculatedWeek } from "../types";

export interface InstructorContentBottleneckCardProps {
  courseId?: string;
  bottleneckWeek: CalculatedWeek | null;
  rawStudents: EnrolledStudent[];
  selectedWeekFilter: number | null;
  onSelectWeekFilter: (weekNumber: number | null) => void;
}

export function InstructorContentBottleneckCard({
  courseId,
  bottleneckWeek,
  rawStudents,
  selectedWeekFilter,
  onSelectWeekFilter,
}: InstructorContentBottleneckCardProps) {
  // Gom Top 3 bài học đang có nhiều học viên chưa hoàn thành dừng lại nhất
  const topStuckItems = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of rawStudents) {
      if (s.progressPercent >= 100) continue;
      const title = (s.lastAccessedItemTitle || "").trim();
      if (!title) continue;
      counts.set(title, (counts.get(title) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
      .slice(0, 3);
  }, [rawStudents]);

  // Tổng hợp tín hiệu bài kiểm tra & đánh giá
  const assessmentSignals = useMemo(() => {
    const quizStudents = rawStudents.filter((s) => (s.quizAttemptsCount || 0) > 0);
    const avgQuizScore =
      quizStudents.length > 0
        ? quizStudents.reduce((acc, s) => acc + (s.averageQuizScore || 0), 0) / quizStudents.length
        : null;

    const cooldownCount = rawStudents.filter((s) => s.isInCooldown).length;
    const peerOverdueCount = rawStudents.filter((s) => s.isPeerReviewOverdue).length;

    return {
      avgQuizScore,
      quizStudentsCount: quizStudents.length,
      cooldownCount,
      peerOverdueCount,
    };
  }, [rawStudents]);

  const stuckInBottleneck = bottleneckWeek
    ? Math.max(0, bottleneckWeek.reachedCount - bottleneckWeek.completedCount)
    : 0;
  const isBottleneckSelected =
    bottleneckWeek !== null && selectedWeekFilter === bottleneckWeek.weekNumber;

  const hasAnySignal =
    Boolean(bottleneckWeek) ||
    topStuckItems.length > 0 ||
    assessmentSignals.avgQuizScore !== null ||
    assessmentSignals.cooldownCount > 0 ||
    assessmentSignals.peerOverdueCount > 0;

  return (
    <div className="p-4.5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
          Điểm Nghẽn Bài Giảng
        </h3>
        {courseId && (
          <Link
            href={`/instructor/courses/${courseId}`}
            className="text-[11px] font-semibold text-primary hover:underline shrink-0"
          >
            Chỉnh sửa bài ›
          </Link>
        )}
      </div>

      {!hasAnySignal ? (
        <p className="text-xs text-muted-foreground leading-relaxed py-1">
          Chưa ghi nhận điểm nghẽn nổi bật — tiến độ học viên đang phân bổ đều giữa các tuần.
        </p>
      ) : (
        <div className="space-y-3.5">
          {/* 1. Tuần chững nhiều nhất */}
          {bottleneckWeek ? (
            <BaseButton
              type="button"
              onClick={() =>
                onSelectWeekFilter(isBottleneckSelected ? null : bottleneckWeek.weekNumber)
              }
              className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                isBottleneckSelected
                  ? "bg-warning/10 border-warning/50"
                  : "bg-surface border-outline-variant/60 hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Tuần chững nhiều nhất</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {stuckInBottleneck}/{bottleneckWeek.reachedCount} SV chưa qua
                </span>
              </div>

              <div className="text-xs font-bold text-foreground mt-1 line-clamp-1">
                Tuần {bottleneckWeek.weekNumber} · {bottleneckWeek.title}
              </div>

              <div className="mt-2 flex items-center gap-2.5">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      bottleneckWeek.dropRate >= 35 ? "bg-warning" : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(4, bottleneckWeek.dropRate))}%` }}
                  />
                </div>
                <span
                  className={`text-[11px] font-bold tabular-nums shrink-0 ${
                    bottleneckWeek.dropRate >= 35 ? "text-warning" : "text-foreground"
                  }`}
                >
                  {bottleneckWeek.dropRate}% dừng lại
                </span>
              </div>

              <div className="text-[10px] text-muted-foreground mt-1.5">
                {isBottleneckSelected
                  ? "Đang lọc danh sách học viên theo tuần này (bấm để bỏ lọc)"
                  : "Bấm để lọc danh sách học viên đang ở tuần này"}
              </div>
            </BaseButton>
          ) : (
            <div className="p-3 rounded-2xl bg-surface border border-outline-variant/60 text-xs text-muted-foreground">
              Chưa ghi nhận tuần có tỷ lệ dừng lại bất thường.
            </div>
          )}

          {/* 2. Top 3 bài học có nhiều học viên đang dừng nhất */}
          {topStuckItems.length > 0 && (
            <div className="space-y-2 pt-0.5">
              <div className="text-[11px] font-semibold text-muted-foreground">
                Bài học nhiều học viên đang dừng nhất
              </div>
              <div className="divide-y divide-border/50 rounded-2xl bg-surface border border-outline-variant/60 px-3">
                {topStuckItems.map((item, idx) => (
                  <div
                    key={item.title}
                    className="py-2 flex items-baseline justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex items-baseline gap-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground tabular-nums shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="font-medium text-foreground truncate" title={item.title}>
                        {item.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-foreground tabular-nums shrink-0">
                      {item.count} SV
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Tín hiệu bài kiểm tra & đánh giá */}
          <div className="pt-2.5 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap text-[11px] text-muted-foreground tabular-nums">
            <span>
              Điểm TB kiểm tra:{" "}
              <strong className="text-foreground font-semibold">
                {assessmentSignals.avgQuizScore !== null
                  ? `${assessmentSignals.avgQuizScore.toFixed(1)}/10`
                  : "Chưa có"}
              </strong>
            </span>

            {assessmentSignals.cooldownCount > 0 ? (
              <span className="font-semibold text-destructive">
                Khóa thi lại: {assessmentSignals.cooldownCount} SV
              </span>
            ) : assessmentSignals.peerOverdueCount > 0 ? (
              <span className="font-semibold text-warning">
                Quá hạn chấm chéo: {assessmentSignals.peerOverdueCount} SV
              </span>
            ) : (
              <span>Không có ca khóa thi lại</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
