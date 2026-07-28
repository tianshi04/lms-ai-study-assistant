"use client";

import React, { useState, useEffect } from "react";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { HonorCodeModal } from "./HonorCodeModal";

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
  userId?: string;
  onComplete?: () => void;
}

export function GradedQuizRunner({
  itemId,
  userId,
  onComplete,
}: GradedQuizRunnerProps) {
  const effectiveUserId = userId || (typeof window !== "undefined" ? localStorage.getItem("user_id") || "user-demo-1" : "user-demo-1");
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isHonorAgreed, setIsHonorAgreed] = useState(false);
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

  const [quizResult, setQuizResult] = useState<{
    scorePercent: number;
    passed: boolean;
    attemptsLeft: number;
    cooldownSecondsLeft: number;
    explanations: string[];
  } | null>(null);

  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0);

  // Fetch quiz session questions on load
  useEffect(() => {
    let ignore = false;
    async function loadQuiz() {
      setLoading(true);
      setError(null);
      try {
        const client = getRpcClient(AssessmentService);
        const res = await client.startGradedQuizSession({ itemId });
        if (!ignore) {
          setQuestions(res.questions || []);
          setSessionSeed(res.sessionSeed);
          setStartTimeIso(res.startTimeIso);
          setTimeLimit(res.timeLimitMinutes || 45);
          setPassingThreshold(res.passingThresholdPercent || 80.0);
          setSelectedAnswers(new Array(res.questions?.length || 0).fill(-1));
        }
      } catch (err: unknown) {
        console.error("Failed to start graded quiz session:", err);
        if (!ignore) {
          const errMsg = err instanceof Error ? err.message : "Không thể khởi động bài thi hoặc chưa cấu hình Ma trận đề.";
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
  }, [itemId]);

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

  const handleSubmitQuiz = async () => {
    if (!isHonorAgreed) {
      setIsHonorModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const client = getRpcClient(AssessmentService);
      const res = await client.submitGradedQuiz({
        itemId,
        selectedOptionIndexes: selectedAnswers,
        sessionSeed,
        startTimeIso,
      });

      if (res.result) {
        setQuizResult({
          scorePercent: res.result.scorePercent,
          passed: res.result.passed,
          attemptsLeft: res.result.attemptsLeft,
          cooldownSecondsLeft: res.result.cooldownSecondsLeft,
          explanations: res.result.answerExplanations,
        });
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        <p className="text-sm text-slate-500 font-semibold">Đang tạo phiên làm bài và tải câu hỏi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-200 text-center space-y-3 shadow-xs">
        <svg className="w-10 h-10 text-rose-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-sm font-bold">{error}</p>
        <p className="text-xs text-slate-400">Vui lòng liên hệ giảng viên hoặc thiết lập cấu hình Ma trận đề thi cho bài thi này.</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
        <p className="text-slate-500 text-sm font-medium">Kho đề thi chưa có câu hỏi nào hoặc thiết lập không khớp.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
              GRADED QUIZ
            </span>
            <span className="text-xs text-slate-400">Pass Threshold: {passingThreshold}% • Thời gian: {timeLimit} phút</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Supervised Machine Learning & Regression Quiz
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {isHonorAgreed ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 border border-emerald-200 dark:border-emerald-900/50">
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Honor Code Agreed</span>
            </span>
          ) : (
            <button
              onClick={() => setIsHonorModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>Confirm Honor Code</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Active Cooldown Banner */}
      {cooldownCountdown > 0 && (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>8-Hour Attempt Cooldown Active</span>
            </h4>
            <span className="font-mono font-bold text-lg px-3 py-1 bg-rose-100 dark:bg-rose-900/60 rounded-xl">
              {formatCooldown(cooldownCountdown)}
            </span>
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-300">
            You have used all 3 attempts. Please review the course materials and try again after the cooldown period expires.
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
              Q{qIdx + 1}. {q.text}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {q.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[qIdx] === optIdx;
                return (
                  <button
                    key={optIdx}
                    disabled={cooldownCountdown > 0}
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
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {quizResult.passed ? "Congratulations! Quiz Passed" : "Quiz Failed"}
                </h3>
                <p className="text-xs opacity-80">
                  Score: {quizResult.scorePercent}% (Required: {passingThreshold}%) • Attempts left: {quizResult.attemptsLeft}
                </p>
              </div>
            </div>
            <span className="text-2xl font-extrabold">{quizResult.scorePercent}%</span>
          </div>

          {quizResult.explanations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-current/10 space-y-1 text-xs">
              <h5 className="font-bold uppercase tracking-wider text-[10px] opacity-75">
                Answer Feedback & Explanations:
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
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-400">
          Highest score will be saved as official grade.
        </p>

        <button
          onClick={handleSubmitQuiz}
          disabled={isSubmitting || cooldownCountdown > 0}
          className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-2"
        >
          <span>{isSubmitting ? "Grading Answers..." : "Submit Graded Quiz"}</span>
          {!isSubmitting && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3 21l18-9L3 3l3 9zm0 0h75" />
            </svg>
          )}
        </button>
      </div>

      <HonorCodeModal
        itemId={itemId}
        userId={effectiveUserId}
        isOpen={isHonorModalOpen}
        onAgreed={() => {
          setIsHonorAgreed(true);
          setIsHonorModalOpen(false);
        }}
        onClose={() => setIsHonorModalOpen(false)}
      />
    </div>
  );
}
