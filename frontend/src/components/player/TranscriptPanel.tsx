/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex */
"use client";

import { memo, useCallback, useEffect, useState, useMemo, useRef } from "react";
import type { LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { parseVTT, type VTTCue } from "@/lib/vtt_parser";
import { usePlaybackTime } from "@/lib/playback_time_store";
import { Button } from "@/components/ui/Button";
import { ArrowDown, ArrowUp } from "lucide-react";

// Keys that scroll a container natively (Space/Enter are excluded: they activate a focused cue)
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);

// Only auto-scroll when the active cue leaves this vertical band of the scroll area (fractions of its height)
const COMFORT_BAND_TOP = 0.2;
const COMFORT_BAND_BOTTOM = 0.8;

// Ignore auto-scroll right after the user clicks a cue (it is already in view, so scrolling would only cause jitter)
const CLICK_SUPPRESS_AUTO_SCROLL_MS = 500;

/** Find the nearest ancestor (starting at `el`) that actually scrolls vertically. */
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node) {
    const overflowY = window.getComputedStyle(node).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Scroll `scroller` (never the page) so that `cue` is centered, but only when the cue is
 * outside the comfort band.
 */
function scrollCueIntoComfortZone(scroller: HTMLElement, cue: HTMLElement) {
  const scrollerRect = scroller.getBoundingClientRect();
  const cueRect = cue.getBoundingClientRect();
  if (scrollerRect.height === 0) return;

  const cueTop = cueRect.top - scrollerRect.top;
  const cueBottom = cueRect.bottom - scrollerRect.top;
  const isInBand =
    cueTop >= scrollerRect.height * COMFORT_BAND_TOP &&
    cueBottom <= scrollerRect.height * COMFORT_BAND_BOTTOM;
  if (isInBand) return;

  const target = scroller.scrollTop + cueTop - (scrollerRect.height - cueRect.height) / 2;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scroller.scrollTo({
    top: Math.max(0, target),
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });
}

interface TranscriptPanelProps {
  activeItem: LearningItem | null;
  onSeekVideo: (timestampSeconds: number) => void;
}

interface CueSpanProps {
  index: number;
  startTime: number;
  text: string;
  isActive: boolean;
  onSeek: (timestampSeconds: number) => void;
}

// Memoized so that only cues whose active state changes re-render on each active-cue change.
const CueSpan = memo(function CueSpan({ index, startTime, text, isActive, onSeek }: CueSpanProps) {
  {
    /*
    Design Decision (Modern Web): Intentional inline <span> with role="button" & keyboard handlers (Enter/Space)
    to maintain natural continuous flowing paragraph typography ([box-decoration-break:clone])
    without breaking inline text wraps across lines like native button tags would.
  */
  }
  return (
    <span
      id={`transcript-cue-${index}`}
      role="button"
      tabIndex={0}
      onClick={() => onSeek(startTime)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSeek(startTime);
        }
      }}
      className={`inline cursor-pointer transition-colors duration-m3-short-2 rounded px-1 py-0.5 [box-decoration-break:clone] [-webkit-box-decoration-break:clone] ${
        isActive
          ? "bg-primary/15 text-primary font-semibold"
          : "hover:bg-surface-container-highest/60 hover:text-primary"
      }`}
    >
      {text}{" "}
    </span>
  );
});

interface CueWithIndex extends VTTCue {
  originalIndex: number;
}

interface ParagraphBlock {
  startTime: number;
  cues: CueWithIndex[];
}

