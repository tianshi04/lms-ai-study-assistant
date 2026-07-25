"use client";

import type { LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { useTranslation } from "@/lib/i18n/TranslationProvider";

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
  const { t } = useTranslation();

  if (!activeItem?.interactiveTranscripts || activeItem.interactiveTranscripts.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-500 text-center py-6">
        {t("player.noTranscriptFound")}
      </p>
    );
  }

  return (
    <div className="space-y-2 max-w-4xl mx-auto">
      {activeItem.interactiveTranscripts.map((item, i) => {
        const isActive =
          currentTime >= item.timestampSeconds &&
          (i === activeItem.interactiveTranscripts.length - 1 ||
            currentTime < activeItem.interactiveTranscripts[i + 1].timestampSeconds);

        return (
          <div
            key={i}
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
