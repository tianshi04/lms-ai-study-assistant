"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type { LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { parseVTT, type VTTCue } from "@/lib/vtt_parser";

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
  const [cues, setCues] = useState<VTTCue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [prevActiveItemId, setPrevActiveItemId] = useState<string | null>(null);

  // Reset cues and search query when item changes
  if (activeItem?.id !== prevActiveItemId) {
    setPrevActiveItemId(activeItem?.id || null);
    setCues([]);
    setSearchQuery("");
  }

  // Fetch VTT subtitle if available
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
        console.error("Error loading subtitles for transcript panel:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [activeItem]);

  // Combine interactiveTranscripts from proto and parsed VTT cues
  const allTranscripts = useMemo<VTTCue[]>(() => {
    if (cues.length > 0) return cues;

    // Fallback to proto interactiveTranscripts
    const protoTranscripts = activeItem?.interactiveTranscripts || [];
    return protoTranscripts.map((t, index) => {
      const nextT = protoTranscripts[index + 1];
      return {
        startTime: t.timestampSeconds,
        endTime: nextT ? nextT.timestampSeconds : t.timestampSeconds + 5,
        text: t.text,
      };
    });
  }, [cues, activeItem]);

  // Find index of the currently active transcript cue based on currentTime
  const activeIndex = useMemo(() => {
    return allTranscripts.findIndex(
      (cue) => currentTime >= cue.startTime && currentTime <= cue.endTime
    );
  }, [allTranscripts, currentTime]);

  // Auto-scroll the active cue into view
  useEffect(() => {
    if (activeIndex !== -1 && !searchQuery) {
      const el = document.getElementById(`transcript-item-${activeIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeIndex, searchQuery]);

  // Filter transcripts by search query
  const filteredTranscripts = useMemo(() => {
    if (!searchQuery.trim()) {
      return allTranscripts.map((t, idx) => ({ ...t, originalIndex: idx }));
    }
    const query = searchQuery.toLowerCase();
    return allTranscripts
      .map((t, idx) => ({ ...t, originalIndex: idx }))
      .filter((t) => t.text.toLowerCase().includes(query));
  }, [allTranscripts, searchQuery]);

  // Helper function to highlight matching text
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/80 text-slate-900 dark:text-white px-0.5 rounded font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  if (allTranscripts.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-500 text-center py-12">
        {"Không có nội dung phụ đề cho học liệu này."}
      </p>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto flex flex-col h-full">
      {/* Search Input Bar */}
      <div className="relative shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm nội dung bài giảng..."
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <svg
          className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Transcript Items Container */}
      <div
        ref={containerRef}
        className="space-y-2 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800"
      >
        {filteredTranscripts.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-500 text-center py-6">
            {"Không tìm thấy dòng phụ đề khớp với từ khóa"}
          </p>
        ) : (
          filteredTranscripts.map((item) => {
            const isActive = item.originalIndex === activeIndex;

            return (
              <div
                key={item.originalIndex}
                id={`transcript-item-${item.originalIndex}`}
                onClick={() => onSeekVideo(item.startTime)}
                className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all flex items-start gap-4 border border-transparent ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-200 font-medium border-l-4 border-l-2 border-blue-500 pl-3 shadow-2xs"
                    : "hover:bg-slate-200/60 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300/40 dark:hover:border-slate-800"
                }`}
              >
                <span className="font-mono text-blue-600 dark:text-blue-400 flex-shrink-0 font-bold">
                  {Math.floor(item.startTime / 60)}:
                  {Math.floor(item.startTime % 60).toString().padStart(2, "0")}
                </span>
                <span className="leading-relaxed">
                  {renderHighlightedText(item.text, searchQuery)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
