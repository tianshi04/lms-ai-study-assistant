"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { HonorCodeModal } from "./HonorCodeModal";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  CheckCircle2,
  AlertCircle,
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Progress } from "@/components/ui/Progress";
import { Checkbox } from "@/components/ui/Checkbox";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Chip } from "@/components/ui/Chip";

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

interface GradedQuizRunnerProps {
  itemId: string;
  title?: string;
  userId?: string;
  onComplete?: () => void;
  isPreviewMode?: boolean;
  isPractice?: boolean;
}

export function GradedQuizRunner({
  itemId,
  title,
  userId,
  onComplete,
  isPreviewMode = false,
  isPractice = false,
}: GradedQuizRunnerProps) {
  const { userId: authUserId } = useAuth();
  const _effectiveUserId = userId || authUserId || "user-demo-1";
  const [selectedAnswers, setSelectedAnswers] = useState<number[][]>([]);
  const [isHonorModalOpen, setIsHonorModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic quiz session state
  const [questions, setQuestions] = useState<QuizSessionQuestion[]>([]);
  const [sessionSeed, setSessionSeed] = useState<number>(0);
  const [startTimeIso, setStartTimeIso] = useState<string>("");
  const [timeLimit, setTimeLimit] = useState<number>(45);
  const [passingThreshold, setPassingThreshold] = useState<number>(80);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [attemptsLeft, setAttemptsLeft] = useState<number>(3);
  const [cooldownHours, setCooldownHours] = useState<number>(8);

  const [quizResult, setQuizResult] = useState<{
    scorePercent: number;
    passed: boolean;
    attemptsLeft: number;
    cooldownSecondsLeft: number;
    explanations: string[];
  } | null>(null);

  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

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

  // Fetch quiz session questions on load
  useEffect(() => {
    let ignore = false;
    async function loadQuiz() {
      setLoading(true);
      setError(null);
      setSubmitError(null);
      setQuizResult(null);
      setSelectedAnswers([]);
      try {
        const client = getRpcClient(AssessmentService);
        const res = await client.startGradedQuizSession({
          itemId,
          preview: isPreviewMode,
          forceNew: false,
        });
        if (!ignore) {
          setQuestions(res.questions || []);
          setSessionSeed(res.sessionSeed);
          setStartTimeIso(res.startTimeIso);
          setTimeLimit(res.timeLimitMinutes || 45);
          setPassingThreshold(res.passingThresholdPercent || 80.0);
          setMaxAttempts(res.maxAttempts || 3);
          setAttemptsLeft(res.attemptsLeft ?? res.maxAttempts ?? 3);
          setCooldownHours(res.cooldownHours || 8);
          setSelectedAnswers(Array.from({ length: res.questions?.length || 0 }, () => []));

          if ((res as { cooldownSecondsLeft?: number }).cooldownSecondsLeft) {
            setCooldownCountdown((res as { cooldownSecondsLeft?: number }).cooldownSecondsLeft!);
          } else {
            setCooldownCountdown(0);
          }

          // Restore previous result state if available
          if (res.hasPreviousResult && res.previousResult) {
            setQuizResult({
              scorePercent: res.previousResult.scorePercent,
              passed: res.previousResult.passed,
              attemptsLeft: res.previousResult.attemptsLeft,
              cooldownSecondsLeft: res.previousResult.cooldownSecondsLeft,
              explanations: res.previousResult.answerExplanations,
            });
          } else {
            setQuizResult(null);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const rawMsg = err instanceof Error ? err.message : "";
          const isDomainNotice =
            rawMsg.includes("vượt qua") ||
            rawMsg.includes("hết lượt") ||
            rawMsg.includes("làm bài") ||
            rawMsg.includes("quay lại sau");

          if (!isDomainNotice) {
            console.error("Failed to start graded quiz session:", err);
          }
          const cleanMsg = rawMsg.replace(/^\[[a-z_]+\]\s*/i, "");
          const errMsg = cleanMsg || "Không thể khởi động bài thi hoặc chưa cấu hình Ma trận đề.";
          setError(errMsg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadQuiz();
    return () => {
      ignore = true;
    };
  }, [itemId, isPreviewMode]);

  useEffect(() => {
    if (cooldownCountdown <= 0) return;
    const interval = setInterval(() => {
      setCooldownCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownCountdown]);

  const formatCooldown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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
  };

  const handleResetPreview = async () => {
    setQuizResult(null);
    setSubmitError(null);
    setLoading(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.startGradedQuizSession({
        itemId,
        preview: true,
        forceNew: true,
      });
      setQuestions(res.questions || []);
      setSessionSeed(res.sessionSeed);
      setStartTimeIso(res.startTimeIso);
      setTimeLimit(res.timeLimitMinutes || 45);
      setPassingThreshold(res.passingThresholdPercent || 80.0);
      setMaxAttempts(res.maxAttempts || 3);
      setCooldownHours(res.cooldownHours || 8);
      setSelectedAnswers(Array.from({ length: res.questions?.length || 0 }, () => []));
      setCooldownCountdown(0);
    } catch (err) {
      console.error("Failed to reset preview session:", err);
      setError("Không thể tải lại phiên xem trước.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryQuiz = async () => {
    setQuizResult(null);
    setSubmitError(null);
    setLoading(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.startGradedQuizSession({
        itemId,
        preview: isPreviewMode,
        forceNew: true,
      });
      setQuestions(res.questions || []);
      setSessionSeed(res.sessionSeed);
      setStartTimeIso(res.startTimeIso);
      setTimeLimit(res.timeLimitMinutes || 45);
      setPassingThreshold(res.passingThresholdPercent || 80.0);
      setMaxAttempts(res.maxAttempts || 3);
      setAttemptsLeft(res.attemptsLeft ?? res.maxAttempts ?? 3);
      setCooldownHours(res.cooldownHours || 8);
      setSelectedAnswers(Array.from({ length: res.questions?.length || 0 }, () => []));
      if ((res as { cooldownSecondsLeft?: number }).cooldownSecondsLeft) {
        setCooldownCountdown((res as { cooldownSecondsLeft?: number }).cooldownSecondsLeft!);
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "";
      const isDomainNotice =
        rawMsg.includes("vượt qua") ||
        rawMsg.includes("hết lượt") ||
        rawMsg.includes("làm bài") ||
        rawMsg.includes("quay lại sau");

      if (!isDomainNotice) {
        console.error("Failed to retry graded quiz session:", err);
      }
      const cleanMsg = rawMsg.replace(/^\[[a-z_]+\]\s*/i, "");
      const errMsg = cleanMsg || "Không thể khởi động lại bài thi. Vui lòng thử lại sau.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const questionAnswersPayload = selectedAnswers.map((indices) => ({
      selectedOptionIndexes: indices,
    }));

    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitGradedQuiz({
        itemId,
        questionAnswers: questionAnswersPayload,
        sessionSeed,
        startTimeIso,
        preview: isPreviewMode,
      });

      if (res.result) {
        setQuizResult({
          scorePercent: res.result.scorePercent,
          passed: res.result.passed,
          attemptsLeft: res.result.attemptsLeft,
          cooldownSecondsLeft: res.result.cooldownSecondsLeft,
          explanations: res.result.answerExplanations,
        });
        if (res.result.maxAttempts) {
          setMaxAttempts(res.result.maxAttempts);
        }
        if (res.result.attemptsLeft !== undefined) {
          setAttemptsLeft(res.result.attemptsLeft);
        }
        if (res.result.cooldownHours) {
          setCooldownHours(res.result.cooldownHours);
        }
        if (res.result.cooldownSecondsLeft) {
          setCooldownCountdown(res.result.cooldownSecondsLeft);
        }

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
  };

  const handleSubmitQuiz = () => {
    setIsHonorModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Progress.Circular size="md" ariaLabel="Đang tạo phiên làm bài và tải câu hỏi" />
        <p aria-live="polite" className="text-sm text-muted-foreground font-semibold">
          Đang tạo phiên làm bài và tải câu hỏi…
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

    const isBlocked =
      error.includes("vượt qua") ||
      error.includes("hết lượt") ||
      error.includes("làm bài") ||
      error.includes("quay lại sau");
    if (isBlocked) {
      const isPassed = error.includes("vượt qua");
      return (
        <div
          className={`max-w-4xl mx-auto p-8 rounded-2xl text-center space-y-4 shadow-sm border ${
            isPassed
              ? "bg-success/10 border-success/30 text-success"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {isPassed ? (
            <CheckCircle2 aria-hidden="true" className="w-12 h-12 text-success mx-auto" />
          ) : (
            <AlertCircle aria-hidden="true" className="w-12 h-12 text-destructive mx-auto" />
          )}
          <h3 className="text-lg font-bold">
            {isPassed ? "Bài Thi Đã Hoàn Thành" : "Bài Thi Bị Khóa"}
          </h3>
          <p className="text-sm font-semibold leading-relaxed">{error}</p>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-center space-y-3 shadow-xs">
        <AlertTriangle aria-hidden="true" className="w-10 h-10 text-destructive mx-auto" />
        <p className="text-sm font-bold">{error}</p>
        <p className="text-xs text-muted-foreground">
          Vui lòng liên hệ giảng viên hoặc thiết lập cấu hình Ma trận đề thi cho bài thi này.
        </p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-2xl border border-dashed border-border text-center space-y-3">
        <p className="text-muted-foreground text-sm font-medium">
          Kho đề thi chưa có câu hỏi nào hoặc thiết lập không khớp.
        </p>
      </div>
    );
  }

  const answeredCount = selectedAnswers.filter((ans) => ans && ans.length > 0).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-2 sm:p-4">
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
            {!isPreviewMode && !isPractice && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  attemptsLeft <= 1
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : "bg-surface-container-high text-on-surface-variant border-outline-variant"
                }`}
              >
                Lượt: {attemptsLeft}/{maxAttempts}
              </span>
            )}
            <span className="tabular-nums">
              Đạt: {passingThreshold}% • {timeLimit}p{!isPractice && ` • Chờ: ${cooldownHours}h`}
            </span>
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
          {!isPreviewMode && !isPractice && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                attemptsLeft <= 1
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "bg-surface-container-high text-on-surface-variant border-outline-variant"
              }`}
            >
              Lượt làm còn lại: {attemptsLeft}/{maxAttempts}
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            Điểm đạt: {passingThreshold}% • Thời gian: {timeLimit} phút
            {!isPractice && ` • Thời gian chờ: ${cooldownHours} giờ`}
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

      {/* Active Cooldown Banner */}
      {cooldownCountdown > 0 && !isPreviewMode && !isPractice && (
        <div className="p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Clock aria-hidden="true" className="w-4 h-4 text-destructive" />
              <span>Thời gian chờ {cooldownHours} giờ đang kích hoạt</span>
            </h4>
            <span className="font-mono font-bold text-lg px-3 py-1 bg-destructive/20 rounded-xl">
              {formatCooldown(cooldownCountdown)}
            </span>
          </div>
          <p className="text-xs text-destructive/90">
            Bạn đã sử dụng hết {maxAttempts} lượt làm bài. Vui lòng xem lại tài liệu học tập và thử
            lại sau khi thời gian chờ kết thúc.
          </p>
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
                        disabled={(cooldownCountdown > 0 && !isPreviewMode) || quizResult !== null}
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
                      disabled={(cooldownCountdown > 0 && !isPreviewMode) || quizResult !== null}
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

      {/* Quiz Results Panel */}
      {quizResult && (
        <div
          className={`p-6 rounded-2xl border ${
            quizResult.passed
              ? "bg-success/10 border-success/30 text-success"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-current/10">
                {quizResult.passed ? (
                  <Check aria-hidden="true" className="w-5 h-5 text-success" />
                ) : (
                  <X aria-hidden="true" className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {quizResult.passed
                    ? "Chúc mừng! Bạn đã vượt qua bài thi"
                    : "Kết quả lần làm trước: Chưa đạt"}
                </h3>
                <p className="text-xs opacity-80">
                  Điểm số: {quizResult.scorePercent}% (Yêu cầu: {passingThreshold}%){" "}
                  {isPreviewMode
                    ? "(Xem trước)"
                    : `• Lượt làm bài còn lại: ${quizResult.attemptsLeft}/${maxAttempts}`}
                </p>
              </div>
            </div>
            <span className="text-2xl font-extrabold">{quizResult.scorePercent}%</span>
          </div>

          {quizResult.explanations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-current/10 space-y-1 text-xs">
              <h5 className="font-bold uppercase tracking-wider text-[10px] opacity-75">
                Phản hồi & Giải thích đáp án:
              </h5>
              <ul className="list-disc list-inside space-y-1">
                {quizResult.explanations.map((exp, idx) => {
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
            : "Điểm số cao nhất sẽ được lưu làm kết quả chính thức."}
        </p>

        <div className="flex items-center gap-3">
          {isPreviewMode && quizResult && (
            <Button type="button" variant="outlined" size="sm" onClick={handleResetPreview}>
              <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 mr-1.5" />
              Làm lại bài thi (Reset)
            </Button>
          )}
          {!isPreviewMode && quizResult && cooldownCountdown === 0 && attemptsLeft > 0 && (
            <Button type="button" variant="outlined" size="sm" onClick={handleRetryQuiz}>
              <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 mr-1.5" />
              Làm lại bài thi (Cải thiện điểm)
            </Button>
          )}
          {!quizResult && (
            <Button
              type="button"
              onClick={handleSubmitQuiz}
              disabled={isSubmitting || (cooldownCountdown > 0 && !isPreviewMode)}
              size="sm"
            >
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
          await executeSubmit();
          setIsHonorModalOpen(false);
        }}
        onClose={() => setIsHonorModalOpen(false)}
      />
    </div>
  );
}