export function TranscriptPanel({ activeItem, onSeekVideo }: TranscriptPanelProps) {
  const [cues, setCues] = useState<VTTCue[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [prevActiveItemId, setPrevActiveItemId] = useState<string | null>(null);
  // Whether the panel follows the playing cue. Turns off when the user scrolls manually.
  const [isFollowing, setIsFollowing] = useState(true);
  const [isActiveVisible, setIsActiveVisible] = useState(true);
  // Where the playing cue is relative to the visible area when it is out of view (drives the button arrow)
  const [activeCueSide, setActiveCueSide] = useState<"above" | "below">("below");
  const isFollowingRef = useRef(true);
  const wasActiveVisibleRef = useRef(true);
  const suppressAutoScrollUntilRef = useRef(0);

  // Reset cues when item changes
  if (activeItem?.id !== prevActiveItemId) {
    setPrevActiveItemId(activeItem?.id || null);
    setCues([]);
    setIsFollowing(true);
    setIsActiveVisible(true);
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

  // Find index of the currently active transcript cue based on the playback time (with 0.25s float tolerance).
  // Binary search for the LAST cue that has already started (cues are sorted by startTime), so that right
  // after seeking to a cue's start the clicked cue is highlighted instead of the previous cue.
  // The cue stays active until the next one starts (including silent gaps and after the last cue ends),
  // so the user can always tell where the playback position is in the transcript.
  // Subscribing through a selector means this panel only re-renders when the active cue index changes.
  const selectActiveIndex = useCallback(
    (time: number) => {
      const TOLERANCE = 0.25;
      let lo = 0;
      let hi = allTranscripts.length - 1;
      let found = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (allTranscripts[mid].startTime - TOLERANCE <= time) {
          found = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return found;
    },
    [allTranscripts],
  );
  const activeIndex = usePlaybackTime(selectActiveIndex);

  // Keep the latest onSeekVideo in a ref so memoized cue spans receive a stable click handler
  const onSeekVideoRef = useRef(onSeekVideo);
  useEffect(() => {
    onSeekVideoRef.current = onSeekVideo;
  }, [onSeekVideo]);
  const handleSeek = useCallback((t: number) => {
    // Clicking a cue means the user wants to stay in sync: resume following, but don't scroll for this click
    suppressAutoScrollUntilRef.current = performance.now() + CLICK_SUPPRESS_AUTO_SCROLL_MS;
    setIsFollowing(true);
    onSeekVideoRef.current(t);
  }, []);

  // Keep a ref mirror of isFollowing for the IntersectionObserver callback
  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  // Auto-scroll the active cue inside the transcript container only (never the page),
  // and only while following (the user has not scrolled away).
  useEffect(() => {
    if (!isFollowing || activeIndex === -1) return;
    if (performance.now() < suppressAutoScrollUntilRef.current) return;
    const el = document.getElementById(`transcript-cue-${activeIndex}`);
    const scroller = getScrollParent(containerRef.current);
    if (el && scroller) {
      scrollCueIntoComfortZone(scroller, el);
    }
  }, [activeIndex, isFollowing]);

  // Track whether the active cue is visible. Resume following when it scrolls into view from outside
  // (i.e. the user scrolled back to the playing position); drives the "back to current" button.
  useEffect(() => {
    if (activeIndex === -1) return;
    const el = document.getElementById(`transcript-cue-${activeIndex}`);
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        const visible = entry.isIntersecting;
        if (visible && !wasActiveVisibleRef.current && !isFollowingRef.current) {
          setIsFollowing(true);
        }
        wasActiveVisibleRef.current = visible;
        setIsActiveVisible(visible);
        if (!visible) {
          const visibleTop = entry.rootBounds?.top ?? 0;
          setActiveCueSide(entry.boundingClientRect.top < visibleTop ? "above" : "below");
        }
      },
      { root: getScrollParent(containerRef.current) },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeIndex, allTranscripts]);

  // User scroll intent (wheel / touch / scroll keys) pauses auto-follow. Programmatic scrolls don't fire these.
  const pauseFollowing = useCallback(() => setIsFollowing(false), []);
  const handlePanelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (SCROLL_KEYS.has(e.key)) setIsFollowing(false);
  }, []);

  const handleBackToCurrent = useCallback(() => {
    wasActiveVisibleRef.current = false;
    setIsFollowing(true);
  }, []);

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
    // Wheel/touch/key handlers only detect the user's scroll intent (they never block scrolling)
    <div
      className="relative flex flex-col h-full space-y-3 min-h-0"
      onWheel={pauseFollowing}
      onTouchMove={pauseFollowing}
      onKeyDown={handlePanelKeyDown}
    >
      {/* Coursera-style Paragraph-Based Transcript Container */}
      <div
        ref={containerRef}
        className="space-y-4 overflow-y-auto flex-1 pr-1 scrollbar-none min-h-0"
      >
        {paragraphBlocks.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-6">
            {"Không có nội dung phụ đề cho học liệu này."}
          </p>
        ) : (
          paragraphBlocks.map((block, blockIdx) => (
            <div key={blockIdx} className="space-y-1.5">
              {/* Aggregated Timestamp Header */}
              <div className="pt-2 pb-0.5">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSeek(block.startTime)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSeek(block.startTime);
                    }
                  }}
                  className="font-mono text-xs font-semibold text-primary hover:underline cursor-pointer select-none"
                  title="Nhảy đến mốc thời gian này"
                >
                  {formatTime(block.startTime)}
                </span>
              </div>

              {/* Continuous Flowing Paragraph Text */}
              <p className="text-[13px] sm:text-sm text-on-surface/90 leading-relaxed font-sans">
                {block.cues.map((cue) => (
                  <CueSpan
                    key={cue.originalIndex}
                    index={cue.originalIndex}
                    startTime={cue.startTime}
                    text={cue.text}
                    isActive={cue.originalIndex === activeIndex}
                    onSeek={handleSeek}
                  />
                ))}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Back to the playing cue after the user scrolled away (arrow points toward the cue) */}
      {!isFollowing && !isActiveVisible && activeIndex !== -1 && (
        <div className="absolute bottom-3 right-3 z-10 animate-in fade-in duration-m3-short-4 ease-m3-decelerate">
          <Button
            type="button"
            variant="elevated"
            size="xs"
            onClick={handleBackToCurrent}
            leadingIcon={
              activeCueSide === "above" ? (
                <ArrowUp aria-hidden="true" />
              ) : (
                <ArrowDown aria-hidden="true" />
              )
            }
          >
            {"Về vị trí hiện tại"}
          </Button>
        </div>
      )}
    </div>
  );
}
