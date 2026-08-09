"use client";

import { RefObject, useState } from "react";
import Link from "next/link";
import { renderMarkdown } from "@/components/ai/AIChatMarkdownRenderer";
import type { LearningItem, InVideoQuiz } from "@/gen/catalog/v1/catalog_pb";
import { GradedQuizRunner } from "@/components/assessment/GradedQuizRunner";
import { AutoGradedLabRunner } from "@/components/assessment/AutoGradedLabRunner";
import { PeerAssignmentWorkspace } from "@/components/assessment/PeerAssignmentWorkspace";
import {
  FileText,
  Check,
  Eye,
  ArrowRight,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  activeItem: LearningItem | null;
  userId?: string;
  activeQuiz: InVideoQuiz | null;
  selectedOption: number | null;
  quizSubmitted: boolean;
  completedItemIds?: string[];
  currentTime?: number;
  onTimeUpdate: () => void;
  onSeeking?: () => void;
  onSelectOption: (index: number) => void;
  onSubmitQuiz: () => void;
  onContinueVideo: () => void;
  onMarkComplete?: (itemId: string) => void;
  isPreviewMode?: boolean;
  isPaidAccess?: boolean;
  onSelectAiPrompt?: (promptText: string) => void;
  nextItem?: LearningItem | null;
  onNextLesson?: () => void;
}

