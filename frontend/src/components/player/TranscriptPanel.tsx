"use client";

import { useEffect } from "react";
import type { LearningItem } from "@/gen/catalog/v1/catalog_pb";


interface TranscriptPanelProps {
  activeItem: LearningItem | null;
  currentTime: number;
  onSeekVideo: (timestampSeconds: number) => void;
}

export function TranscriptPanel({
  activeItem,
  currentTime,
  onSeekVideo,
}: TranscriptPanelProps) {
  

  const transcripts = activeItem?.interactiveTranscripts || [];

  const activeIndex = transcripts.findIndex(
    (item, i) =>
      currentTime >= item.timestampSeconds &&
      (i === transcripts.length - 1 ||
        currentTime < transcripts[i + 1].timestampSeconds)
  );

  useEffect(() => {
    if (activeIndex !== -1) {
      const el = document.getElementById(`transcript-item-${activeIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeIndex]);

  if (transcripts.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-500 text-center py-6">
        {"Không tìm thấy dòng phụ đề khớp với từ khóa"}
      </p>
    );
  }

  return (
    <div className="space-y-2 max-w-4xl mx-auto">
      {transcripts.map((item, i) => {
        const isActive = i === activeIndex;

        return (
          <div
            key={i}
            id={`transcript-item-${i}`}
            onClick={() => onSeekVideo(item.timestampSeconds)}
            className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all flex items-start gap-4 ${
              isActive
                ? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-200 font-medium border-l-4 border-blue-500 pl-3 shadow-sm"
                : "hover:bg-slate-200/60 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
            }`}
          >
            <span className="font-mono text-blue-600 dark:text-blue-400 flex-shrink-0 font-bold">
              {Math.floor(item.timestampSeconds / 60)}:
              {(item.timestampSeconds % 60).toString().padStart(2, "0")}
            </span>
            <span className="leading-relaxed">{item.text}</span>
          </div>
        );
      })}
    </div>
  );
}
