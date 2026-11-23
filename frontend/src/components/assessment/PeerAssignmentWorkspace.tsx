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
  Send,
  ExternalLink,
  Users,
  BookOpen,
  FileText,
  HelpCircle,
  Clock,
  Award,
  MessageSquare,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { mapConnectError } from "@/lib/connect_error_mapper";
import { renderMarkdown } from "@/components/ai/AIChatMarkdownRenderer";
import { getSafeExternalUrl } from "@/lib/utils";

const MAX_PEER_SUBMISSION_ATTEMPTS = 3;
const DEFAULT_REQUIRED_PEER_REVIEWS = 3;
const MIN_PEER_SUBMISSION_TEXT_LENGTH = 10;
const MIN_PEER_REVIEW_FEEDBACK_LENGTH = 10;
const MAX_APPEAL_WINDOW_DAYS = 7;

interface AppealStatusInfo {
  label: string;
  variant: "warning" | "success";
  description: string;
  isResolved: boolean;
}

function getAppealStatusInfo(status?: string): AppealStatusInfo {
  const normalized = (status || "").toUpperCase();
  if (normalized === "RESOLVED") {
    return {
      label: "Đã giải quyết",
      variant: "success",
      description: "Đơn phúc khảo đã được giải quyết xong. Điểm số chính thức đã được cập nhật.",
      isResolved: true,
    };
  }
  return {
    label: "Đang chờ xem xét",
    variant: "warning",
    description:
      "Đơn phúc khảo của bạn đã được gửi thành công. Vui lòng chờ Giảng viên / Trợ giảng thẩm định lại bài làm và phản hồi kết quả.",
    isResolved: false,
  };
}

