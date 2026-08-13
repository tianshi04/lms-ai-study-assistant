/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex */
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import type { LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { parseVTT, type VTTCue } from "@/lib/vtt_parser";
import { Button } from "@/components/ui/Button";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [prevActiveItemId, setPrevActiveItemId] = useState<string | null>(null);

  // Reset cues when item changes
  if (activeItem?.id !== prevActiveItemId) {
    setPrevActiveItemId(activeItem?.id || null);
    setCues([]);
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

  // Find index of the currently active transcript cue based on currentTime (with 0.25s float tolerance)
  const activeIndex = useMemo(() => {
    return allTranscripts.findIndex(
      (cue) => currentTime >= cue.startTime - 0.25 && currentTime <= cue.endTime + 0.25,
    );
  }, [allTranscripts, currentTime]);

  // Auto-scroll the active cue into view
  useEffect(() => {
    if (activeIndex !== -1) {
      const el = document.getElementById(`transcript-cue-${activeIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeIndex]);

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

  // Helper function to format timestamp (e.g. 0:03, 1:45)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
      {/* Coursera-style Paragraph-Based Transcript Container */}
      <div
        ref={containerRef}
        className="space-y-4 overflow-y-auto flex-1 pr-1 scrollbar-thin min-h-0"
      >
        {paragraphBlocks.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-6">
            {"Không có nội dung phụ đề cho học liệu này."}
          </p>
        ) : (
          paragraphBlocks.map((block, blockIdx) => (
            <div key={blockIdx} className="space-y-1.5">
              {/* Aggregated Timestamp Header */}
              <div className="flex items-center gap-2 pt-2 pb-0.5">
                <Button
                  type="button"
                  variant="outlined"
                  size="sm"
                  onClick={() => onSeekVideo(block.startTime)}
                  className="font-mono text-[11px] font-bold text-on-primary-container bg-primary-container hover:bg-primary-container/80 border-primary/20 px-2.5 py-0.5 rounded-lg h-auto"
                  title="Nhảy đến mốc thời gian này"
                >
                  {formatTime(block.startTime)}
                </Button>
              </div>

              {/* Continuous Flowing Paragraph Text */}
              <p className="text-[13px] sm:text-sm text-on-surface/90 leading-relaxed font-sans">
                {block.cues.map((cue) => {
                  const isActive = cue.originalIndex === activeIndex;

                  return (
                    <span
                      key={cue.originalIndex}
                      id={`transcript-cue-${cue.originalIndex}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSeekVideo(cue.startTime)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSeekVideo(cue.startTime);
                        }
                      }}
                      className={`inline cursor-pointer transition-colors duration-m3-short-2 rounded px-1 py-0.5 [box-decoration-break:clone] [-webkit-box-decoration-break:clone] ${
                        isActive
                          ? "bg-primary/15 text-primary font-semibold"
                          : "hover:bg-surface-container-highest/60 hover:text-primary"
                      }`}
                    >
                      {cue.text}{" "}
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
