"use client";

import { RefObject, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { LearningItem, InVideoQuiz } from "@/gen/catalog/v1/catalog_pb";
import { GradedQuizRunner } from "@/components/assessment/GradedQuizRunner";
import { AutoGradedLabRunner } from "@/components/assessment/AutoGradedLabRunner";
import { PeerAssignmentWorkspace } from "@/components/assessment/PeerAssignmentWorkspace";
import { parseVTT, type VTTCue } from "@/lib/vtt_parser";
import { FileText, Check, Eye, ArrowRight } from "lucide-react";

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  activeItem: LearningItem | null;
  userId?: string;
  activeQuiz: InVideoQuiz | null;
  selectedOption: number | null;
  quizSubmitted: boolean;
  completedItemIds?: string[];
  currentTime: number;
  onTimeUpdate: () => void;
  onSeeking?: () => void;
  onSelectOption: (index: number) => void;
  onSubmitQuiz: () => void;
  onContinueVideo: () => void;
  onMarkComplete?: (itemId: string) => void;
  isPreviewMode?: boolean;
}

export function VideoPlayer({
  videoRef,
  activeItem,
  userId,
  activeQuiz,
  selectedOption,
  quizSubmitted,
  completedItemIds = [],
  currentTime,
  onTimeUpdate,
  onSeeking,
  onSelectOption,
  onSubmitQuiz,
  onContinueVideo,
  onMarkComplete,
  isPreviewMode = false,
}: VideoPlayerProps) {
  const [cues, setCues] = useState<VTTCue[]>([]);
  const [prevActiveItemId, setPrevActiveItemId] = useState<string | null>(null);

  if (activeItem?.id !== prevActiveItemId) {
    setPrevActiveItemId(activeItem?.id || null);
    setCues([]);
  }

  useEffect(() => {
    if (!activeItem || activeItem.type !== 1 || !activeItem.vttSubtitleUrl) {
      return;
    }
    let isMounted = true;
    fetch(activeItem.vttSubtitleUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch subtitles");
        return res.text();
      })
      .then((text) => {
        if (!isMounted) return;
        const parsedCues = parseVTT(text);
        setCues(parsedCues);
      })
      .catch((err) => {
        console.error("Error fetching or parsing VTT:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [activeItem]);

  if (!activeItem) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
        {"Chọn bài học từ danh sách bên trái để bắt đầu."}
      </div>
    );
  }

  const isCompleted = completedItemIds.includes(activeItem.id);

  // 1. Reading Item
  if (activeItem.type === 2) {
    return (
      <div className="w-full h-full overflow-y-auto p-8 bg-card text-foreground transition-colors duration-200">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Reading Header */}
          <div className="pb-4 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <FileText className="w-7 h-7 text-success" />
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
                  <h1 className="text-xl font-bold text-foreground mt-6 mb-3 text-balance">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-bold text-primary mt-5 mb-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-bold text-foreground mt-4 mb-2">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-muted-foreground leading-relaxed my-2">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 space-y-1 my-3 text-muted-foreground">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-6 space-y-1 my-3 text-muted-foreground">
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
                  <code className="bg-muted text-foreground px-2 py-0.5 rounded font-mono text-xs border border-border">
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
                className={`px-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isCompleted
                    ? "bg-success/10 text-success border border-success/30 cursor-default"
                    : "bg-success hover:bg-success-hover text-success-foreground shadow-lg shadow-success/20"
                }`}
              >
                <Check className="w-4 h-4" />
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
      <div className="w-full h-full overflow-y-auto p-6 bg-background">
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
      <div className="w-full h-full overflow-y-auto p-6 bg-background">
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

  function getYouTubeEmbedUrl(url: string, autoTranscribe: boolean = false): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const ccParam = autoTranscribe ? "&cc_load_policy=1" : "";
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}?enablejsapi=1${ccParam}`
      : null;
  }

  const activeCue = cues.find((c) => currentTime >= c.startTime && currentTime <= c.endTime);

  // 5. Video Item Default Fallback
  if (activeItem.type === 1 && activeItem.videoUrl) {
    const youtubeEmbedUrl = getYouTubeEmbedUrl(activeItem.videoUrl, activeItem.autoTranscribe);

    return (
      <div className="w-full h-full relative flex items-center justify-center bg-card transition-colors duration-200">
        {youtubeEmbedUrl ? (
          <iframe
            key={activeItem.id}
            src={youtubeEmbedUrl}
            className="w-full h-full border-0 rounded-lg shadow-2xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <video
              key={activeItem.id}
              ref={videoRef}
              src={activeItem.videoUrl}
              controls
              onTimeUpdate={onTimeUpdate}
              onSeeking={onSeeking}
              onEnded={() => onMarkComplete?.(activeItem.id)}
              className="max-h-full max-w-full object-contain shadow-2xl rounded-lg border border-border"
            />
            {/* Custom Subtitles Overlay */}
            {activeCue && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-background/90 backdrop-blur-xs px-4 py-2.5 rounded-xl text-foreground text-xs sm:text-sm md:text-base font-bold text-center max-w-[85%] shadow-lg pointer-events-none transition-all z-20 border border-border">
                {activeCue.text}
              </div>
            )}
          </>
        )}

        {/* Floating Top Control Overlay for Video Mark as Complete */}
        {!isPreviewMode && (
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => onMarkComplete?.(activeItem.id)}
              disabled={isCompleted}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xl backdrop-blur-md flex items-center gap-2 cursor-pointer ${
                isCompleted
                  ? "bg-success text-success-foreground cursor-default"
                  : "bg-card hover:bg-card/90 text-foreground border border-border hover:border-success"
              }`}
            >
              <Check className="w-4 h-4 text-success" />
              {isCompleted ? "Đã Xem Video (>=80%)" : "Đánh dấu Xem Xong Video"}
            </button>
          </div>
        )}

        {/* Floating Top Left Control Overlay for Video Preview Mode */}
        {isPreviewMode && (
          <div className="absolute top-4 left-4 z-20">
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-warning text-warning-foreground shadow-lg flex items-center gap-1.5 animate-pulse">
              <Eye className="w-3.5 h-3.5" />
              <span>{"Chế độ Xem trước"}</span>
            </span>
          </div>
        )}

        {/* In-Video Quiz Overlay */}
        {activeQuiz && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-30 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
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
                  let optionStyle = "border-border hover:border-primary text-foreground";

                  if (quizSubmitted) {
                    if (isCorrect) {
                      optionStyle = "border-success bg-success/10 text-success font-bold";
                    } else if (isSelected && !isCorrect) {
                      optionStyle =
                        "border-destructive bg-destructive/10 text-destructive font-bold";
                    }
                  } else if (isSelected) {
                    optionStyle = "border-primary bg-primary/10 text-primary font-bold";
                  }

                  return (
                    <button
                      key={idx}
                      disabled={quizSubmitted}
                      onClick={() => onSelectOption(idx)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                    >
                      <span>{option}</span>
                      {quizSubmitted && isCorrect && <Check className="w-4 h-4 text-success" />}
                    </button>
                  );
                })}
              </div>

              {quizSubmitted && (
                <div className="p-3 rounded-xl bg-muted text-xs text-foreground space-y-1 border border-border">
                  <span className="font-bold text-primary">{"Giải thích: "}</span>
                  <span>{activeQuiz.explanation}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                {!quizSubmitted ? (
                  <button
                    onClick={onSubmitQuiz}
                    disabled={selectedOption === null}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground font-bold text-xs shadow-lg transition-all cursor-pointer"
                  >
                    {"Kiểm Tra Đáp Án"}
                  </button>
                ) : (
                  <button
                    onClick={onContinueVideo}
                    className="px-5 py-2.5 rounded-xl bg-success hover:bg-success-hover text-success-foreground font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {"Tiếp Tục Xem Video"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
      {"Chọn bài học từ danh sách bên trái để bắt đầu."}
    </div>
  );
}
