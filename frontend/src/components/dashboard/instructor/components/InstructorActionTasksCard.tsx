"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  CheckSquare,
  MessageSquare,
  ChevronRight,
  Clock,
  ClipboardList,
  GraduationCap,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import type { OverviewActionTask } from "../types";
import { useGradingQueueQuery } from "@/lib/query_hooks";
import { GradingQueueStatus } from "@/gen/assessment/v1/assessment_pb";

interface InstructorActionTasksCardProps {
  tasks?: OverviewActionTask[];
  totalPendingCount?: number;
  totalOverdueCount?: number;
  primaryActionUrl?: string;
  courseId?: string;
  courseTitle?: string;
  behindCount?: number;
  onFilterBehind?: () => void;
}

export function InstructorActionTasksCard({
  tasks,
  totalPendingCount,
  totalOverdueCount = 0,
  primaryActionUrl,
  courseId,
  courseTitle = "Khóa học",
  behindCount = 0,
  onFilterBehind,
}: InstructorActionTasksCardProps) {
  const [currentTimeMs, setCurrentTimeMs] = React.useState(0);
  React.useEffect(() => {
    setCurrentTimeMs(Date.now());
  }, []);

  const { data: gradingData, isLoading: loadingGrading } = useGradingQueueQuery(
    { courseId: courseId || "", status: GradingQueueStatus.ALL },
    { enabled: !!courseId },
  );

  const queueItems = useMemo(() => gradingData?.items || [], [gradingData]);

  const pendingGradingCount = useMemo(() => {
    return queueItems.filter((i) => i.status !== GradingQueueStatus.GRADED).length;
  }, [queueItems]);

  const overdueCount = useMemo(() => {
    if (currentTimeMs === 0) return 0;
    return queueItems.filter((item) => {
      if (item.status === GradingQueueStatus.GRADED) return false;
      if (item.isAppeal || item.isOutlier || item.lockedByUserId) return false;
      if (!item.submittedAt) return false;
      const isPast48h = currentTimeMs - new Date(item.submittedAt).getTime() > 48 * 3600 * 1000;
      return isPast48h && !item.staffScore && item.peerReviewsCount < 3;
    }).length;
  }, [queueItems, currentTimeMs]);

  const appealsCount = useMemo(() => {
    return queueItems.filter((i) => i.isAppeal).length;
  }, [queueItems]);

  const outliersCount = useMemo(() => {
    return queueItems.filter((i) => i.isOutlier).length;
  }, [queueItems]);

  // Chế độ 1: Xem môn học cụ thể (Deep-dive specific course mode)
  if (courseId) {
    const totalUrgentCount = pendingGradingCount + appealsCount + behindCount;

    return (
      <div className="p-4.5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Việc Cần Xử Lý
              </h3>
              <span className="text-[10px] text-muted-foreground block truncate max-w-[190px]">
                {courseTitle}
              </span>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              totalUrgentCount > 0
                ? "bg-warning/15 text-warning border border-warning/20"
                : "bg-success/15 text-success border border-success/20"
            }`}
          >
            {loadingGrading ? "..." : `${totalUrgentCount} việc cần làm`}
          </span>
        </div>

        {/* Action Items List */}
        <div className="space-y-2">
          {/* Item 1: Bàn chấm bài tập & Đồ án */}
          <div className="p-3 rounded-2xl bg-surface border border-outline-variant/60 hover:border-primary/40 transition-all space-y-2 group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1 rounded-md shrink-0 bg-primary/10 text-primary">
                  <CheckSquare className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    Hàng Chờ Chấm Bài
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {loadingGrading
                      ? "Đang tải dữ liệu bài nộp..."
                      : pendingGradingCount > 0
                        ? `${pendingGradingCount} bài tập tự luận đang chờ đánh giá`
                        : "Không có bài nộp nào đang chờ chấm"}
                  </p>
                </div>
              </div>

              {/* Badges cảnh báo SLA */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                {overdueCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-destructive/15 text-destructive border border-destructive/20">
                    {overdueCount} quá hạn 48h
                  </span>
                )}
                {appealsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    {appealsCount} khiếu nại
                  </span>
                )}
                {outliersCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-warning/15 text-warning border border-warning/20">
                    {outliersCount} lệch điểm
                  </span>
                )}
              </div>
            </div>

            {/* CTA Link to Cockpit */}
            <div className="pt-1 flex items-center justify-between border-t border-outline-variant/40">
              <span className="text-[10px] text-muted-foreground font-mono">
                {pendingGradingCount > 0 ? "Cần xử lý sớm" : "Đã cập nhật"}
              </span>
              <Link
                href={`/instructor/courses/${courseId}/grading`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors"
                title="Mở Bàn làm việc chấm bài"
              >
                <span>Chấm bài ngay</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Item 2: Sổ điểm khóa học */}
          <div className="p-3 rounded-2xl bg-surface border border-outline-variant/60 hover:border-primary/40 transition-all flex items-center justify-between gap-2 group">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1 rounded-md shrink-0 bg-primary/10 text-primary">
                <GraduationCap className="w-3.5 h-3.5" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Sổ Điểm Khóa Học
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Bảng tổng hợp điểm danh & xếp loại sinh viên
                </p>
              </div>
            </div>

            <Link
              href={`/instructor/courses/${courseId}/gradebook`}
              className="font-bold text-primary hover:underline text-xs flex items-center gap-0.5 shrink-0"
            >
              <span>Xem sổ điểm</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Item 3: Hỏi đáp & Thảo luận môn học */}
          <div className="p-3 rounded-2xl bg-surface border border-outline-variant/60 hover:border-primary/40 transition-all flex items-center justify-between gap-2 group">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1 rounded-md shrink-0 bg-warning/10 text-warning">
                <MessageSquare className="w-3.5 h-3.5" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Hỏi Đáp & Thảo Luận
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Giải đáp thắc mắc và hỗ trợ sinh viên trong lớp
                </p>
              </div>
            </div>

            <Link
              href={`/instructor/courses/${courseId}/discussions`}
              className="font-bold text-primary hover:underline text-xs flex items-center gap-0.5 shrink-0"
            >
              <span>Vào thảo luận</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Item 3: Sinh viên chậm tiến độ */}
          {behindCount > 0 && (
            <div className="p-3 rounded-2xl bg-destructive/5 border border-destructive/20 transition-all flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1 rounded-md shrink-0 bg-destructive/10 text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-destructive">
                    {behindCount} Học Viên Chậm Tiến Độ
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Học viên dừng học hoặc tụt lại lộ trình
                  </p>
                </div>
              </div>

              {onFilterBehind && (
                <button
                  type="button"
                  onClick={onFilterBehind}
                  className="px-2 py-1 rounded-lg text-xs font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0 cursor-pointer"
                >
                  Lọc SV
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chế độ 2: Xem tổng quan toàn trường (Overview mode tasks list)
  const overviewTasks = tasks || [];
  const displayTotalCount = totalPendingCount ?? overviewTasks.length;

  return (
    <div className="p-4.5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Việc Cần Xử Lý
          </h3>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-1 ${
            totalOverdueCount > 0
              ? "bg-destructive/15 text-destructive border border-destructive/20"
              : displayTotalCount > 0
                ? "bg-warning/15 text-warning border border-warning/20"
                : "bg-success/15 text-success border border-success/20"
          }`}
        >
          {totalOverdueCount > 0 ? (
            <>
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>
                {totalOverdueCount >= displayTotalCount
                  ? `${displayTotalCount} việc quá hạn`
                  : `${displayTotalCount} việc chờ (${totalOverdueCount} quá hạn)`}
              </span>
            </>
          ) : displayTotalCount > 0 ? (
            `${displayTotalCount} việc chờ`
          ) : (
            "Hoàn thành"
          )}
        </span>
      </div>

      {/* Chú thích giới hạn hiển thị nếu có nhiều việc tồn đọng */}
      {overviewTasks.length > 0 && displayTotalCount > overviewTasks.length && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
          <span>Ưu tiên {overviewTasks.length} việc cần xử lý trước:</span>
          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
            Còn {displayTotalCount - overviewTasks.length} việc khác
          </span>
        </div>
      )}

      {/* Danh sách nhiệm vụ có gắn chỉ số thời gian SLA - Khóa max-height chống tràn dọc trang */}
      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {overviewTasks.length === 0 ? (
          <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 text-center space-y-1">
            <CheckSquare className="w-5 h-5 text-success mx-auto" aria-hidden="true" />
            <p className="text-xs font-bold text-foreground">Không có nhiệm vụ tồn đọng</p>
            <p className="text-[11px] text-muted-foreground">
              Tất cả bài tập đã được chấm và mọi thắc mắc của sinh viên đã được giải đáp.
            </p>
          </div>
        ) : (
          overviewTasks.map((task) => {
            const isGrading = task.type === "grading";
            const isCritical = task.urgencyLevel === "critical";
            const isWarning = task.urgencyLevel === "warning";
            const isAppeal = task.isAppeal;

            return (
              <div
                key={task.id}
                className={`p-3 rounded-2xl bg-surface border transition-all space-y-1.5 group ${
                  isCritical
                    ? "border-destructive/30 border-l-4 border-l-destructive bg-destructive/[0.02]"
                    : isWarning
                      ? "border-warning/30 border-l-4 border-l-warning bg-warning/[0.02]"
                      : "border-outline-variant/60 hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`p-1 rounded-md shrink-0 ${
                        isAppeal
                          ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                          : isCritical
                            ? "bg-destructive/15 text-destructive"
                            : isWarning
                              ? "bg-warning/15 text-warning"
                              : isGrading
                                ? "bg-primary/10 text-primary"
                                : "bg-warning/10 text-warning"
                      }`}
                    >
                      {isAppeal ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : isGrading ? (
                        <CheckSquare className="w-3 h-3" />
                      ) : (
                        <MessageSquare className="w-3 h-3" />
                      )}
                    </span>
                    <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {task.title}
                    </h4>
                  </div>

                  {/* Badge cảnh báo SLA theo 3 mức độ */}
                  {isAppeal ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25 shrink-0 whitespace-nowrap flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Khiếu nại
                    </span>
                  ) : isCritical ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-destructive/15 text-destructive border border-destructive/25 shrink-0 whitespace-nowrap flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {task.urgencyLabel || task.timeAgo}
                    </span>
                  ) : isWarning ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-warning/15 text-warning border border-warning/25 shrink-0 whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {task.urgencyLabel || task.timeAgo}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {task.urgencyLabel || task.timeAgo}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate max-w-[180px]">
                    {task.studentName} • {task.courseTitle}
                  </span>

                  <Link
                    href={task.actionUrl}
                    className={`font-bold hover:underline flex items-center gap-0.5 shrink-0 ${
                      isCritical ? "text-destructive" : "text-primary"
                    }`}
                  >
                    <span>{task.actionText}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer CTA chuyển hướng đến Bàn làm việc toàn diện */}
      {overviewTasks.length > 0 && (
        <div className="pt-2 border-t border-outline-variant/40">
          <Link
            href={primaryActionUrl || overviewTasks[0]?.actionUrl || "/instructor/courses"}
            className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-primary hover:bg-primary/5 hover:border-primary/30 border border-transparent transition-all flex items-center justify-center gap-1.5 group"
          >
            <span>
              {displayTotalCount > overviewTasks.length
                ? `Xem tất cả ${displayTotalCount} nhiệm vụ trong Bàn làm việc`
                : "Mở Bàn làm việc chấm bài & thảo luận"}
            </span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
