"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Clock,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  FileText,
  UserCheck,
  ShieldCheck,
  RotateCcw,
  Lock,
  BookOpen,
  MessageSquare,
  X,
  Eye,
  PenLine,
  Sparkles,
} from "lucide-react";
import { renderMarkdown } from "@/components/ai/AIChatMarkdownRenderer";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Textarea } from "@/components/ui/Textarea";
import { Slider } from "@/components/ui/Slider";
import { useToast } from "@/components/ui/Toast";
import { getSafeExternalUrl } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  useGradingSubmissionDetailQuery,
  useClaimGradingTaskMutation,
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
  initialMode?: "view" | "grade";
  onClose: () => void;
  onGradedSuccessfully?: () => void;
  onTaskClaimed?: () => void;
  onTaskReleased?: () => void;
}

export function EvaluationModal({
  isOpen,
  submissionId,
  initialMode = "grade",
  onClose,
  onGradedSuccessfully,
  onTaskClaimed,
  onTaskReleased,
}: EvaluationModalProps) {
  const { toast } = useToast();
  const { userId: currentUserId } = useAuth();
  const [mode, setMode] = useState<"view" | "grade">(initialMode);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const {
    data: detail,
    isLoading,
    isError,
  } = useGradingSubmissionDetailQuery(submissionId, {
    enabled: isOpen && !!submissionId,
  });

  const claimTaskMutation = useClaimGradingTaskMutation();
  const renewLockMutation = useRenewGradingTaskLockMutation();
  const releaseLockMutation = useReleaseGradingTaskMutation();
  const submitGradingMutation = useSubmitStaffGradingMutation();

  // Local form state
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");

  // Countdown timer state & active lock expiry tracking
  const [activeLockExpiresAt, setActiveLockExpiresAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null);
  const hasExpiredRef = useRef(false);
  const lastInitializedKeyRef = useRef<string>("");

  useEffect(() => {
    setCurrentTimeMs(Date.now());
  }, []);

  // Sync activeLockExpiresAt when detail loads
  useEffect(() => {
    if (detail?.submission?.lockExpiresAt) {
      setActiveLockExpiresAt(detail.submission.lockExpiresAt);
      hasExpiredRef.current = false;
    }
  }, [detail?.submission?.lockExpiresAt]);

  const isLockActive = useMemo(() => {
    if (!activeLockExpiresAt) return false;
    if (remainingSeconds !== null) return remainingSeconds > 0;
    if (!currentTimeMs) return false;
    const expiresAt = new Date(activeLockExpiresAt).getTime();
    return expiresAt > currentTimeMs;
  }, [activeLockExpiresAt, remainingSeconds, currentTimeMs]);

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

  const staffGradingsList = useMemo(() => {
    if (!detail) return [];
    const list =
      detail.staffGradings && detail.staffGradings.length > 0
        ? [...detail.staffGradings]
        : detail.currentStaffGrading
          ? [detail.currentStaffGrading]
          : [];
    return list.sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime());
  }, [detail]);

  // Sync initial rubric criteria scores and existing staff grading when detail loads
  useEffect(() => {
    if (!isOpen) {
      lastInitializedKeyRef.current = "";
      return;
    }
    if (!detail) return;

    const currentKey = `${detail.submission?.submissionId || submissionId}_${mode}`;
    if (lastInitializedKeyRef.current === currentKey) {
      return;
    }
    lastInitializedKeyRef.current = currentKey;

    const initialScores: Record<string, number> = {};
    const existingGrading = detail.currentStaffGrading;

    if (existingGrading && existingGrading.gradedCriteria.length > 0) {
      existingGrading.gradedCriteria.forEach((c) => {
        initialScores[c.criteriaId] = c.scoreGiven;
      });
      setFeedback(existingGrading.feedback || "");
    } else {
      // Default to 0 points for all criteria and empty feedback
      if (detail.rubricCriteria.length > 0) {
        detail.rubricCriteria.forEach((c) => {
          initialScores[c.criteriaId] = 0;
        });
      }
      setFeedback("");
    }
    setCriteriaScores(initialScores);
  }, [detail, mode, isOpen, submissionId]);

  // Handle lock expiration countdown and auto-release on timeout
  useEffect(() => {
    if (!activeLockExpiresAt) {
      setRemainingSeconds(null);
      return;
    }

    const calculateRemaining = () => {
      const expiresAt = new Date(activeLockExpiresAt).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((expiresAt - now) / 1000));
    };

    const initialDiff = calculateRemaining();
    setRemainingSeconds(initialDiff);

    // If already expired on initial check
    if (initialDiff <= 0) {
      if (!isLockedByOther && !hasExpiredRef.current && detail?.submission?.lockedByUserId) {
        hasExpiredRef.current = true;
        releaseLockMutation.mutate(
          { submissionId },
          {
            onSettled: () => {
              toast({
                title: "Hết thời gian giữ bài",
                description:
                  "Thời gian giữ bài chấm (30 phút) đã kết thúc. Bài nộp đã được tự động nhả về hàng chờ.",
                type: "warning",
              });
              onClose();
            },
          },
        );
      }
      return;
    }

    const interval = setInterval(() => {
      const diff = calculateRemaining();
      setRemainingSeconds(diff);
      if (diff <= 0) {
        clearInterval(interval);
        if (!isLockedByOther && !hasExpiredRef.current && detail?.submission?.lockedByUserId) {
          hasExpiredRef.current = true;
          releaseLockMutation.mutate(
            { submissionId },
            {
              onSettled: () => {
                toast({
                  title: "Hết thời gian giữ bài",
                  description:
                    "Thời gian giữ bài chấm (30 phút) đã kết thúc. Bài nộp đã được tự động nhả về hàng chờ.",
                  type: "warning",
                });
                onClose();
              },
            },
          );
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    activeLockExpiresAt,
    isLockedByOther,
    submissionId,
    detail?.submission?.lockedByUserId,
    onClose,
    releaseLockMutation,
    toast,
  ]);

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

  // Handle renew lock (+15 minutes)
  const handleRenewLock = async () => {
    try {
      const res = await renewLockMutation.mutateAsync({
        submissionId,
        extendMinutes: 15,
      });
      if (res.lockExpiresAt) {
        setActiveLockExpiresAt(res.lockExpiresAt);
      }
      if (res.remainingSeconds) {
        setRemainingSeconds(res.remainingSeconds);
      }
      hasExpiredRef.current = false;
      toast({
        title: "Đã đặt lại thời gian giữ bài",
        description: "Thời gian chấm bài đã được đặt lại 15 phút.",
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

  // Handle release task (Explicit "Hủy giữ bài" button)
  const handleReleaseTask = async () => {
    try {
      await releaseLockMutation.mutateAsync({ submissionId });
      toast({
        title: "Đã hủy giữ bài",
        description: "Bài nộp đã được trả về hàng chờ chấm chung.",
        type: "default",
      });
      onTaskReleased?.();
      onClose();
    } catch {
      toast({
        title: "Lỗi hủy giữ bài",
        description: "Không thể hủy giữ bài vào lúc này.",
        type: "error",
      });
    }
  };

  // Switch to grading mode from view mode
  const handleSwitchToGrading = async () => {
    try {
      if (
        !isLockedByOther &&
        (!detail?.submission?.lockedByUserId || detail.submission.lockedByUserId !== currentUserId)
      ) {
        const res = await claimTaskMutation.mutateAsync({ submissionId });
        if (res.lockExpiresAt) {
          setActiveLockExpiresAt(res.lockExpiresAt);
          hasExpiredRef.current = false;
        }
      }
      setMode("grade");
      onTaskClaimed?.();
      toast({
        title: "Đã tiếp nhận bài nộp",
        description: "Bạn đang giữ bài làm này trong 30 phút để chấm điểm.",
        type: "success",
      });
    } catch {
      toast({
        title: "Không thể tiếp nhận bài nộp",
        description: "Bài nộp này có thể đang được nhân sự khác xử lý. Vui lòng thử lại sau.",
        type: "error",
      });
    }
  };

  // Close modal without releasing lock (keep lock so teacher can resume)
  const handleClose = () => {
    onClose();
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

    const normalizedTotalScore =
      maxPossibleScore > 0
        ? Number(((currentTotalScore / maxPossibleScore) * 100.0).toFixed(2))
        : 0;

    try {
      await submitGradingMutation.mutateAsync({
        submissionId,
        gradedCriteria: payloadCriteria,
        totalScore: normalizedTotalScore,
        feedback: feedback.trim(),
        resolveAppeal: Boolean(detail.submission?.isAppeal),
        appealResolutionNotes: feedback.trim(),
        provenance: GradingProvenance.INSTRUCTOR,
      });

      toast({
        title: "Đã hoàn tất chấm điểm!",
        description:
          "Điểm đã được công bố ngay lập tức cho học viên và cập nhật vào hồ sơ học tập.",
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Content
        size="full"
        className="max-w-6xl w-[95vw] h-[92vh] max-h-[92vh] p-0 flex flex-col rounded-3xl overflow-hidden bg-background border border-border shadow-2xl"
      >
        {/* Modal Top Header Bar */}
        <div className="px-6 py-4 border-b border-border bg-card/95 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
              <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground">
                  Bài giảng:{" "}
                  <span className="font-bold text-foreground">
                    {detail?.submission?.courseTitle || "Khóa học"}
                  </span>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-foreground leading-snug">
                {detail?.submission?.itemTitle || "Chi tiết bài nộp"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* View Mode indicator OR Soft Lock Countdown Timer & Renew Action */}
            {mode === "view" ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted text-muted-foreground border border-border">
                  <Eye className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>Chế độ xem (Không giữ bài)</span>
                </div>
                {!isLockedByOther && (
                  <Button
                    type="button"
                    variant="tonal"
                    onClick={handleSwitchToGrading}
                    disabled={claimTaskMutation.isPending}
                    className="h-8 px-3 text-xs font-bold rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shrink-0"
                  >
                    <PenLine className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Chuyển sang Chấm bài
                  </Button>
                )}
              </div>
            ) : isLockActive ? (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  isLockedByOther
                    ? "bg-warning/10 text-warning border-warning/30"
                    : remainingSeconds !== null && remainingSeconds <= 120
                      ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse"
                      : remainingSeconds !== null && remainingSeconds <= 300
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-muted text-foreground border-border"
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
                      ? `Thời gian giữ bài: ${formatTime(remainingSeconds)}`
                      : "Hết hạn giữ bài"}
                </span>

                {/* Button to extend grading time (+15 mins) - Always visible when current user holds lock */}
                {!isLockedByOther && remainingSeconds !== null && remainingSeconds > 0 && (
                  <Button
                    type="button"
                    variant="tonal"
                    onClick={handleRenewLock}
                    disabled={renewLockMutation.isPending}
                    title="Đặt lại 15 phút thời gian chấm bài"
                    className="h-6 px-2.5 text-[11px] font-bold ml-1 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 shrink-0"
                  >
                    <RefreshCw
                      className={`w-3 h-3 mr-1 ${renewLockMutation.isPending ? "animate-spin" : ""}`}
                      aria-hidden="true"
                    />
                    Đặt lại 15p
                  </Button>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng cửa sổ"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Modal Main Content - Dual-Pane Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-sm font-medium text-muted-foreground">
                  Đang tải dữ liệu bài làm và thang điểm tiêu chí...
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
                <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      src={detail.submission?.studentAvatarUrl || ""}
                      name={detail.submission?.studentName || "Học viên"}
                      className="w-12 h-12 border border-border shadow-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground text-base truncate">
                          {detail.submission?.studentName || "Học viên"}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Học viên
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <Clock
                          className="w-3.5 h-3.5 text-muted-foreground shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          Nộp lúc:{" "}
                          {detail.submission?.submittedAt
                            ? new Date(detail.submission.submittedAt).toLocaleString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "Không rõ"}
                        </span>
                        {detail.attemptNumber > 1 && (
                          <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full text-[11px]">
                            Lần nộp thứ {detail.attemptNumber}
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
                            Quá hạn 48h ({detail.peerReviews?.length ?? 0}/3 bạn học)
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
                  <div className="p-4 rounded-2xl bg-warning/10 border-l-4 border-l-warning border-y border-r border-warning/20 text-warning space-y-1">
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
                  <div className="p-4 rounded-2xl bg-destructive/10 border-l-4 border-l-destructive border-y border-r border-destructive/20 text-destructive space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Clock className="w-4 h-4 shrink-0 text-destructive" aria-hidden="true" />
                      <span>Bài nộp quá hạn 48 giờ — Cần can thiệp chấm bài</span>
                    </div>
                    <p className="text-xs text-destructive/90 leading-relaxed pl-6">
                      Bài nộp đã quá 48 giờ nhưng chưa nhận đủ đánh giá từ đồng học. Giảng viên hoặc
                      Trợ giảng vui lòng trực tiếp đánh giá các tiêu chí bên phải và lưu điểm cho
                      học viên.
                    </p>
                  </div>
                )}

                {/* Appeal Reason Callout (if appealed) */}
                {detail.submission?.isAppeal && detail.submission?.appealReason && (
                  <div className="p-4 rounded-2xl bg-tertiary/10 border-l-4 border-l-tertiary border-y border-r border-tertiary/30 text-tertiary space-y-1">
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

                {/* Outlier Alert Callout (if outlier) */}
                {detail.submission?.isOutlier && (
                  <div className="p-4 rounded-2xl bg-warning/10 border-l-4 border-l-warning border-y border-r border-warning/20 text-warning space-y-1">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-warning" aria-hidden="true" />
                      <span>Phát hiện điểm đánh giá lệch chuẩn (Outlier Alert)</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                      Bài làm này có độ chênh lệch điểm số giữa các bạn học vượt quá ngưỡng cho phép
                      (&gt; 20%). Giảng viên hoặc Trợ giảng vui lòng xem xét kỹ nội dung bài làm và
                      lịch sử chấm điểm và đánh giá của học viên bên dưới để chấm điểm chuẩn xác,
                      bảo đảm tính công bằng.
                    </p>
                  </div>
                )}

                {/* Assignment Prompt / Đề bài */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                  <div className="px-5 py-3.5 bg-muted/40 border-b border-border flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-foreground">Đề bài</h3>
                  </div>
                  <div className="p-5 text-sm leading-relaxed text-foreground select-text">
                    {detail.assignmentPrompt ? (
                      <div className="space-y-3 leading-relaxed">
                        {renderMarkdown(detail.assignmentPrompt)}
                      </div>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        (Không tìm thấy nội dung mô tả đề bài cho bài tập này)
                      </p>
                    )}
                  </div>
                </div>

                {/* Submission Text Content */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                  <div className="px-5 py-3.5 bg-card border-b border-border flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-foreground">
                      Nội dung bài làm của học viên
                    </h3>
                  </div>
                  <div className="p-6 text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans min-h-[160px] select-text">
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

                {/* Staff Evaluations History Section */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                  <div className="px-5 py-3.5 bg-muted/40 border-b border-border flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-foreground">
                      Lịch sử chấm điểm và đánh giá của giảng viên
                    </h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {staffGradingsList.length === 0 ? (
                      <div className="p-5 rounded-xl bg-muted/20 border border-dashed border-border/80 text-center space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Chưa có giảng viên hoặc trợ giảng nào chấm điểm bài nộp này.
                        </p>
                        <p className="text-[11px] text-muted-foreground/80">
                          Bạn có thể tiếp nhận và chấm điểm trực tiếp ở bảng điều khiển bên phải.
                        </p>
                      </div>
                    ) : (
                      staffGradingsList.map((staff, sIdx) => {
                        const isLatest = sIdx === 0;
                        return (
                          <div
                            key={staff.staffId || sIdx}
                            className={
                              isLatest
                                ? "relative p-4 sm:p-5 rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-primary/[0.08] via-card to-background shadow-lg shadow-primary/10 ring-2 ring-primary/20 space-y-3.5 text-xs transition-all"
                                : "relative p-4 rounded-xl bg-muted/25 border border-border/80 space-y-3 text-xs opacity-90 transition-all"
                            }
                          >
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar
                                  src={staff.staffAvatarUrl}
                                  name={staff.staffName || "Giảng viên"}
                                  className={
                                    isLatest
                                      ? "w-10 h-10 border-2 border-primary/40 ring-2 ring-primary/20 shrink-0 shadow-xs"
                                      : "w-9 h-9 border border-border shrink-0"
                                  }
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-foreground text-sm truncate">
                                      {staff.staffName ||
                                        (staff.provenance === GradingProvenance.INSTRUCTOR ||
                                        String(staff.provenance).includes("INSTRUCTOR") ||
                                        Number(staff.provenance) === 4
                                          ? "Giảng viên phụ trách"
                                          : "Trợ giảng")}
                                    </span>
                                    <span
                                      className={
                                        staff.provenance === GradingProvenance.INSTRUCTOR ||
                                        String(staff.provenance).includes("INSTRUCTOR") ||
                                        Number(staff.provenance) === 4
                                          ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                                          : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20"
                                      }
                                    >
                                      {staff.provenance === GradingProvenance.INSTRUCTOR ||
                                      String(staff.provenance).includes("INSTRUCTOR") ||
                                      Number(staff.provenance) === 4
                                        ? "Giảng viên"
                                        : "Trợ giảng"}
                                    </span>
                                    {isLatest && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary text-primary-foreground shadow-xs animate-pulse">
                                        <Sparkles className="w-3 h-3" aria-hidden="true" />
                                        Điểm hiện tại
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                                    {staff.gradedAt
                                      ? new Date(staff.gradedAt).toLocaleDateString("vi-VN", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                        })
                                      : "Chưa ghi nhận thời gian"}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={
                                  isLatest
                                    ? "font-black text-success text-base px-3.5 py-1.5 rounded-xl bg-success/15 border border-success/30 shadow-xs shrink-0"
                                    : "font-bold text-muted-foreground text-xs px-2.5 py-1 rounded-lg bg-muted border border-border shrink-0"
                                }
                              >
                                {staff.score.toFixed(1)} / 100 điểm
                              </span>
                            </div>

                            {staff.feedback && (
                              <div
                                className={
                                  isLatest
                                    ? "p-3.5 rounded-xl bg-background border border-primary/20 space-y-1.5 shadow-xs"
                                    : "p-3 rounded-xl bg-background/70 border border-border/80 space-y-1"
                                }
                              >
                                <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                  <MessageSquare
                                    className="w-3.5 h-3.5 text-primary shrink-0"
                                    aria-hidden="true"
                                  />
                                  Nhận xét & Chú thích nhắc nhở của Giảng viên:
                                </span>
                                <p className="text-muted-foreground leading-relaxed pl-5 italic">
                                  &ldquo;{staff.feedback}&rdquo;
                                </p>
                              </div>
                            )}

                            {staff.gradedCriteria && staff.gradedCriteria.length > 0 && (
                              <div className="pt-2 border-t border-border/60">
                                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                                  Điểm theo tiêu chí:
                                </span>
                                <div className="flex flex-col gap-1.5 pt-0.5">
                                  {staff.gradedCriteria.map((c) => (
                                    <div
                                      key={c.criteriaId}
                                      className="px-3 py-2 rounded-xl bg-card border border-border/70 text-xs flex items-center justify-between gap-3 shadow-2xs hover:border-border transition-colors"
                                    >
                                      <span className="font-medium text-foreground text-xs leading-snug break-words">
                                        {c.title}
                                      </span>
                                      <span className="font-bold text-primary font-mono text-xs shrink-0 px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                                        {c.scoreGiven}{" "}
                                        <span className="text-muted-foreground font-normal">
                                          / {c.maxScore}
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Peer Review History Section */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                  <div className="px-5 py-3.5 bg-muted/40 border-b border-border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                      <h3 className="text-sm font-bold text-foreground">
                        Lịch sử chấm điểm và đánh giá của học viên
                      </h3>
                    </div>
                    {detail.submission?.isOutlier && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                        Độ lệch điểm &gt; 20%
                      </span>
                    )}
                  </div>
                  <div className="p-5 space-y-3">
                    {!detail.peerReviews || detail.peerReviews.length === 0 ? (
                      <div className="p-5 rounded-xl bg-muted/20 border border-dashed border-border/80 text-center space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Chưa có học viên nào chấm điểm hoặc đánh giá bài nộp này.
                        </p>
                      </div>
                    ) : (
                      detail.peerReviews.map((peer, idx) => (
                        <div
                          key={peer.reviewId || idx}
                          className="p-4 rounded-xl bg-muted/25 border border-border/80 space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar
                                src={peer.reviewerAvatarUrl}
                                name={peer.reviewerName || `Học viên #${idx + 1}`}
                                className="w-9 h-9 border border-border shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-foreground text-sm truncate">
                                    {peer.reviewerName || `Học viên #${idx + 1}`}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    Học viên
                                  </span>
                                </div>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                                  {peer.reviewedAt
                                    ? new Date(peer.reviewedAt).toLocaleDateString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      })
                                    : "Chưa ghi nhận thời gian"}
                                </span>
                              </div>
                            </div>
                            <span className="font-bold text-muted-foreground text-xs px-2.5 py-1 rounded-lg bg-muted border border-border shrink-0">
                              {peer.totalScore.toFixed(1)} / 100 điểm
                            </span>
                          </div>
                          {peer.feedback && (
                            <div className="p-3 rounded-xl bg-background/80 border border-border/60 text-xs text-foreground space-y-1">
                              <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                <MessageSquare
                                  className="w-3.5 h-3.5 text-primary shrink-0"
                                  aria-hidden="true"
                                />
                                Nhận xét của học viên:
                              </span>
                              <p className="text-muted-foreground italic leading-relaxed pl-5">
                                &ldquo;{peer.feedback}&rdquo;
                              </p>
                            </div>
                          )}
                          {peer.gradedCriteria && peer.gradedCriteria.length > 0 && (
                            <div className="pt-2 border-t border-border/60">
                              <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                                Điểm theo tiêu chí:
                              </span>
                              <div className="flex flex-col gap-1.5 pt-0.5">
                                {peer.gradedCriteria.map((c) => (
                                  <div
                                    key={c.criteriaId}
                                    className="px-3 py-2 rounded-xl bg-card border border-border/70 text-xs flex items-center justify-between gap-3 shadow-2xs hover:border-border transition-colors"
                                  >
                                    <span className="font-medium text-foreground text-xs leading-snug break-words">
                                      {c.title}
                                    </span>
                                    <span className="font-bold text-primary font-mono text-xs shrink-0 px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                                      {c.scoreGiven}{" "}
                                      <span className="text-muted-foreground font-normal">
                                        / {c.maxScore}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT PANE: Rubric Grading Workbench (40%) */}
              <div className="flex-1 md:w-[40%] flex flex-col justify-between overflow-y-auto p-6 md:p-8 bg-card border-l border-border space-y-6">
                <div className="space-y-6">
                  {/* Score Overview Banner */}
                  <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        {isLockedByOther ? "Điểm dự thảo (Chế độ xem)" : "Tổng điểm đánh giá"}
                      </span>
                      {isLockedByOther && (
                        <Badge
                          variant="warning"
                          className="text-xs font-semibold bg-warning/10 text-warning border-warning/30 gap-1"
                        >
                          <Lock className="w-3 h-3 text-warning" aria-hidden="true" />
                          Chỉ đọc
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-foreground">
                        {currentTotalScore}
                      </span>
                      <span className="text-sm font-bold text-muted-foreground">
                        / {maxPossibleScore} điểm
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-background/80 h-2 rounded-full overflow-hidden border border-border/40">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (currentTotalScore / (maxPossibleScore || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Rubric Criteria List */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                      Tiêu chí đánh giá
                    </h3>

                    {detail.rubricCriteria.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Bài tập này không cấu hình tiêu chí đánh giá riêng.
                      </p>
                    ) : (
                      detail.rubricCriteria.map((c) => {
                        const currentScore = criteriaScores[c.criteriaId] ?? 0;
                        return (
                          <div
                            key={c.criteriaId}
                            className="p-4 rounded-2xl bg-background border border-border space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-sm font-bold text-foreground leading-snug break-words">
                                {c.title}
                              </h4>

                              {mode === "view" || isLockedByOther ? (
                                <span className="px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold font-mono text-primary shrink-0">
                                  {currentScore} / {c.maxScore} điểm
                                </span>
                              ) : (
                                <div className="flex items-center rounded-xl border border-input bg-card px-2.5 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all shrink-0">
                                  <input
                                    type="number"
                                    min={0}
                                    max={c.maxScore}
                                    step={0.5}
                                    value={currentScore}
                                    onChange={(e) => {
                                      const val = Math.max(
                                        0,
                                        Math.min(c.maxScore, Number(e.target.value) || 0),
                                      );
                                      setCriteriaScores((prev) => ({
                                        ...prev,
                                        [c.criteriaId]: val,
                                      }));
                                    }}
                                    aria-label={`Điểm cho tiêu chí ${c.title}`}
                                    className="w-12 text-center text-xs font-bold font-mono text-foreground bg-transparent outline-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <span className="text-xs font-semibold font-mono text-muted-foreground select-none pl-0.5">
                                    / {c.maxScore}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Slider control */}
                            <Slider
                              min={0}
                              max={c.maxScore}
                              step={0.5}
                              value={[currentScore]}
                              disabled={isLockedByOther || mode === "view"}
                              onValueChange={(vals) => {
                                if (isLockedByOther || mode === "view") return;
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
                      className="text-sm font-bold text-foreground flex items-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-primary" aria-hidden="true" />
                      Nhận xét cho học viên
                    </label>
                    <Textarea
                      id="pedagogical-feedback-input"
                      rows={4}
                      placeholder={
                        isLockedByOther || mode === "view"
                          ? undefined
                          : "Ghi nhận ưu điểm và hướng dẫn chi tiết những điểm cần cải thiện..."
                      }
                      value={feedback}
                      disabled={isLockedByOther || mode === "view"}
                      onChange={(e) => setFeedback(e.target.value)}
                      className={`text-xs ${
                        isLockedByOther || mode === "view"
                          ? "bg-muted text-muted-foreground cursor-not-allowed opacity-80"
                          : ""
                      }`}
                    />
                    {(isLockedByOther || mode === "view") && (
                      <p className="text-[11px] text-muted-foreground">
                        Bạn đang ở chế độ xem, không thể sửa đổi nhận xét.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  {/* Left: Release lock button only in grade mode when current user holds lock */}
                  {mode === "grade" && !isLockedByOther && detail?.submission?.lockedByUserId ? (
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleReleaseTask}
                      disabled={releaseLockMutation.isPending || submitGradingMutation.isPending}
                      className="w-full sm:w-auto text-xs font-bold border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                      Hủy giữ bài
                    </Button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="text"
                      onClick={handleClose}
                      disabled={submitGradingMutation.isPending}
                      className="w-full sm:w-auto text-xs font-bold"
                      title={
                        mode === "grade" && !isLockedByOther && detail?.submission?.lockedByUserId
                          ? "Đóng cửa sổ và tiếp tục giữ bài này để chấm sau"
                          : undefined
                      }
                    >
                      Đóng
                    </Button>

                    {mode === "view" ? (
                      !isLockedByOther && (
                        <Button
                          type="button"
                          onClick={handleSwitchToGrading}
                          disabled={claimTaskMutation.isPending}
                          className="w-full sm:w-auto text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg shadow-primary/20"
                        >
                          <PenLine className="w-4 h-4 mr-1.5" aria-hidden="true" />
                          Tiếp nhận & Chấm bài này
                        </Button>
                      )
                    ) : isLockedByOther ? (
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
                        {submitGradingMutation.isPending ? "Đang lưu điểm..." : "Chấm điểm"}
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
