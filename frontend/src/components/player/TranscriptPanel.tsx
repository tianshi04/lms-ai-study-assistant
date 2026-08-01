"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type { LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { parseVTT, type VTTCue } from "@/lib/vtt_parser";

interface TranscriptPanelProps {
  activeItem: LearningItem | null;
  currentTime: number;
  onSeekVideo: (timestampSeconds: number) => void;
}

interface CueWithIndex extends VTTCue {
  originalIndex: number;
}

interface ParagraphBlock {
  startTime: number;
  cues: CueWithIndex[];
}

export function TranscriptPanel({ activeItem, currentTime, onSeekVideo }: TranscriptPanelProps) {
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

  // Group individual VTT cues into multi-sentence paragraph blocks (Coursera style)
  const paragraphBlocks = useMemo<ParagraphBlock[]>(() => {
    if (allTranscripts.length === 0) return [];

    const blocks: ParagraphBlock[] = [];
    let currentBlockCues: CueWithIndex[] = [];
    let blockStartTime = allTranscripts[0].startTime;

    const pushCurrentBlock = () => {
      if (currentBlockCues.length > 0) {
        blocks.push({
          startTime: blockStartTime,
          cues: currentBlockCues,
        });
        currentBlockCues = [];
      }
    };

    for (let i = 0; i < allTranscripts.length; i++) {
      const cue: CueWithIndex = { ...allTranscripts[i], originalIndex: i };
      const prevCue = i > 0 ? allTranscripts[i - 1] : null;

      if (currentBlockCues.length === 0) {
        blockStartTime = cue.startTime;
        currentBlockCues.push(cue);
        continue;
      }

      const silenceGap = prevCue ? cue.startTime - prevCue.endTime : 0;
      const currentBlockDuration = cue.endTime - blockStartTime;
      const prevText = prevCue ? prevCue.text.trim() : "";
      const hasSentenceEndingPunctuation = /[.!?]$/.test(prevText);

      let shouldSplit = false;

      // Rule 1: Silence gap >= 1.8s indicating natural pause
      if (silenceGap >= 1.8) {
        shouldSplit = true;
      }
      // Rule 2: Silence gap >= 4.5s (major topic break)
      else if (silenceGap >= 4.5) {
        shouldSplit = true;
      }
      // Rule 3: Paragraph duration >= 10s and ends with sentence punctuation
      else if (currentBlockDuration >= 10.0 && hasSentenceEndingPunctuation) {
        shouldSplit = true;
      }
      // Rule 4: Paragraph duration >= 15s with minor pause (> 1.5s)
      else if (currentBlockDuration >= 15.0 && silenceGap >= 1.5) {
        shouldSplit = true;
      }
      // Rule 5: Fallback safety limit (duration >= 28s or max 7 cues)
      else if (currentBlockDuration >= 28.0 || currentBlockCues.length >= 7) {
        shouldSplit = true;
      }

      if (shouldSplit) {
        pushCurrentBlock();
        blockStartTime = cue.startTime;
      }

      currentBlockCues.push(cue);
    }

    pushCurrentBlock();
    return blocks;
  }, [allTranscripts]);

  // Find index of the currently active transcript cue based on currentTime
  const activeIndex = useMemo(() => {
    return allTranscripts.findIndex(
      (cue) => currentTime >= cue.startTime && currentTime <= cue.endTime,
    );
  }, [allTranscripts, currentTime]);

  // Auto-scroll the active paragraph block into view
  useEffect(() => {
    if (activeIndex !== -1 && !searchQuery) {
      const activeBlockIndex = paragraphBlocks.findIndex((block) =>
        block.cues.some((c) => c.originalIndex === activeIndex),
      );
      if (activeBlockIndex !== -1) {
        const el = document.getElementById(`transcript-block-${activeBlockIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }
  }, [activeIndex, searchQuery, paragraphBlocks]);

  // Filter paragraph blocks by search query
  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return paragraphBlocks;
    const query = searchQuery.toLowerCase();
    return paragraphBlocks.filter((block) =>
      block.cues.some((c) => c.text.toLowerCase().includes(query)),
    );
  }, [paragraphBlocks, searchQuery]);

  // Helper function to highlight matching text
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-warning/30 text-foreground px-0.5 rounded font-semibold">
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </>
    );
  };

  if (allTranscripts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-12">
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
          placeholder="Tìm kiếm nội dung bài giảng…"
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-input bg-card text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <svg
          className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5"
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
            className="absolute right-3 top-2 text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Transcript Blocks Container */}
      <div
        ref={containerRef}
        className="space-y-4 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin"
      >
        {filteredBlocks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {"Không tìm thấy dòng phụ đề khớp với từ khóa"}
          </p>
        ) : (
          filteredBlocks.map((block, blockIdx) => {
            const hasActiveCue = block.cues.some((c) => c.originalIndex === activeIndex);

            return (
              <div
                key={blockIdx}
                id={`transcript-block-${blockIdx}`}
                className={`p-3.5 rounded-xl text-xs transition-all flex items-start gap-4 border ${
                  hasActiveCue
                    ? "bg-primary/10 border-primary/40 shadow-2xs"
                    : "hover:bg-muted/60 border-transparent hover:border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSeekVideo(block.startTime)}
                  className="font-mono text-primary flex-shrink-0 font-bold hover:underline cursor-pointer pt-0.5"
                  title="Nhảy đến thời điểm này"
                >
                  {Math.floor(block.startTime / 60)}:
                  {Math.floor(block.startTime % 60)
                    .toString()
                    .padStart(2, "0")}
                </button>
                <p className="leading-relaxed text-foreground text-xs">
                  {block.cues.map((cue) => {
                    const isCueActive = cue.originalIndex === activeIndex;
                    return (
                      <span
                        key={cue.originalIndex}
                        onClick={() => onSeekVideo(cue.startTime)}
                        className={`cursor-pointer transition-colors duration-150 rounded px-0.5 py-0.2 mx-0.5 inline ${
                          isCueActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "hover:bg-muted-foreground/10 text-foreground"
                        }`}
                      >
                        {renderHighlightedText(cue.text, searchQuery)}{" "}
                      </span>
                    );
                  })}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
