"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { useAuth } from "@/components/providers/AuthProvider";
import { useQuizDraftSync } from "@/lib/hooks/useQuizDraftSync";
import {
  countAnsweredQuestions,
  getCachedQuizDraft,
  reconcileQuizDraft,
  clearCachedQuizDraft,
} from "@/lib/quiz_draft_cache";
import { HonorCodeModal } from "./HonorCodeModal";
import { QuizHistoryDialog } from "./QuizHistoryDialog";

import {
  AlertTriangle,
  Check,
  Clock,
  X,
  Send,
  RotateCcw,
  CircleDot,
  CheckSquare,
  HelpCircle,
  Lock,
  Sparkles,
  ArrowLeft,
  Play,
  Award,
  Target,
  Loader2,
  History,
  CloudOff,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Progress } from "@/components/ui/Progress";
import { Checkbox } from "@/components/ui/Checkbox";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

interface QuizSessionQuestionOption {
  optionIndex: number;
  optionText: string;
}

interface QuizSessionQuestion {
  questionId: string;
  text: string;
  options: QuizSessionQuestionOption[];
  questionType: string;
}

interface QuizResultData {
  scorePercent: number;
  passed: boolean;
  attemptsLeft: number;
  cooldownSecondsLeft: number;
  explanations: string[];
}

interface ActiveDraftOverview {
  sessionId: string;
  startedAtIso: string;
  expiresAtIso: string;
  answeredCount: number;
  totalQuestions: number;
  draftUpdatedAt: string;
  draftVersion: number;
}

const LOW_TIME_WARNING_SECONDS = 120;
const UNLIMITED_ATTEMPTS_THRESHOLD = 999;

interface GradedQuizRunnerProps {
  itemId: string;
  title?: string;
  userId?: string;
  onComplete?: () => void;
  isPreviewMode?: boolean;
  isPractice?: boolean;
  onQuizActiveChange?: (active: boolean) => void;
}

