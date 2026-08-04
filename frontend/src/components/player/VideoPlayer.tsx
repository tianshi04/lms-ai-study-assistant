"use client";

import { RefObject, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { LearningItem, InVideoQuiz } from "@/gen/catalog/v1/catalog_pb";
import { GradedQuizRunner } from "@/components/assessment/GradedQuizRunner";
import { AutoGradedLabRunner } from "@/components/assessment/AutoGradedLabRunner";
import { PeerAssignmentWorkspace } from "@/components/assessment/PeerAssignmentWorkspace";
import {
  FileText,
  Check,
  Eye,
  ArrowRight,
  BookOpen,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

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

  // 1. Reading Item
  if (activeItem.type === 2) {
    return (
      <div className="w-full h-full overflow-y-auto p-8 bg-background text-foreground transition-colors duration-200">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Reading Header */}
          <div className="pb-4 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <FileText className="w-7 h-7 text-success" aria-hidden="true" />
              <span>{activeItem.title}</span>
              {isPreviewMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-warning/10 text-warning border border-warning/20 animate-pulse">
                  {"Xem trước"}
                </span>
              )}
            </h2>
          </div>

          {/* Reading Markdown Content */}
          <div className="max-w-none leading-relaxed text-sm space-y-4">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold text-foreground mt-6 mb-3">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-bold text-primary mt-5 mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-bold text-foreground mt-4 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-foreground/90 leading-relaxed my-2">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 space-y-1 my-3 text-foreground/90">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 space-y-1 my-3 text-foreground/90">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-success pl-4 py-2 italic bg-success/10 my-4 text-success rounded-r-lg border border-border">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-surface-container-highest text-foreground px-2 py-0.5 rounded font-mono text-xs border border-border">
                    {children}
                  </code>
                ),
              }}
            >
              {activeItem.readingMarkdown || "*Không có nội dung bài đọc.*"}
            </ReactMarkdown>
          </div>

          {/* Coursera-Style Bottom Mark as Complete Action Banner */}
          {!isPreviewMode && (
            <div className="pt-8 border-t border-border flex justify-end">
              <button
                onClick={() => onMarkComplete?.(activeItem.id)}
                disabled={isCompleted}
                className={`px-6 py-3 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                  isCompleted
                    ? "bg-success/10 text-success border border-success/30 cursor-default"
                    : "bg-success hover:bg-success-hover text-success-foreground shadow-md"
                }`}
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                {isCompleted ? "Đã Hoàn Thành Bài Đọc" : "Đánh dấu Hoàn Thành Bài Đọc này"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Graded / Practice Quiz Item
  if (activeItem.type === 3 || activeItem.type === 4) {
    return (
      <div className="w-full h-full overflow-y-auto p-6 bg-surface-container-low">
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
      <div className="w-full h-full overflow-y-auto p-6 bg-surface-container-lowest">
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
      <div className="w-full h-full overflow-y-auto p-6 bg-background">
        <PeerAssignmentWorkspace itemId={activeItem.id} title={activeItem.title} userId={userId} />
      </div>
    );
  }

  // SCORM Package Learning Item
  if ((activeItem.type as unknown as number) === 7) {
    return (
      <div className="w-full h-full flex flex-col bg-card transition-colors duration-200">
        {/* Header toolbar */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-warning" aria-hidden="true" />
              <span>{activeItem.title}</span>
              {isPreviewMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-warning/10 text-warning border border-warning/20 animate-pulse">
                  {"Xem trước"}
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              {"Trình phát học liệu tương tác SCORM 1.2"}
            </p>
          </div>
          {!isPreviewMode && (
            <button
              onClick={() => onMarkComplete?.(activeItem.id)}
              disabled={isCompleted}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isCompleted
                  ? "bg-success/10 text-success border border-success/20 cursor-default"
                  : "bg-success hover:bg-success/90 text-success-foreground shadow-md"
              }`}
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              {isCompleted ? "Đã Hoàn Thành" : "Đánh dấu Hoàn Thành"}
            </button>
          )}
        </div>

        {/* Iframe Viewport */}
        <div className="flex-1 w-full h-full min-h-[500px] relative bg-muted/50 p-2">
          {(activeItem as any).scormEntryHtml ? (
            <iframe
              key={activeItem.id}
              src={(activeItem as any).scormEntryHtml}
              className="w-full h-full border-0 rounded-2xl bg-card shadow-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-destructive font-bold bg-card rounded-2xl">
              {"Lỗi: Không tìm thấy tệp entry chạy chính của gói SCORM."}
            </div>
          )}
        </div>
      </div>
    );
  }

  function getYouTubeEmbedUrl(url: string, autoTranscribe: boolean = false): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const ccParam = autoTranscribe ? "&cc_load_policy=1" : "";
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}?enablejsapi=1${ccParam}`
      : null;
  }

  // 5. Video Item Default Fallback
  if (activeItem.type === 1 && activeItem.videoUrl) {
    const youtubeEmbedUrl = getYouTubeEmbedUrl(activeItem.videoUrl, activeItem.autoTranscribe);

    return (
      <div className="w-full h-full flex flex-col gap-3 min-h-0">
        <div className="w-full aspect-video max-h-[62vh] relative flex items-center justify-center bg-surface-container-high dark:bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-xs transition-all duration-200">
          {youtubeEmbedUrl ? (
            <iframe
              key={activeItem.id}
              src={youtubeEmbedUrl}
              className="w-full h-full border-0 rounded-2xl shadow-md"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              key={activeItem.id}
              ref={videoRef}
              src={activeItem.videoUrl}
              controls
              onTimeUpdate={onTimeUpdate}
              onSeeking={onSeeking}
              onEnded={() => onMarkComplete?.(activeItem.id)}
              className="w-full h-full object-contain rounded-2xl"
            />
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
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-surface-container-high border border-outline-variant rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-foreground">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
                    In-Video Quiz ({activeQuiz.timestampSeconds}s)
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
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
                      <button
                        key={idx}
                        disabled={quizSubmitted}
                        onClick={() => onSelectOption(idx)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${optionStyle}`}
                      >
                        <span>{option}</span>
                        {quizSubmitted && isCorrect && (
                          <Check className="w-4 h-4 text-success" aria-hidden="true" />
                        )}
                      </button>
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
                    <button
                      onClick={onSubmitQuiz}
                      disabled={selectedOption === null}
                      className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      {"Kiểm Tra Đáp Án"}
                    </button>
                  ) : (
                    <button
                      onClick={onContinueVideo}
                      className="px-5 py-2.5 rounded-full bg-success hover:bg-success-hover text-success-foreground font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {"Tiếp Tục Xem Video"}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
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

        {/* Coursera-style AI Learning Prompts Card ("Tìm hiểu sâu hơn về chủ đề này") */}
        <div className="w-full my-2 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-2xs transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <span className="text-xs font-bold text-on-surface">
                Tìm hiểu sâu hơn về chủ đề này
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              title={isExpanded ? "Thu gọn gợi ý AI" : "Mở rộng gợi ý AI"}
              aria-label={isExpanded ? "Thu gọn gợi ý AI" : "Mở rộng gợi ý AI"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {isExpanded && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {[
                "Cho tôi câu hỏi thực hành",
                "Giải thích chủ đề này bằng các thuật ngữ đơn giản",
                "Cho tôi một bản tóm tắt",
                "Cho tôi ví dụ thực tế",
              ].map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => onSelectAiPrompt?.(text)}
                  className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-primary-container text-on-surface hover:text-primary border border-outline-variant/40 hover:border-primary/40 transition-all cursor-pointer shadow-2xs leading-snug w-fit hover:scale-102 active:scale-98"
                >
                  <span>{text}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Flex Expanding Spacer: Co dãn lấp đầy khoảng trống giữa Tìm hiểu AI & Nút Bài tiếp theo */}
        <div className="flex-1 min-h-0" />

        {/* Next Lesson Action Button natively inside VideoPlayer - MD3 Soft Tonal Variant */}
        {nextItem && onNextLesson && (
          <div className="w-full flex items-center justify-end pt-2 pb-1 shrink-0">
            <button
              type="button"
              onClick={onNextLesson}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-container-high text-on-surface hover:bg-primary-container hover:text-primary border border-outline-variant/40 hover:border-primary/40 transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-102 active:scale-98 shrink-0"
              title="Chuyển sang bài học tiếp theo"
            >
              <span>{"Bài tiếp theo"}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-surface-container-low">
      {"Chọn bài học từ danh sách bên trái để bắt đầu."}
    </div>
  );
}
