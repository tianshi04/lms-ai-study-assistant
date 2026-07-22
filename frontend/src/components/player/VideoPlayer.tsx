"use client";

import { RefObject } from "react";
import ReactMarkdown from "react-markdown";
import type { LearningItem, InVideoQuiz } from "@/gen/catalog/v1/catalog_pb";
import { GradedQuizRunner } from "@/components/assessment/GradedQuizRunner";
import { AutoGradedLabRunner } from "@/components/assessment/AutoGradedLabRunner";
import { PeerAssignmentWorkspace } from "@/components/assessment/PeerAssignmentWorkspace";

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  activeItem: LearningItem | null;
  userId?: string;
  activeQuiz: InVideoQuiz | null;
  selectedOption: number | null;
  quizSubmitted: boolean;
  completedItemIds?: string[];
  onTimeUpdate: () => void;
  onSelectOption: (index: number) => void;
  onSubmitQuiz: () => void;
  onContinueVideo: () => void;
  onMarkComplete?: (itemId: string) => void;
}

export function VideoPlayer({
  videoRef,
  activeItem,
  userId,
  activeQuiz,
  selectedOption,
  quizSubmitted,
  completedItemIds = [],
  onTimeUpdate,
  onSelectOption,
  onSubmitQuiz,
  onContinueVideo,
  onMarkComplete,
}: VideoPlayerProps) {
  if (!activeItem) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900">
        Chọn bài học từ danh sách bên trái để bắt đầu.
      </div>
    );
  }

  const isCompleted = completedItemIds.includes(activeItem.id);

  // 1. Reading Item
  if (activeItem.type === 2) {
    return (
      <div className="w-full h-full overflow-y-auto p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Reading Header */}
          <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {activeItem.title}
            </h2>
          </div>

          {/* Reading Markdown Content */}
          <div className="max-w-none leading-relaxed text-sm space-y-4">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-5 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-slate-700 dark:text-slate-300 leading-relaxed my-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-6 space-y-1 my-3 text-slate-700 dark:text-slate-300">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 space-y-1 my-3 text-slate-700 dark:text-slate-300">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-emerald-500 pl-4 py-2 italic bg-emerald-50/60 dark:bg-slate-950/60 my-4 text-emerald-900 dark:text-emerald-300 rounded-r-lg border border-slate-200 dark:border-slate-800">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-slate-200 dark:bg-slate-950 text-slate-900 dark:text-amber-300 px-2 py-0.5 rounded font-mono text-xs border border-slate-300 dark:border-slate-800">
                    {children}
                  </code>
                ),
              }}
            >
              {activeItem.readingMarkdown || "*Không có nội dung bài đọc.*"}
            </ReactMarkdown>
          </div>

          {/* Coursera-Style Bottom Mark as Complete Action Banner */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => onMarkComplete?.(activeItem.id)}
              disabled={isCompleted}
              className={`px-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isCompleted
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 cursor-default"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isCompleted ? "Đã Hoàn Thành Bài Đọc" : "Đánh dấu Hoàn Thành Bài Đọc này"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Graded / Practice Quiz Item
  if (activeItem.type === 3 || activeItem.type === 4) {
    return (
      <div className="w-full h-full overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
        <GradedQuizRunner
          itemId={activeItem.id}
          userId={userId}
          onComplete={() => onMarkComplete?.(activeItem.id)}
        />
      </div>
    );
  }

  // 3. Auto-Graded Lab Item
  if (activeItem.type === 5) {
    return (
      <div className="w-full h-full overflow-y-auto p-6 bg-slate-950">
        <AutoGradedLabRunner
          itemId={activeItem.id}
          userId={userId}
          onComplete={() => onMarkComplete?.(activeItem.id)}
        />
      </div>
    );
  }

  // 4. Peer Review Item
  if (activeItem.type === 6) {
    return (
      <div className="w-full h-full overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
        <PeerAssignmentWorkspace itemId={activeItem.id} userId={userId} />
      </div>
    );
  }

  // 5. Video Item Default Fallback
  if (activeItem.type === 1 && activeItem.videoUrl) {
    return (
      <div className="w-full h-full relative flex items-center justify-center bg-slate-100 dark:bg-black transition-colors duration-200">
        <video
          ref={videoRef}
          src={activeItem.videoUrl}
          controls
          onTimeUpdate={onTimeUpdate}
          onEnded={() => onMarkComplete?.(activeItem.id)}
          className="max-h-full max-w-full object-contain shadow-2xl rounded-lg border border-slate-300 dark:border-slate-800"
        />

        {/* Floating Top Control Overlay for Video Mark as Complete */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => onMarkComplete?.(activeItem.id)}
            disabled={isCompleted}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xl backdrop-blur-md flex items-center gap-2 ${
              isCompleted
                ? "bg-emerald-500/90 text-white cursor-default"
                : "bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700 hover:border-emerald-500"
            }`}
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {isCompleted ? "Đã Xem Video (>=80%)" : "Đánh dấu Xem Xong Video"}
          </button>
        </div>

        {/* In-Video Quiz Overlay */}
        {activeQuiz && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  In-Video Quiz ({activeQuiz.timestampSeconds}s)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Dừng video để kiểm tra</span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">{activeQuiz.question}</h3>

              <div className="space-y-2">
                {activeQuiz.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === activeQuiz.correctOptionIndex;
                  let optionStyle =
                    "border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 text-slate-700 dark:text-slate-300";

                  if (quizSubmitted) {
                    if (isCorrect) {
                      optionStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold";
                    } else if (isSelected && !isCorrect) {
                      optionStyle = "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 font-bold";
                    }
                  } else if (isSelected) {
                    optionStyle = "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 font-bold";
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
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {quizSubmitted && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <span className="font-bold text-blue-600 dark:text-blue-400">Giải thích: </span>
                  <span>{activeQuiz.explanation}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                {!quizSubmitted ? (
                  <button
                    onClick={onSubmitQuiz}
                    disabled={selectedOption === null}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    Kiểm Tra Đáp Án
                  </button>
                ) : (
                  <button
                    onClick={onContinueVideo}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
                  >
                    Tiếp Tục Xem Video
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
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
    <div className="w-full h-full flex items-center justify-center text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900">
      Chọn bài học từ danh sách bên trái để bắt đầu.
    </div>
  );
}
