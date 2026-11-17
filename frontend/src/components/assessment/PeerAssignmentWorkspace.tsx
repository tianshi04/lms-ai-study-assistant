"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { EssayGradingMode } from "@/gen/catalog/v1/catalog_pb";
import { useMyPeerSubmissionStatusQuery } from "@/lib/query_hooks";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Slider } from "@/components/ui/Slider";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Check,
  Lock,
  AlertTriangle,
  Info,
  Send,
  ExternalLink,
  Scale,
  Users,
  BookOpen,
  FileText,
  HelpCircle,
  Clock,
  Award,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { mapConnectError } from "@/lib/connect_error_mapper";
import { renderMarkdown } from "@/components/ai/AIChatMarkdownRenderer";
import { getSafeExternalUrl } from "@/lib/utils";

interface PeerAssignmentWorkspaceProps {
  itemId: string;
  title?: string;
  userId?: string;
  instructionsMarkdown?: string;
  rubricCriteriaJson?: string;
  essayGradingMode?: EssayGradingMode;
  requiredPeerReviews?: number;
}

interface PeerItem {
  reviewId: string;
  submissionUrl: string;
  textContent: string;
  rubricCriteria: {
    criteriaId: string;
    title: string;
    maxScore: number;
    scoreGiven: number;
    feedback: string;
    description?: string;
  }[];
}

interface RubricPreviewItem {
  criteriaId: string;
  title: string;
  maxScore: number;
  description: string;
}

