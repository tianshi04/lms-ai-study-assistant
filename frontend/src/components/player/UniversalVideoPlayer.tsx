"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface UniversalVideoRef {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  currentTime: number;
  duration: number;
}

interface UniversalVideoPlayerProps {
  videoUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  onSeeking?: () => void;
  onEnded?: () => void;
  title?: string;
  captionUrl?: string;
  className?: string;
}

function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          videoId: string;
          playerVars?: Record<string, any>;
          events?: {
            onReady?: (event: any) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        },
      ) => any;
      PlayerState?: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let isYouTubeApiLoading = false;
const ytApiReadyCallbacks: Array<() => void> = [];

function loadYouTubeIframeApi(onReady: () => void) {
  if (typeof window === "undefined") return;

  if (window.YT && window.YT.Player) {
    onReady();
    return;
  }

  ytApiReadyCallbacks.push(onReady);

  if (!isYouTubeApiLoading) {
    isYouTubeApiLoading = true;
    const existingScript = document.getElementById("youtube-iframe-api-script");

    if (!existingScript) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousOnReady) previousOnReady();
      while (ytApiReadyCallbacks.length > 0) {
        const cb = ytApiReadyCallbacks.shift();
        cb?.();
      }
    };
  }
}

export const UniversalVideoPlayer = forwardRef<UniversalVideoRef, UniversalVideoPlayerProps>(
  function UniversalVideoPlayer(
    {
      videoUrl,
      onTimeUpdate,
      onSeeking,
      onEnded,
      title = "Video bài giảng",
      captionUrl,
      className = "w-full h-full object-contain rounded-2xl",
    },
    ref,
  ) {
    const videoId = extractYouTubeVideoId(videoUrl);
    const isYouTube = !!videoId;

    const htmlVideoRef = useRef<HTMLVideoElement | null>(null);
    const ytPlayerRef = useRef<any>(null);
    const containerIdRef = useRef<string>(
      `yt-player-${Math.random().toString(36).substring(2, 9)}`,
    );
    const [isYtReady, setIsYtReady] = useState(false);

    const lastKnownTimeRef = useRef<number>(0);

    const onTimeUpdateRef = useRef(onTimeUpdate);
    onTimeUpdateRef.current = onTimeUpdate;

    const onSeekingRef = useRef(onSeeking);
    onSeekingRef.current = onSeeking;

    const onEndedRef = useRef(onEnded);
    onEndedRef.current = onEnded;

    // Initialize YouTube Iframe Player
    useEffect(() => {
      if (!isYouTube || !videoId) return;

      let intervalId: NodeJS.Timeout | null = null;

      loadYouTubeIframeApi(() => {
        if (!window.YT || !window.YT.Player) return;

        const container = document.getElementById(containerIdRef.current);
        if (!container) return;

        ytPlayerRef.current = new window.YT.Player(containerIdRef.current, {
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            enablejsapi: 1,
            modestbranding: 1,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
            host: "https://www.youtube.com",
          },
          events: {
            onReady: (event: any) => {
              ytPlayerRef.current = event.target;
              setIsYtReady(true);
            },
            onStateChange: (event: { data: number; target?: any }) => {
              if (event.target && typeof event.target.getCurrentTime === "function") {
                ytPlayerRef.current = event.target;
                try {
                  const t = event.target.getCurrentTime();
                  if (typeof t === "number" && !isNaN(t)) {
                    if (t === 0 && lastKnownTimeRef.current > 2) return;
                    lastKnownTimeRef.current = t;
                    onTimeUpdateRef.current?.(t);
                  }
                } catch {}
              }
              if (event.data === 0) {
                onEndedRef.current?.();
              }
            },
          },
        });

        // Poll current time when playing for YouTube
        intervalId = setInterval(() => {
          const player = ytPlayerRef.current;
          if (player && typeof player.getCurrentTime === "function") {
            try {
              const currentTime = player.getCurrentTime();
              if (typeof currentTime === "number" && !isNaN(currentTime)) {
                if (currentTime === 0 && lastKnownTimeRef.current > 2) return;
                lastKnownTimeRef.current = currentTime;
                onTimeUpdateRef.current?.(currentTime);
              }
            } catch {
              // Player may be unmounting or destroyed
            }
          }
        }, 250);
      });

      return () => {
        if (intervalId) clearInterval(intervalId);
        if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === "function") {
          try {
            ytPlayerRef.current.destroy();
          } catch {
            // Ignore destruction error
          }
          ytPlayerRef.current = null;
        }
        setIsYtReady(false);
      };
    }, [isYouTube, videoId]);

    // Raw YouTube postMessage listener to ensure fail-safe time tracking
    useEffect(() => {
      if (!isYouTube) return;

      const handleWindowMessage = (event: MessageEvent) => {
        try {
          let data = event.data;
          if (typeof data === "string") {
            data = JSON.parse(data);
          }
          if (data && data.event === "infoDelivery" && data.info) {
            if (typeof data.info.currentTime === "number" && !isNaN(data.info.currentTime)) {
              const t = data.info.currentTime;
              if (t === 0 && lastKnownTimeRef.current > 2) return;
              lastKnownTimeRef.current = t;
              onTimeUpdateRef.current?.(t);
            }
          }
        } catch {}
      };

      window.addEventListener("message", handleWindowMessage);
      return () => {
        window.removeEventListener("message", handleWindowMessage);
      };
    }, [isYouTube]);

    useImperativeHandle(
      ref,
      () => ({
        getCurrentTime: () => {
          if (isYouTube) {
            const player = ytPlayerRef.current;
            if (player && typeof player.getCurrentTime === "function") {
              try {
                const t = player.getCurrentTime();
                if (typeof t === "number" && !isNaN(t)) {
                  lastKnownTimeRef.current = t;
                  return t;
                }
              } catch {
                // Return cached fallback time
              }
            }
            return lastKnownTimeRef.current || 0;
          }
          return htmlVideoRef.current?.currentTime || 0;
        },
        getDuration: () => {
          if (isYouTube) {
            const player = ytPlayerRef.current;
            if (player && typeof player.getDuration === "function") {
              try {
                const d = player.getDuration();
                if (typeof d === "number" && !isNaN(d)) return d;
              } catch {}
            }
            return 0;
          }
          return htmlVideoRef.current?.duration || 0;
        },
        seekTo: (seconds: number) => {
          lastKnownTimeRef.current = seconds;
          if (isYouTube) {
            const player = ytPlayerRef.current;
            if (player && typeof player.seekTo === "function") {
              try {
                player.seekTo(seconds, true);
              } catch {
                // Ignore seek error if player not fully ready
              }
            }
          } else if (htmlVideoRef.current) {
            htmlVideoRef.current.currentTime = seconds;
          }
        },
        play: () => {
          if (isYouTube) {
            const player = ytPlayerRef.current;
            if (player && typeof player.playVideo === "function") {
              try {
                player.playVideo();
              } catch {
                // Ignore play error
              }
            }
          } else if (htmlVideoRef.current) {
            htmlVideoRef.current.play().catch(() => {});
          }
        },
        pause: () => {
          if (isYouTube) {
            const player = ytPlayerRef.current;
            if (player && typeof player.pauseVideo === "function") {
              try {
                player.pauseVideo();
              } catch {
                // Ignore pause error
              }
            }
          } else if (htmlVideoRef.current) {
            htmlVideoRef.current.pause();
          }
        },
        get currentTime() {
          if (isYouTube) {
            const player = ytPlayerRef.current;
            if (player && typeof player.getCurrentTime === "function") {
              try {
                const t = player.getCurrentTime();
                if (typeof t === "number" && !isNaN(t)) {
                  lastKnownTimeRef.current = t;
                  return t;
                }
              } catch {
                // Return cached fallback time
              }
            }
            return lastKnownTimeRef.current || 0;
          }
          return htmlVideoRef.current?.currentTime || 0;
        },
        set currentTime(seconds: number) {
          lastKnownTimeRef.current = seconds;
          if (isYouTube) {
            const player = ytPlayerRef.current;
            if (player && typeof player.seekTo === "function") {
              try {
                player.seekTo(seconds, true);
              } catch {
                // Ignore seek error
              }
            }
          } else if (htmlVideoRef.current) {
            htmlVideoRef.current.currentTime = seconds;
          }
        },
        get duration() {
          if (isYouTube) {
            const player = ytPlayerRef.current;
            if (player && typeof player.getDuration === "function") {
              try {
                const d = player.getDuration();
                if (typeof d === "number" && !isNaN(d)) return d;
              } catch {}
            }
            return 0;
          }
          return htmlVideoRef.current?.duration || 0;
        },
      }),
      [isYouTube],
    );

    if (isYouTube) {
      return (
        <div className="w-full h-full relative rounded-2xl overflow-hidden bg-black">
          <div id={containerIdRef.current} className="w-full h-full" />
          {!isYtReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs font-semibold">
              Đang tải trình phát YouTube...
            </div>
          )}
        </div>
      );
    }

    return (
      <video
        ref={htmlVideoRef}
        src={videoUrl || undefined}
        controls
        onTimeUpdate={() => {
          if (htmlVideoRef.current) {
            onTimeUpdateRef.current?.(htmlVideoRef.current.currentTime);
          }
        }}
        onSeeking={() => onSeekingRef.current?.()}
        onEnded={() => onEndedRef.current?.()}
        aria-label={title}
        className={className}
      >
        {captionUrl && <track kind="captions" src={captionUrl} label="Phụ đề" />}
      </video>
    );
  },
);
