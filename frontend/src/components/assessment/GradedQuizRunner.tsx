"use client";

import React, { useState, useEffect } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { HonorCodeModal } from "./HonorCodeModal";
import { useAuth } from "@/components/providers/AuthProvider";

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        <p aria-live="polite" className="text-sm text-slate-500 font-semibold">
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
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-200"
          }`}
        >
          {isPassed ? (
            <svg
              className="w-12 h-12 text-emerald-500 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-12 h-12 text-rose-500 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m0-8v6m0 4h.01M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
              />
            </svg>
          )}
          <h3 className="text-lg font-bold">
            {isPassed ? "Bài Thi Đã Hoàn Thành" : "Bài Thi Bị Khóa"}
          </h3>
          <p className="text-sm font-semibold leading-relaxed">{error}</p>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-200 text-center space-y-3 shadow-xs">
        <svg
          className="w-10 h-10 text-rose-500 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-sm font-bold">{error}</p>
        <p className="text-xs text-slate-400">
          Vui lòng liên hệ giảng viên hoặc thiết lập cấu hình Ma trận đề thi cho bài thi này.
        </p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
        <p className="text-slate-500 text-sm font-medium">
          Kho đề thi chưa có câu hỏi nào hoặc thiết lập không khớp.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            {isPreviewMode ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50">
                CHẾ ĐỘ XEM TRƯỚC (PREVIEW)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                BÀI THI CÓ TÍNH ĐIỂM
              </span>
            )}
            <span className="text-xs text-slate-400 tabular-nums">
              Điểm đạt: {passingThreshold}% • Thời gian: {timeLimit} phút • Lượt làm bài tối đa:{" "}
              {maxAttempts} • Thời gian chờ: {cooldownHours} giờ
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {title || "Bài thi trắc nghiệm"}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {isPreviewMode ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/55">
              Bypass Honor Code & Cooldown
            </span>
          ) : isHonorAgreed ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 border border-emerald-200 dark:border-emerald-900/50">
              <svg
                className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Đã xác nhận Cam kết Trung thực</span>
            </span>
          ) : (
            <button
              onClick={() => setIsHonorModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>Xác nhận Cam kết Trung thực</span>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Active Cooldown Banner */}
      {cooldownCountdown > 0 && !isPreviewMode && (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <svg
                className="w-4 h-4 text-rose-600 dark:text-rose-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Thời gian chờ {cooldownHours} giờ đang kích hoạt</span>
            </h4>
            <span className="font-mono font-bold text-lg px-3 py-1 bg-rose-100 dark:bg-rose-900/60 rounded-xl">
              {formatCooldown(cooldownCountdown)}
            </span>
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-300">
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
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
          >
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
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
                    className={`p-3.5 rounded-xl text-xs text-left font-medium transition-all border flex items-center gap-2.5 ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 font-bold shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
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
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-current/10">
                {quizResult.passed ? (
                  <svg
                    className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-rose-600 dark:text-rose-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{submitError}</span>
          <button
            onClick={() => setSubmitError(null)}
            className="text-rose-500 hover:text-rose-700 p-1 rounded-lg transition-colors ml-2"
            aria-label="Close error message"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-400">
          {isPreviewMode
            ? "Chế độ xem trước (kết quả không lưu vào học bạ)."
            : "Điểm số cao nhất sẽ được lưu làm kết quả chính thức."}
        </p>

        <div className="flex items-center gap-3">
          {isPreviewMode && quizResult && (
            <button
              onClick={handleResetPreview}
              className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
            >
              Làm lại bài thi (Reset)
            </button>
          )}
          <button
            onClick={handleSubmitQuiz}
            disabled={isSubmitting || (cooldownCountdown > 0 && !isPreviewMode)}
            className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <span aria-live="polite">{isSubmitting ? "Đang chấm điểm…" : "Nộp bài thi"}</span>
            {!isSubmitting && (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3 21l18-9L3 3l3 9zm0 0h75"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <HonorCodeModal
        itemId={itemId}
        userId={effectiveUserId}
        isOpen={isHonorModalOpen}
        onAgreed={() => {
          setIsHonorAgreed(true);
          setIsHonorModalOpen(false);
          executeSubmit();
        }}
        onClose={() => setIsHonorModalOpen(false)}
      />
    </div>
  );
}
