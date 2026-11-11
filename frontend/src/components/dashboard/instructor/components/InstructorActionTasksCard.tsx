"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  CheckSquare,
  MessageSquare,
  ChevronRight,
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
  totalGradingCount?: number;
  totalQaCount?: number;
  totalOverdueCount?: number;
  primaryActionUrl?: string;
  primaryActionTitle?: string;
  courseId?: string;
  courseTitle?: string;
  behindCount?: number;
  onFilterBehind?: () => void;
}

export function InstructorActionTasksCard({
  tasks,
  totalPendingCount: _totalPendingCount,
  totalGradingCount,
  totalQaCount,
  totalOverdueCount = 0,
  primaryActionUrl,
  primaryActionTitle,
  courseId,
  courseTitle = "Khóa học",
  behindCount = 0,
  onFilterBehind,
}: InstructorActionTasksCardProps) {
  const [currentTimeMs, setCurrentTimeMs] = React.useState(0);
  React.useEffect(() => {
    setCurrentTimeMs(Date.now());
  }, []);

  const isOverview = !courseId;

  // 1. Dữ liệu khi xem ở Chế độ Chi tiết 1 môn học cụ thể
  const { data: gradingData, isLoading: loadingGrading } = useGradingQueueQuery(
    { courseId: courseId || "", status: GradingQueueStatus.ALL },
    { enabled: !!courseId },
  );

  const queueItems = useMemo(() => gradingData?.items || [], [gradingData]);

  const coursePendingGradingCount = useMemo(() => {
    return queueItems.filter((i) => i.status !== GradingQueueStatus.GRADED).length;
  }, [queueItems]);

  const courseOverdueCount = useMemo(() => {
    if (currentTimeMs === 0) return 0;
    return queueItems.filter((item) => {
      if (item.status === GradingQueueStatus.GRADED) return false;
      if (item.isAppeal || item.isOutlier || item.lockedByUserId) return false;
      if (!item.submittedAt) return false;
      const isPast48h = currentTimeMs - new Date(item.submittedAt).getTime() > 48 * 3600 * 1000;
      return isPast48h && !item.staffScore && item.peerReviewsCount < 3;
    }).length;
  }, [queueItems, currentTimeMs]);

  const courseAppealsCount = useMemo(() => {
    return queueItems.filter((i) => i.isAppeal && i.status !== GradingQueueStatus.GRADED).length;
  }, [queueItems]);

  const courseOutliersCount = useMemo(() => {
    return queueItems.filter((i) => i.isOutlier && i.status !== GradingQueueStatus.GRADED).length;
  }, [queueItems]);

  // 2. Dữ liệu khi xem ở Chế độ Tổng quan toàn bộ các môn học
  const overviewTasks = useMemo(() => tasks || [], [tasks]);

  const overviewGradingCount = useMemo(() => {
    if (totalGradingCount !== undefined) return totalGradingCount;
    return overviewTasks.filter((t) => t.type === "grading").length;
  }, [totalGradingCount, overviewTasks]);

  const overviewQaCount = useMemo(() => {
    if (totalQaCount !== undefined) return totalQaCount;
    return overviewTasks.filter((t) => t.type === "video_qa").length;
  }, [totalQaCount, overviewTasks]);

  const overviewOverdueCount = useMemo(() => {
    if (totalOverdueCount > 0) return totalOverdueCount;
    return overviewTasks.filter((t) => t.isOverdue).length;
  }, [totalOverdueCount, overviewTasks]);

  const overviewAppealsCount = useMemo(() => {
    return overviewTasks.filter((t) => t.isAppeal).length;
  }, [overviewTasks]);

  const overviewOutliersCount = useMemo(() => {
    return overviewTasks.filter((t) => t.urgencyLabel === "Lệch điểm").length;
  }, [overviewTasks]);

  // 3. Hợp nhất chỉ số giữa 2 chế độ (Unified Metrics)
  const effectiveGradingCount = isOverview ? overviewGradingCount : coursePendingGradingCount;
  const effectiveOverdueCount = isOverview ? overviewOverdueCount : courseOverdueCount;
  const effectiveAppealsCount = isOverview ? overviewAppealsCount : courseAppealsCount;
  const effectiveOutliersCount = isOverview ? overviewOutliersCount : courseOutliersCount;
  const effectiveQaCount = isOverview ? overviewQaCount : 0;
  const effectiveBehindCount = behindCount;

  const totalUrgentCount = effectiveGradingCount + effectiveBehindCount + effectiveQaCount;

  const isLoading = !isOverview && loadingGrading;

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
              {courseId ? courseTitle : "Tất cả khóa học giảng dạy"}
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
          {isLoading
            ? "..."
            : totalUrgentCount > 0
              ? `${totalUrgentCount} việc cần làm`
              : "Hoàn thành"}
        </span>
      </div>

      {/* 4 Nhóm Công Việc Chức Năng (Trạm Điều Hành Cockpit) */}
      <div className="space-y-2">
        {/* Nhóm 1: Bàn chấm bài tập & Đồ án */}
        <div className="p-3 rounded-2xl bg-surface border border-outline-variant/60 hover:border-primary/40 transition-all space-y-2 group">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1 rounded-md shrink-0 bg-primary/10 text-primary">
                <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Hàng Chờ Chấm Bài
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isLoading
                    ? "Đang tải dữ liệu bài nộp..."
                    : effectiveGradingCount > 0
                      ? courseId
                        ? `${effectiveGradingCount} bài tập tự luận đang chờ đánh giá`
                        : `${effectiveGradingCount} bài tập tự luận đang chờ đánh giá trên các lớp`
                      : "Không có bài nộp nào đang chờ chấm"}
                </p>
              </div>
            </div>

            {/* Badges cảnh báo SLA */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {effectiveOverdueCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-destructive/15 text-destructive border border-destructive/20 whitespace-nowrap">
                  {effectiveOverdueCount} quá hạn 48h
                </span>
              )}
              {effectiveAppealsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-tertiary/15 text-tertiary border border-tertiary/30 whitespace-nowrap">
                  {effectiveAppealsCount} khiếu nại
                </span>
              )}
              {effectiveOutliersCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-warning/15 text-warning border border-warning/20 whitespace-nowrap">
                  {effectiveOutliersCount} lệch điểm
                </span>
              )}
            </div>
          </div>

          {/* CTA Link to Cockpit */}
          <div className="pt-1 flex items-center justify-between border-t border-outline-variant/40">
            <span className="text-[10px] text-muted-foreground font-mono">
              {effectiveGradingCount > 0 ? "Cần xử lý sớm" : "Đã cập nhật"}
            </span>
            <Link
              href={
                courseId
                  ? `/instructor/courses/${courseId}/grading`
                  : primaryActionUrl || "/instructor/courses"
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors"
              title={
                primaryActionTitle ||
                (courseId
                  ? `Mở Bàn làm việc chấm bài môn ${courseTitle}`
                  : "Mở Bàn làm việc chấm bài")
              }
            >
              <span>Chấm bài ngay</span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Nhóm 2: Sổ điểm khóa học */}
        <div className="p-3 rounded-2xl bg-surface border border-outline-variant/60 hover:border-primary/40 transition-all flex items-center justify-between gap-2 group">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md shrink-0 bg-primary/10 text-primary">
              <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                {courseId ? "Sổ Điểm Khóa Học" : "Sổ Điểm & Báo Cáo"}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {courseId
                  ? "Bảng tổng hợp điểm danh & xếp loại sinh viên"
                  : "Bảng tổng hợp điểm danh & xếp loại sinh viên các lớp"}
              </p>
            </div>
          </div>

          <Link
            href={courseId ? `/instructor/courses/${courseId}/gradebook` : "/instructor/courses"}
            className="font-bold text-primary hover:underline text-xs flex items-center gap-0.5 shrink-0"
          >
            <span>Xem sổ điểm</span>
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Nhóm 3: Hỏi đáp & Thảo luận môn học / cộng đồng */}
        <div className="p-3 rounded-2xl bg-surface border border-outline-variant/60 hover:border-primary/40 transition-all flex items-center justify-between gap-2 group">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md shrink-0 bg-warning/10 text-warning">
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Hỏi Đáp & Thảo Luận
                </h4>
                {isOverview && effectiveQaCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-destructive/15 text-destructive border border-destructive/20 whitespace-nowrap">
                    {effectiveQaCount} cần phản hồi
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {courseId
                  ? "Giải đáp thắc mắc và hỗ trợ sinh viên trong lớp"
                  : effectiveQaCount > 0
                    ? `${effectiveQaCount} câu hỏi cần Giảng viên giải đáp trên Diễn đàn`
                    : "Giải đáp thắc mắc và hỗ trợ sinh viên cộng đồng"}
              </p>
            </div>
          </div>

          <Link
            href={courseId ? `/instructor/courses/${courseId}/discussions` : "/forum"}
            className="font-bold text-primary hover:underline text-xs flex items-center gap-0.5 shrink-0"
          >
            <span>Vào thảo luận</span>
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Nhóm 4: Học viên chậm tiến độ (Can thiệp sư phạm) */}
        {effectiveBehindCount > 0 && (
          <div className="p-3 rounded-2xl bg-destructive/5 border border-destructive/20 transition-all flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1 rounded-md shrink-0 bg-destructive/10 text-destructive">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-destructive">
                  {effectiveBehindCount} Học Viên Chậm Tiến Độ
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {courseId
                    ? "Học viên dừng học hoặc tụt lại lộ trình"
                    : "Học viên dừng học hoặc tụt lại lộ trình trên các lớp"}
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