interface PeerAssignmentWorkspaceProps {
  itemId: string;
  title?: string;
  userId?: string;
  instructionsMarkdown?: string;
  rubricCriteriaJson?: string;
  essayGradingMode?: EssayGradingMode;
  requiredPeerReviews?: number;
  essayMaxAttempts?: number;
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
  essayMaxAttempts: propMaxAttempts,
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
        : DEFAULT_REQUIRED_PEER_REVIEWS);
  const attemptNumber = statusData?.attemptNumber ?? 0;
  const maxAttempts =
    statusData?.maxAttempts && statusData.maxAttempts > 0
      ? statusData.maxAttempts
      : propMaxAttempts && propMaxAttempts > 0
        ? propMaxAttempts
        : MAX_PEER_SUBMISSION_ATTEMPTS;
  const maxAttemptsReached = attemptNumber >= maxAttempts;
  const scoreLockedByDuty =
    !isInstructorOnly &&
    dutyStatus !== "COMPLETED" &&
    dutyStatus !== "WAIVED_EMPTY_POOL" &&
    dutyStatus !== "NOT_APPLICABLE";

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
      const msg = mapConnectError(err, "Không thể tải danh sách bài bạn học để chấm.");
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
    const trimmedUrl = displayedSubmissionUrl.trim();
    const trimmedText = displayedTextContent.trim();
    if (!trimmedUrl && !trimmedText) {
      toast.error("Vui lòng cung cấp liên kết bài làm hoặc nội dung bài tự luận.");
      return;
    }
    if (trimmedUrl && !getSafeExternalUrl(trimmedUrl)) {
      toast.error("Liên kết nộp bài phải là URL đầy đủ bắt đầu bằng http:// hoặc https://.");
      return;
    }
    if (!trimmedUrl && trimmedText.length < MIN_PEER_SUBMISSION_TEXT_LENGTH) {
      toast.error(
        `Nội dung bài tự luận phải có ít nhất ${MIN_PEER_SUBMISSION_TEXT_LENGTH} ký tự khi không đính kèm liên kết.`,
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitPeerAssignment({
        itemId,
        submissionUrl: trimmedUrl,
        textContent: trimmedText,
      });

      setDraftSubmissionUrl(null);
      setDraftTextContent(null);
      await refreshStatus();

      toast.success(res.statusMessage || "Nộp bài tự luận thành công!");
      if (!isInstructorOnly) {
        setActiveTab("grade");
        void fetchReviews();
      }
    } catch (err) {
      const msg = mapConnectError(err, "Nộp bài tự luận thất bại. Vui lòng thử lại.");
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabClick = (tab: "submit" | "grade" | "appeal") => {
    if (tab === "grade" && isInstructorOnly) return;
    if ((tab === "grade" || tab === "appeal") && !hasSubmitted) {
      toast.error(
        isInstructorOnly
          ? "Vui lòng nộp bài ở Bước 1 trước khi xem hoặc gửi yêu cầu phúc khảo điểm."
          : "Bạn cần nộp bài ở Bước 1 trước khi mở khóa phần chấm bài của bạn học.",
      );
      return;
    }
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
    const combinedFeedback = item.rubricCriteria
      .map((c) => (c.feedback || "").trim())
      .filter(Boolean)
      .join(" ");
    if (combinedFeedback.length < MIN_PEER_REVIEW_FEEDBACK_LENGTH) {
      toast.error(
        `Vui lòng nhập nhận xét chi tiết cho bạn học (tối thiểu ${MIN_PEER_REVIEW_FEEDBACK_LENGTH} ký tự).`,
      );
      return;
    }
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
          feedback: (c.feedback || "").trim(),
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
      const appealInfo = getAppealStatusInfo(res.appealStatus);
      toast.success(`Đã gửi yêu cầu phúc khảo thành công (${appealInfo.label}).`);
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
    if (source === "TA") return "Trợ giảng chấm";
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="primary" size="pill" className="gap-1.5">
              {isInstructorOnly ? (
                <Award className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>BÀI TẬP TỰ LUẬN</span>
            </Badge>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
                  <span className="text-sm font-bold text-foreground">
                    Trạng thái Bài nộp (Lần #{attemptNumber})
                  </span>
                  <Badge variant={statusData.isGraded ? "success" : "muted"} size="sm">
                    {statusData.isGraded ? "Đã có điểm" : "Đang chờ chấm"}
                  </Badge>
                </div>

                {statusData.isGraded && !scoreLockedByDuty ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outlined" size="sm">
                      {renderGradeSourceLabel(statusData.gradeSource)}
                    </Badge>
                    <span className="text-lg font-extrabold font-mono text-primary">
                      {statusData.finalScore.toFixed(1)} / 100
                    </span>
                  </div>
                ) : !scoreLockedByDuty && statusData.bestPublishedScore > 0 ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Điểm cao nhất đã ghi nhận:</span>
                    <span className="font-mono font-bold text-primary">
                      {statusData.bestPublishedScore.toFixed(1)} / 100
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Staff Feedback (hidden until peer review duty completes) */}
              {!scoreLockedByDuty && statusData.staffFeedback && (
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-border space-y-1">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    <span>Nhận xét từ Giảng viên / Trợ giảng:</span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {statusData.staffFeedback}
                  </p>
                </div>
              )}

              {/* Anonymous Peer Feedbacks (hidden until peer review duty completes) */}
              {!scoreLockedByDuty &&
                !isInstructorOnly &&
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
                          className="p-3.5 rounded-xl bg-surface-container-low border border-border/80 space-y-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <div>
                              <span className="text-foreground">{fb.feedbackLabel}</span>
                              {fb.submittedAt && (
                                <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
                                  {new Date(fb.submittedAt).toLocaleDateString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-primary px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-xs shrink-0">
                              {fb.totalScore.toFixed(1)} / 100 điểm
                            </span>
                          </div>
                          {fb.gradedCriteria && fb.gradedCriteria.length > 0 && (
                            <div className="space-y-1.5 pt-1.5 border-t border-border/60">
                              {fb.gradedCriteria.map((c) => (
                                <div
                                  key={c.criteriaId}
                                  className="space-y-1 p-2 rounded-lg bg-surface-container-lowest/60 border border-border/50"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-foreground font-medium">{c.title}</span>
                                    <span className="font-mono font-bold text-primary px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20 text-[10px] shrink-0">
                                      {c.scoreGiven} / {c.maxScore}
                                    </span>
                                  </div>
                                  {c.feedback && (
                                    <p className="text-[11px] italic text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/40 mt-0.5">
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
                    Bài làm của bạn đã được gửi tới Giảng viên / Trợ giảng. Điểm số và nhận xét sẽ
                    hiển thị tại đây ngay sau khi chấm xong.
                  </span>
                </p>
              )}

              {!isInstructorOnly && dutyStatus === "WAITING_POOL" && statusData.isGraded && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>
                    Bài của bạn đã có điểm. Điểm chi tiết sẽ hiển thị sau khi hoàn tất chấm bài bạn
                    học hoặc hết thời gian chờ.
                  </span>
                </p>
              )}

              {!isInstructorOnly && dutyStatus === "PENDING" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
                  <span>
                    {statusData.isGraded
                      ? `Bài của bạn đã có điểm. Hãy hoàn thành chấm thêm ${Math.max(1, targetReviews - completedReviews)} bài của bạn học ở mục 2. Chấm bài bạn học để xem điểm.`
                      : `Vui lòng chấm ${Math.max(1, targetReviews - completedReviews)} bài làm của bạn học ở mục 2. Chấm bài bạn học để hoàn tất phần đánh giá.`}
                  </span>
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
                <span>Tiêu chí đánh giá tham khảo</span>
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
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Đang nộp…</span>
                  </>
                ) : (
                  <>
                    <Send aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>
                      {hasSubmitted
                        ? `Nộp lại Bài tập Tự luận (Lần ${attemptNumber + 1}/${maxAttempts})`
                        : "Nộp Bài tập Tự luận"}
                    </span>
                  </>
                )}
              </Button>
              {maxAttemptsReached ? (
                <span className="text-xs text-muted-foreground font-medium">
                  {maxAttempts <= 1
                    ? "Bạn đã hoàn thành lượt nộp duy nhất cho bài học này (bài tập không cho phép nộp lại)."
                    : `Bạn đã sử dụng tối đa ${attemptNumber}/${maxAttempts} lượt nộp bài (${maxAttempts - 1} lượt nộp lại) cho học phần này.`}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {maxAttempts <= 1
                    ? "Bài tập không cho phép nộp lại (chỉ nộp 1 lần)."
                    : hasSubmitted
                      ? `Còn lại ${maxAttempts - attemptNumber} lượt nộp lại.`
                      : `Cho phép nộp lại tối đa ${maxAttempts - 1} lần.`}
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
          <div className="space-y-4">
            {isLoadingReviews ? (
              <div className="p-8 rounded-2xl border border-border bg-card text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" aria-hidden="true" />
                <p className="text-xs text-muted-foreground font-semibold">
                  Đang tải bài làm của bạn học để bạn chấm…
                </p>
              </div>
            ) : peerItems.length === 0 && dutyStatus === "COMPLETED" ? (
              <div className="p-8 rounded-2xl border border-border bg-card text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto" aria-hidden="true" />
                <h4 className="font-bold text-sm text-foreground">
                  Đã hoàn tất chấm bài bạn học ({completedReviews}/{targetReviews} bài)
                </h4>
              </div>
            ) : peerItems.length === 0 && dutyStatus === "WAIVED_EMPTY_POOL" ? (
              <div className="p-8 rounded-2xl border border-border bg-card text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto" aria-hidden="true" />
                <p className="text-xs font-medium text-muted-foreground max-w-md mx-auto">
                  {statusData?.reviewDutyWaivedReason ||
                    "Hiện không còn bài làm nào khác để chấm. Bạn được miễn phần chấm bài bạn học."}
                </p>
              </div>
            ) : peerItems.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-border bg-card text-center space-y-3">
                <Users className="w-8 h-8 text-muted-foreground mx-auto" aria-hidden="true" />
                <h4 className="font-bold text-sm text-foreground">
                  Hiện chưa có bài làm mới để chấm
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Chưa có thêm bài nộp mới nào của bạn học khác. Khi có bài mới, hệ thống sẽ hiển
                  thị tại đây để bạn chấm.
                </p>
                <Button
                  type="button"
                  variant="outlined"
                  size="xs"
                  onClick={() => void fetchReviews()}
                  className="mt-2"
                >
                  Tải lại danh sách
                </Button>
              </div>
            ) : (
              peerItems.map((peer, pIdx) => (
                <div
                  key={peer.reviewId}
                  className="p-5 rounded-2xl border border-border/80 bg-surface-container-low/30 space-y-4"
                >
                  <div className="flex items-center justify-between">
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
                      Chấm điểm theo từng tiêu chí:
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
                          placeholder="Góp ý cụ thể về tiêu chí này..."
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
          {statusData?.appealStatus ? (
            (() => {
              const appealInfo = getAppealStatusInfo(statusData.appealStatus);
              return (
                <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    {appealInfo.isResolved ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
                    ) : (
                      <Clock className="w-4 h-4 text-warning shrink-0" aria-hidden="true" />
                    )}
                    <span className="text-xs font-semibold text-foreground">
                      Trạng thái đơn phúc khảo:
                    </span>
                    <Badge variant={appealInfo.variant} size="sm">
                      {appealInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {appealInfo.description}
                  </p>
                  {appealInfo.isResolved && statusData.staffFeedback && (
                    <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-1">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                        <span>Nhận xét từ Giảng viên / Trợ giảng:</span>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {statusData.staffFeedback}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()
          ) : scoreLockedByDuty ? (
            <p className="text-xs text-muted-foreground">
              Vui lòng hoàn thành chấm bài bạn học ở mục 2 để xem điểm trước khi gửi yêu cầu phúc
              khảo.
            </p>
          ) : statusData?.isGraded && !statusData.canAppeal ? (
            <p className="text-xs text-muted-foreground">
              Đã quá thời hạn {MAX_APPEAL_WINDOW_DAYS} ngày gửi đơn phúc khảo kể từ khi điểm được
              công bố.
            </p>
          ) : statusData?.isGraded ? (
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
          ) : (
            <p className="text-xs text-muted-foreground">
              Bạn chỉ có thể gửi đơn phúc khảo sau khi bài nộp đã có điểm chính thức.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
