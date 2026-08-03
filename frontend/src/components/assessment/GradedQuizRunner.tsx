"use client";

import React, { useState, useEffect } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { HonorCodeModal } from "./HonorCodeModal";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Check,
  ShieldCheck,
  Clock,
  X,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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
}

export function GradedQuizRunner({
  itemId,
  title,
  userId,
  onComplete,
  isPreviewMode = false,
}: GradedQuizRunnerProps) {
  const { userId: authUserId } = useAuth();
  const effectiveUserId = userId || authUserId || "user-demo-1";
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isHonorAgreed, setIsHonorAgreed] = useState(isPreviewMode);
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
  const [cooldownHours, setCooldownHours] = useState<number>(8);

  const [quizResult, setQuizResult] = useState<{
    scorePercent: number;
    passed: boolean;
    attemptsLeft: number;
    cooldownSecondsLeft: number;
    explanations: string[];
  } | null>(null);

  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0);

  // Keep isHonorAgreed updated when in preview mode
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isPreviewMode) {
      setIsHonorAgreed(true);
    }
  }, [isPreviewMode]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Fetch quiz session questions on load
  useEffect(() => {
    let ignore = false;
    async function loadQuiz() {
      setLoading(true);
      setError(null);
      try {
        const client = getRpcClient(AssessmentService);
        const res = await client.startGradedQuizSession({ itemId, preview: isPreviewMode });
        if (!ignore) {
          setQuestions(res.questions || []);
          setSessionSeed(res.sessionSeed);
          setStartTimeIso(res.startTimeIso);
          setTimeLimit(res.timeLimitMinutes || 45);
          setPassingThreshold(res.passingThresholdPercent || 80.0);
          setMaxAttempts(res.maxAttempts || 3);
          setCooldownHours(res.cooldownHours || 8);
          setSelectedAnswers(Array.from({ length: res.questions?.length || 0 }, () => -1));
          if ((res as { cooldownSecondsLeft?: number }).cooldownSecondsLeft) {
            setCooldownCountdown((res as { cooldownSecondsLeft?: number }).cooldownSecondsLeft!);
          }
        }
      } catch (err: unknown) {
        console.error("Failed to start graded quiz session:", err);
        if (!ignore) {
          const errMsg =
            err instanceof Error
              ? err.message
              : "Không thể khởi động bài thi hoặc chưa cấu hình Ma trận đề.";
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

  const handleOptionSelect = (qIdx: number, optIdx: number) => {
    const updated = [...selectedAnswers];
    updated[qIdx] = optIdx;
    setSelectedAnswers(updated);
  };

  const handleResetPreview = async () => {
    setQuizResult(null);
    setSubmitError(null);
    setSelectedAnswers(Array.from({ length: questions.length }, () => -1));
    setLoading(true);
    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.startGradedQuizSession({ itemId, preview: true });
      setQuestions(res.questions || []);
      setSessionSeed(res.sessionSeed);
      setStartTimeIso(res.startTimeIso);
      setTimeLimit(res.timeLimitMinutes || 45);
      setPassingThreshold(res.passingThresholdPercent || 80.0);
      setMaxAttempts(res.maxAttempts || 3);
      setCooldownHours(res.cooldownHours || 8);
      setSelectedAnswers(Array.from({ length: res.questions?.length || 0 }, () => -1));
      setCooldownCountdown(0);
    } catch (err) {
      console.error("Failed to reset preview session:", err);
      setError("Không thể tải lại phiên xem trước.");
    } finally {
      setLoading(false);
    }
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitGradedQuiz({
        itemId,
        selectedOptionIndexes: selectedAnswers,
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
        if (res.result.cooldownHours) {
          setCooldownHours(res.result.cooldownHours);
        }
        if (res.result.cooldownSecondsLeft) {
          setCooldownCountdown(res.result.cooldownSecondsLeft);
        }

        if (res.result.passed && onComplete) {
          onComplete();
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

  const handleSubmitQuiz = async () => {
    if (!isHonorAgreed && !isPreviewMode) {
      setIsHonorModalOpen(true);
      return;
    }
    await executeSubmit();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p aria-live="polite" className="text-sm text-muted-foreground font-semibold">
          Đang tạo phiên làm bài và tải câu hỏi…
        </p>
      </div>
    );
  }

  if (error) {
    const isBlocked =
      error.includes("vượt qua") || error.includes("hết lượt") || error.includes("làm bài");
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
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
          ) : (
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
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
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 bg-card border border-border rounded-2xl shadow-sm">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            {isPreviewMode ? (
              <Badge variant="verified">CHẾ ĐỘ XEM TRƯỚC (PREVIEW)</Badge>
            ) : (
              <Badge variant="warning">BÀI THI CÓ TÍNH ĐIỂM</Badge>
            )}
            <span className="text-xs text-muted-foreground tabular-nums">
              Điểm đạt: {passingThreshold}% • Thời gian: {timeLimit} phút • Lượt làm bài tối đa:{" "}
              {maxAttempts} • Thời gian chờ: {cooldownHours} giờ
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground mt-1">
            {title || "Bài thi trắc nghiệm"}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {isPreviewMode ? (
            <Badge variant="verified">Bypass Honor Code & Cooldown</Badge>
          ) : isHonorAgreed ? (
            <Badge
              variant="success"
              className="flex items-center gap-1"
              data-testid="honor-agreed-badge"
            >
              <Check className="w-3.5 h-3.5 text-success" />
              <span>Đã xác nhận Cam kết Trung thực</span>
            </Badge>
          ) : (
            <Button onClick={() => setIsHonorModalOpen(true)} variant="primary" size="sm">
              <span>Xác nhận Cam kết Trung thực</span>
              <ShieldCheck className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Cooldown Banner */}
      {cooldownCountdown > 0 && !isPreviewMode && (
        <div className="p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-destructive" />
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
        {questions.map((q, qIdx) => (
          <div
            key={q.questionId}
            className="p-5 rounded-2xl border border-border bg-muted/50 space-y-3"
          >
            <h4 className="text-sm font-bold text-foreground">
              Câu {qIdx + 1}. {q.text}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {q.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[qIdx] === optIdx;
                return (
                  <button
                    key={optIdx}
                    disabled={cooldownCountdown > 0 && !isPreviewMode}
                    onClick={() => handleOptionSelect(qIdx, optIdx)}
                    className={`p-3.5 rounded-xl text-xs text-left font-medium transition-all border flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                        : "bg-card border-border hover:border-primary/50 text-foreground"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    {opt.optionText}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
                  <Check className="w-5 h-5 text-success" />
                ) : (
                  <X className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {quizResult.passed ? "Chúc mừng! Bạn đã vượt qua bài thi" : "Kết quả: Chưa đạt"}
                </h3>
                <p className="text-xs opacity-80">
                  Điểm số: {quizResult.scorePercent}% (Yêu cầu: {passingThreshold}%){" "}
                  {isPreviewMode
                    ? "(Xem trước)"
                    : `• Lượt làm bài còn lại: ${quizResult.attemptsLeft}`}
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
                {quizResult.explanations.map((exp, idx) => (
                  <li key={idx}>{exp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Submission Error Banner */}
      {submitError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{submitError}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSubmitError(null)}
            className="text-destructive hover:text-destructive p-1 h-auto w-auto"
            aria-label="Close error message"
          >
            <X className="w-4 h-4" />
          </Button>
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
            <Button type="button" variant="outline" size="sm" onClick={handleResetPreview}>
              Làm lại bài thi (Reset)
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmitQuiz}
            isLoading={isSubmitting}
            disabled={cooldownCountdown > 0 && !isPreviewMode}
            size="sm"
          >
            {isSubmitting ? "Đang chấm điểm…" : "Nộp bài thi"}
            {!isSubmitting && <Send className="w-4 h-4 ml-1.5" />}
          </Button>
        </div>
      </div>

      <HonorCodeModal
        itemId={itemId}
        userId={effectiveUserId}
        isOpen={isHonorModalOpen}
        onAgreed={async () => {
          setIsHonorAgreed(true);
          // short delay to ensure badge appears before modal closes
          await new Promise((resolve) => setTimeout(resolve, 100));
          setIsHonorModalOpen(false);
        }}
        onClose={() => setIsHonorModalOpen(false)}
      />
    </div>
  );
}
