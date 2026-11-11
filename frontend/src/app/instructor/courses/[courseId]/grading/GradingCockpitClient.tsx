"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Lock,
  UserCheck,
  Cpu,
  ShieldCheck,
  ArrowRight,
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

export function GradingCockpitClient({ courseId }: GradingCockpitClientProps) {
  const { toast } = useToast();
  const { userId: currentUserId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSubmissionId = searchParams.get("submissionId");
  const autoClaimedSubmissionRef = useRef<string | null>(null);

  const isInvalidCourse = !courseId || courseId === "undefined" || courseId === "null";

  const { data: courseDetail } = useCourseDetailQuery(courseId, {
    enabled: !isInvalidCourse,
  });

  const [activeTab, setActiveTab] = useState<GradingQueueStatus>(GradingQueueStatus.ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null);

  useEffect(() => {
    setCurrentTimeMs(Date.now());
  }, []);

  const claimTaskMutation = useClaimGradingTaskMutation();

  // Auto-open evaluation modal if submissionId was passed in URL query param (chỉ chạy 1 lần cho mỗi URL submissionId)
  useEffect(() => {
    if (urlSubmissionId && autoClaimedSubmissionRef.current !== urlSubmissionId) {
      autoClaimedSubmissionRef.current = urlSubmissionId;
      claimTaskMutation
        .mutateAsync({ submissionId: urlSubmissionId })
        .catch(() => {
          // If already claimed or failed, still open modal in inspected mode
        })
        .finally(() => {
          setSelectedSubmissionId(urlSubmissionId);
          setIsEvaluationModalOpen(true);
        });
    }
  }, [urlSubmissionId, claimTaskMutation]);

  const handleCloseModal = useCallback(() => {
    setIsEvaluationModalOpen(false);
    setSelectedSubmissionId(null);
    if (urlSubmissionId) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("submissionId");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [urlSubmissionId, searchParams, pathname, router]);

  // Fetch grading queue using TanStack Query
  const { data, isLoading, isError, error, refetch } = useGradingQueueQuery(
    {
      courseId: isInvalidCourse ? "" : courseId,
      status: activeTab,
      searchQuery,
    },
    {
      enabled: !isInvalidCourse,
    },
  );

  const queueItems = data?.items || [];

  const isSubmissionOverdue = (item: GradingQueueItem) => {
    // Only items that are NOT graded, NOT appealed, NOT outlier, NOT claimed, and past 48h
    if (item.status === GradingQueueStatus.GRADED) return false;
    if (item.isAppeal) return false;
    if (item.isOutlier) return false;
    if (item.lockedByUserId) return false;
    if (!item.submittedAt || !currentTimeMs) return false;
    const isPast48h = currentTimeMs - new Date(item.submittedAt).getTime() > 48 * 3600 * 1000;
    return isPast48h && !item.staffScore && item.peerReviewsCount < 3;
  };

  const overdueCount = queueItems.filter(isSubmissionOverdue).length;

  const getActionConfig = (item: GradingQueueItem, isOverdue: boolean) => {
    if (item.isAppeal) {
      return {
        label: "Giải quyết khiếu nại",
        className:
          "bg-tertiary hover:bg-tertiary/90 text-on-tertiary shadow-sm font-bold border border-tertiary",
        icon: AlertTriangle,
      };
    }
    if (item.isOutlier) {
      return {
        label: "Xử lý lệch điểm",
        className:
          "bg-warning hover:bg-warning-hover text-warning-foreground shadow-sm font-bold border border-warning",
        icon: AlertTriangle,
      };
    }
    if (isOverdue) {
      return {
        label: "Quá hạn",
        className:
          "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm font-bold border border-destructive",
        icon: Clock,
      };
    }
    if (item.lockedByUserId) {
      if (item.lockedByUserId === currentUserId) {
        return {
          label: "Tiếp tục chấm",
          className:
            "bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm font-bold border border-primary",
          icon: ArrowRight,
        };
      }
      return {
        label: "Xem bài đang chấm",
        className:
          "bg-muted/70 hover:bg-muted text-muted-foreground border border-border font-medium",
        icon: Lock,
      };
    }
    if (item.status === GradingQueueStatus.GRADED) {
      return {
        label: "Xem / Chấm lại",
        className:
          "bg-card hover:bg-muted/50 text-foreground border border-border font-semibold shadow-none",
        icon: ArrowRight,
      };
    }
    return {
      label: "Tiếp nhận & Chấm",
      className:
        "bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm font-bold border border-primary",
      icon: ArrowRight,
    };
  };

  const getRowBorderClass = (item: GradingQueueItem, isOverdue: boolean) => {
    if (item.isAppeal) return "border-l-4 border-l-tertiary bg-tertiary/[0.04]";
    if (item.isOutlier) return "border-l-4 border-l-warning bg-warning/[0.03]";
    if (isOverdue) return "border-l-4 border-l-destructive bg-destructive/[0.03]";
    if (item.lockedByUserId) return "border-l-4 border-l-muted-foreground/30";
    if (item.status === GradingQueueStatus.GRADED) return "border-l-4 border-l-success/30";
    return "border-l-4 border-l-transparent";
  };

  // Helper render provenance badge
  const renderProvenanceBadge = (
    provenance: GradingProvenance,
    score: number,
    status: GradingQueueStatus,
  ) => {
    if (status !== GradingQueueStatus.GRADED && (!score || score <= 0)) {
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
        return score > 0 ? (
          <Badge
            variant="outlined"
            className="text-[11px] font-semibold bg-muted text-muted-foreground gap-1 px-2.5 py-0.5"
          >
            Điểm: {score.toFixed(1)}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground italic">Chưa có điểm</span>
        );
    }
  };

  // Handle open evaluation modal with claim
  const handleOpenEvaluation = async (item: GradingQueueItem) => {
    try {
      // If the task is not yet locked or locked by current user, claim it
      if (!item.lockedByUserId) {
        await claimTaskMutation.mutateAsync({ submissionId: item.submissionId });
      }
      setSelectedSubmissionId(item.submissionId);
      setIsEvaluationModalOpen(true);
    } catch {
      toast({
        title: "Không thể tiếp nhận bài nộp",
        description: "Bài nộp này có thể đang được giảng viên khác xử lý. Vui lòng thử lại sau.",
        type: "error",
      });
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

          <Link href={`/instructor/courses/${courseId}/gradebook`}>
            <Button variant="outlined" className="text-xs font-bold gap-1.5 border-border">
              <Award className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Xem Sổ điểm Khóa học</span>
            </Button>
          </Link>
        </div>

        {/* Header Hero Section */}
        <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                Bàn điều khiển Chấm bài & Phúc khảo
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
                Công bố điểm tức thì
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Hàng chờ Xử lý Sư phạm
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tiếp nhận bài làm cần trợ giảng can thiệp, bài có khiếu nại phúc khảo hoặc điểm số bất
              thường. Điểm chấm sẽ được công bố ngay lập tức cho học viên.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full md:w-auto">
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

        {/* Overdue Warning Alert Banner */}
        {overdueCount > 0 && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle
                className="w-5 h-5 text-destructive flex-shrink-0"
                aria-hidden="true"
              />
              <span>
                <strong>{overdueCount} bài nộp đã quá hạn 48 giờ</strong> chưa hoàn thành đánh giá
                đồng học. Cần Giảng viên / Trợ giảng can thiệp chấm bài ngay để giải phóng điểm cho
                sinh viên.
              </span>
            </div>
          </div>
        )}

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
                    <Table.Head className="text-xs font-bold text-muted-foreground min-w-[200px]">
                      Sinh viên & Thời gian
                    </Table.Head>
                    <Table.Head className="text-xs font-bold text-muted-foreground min-w-[240px]">
                      Bài tập / Nội dung
                    </Table.Head>
                    <Table.Head className="text-xs font-bold text-muted-foreground min-w-[220px]">
                      Trạng thái & Cảnh báo
                    </Table.Head>
                    <Table.Head className="text-xs font-bold text-muted-foreground min-w-[150px]">
                      Điểm hiện tại
                    </Table.Head>
                    <Table.Head className="text-xs font-bold text-muted-foreground text-right min-w-[150px]">
                      Thao tác
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {queueItems.map((item) => {
                    const isItemOverdue = isSubmissionOverdue(item);
                    const action = getActionConfig(item, isItemOverdue);
                    const ActionIcon = action.icon;

                    return (
                      <Table.Row
                        key={item.submissionId}
                        className={cn(
                          "hover:bg-muted/20 transition-all border-b border-border/60",
                          getRowBorderClass(item, isItemOverdue),
                        )}
                      >
                        {/* Student info */}
                        <Table.Cell className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 border border-border">
                              <Avatar.Image src={item.studentAvatarUrl} alt={item.studentName} />
                              <Avatar.Fallback className="bg-primary/10 text-primary text-xs font-bold">
                                {item.studentName.slice(0, 2).toUpperCase()}
                              </Avatar.Fallback>
                            </Avatar>
                            <div>
                              <span className="font-bold text-foreground text-sm block">
                                {item.studentName}
                              </span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" aria-hidden="true" />
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
                        <Table.Cell className="py-4">
                          <div>
                            <span className="font-bold text-foreground text-sm block">
                              {item.itemTitle}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate max-w-xs block">
                              {item.courseTitle}
                            </span>
                          </div>
                        </Table.Cell>

                        {/* Badges / Warnings (Prioritized & Mutually Exclusive) */}
                        <Table.Cell className="py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.isAppeal ? (
                              <Badge
                                variant="outlined"
                                className="text-[11px] font-bold bg-tertiary/15 text-tertiary border-tertiary/30 gap-1 px-2.5 py-0.5"
                              >
                                <AlertTriangle
                                  className="w-3.5 h-3.5 text-tertiary"
                                  aria-hidden="true"
                                />
                                Khiếu nại điểm
                              </Badge>
                            ) : item.isOutlier ? (
                              <Badge
                                variant="warning"
                                className="text-[11px] font-bold bg-warning/15 text-warning border-warning/30 gap-1 px-2.5 py-0.5"
                              >
                                <AlertTriangle
                                  className="w-3.5 h-3.5 text-warning"
                                  aria-hidden="true"
                                />
                                Lệch điểm chuẩn
                              </Badge>
                            ) : item.lockedByUserId ? (
                              <Badge
                                variant="outlined"
                                className="text-[11px] font-medium bg-muted text-muted-foreground gap-1 px-2.5 py-0.5"
                              >
                                <Lock
                                  className="w-3.5 h-3.5 text-muted-foreground"
                                  aria-hidden="true"
                                />
                                {item.lockedByName
                                  ? `Đang giữ: ${item.lockedByName}`
                                  : "Đang được chấm"}
                              </Badge>
                            ) : isItemOverdue ? (
                              <Badge
                                variant="error"
                                className="text-[11px] font-bold bg-destructive/10 text-destructive border-destructive/20 gap-1 px-2.5 py-0.5"
                              >
                                <Clock
                                  className="w-3.5 h-3.5 text-destructive"
                                  aria-hidden="true"
                                />
                                Quá hạn 48h
                              </Badge>
                            ) : item.status === GradingQueueStatus.GRADED ? (
                              <Badge
                                variant="success"
                                className="text-[11px] font-semibold bg-success/15 text-success border-success/30 gap-1 px-2.5 py-0.5"
                              >
                                <CheckCircle2
                                  className="w-3.5 h-3.5 text-success"
                                  aria-hidden="true"
                                />
                                Đã chấm
                              </Badge>
                            ) : (
                              <Badge
                                variant="outlined"
                                className="text-[11px] font-medium text-muted-foreground px-2.5 py-0.5"
                              >
                                Chờ chấm
                              </Badge>
                            )}
                          </div>
                        </Table.Cell>

                        {/* Current Score / Provenance */}
                        <Table.Cell className="py-4">
                          {renderProvenanceBadge(
                            item.gradeSource,
                            item.staffScore || item.peerScore,
                            item.status,
                          )}
                        </Table.Cell>

                        {/* Context-Aware Color-Coded Action Button */}
                        <Table.Cell className="py-4 text-right">
                          <Button
                            type="button"
                            onClick={() => handleOpenEvaluation(item)}
                            disabled={claimTaskMutation.isPending}
                            className={cn(
                              "text-xs gap-1.5 px-3.5 py-1.5 transition-all",
                              action.className,
                            )}
                          >
                            <span>{action.label}</span>
                            <ActionIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          </Button>
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
          onClose={handleCloseModal}
          onGradedSuccessfully={() => {
            refetch();
            handleCloseModal();
          }}
        />
      )}
    </div>
  );
}
