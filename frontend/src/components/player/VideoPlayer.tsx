"use client";

import { RefObject } from "react";
import ReactMarkdown from "react-markdown";
import type { LearningItem, InVideoQuiz } from "@/gen/catalog/v1/catalog_pb";

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  activeItem: LearningItem | null;
  activeQuiz: InVideoQuiz | null;
  selectedOption: number | null;
  quizSubmitted: boolean;
  onTimeUpdate: () => void;
  onSelectOption: (index: number) => void;
  onSubmitQuiz: () => void;
  onContinueVideo: () => void;
}

export function VideoPlayer({
  videoRef,
  activeItem,
  activeQuiz,
  selectedOption,
  quizSubmitted,
  onTimeUpdate,
  onSelectOption,
  onSubmitQuiz,
  onContinueVideo,
}: VideoPlayerProps) {
  if (!activeItem) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900">
        Chọn bài học từ danh sách bên trái để bắt đầu.
      </div>
    );
  }

  if (activeItem.type === 2) {
    return (
      <div className="w-full h-full overflow-y-auto p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {activeItem.title}
          </h2>
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
        </div>
      </div>
    );
  }

  if (activeItem.type === 1 && activeItem.videoUrl) {
    return (
      <div className="w-full h-full relative flex items-center justify-center bg-slate-100 dark:bg-black transition-colors duration-200">
        <video
          ref={videoRef}
          src={activeItem.videoUrl}
          controls
          onTimeUpdate={onTimeUpdate}
          className="max-h-full max-w-full object-contain shadow-2xl rounded-lg border border-slate-300 dark:border-slate-800"
        />

        {/* In-Video Quiz Overlay Interruption Modal */}
        {activeQuiz && (
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 rounded-2xl shadow-2xl space-y-5 text-slate-900 dark:text-white">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-500/20 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  In-Video Quiz Interruption
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Timestamp: {activeQuiz.timestampSeconds}s</span>
              </div>

              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{activeQuiz.question}</h3>

              <div className="space-y-2">
                {activeQuiz.options.map((opt, idx) => (
                  <button
                    key={idx}
                    disabled={quizSubmitted}
                    onClick={() => onSelectOption(idx)}
                    className={`w-full text-left p-3 rounded-xl text-sm transition-all border ${
                      selectedOption === idx
                        ? "bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-700 dark:text-white font-medium"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="font-mono text-xs font-bold mr-2 text-slate-400">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>

              {!quizSubmitted ? (
                <button
                  disabled={selectedOption === null}
                  onClick={onSubmitQuiz}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/20"
                >
                  Nộp Trả Lời
                </button>
              ) : (
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div
                    className={`p-3.5 rounded-xl text-sm flex items-start gap-3 ${
                      selectedOption === activeQuiz.correctOptionIndex
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300"
                    }`}
                  >
                    {selectedOption === activeQuiz.correctOptionIndex ? (
                      <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <div>
                      <p className="font-bold mb-1">
                        {selectedOption === activeQuiz.correctOptionIndex ? "Chính xác!" : "Chưa chính xác!"}
                      </p>
                      <p className="text-xs opacity-90">{activeQuiz.explanation}</p>
                    </div>
                  </div>

                  <button
                    onClick={onContinueVideo}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Tiếp tục xem Video
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-center text-slate-500 dark:text-slate-400 p-8">
      Chọn bài học từ danh sách bên trái để bắt đầu.
    </div>
  );
}
