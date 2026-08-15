"use client";

import { useEffect } from "react";

export interface MediaSessionOptions {
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
  onNextLesson?: () => void;
  onPreviousLesson?: () => void;
}

/**
 * Hook to integrate media playback with system Media Session API (lockscreen, media keys, bluetooth headphones).
 */
export function useMediaSession({
  title,
  artist = "Coursera AI LMS",
  album = "Khóa học trực tuyến",
  artworkUrl,
  onPlay,
  onPause,
  onSeekBackward,
  onSeekForward,
  onNextLesson,
  onPreviousLesson,
}: MediaSessionOptions) {
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    if (title) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album,
        artwork: artworkUrl
          ? [
              { src: artworkUrl, sizes: "96x96", type: "image/png" },
              { src: artworkUrl, sizes: "128x128", type: "image/png" },
              { src: artworkUrl, sizes: "256x256", type: "image/png" },
              { src: artworkUrl, sizes: "512x512", type: "image/png" },
            ]
          : [],
      });
    }

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ["play", onPlay || null],
      ["pause", onPause || null],
      ["seekbackward", onSeekBackward || null],
      ["seekforward", onSeekForward || null],
      ["nexttrack", onNextLesson || null],
      ["previoustrack", onPreviousLesson || null],
    ];

    actionHandlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some actions might not be supported across all browsers
      }
    });

    return () => {
      actionHandlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {}
      });
    };
  }, [
    title,
    artist,
    album,
    artworkUrl,
    onPlay,
    onPause,
    onSeekBackward,
    onSeekForward,
    onNextLesson,
    onPreviousLesson,
  ]);
}