export function VideoPlayer({
  videoRef,
  activeItem,
  userId,
  activeQuiz,
  selectedOption,
  quizSubmitted,
  completedItemIds = [],
  currentTime: _currentTime,
  onTimeUpdate,
  onSeeking,
  onSelectOption,
  onSubmitQuiz,
  onContinueVideo,
  onMarkComplete,
  isPreviewMode = false,
  isPaidAccess = true,
  onSelectAiPrompt,
  nextItem,
  onNextLesson,
}: VideoPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!activeItem) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-surface-container-low">
        {"Chọn bài học từ danh sách bên trái để bắt đầu."}
      </div>
    );
  }

  const isCompleted = completedItemIds.includes(activeItem.id);

  function getYouTubeEmbedUrl(url: string, autoTranscribe: boolean = false): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const ccParam = autoTranscribe ? "&cc_load_policy=1" : "";
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}?enablejsapi=1${ccParam}`
      : null;
  }

  function renderLessonContent() {
    if (!activeItem) return null;

    // 0. Audit Mode Check for Graded Items (type 4: GRADED_QUIZ, 5: AUTO_GRADED_LAB, 6: PEER_REVIEW)
    if (
      !isPaidAccess &&
      !isPreviewMode &&
      (activeItem.type === 4 || activeItem.type === 5 || activeItem.type === 6)
    ) {
      return (
        <div className="w-full min-h-[400px] p-6 sm:p-10 flex flex-col items-center justify-center text-center bg-surface-container-low text-on-surface rounded-2xl border border-border shadow-xs space-y-6 animate-in fade-in duration-m3-short-4">
          <div className="w-16 h-16 rounded-full bg-warning/15 text-warning flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8 stroke-[2.5]" aria-hidden="true" />
          </div>

          <div className="max-w-md space-y-2">
            <Badge variant="warning">CHẾ ĐỘ AUDIT (MIỄN PHÍ)</Badge>
            <h3 className="text-xl font-extrabold text-foreground tracking-tight">
              Bài kiểm tra tính điểm đã bị khóa
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tài khoản của bạn đang ở chế độ Audit Mode (Miễn phí). Vui lòng nâng cấp Coursera Plus
              hoặc mua khóa học / sử dụng mã Enterprise Key / Hỗ trợ tài chính để làm bài kiểm tra
              tính điểm này.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/my-purchases"
              className="px-6 py-3 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 fill-current" aria-hidden="true" />
              Nâng cấp Coursera Plus ngay
            </Link>
          </div>
        </div>
      );
    }

    // 1. Reading Item
    if (activeItem.type === 2) {
      return (
        <div className="w-full p-6 sm:p-8 bg-surface-container-lowest text-on-surface transition-colors duration-m3-short-4 ease-m3-emphasized rounded-2xl">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Reading Header */}
            <div className="pb-4 border-b border-border">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <FileText className="w-7 h-7 text-success" aria-hidden="true" />
                <span>{activeItem.title}</span>
                {isPreviewMode && <Badge variant="warning">{"Xem trước"}</Badge>}
              </h2>
            </div>

            {/* Reading Markdown Content */}
            <div className="max-w-none leading-relaxed text-sm space-y-4">
              {renderMarkdown(activeItem.readingMarkdown || "*Không có nội dung bài đọc.*")}
            </div>

            {/* Coursera-Style Bottom Mark as Complete Action Banner */}
            {!isPreviewMode && (
              <div className="pt-8 border-t border-border flex justify-end">
                <Button
                  type="button"
                  onClick={() => onMarkComplete?.(activeItem.id)}
                  disabled={isCompleted}
                  className={`px-6 py-3 rounded-full text-xs font-bold ${
                    isCompleted
                      ? "bg-success/10 text-success border border-success/30 cursor-default"
                      : "bg-success hover:bg-success-hover text-success-foreground shadow-md"
                  }`}
                >
                  <Check className="w-4 h-4" aria-hidden="true" />
                  {isCompleted ? "Đã Hoàn Thành Bài Đọc" : "Đánh dấu Hoàn Thành Bài Đọc này"}
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 2. Graded / Practice Quiz Item
    if (activeItem.type === 3 || activeItem.type === 4) {
      return (
        <div className="w-full p-4 sm:p-6 bg-surface-container-low rounded-2xl">
          <GradedQuizRunner
            itemId={activeItem.id}
            title={activeItem.title}
            userId={userId}
            onComplete={() => onMarkComplete?.(activeItem.id)}
            isPreviewMode={isPreviewMode}
          />
        </div>
      );
    }

    // 3. Auto-Graded Lab Item
    if (activeItem.type === 5) {
      return (
        <div className="w-full p-4 sm:p-6 bg-surface-container-lowest rounded-2xl">
          <AutoGradedLabRunner
            itemId={activeItem.id}
            title={activeItem.title}
            starterCode={activeItem.starterCode}
            language={activeItem.language}
            userId={userId}
            onComplete={() => onMarkComplete?.(activeItem.id)}
          />
        </div>
      );
    }

    // 4. Peer Review Item
    if (activeItem.type === 6) {
      return (
        <div className="w-full p-4 sm:p-6 bg-surface-container-lowest text-on-surface rounded-2xl">
          <PeerAssignmentWorkspace
            itemId={activeItem.id}
            title={activeItem.title}
            userId={userId}
          />
        </div>
      );
    }

    // 5. Video Item Default Fallback
    const youtubeEmbedUrl = activeItem.videoUrl
      ? getYouTubeEmbedUrl(activeItem.videoUrl, activeItem.autoTranscribe)
      : null;

    return (
      <div className="w-full flex flex-col gap-3 min-h-0">
        <div className="w-full aspect-video max-h-[62vh] relative flex items-center justify-center bg-surface-container-high rounded-2xl overflow-hidden shadow-xs transition-colors duration-m3-short-4 ease-m3-emphasized">
          {youtubeEmbedUrl ? (
            <iframe
              key={activeItem.id}
              src={youtubeEmbedUrl}
              title={activeItem.title || "Video bài giảng"}
              className="w-full h-full border-0 rounded-2xl shadow-md"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              key={activeItem.id}
              ref={videoRef}
              src={activeItem.videoUrl || undefined}
              controls
              onTimeUpdate={onTimeUpdate}
              onSeeking={onSeeking}
              onEnded={() => onMarkComplete?.(activeItem.id)}
              aria-label={activeItem.title || "Video bài giảng"}
              className="w-full h-full object-contain rounded-2xl"
            >
              <track
                kind="captions"
                src={(activeItem as any).captionUrl || undefined}
                label="Phụ đề"
              />
            </video>
          )}

          {/* Floating Top Left Control Overlay for Video Preview Mode */}
          {isPreviewMode && (
            <div className="absolute top-4 left-4 z-20">
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-warning text-warning-foreground shadow-lg flex items-center gap-1.5 animate-pulse">
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{"Chế độ Xem trước"}</span>
              </span>
            </div>
          )}

          {/* In-Video Quiz Overlay */}
          {activeQuiz && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center p-6 animate-in fade-in duration-m3-short-4 ease-m3-decelerate">
              <div className="bg-surface-container-high border border-outline-variant rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-foreground">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
                    In-Video Quiz ({activeQuiz.timestampSeconds}s)
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {"Dừng video để kiểm tra"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-foreground">{activeQuiz.question}</h3>

                <div className="space-y-2">
                  {activeQuiz.options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === activeQuiz.correctOptionIndex;
                    let optionStyle =
                      "border-border hover:border-primary text-foreground bg-background";

                    if (quizSubmitted) {
                      if (isCorrect) {
                        optionStyle = "border-success bg-success/15 text-success font-bold";
                      } else if (isSelected && !isCorrect) {
                        optionStyle =
                          "border-destructive bg-destructive/15 text-destructive font-bold";
                      }
                    } else if (isSelected) {
                      optionStyle =
                        "border-primary bg-primary-container text-on-primary-container font-bold";
                    }

                    return (
                      <Button
                        key={idx}
                        type="button"
                        variant="outlined"
                        disabled={quizSubmitted}
                        onClick={() => onSelectOption(idx)}
                        className={`w-full text-left p-3 rounded-xl border text-xs h-auto justify-between ${optionStyle}`}
                      >
                        <span>{option}</span>
                        {quizSubmitted && isCorrect && (
                          <Check className="w-4 h-4 text-success" aria-hidden="true" />
                        )}
                      </Button>
                    );
                  })}
                </div>

                {quizSubmitted && (
                  <div className="p-3 rounded-xl bg-surface-container-highest text-xs text-foreground space-y-1">
                    <span className="font-bold text-primary">{"Giải thích: "}</span>
                    <span>{activeQuiz.explanation}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  {!quizSubmitted ? (
                    <Button
                      type="button"
                      onClick={onSubmitQuiz}
                      disabled={selectedOption === null}
                      className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground font-bold text-xs shadow-md"
                    >
                      {"Kiểm Tra Đáp Án"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={onContinueVideo}
                      className="px-5 py-2.5 rounded-full bg-success hover:bg-success-hover text-success-foreground font-bold text-xs shadow-md"
                    >
                      {"Tiếp Tục Xem Video"}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Lesson Title under video */}
        <div className="w-full px-1 py-1">
          <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
            {activeItem.title}
          </h1>
        </div>

        {/* Coursera-style AI Learning Prompts Card ("Tìm hiểu sâu hơn về chủ đề này") - Only for Video Items */}
        <Card variant="elevated" className="w-full my-1 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <span className="text-xs font-bold text-on-surface">
                Tìm hiểu sâu hơn về chủ đề này
              </span>
            </div>
            <IconButton
              type="button"
              variant="standard"
              size="xs"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1 h-7 w-7 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              title={isExpanded ? "Thu gọn gợi ý AI" : "Mở rộng gợi ý AI"}
              aria-label={isExpanded ? "Thu gọn gợi ý AI" : "Mở rộng gợi ý AI"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </IconButton>
          </div>

          {isExpanded && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {[
                "Cho tôi câu hỏi thực hành",
                "Giải thích chủ đề này bằng các thuật ngữ đơn giản",
                "Cho tôi một bản tóm tắt",
                "Cho tôi ví dụ thực tế",
              ].map((text) => (
                <Button
                  key={text}
                  type="button"
                  variant="outlined"
                  size="sm"
                  onClick={() => onSelectAiPrompt?.(text)}
                  className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-primary-container text-on-surface hover:text-primary border-outline-variant/40 hover:border-primary/40 shadow-2xs leading-snug w-fit h-auto"
                >
                  <span>{text}</span>
                </Button>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-3 min-h-0">
      {/* Top Lesson Content Area */}
      <div className="w-full flex-1 min-h-0 overflow-y-auto">{renderLessonContent()}</div>

      {/* Next Lesson Action Button Container - Lifted up 1 layout level to be available on EVERY lesson item */}
      {nextItem && onNextLesson && (
        <div className="w-full flex items-center justify-end pt-1 pb-1 shrink-0">
          <Button
            type="button"
            variant="text"
            onClick={onNextLesson}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-container-high text-on-surface hover:bg-primary-container hover:text-primary border border-outline-variant/40 hover:border-primary/40 transition-colors shadow-2xs hover:scale-102 active:scale-98 shrink-0"
            title="Chuyển sang bài học tiếp theo"
          >
            <span>{"Bài tiếp theo"}</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
