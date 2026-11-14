"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  UserCheck,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Eye,
  RotateCcw,
  Users,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Table } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";
import {
  useGradingQueueQuery,
  useClaimGradingTaskMutation,
  useCourseDetailQuery,
} from "@/lib/query_hooks";
import {
  GradingProvenance,
  GradingQueueStatus,
  type GradingQueueItem,
} from "@/gen/assessment/v1/assessment_pb";
import { EvaluationModal } from "./components/EvaluationModal";

interface GradingCockpitClientProps {
  courseId: string;
}

type CockpitTab = GradingQueueStatus | "OUTLIER";

export function GradingCockpitClient({ courseId }: GradingCockpitClientProps) {
  const { toast } = useToast();
  const { userId: currentUserId } = useAuth();
  const searchParams = useSearchParams();
  const urlSubmissionId = searchParams.get("submissionId");

  const isInvalidCourse = !courseId || courseId === "undefined" || courseId === "null";

  const { data: courseDetail } = useCourseDetailQuery(courseId, {
    enabled: !isInvalidCourse,
  });

  const [activeTab, setActiveTab] = useState<CockpitTab>(GradingQueueStatus.ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [evaluationModalMode, setEvaluationModalMode] = useState<"view" | "grade">("grade");
  const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null);

  useEffect(() => {
    setCurrentTimeMs(Date.now());
  }, []);

  const claimTaskMutation = useClaimGradingTaskMutation();

  // Auto-open evaluation modal if submissionId was passed in URL query param (opens in safe view mode)
  useEffect(() => {
    if (urlSubmissionId && !selectedSubmissionId) {
      setSelectedSubmissionId(urlSubmissionId);
      setEvaluationModalMode("view");
      setIsEvaluationModalOpen(true);
    }
  }, [urlSubmissionId, selectedSubmissionId]);

  // Fetch full grading queue for the course using TanStack Query
  const { data, isLoading, isError, error, refetch } = useGradingQueueQuery(
    {
      courseId: isInvalidCourse ? "" : courseId,
      status: GradingQueueStatus.ALL,
      searchQuery: "",
    },
    {
      enabled: !isInvalidCourse,
    },
  );

  const rawItems = useMemo(() => data?.items || [], [data?.items]);

  const isSubmissionOverdue = useCallback(
    (item: GradingQueueItem) => {
      // Only items that are NOT graded, NOT appealed, NOT outlier, NOT claimed, and past 48h
      if (item.status === GradingQueueStatus.GRADED) return false;
      if (item.isAppeal) return false;
      if (item.isOutlier) return false;
      if (item.lockedByUserId) return false;
      if (!item.submittedAt || !currentTimeMs) return false;
      const isPast48h = currentTimeMs - new Date(item.submittedAt).getTime() > 48 * 3600 * 1000;
      return isPast48h && !item.staffScore && item.peerReviewsCount < 3;
    },
    [currentTimeMs],
  );

  const overdueCount = useMemo(
    () => rawItems.filter(isSubmissionOverdue).length,
    [rawItems, isSubmissionOverdue],
  );

  const outlierCount = useMemo(
    () => rawItems.filter((i) => i.isOutlier && i.status !== GradingQueueStatus.GRADED).length,
    [rawItems],
  );

  const queueItems = useMemo(() => {
    let items = rawItems;

    // Filter by active tab
    if (activeTab === GradingQueueStatus.PENDING) {
      items = items.filter((i) => i.status === GradingQueueStatus.PENDING);
    } else if (activeTab === GradingQueueStatus.CLAIMED) {
      items = items.filter((i) => i.status === GradingQueueStatus.CLAIMED);
    } else if (activeTab === GradingQueueStatus.APPEALED) {
      items = items.filter((i) => i.status === GradingQueueStatus.APPEALED);
    } else if (activeTab === GradingQueueStatus.GRADED) {
      items = items.filter((i) => i.status === GradingQueueStatus.GRADED);
    } else if (activeTab === "OUTLIER") {
      items = items.filter((i) => i.isOutlier && i.status !== GradingQueueStatus.GRADED);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.studentName.toLowerCase().includes(q) ||
          i.itemTitle.toLowerCase().includes(q) ||
          i.studentId.toLowerCase().includes(q),
      );
    }

    return items;
  }, [activeTab, rawItems, searchQuery]);

  const renderStatusBadge = (item: GradingQueueItem, isOverdue: boolean) => {
    if (item.lockedByUserId) {
      return (
        <Badge
          variant="outlined"
          className={cn(
            "text-[11px] font-bold gap-1 px-2.5 py-0.5 whitespace-nowrap",
            item.lockedByUserId === currentUserId
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-muted text-muted-foreground border-border",
          )}
        >
          <Lock
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              item.lockedByUserId === currentUserId ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden="true"
          />
          {item.lockedByUserId === currentUserId
            ? "Đang giữ: Bạn"
            : item.lockedByName
              ? `Đang giữ: ${item.lockedByName}`
              : "Đang được chấm"}
        </Badge>
      );
    }
    if (item.isAppeal) {
      return (
        <Badge
          variant="outlined"
          className="text-[11px] font-bold bg-tertiary/15 text-tertiary border-tertiary/30 gap-1 px-2.5 py-0.5 whitespace-nowrap"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-tertiary shrink-0" aria-hidden="true" />
          Khiếu nại điểm
        </Badge>
      );
    }
    if (item.status === GradingQueueStatus.GRADED) {
      return (
        <Badge
          variant="success"
          className="text-[11px] font-semibold bg-success/15 text-success border-success/30 gap-1 px-2.5 py-0.5 whitespace-nowrap"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true" />
          Đã chấm
        </Badge>
      );
    }
    if (item.isOutlier) {
      return (
        <Badge
          variant="warning"
          className="text-[11px] font-bold bg-warning/15 text-warning border-warning/30 gap-1 px-2.5 py-0.5 whitespace-nowrap"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
          Lệch điểm chuẩn
        </Badge>
      );
    }
    if (isOverdue) {
      return (
        <Badge
          variant="error"
          className="text-[11px] font-bold bg-destructive/10 text-destructive border-destructive/20 gap-1 px-2.5 py-0.5 whitespace-nowrap"
        >
          <Clock className="w-3.5 h-3.5 text-destructive shrink-0" aria-hidden="true" />
          Quá hạn 48h
        </Badge>
      );
    }
    if (item.peerReviewsCount < 3) {
      return (
        <Badge
          variant="outlined"
          className="text-[11px] font-medium bg-muted text-muted-foreground border-border gap-1 px-2.5 py-0.5 whitespace-nowrap"
        >
          <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          Đang chấm chéo
        </Badge>
      );
    }
    return (
      <Badge
        variant="outlined"
        className="text-[11px] font-medium text-muted-foreground px-2.5 py-0.5 whitespace-nowrap"
      >
        Chờ chấm
      </Badge>
    );
  };

  const renderGradeActionButton = (item: GradingQueueItem, isOverdue: boolean) => {
    // 1. Locked by another user
    if (item.lockedByUserId && item.lockedByUserId !== currentUserId) {
      return (
        <Button
          type="button"
          variant="outlined"
          disabled
          className="w-[144px] h-8 text-xs font-medium gap-1 px-2.5 bg-muted text-muted-foreground border-border cursor-not-allowed opacity-75 shrink-0 whitespace-nowrap justify-center"
          title={`Bài này đang được ${item.lockedByName || "giảng viên khác"} giữ để chấm`}
        >
          <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          <span>Đang khóa</span>
        </Button>
      );
    }

    // 2. Currently locked by ME
    if (item.lockedByUserId === currentUserId) {
      return (
        <Button
          type="button"
          onClick={() => handleGradeSubmission(item)}
          disabled={claimTaskMutation.isPending}
          className="w-[144px] h-8 text-xs font-bold gap-1 px-2.5 bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm shrink-0 whitespace-nowrap justify-center"
        >
          <span>Tiếp tục chấm</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </Button>
      );
    }

    // 3. Graded -> Regrade
    if (item.status === GradingQueueStatus.GRADED) {
      return (
        <Button
          type="button"
          variant="tonal"
          onClick={() => handleGradeSubmission(item)}
          disabled={claimTaskMutation.isPending}
          className="w-[144px] h-8 text-xs font-semibold gap-1 px-2.5 bg-card hover:bg-muted text-foreground border border-border shrink-0 whitespace-nowrap justify-center"
        >
          <RotateCcw className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          <span>Chấm lại</span>
        </Button>
      );
    }

    // 4. Appeal
    if (item.isAppeal) {
      return (
        <Button
          type="button"
          onClick={() => handleGradeSubmission(item)}
          disabled={claimTaskMutation.isPending}
          className="w-[144px] h-8 text-xs font-bold gap-1 px-2.5 bg-tertiary hover:bg-tertiary/90 text-on-tertiary border border-tertiary shadow-sm shrink-0 whitespace-nowrap justify-center"
        >
          <span>Xử lý khiếu nại</span>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </Button>
      );
    }

    // 5. Outlier
    if (item.isOutlier) {
      return (
        <Button
          type="button"
          onClick={() => handleGradeSubmission(item)}
          disabled={claimTaskMutation.isPending}
          className="w-[144px] h-8 text-xs font-bold gap-1 px-2.5 bg-warning hover:bg-warning-hover text-warning-foreground border border-warning shadow-sm shrink-0 whitespace-nowrap justify-center"
        >
          <span>Xử lý lệch điểm</span>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </Button>
      );
    }

    // 6. Overdue
    if (isOverdue) {
      return (
        <Button
          type="button"
          onClick={() => handleGradeSubmission(item)}
          disabled={claimTaskMutation.isPending}
          className="w-[144px] h-8 text-xs font-bold gap-1 px-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-destructive shadow-sm shrink-0 whitespace-nowrap justify-center"
        >
          <span>Chấm quá hạn</span>
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </Button>
      );
    }

    // 7. In progress peer review (< 3 reviews and not overdue)
    if (item.peerReviewsCount < 3) {
      return (
        <Button
          type="button"
          variant="tonal"
          onClick={() => handleGradeSubmission(item)}
          disabled={claimTaskMutation.isPending}
          className="w-[144px] h-8 text-xs font-semibold gap-1 px-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shrink-0 whitespace-nowrap justify-center"
        >
          <span>Chấm sớm</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </Button>
      );
    }

    // 8. Default
    return (
      <Button
        type="button"
        onClick={() => handleGradeSubmission(item)}
        disabled={claimTaskMutation.isPending}
        className="w-[144px] h-8 text-xs font-bold gap-1 px-2.5 bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm shrink-0 whitespace-nowrap justify-center"
      >
        <span>Tiếp nhận & Chấm</span>
        <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      </Button>
    );
  };

  const getRowBorderClass = (item: GradingQueueItem, isOverdue: boolean) => {
    if (item.lockedByUserId) {
      return item.lockedByUserId === currentUserId
        ? "border-l-4 border-l-primary bg-primary/[0.04]"
        : "border-l-4 border-l-muted-foreground/30";
    }
    if (item.isAppeal) return "border-l-4 border-l-tertiary bg-tertiary/[0.04]";
    if (item.status === GradingQueueStatus.GRADED) return "border-l-4 border-l-success/30";
    if (item.isOutlier) return "border-l-4 border-l-warning bg-warning/[0.03]";
    if (isOverdue) return "border-l-4 border-l-destructive bg-destructive/[0.03]";
    return "border-l-4 border-l-transparent";
  };

  // Helper to resolve the authoritative score for a queue item
  const resolveItemScore = (item: GradingQueueItem): number | null => {
    // If not graded (no provenance or UNSPECIFIED), return null
    if (!item.gradeSource) {
      return null;
    }

    // 1. Staff score (INSTRUCTOR or TA)
    if (
      item.gradeSource === GradingProvenance.INSTRUCTOR ||
      item.gradeSource === GradingProvenance.TA
    ) {
      if (
        typeof item.staffScore === "number" &&
        !Number.isNaN(item.staffScore) &&
        item.staffScore >= 0
      ) {
        return item.staffScore;
      }
    }

    // 2. Peer score (PEER)
    // Only valid if completed (>= 3 reviews and GRADED / APPEALED / CLAIMED with existing peer grade) and has actual score > 0
    if (item.gradeSource === GradingProvenance.PEER) {
      const isPeerGraded =
        (item.status === GradingQueueStatus.GRADED ||
          item.status === GradingQueueStatus.APPEALED ||
          item.status === GradingQueueStatus.CLAIMED) &&
        item.peerReviewsCount >= 3;
      if (
        isPeerGraded &&
        typeof item.peerScore === "number" &&
        !Number.isNaN(item.peerScore) &&
        item.peerScore > 0
      ) {
        return item.peerScore;
      }
    }

    // 3. Fallback when provenance is AUTO
    if (item.gradeSource === GradingProvenance.AUTO) {
      if (typeof item.staffScore === "number" && item.staffScore >= 0) {
        return item.staffScore;
      }
    }

    return null;
  };

  // Helper render provenance badge
  const renderProvenanceBadge = (
    provenance: GradingProvenance,
    score: number | null | undefined,
    _status: GradingQueueStatus,
  ) => {
    if (score === null || score === undefined || Number.isNaN(score) || score < 0 || !provenance) {
      return <span className="text-xs text-muted-foreground italic">Chưa có điểm</span>;
    }
    switch (provenance) {
      case GradingProvenance.AUTO:
        return (
          <Badge
            variant="outlined"
            className="text-[11px] font-semibold bg-muted text-muted-foreground gap-1 px-2.5 py-0.5"
          >
            <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
            Tự động: {score.toFixed(1)}
          </Badge>
        );
      case GradingProvenance.PEER:
        return (
          <Badge
            variant="outlined"
            className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20 gap-1 px-2.5 py-0.5"
          >
            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Đồng học: {score.toFixed(1)}
          </Badge>
        );
      case GradingProvenance.TA:
        return (
          <Badge
            variant="success"
            className="text-[11px] font-semibold bg-success text-success-foreground gap-1 px-2.5 py-0.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            Trợ giảng: {score.toFixed(1)}
          </Badge>
        );
      case GradingProvenance.INSTRUCTOR:
        return (
          <Badge
            variant="primary"
            className="text-[11px] font-semibold bg-primary text-primary-foreground gap-1 px-2.5 py-0.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Giảng viên: {score.toFixed(1)}
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outlined"
            className="text-[11px] font-semibold bg-muted text-muted-foreground gap-1 px-2.5 py-0.5"
          >
            Điểm: {score.toFixed(1)}
          </Badge>
        );
    }
  };

  // Handle view submission without claiming (safe view-only mode)
  const handleViewSubmission = (item: GradingQueueItem) => {
    setSelectedSubmissionId(item.submissionId);
    setEvaluationModalMode("view");
    setIsEvaluationModalOpen(true);
  };

  // Handle grade submission with atomic claiming
  const handleGradeSubmission = async (item: GradingQueueItem) => {
    try {
      if (!item.lockedByUserId || item.lockedByUserId !== currentUserId) {
        await claimTaskMutation.mutateAsync({ submissionId: item.submissionId });
        await refetch();
      }
      setSelectedSubmissionId(item.submissionId);
      setEvaluationModalMode("grade");
      setIsEvaluationModalOpen(true);
    } catch {
      toast({
        title: "Không thể tiếp nhận bài nộp",
        description: "Bài nộp này có thể đang được nhân sự khác xử lý. Vui lòng thử lại sau.",
        type: "error",
      });
      refetch();
    }
  };

  if (isInvalidCourse) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto" aria-hidden="true" />
        <h2 className="text-xl font-bold">Chưa chọn khóa học để chấm bài</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Không tìm thấy thông tin khóa học hợp lệ trong đường dẫn. Vui lòng quay lại danh sách khóa
          học của bạn để tiếp tục.
        </p>
        <Link href="/instructor/courses">
          <Button variant="filled" className="text-xs font-bold">
            Quay về danh sách khóa học
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors pb-16">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <Breadcrumb.List className="text-xs">
              <Breadcrumb.Item>
                <Breadcrumb.Link href="/instructor/courses">Giảng viên</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Link href={`/instructor/courses/${courseId}`}>
                  {courseDetail?.course?.title || "Khóa học"}
                </Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>Trung tâm Chấm bài</Breadcrumb.Page>
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb>
        </div>

        {/* Header Hero Section */}
        <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                Bàn điều khiển Chấm bài & Phúc khảo
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Hàng chờ Xử lý
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tiếp nhận bài làm cần can thiệp, bài có khiếu nại phúc khảo hoặc điểm số bất thường.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full md:w-auto">
            <div className="p-3 rounded-2xl bg-background border border-border text-center">
              <span className="text-xl font-black text-foreground block">
                {data?.totalCount ?? 0}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">Tổng bài</span>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-center">
              <span className="text-xl font-black text-primary block">
                {data?.pendingCount ?? 0}
              </span>
              <span className="text-[11px] font-bold text-primary">Chờ chấm</span>
            </div>
            <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-center">
              <span className="text-xl font-black text-destructive block">{overdueCount}</span>
              <span className="text-[11px] font-bold text-destructive">Quá hạn</span>
            </div>
            <div className="p-3 rounded-2xl bg-warning/10 border border-warning/20 text-center">
              <span className="text-xl font-black text-warning block">{outlierCount}</span>
              <span className="text-[11px] font-bold text-warning">Lệch điểm</span>
            </div>
            <div className="p-3 rounded-2xl bg-tertiary/10 border border-tertiary/20 text-center">
              <span className="text-xl font-black text-tertiary block">
                {data?.appealedCount ?? 0}
              </span>
              <span className="text-[11px] font-bold text-tertiary">Khiếu nại</span>
            </div>
            <div className="p-3 rounded-2xl bg-success/10 border border-success/20 text-center">
              <span className="text-xl font-black text-success block">
                {data?.gradedCount ?? 0}
              </span>
              <span className="text-[11px] font-bold text-success">Đã chấm</span>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab(GradingQueueStatus.ALL)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === GradingQueueStatus.ALL
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tất cả ({data?.totalCount ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(GradingQueueStatus.PENDING)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === GradingQueueStatus.PENDING
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Chờ chấm ({data?.pendingCount ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(GradingQueueStatus.CLAIMED)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === GradingQueueStatus.CLAIMED
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đang chấm ({data?.claimedCount ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("OUTLIER")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === "OUTLIER"
                  ? "bg-warning text-warning-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Lệch điểm ({outlierCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(GradingQueueStatus.APPEALED)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === GradingQueueStatus.APPEALED
                  ? "bg-destructive text-destructive-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Khiếu nại ({data?.appealedCount ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(GradingQueueStatus.GRADED)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === GradingQueueStatus.GRADED
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đã hoàn tất ({data?.gradedCount ?? 0})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Tìm theo sinh viên, bài tập..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Main Grading Queue List */}
        <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">
                Đang tải danh sách bài nộp trong hàng chờ...
              </p>
            </div>
          ) : isError ? (
            <div className="p-16 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto" aria-hidden="true" />
              <h3 className="text-base font-bold text-foreground">
                {error?.message?.includes("quyền") ||
                error?.message?.includes("permission") ||
                error?.message?.includes("PERMISSION_DENIED")
                  ? "Không có quyền truy cập khóa học này"
                  : "Không thể tải dữ liệu hàng chờ"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {error?.message?.includes("quyền") ||
                error?.message?.includes("permission") ||
                error?.message?.includes("PERMISSION_DENIED")
                  ? "Bạn không phải là giảng viên hoặc trợ giảng phụ trách khóa học này. Vui lòng quay lại danh sách khóa học của bạn."
                  : error?.message ||
                    "Đã xảy ra lỗi khi kết nối với máy chủ chấm bài. Vui lòng kiểm tra lại đường truyền."}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Link
                  href="/instructor/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors"
                >
                  Quay về Tổng quan
                </Link>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => refetch()}
                  className="text-xs font-bold"
                >
                  Thử lại
                </Button>
              </div>
            </div>
          ) : queueItems.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-success" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-foreground">Hàng chờ chấm bài sạch sẽ!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Không có bài nộp nào đang chờ xử lý theo bộ lọc này. Tất cả học viên đã được chấm và
                công bố kết quả.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Table.Header className="bg-muted/30">
                  <Table.Row>
                    <Table.Head className="text-xs font-bold text-muted-foreground w-[220px] min-w-[200px] whitespace-nowrap">
                      Sinh viên & Thời gian
                    </Table.Head>
                    <Table.Head className="text-xs font-bold text-muted-foreground min-w-[280px]">
                      Bài tập
                    </Table.Head>
                    <Table.Head className="text-xs font-bold text-muted-foreground w-[210px] min-w-[200px] whitespace-nowrap">
                      Trạng thái & Cảnh báo
                    </Table.Head>
                    <Table.Head className="text-xs font-bold text-muted-foreground w-[150px] min-w-[140px] whitespace-nowrap">
                      Điểm hiện tại
                    </Table.Head>
                    <Table.Head className="text-xs font-bold text-muted-foreground text-right w-[260px] min-w-[260px] whitespace-nowrap">
                      Thao tác
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {queueItems.map((item) => {
                    const isItemOverdue = isSubmissionOverdue(item);

                    return (
                      <Table.Row
                        key={item.submissionId}
                        className={cn(
                          "hover:bg-muted/20 transition-all border-b border-border/60",
                          getRowBorderClass(item, isItemOverdue),
                        )}
                      >
                        {/* Student info */}
                        <Table.Cell className="py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 border border-border shrink-0">
                              <Avatar.Image src={item.studentAvatarUrl} alt={item.studentName} />
                              <Avatar.Fallback className="bg-primary/10 text-primary text-xs font-bold">
                                {item.studentName.slice(0, 2).toUpperCase()}
                              </Avatar.Fallback>
                            </Avatar>
                            <div className="min-w-0">
                              <span className="font-bold text-foreground text-sm block">
                                {item.studentName}
                              </span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                                {item.submittedAt
                                  ? new Date(item.submittedAt).toLocaleDateString("vi-VN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      day: "2-digit",
                                      month: "2-digit",
                                    })
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </Table.Cell>

                        {/* Item Title */}
                        <Table.Cell className="py-3.5 min-w-[280px] whitespace-normal">
                          <span
                            className="font-bold text-foreground text-sm leading-snug block break-words"
                            title={item.itemTitle}
                          >
                            {item.itemTitle}
                          </span>
                        </Table.Cell>

                        {/* Badges / Warnings (Structured Uniform 2-Tier) */}
                        <Table.Cell className="py-3.5 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <div>{renderStatusBadge(item, isItemOverdue)}</div>
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <Users
                                className="w-3 h-3 text-muted-foreground shrink-0"
                                aria-hidden="true"
                              />
                              Tiến độ: {item.peerReviewsCount}/3 bạn học
                            </span>
                          </div>
                        </Table.Cell>

                        {/* Current Score / Provenance */}
                        <Table.Cell className="py-3.5 whitespace-nowrap">
                          {renderProvenanceBadge(
                            item.gradeSource,
                            resolveItemScore(item),
                            item.status,
                          )}
                        </Table.Cell>

                        {/* Two-Button Action Column: View (Safe) + Grade (Claim) - Fixed Width & Straight Alignment */}
                        <Table.Cell className="py-3.5 text-right w-[260px] min-w-[260px] whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <Button
                              type="button"
                              variant="outlined"
                              onClick={() => handleViewSubmission(item)}
                              className="w-[90px] h-8 text-xs font-semibold gap-1 px-2 border-border hover:bg-muted text-foreground shrink-0 whitespace-nowrap justify-center"
                              title="Xem chi tiết bài nộp và tiến độ chấm (không khóa giữ bài)"
                            >
                              <Eye
                                className="w-3.5 h-3.5 text-muted-foreground shrink-0"
                                aria-hidden="true"
                              />
                              <span>Xem bài</span>
                            </Button>

                            {renderGradeActionButton(item, isItemOverdue)}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* Pedagogical Workbench Dual-Pane Modal */}
      {selectedSubmissionId && (
        <EvaluationModal
          isOpen={isEvaluationModalOpen}
          submissionId={selectedSubmissionId}
          initialMode={evaluationModalMode}
          onClose={() => {
            setIsEvaluationModalOpen(false);
            setSelectedSubmissionId(null);
            refetch();
          }}
          onGradedSuccessfully={() => {
            refetch();
          }}
          onTaskClaimed={() => {
            refetch();
          }}
          onTaskReleased={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