export function GradedQuizRunner({
  itemId,
  title,
  userId,
  onComplete,
  isPreviewMode = false,
  isPractice = false,
  onQuizActiveChange,
}: GradedQuizRunnerProps) {
  const { userId: authUserId } = useAuth();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);
  const effectiveUserId = userId || authUserId || "me";

  const [selectedAnswers, setSelectedAnswers] = useState<number[][]>([]);
  const [isHonorModalOpen, setIsHonorModalOpen] = useState(false);
  const [isResetDraftDialogOpen, setIsResetDraftDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic quiz session & overview state
  const [questions, setQuestions] = useState<QuizSessionQuestion[]>([]);
  const [overviewQuestionCount, setOverviewQuestionCount] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionSeed, setSessionSeed] = useState<number>(0);
  const [startTimeIso, setStartTimeIso] = useState<string>("");
  const [expiresAtIso, setExpiresAtIso] = useState<string>("");
  const [timeLimit, setTimeLimit] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [draftOverviewRemainingSeconds, setDraftOverviewRemainingSeconds] = useState<number>(0);
  const [passingThreshold, setPassingThreshold] = useState<number>(0);
  const [maxAttempts, setMaxAttempts] = useState<number>(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(0);
  const [activeDraftOverview, setActiveDraftOverview] = useState<ActiveDraftOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Historical best score achieved from previous submissions (for overview banner)
  const [historicalResult, setHistoricalResult] = useState<QuizResultData | null>(null);
  // Result of the current in-progress attempt once submitted (for active quiz grading screen)
  const [activeQuizResult, setActiveQuizResult] = useState<QuizResultData | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [isQuizActive, setIsQuizActive] = useState<boolean>(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);
  const autoSubmittedSessionIdRef = useRef<string | null>(null);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onQuizActiveChange?.(isQuizActive);
    return () => {
      onQuizActiveChange?.(false);
    };
  }, [isQuizActive, onQuizActiveChange]);

  const computeRemainingSec = useCallback(
    (targetExpiresIso: string, targetStartIso: string, limitMin: number) => {
      const nowMs = Date.now();
      if (targetExpiresIso) {
        const expMs = Date.parse(targetExpiresIso);
        if (Number.isFinite(expMs)) {
          return Math.max(0, Math.floor((expMs - nowMs) / 1000));
        }
      }
      if (targetStartIso) {
        const startMs = Date.parse(targetStartIso);
        if (Number.isFinite(startMs)) {
          const elapsedSec = Math.floor((nowMs - startMs) / 1000);
          return Math.max(0, limitMin * 60 - elapsedSec);
        }
      }
      return Math.max(0, limitMin * 60);
    },
    [],
  );

  const draftSync = useQuizDraftSync({
    userId: effectiveUserId,
    itemId,
    sessionId,
    sessionSeed,
    expiresAtIso,
    isQuizActive,
    isPreviewMode,
    isSubmitted: activeQuizResult !== null,
    onSessionExpiredOnServer: () => {
      setRemainingSeconds(0);
    },
    onCrossTabDraftUpdated: (nextAnswers) => {
      setSelectedAnswers(nextAnswers);
    },
  });

  // Live ticking timer effect for active quiz mode
  useEffect(() => {
    if (!isQuizActive || activeQuizResult !== null) return;

    const updateTimer = () => {
      setRemainingSeconds(computeRemainingSec(expiresAtIso, startTimeIso, timeLimit));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isQuizActive, activeQuizResult, expiresAtIso, startTimeIso, timeLimit, computeRemainingSec]);

  const formatLiveTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatSavedTime = (ms: number | null) => {
    if (!ms) return "";
    try {
      return new Date(ms).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // Prevent accidental navigation away (Back button / tab close) while taking active quiz
  useEffect(() => {
    if (!isQuizActive || activeQuizResult !== null) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isQuizActive, activeQuizResult]);

  // Track when main header scrolls out of view in the scrollable player container
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const scrollParent = el.closest(".overflow-y-auto") as HTMLElement | null;
    if (!scrollParent) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const headerHeight = el.offsetHeight || 120;
          setIsHeaderStuck(
            scrollParent.scrollTop > 50 &&
              scrollParent.scrollTop >= el.offsetTop + headerHeight - 60,
          );
          ticking = false;
        });
        ticking = true;
      }
    };

    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => scrollParent.removeEventListener("scroll", handleScroll);
  }, [questions.length]);

  const fetchOverview = useCallback(
    async (showLoadingSpinner = true, resetActiveState = false) => {
      if (showLoadingSpinner) {
        setLoading(true);
      }
      if (resetActiveState) {
        setIsQuizActive(false);
        setActiveQuizResult(null);
        setSubmitError(null);
        setSelectedAnswers([]);
        setQuestions([]);
        setSessionId("");
      }
      setError(null);
      try {
        const client = getRpcClient(AssessmentService);
        const res = await client.getQuizOverview({
          itemId,
          preview: isPreviewMode,
        });

        setOverviewQuestionCount(res.questionCount || 0);
        setTimeLimit(res.timeLimitMinutes);
        setPassingThreshold(res.passingThresholdPercent);
        if (res.maxAttempts) setMaxAttempts(res.maxAttempts);
        if (res.attemptsLeft !== undefined) setAttemptsLeft(res.attemptsLeft);

        if (res.hasPreviousResult && res.previousResult) {
          setHistoricalResult({
            scorePercent: res.previousResult.scorePercent,
            passed: res.previousResult.passed,
            attemptsLeft: res.previousResult.attemptsLeft,
            cooldownSecondsLeft: res.previousResult.cooldownSecondsLeft,
            explanations: res.previousResult.answerExplanations,
          });
        } else {
          setHistoricalResult(null);
        }

        if (res.autoSubmittedExpiredDraft) {
          clearCachedQuizDraft(effectiveUserId, itemId);
          toastRef.current.info(
            "Phiên làm bài trước đã hết thời gian và được hệ thống tự động chấm điểm từ bản nháp đã lưu.",
          );
        }

        if (res.hasActiveDraft && res.activeDraft) {
          const cached = getCachedQuizDraft(effectiveUserId, itemId);
          const localAnswered =
            cached && cached.sessionId === res.activeDraft.sessionId
              ? countAnsweredQuestions(cached.answers)
              : 0;
          const mergedAnswered = Math.max(res.activeDraft.answeredCount, localAnswered);

          setActiveDraftOverview({
            sessionId: res.activeDraft.sessionId,
            startedAtIso: res.activeDraft.startedAtIso,
            expiresAtIso: res.activeDraft.expiresAtIso,
            answeredCount: mergedAnswered,
            totalQuestions: res.activeDraft.totalQuestions || res.questionCount,
            draftUpdatedAt: res.activeDraft.draftUpdatedAt,
            draftVersion: res.activeDraft.draftVersion,
          });
        } else {
          setActiveDraftOverview(null);
          clearCachedQuizDraft(effectiveUserId, itemId);
        }
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : "";
        const isDomainNotice =
          rawMsg.includes("vượt qua") ||
          rawMsg.includes("hết lượt") ||
          rawMsg.includes("làm bài") ||
          rawMsg.includes("quay lại sau");

        if (isPractice && isDomainNotice) {
          setError(null);
        } else {
          if (!isDomainNotice) {
            console.error("Failed to fetch quiz overview:", err);
          }
          const cleanMsg = rawMsg.replace(/^\[[a-z_]+\]\s*/i, "");
          const errMsg =
            cleanMsg || "Không thể tải thông tin bài thi hoặc chưa cấu hình Ma trận đề.";
          setError(errMsg);
        }
      } finally {
        if (showLoadingSpinner) {
          setLoading(false);
        }
      }
    },
    [effectiveUserId, isPractice, isPreviewMode, itemId],
  );

  // Load quiz overview on mount / itemId change (without starting timer!)
  useEffect(() => {
    let ignore = false;

    async function init() {
      await Promise.resolve();
      if (!ignore) {
        await fetchOverview(true, true);
      }
    }
    void init();
    return () => {
      ignore = true;
    };
  }, [itemId, isPreviewMode, isPractice, fetchOverview]);

  // Live ticking timer for draft card on Overview screen
  useEffect(() => {
    if (isQuizActive || !activeDraftOverview) return;

    let expiredHandled = false;
    const updateDraftTimer = () => {
      const rem = computeRemainingSec(
        activeDraftOverview.expiresAtIso,
        activeDraftOverview.startedAtIso,
        timeLimit,
      );
      setDraftOverviewRemainingSeconds(rem);
      if (rem === 0 && !expiredHandled) {
        expiredHandled = true;
        void fetchOverview(false);
      }
    };

    updateDraftTimer();
    const interval = setInterval(updateDraftTimer, 1000);
    return () => clearInterval(interval);
  }, [isQuizActive, activeDraftOverview, timeLimit, computeRemainingSec, fetchOverview]);

  const applyStartedSession = useCallback(
    (
      res: Awaited<
        ReturnType<
          ReturnType<typeof getRpcClient<typeof AssessmentService>>["startGradedQuizSession"]
        >
      >,
    ) => {
      const qs = res.questions || [];
      const serverAnswers = (res.draftAnswers || []).map((da) =>
        Array.from(da.selectedOptionIndexes || []),
      );
      const cached = !isPreviewMode ? getCachedQuizDraft(effectiveUserId, itemId) : null;
      const reconciled = reconcileQuizDraft({
        serverSessionId: res.sessionId,
        serverSessionSeed: res.sessionSeed,
        serverExpiresAtIso: res.expiresAtIso,
        serverAnswers,
        serverDraftUpdatedAt: res.draftUpdatedAt,
        serverDraftVersion: res.draftVersion,
        questionCount: qs.length,
        cached,
      });

      setQuestions(qs);
      setOverviewQuestionCount(qs.length);
      setSessionId(res.sessionId);
      setSessionSeed(res.sessionSeed);
      setStartTimeIso(res.startTimeIso);
      setExpiresAtIso(res.expiresAtIso);
      setTimeLimit(res.timeLimitMinutes);
      setPassingThreshold(res.passingThresholdPercent);
      if (res.maxAttempts) setMaxAttempts(res.maxAttempts);
      if (res.attemptsLeft !== undefined) setAttemptsLeft(res.attemptsLeft);

      if (res.hasPreviousResult && res.previousResult) {
        setHistoricalResult({
          scorePercent: res.previousResult.scorePercent,
          passed: res.previousResult.passed,
          attemptsLeft: res.previousResult.attemptsLeft,
          cooldownSecondsLeft: res.previousResult.cooldownSecondsLeft,
          explanations: res.previousResult.answerExplanations,
        });
      }

      setSelectedAnswers(reconciled.answers);
      setRemainingSeconds(
        computeRemainingSec(res.expiresAtIso, res.startTimeIso, res.timeLimitMinutes),
      );
      autoSubmittedSessionIdRef.current = null;

      draftSync.initSessionState({
        sessionId: res.sessionId,
        sessionSeed: res.sessionSeed,
        expiresAtIso: res.expiresAtIso,
        answers: reconciled.answers,
        version: reconciled.version,
        lastSavedAtMs: reconciled.lastSavedAtMs,
        needsServerSync: reconciled.needsServerSync,
      });
    },
    [computeRemainingSec, draftSync, effectiveUserId, isPreviewMode, itemId],
  );

  const handleOptionSelect = (qIdx: number, optIdx: number, isMultipleChoice: boolean) => {
    const currentSelected = selectedAnswers[qIdx] || [];
    let updatedSelected: number[];

    if (isMultipleChoice) {
      if (currentSelected.includes(optIdx)) {
        updatedSelected = currentSelected.filter((i) => i !== optIdx);
      } else {
        updatedSelected = [...currentSelected, optIdx].sort((a, b) => a - b);
      }
    } else {
      updatedSelected = [optIdx];
    }

    const updated = [...selectedAnswers];
    updated[qIdx] = updatedSelected;
    setSelectedAnswers(updated);
    draftSync.recordAnswerChange(updated);
  };

  const handleResetPreview = async () => {
    setActiveQuizResult(null);
    setSubmitError(null);
    setStartingSession(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.startGradedQuizSession({
        itemId,
        preview: true,
        forceNew: true,
      });
      applyStartedSession(res);
    } catch (err) {
      console.error("Failed to reset preview session:", err);
      setError("Không thể tải lại phiên xem trước.");
    } finally {
      setStartingSession(false);
    }
  };

  const startOrResumeQuizSession = async (forceNew: boolean) => {
    setActiveQuizResult(null);
    setSubmitError(null);
    setStartingSession(true);
    if (forceNew) {
      draftSync.clearDraft();
    }
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.startGradedQuizSession({
        itemId,
        preview: isPreviewMode,
        forceNew,
      });
      applyStartedSession(res);
      setIsQuizActive(true);
      if (res.isResumed && !forceNew) {
        const count = countAnsweredQuestions(
          (res.draftAnswers || []).map((d) => Array.from(d.selectedOptionIndexes || [])),
        );
        if (count > 0) {
          toast.success(`Đã khôi phục bản nháp (${count}/${res.questions.length} câu đã chọn).`);
        }
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "";
      const isDomainNotice =
        rawMsg.includes("vượt qua") ||
        rawMsg.includes("hết lượt") ||
        rawMsg.includes("làm bài") ||
        rawMsg.includes("quay lại sau");

      if (isPractice && isDomainNotice) {
        setError(null);
        setIsQuizActive(true);
      } else {
        if (!isDomainNotice) {
          console.error("Failed to start graded quiz session:", err);
        }
        const cleanMsg = rawMsg.replace(/^\[[a-z_]+\]\s*/i, "");
        const errMsg = cleanMsg || "Không thể khởi động bài thi. Vui lòng thử lại sau.";
        setError(errMsg);
      }
    } finally {
      setStartingSession(false);
    }
  };

  const handleStartQuiz = async () => {
    await startOrResumeQuizSession(true);
  };

  const handleResumeQuiz = async () => {
    await startOrResumeQuizSession(false);
  };

  const handlePauseAndReturnOverview = async () => {
    if (!isPreviewMode && activeQuizResult === null) {
      await draftSync.flushNow();
    }
    setIsQuizActive(false);
    await fetchOverview(false);
  };

  const executeSubmit = useCallback(
    async (isAutoTimeout = false) => {
      setIsSubmitting(true);
      setSubmitError(null);

      const questionAnswersPayload = selectedAnswers.map((indices) => ({
        selectedOptionIndexes: indices,
      }));

      try {
        const client = getRpcClient(AssessmentService);
        if (isAutoTimeout && !isPreviewMode) {
          await client.submitHonorCode({
            itemId,
            isAgreed: true,
          });
        }

        const res = await client.submitGradedQuiz({
          itemId,
          sessionId: sessionId || undefined,
          questionAnswers: questionAnswersPayload,
          sessionSeed,
          preview: isPreviewMode,
        });

        draftSync.clearDraft();
        setActiveDraftOverview(null);

        if (res.result) {
          const resultData: QuizResultData = {
            scorePercent: res.result.scorePercent,
            passed: res.result.passed,
            attemptsLeft: res.result.attemptsLeft,
            cooldownSecondsLeft: res.result.cooldownSecondsLeft,
            explanations: res.result.answerExplanations,
          };
          setActiveQuizResult(resultData);
          setHistoricalResult((prev) => {
            if (!prev || resultData.scorePercent >= prev.scorePercent) {
              return resultData;
            }
            return prev;
          });
          if (res.result.maxAttempts) setMaxAttempts(res.result.maxAttempts);
          if (res.result.attemptsLeft !== undefined) setAttemptsLeft(res.result.attemptsLeft);

          if (res.result.passed && onCompleteRef.current) {
            onCompleteRef.current();
          }
        }
      } catch (err: unknown) {
        console.error("RPC submitGradedQuiz failed:", err);
        const errMsg =
          err instanceof Error
            ? err.message
            : "Nộp bài thi thất bại. Vui lòng kiểm tra kết nối mạng và thử lại.";
        setSubmitError(errMsg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [draftSync, isPreviewMode, itemId, selectedAnswers, sessionId, sessionSeed],
  );

  // Auto-submit when countdown reaches 00:00 (BR_QUIZ_003)
  useEffect(() => {
    if (
      !isQuizActive ||
      activeQuizResult !== null ||
      isSubmitting ||
      questions.length === 0 ||
      timeLimit <= 0 ||
      !sessionId
    ) {
      return;
    }
    if (remainingSeconds <= 0 && autoSubmittedSessionIdRef.current !== sessionId) {
      autoSubmittedSessionIdRef.current = sessionId;
      setIsHonorModalOpen(false);
      void executeSubmit(true);
    }
  }, [
    isQuizActive,
    activeQuizResult,
    isSubmitting,
    questions.length,
    timeLimit,
    sessionId,
    remainingSeconds,
    executeSubmit,
  ]);

  const handleSubmitQuiz = () => {
    setIsHonorModalOpen(true);
  };

  if (loading || startingSession) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Progress.Circular size="md" ariaLabel="Đang tải dữ liệu bài kiểm tra" />
        <p aria-live="polite" className="text-sm text-muted-foreground font-semibold">
          {startingSession
            ? "Đang chuẩn bị phiên làm bài và đồng bộ bản nháp…"
            : "Đang tải thông tin bài kiểm tra…"}
        </p>
      </div>
    );
  }

  if (error) {
    const isAuditModeErr =
      error.includes("Audit Mode") ||
      error.includes("Miễn phí") ||
      error.includes("permission_denied");

    if (isAuditModeErr) {
      return (
        <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-surface-container-low text-on-surface text-center space-y-6 border border-border shadow-xs">
          <div className="w-16 h-16 rounded-full bg-warning/15 text-warning flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8 stroke-[2.5]" aria-hidden="true" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <Chip
              variant="assist"
              className="h-6 bg-warning/10 text-warning border-warning/20 hover:bg-warning/15 cursor-default font-bold text-xs pointer-events-none"
              leadingIcon={<Lock className="w-3.5 h-3.5 text-warning" aria-hidden="true" />}
            >
              CHẾ ĐỘ AUDIT (MIỄN PHÍ)
            </Chip>
            <h3 className="text-xl font-extrabold text-foreground">
              Bài kiểm tra tính điểm đã bị khóa
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tài khoản của bạn đang ở chế độ Audit Mode (Miễn phí). Vui lòng nâng cấp Coursera Plus
              hoặc mua khóa học / nhập mã Enterprise Key / Hỗ trợ tài chính để làm bài kiểm tra tính
              điểm này.
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <Link
              href="/my-purchases"
              className="px-6 py-3 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm transition-all shadow-xs flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 fill-current" aria-hidden="true" />
              Nâng cấp Coursera Plus ngay
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-center space-y-4 shadow-xs">
        <AlertTriangle aria-hidden="true" className="w-10 h-10 text-destructive mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-destructive">Không thể tải phiên làm bài</h3>
          <p className="text-sm text-destructive/90">{error}</p>
        </div>
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={() => {
            setError(null);
            setIsQuizActive(false);
            void fetchOverview(true);
          }}
          className="rounded-full text-xs font-semibold bg-surface-container-lowest"
        >
          Thử lại
        </Button>
      </div>
    );
  }

  const answeredCount = countAnsweredQuestions(selectedAnswers);

  const renderDraftSyncBadge = () => {
    if (isPreviewMode || activeQuizResult !== null) return null;

    if (draftSync.syncStatus === "saving") {
      return (
        <span
          data-testid="quiz-draft-status"
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-container-high text-muted-foreground border border-outline-variant flex items-center gap-1.5"
        >
          <Loader2 className="w-3 h-3 animate-spin text-primary" aria-hidden="true" />
          <span>Đang lưu nháp…</span>
        </span>
      );
    }

    if (draftSync.syncStatus === "offline_pending") {
      return (
        <span
          data-testid="quiz-draft-status"
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warning/15 text-warning border border-warning/30 flex items-center gap-1.5"
          title="Đáp án đã lưu trên trình duyệt và sẽ tự động đồng bộ khi có mạng lại"
        >
          <CloudOff className="w-3 h-3" aria-hidden="true" />
          <span>Đã lưu trên máy (chờ mạng)</span>
        </span>
      );
    }

    if (draftSync.syncStatus === "error") {
      return (
        <span
          data-testid="quiz-draft-status"
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-warning/15 text-warning border border-warning/30 flex items-center gap-1.5"
          title="Đáp án đã được bảo toàn trên trình duyệt"
        >
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          <span>Đã lưu tạm trên máy</span>
        </span>
      );
    }

    if (draftSync.syncStatus === "saved" || draftSync.lastSavedAtMs) {
      const timeLabel = formatSavedTime(draftSync.lastSavedAtMs);
      return (
        <span
          data-testid="quiz-draft-status"
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-success/10 text-success border border-success/30 flex items-center gap-1.5"
          title={timeLabel ? `Đã đồng bộ máy chủ lúc ${timeLabel}` : "Đã đồng bộ máy chủ"}
        >
          <Check className="w-3 h-3" aria-hidden="true" />
          <span>{timeLabel ? `Đã lưu nháp (${timeLabel})` : "Đã lưu nháp"}</span>
        </span>
      );
    }

    return null;
  };

  if (!isQuizActive) {
    const effectiveQuestionCount =
      overviewQuestionCount > 0
        ? overviewQuestionCount
        : questions.length > 0
          ? questions.length
          : (historicalResult?.explanations?.length ?? 0);

    const questionCountDisplay =
      effectiveQuestionCount > 0 ? `${effectiveQuestionCount} câu` : "--";

    const hasActiveDraft =
      !isPreviewMode && activeDraftOverview !== null && draftOverviewRemainingSeconds > 0;

    return (
      <div className="@container max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-m3-short-4">
        {/* Header Badge & Title */}
        <div className="space-y-3 border-b border-border pb-5">
          <div className="flex items-center gap-2 flex-wrap">
            {isPreviewMode ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/30">
                CHẾ ĐỘ XEM TRƯỚC (PREVIEW)
              </span>
            ) : isPractice ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-info/15 text-info border border-info/30">
                TRẮC NGHIỆM LUYỆN TẬP
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/15 text-warning border border-warning/30">
                BÀI THI CÓ TÍNH ĐIỂM
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {title || (isPractice ? "Trắc nghiệm luyện tập" : "Bài thi trắc nghiệm")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isPractice
              ? "Bài tập trắc nghiệm ngắn giúp bạn củng cố và ôn tập kiến thức bài học."
              : "Bài thi kiểm tra tính điểm đánh giá năng lực bài học. Điểm số cao nhất sẽ được giữ làm kết quả chính thức."}
          </p>
        </div>

        {/* 4-Card Metadata Grid */}
        <div className="grid grid-cols-2 @[540px]:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-surface-container-high/60 border border-outline-variant/60 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Số câu hỏi
            </span>
            <p className="text-lg font-bold text-foreground">{questionCountDisplay}</p>
          </div>
          <div className="p-4 rounded-2xl bg-surface-container-high/60 border border-outline-variant/60 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Thời gian
            </span>
            <p className="text-lg font-bold text-foreground">{timeLimit} phút</p>
          </div>
          <div className="p-4 rounded-2xl bg-surface-container-high/60 border border-outline-variant/60 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Điểm đạt
            </span>
            <p className="text-lg font-bold text-foreground">{passingThreshold}%</p>
          </div>
          <div className="p-4 rounded-2xl bg-surface-container-high/60 border border-outline-variant/60 space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Lượt làm bài
            </span>
            <p className="text-lg font-bold text-foreground">
              {isPractice
                ? "Không giới hạn"
                : attemptsLeft >= UNLIMITED_ATTEMPTS_THRESHOLD
                  ? "Không giới hạn"
                  : `${attemptsLeft}/${maxAttempts}`}
            </p>
          </div>
        </div>

        {/* Active Draft Recovery Banner */}
        {hasActiveDraft && activeDraftOverview && (
          <div
            data-testid="active-quiz-draft-banner"
            className="p-5 rounded-2xl bg-primary/10 border border-primary/30 text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Phiên làm bài đang được bảo toàn (Đã chọn {activeDraftOverview.answeredCount}/
                  {activeDraftOverview.totalQuestions} câu)
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Đáp án nháp của bạn đã được lưu tự động. Bấm <strong>Tiếp tục làm bài</strong> để
                  hoàn thành trước khi hết thời gian.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-surface-container-lowest text-primary border border-primary/30 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Còn {formatLiveTimer(draftOverviewRemainingSeconds)}</span>
              </span>
            </div>
          </div>
        )}

        {/* Highest Score Achieved Banner */}
        {historicalResult ? (
          <div
            className={`p-6 rounded-2xl border ${
              historicalResult.passed
                ? "bg-success/10 border-success/30 text-success"
                : "bg-warning/10 border-warning/30 text-warning"
            } space-y-4 shadow-xs`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-current/15 shrink-0">
                  <Award className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    Kết quả cao nhất đã làm: {historicalResult.scorePercent}%
                  </h3>
                  <p className="text-xs opacity-90">
                    {historicalResult.passed
                      ? "Bạn đã đạt bài thi này. Bạn vẫn có thể làm lại để nâng cao kết quả."
                      : "Bạn chưa đạt ngưỡng điểm yêu cầu. Hãy ôn lại bài và thử lại."}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold border uppercase shrink-0 self-start sm:self-center ${
                  historicalResult.passed
                    ? "bg-success/20 border-success/40 text-success"
                    : "bg-warning/20 border-warning/40 text-warning"
                }`}
              >
                {historicalResult.passed ? "ĐÃ ĐẠT" : "CHƯA ĐẠT"}
              </span>
            </div>

            {historicalResult.explanations && historicalResult.explanations.length > 0 && (
              <div className="pt-3 border-t border-current/15 space-y-1 text-xs">
                <h5 className="font-bold uppercase tracking-wider text-[10px] opacity-75">
                  Phản hồi bài làm:
                </h5>
                <ul className="list-disc list-inside space-y-1 opacity-90 leading-relaxed max-h-36 overflow-y-auto pr-2">
                  {historicalResult.explanations.map((exp, idx) => (
                    <li key={idx}>{exp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-surface-container-high/40 border border-border text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-foreground">Bắt đầu làm bài thi</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Bạn chưa thực hiện lượt làm bài nào. Hãy bấm Bắt đầu làm bài bên dưới để tiến hành bài
              kiểm tra.
            </p>
          </div>
        )}

        {/* Start / Continue / Retry Action Button */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-3 flex-wrap">
          <Button
            type="button"
            variant="outlined"
            onClick={() => setIsHistoryOpen(true)}
            className="px-5 py-2.5 rounded-full text-xs font-bold gap-1.5"
          >
            <History className="w-4 h-4 text-primary" aria-hidden="true" />
            Lịch sử làm bài & Phân tích
          </Button>
          <div className="flex items-center gap-3">
            {hasActiveDraft ? (
              <>
                <Button
                  type="button"
                  variant="outlined"
                  disabled={loading || startingSession}
                  onClick={() => setIsResetDraftDialogOpen(true)}
                  className="px-6 py-2.5 rounded-full text-xs font-semibold"
                >
                  Làm bài mới từ đầu
                </Button>
                <Button
                  type="button"
                  disabled={loading || startingSession}
                  onClick={() => void handleResumeQuiz()}
                  className="px-8 py-3 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-md flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                  Tiếp tục làm bài
                </Button>
              </>
            ) : (
              <Button
                type="button"
                disabled={loading || startingSession}
                onClick={() => void handleStartQuiz()}
                className="px-8 py-3 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-md flex items-center gap-2"
              >
                {startingSession ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                )}
                {historicalResult ? "Làm lại bài thi" : "Bắt đầu làm bài"}
              </Button>
            )}
          </div>
        </div>

        {/* Confirmation Dialog before discarding active draft */}
        <Dialog
          open={isResetDraftDialogOpen}
          onOpenChange={(open) => setIsResetDraftDialogOpen(open)}
        >
          <Dialog.Content size="md">
            <Dialog.Header>
              <Dialog.Icon
                icon={<RotateCcw className="w-6 h-6 text-warning" aria-hidden="true" />}
              />
              <Dialog.Title>Xác nhận làm bài mới từ đầu?</Dialog.Title>
              <Dialog.Description>
                Bạn đang có bản nháp đã lưu ({activeDraftOverview?.answeredCount ?? 0}/
                {activeDraftOverview?.totalQuestions ?? effectiveQuestionCount} câu đã chọn). Việc
                tạo phiên mới sẽ xóa các đáp án nháp hiện tại và rút lại đề mới.
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Button type="button" variant="text" onClick={() => setIsResetDraftDialogOpen(false)}>
                Giữ lại bản nháp
              </Button>
              <Button
                type="button"
                variant="filled"
                onClick={async () => {
                  setIsResetDraftDialogOpen(false);
                  await handleStartQuiz();
                }}
              >
                Xóa nháp & Làm bài mới
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog>

        <QuizHistoryDialog
          itemId={itemId}
          quizTitle={title}
          open={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          onRetakeQuiz={handleStartQuiz}
        />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-2xl border border-dashed border-border text-center space-y-4">
        <p className="text-muted-foreground text-sm font-medium">
          Kho đề thi chưa có câu hỏi nào hoặc thiết lập không khớp.
        </p>
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={() => setIsQuizActive(false)}
          className="rounded-full text-xs font-semibold"
        >
          Quay lại tổng quan
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-2 sm:p-4 animate-in fade-in duration-m3-short-4">
      {/* Active Focus Mode Bar with Back Button, Draft Sync Status & Live Countdown Timer */}
      <div className="flex items-center justify-between pb-3 border-b border-border gap-2 flex-wrap">
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={() => void handlePauseAndReturnOverview()}
          className="rounded-full text-xs font-semibold flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{activeQuizResult ? "Quay lại tổng quan" : "Lưu nháp & Tạm thoát"}</span>
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {renderDraftSyncBadge()}
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 transition-all ${
              remainingSeconds < LOW_TIME_WARNING_SECONDS
                ? "bg-destructive/15 text-destructive border-destructive/30 animate-pulse"
                : "bg-primary/10 text-primary border-primary/20"
            }`}
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Thời gian còn lại: {formatLiveTimer(remainingSeconds)}</span>
          </span>
        </div>
      </div>

      {/* Sticky Compact Header - Only visible when scrolled past main header */}
      <div
        className={`sticky -top-2 sm:-top-4 z-30 w-full pt-3 pb-2.5 px-4 bg-surface-container-lowest/95 backdrop-blur-xl space-y-2 transition-all duration-300 ease-m3-emphasized ${
          isHeaderStuck
            ? "opacity-100 translate-y-0 blur-none pointer-events-auto visible"
            : "opacity-0 -translate-y-6 blur-[1px] pointer-events-none invisible"
        }`}
        style={{
          marginBottom: isHeaderStuck ? "0px" : "-56px",
        }}
        aria-hidden={!isHeaderStuck}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Left: Badge + Quiz Title */}
          <div className="flex items-center gap-2 min-w-0">
            {isPreviewMode ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/30 shrink-0">
                XEM TRƯỚC
              </span>
            ) : isPractice ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-info/15 text-info border border-info/30 shrink-0">
                LUYỆN TẬP
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-warning/15 text-warning border border-warning/30 shrink-0">
                CÓ TÍNH ĐIỂM
              </span>
            )}
            <h3 className="text-sm font-bold text-foreground truncate" title={title}>
              {title || (isPractice ? "Trắc nghiệm luyện tập" : "Bài thi trắc nghiệm")}
            </h3>
          </div>

          {/* Right: Metadata & Stats */}
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground shrink-0 flex-wrap">
            {renderDraftSyncBadge()}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono border ${
                remainingSeconds < LOW_TIME_WARNING_SECONDS
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "bg-surface-container-high text-on-surface-variant border-outline-variant"
              }`}
            >
              Còn lại: {formatLiveTimer(remainingSeconds)}
            </span>
            <span className="tabular-nums">Đạt: {passingThreshold}%</span>
            <span className="font-semibold text-foreground tabular-nums">
              {answeredCount}/{questions.length} câu (
              {Math.round(questions.length > 0 ? (answeredCount / questions.length) * 100 : 0)}%)
            </span>
          </div>
        </div>

        {/* Full-width Smooth Progress Bar */}
        <Progress.Linear
          value={questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}
          showLabel={false}
          className="w-full"
        />

        {/* Soft Floating Gradient Lip at bottom to eliminate visual friction */}
        <div
          className={`absolute -bottom-3 inset-x-0 h-3 bg-gradient-to-b from-surface-container-lowest via-surface-container-lowest/80 to-transparent pointer-events-none transition-opacity duration-300 ${
            isHeaderStuck ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
      </div>

      {/* Original Full Header (Normal view on initial load) */}
      <div ref={headerRef} className="w-full border-b border-border pb-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isPreviewMode ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/30">
              CHẾ ĐỘ XEM TRƯỚC (PREVIEW)
            </span>
          ) : isPractice ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-info/15 text-info border border-info/30">
              TRẮC NGHIỆM LUYỆN TẬP
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/15 text-warning border border-warning/30">
              BÀI THI CÓ TÍNH ĐIỂM
            </span>
          )}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-surface-container-high text-on-surface-variant border-outline-variant">
            {isPractice || attemptsLeft >= UNLIMITED_ATTEMPTS_THRESHOLD
              ? "Lượt làm: Không giới hạn"
              : `Lượt còn lại: ${attemptsLeft}/${maxAttempts}`}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            Điểm đạt: {passingThreshold}%
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          {title || (isPractice ? "Trắc nghiệm luyện tập" : "Bài thi trắc nghiệm")}
        </h2>

        <div className="w-full pt-1">
          <Progress.Linear
            value={questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}
            showLabel
            label={`Tiến độ làm bài (${answeredCount}/${questions.length} câu)`}
            className="w-full"
          />
        </div>
      </div>

      {/* Quiz Results Panel (Prominently rendered at TOP when previous results exist) */}
      {activeQuizResult && (
        <div
          className={`p-5 sm:p-6 rounded-2xl border ${
            activeQuizResult.passed
              ? "bg-success/10 border-success/30 text-success"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          } space-y-4 shadow-xs`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-current/10 shrink-0">
                {activeQuizResult.passed ? (
                  <Check aria-hidden="true" className="w-5 h-5 text-success" />
                ) : (
                  <X aria-hidden="true" className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">
                  {activeQuizResult.passed
                    ? "Chúc mừng! Bạn đã vượt qua bài thi"
                    : "Kết quả lần làm gần nhất: Chưa đạt"}
                </h3>
                <p className="text-xs opacity-85">
                  Điểm số: {activeQuizResult.scorePercent}% (Yêu cầu: {passingThreshold}%){" "}
                  {isPreviewMode
                    ? "(Xem trước)"
                    : isPractice || activeQuizResult.attemptsLeft >= UNLIMITED_ATTEMPTS_THRESHOLD
                      ? "• Lượt làm: Không giới hạn"
                      : `• Lượt còn lại: ${activeQuizResult.attemptsLeft}/${maxAttempts}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <span className="text-2xl sm:text-3xl font-extrabold tabular-nums">
                {activeQuizResult.scorePercent}%
              </span>
              {!isPreviewMode && (
                <Button
                  type="button"
                  variant="tonal"
                  size="sm"
                  onClick={() => setIsHistoryOpen(true)}
                  className="rounded-full shadow-xs text-xs font-bold gap-1.5"
                >
                  <History aria-hidden="true" className="w-3.5 h-3.5" />
                  Chi tiết bài làm & Lỗ hổng
                </Button>
              )}
              {!isPreviewMode && (
                <Button
                  type="button"
                  variant="outlined"
                  size="sm"
                  onClick={() => void handleStartQuiz()}
                  className="rounded-full shadow-xs text-xs font-semibold bg-surface-container-lowest"
                >
                  <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 mr-1.5" />
                  {"Làm lại bài thi"}
                </Button>
              )}
              {isPreviewMode && (
                <Button
                  type="button"
                  variant="outlined"
                  size="sm"
                  onClick={() => void handleResetPreview()}
                  className="rounded-full shadow-xs text-xs font-semibold bg-surface-container-lowest"
                >
                  <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 mr-1.5" />
                  {"Làm lại bản nháp"}
                </Button>
              )}
            </div>
          </div>

          {activeQuizResult.explanations.length > 0 && (
            <div className="pt-3 border-t border-current/10 space-y-1.5 text-xs">
              <h5 className="font-bold uppercase tracking-wider text-[10px] opacity-75">
                Phản hồi & Giải thích đáp án:
              </h5>
              <ul className="list-disc list-inside space-y-1 opacity-90 leading-relaxed">
                {activeQuizResult.explanations.map((exp, idx) => {
                  const formattedExp = exp
                    .replace(/Đã đạt/g, "Đúng")
                    .replace(/Chưa đạt/g, "Sai")
                    .replace(/\s*\(\d+(\.\d+)?%\)\.?,?/g, "");
                  return <li key={idx}>{formattedExp}</li>;
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Quiz Questions List */}
      <div className="space-y-6">
        {questions.map((q, qIdx) => {
          const isMultipleChoice = q.questionType === "MULTIPLE_CHOICE";
          const currentAnswers = selectedAnswers[qIdx] || [];

          return (
            <div
              key={q.questionId}
              className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-surface-container-low/40 space-y-3.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-foreground">
                  Câu {qIdx + 1}. {q.text}
                </h4>
                {q.questionType === "MULTIPLE_CHOICE" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] py-0.5 px-2.5 font-bold rounded-full bg-warning/15 text-warning border border-warning/30 shrink-0">
                    <CheckSquare aria-hidden="true" className="w-3 h-3" />
                    Chọn nhiều đáp án
                  </span>
                ) : q.questionType === "TRUE_FALSE" ? (
                  <Chip
                    variant="assist"
                    className="h-6 text-[10px] py-0 px-2.5 bg-info/15 text-info border-info/30 hover:bg-info/20 shrink-0 cursor-default pointer-events-none font-bold"
                    leadingIcon={
                      <HelpCircle aria-hidden="true" className="w-3.5 h-3.5 text-info" />
                    }
                  >
                    Đúng / Sai
                  </Chip>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] py-0.5 px-2.5 font-medium rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/60 shrink-0">
                    <CircleDot aria-hidden="true" className="w-3 h-3" />
                    Chọn 1 đáp án
                  </span>
                )}
              </div>

              {isMultipleChoice ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = currentAnswers.includes(optIdx);
                    return (
                      <Checkbox
                        key={optIdx}
                        checked={isSelected}
                        onCheckedChange={() => handleOptionSelect(qIdx, optIdx, true)}
                        disabled={activeQuizResult !== null}
                        label={opt.optionText}
                        containerClassName={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-xs"
                            : "bg-surface-container-lowest border-outline-variant hover:border-outline hover:bg-surface-container-low"
                        }`}
                      />
                    );
                  })}
                </div>
              ) : (
                <RadioGroup
                  value={currentAnswers[0]?.toString() ?? ""}
                  onValueChange={(val) => {
                    if (val !== undefined && val !== null && val !== "") {
                      handleOptionSelect(qIdx, Number(val), false);
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                >
                  {q.options.map((opt, optIdx) => (
                    <RadioGroup.Item
                      key={optIdx}
                      value={optIdx.toString()}
                      disabled={activeQuizResult !== null}
                      label={opt.optionText}
                      containerClassName="p-3.5 rounded-xl border border-outline-variant bg-surface-container-lowest hover:border-outline hover:bg-surface-container-low transition-all"
                    />
                  ))}
                </RadioGroup>
              )}
            </div>
          );
        })}
      </div>

      {/* Submission Error Banner */}
      {submitError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{submitError}</span>
          <IconButton
            type="button"
            variant="standard"
            size="xs"
            onClick={() => setSubmitError(null)}
            className="text-destructive hover:text-destructive p-1"
            aria-label="Đóng thông báo lỗi"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </IconButton>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {isPreviewMode
            ? "Chế độ xem trước (kết quả không lưu vào học bạ)."
            : "Đáp án được tự động lưu nháp. Điểm số cao nhất sẽ được lưu làm kết quả chính thức."}
        </p>

        <div className="flex items-center gap-3">
          {!activeQuizResult && (
            <Button type="button" onClick={handleSubmitQuiz} disabled={isSubmitting} size="sm">
              {isSubmitting ? "Đang chấm điểm…" : "Nộp bài thi"}
              {!isSubmitting && <Send aria-hidden="true" className="w-4 h-4 ml-1.5" />}
            </Button>
          )}
        </div>
      </div>

      <HonorCodeModal
        itemId={itemId}
        isOpen={isHonorModalOpen}
        isSubmitting={isSubmitting}
        onAgreedAndSubmit={async () => {
          await executeSubmit(false);
          setIsHonorModalOpen(false);
        }}
        onClose={() => setIsHonorModalOpen(false)}
      />

      <QuizHistoryDialog
        itemId={itemId}
        quizTitle={title}
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        onRetakeQuiz={handleStartQuiz}
      />
    </div>
  );
}
