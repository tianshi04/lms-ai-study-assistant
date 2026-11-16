"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  CheckSquare,
  MessageSquare,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import type { OverviewActionTask } from "../types";
import { useGradingQueueQuery } from "@/lib/query_hooks";
import { useForumThreadsQuery } from "@/lib/queries/useForumQueries";
import { GradingQueueStatus } from "@/gen/assessment/v1/assessment_pb";

interface InstructorActionTasksCardProps {
  tasks?: OverviewActionTask[];
  totalPendingCount?: number;
  totalGradingCount?: number;
  totalQaCount?: number;
  totalOverdueCount?: number;
  primaryActionUrl?: string;
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
  totalOverdueCount: _totalOverdueCount = 0,
  primaryActionUrl,
  courseId,
  courseTitle = "Khóa học",
  behindCount = 0,
  onFilterBehind,
}: InstructorActionTasksCardProps) {
  const isOverview = !courseId;

  // 1. Dữ liệu khi xem ở Chế độ Chi tiết 1 môn học cụ thể
  const { data: gradingData, isLoading: loadingGrading } = useGradingQueueQuery(
    { courseId: courseId || "", status: GradingQueueStatus.ALL },
    { enabled: !!courseId },
  );

  const { data: courseThreads, isLoading: loadingThreads } = useForumThreadsQuery(
    courseId || "",
    undefined,
    {
      enabled: !!courseId && totalQaCount === undefined,
    },
  );

  const queueItems = useMemo(() => gradingData?.items || [], [gradingData]);

  const coursePendingGradingCount = useMemo(() => {
    return queueItems.filter((i) => i.status !== GradingQueueStatus.GRADED).length;
  }, [queueItems]);

  const coursePendingQaCount = useMemo(() => {
    if (totalQaCount !== undefined) return totalQaCount;
    if (!courseThreads) return 0;
    return courseThreads.filter((th) => {
      const r = (th.authorRole || "").toUpperCase();
      const isStaff =
        r.includes("INSTRUCTOR") ||
        r.includes("GIẢNG VIÊN") ||
        r === "2" ||
        r.includes("TA") ||
        r === "3" ||
        r.includes("ADMIN");
      const titleLower = th.title.trim().toLowerCase();
      const isAnnouncement =
        titleLower.startsWith("[thông báo]") ||
        titleLower.startsWith("[thong bao]") ||
        titleLower.startsWith("[announcement]");
      const hasStaffReply = th.replies?.some((reply) => reply.isStaffAnswer);
      return !th.isStaffPinned && !isStaff && !isAnnouncement && !hasStaffReply;
    }).length;
  }, [totalQaCount, courseThreads]);

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

  const topGradingTask = useMemo(() => {
    return overviewTasks.find((t) => t.type === "grading");
  }, [overviewTasks]);

  const topQaTask = useMemo(() => {
    return overviewTasks.find((t) => t.type === "video_qa");
  }, [overviewTasks]);

  // 3. Hợp nhất chỉ số giữa 2 chế độ (Unified Metrics)
  const effectiveGradingCount = isOverview ? overviewGradingCount : coursePendingGradingCount;
  const effectiveQaCount = isOverview ? overviewQaCount : coursePendingQaCount;
  const effectiveBehindCount = behindCount;

  const isLoadingGrading = !isOverview && loadingGrading;
  const isLoadingQa = !isOverview && totalQaCount === undefined && loadingThreads;

  return (
    <div className="p-4.5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Việc Cần Xử Lý
            </h3>
            <span className="text-[10px] text-muted-foreground block">
              {courseId ? courseTitle : "Tất cả khóa học giảng dạy"}
            </span>
          </div>
        </div>
      </div>

      {/* Các Nhóm Công Việc Chức Năng (Trạm Điều Hành Cockpit) */}
      <div className="space-y-2">
        {/* Nhóm 1: Bàn chấm bài tập & Đồ án */}
        <div className="p-3 rounded-2xl bg-surface border border-outline-variant/60 hover:border-primary/40 transition-all flex items-center justify-between gap-2 group">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md shrink-0 bg-primary/10 text-primary">
              <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                Hàng Chờ Chấm Bài
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isLoadingGrading
                  ? "Đang tải dữ liệu bài nộp..."
                  : effectiveGradingCount > 0
                    ? courseId
                      ? `${effectiveGradingCount} bài tập tự luận cần can thiệp`
                      : `${effectiveGradingCount} bài tập tự luận cần can thiệp trên các lớp`
                    : "Không có bài nộp nào cần can thiệp"}
              </p>
              {isOverview && topGradingTask?.courseTitle && effectiveGradingCount > 0 && (
                <p className="text-[10px] text-primary font-medium mt-0.5">
                  <span className="text-muted-foreground">Ưu tiên chấm: </span>
                  <span className="font-bold">{topGradingTask.courseTitle}</span>
                </p>
              )}
            </div>
          </div>

          <Link
            href={
              courseId
                ? `/instructor/courses/${courseId}/grading`
                : topGradingTask?.actionUrl || primaryActionUrl || "/instructor/courses"
            }
            className="font-bold text-primary hover:underline text-xs flex items-center gap-0.5 shrink-0"
            title={
              isOverview && topGradingTask?.courseTitle
                ? `Vào chấm bài môn ${topGradingTask.courseTitle}`
                : "Vào bàn làm việc chấm bài"
            }
          >
            <span>{effectiveGradingCount > 0 || courseId ? "Vào chấm bài" : "Xem khóa học"}</span>
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Nhóm 2: Hỏi đáp & Thảo luận môn học / cộng đồng */}
        <div className="p-3 rounded-2xl bg-surface border border-outline-variant/60 hover:border-primary/40 transition-all flex items-center justify-between gap-2 group">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md shrink-0 bg-warning/10 text-warning">
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                Hỏi Đáp & Thảo Luận
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isLoadingQa
                  ? "Đang tải dữ liệu thảo luận..."
                  : effectiveQaCount > 0
                    ? courseId
                      ? `${effectiveQaCount} câu hỏi cần Giảng viên giải đáp trong lớp`
                      : `${effectiveQaCount} câu hỏi cần Giảng viên giải đáp trên các lớp`
                    : "Không có câu hỏi nào cần giải đáp"}
              </p>
              {isOverview && topQaTask?.courseTitle && effectiveQaCount > 0 && (
                <p className="text-[10px] text-warning font-medium mt-0.5">
                  <span className="text-muted-foreground">Ưu tiên phản hồi: </span>
                  <span className="font-bold">{topQaTask.courseTitle}</span>
                </p>
              )}
            </div>
          </div>

          <Link
            href={courseId ? `/forum?courseId=${courseId}` : topQaTask?.actionUrl || "/forum"}
            className="font-bold text-primary hover:underline text-xs flex items-center gap-0.5 shrink-0"
            title={
              courseId
                ? `Vào diễn đàn thảo luận môn ${courseTitle}`
                : isOverview && topQaTask?.courseTitle
                  ? `Xem thảo luận môn ${topQaTask.courseTitle}`
                  : "Vào diễn đàn thảo luận"
            }
          >
            <span>{effectiveQaCount > 0 || courseId ? "Vào thảo luận" : "Xem diễn đàn"}</span>
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Nhóm 4: Học viên chậm tiến độ (Chỉ hiện ở Overview khi không có Cảnh báo điểm nghẽn) */}
        {!courseId && effectiveBehindCount > 0 && (
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
