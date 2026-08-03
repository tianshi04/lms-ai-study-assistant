"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Search } from "lucide-react";
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

  // Find index of the currently active transcript cue based on currentTime
  const activeIndex = useMemo(() => {
    return allTranscripts.findIndex(
      (cue) => currentTime >= cue.startTime && currentTime <= cue.endTime,
    );
  }, [allTranscripts, currentTime]);

  // Auto-scroll the active cue into view
  useEffect(() => {
    if (activeIndex !== -1 && !searchQuery) {
      const el = document.getElementById(`transcript-cue-${activeIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeIndex, searchQuery]);

  // Group cues into Coursera-style paragraph blocks (consolidating timestamps)
  const paragraphBlocks = useMemo<ParagraphBlock[]>(() => {
    if (allTranscripts.length === 0) return [];

    const blocks: ParagraphBlock[] = [];
    let currentBlock: ParagraphBlock = {
      startTime: allTranscripts[0].startTime,
      cues: [],
    };

    allTranscripts.forEach((cue, idx) => {
      const cueWithIndex: CueWithIndex = { ...cue, originalIndex: idx };
      currentBlock.cues.push(cueWithIndex);

      const durationSoFar = cue.endTime - currentBlock.startTime;
      const textTrimmed = cue.text.trim();
      const endsWithPeriod = /[.!?]\s*$/.test(textTrimmed);
      const nextCue = allTranscripts[idx + 1];

      // Silence gap to next cue (seconds)
      const gapToNext = nextCue ? nextCue.startTime - cue.endTime : 0;

      // Major pause threshold: only split on gap if speaker was silent for > 4.5 seconds
      const isMajorPause = nextCue && gapToNext > 4.5;

      // Group into paragraphs:
      // - DO NOT split early if paragraph is under 10 seconds (unless major silence pause > 4.5s)
      // - Split when accumulated duration >= 10s AND ends with punctuation (. ! ?)
      // - Split when accumulated duration >= 15s AND there is a small pause (> 1.5s)
      // - Safety caps: duration >= 28s OR max 7 cues
      const shouldSplit =
        isMajorPause ||
        (durationSoFar >= 10 && endsWithPeriod) ||
        (durationSoFar >= 15 && gapToNext > 1.5) ||
        durationSoFar >= 28 ||
        currentBlock.cues.length >= 7;

      if (shouldSplit) {
        blocks.push(currentBlock);
        if (nextCue) {
          currentBlock = {
            startTime: nextCue.startTime,
            cues: [],
          };
        }
      }
    });

    if (currentBlock.cues.length > 0 && !blocks.includes(currentBlock)) {
      blocks.push(currentBlock);
    }

    return blocks;
  }, [allTranscripts]);

  // Filter paragraph blocks by search query
  const filteredBlocks = useMemo(() => {
    if (!searchQuery.trim()) return paragraphBlocks;
    const query = searchQuery.toLowerCase();

    return paragraphBlocks
      .map((block) => ({
        ...block,
        cues: block.cues.filter((c) => c.text.toLowerCase().includes(query)),
      }))
      .filter((block) => block.cues.length > 0);
  }, [paragraphBlocks, searchQuery]);

  // Helper function to format timestamp (e.g. 0:03, 1:45)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper function to highlight matching search text
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-warning/30 text-foreground px-0.5 rounded font-semibold">
          {part}
        </mark>
      ) : (
        part
      ),
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
    <div className="flex flex-col h-full space-y-3 min-h-0">
      {/* Search Input Bar */}
      <div className="relative shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm nội dung bài giảng…"
          className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
        />
        <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-3" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Coursera-style Paragraph-Based Transcript Container */}
      <div
        ref={containerRef}
        className="space-y-4 overflow-y-auto flex-1 pr-1 scrollbar-thin min-h-0"
      >
        {filteredBlocks.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-6">
            {"Không tìm thấy dòng phụ đề khớp với từ khóa"}
          </p>
        ) : (
          filteredBlocks.map((block, blockIdx) => (
            <div key={blockIdx} className="space-y-1.5">
              {/* Aggregated Timestamp Header */}
              <div className="flex items-center gap-2 pt-2 pb-0.5">
                <button
                  onClick={() => onSeekVideo(block.startTime)}
                  className="font-mono text-[11px] font-bold text-on-primary-container bg-primary-container hover:bg-primary-container/80 border border-primary/20 px-3 py-0.5 rounded-full cursor-pointer transition-colors shadow-xs"
                  title="Nhảy đến mốc thời gian này"
                >
                  {formatTime(block.startTime)}
                </button>
              </div>

              {/* Continuous Flowing Paragraph Text */}
              <p className="text-[13px] sm:text-sm text-on-surface/90 leading-relaxed sm:leading-7 font-sans">
                {block.cues.map((cue) => {
                  const isActive = cue.originalIndex === activeIndex;

                  return (
                    <span
                      key={cue.originalIndex}
                      id={`transcript-cue-${cue.originalIndex}`}
                      onClick={() => onSeekVideo(cue.startTime)}
                      className={`transition-all duration-200 cursor-pointer inline box-decoration-clone rounded-md px-1 py-0.5 ${
                        isActive
                          ? "bg-primary-container text-on-primary-container font-bold shadow-xs ring-1 ring-primary/30"
                          : "text-on-surface/80 hover:text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {renderHighlightedText(cue.text, searchQuery)}{" "}
                    </span>
                  );
                })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
