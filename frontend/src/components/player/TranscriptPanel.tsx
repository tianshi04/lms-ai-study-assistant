"use client";

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
  if (!activeItem?.interactiveTranscripts || activeItem.interactiveTranscripts.length === 0) {
    return (
      <p className="text-xs text-slate-500 text-center py-6">
        Không có phụ đề tương tác cho bài học này.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-w-4xl mx-auto">
      {activeItem.interactiveTranscripts.map((t, i) => {
        const isActive =
          currentTime >= t.timestampSeconds &&
          (i === activeItem.interactiveTranscripts.length - 1 ||
            currentTime < activeItem.interactiveTranscripts[i + 1].timestampSeconds);

        return (
          <div
            key={i}
            onClick={() => onSeekVideo(t.timestampSeconds)}
            className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all flex items-start gap-4 ${
              isActive
                ? "bg-blue-600/20 text-blue-200 font-medium border-l-4 border-blue-500 pl-3"
                : "hover:bg-slate-900 text-slate-400"
            }`}
          >
            <span className="font-mono text-blue-400 flex-shrink-0 font-bold">
              {Math.floor(t.timestampSeconds / 60)}:
              {(t.timestampSeconds % 60).toString().padStart(2, "0")}
            </span>
            <span className="leading-relaxed">{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}
