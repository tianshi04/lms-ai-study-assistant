"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Award,
  CheckCircle2,
  FileText,
  UserCheck,
  ShieldCheck,
  RotateCcw,
  Lock,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { useToast } from "@/components/ui/Toast";
import { getSafeExternalUrl } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  useGradingSubmissionDetailQuery,
  useRenewGradingTaskLockMutation,
  useReleaseGradingTaskMutation,
  useSubmitStaffGradingMutation,
} from "@/lib/query_hooks";
import { create } from "@bufbuild/protobuf";
import {
  GradingProvenance,
  GradingQueueStatus,
  RubricCriteriaSchema,
  type RubricCriteria,
} from "@/gen/assessment/v1/assessment_pb";

interface EvaluationModalProps {
  isOpen: boolean;
  submissionId: string;
  onClose: () => void;
  onGradedSuccessfully?: () => void;
}

export function EvaluationModal({
  isOpen,
  submissionId,
  onClose,
  onGradedSuccessfully,
}: EvaluationModalProps) {
  const { toast } = useToast();
  const { userId: currentUserId } = useAuth();

  const {
    data: detail,
    isLoading,
    isError,
  } = useGradingSubmissionDetailQuery(submissionId, {
    enabled: isOpen && !!submissionId,
  });

  const renewLockMutation = useRenewGradingTaskLockMutation();
  const releaseLockMutation = useReleaseGradingTaskMutation();
  const submitGradingMutation = useSubmitStaffGradingMutation();

  // Local form state
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [resolveAppeal, setResolveAppeal] = useState(false);
  const [appealNotes, setAppealNotes] = useState("");

  // Countdown timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null);

  useEffect(() => {
    setCurrentTimeMs(Date.now());
  }, []);

  const isLockActive = useMemo(() => {
    if (!detail?.submission?.lockExpiresAt) return false;
    if (remainingSeconds !== null) return remainingSeconds > 0;
    if (!currentTimeMs) return false;
    const expiresAt = new Date(detail.submission.lockExpiresAt).getTime();
    return expiresAt > currentTimeMs;
  }, [detail?.submission?.lockExpiresAt, remainingSeconds, currentTimeMs]);

  const isLockedByOther = Boolean(
    detail?.submission?.lockedByUserId &&
    detail.submission.lockedByUserId !== currentUserId &&
    isLockActive,
  );

  const isOverdue = Boolean(
    currentTimeMs &&
    !isLockedByOther &&
    !detail?.submission?.lockedByUserId &&
    !detail?.submission?.isAppeal &&
    !detail?.submission?.isOutlier &&
    detail?.submission?.status !== GradingQueueStatus.GRADED &&
    detail?.submission?.submittedAt &&
    currentTimeMs - new Date(detail.submission.submittedAt).getTime() > 48 * 3600 * 1000 &&
    !detail?.submission?.staffScore &&
    (detail?.peerReviews?.length ?? 0) < 3,
  );

  // Sync initial rubric criteria scores and existing staff grading when detail loads
  useEffect(() => {
    if (!detail) return;

    const initialScores: Record<string, number> = {};
    const existingGrading = detail.currentStaffGrading;

    if (existingGrading && existingGrading.gradedCriteria.length > 0) {
      existingGrading.gradedCriteria.forEach((c) => {
        initialScores[c.criteriaId] = c.scoreGiven;
      });
      setFeedback(existingGrading.feedback || "");
      setAppealNotes(existingGrading.appealResolutionNotes || "");
    } else if (detail.rubricCriteria.length > 0) {
      detail.rubricCriteria.forEach((c) => {
        // Default to max score or existing given score
        initialScores[c.criteriaId] = c.scoreGiven > 0 ? c.scoreGiven : c.maxScore;
      });
      setFeedback("");
    }
    setCriteriaScores(initialScores);

    if (detail.submission?.isAppeal) {
      setResolveAppeal(true);
    }
  }, [detail]);

  // Handle lock expiration countdown
  useEffect(() => {
    if (!detail?.submission?.lockExpiresAt) {
      setRemainingSeconds(null);
      return;
    }

    const calculateRemaining = () => {
      const expiresAt = new Date(detail.submission?.lockExpiresAt || "").getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      return diff;
    };

    setRemainingSeconds(calculateRemaining());

    const interval = setInterval(() => {
      const diff = calculateRemaining();
      setRemainingSeconds(diff);
      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [detail?.submission?.lockExpiresAt]);

  // Calculate total score and max total score
  const { currentTotalScore, maxPossibleScore } = useMemo(() => {
    if (!detail?.rubricCriteria) return { currentTotalScore: 0, maxPossibleScore: 100 };
    let current = 0;
    let max = 0;
    detail.rubricCriteria.forEach((c) => {
      current += criteriaScores[c.criteriaId] ?? 0;
      max += c.maxScore;
    });
    return {
      currentTotalScore: Number(current.toFixed(1)),
      maxPossibleScore: max || 100,
    };
  }, [detail?.rubricCriteria, criteriaScores]);

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle renew lock
  const handleRenewLock = async () => {
    try {
      const res = await renewLockMutation.mutateAsync({
        submissionId,
        extendMinutes: 15,
      });
      if (res.remainingSeconds) {
        setRemainingSeconds(res.remainingSeconds);
      }
      toast({
        title: "Đã gia hạn thời gian khóa",
        description: "Khóa chấm bài đã được gia hạn thêm 15 phút.",
        type: "success",
      });
    } catch {
      toast({
        title: "Gia hạn thất bại",
        description: "Không thể gia hạn khóa chấm. Vui lòng kiểm tra lại quyền hạn.",
        type: "error",
      });
    }
  };

  // Handle release task
  const handleReleaseTask = async () => {
    try {
      await releaseLockMutation.mutateAsync({ submissionId });
      toast({
        title: "Đã hủy & nhả bài nộp",
        description: "Bài nộp đã được trả về hàng chờ để trợ giảng khác chấm.",
        type: "default",
      });
      onClose();
    } catch {
      toast({
        title: "Lỗi nhả bài",
        description: "Không thể nhả bài nộp vào lúc này.",
        type: "error",
      });
    }
  };

  // Handle submit grading (Immediate Publishing model)
  const handleSubmitGrading = async () => {
    if (!detail) return;

    const payloadCriteria: RubricCriteria[] = detail.rubricCriteria.map((c) =>
      create(RubricCriteriaSchema, {
        criteriaId: c.criteriaId,
        title: c.title,
        maxScore: c.maxScore,
        scoreGiven: criteriaScores[c.criteriaId] ?? 0,
        feedback: "",
      }),
    );

    try {
      await submitGradingMutation.mutateAsync({
        submissionId,
        gradedCriteria: payloadCriteria,
        totalScore: currentTotalScore,
        feedback: feedback.trim(),
        resolveAppeal: detail.submission?.isAppeal ? resolveAppeal : false,
        appealResolutionNotes: appealNotes.trim(),
        provenance: GradingProvenance.TA,
      });

      toast({
        title: "Đã hoàn tất chấm điểm!",
        description: "Điểm đã được công bố ngay lập tức cho học viên và cập nhật vào Sổ điểm.",
        type: "success",
      });

      if (onGradedSuccessfully) {
        onGradedSuccessfully();
      }
      onClose();
    } catch {
      toast({
        title: "Chấm điểm thất bại",
        description: "Đã có lỗi xảy ra khi lưu kết quả chấm bài. Vui lòng thử lại.",
        type: "error",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content
        size="full"
        className="max-w-6xl w-[95vw] h-[92vh] max-h-[92vh] p-0 flex flex-col rounded-3xl overflow-hidden bg-background border border-border shadow-2xl"
      >
        {/* Modal Top Header Bar */}
        <div className="px-6 py-4 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {detail?.submission?.courseTitle || "Khóa học"}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {detail?.submission?.itemTitle || "Bài tập"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground truncate mt-0.5">
                Bàn làm việc Sư phạm: Chấm bài & Công bố Điểm
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Soft Lock Countdown Timer */}
            {isLockActive && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  isLockedByOther
                    ? "bg-warning/10 text-warning border-warning/30"
                    : remainingSeconds !== null && remainingSeconds <= 300
                      ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse"
                      : remainingSeconds !== null && remainingSeconds <= 600
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {isLockedByOther ? (
                  <Lock className="w-4 h-4 shrink-0 text-warning" aria-hidden="true" />
                ) : (
                  <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {isLockedByOther
                    ? `${detail?.submission?.lockedByName ? `Đang giữ: ${detail.submission.lockedByName}` : "Đang được chấm"}${remainingSeconds !== null ? `: ${formatTime(remainingSeconds)}` : ""}`
                    : remainingSeconds !== null && remainingSeconds > 0
                      ? `Khóa: ${formatTime(remainingSeconds)}`
                      : "Hết hạn khóa"}
                </span>
                {!isLockedByOther &&
                  remainingSeconds !== null &&
                  remainingSeconds > 0 &&
                  remainingSeconds <= 600 && (
                    <Button
                      type="button"
                      variant="tonal"
                      onClick={handleRenewLock}
                      disabled={renewLockMutation.isPending}
                      className="h-6 px-2 text-[10px] font-bold ml-1 rounded-lg"
                    >
                      <RefreshCw
                        className={`w-3 h-3 mr-1 ${renewLockMutation.isPending ? "animate-spin" : ""}`}
                        aria-hidden="true"
                      />
                      +15p
                    </Button>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Main Content - Dual-Pane Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-sm font-medium text-muted-foreground">
                  Đang tải dữ liệu bài làm và thang điểm rubric...
                </p>
              </div>
            </div>
          ) : isError || !detail ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="max-w-md space-y-3">
                <AlertTriangle className="w-10 h-10 text-destructive mx-auto" aria-hidden="true" />
                <h3 className="text-lg font-bold text-foreground">
                  Không thể tải thông tin bài làm
                </h3>
                <p className="text-sm text-muted-foreground">
                  Có thể bài làm đã bị xóa hoặc phiên làm việc đã hết hạn. Vui lòng thử lại.
                </p>
                <Button type="button" variant="outlined" onClick={onClose}>
                  Đóng cửa sổ
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* LEFT PANE: Student Submission Content (60%) */}
              <div className="flex-1 md:w-[60%] overflow-y-auto p-6 md:p-8 space-y-6 border-b md:border-b-0 md:border-r border-border bg-background">
                {/* Student Info Card */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-11 h-11 border border-border">
                      <Avatar.Image
                        src={detail.submission?.studentAvatarUrl || ""}
                        alt={detail.submission?.studentName || "Sinh viên"}
                      />
                      <Avatar.Fallback className="bg-primary/10 text-primary font-bold">
                        {(detail.submission?.studentName || "SV").slice(0, 2).toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-foreground">
                        {detail.submission?.studentName || "Sinh viên ẩn danh"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Nộp lúc:{" "}
                        {detail.submission?.submittedAt
                          ? new Date(detail.submission.submittedAt).toLocaleString("vi-VN")
                          : "Không rõ"}
                        {detail.attemptNumber > 1 && (
                          <span className="ml-2 font-medium text-primary">
                            (Lần nộp thứ {detail.attemptNumber})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLockedByOther ? (
                      <Badge
                        variant="warning"
                        className="font-bold text-xs bg-warning/10 text-warning border-warning/30 gap-1"
                      >
                        <Lock className="w-3 h-3 text-warning" aria-hidden="true" />
                        Đang giữ: {detail.submission?.lockedByName || "Đồng nghiệp"}
                      </Badge>
                    ) : (
                      <>
                        {isOverdue && (
                          <Badge
                            variant="error"
                            className="font-bold text-xs bg-destructive/10 text-destructive border-destructive/20 gap-1"
                          >
                            <Clock className="w-3 h-3 text-destructive" aria-hidden="true" />
                            Quá hạn 48h
                          </Badge>
                        )}
                        {detail.submission?.isAppeal && (
                          <Badge
                            variant="outlined"
                            className="font-bold text-xs bg-tertiary/15 text-tertiary border-tertiary/30"
                          >
                            Khiếu nại điểm
                          </Badge>
                        )}
                        {detail.submission?.isOutlier && (
                          <Badge
                            variant="warning"
                            className="font-bold text-xs bg-warning/10 text-warning border-warning/20"
                          >
                            Điểm lệch chuẩn
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Read-Only Callout (when locked by another staff member) */}
                {isLockedByOther && (
                  <div className="p-4 rounded-2xl bg-warning/10 border border-warning/30 text-warning space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Lock className="w-4 h-4 shrink-0 text-warning" aria-hidden="true" />
                      <span>
                        Bài nộp đang được {detail.submission?.lockedByName || "đồng nghiệp"} tiếp
                        nhận chấm
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                      Bạn đang ở <strong>Chế độ Xem (Chỉ đọc)</strong> để bảo đảm tính toàn vẹn và
                      tránh chấm trùng lặp trong ban giảng dạy. Tất cả các tiêu chí điểm số và nhận
                      xét đã bị khóa cho đến khi người chấm hiện tại hoàn tất hoặc phiên giữ bài kết
                      thúc.
                    </p>
                  </div>
                )}

                {/* Overdue Alert Callout (if overdue > 48h) */}
                {isOverdue && (
                  <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Clock className="w-4 h-4 shrink-0 text-destructive" aria-hidden="true" />
                      <span>Bài nộp quá hạn 48 giờ — Cần can thiệp sư phạm</span>
                    </div>
                    <p className="text-xs text-destructive/90 leading-relaxed pl-6">
                      Bài nộp đã quá 48 giờ nhưng chưa nhận đủ đánh giá từ đồng học. Giảng viên hoặc
                      Trợ giảng vui lòng trực tiếp đánh giá tiêu chí Rubric bên phải và công bố điểm
                      cho học viên.
                    </p>
                  </div>
                )}

                {/* Appeal Reason Callout (if appealed) */}
                {detail.submission?.isAppeal && detail.submission?.appealReason && (
                  <div className="p-4 rounded-2xl bg-tertiary/10 border border-tertiary/30 text-tertiary space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertTriangle
                        className="w-4 h-4 shrink-0 text-tertiary"
                        aria-hidden="true"
                      />
                      <span>Lý do sinh viên khiếu nại phúc khảo:</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                      {detail.submission.appealReason}
                    </p>
                  </div>
                )}

                {/* Submission Text Content */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                      Nội dung bài làm của học viên
                    </h3>
                  </div>

                  <div className="p-5 rounded-2xl bg-card border border-border text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans min-h-[160px] shadow-sm select-text">
                    {detail.textContent ? (
                      detail.textContent
                    ) : (
                      <span className="italic text-muted-foreground">
                        (Học viên không có phần giải trình văn bản trực tiếp)
                      </span>
                    )}
                  </div>
                </div>

                {/* Attached File/URL */}
                {detail.submissionUrl && (
                  <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Tệp đính kèm / Liên kết bài làm:
                        </p>
                        {getSafeExternalUrl(detail.submissionUrl) ? (
                          <a
                            href={getSafeExternalUrl(detail.submissionUrl)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-primary hover:underline truncate block"
                          >
                            {detail.submissionUrl}
                          </a>
                        ) : (
                          <span className="text-xs font-mono text-destructive">
                            Liên kết không an toàn hoặc không hợp lệ ({detail.submissionUrl})
                          </span>
                        )}
                      </div>
                    </div>
                    {getSafeExternalUrl(detail.submissionUrl) && (
                      <Button
                        type="button"
                        variant="outlined"
                        className="shrink-0 text-xs font-bold"
                        onClick={() => {
                          const safe = getSafeExternalUrl(detail.submissionUrl);
                          if (safe) window.open(safe, "_blank", "noopener,noreferrer");
                        }}
                      >
                        Mở liên kết
                      </Button>
                    )}
                  </div>
                )}

                {/* Peer Review History (if any) */}
                {detail.peerReviews && detail.peerReviews.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      Lịch sử Đánh giá Ngang hàng ({detail.peerReviews.length} lượt đánh giá)
                    </h3>
                    <div className="space-y-3">
                      {detail.peerReviews.map((peer, idx) => (
                        <div
                          key={peer.reviewId || idx}
                          className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">
                              {peer.reviewerName || `Người đánh giá #${idx + 1}`}
                            </span>
                            <span className="font-extrabold text-primary text-sm">
                              {peer.totalScore.toFixed(1)} điểm
                            </span>
                          </div>
                          {peer.feedback && (
                            <p className="text-muted-foreground italic bg-background/50 p-2.5 rounded-xl border border-border/50">
                              &ldquo;{peer.feedback}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANE: Rubric Grading Workbench (40%) */}
              <div className="flex-1 md:w-[40%] flex flex-col justify-between overflow-y-auto p-6 md:p-8 bg-card border-l border-border space-y-6">
                <div className="space-y-6">
                  {/* Score Overview Banner */}
                  <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        {isLockedByOther ? "Điểm dự thảo / Xem bài" : "Tổng điểm đạt được"}
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-3xl font-extrabold text-foreground">
                          {currentTotalScore}
                        </span>
                        <span className="text-sm font-bold text-muted-foreground">
                          / {maxPossibleScore}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {isLockedByOther ? (
                        <Badge
                          variant="warning"
                          className="text-xs font-semibold bg-warning/10 text-warning border-warning/30 gap-1"
                        >
                          <Lock className="w-3 h-3 text-warning" aria-hidden="true" />
                          Chế độ Chỉ đọc
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="primary" className="font-mono text-xs">
                            {((currentTotalScore / (maxPossibleScore || 1)) * 100).toFixed(0)}%
                          </Badge>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {currentTotalScore >= maxPossibleScore * 0.8
                              ? "Xuất sắc"
                              : currentTotalScore >= maxPossibleScore * 0.65
                                ? "Đạt yêu cầu"
                                : "Cần cải thiện"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rubric Criteria List */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                      Tiêu chí Rubric đánh giá
                    </h3>

                    {detail.rubricCriteria.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Bài tập này không cấu hình tiêu chí rubric riêng.
                      </p>
                    ) : (
                      detail.rubricCriteria.map((c) => {
                        const currentScore = criteriaScores[c.criteriaId] ?? 0;
                        return (
                          <div
                            key={c.criteriaId}
                            className="p-4 rounded-2xl bg-background border border-border space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-foreground">{c.title}</h4>
                                {c.description && (
                                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                                    {c.description}
                                  </p>
                                )}
                                <span className="text-[11px] text-muted-foreground">
                                  Tối đa: {c.maxScore} điểm
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Input
                                  type="number"
                                  min={0}
                                  max={c.maxScore}
                                  step={0.5}
                                  value={currentScore}
                                  disabled={isLockedByOther}
                                  onChange={(e) => {
                                    if (isLockedByOther) return;
                                    const val = Math.max(
                                      0,
                                      Math.min(c.maxScore, Number(e.target.value) || 0),
                                    );
                                    setCriteriaScores((prev) => ({
                                      ...prev,
                                      [c.criteriaId]: val,
                                    }));
                                  }}
                                  className={`w-16 h-8 text-center text-xs font-bold ${
                                    isLockedByOther
                                      ? "bg-muted text-muted-foreground cursor-not-allowed opacity-80"
                                      : ""
                                  }`}
                                />
                                <span className="text-xs text-muted-foreground font-medium">
                                  /{c.maxScore}
                                </span>
                              </div>
                            </div>

                            {/* Slider control */}
                            <Slider
                              min={0}
                              max={c.maxScore}
                              step={0.5}
                              value={[currentScore]}
                              disabled={isLockedByOther}
                              onValueChange={(vals) => {
                                if (isLockedByOther) return;
                                const val = Array.isArray(vals) ? (vals[0] ?? 0) : Number(vals);
                                setCriteriaScores((prev) => ({
                                  ...prev,
                                  [c.criteriaId]: val,
                                }));
                              }}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Pedagogical Feedback */}
                  <div className="space-y-2">
                    <label
                      htmlFor="pedagogical-feedback-input"
                      className="text-sm font-bold text-foreground block cursor-pointer"
                    >
                      Nhận xét sư phạm cho sinh viên
                    </label>
                    <Textarea
                      id="pedagogical-feedback-input"
                      rows={4}
                      placeholder={
                        isLockedByOther
                          ? "Bài nộp đang được đồng nghiệp tiếp nhận chấm (Chế độ chỉ đọc)..."
                          : "Ghi nhận ưu điểm và hướng dẫn chi tiết những điểm cần cải thiện..."
                      }
                      value={feedback}
                      disabled={isLockedByOther}
                      onChange={(e) => setFeedback(e.target.value)}
                      className={`text-xs ${
                        isLockedByOther
                          ? "bg-muted text-muted-foreground cursor-not-allowed opacity-80"
                          : ""
                      }`}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {isLockedByOther
                        ? "Bạn chỉ có thể xem nội dung nhận xét này, không thể sửa đổi."
                        : "Nhận xét này sẽ hiển thị ngay cho sinh viên cùng với điểm số đã công bố."}
                    </p>
                  </div>

                  {/* Appeal Resolution (if applicable) */}
                  {detail.submission?.isAppeal && (
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="resolve-appeal"
                          checked={resolveAppeal}
                          disabled={isLockedByOther}
                          onChange={(e) => setResolveAppeal(e.target.checked)}
                          className="rounded border-input text-primary focus:ring-primary h-4 w-4 disabled:opacity-50"
                        />
                        <label
                          htmlFor="resolve-appeal"
                          className="text-xs font-bold text-foreground cursor-pointer"
                        >
                          Xác nhận đã giải quyết xong khiếu nại này
                        </label>
                      </div>
                      <Input
                        placeholder={
                          isLockedByOther
                            ? "Ghi chú phản hồi khiếu nại (Chế độ chỉ đọc)..."
                            : "Ghi chú phản hồi khiếu nại cho học viên..."
                        }
                        value={appealNotes}
                        disabled={isLockedByOther}
                        onChange={(e) => setAppealNotes(e.target.value)}
                        className={`text-xs ${
                          isLockedByOther
                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-80"
                            : ""
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  {/* Only lock owner can release lock */}
                  {!isLockedByOther && detail?.submission?.lockedByUserId ? (
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleReleaseTask}
                      disabled={releaseLockMutation.isPending || submitGradingMutation.isPending}
                      className="w-full sm:w-auto text-xs font-bold border-border text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      Hủy & Nhả bài
                    </Button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="text"
                      onClick={onClose}
                      disabled={submitGradingMutation.isPending}
                      className="w-full sm:w-auto text-xs font-bold"
                    >
                      Đóng
                    </Button>
                    {isLockedByOther ? (
                      <Button
                        type="button"
                        variant="outlined"
                        disabled
                        className="w-full sm:w-auto text-xs font-semibold bg-muted text-muted-foreground border-border cursor-not-allowed gap-1.5 opacity-80"
                      >
                        <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          Đang khóa bởi {detail?.submission?.lockedByName || "đồng nghiệp"}
                        </span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleSubmitGrading}
                        disabled={submitGradingMutation.isPending}
                        className="w-full sm:w-auto text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/20"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
                        {submitGradingMutation.isPending
                          ? "Đang công bố..."
                          : "Chấm & Công bố Điểm Ngay"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Dialog.Content>
    </Dialog>
  );
}