export function PeerAssignmentWorkspace({
  itemId,
  title,
  userId: _userId,
  instructionsMarkdown,
  rubricCriteriaJson,
  essayGradingMode: propGradingMode,
  requiredPeerReviews: propRequiredReviews,
}: PeerAssignmentWorkspaceProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: statusData, isLoading: isLoadingStatus } = useMyPeerSubmissionStatusQuery(itemId);

  const hasSubmitted = Boolean(statusData?.hasSubmission);
  const submissionId = statusData?.submissionId || "";
  const gradingModeStr =
    statusData?.essayGradingMode ||
    (propGradingMode === EssayGradingMode.INSTRUCTOR_ONLY ? "INSTRUCTOR_ONLY" : "PEER_REVIEW");
  const isInstructorOnly = gradingModeStr === "INSTRUCTOR_ONLY";
  const dutyStatus =
    statusData?.reviewDutyStatus || (isInstructorOnly ? "NOT_APPLICABLE" : "PENDING");
  const completedReviews = statusData?.reviewsCompletedByUser ?? 0;
  const targetReviews =
    statusData?.targetReviewsRequired ??
    (isInstructorOnly
      ? 0
      : propRequiredReviews && propRequiredReviews > 0
        ? propRequiredReviews
        : 3);
  const availablePoolCount = statusData?.availablePoolCount ?? 0;
  const attemptNumber = statusData?.attemptNumber ?? 0;
  const maxAttemptsReached = attemptNumber >= 3;

  const [activeTab, setActiveTab] = useState<"submit" | "grade" | "appeal">("submit");
  const [draftSubmissionUrl, setDraftSubmissionUrl] = useState<string | null>(null);
  const [draftTextContent, setDraftTextContent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedSubmissionUrl = draftSubmissionUrl ?? statusData?.submissionUrl ?? "";
  const displayedTextContent = draftTextContent ?? statusData?.textContent ?? "";

  const [peerItems, setPeerItems] = useState<PeerItem[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [hasFetchedReviews, setHasFetchedReviews] = useState(false);

  const [appealReason, setAppealReason] = useState("");
  const [lockNotice, setLockNotice] = useState("");
  const [isSubmittingGrade, setIsSubmittingGrade] = useState<Record<number, boolean>>({});
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);

  const resolvedTitle = title || statusData?.assignmentTitle || "Bài tập Tự luận";
  const resolvedInstructions = instructionsMarkdown || statusData?.assignmentInstructions || "";

  const referenceRubrics: RubricPreviewItem[] = useMemo(() => {
    if (statusData?.rubricCriteria && statusData.rubricCriteria.length > 0) {
      return statusData.rubricCriteria.map((r) => ({
        criteriaId: r.criteriaId,
        title: r.title,
        maxScore: r.maxScore || 10,
        description: r.description || "",
      }));
    }
    if (!rubricCriteriaJson || !rubricCriteriaJson.trim()) return [];
    try {
      let parsed = JSON.parse(rubricCriteriaJson);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => ({
          criteriaId: String(item.criteria_id || item.criteriaId || item.id || `c${idx + 1}`),
          title: String(item.title || ""),
          maxScore: Number(item.max_score || item.maxScore || 10),
          description: String(item.description || ""),
        }));
      }
    } catch {
      // ignore parse error
    }
    return [];
  }, [rubricCriteriaJson, statusData?.rubricCriteria]);

  const fetchReviews = useCallback(async () => {
    if (isInstructorOnly) return;
    setIsLoadingReviews(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.getPeerReviewsToGrade({ itemId });
      setHasFetchedReviews(true);
      if (res.itemsToGrade && res.itemsToGrade.length > 0) {
        setPeerItems(
          res.itemsToGrade.map((item) => ({
            reviewId: item.reviewId,
            submissionUrl: item.submissionUrl,
            textContent: item.textContent,
            rubricCriteria: item.rubricCriteria.map((c) => ({
              criteriaId: c.criteriaId,
              title: c.title,
              maxScore: c.maxScore || 10,
              scoreGiven: c.scoreGiven || 0,
              feedback: c.feedback || "",
              description: c.description || "",
            })),
          })),
        );
      } else {
        setPeerItems([]);
      }
    } catch (err) {
      setPeerItems([]);
      const msg = mapConnectError(err, "Không thể tải hàng chờ chấm bài bạn học.");
      toast.error(msg);
    } finally {
      setIsLoadingReviews(false);
    }
  }, [isInstructorOnly, itemId, toast]);

  const refreshStatus = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["myPeerSubmissionStatus", itemId] });
    await queryClient.invalidateQueries({ queryKey: ["courseProgress"] });
  }, [itemId, queryClient]);

  const handleSubmitAssignment = async () => {
    if (!displayedSubmissionUrl.trim() && !displayedTextContent.trim()) {
      toast.error("Vui lòng cung cấp liên kết bài làm hoặc nội dung bài tự luận.");
      return;
    }
    setIsSubmitting(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitPeerAssignment({
        itemId,
        submissionUrl: displayedSubmissionUrl.trim(),
        textContent: displayedTextContent.trim(),
      });

      setDraftSubmissionUrl(null);
      setDraftTextContent(null);
      setLockNotice("");
      await refreshStatus();

      toast.success(res.statusMessage || "Nộp bài tự luận thành công!");
      if (!isInstructorOnly) {
        setActiveTab("grade");
        void fetchReviews();
      }
    } catch (err) {
      const msg = mapConnectError(err, "Nộp bài tự luận thất bại. Vui lòng thử lại.");
      toast.error(msg);
      setLockNotice(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabClick = (tab: "submit" | "grade" | "appeal") => {
    if (tab === "grade" && isInstructorOnly) return;
    if ((tab === "grade" || tab === "appeal") && !hasSubmitted) {
      setLockNotice(
        isInstructorOnly
          ? "Vui lòng nộp bài ở Bước 1 trước khi xem hoặc gửi phúc khảo điểm."
          : "Theo quy tắc BR_PEER_001: Bạn bắt buộc phải nộp bài cá nhân ở Bước 1 trước khi mở khóa chấm chéo bài của bạn học.",
      );
      return;
    }
    setLockNotice("");
    setActiveTab(tab);
    if (tab === "grade" && hasSubmitted && !isInstructorOnly && !hasFetchedReviews) {
      void fetchReviews();
    }
  };

  const handleScoreChange = (itemIdx: number, critIdx: number, newScore: number) => {
    setPeerItems((prev) =>
      prev.map((peer, pIdx) =>
        pIdx !== itemIdx
          ? peer
          : {
              ...peer,
              rubricCriteria: peer.rubricCriteria.map((c, cIdx) =>
                cIdx !== critIdx ? c : { ...c, scoreGiven: newScore },
              ),
            },
      ),
    );
  };

  const handleFeedbackChange = (itemIdx: number, critIdx: number, feedback: string) => {
    setPeerItems((prev) =>
      prev.map((peer, pIdx) =>
        pIdx !== itemIdx
          ? peer
          : {
              ...peer,
              rubricCriteria: peer.rubricCriteria.map((c, cIdx) =>
                cIdx !== critIdx ? c : { ...c, feedback },
              ),
            },
      ),
    );
  };

  const handleSubmitPeerGrade = async (itemIdx: number) => {
    const item = peerItems[itemIdx];
    if (!item) return;
    setIsSubmittingGrade((prev) => ({ ...prev, [itemIdx]: true }));
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitPeerReviewGrade({
        reviewId: item.reviewId,
        gradedCriteria: item.rubricCriteria.map((c) => ({
          criteriaId: c.criteriaId,
          title: c.title,
          maxScore: c.maxScore,
          scoreGiven: c.scoreGiven,
          feedback: c.feedback,
          description: c.description || "",
        })),
      });
      toast.success(res.message || "Nộp điểm đánh giá bạn học thành công!");
      setPeerItems((prev) => prev.filter((_, idx) => idx !== itemIdx));
      await refreshStatus();
    } catch (err) {
      const msg = mapConnectError(err, "Nộp điểm đánh giá bạn học thất bại. Vui lòng thử lại.");
      toast.error(msg);
    } finally {
      setIsSubmittingGrade((prev) => ({ ...prev, [itemIdx]: false }));
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealReason.trim()) {
      toast.error("Vui lòng nhập lý do phúc khảo / khiếu nại điểm chi tiết.");
      return;
    }
    if (!submissionId) {
      toast.error("Không tìm thấy mã bài nộp để gửi khiếu nại.");
      return;
    }
    setIsSubmittingAppeal(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitGradeAppeal({
        submissionId,
        appealReason: appealReason.trim(),
      });
      toast.success(
        `Đã gửi yêu cầu phúc khảo thành công (${res.appealStatus || "Đang chờ xử lý"}).`,
      );
      setAppealReason("");
      await refreshStatus();
    } catch (err) {
      const msg = mapConnectError(
        err,
        "Gửi đơn phúc khảo điểm thất bại. Vui lòng kiểm tra lại điều kiện nộp đơn.",
      );
      toast.error(msg);
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const renderGradeSourceLabel = (source: string) => {
    if (source === "INSTRUCTOR") return "Giảng viên chấm";
    if (source === "TA") return "Trợ giảng (TA) chấm";
    if (source === "PEER") return "Bạn học chấm chéo";
    return "Chờ chấm điểm";
  };

  if (isLoadingStatus) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4 py-4">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 font-sans space-y-5 max-w-5xl mx-auto">
      {/* ═══ Header & Step Navigation ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="primary" size="pill" className="gap-1.5">
              {isInstructorOnly ? (
                <Award className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>
                {isInstructorOnly
                  ? "BÀI TẬP TỰ LUẬN (GIẢNG VIÊN CHẤM)"
                  : "BÀI TẬP TỰ LUẬN (CHẤM CHÉO)"}
              </span>
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              {isInstructorOnly
                ? "Hình thức: Giảng viên / Trợ giảng chấm trực tiếp"
                : targetReviews > 0
                  ? `Nghĩa vụ chấm bạn học: ${completedReviews} / ${targetReviews} bài`
                  : "Kho bài chưa có bài nộp khác"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground" title={resolvedTitle}>
            {resolvedTitle}
          </h2>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Các bước bài tập tự luận"
          className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-border/60 shrink-0 self-start lg:self-center flex-wrap"
        >
          <Button
            id="peer-tab-submit"
            role="tab"
            aria-selected={activeTab === "submit"}
            aria-controls="peer-tabpanel-submit"
            type="button"
            variant={activeTab === "submit" ? "tonal" : "text"}
            size="xs"
            onClick={() => handleTabClick("submit")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
          >
            <span>1. Bài nộp &amp; Kết quả</span>
            {hasSubmitted && <Check aria-hidden="true" className="w-3.5 h-3.5 text-success" />}
          </Button>

          {!isInstructorOnly && (
            <Button
              id="peer-tab-grade"
              role="tab"
              aria-selected={activeTab === "grade"}
              aria-controls="peer-tabpanel-grade"
              type="button"
              variant={activeTab === "grade" ? "tonal" : "text"}
              size="xs"
              disabled={!hasSubmitted}
              onClick={() => handleTabClick("grade")}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
            >
              <span>2. Chấm bài bạn học</span>
              {!hasSubmitted ? (
                <Lock aria-hidden="true" className="w-3 h-3 text-muted-foreground" />
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/15 text-primary font-bold">
                  {completedReviews}/{targetReviews}
                </span>
              )}
            </Button>
          )}

          <Button
            id="peer-tab-appeal"
            role="tab"
            aria-selected={activeTab === "appeal"}
            aria-controls="peer-tabpanel-appeal"
            type="button"
            variant={activeTab === "appeal" ? "tonal" : "text"}
            size="xs"
            disabled={!hasSubmitted}
            onClick={() => handleTabClick("appeal")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
          >
            <span>{isInstructorOnly ? "2. Phúc khảo điểm" : "3. Khiếu nại điểm"}</span>
            {!hasSubmitted && <Lock aria-hidden="true" className="w-3 h-3 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      {/* Lock Warning Notice Banner */}
      {lockNotice && (
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-m3-short-4 ease-m3-decelerate">
          <AlertTriangle aria-hidden="true" className="w-4 h-4 text-warning shrink-0" />
          <span>{lockNotice}</span>
        </div>
      )}

      {/* ═══ Tab 1: Submit Assignment & View Results ═══ */}
      {activeTab === "submit" && (
        <div
          id="peer-tabpanel-submit"
          role="tabpanel"
          aria-labelledby="peer-tab-submit"
          className="space-y-5"
        >
          {/* Grading Result / Status Panel */}
          {hasSubmitted && statusData && (
            <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
                  <span className="text-sm font-bold text-foreground">
                    Trạng thái Bài nộp (Lần #{attemptNumber})
                  </span>
                  <Badge variant={statusData.isGraded ? "success" : "muted"} size="sm">
                    {statusData.isGraded ? "Đã có điểm" : "Đang chờ chấm"}
                  </Badge>
                </div>

                {statusData.isGraded && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outlined" size="sm">
                      {renderGradeSourceLabel(statusData.gradeSource)}
                    </Badge>
                    <span className="text-lg font-extrabold font-mono text-primary">
                      {statusData.finalScore.toFixed(1)} / 100
                    </span>
                  </div>
                )}
              </div>

              {/* Staff Feedback */}
              {statusData.staffFeedback && (
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                  <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Nhận xét từ Giảng viên / Trợ giảng:</span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {statusData.staffFeedback}
                  </p>
                </div>
              )}

              {/* Anonymous Peer Feedbacks */}
              {!isInstructorOnly &&
                statusData.peerFeedbacks &&
                statusData.peerFeedbacks.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Phản hồi ẩn danh từ bạn học ({statusData.peerFeedbacks.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {statusData.peerFeedbacks.map((fb, idx) => (
                        <div
                          key={`${fb.feedbackLabel}-${idx}`}
                          className="p-3.5 rounded-xl bg-surface-container-low border border-border/80 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-foreground">{fb.feedbackLabel}</span>
                            <span className="font-mono text-primary">
                              {fb.totalScore.toFixed(1)} / 100
                            </span>
                          </div>
                          {fb.gradedCriteria && fb.gradedCriteria.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-border/50">
                              {fb.gradedCriteria.map((c) => (
                                <div key={c.criteriaId} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-muted-foreground">{c.title}</span>
                                    <span className="font-mono font-semibold text-foreground">
                                      {c.scoreGiven}/{c.maxScore}
                                    </span>
                                  </div>
                                  {c.feedback && (
                                    <p className="text-[11px] italic text-muted-foreground">
                                      &ldquo;{c.feedback}&rdquo;
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Dual-Release / Peer Duty Guidance */}
              {isInstructorOnly && !statusData.isGraded && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>
                    Bài làm của bạn đã được chuyển thẳng vào hàng chờ Giảng viên / Trợ giảng. Điểm
                    số và nhận xét Rubric sẽ hiển thị tại đây ngay sau khi chấm.
                  </span>
                </p>
              )}

              {!isInstructorOnly && dutyStatus === "WAIVED_EMPTY_POOL" && (
                <div className="p-3.5 rounded-xl bg-success/10 border border-success/30 text-xs text-success flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    {statusData.reviewDutyWaivedReason ||
                      "Không còn bài làm nào khác trong kho bài. Hệ thống đã tự động giải thoát nghĩa vụ chấm chéo cho bạn."}
                  </span>
                </div>
              )}

              {!isInstructorOnly && dutyStatus === "WAITING_POOL" && (
                <div className="p-3.5 rounded-xl bg-info/10 border border-info/20 text-xs text-foreground flex items-start gap-2">
                  <Clock className="w-4 h-4 text-info shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Kho bài hiện chưa có bài nộp nào của bạn học khác để phân bổ chấm chéo. Khi có
                    bạn học mới nộp bài hoặc sau thời gian chờ giải cứu, Giảng viên và hệ thống sẽ
                    hỗ trợ xử lý hoàn tất cho bạn.
                  </span>
                </div>
              )}

              {!isInstructorOnly && dutyStatus === "PENDING" && (
                <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      {statusData.isGraded
                        ? `Bạn đã có điểm (${statusData.finalScore.toFixed(1)}/100), nhưng hiện vẫn còn ${availablePoolCount} bài làm trong hàng chờ. Vui lòng hoàn thành chấm ${Math.max(1, targetReviews - completedReviews)} bài bạn học để chính thức hoàn tất học phần.`
                        : `Vui lòng hoàn thành chấm ${Math.max(1, targetReviews - completedReviews)} bài làm của bạn học ở Tab 2 để hoàn tất nghĩa vụ chấm chéo.`}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="tonal"
                    onClick={() => handleTabClick("grade")}
                    className="shrink-0"
                  >
                    Chấm bài bạn học ngay
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Assignment Instructions / Prompt */}
          {resolvedInstructions && (
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-border space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Yêu cầu &amp; Đề bài bài tập</span>
              </h4>
              <div className="text-xs text-foreground prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                {renderMarkdown(resolvedInstructions)}
              </div>
            </div>
          )}

          {/* Reference Rubric Preview */}
          {referenceRubrics.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Tiêu chí Đánh giá Tham khảo (Rubric)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {referenceRubrics.map((r, rIdx) => (
                  <div
                    key={r.criteriaId || rIdx}
                    className="p-3 rounded-xl bg-card border border-border/80 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground">{r.title}</span>
                      <span className="text-primary font-mono">{r.maxScore}đ</span>
                    </div>
                    {r.description && (
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {r.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-info/10 border border-info/20 text-xs text-info space-y-1.5">
            <h4 className="font-bold flex items-center gap-1.5 text-foreground">
              <Info aria-hidden="true" className="w-4 h-4 text-info shrink-0" />
              <span>Hướng dẫn Nộp bài Tự luận:</span>
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              {isInstructorOnly
                ? "Bạn có thể nộp đường dẫn sản phẩm (Figma, Canva, Google Drive, Slide, Github...) kết hợp bài luận tóm tắt văn bản. Giảng viên hoặc Trợ giảng sẽ chấm điểm trực tiếp theo Rubric."
                : "Bạn có thể nộp đường dẫn sản phẩm (Figma, Canva, Google Drive, Slide, Github...) kết hợp bài luận tóm tắt văn bản. Sau khi nộp bài cá nhân, hệ thống sẽ mở khóa chức năng chấm chéo bài bạn học (quy tắc BR_PEER_001)."}
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Đường dẫn Liên kết Bài làm / Sản phẩm (URL)"
              type="url"
              inputMode="url"
              value={displayedSubmissionUrl}
              onChange={(e) => setDraftSubmissionUrl(e.target.value)}
              disabled={maxAttemptsReached}
              className="font-mono text-xs"
              placeholder="https://figma.com/file/... hoặc https://github.com/username/project"
            />

            <Textarea
              label="Bản tóm tắt Dự án / Nội dung bài tự luận"
              value={displayedTextContent}
              onChange={(e) => setDraftTextContent(e.target.value)}
              disabled={maxAttemptsReached}
              rows={5}
              placeholder="Mô tả tóm tắt giải pháp, lập luận chính và các kết quả đạt được…"
            />

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                type="button"
                onClick={handleSubmitAssignment}
                disabled={isSubmitting || maxAttemptsReached}
                size="sm"
                className="gap-2 px-5"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                    <span>Đang nộp…</span>
                  </>
                ) : (
                  <>
                    <Send aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>
                      {hasSubmitted
                        ? `Nộp lại Bài tập Tự luận (Lần ${attemptNumber}/3)`
                        : "Nộp Bài tập Tự luận"}
                    </span>
                  </>
                )}
              </Button>
              {maxAttemptsReached && (
                <span className="text-xs text-muted-foreground font-medium">
                  Bạn đã sử dụng tối đa 3/3 lượt nộp bài cho học phần này.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Tab 2: Grade Peers (Only for PEER_REVIEW mode) ═══ */}
      {!isInstructorOnly && activeTab === "grade" && (
        <div
          id="peer-tabpanel-grade"
          role="tabpanel"
          aria-labelledby="peer-tab-grade"
          className="space-y-5"
        >
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning leading-relaxed flex items-start gap-2.5">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-semibold">
              Mỗi bài làm bạn nhận chấm sẽ được khóa mềm độc quyền trong 30 phút để tránh trùng lặp.
              Hãy đánh giá khách quan theo Rubric bên dưới — cảnh báo bất thường tự động kích hoạt
              nếu chênh lệch điểm vượt quá 30%.
            </p>
          </div>

          {dutyStatus === "COMPLETED" && peerItems.length === 0 && (
            <div className="p-5 rounded-2xl bg-success/10 border border-success/30 text-success flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2.5 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>
                  Tuyệt vời! Bạn đã hoàn thành đủ nghĩa vụ chấm ({completedReviews}/{targetReviews}{" "}
                  bài bạn học).
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {isLoadingReviews ? (
              <div className="p-8 rounded-2xl border border-border bg-card text-center space-y-3">
                <span className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin inline-block" />
                <p className="text-xs text-muted-foreground font-semibold">
                  Đang tìm bài nộp phù hợp nhất (ít lượt chấm nhất) từ kho bài…
                </p>
              </div>
            ) : peerItems.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-border bg-card text-center space-y-3">
                <Users className="w-8 h-8 text-muted-foreground mx-auto" aria-hidden="true" />
                <h4 className="font-bold text-sm text-foreground">
                  Hiện chưa có bài nộp nào khả dụng trong hàng chờ
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Kho bài hiện chưa có bài nộp mới nào bạn chưa chấm. Khi có thêm bạn học nộp bài,
                  hệ thống sẽ phân bổ công bằng tại đây.
                </p>
                <Button
                  type="button"
                  variant="outlined"
                  size="xs"
                  onClick={() => void fetchReviews()}
                  className="mt-2"
                >
                  Làm mới hàng chờ
                </Button>
              </div>
            ) : (
              peerItems.map((peer, pIdx) => (
                <div
                  key={peer.reviewId}
                  className="p-5 rounded-2xl border border-border/80 bg-surface-container-low/30 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Bài nộp của Bạn học #{pIdx + 1} (Ẩn danh)
                    </h4>
                    {getSafeExternalUrl(peer.submissionUrl) ? (
                      <a
                        href={getSafeExternalUrl(peer.submissionUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>Mở liên kết bài làm</span>
                      </a>
                    ) : peer.submissionUrl ? (
                      <span className="text-xs font-mono text-destructive">
                        Liên kết không an toàn
                      </span>
                    ) : null}
                  </div>

                  {peer.textContent && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Nội dung bài tự luận / Tóm tắt giải pháp:</span>
                      </div>
                      <p className="text-xs text-foreground bg-surface-container-lowest p-3.5 rounded-xl border border-border whitespace-pre-wrap leading-relaxed">
                        {peer.textContent}
                      </p>
                    </div>
                  )}

                  {/* Rubric Criteria Controls */}
                  <div className="space-y-3 pt-1">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Chấm điểm theo Tiêu chí Rubric:
                    </h5>
                    {peer.rubricCriteria.map((crit, cIdx) => (
                      <div
                        key={crit.criteriaId}
                        className="p-3.5 rounded-xl bg-surface-container-lowest border border-border space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">{crit.title}</span>
                          <span className="font-mono font-bold text-primary">
                            {crit.scoreGiven} / {crit.maxScore} điểm
                          </span>
                        </div>

                        {crit.description && (
                          <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                            {crit.description}
                          </p>
                        )}

                        <Slider
                          min={0}
                          max={crit.maxScore}
                          step={0.5}
                          value={[crit.scoreGiven]}
                          onValueChange={(val) => {
                            const num = Array.isArray(val) ? (val[0] ?? 0) : Number(val);
                            handleScoreChange(pIdx, cIdx, num);
                          }}
                          aria-label={`Điểm cho tiêu chí ${crit.title}`}
                        />

                        <Input
                          placeholder="Nhận xét / Lời góp ý cho tiêu chí này (tùy chọn)..."
                          value={crit.feedback || ""}
                          onChange={(e) => handleFeedbackChange(pIdx, cIdx, e.target.value)}
                          className="text-xs"
                          aria-label={`Nhận xét tiêu chí ${crit.title}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={() => handleSubmitPeerGrade(pIdx)}
                      disabled={isSubmittingGrade[pIdx]}
                      size="sm"
                    >
                      {isSubmittingGrade[pIdx]
                        ? "Đang gửi điểm…"
                        : `Nộp điểm cho Bài làm #${pIdx + 1}`}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═══ Tab 3: Grade Appeal ═══ */}
      {activeTab === "appeal" && (
        <div
          id="peer-tabpanel-appeal"
          role="tabpanel"
          aria-labelledby="peer-tab-appeal"
          className="space-y-5"
        >
          <div className="p-4 rounded-xl bg-accent text-accent-foreground border border-border text-xs leading-relaxed">
            <h4 className="font-bold mb-1 flex items-center gap-1.5">
              <Scale aria-hidden="true" className="w-4 h-4 text-primary" />
              <span>Yêu cầu Phúc khảo &amp; Khiếu nại Điểm số</span>
            </h4>
            <p className="text-muted-foreground">
              Nếu bạn cho rằng kết quả chấm chưa phản ánh đúng nội dung bài làm, bạn có thể gửi đơn
              phúc khảo trong vòng 7 ngày kể từ khi điểm được công bố. Giảng viên / Trợ giảng (TA)
              sẽ trực tiếp rà soát và chấm lại bài làm của bạn.
            </p>
          </div>

          {statusData?.appealStatus ? (
            <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-xs font-bold text-warning">
              Trạng thái đơn phúc khảo hiện tại: {statusData.appealStatus}. Vui lòng chờ Giảng
              viên/Trợ giảng phản hồi.
            </div>
          ) : !statusData?.isGraded ? (
            <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
              Bạn chỉ có thể gửi đơn phúc khảo sau khi bài nộp đã có điểm công bố chính thức.
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                label="Lý do & Căn cứ Phúc khảo / Khiếu nại"
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                rows={4}
                placeholder="Giải thích rõ các điểm số chưa hợp lý để Giảng viên/Trợ giảng xem xét…"
              />

              <Button
                type="button"
                onClick={handleSubmitAppeal}
                disabled={!appealReason.trim() || isSubmittingAppeal || !statusData.canAppeal}
                size="sm"
              >
                {isSubmittingAppeal ? "Đang gửi phúc khảo…" : "Gửi Yêu cầu Phúc khảo"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
