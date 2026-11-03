"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Chip } from "@/components/ui/Chip";
import { Progress } from "@/components/ui/Progress";
import { getRpcClient } from "@/lib/connect_client";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import {
  GetQuizAttemptHistoryResponse,
  GetQuizAttemptDetailResponse,
  TopicMasteryLevel,
} from "@/gen/assessment/v1/assessment_pb";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye,
  HelpCircle,
  History,
  Lightbulb,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  XCircle,
  Award,
} from "lucide-react";

interface QuizHistoryDialogProps {
  itemId: string;
  quizTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetakeQuiz?: () => void;
}

export function QuizHistoryDialog({
  itemId,
  quizTitle,
  open,
  onOpenChange,
  onRetakeQuiz,
}: QuizHistoryDialogProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<GetQuizAttemptHistoryResponse | null>(null);
  const [detailData, setDetailData] = useState<GetQuizAttemptDetailResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // Filters for detail view
  const [onlyIncorrectFilter, setOnlyIncorrectFilter] = useState(false);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>("ALL");

  // Load history when dialog opens
  useEffect(() => {
    if (!open) {
      setSelectedSubmissionId(null);
      setDetailData(null);
      return;
    }

    let isMounted = true;
    async function fetchHistory() {
      setLoadingHistory(true);
      setErrorHistory(null);
      try {
        const client = getRpcClient(AssessmentService);
        const res = await client.getQuizAttemptHistory({ itemId });
        if (isMounted) {
          setHistoryData(res);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Failed to load quiz history:", err);
          setErrorHistory(
            err instanceof Error ? err.message : "Không thể tải lịch sử làm bài thi.",
          );
        }
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [open, itemId]);

  // Load detail when a submission is selected
  useEffect(() => {
    if (!selectedSubmissionId) {
      setDetailData(null);
      return;
    }

    let isMounted = true;
    async function fetchDetail() {
      setLoadingDetail(true);
      setErrorDetail(null);
      try {
        const client = getRpcClient(AssessmentService);
        const res = await client.getQuizAttemptDetail({
          submissionId: selectedSubmissionId!,
        });
        if (isMounted) {
          setDetailData(res);
          setOnlyIncorrectFilter(false);
          setSelectedTopicFilter("ALL");
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Failed to load quiz attempt detail:", err);
          setErrorDetail(err instanceof Error ? err.message : "Không thể tải chi tiết bài làm.");
        }
      } finally {
        if (isMounted) setLoadingDetail(false);
      }
    }

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedSubmissionId]);

  const formatDate = (isoString: string) => {
    if (!isoString) return "--";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getMasteryColorTokens = (level: TopicMasteryLevel) => {
    switch (level) {
      case TopicMasteryLevel.MASTERED:
        return {
          bg: "bg-success",
          bgLight: "bg-success/15",
          text: "text-success",
          label: "Đã vững kiến thức",
        };
      case TopicMasteryLevel.NEEDS_PRACTICE:
        return {
          bg: "bg-warning",
          bgLight: "bg-warning/15",
          text: "text-warning",
          label: "Cần củng cố thêm",
        };
      case TopicMasteryLevel.WEAK_GAP:
      default:
        return {
          bg: "bg-destructive",
          bgLight: "bg-destructive/15",
          text: "text-destructive",
          label: "Lỗ hổng trọng tâm",
        };
    }
  };

  // Filtered answers in detail view
  const filteredAnswers = (detailData?.answers || []).filter((ans) => {
    if (onlyIncorrectFilter && ans.isCorrect) return false;
    if (selectedTopicFilter !== "ALL" && ans.topic !== selectedTopicFilter) return false;
    return true;
  });

  const incorrectCount = (detailData?.answers || []).filter((ans) => !ans.isCorrect).length;
  const uniqueTopics = Array.from(new Set((detailData?.answers || []).map((a) => a.topic)));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup size="2xl" className="max-h-[88vh] flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border bg-surface-container-high/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {selectedSubmissionId && (
                <IconButton
                  aria-label="Quay lại danh sách lần làm bài"
                  variant="standard"
                  size="sm"
                  onClick={() => setSelectedSubmissionId(null)}
                  className="rounded-full"
                >
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </IconButton>
              )}
              <div>
                <h3 className="text-lg font-extrabold text-foreground tracking-tight">
                  {selectedSubmissionId
                    ? `Chi tiết bài thi - Lần ${detailData?.attemptNumber || ""}`
                    : "Lịch sử làm bài & Phân tích năng lực"}
                </h3>
                <p className="text-xs text-muted-foreground truncate max-w-md">
                  {quizTitle || "Bài kiểm tra"}
                </p>
              </div>
            </div>

            <Dialog.Close />
          </div>

          {/* Scrollable Container Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* VIEW 1: LỊCH SỬ TỔNG QUAN & CÁC LẦN LÀM BÀI */}
            {!selectedSubmissionId && (
              <>
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <Progress.Circular size="md" ariaLabel="Đang tải lịch sử bài thi" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Đang tổng hợp dữ liệu lịch sử thi…
                    </p>
                  </div>
                ) : errorHistory ? (
                  <div className="p-4 rounded-2xl bg-destructive/10 text-destructive text-center space-y-2">
                    <XCircle className="w-8 h-8 mx-auto" />
                    <p className="text-sm font-semibold">{errorHistory}</p>
                  </div>
                ) : !historyData || historyData.attempts.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto text-muted-foreground">
                      <History className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-foreground">
                        Chưa có lịch sử làm bài nào
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Bạn chưa nộp bài thi nào cho bài học này. Hãy bắt đầu làm bài để ghi nhận
                        kết quả và nhận phân tích năng lực.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Quota & Best Score Overview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-surface-container-high/40 border border-outline-variant/50 space-y-1">
                        <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-primary" /> Điểm cao nhất
                        </span>
                        <p className="text-lg font-black text-foreground">
                          {historyData.highestScorePercent}%
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-surface-container-high/40 border border-outline-variant/50 space-y-1">
                        <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-primary" /> Ngưỡng đạt
                        </span>
                        <p className="text-lg font-black text-foreground">
                          {historyData.passingThresholdPercent}%
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-surface-container-high/40 border border-outline-variant/50 space-y-1">
                        <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-primary" /> Đã làm
                        </span>
                        <p className="text-lg font-black text-foreground">
                          {historyData.attempts.length} lần
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-surface-container-high/40 border border-outline-variant/50 space-y-1">
                        <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-primary" /> Lượt còn lại
                        </span>
                        <p className="text-lg font-black text-foreground">
                          {historyData.attemptsLeft >= 999
                            ? "Không giới hạn"
                            : `${historyData.attemptsLeft}/${historyData.maxAttempts}`}
                        </p>
                      </div>
                    </div>

                    {/* Aggregate Topic Mastery Diagnostics */}
                    {historyData.aggregateTopicMastery &&
                      historyData.aggregateTopicMastery.length > 0 && (
                        <div className="p-5 rounded-2xl bg-surface-container-high/30 border border-outline-variant/40 space-y-4">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <h4 className="text-sm font-bold text-foreground">
                              Chẩn đoán năng lực tổng thể theo chủ đề
                            </h4>
                          </div>

                          <div className="space-y-3">
                            {historyData.aggregateTopicMastery.map((tm) => {
                              const style = getMasteryColorTokens(tm.masteryLevel);
                              return (
                                <div key={tm.topic} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-foreground">
                                      {tm.topic}
                                    </span>
                                    <span className={`font-bold ${style.text}`}>
                                      {tm.correctQuestions}/{tm.totalQuestions} câu (
                                      {tm.masteryPercent}%)
                                    </span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-surface-container-highest overflow-hidden">
                                    <div
                                      className={`h-full ${style.bg} transition-all duration-500`}
                                      style={{ width: `${Math.min(100, tm.masteryPercent)}%` }}
                                    />
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    {tm.recommendation}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {/* Attempts Table List */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" /> Danh sách các lần thi
                      </h4>

                      <div className="space-y-2">
                        {historyData.attempts.map((att) => (
                          <div
                            key={att.submissionId}
                            className="p-4 rounded-2xl bg-card border border-border/80 hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                                  att.passed
                                    ? "bg-success/15 text-success"
                                    : "bg-warning/15 text-warning"
                                }`}
                              >
                                {att.attemptNumber}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-bold text-foreground">
                                    Lần {att.attemptNumber}: {att.scorePercent}%
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                      att.passed
                                        ? "bg-success/20 text-success"
                                        : "bg-warning/20 text-warning"
                                    }`}
                                  >
                                    {att.passed ? "ĐẠT" : "CHƯA ĐẠT"}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                  <span>
                                    Đúng {att.correctCount}/{att.totalQuestions} câu
                                  </span>
                                  <span>•</span>
                                  <span>{formatDate(att.submittedAt)}</span>
                                </p>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="tonal"
                              size="sm"
                              onClick={() => setSelectedSubmissionId(att.submissionId)}
                              className="rounded-full text-xs font-bold gap-1 self-end sm:self-center"
                            >
                              <Eye className="w-3.5 h-3.5" /> Xem chi tiết
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* VIEW 2: CHI TIẾT BÀI NỘP CỦA LẦN THI ĐÃ CHỌN */}
            {selectedSubmissionId && (
              <>
                {loadingDetail ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <Progress.Circular size="md" ariaLabel="Đang tải chi tiết bài làm" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Đang lấy dữ liệu chi tiết từng câu hỏi…
                    </p>
                  </div>
                ) : errorDetail ? (
                  <div className="p-4 rounded-2xl bg-destructive/10 text-destructive text-center space-y-2">
                    <XCircle className="w-8 h-8 mx-auto" />
                    <p className="text-sm font-semibold">{errorDetail}</p>
                    <Button
                      type="button"
                      variant="outlined"
                      size="sm"
                      onClick={() => setSelectedSubmissionId(null)}
                      className="rounded-full text-xs font-semibold"
                    >
                      Quay lại
                    </Button>
                  </div>
                ) : !detailData ? null : (
                  <div className="space-y-6">
                    {/* Detail Summary Card */}
                    <div
                      className={`p-5 rounded-2xl border ${
                        detailData.passed
                          ? "bg-success/10 border-success/30 text-success"
                          : "bg-warning/10 border-warning/30 text-warning"
                      } flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black">
                            Kết quả: {detailData.scorePercent}%
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              detailData.passed
                                ? "bg-success/20 text-success"
                                : "bg-warning/20 text-warning"
                            }`}
                          >
                            {detailData.passed ? "ĐÃ ĐẠT" : "CHƯA ĐẠT"}
                          </span>
                        </div>
                        <p className="text-xs opacity-90">
                          Nộp lúc: {formatDate(detailData.submittedAt)} • Lần thi thứ{" "}
                          {detailData.attemptNumber}
                        </p>
                      </div>

                      {onRetakeQuiz && (
                        <Button
                          type="button"
                          variant="filled"
                          size="sm"
                          onClick={() => {
                            onOpenChange(false);
                            onRetakeQuiz();
                          }}
                          className="rounded-full text-xs font-bold gap-1.5 self-start sm:self-center"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Làm lại bài thi
                        </Button>
                      )}
                    </div>

                    {/* Academic Masking Notice Banner */}
                    {detailData.isAnswerMasked && (
                      <div className="p-4 rounded-2xl bg-info/10 border border-info/30 text-info space-y-2 flex items-start gap-3 shadow-xs">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs">
                          <h5 className="font-bold">Chính sách bảo mật học thuật</h5>
                          <p className="leading-relaxed opacity-90">
                            Đáp án chính xác và lời giải chi tiết được ẩn nhằm đảm bảo tính công
                            bằng vì bạn vẫn còn lượt thi. Bạn vẫn có thể xem câu nào đúng/sai và
                            chẩn đoán chủ đề dưới đây để ôn tập trước khi thi lại!
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Topic Mastery of this Attempt */}
                    {detailData.topicMastery && detailData.topicMastery.length > 0 && (
                      <div className="p-4 rounded-2xl bg-surface-container-high/40 border border-outline-variant/40 space-y-3">
                        <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" /> Phân tích chủ đề của lần
                          thi này:
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {detailData.topicMastery.map((tm) => {
                            const style = getMasteryColorTokens(tm.masteryLevel);
                            return (
                              <div
                                key={tm.topic}
                                className="p-3 rounded-xl bg-card border border-border/60 space-y-1 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-foreground truncate">
                                    {tm.topic}
                                  </span>
                                  <span className={`font-black ${style.text}`}>
                                    {tm.masteryPercent}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-surface-container-highest overflow-hidden">
                                  <div
                                    className={`h-full ${style.bg}`}
                                    style={{ width: `${Math.min(100, tm.masteryPercent)}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {tm.recommendation}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Chip
                          variant="filter"
                          selected={!onlyIncorrectFilter}
                          onClick={() => setOnlyIncorrectFilter(false)}
                          className="text-xs h-7"
                        >
                          Tất cả ({detailData.answers.length})
                        </Chip>
                        <Chip
                          variant="filter"
                          selected={onlyIncorrectFilter}
                          onClick={() => setOnlyIncorrectFilter(true)}
                          className={`text-xs h-7 ${
                            onlyIncorrectFilter
                              ? "bg-destructive/20 text-destructive border-destructive/40"
                              : ""
                          }`}
                        >
                          Chỉ câu sai ({incorrectCount})
                        </Chip>
                      </div>

                      {uniqueTopics.length > 1 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            Chủ đề:
                          </span>
                          <Chip
                            variant="filter"
                            selected={selectedTopicFilter === "ALL"}
                            onClick={() => setSelectedTopicFilter("ALL")}
                            className="text-xs h-7"
                          >
                            Tất cả ({uniqueTopics.length})
                          </Chip>
                          {uniqueTopics.map((topic) => (
                            <Chip
                              key={topic}
                              variant="filter"
                              selected={selectedTopicFilter === topic}
                              onClick={() => setSelectedTopicFilter(topic)}
                              className="text-xs h-7"
                            >
                              {topic}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Empty State when no questions match filter */}
                    {filteredAnswers.length === 0 && (
                      <div className="py-12 text-center space-y-2 rounded-2xl bg-surface-container-high/30 border border-outline-variant/40 p-6">
                        <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
                        <h5 className="text-sm font-bold text-foreground">
                          Không có câu hỏi nào trong bộ lọc này
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          {onlyIncorrectFilter
                            ? "Tuyệt vời! Bạn không làm sai câu nào trong phạm vi bài thi này."
                            : "Không tìm thấy câu hỏi thuộc chủ đề đã chọn."}
                        </p>
                      </div>
                    )}

                    {/* Question by Question Review */}
                    <div className="space-y-4">
                      {filteredAnswers.map((ans) => {
                        return (
                          <div
                            key={ans.questionId}
                            className={`p-5 rounded-2xl border transition-all space-y-4 ${
                              ans.isCorrect
                                ? "bg-card border-border/80"
                                : "bg-destructive/5 border-destructive/25"
                            }`}
                          >
                            {/* Question Header */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                                    ans.isCorrect
                                      ? "bg-success/15 text-success"
                                      : "bg-destructive/15 text-destructive"
                                  }`}
                                >
                                  {ans.isCorrect ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3.5 h-3.5" /> Chưa chính xác
                                    </>
                                  )}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground">
                                  Câu {ans.orderIndex + 1}
                                </span>
                              </div>

                              {ans.topic && (
                                <span className="text-[11px] font-medium text-muted-foreground bg-surface-container-high/60 px-2 py-0.5 rounded-md border border-outline-variant/40">
                                  {ans.topic}
                                </span>
                              )}
                            </div>

                            {/* Question Text */}
                            <p className="text-sm sm:text-base font-bold text-foreground leading-relaxed whitespace-pre-line">
                              {ans.questionText}
                            </p>

                            {/* Options List */}
                            <div className="space-y-2">
                              {ans.options.map((optText, optIdx) => {
                                const isUserSelected = ans.selectedOptionIndices.includes(optIdx);
                                const isCorrectAnswer = ans.correctOptionIndices.includes(optIdx);

                                let optionClass =
                                  "bg-surface-container-high/40 border-outline-variant/40 text-foreground";
                                if (isUserSelected) {
                                  if (ans.isCorrect) {
                                    optionClass =
                                      "bg-success/15 border-success/50 text-success font-semibold";
                                  } else {
                                    optionClass =
                                      "bg-destructive/15 border-destructive/50 text-destructive font-semibold";
                                  }
                                } else if (isCorrectAnswer && !detailData.isAnswerMasked) {
                                  optionClass =
                                    "bg-success/10 border-success/40 text-success font-semibold";
                                }

                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 transition-all ${optionClass}`}
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      {isUserSelected ? (
                                        ans.isCorrect ? (
                                          <CheckCircle2 className="w-4 h-4 text-success" />
                                        ) : (
                                          <XCircle className="w-4 h-4 text-destructive" />
                                        )
                                      ) : isCorrectAnswer && !detailData.isAnswerMasked ? (
                                        <CheckCircle2 className="w-4 h-4 text-success" />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full border border-outline-variant/60" />
                                      )}
                                    </div>
                                    <span className="flex-1 leading-relaxed">{optText}</span>
                                    {isUserSelected && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-current/15 shrink-0">
                                        Lựa chọn của bạn
                                      </span>
                                    )}
                                    {!isUserSelected &&
                                      isCorrectAnswer &&
                                      !detailData.isAnswerMasked && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-success/20 text-success shrink-0">
                                          Đáp án đúng
                                        </span>
                                      )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation Callout */}
                            {!detailData.isAnswerMasked && ans.explanation && (
                              <div className="p-3.5 rounded-xl bg-surface-container-high/50 border border-outline-variant/50 space-y-1 text-xs">
                                <span className="font-bold text-primary flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                  <Lightbulb className="w-3.5 h-3.5" /> Lời giải thích:
                                </span>
                                <p className="text-muted-foreground leading-relaxed pl-5 whitespace-pre-line">
                                  {ans.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border bg-surface-container-high/40 flex items-center justify-between shrink-0">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Hệ thống đánh giá năng lực thích ứng
            </span>
            <Button
              type="button"
              variant="outlined"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-full text-xs font-semibold"
            >
              Đóng
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
