"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useMediaSession } from "@/hooks/useMediaSession";

export interface UniversalVideoRef {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  currentTime: number;
  duration: number;
  togglePictureInPicture?: () => Promise<void>;
  setPlaybackRate?: (rate: number) => void;
}

interface UniversalVideoPlayerProps {
  videoUrl: string;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onSeeking?: () => void;
  onSeeked?: (currentTime: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  onNextLesson?: () => void;
  onPreviousLesson?: () => void;
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
          host?: string;
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
      initialTime = 0,
      onTimeUpdate,
      onSeeking,
      onSeeked,
      onEnded,
      onPlay,
      onPause,
      title = "Video bài giảng",
      artist = "Coursera AI LMS",
      album = "Khóa học trực tuyến",
      artworkUrl,
      onNextLesson,
      onPreviousLesson,
      captionUrl,
      className = "w-full h-full object-contain rounded-2xl",
    },
    ref,
  ) {
    const videoId = extractYouTubeVideoId(videoUrl);
    const isYouTube = !videoId ? false : Boolean(videoId);
    const htmlVideoRef = useRef<HTMLVideoElement | null>(null);
    const ytPlayerRef = useRef<any>(null);
    const mountPointRef = useRef<HTMLDivElement | null>(null);
    const rawId = useId();
    const containerId = `yt-player-${rawId.replace(/[^a-zA-Z0-9-_]/g, "")}`;
    const containerIdRef = useRef<string>(containerId);
    const activeVideoIdRef = useRef<string | null>(null);
    const [isYtReady, setIsYtReady] = useState(false);

    const lastKnownTimeRef = useRef<number>(initialTime >= 5 ? Math.floor(initialTime) : 0);
    const lastYtTimeWallMsRef = useRef<number>(0);
    const ytPendingSeekRef = useRef<{ target: number; expiresAt: number } | null>(null);
    const hasYtInitialTimeSettledRef = useRef<boolean>(initialTime < 5);
    const hasAppliedHtmlInitialSeekRef = useRef<boolean>(false);
    const htmlInitialSeekTargetRef = useRef<number | null>(
      initialTime >= 5 ? Math.floor(initialTime) : null,
    );

    const initialTimeRef = useRef(initialTime);
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onSeekingRef = useRef(onSeeking);
    const onSeekedRef = useRef(onSeeked);
    const onEndedRef = useRef(onEnded);
    const onPlayRef = useRef(onPlay);
    const onPauseRef = useRef(onPause);

    useLayoutEffect(() => {
      containerIdRef.current = containerId;
      initialTimeRef.current = initialTime;
      onTimeUpdateRef.current = onTimeUpdate;
      onSeekingRef.current = onSeeking;
      onSeekedRef.current = onSeeked;
      onEndedRef.current = onEnded;
      onPlayRef.current = onPlay;
      onPauseRef.current = onPause;
    });

    const applyHtmlInitialSeek = useCallback(() => {
      const video = htmlVideoRef.current;
      const target = initialTimeRef.current;
      if (!video || isYouTube || hasAppliedHtmlInitialSeekRef.current) return;
      if (!Number.isFinite(target) || target < 5) {
        hasAppliedHtmlInitialSeekRef.current = true;
        htmlInitialSeekTargetRef.current = null;
        return;
      }
      if (video.readyState < 1) return;

      const duration = video.duration;
      const clampedTarget =
        typeof duration === "number" && Number.isFinite(duration) && duration > 0
          ? Math.min(target, Math.max(0, duration - 0.5))
          : target;

      htmlInitialSeekTargetRef.current = clampedTarget;
      lastKnownTimeRef.current = clampedTarget;
      hasAppliedHtmlInitialSeekRef.current = true;
      if (Math.abs(video.currentTime - clampedTarget) > 0.5) {
        video.currentTime = clampedTarget;
      }
    }, [isYouTube]);

    useEffect(() => {
      hasAppliedHtmlInitialSeekRef.current = false;
    }, [videoUrl]);

    useEffect(() => {
      applyHtmlInitialSeek();
    }, [videoUrl, applyHtmlInitialSeek, initialTime]);

    const handleYtReportedTime = useCallback((t: number, explicitState?: number) => {
      if (typeof t !== "number" || !Number.isFinite(t)) return;

      const pendingSeek = ytPendingSeekRef.current;
      if (pendingSeek) {
        const hasCaughtUp = Math.abs(t - pendingSeek.target) <= 2.0;
        if (hasCaughtUp || Date.now() > pendingSeek.expiresAt) {
          ytPendingSeekRef.current = null;
        } else {
          return;
        }
      }

      const player = ytPlayerRef.current;
      const resolvedState = explicitState ?? player?.getPlayerState?.();
      const isPausedOrEnded = resolvedState === 2 || resolvedState === 0;
      const isUnstartedOrCued = resolvedState === -1 || resolvedState === 5;

      if (t === 0 && lastKnownTimeRef.current > 2 && !isPausedOrEnded) return;
      if (t === 0 && isUnstartedOrCued && lastKnownTimeRef.current > 0) return;

      const prevT = lastKnownTimeRef.current;
      const now = Date.now();
      const elapsedSec =
        lastYtTimeWallMsRef.current > 0 ? (now - lastYtTimeWallMsRef.current) / 1000 : 0;
      lastYtTimeWallMsRef.current = now;

      const isPlaying = resolvedState === 1;
      let playbackRate = 1;
      try {
        playbackRate = player?.getPlaybackRate?.() || 1;
      } catch {
        playbackRate = 1;
      }
      const expectedDelta = isPlaying ? Math.max(0, elapsedSec) * playbackRate : 0;
      const unexpectedJump = Math.abs(t - prevT - expectedDelta);

      if (t > 0 || isPausedOrEnded) {
        lastKnownTimeRef.current = t;
      }
      onTimeUpdateRef.current?.(t);

      if (!hasYtInitialTimeSettledRef.current && t > 0) {
        hasYtInitialTimeSettledRef.current = true;
        if (Math.abs(t - initialTimeRef.current) <= 10) {
          return;
        }
      }

      if (unexpectedJump > 2.5 && prevT >= 0 && resolvedState !== 0) {
        onSeekedRef.current?.(t);
      }
    }, []);

    // ─── Modern Web API: Media Session Integration ───
    useMediaSession({
      title,
      artist,
      album,
      artworkUrl,
      onPlay: () => {
        if (isYouTube) {
          ytPlayerRef.current?.playVideo?.();
        } else {
          htmlVideoRef.current?.play().catch(() => {});
        }
      },
      onPause: () => {
        if (isYouTube) {
          ytPlayerRef.current?.pauseVideo?.();
        } else {
          htmlVideoRef.current?.pause();
        }
      },
      onSeekBackward: () => {
        if (isYouTube) {
          const t = ytPlayerRef.current?.getCurrentTime?.() || 0;
          ytPlayerRef.current?.seekTo?.(Math.max(0, t - 10), true);
        } else if (htmlVideoRef.current) {
          htmlVideoRef.current.currentTime = Math.max(0, htmlVideoRef.current.currentTime - 10);
        }
      },
      onSeekForward: () => {
        if (isYouTube) {
          const t = ytPlayerRef.current?.getCurrentTime?.() || 0;
          ytPlayerRef.current?.seekTo?.(t + 10, true);
        } else if (htmlVideoRef.current) {
          htmlVideoRef.current.currentTime += 10;
        }
      },
      onNextLesson,
      onPreviousLesson,
    });

    // ─── Modern Web API: Screen Wake Lock Integration ───
    useEffect(() => {
      let wakeLock: any = null;

      const requestWakeLock = async () => {
        if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
          try {
            wakeLock = await (navigator as any).wakeLock.request("screen");
          } catch {}
        }
      };

      const releaseWakeLock = () => {
        if (wakeLock) {
          wakeLock.release().catch(() => {});
          wakeLock = null;
        }
      };

      const video = htmlVideoRef.current;
      if (video) {
        video.addEventListener("play", requestWakeLock);
        video.addEventListener("pause", releaseWakeLock);
        video.addEventListener("ended", releaseWakeLock);
      }

      return () => {
        if (video) {
          video.removeEventListener("play", requestWakeLock);
          video.removeEventListener("pause", releaseWakeLock);
          video.removeEventListener("ended", releaseWakeLock);
        }
        releaseWakeLock();
      };
    }, [isYouTube]);

    // Keep HTML5 native caption track disabled (Off) by default
    useEffect(() => {
      if (
        htmlVideoRef.current &&
        htmlVideoRef.current.textTracks &&
        htmlVideoRef.current.textTracks.length > 0
      ) {
        for (let i = 0; i < htmlVideoRef.current.textTracks.length; i++) {
          htmlVideoRef.current.textTracks[i].mode = "disabled";
        }
      }
    }, [captionUrl]);

    // Cleanup YouTube player on unmount
    useEffect(() => {
      return () => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === "function") {
          try {
            ytPlayerRef.current.destroy();
          } catch {}
          ytPlayerRef.current = null;
        }
      };
    }, []);

    // Initialize or update YouTube Iframe Player
    useEffect(() => {
      if (!isYouTube || !videoId) return;

      let intervalId: NodeJS.Timeout | null = null;
      let isCancelled = false;

      // If player already exists and videoId changed, cue the new video dynamically
      if (
        ytPlayerRef.current &&
        typeof ytPlayerRef.current.cueVideoById === "function" &&
        activeVideoIdRef.current !== videoId
      ) {
        try {
          const startSeconds = initialTimeRef.current >= 5 ? Math.floor(initialTimeRef.current) : 0;
          activeVideoIdRef.current = videoId;
          ytPlayerRef.current.cueVideoById({ videoId, startSeconds });
          lastKnownTimeRef.current = startSeconds;
          lastYtTimeWallMsRef.current = 0;
          ytPendingSeekRef.current = null;
          hasYtInitialTimeSettledRef.current = startSeconds < 5;
          setIsYtReady(true);
        } catch {
          try {
            ytPlayerRef.current?.destroy?.();
          } catch {}
          ytPlayerRef.current = null;
        }
      }

      // If player does not exist, initialize it inside mountPointRef
      if (!ytPlayerRef.current) {
        loadYouTubeIframeApi(() => {
          if (isCancelled || !window.YT || !window.YT.Player) return;
          if (!mountPointRef.current) return;

          const startSeconds = initialTimeRef.current >= 5 ? Math.floor(initialTimeRef.current) : 0;
          activeVideoIdRef.current = videoId;
          lastKnownTimeRef.current = startSeconds;
          lastYtTimeWallMsRef.current = 0;
          ytPendingSeekRef.current = null;
          hasYtInitialTimeSettledRef.current = startSeconds < 5;

          try {
            mountPointRef.current.innerHTML = "";
            const dummyDiv = document.createElement("div");
            dummyDiv.id = containerIdRef.current;
            dummyDiv.className = "w-full h-full";
            mountPointRef.current.appendChild(dummyDiv);

            const playerInstance = new window.YT.Player(dummyDiv, {
              host: "https://www.youtube.com",
              videoId: videoId,
              playerVars: {
                autoplay: 0,
                controls: 1,
                rel: 0,
                enablejsapi: 1,
                modestbranding: 1,
                origin: typeof window !== "undefined" ? window.location.origin : undefined,
                ...(startSeconds > 0 ? { start: startSeconds } : {}),
              },
              events: {
                onReady: (event: any) => {
                  if (isCancelled) return;
                  ytPlayerRef.current = event.target;
                  setIsYtReady(true);
                },
                onStateChange: (event: { data: number; target?: any }) => {
                  if (isCancelled) return;
                  if (event.target && typeof event.target.getCurrentTime === "function") {
                    ytPlayerRef.current = event.target;
                    try {
                      handleYtReportedTime(event.target.getCurrentTime(), event.data);
                    } catch {}
                  }
                  if (event.data === 1) {
                    onPlayRef.current?.();
                  } else if (event.data === 2) {
                    onPauseRef.current?.();
                  } else if (event.data === 0) {
                    onEndedRef.current?.();
                  }
                },
              },
            });
            ytPlayerRef.current = playerInstance;
          } catch (err) {
            console.error("Failed to create YT.Player instance:", err);
          }
        });
      }

      // Poll current time when playing for YouTube
      intervalId = setInterval(() => {
        const player = ytPlayerRef.current;
        if (player && typeof player.getCurrentTime === "function") {
          try {
            handleYtReportedTime(player.getCurrentTime());
          } catch {
            // Player may be unmounting or destroyed
          }
        }
      }, 250);

      return () => {
        isCancelled = true;
        if (intervalId) clearInterval(intervalId);
      };
    }, [isYouTube, videoId, handleYtReportedTime]);

    // Raw YouTube postMessage listener to ensure fail-safe time tracking
    useEffect(() => {
      if (!isYouTube) return;

      const handleWindowMessage = (event: MessageEvent) => {
        if (event.origin && !event.origin.includes("youtube.com")) return;
        try {
          let data = event.data;
          if (typeof data === "string") {
            data = JSON.parse(data);
          }
          if (data && data.event === "infoDelivery" && data.info) {
            if (typeof data.info.currentTime === "number") {
              handleYtReportedTime(data.info.currentTime);
            }
          }
        } catch {}
      };

      window.addEventListener("message", handleWindowMessage);
      return () => {
        window.removeEventListener("message", handleWindowMessage);
      };
    }, [isYouTube, handleYtReportedTime]);

    const readCurrentTime = useCallback(() => {
      if (isYouTube) {
        const player = ytPlayerRef.current;
        if (player && typeof player.getCurrentTime === "function") {
          try {
            const t = player.getCurrentTime();
            if (typeof t === "number" && Number.isFinite(t) && t > 0) {
              lastKnownTimeRef.current = t;
              return t;
            }
          } catch {
            // Return cached fallback time
          }
        }
        return lastKnownTimeRef.current || 0;
      }
      const htmlTime = htmlVideoRef.current?.currentTime;
      return typeof htmlTime === "number" && Number.isFinite(htmlTime) ? htmlTime : 0;
    }, [isYouTube]);

    const readDuration = useCallback(() => {
      if (isYouTube) {
        const player = ytPlayerRef.current;
        if (player && typeof player.getDuration === "function") {
          try {
            const d = player.getDuration();
            if (typeof d === "number" && Number.isFinite(d) && d > 0) return d;
          } catch {}
        }
        return 0;
      }
      const d = htmlVideoRef.current?.duration;
      return typeof d === "number" && Number.isFinite(d) && d > 0 ? d : 0;
    }, [isYouTube]);

    const performSeek = useCallback(
      (seconds: number) => {
        const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
        htmlInitialSeekTargetRef.current = null;
        hasYtInitialTimeSettledRef.current = true;
        lastKnownTimeRef.current = safeSeconds;
        lastYtTimeWallMsRef.current = Date.now();
        ytPendingSeekRef.current = { target: safeSeconds, expiresAt: Date.now() + 2000 };

        if (isYouTube) {
          const player = ytPlayerRef.current;
          if (player) {
            try {
              const state = player.getPlayerState?.();
              if (
                (state === -1 || state === 5) &&
                safeSeconds === 0 &&
                typeof player.cueVideoById === "function" &&
                activeVideoIdRef.current
              ) {
                player.cueVideoById({ videoId: activeVideoIdRef.current, startSeconds: 0 });
              } else if (typeof player.seekTo === "function") {
                player.seekTo(safeSeconds, true);
              }
            } catch {
              // Ignore seek error if player not fully ready
            }
          }
        } else if (htmlVideoRef.current) {
          htmlVideoRef.current.currentTime = safeSeconds;
        }

        onTimeUpdateRef.current?.(safeSeconds);
        onSeekedRef.current?.(safeSeconds);
      },
      [isYouTube],
    );

    useImperativeHandle(
      ref,
      () => ({
        getCurrentTime: readCurrentTime,
        getDuration: readDuration,
        seekTo: performSeek,
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
          return readCurrentTime();
        },
        set currentTime(seconds: number) {
          performSeek(seconds);
        },
        get duration() {
          return readDuration();
        },
        togglePictureInPicture: async () => {
          if (typeof document === "undefined") return;
          if (htmlVideoRef.current && document.pictureInPictureEnabled) {
            try {
              if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
              } else {
                await htmlVideoRef.current.requestPictureInPicture();
              }
            } catch {}
          }
        },
        setPlaybackRate: (rate: number) => {
          if (isYouTube) {
            ytPlayerRef.current?.setPlaybackRate?.(rate);
          } else if (htmlVideoRef.current) {
            htmlVideoRef.current.playbackRate = rate;
          }
        },
      }),
      [isYouTube, readCurrentTime, readDuration, performSeek],
    );

    if (isYouTube) {
      return (
        <div className="w-full h-full relative rounded-2xl overflow-hidden bg-black">
          <div ref={mountPointRef} className="w-full h-full" />
          {!isYtReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs font-semibold">
              Đang tải trình phát YouTube…
            </div>
          )}
        </div>
      );
    }

    return (
      /* oxlint-disable-next-line jsx-a11y/media-has-caption */
      <video
        ref={htmlVideoRef}
        src={videoUrl || undefined}
        controls
        onLoadedMetadata={applyHtmlInitialSeek}
        onTimeUpdate={() => {
          if (htmlVideoRef.current) {
            const t = htmlVideoRef.current.currentTime;
            if (t > 0) {
              lastKnownTimeRef.current = t;
            }
            if (
              htmlInitialSeekTargetRef.current !== null &&
              Math.abs(t - htmlInitialSeekTargetRef.current) > 2.5
            ) {
              htmlInitialSeekTargetRef.current = null;
            }
            onTimeUpdateRef.current?.(t);
          }
        }}
        onSeeking={() => onSeekingRef.current?.()}
        onSeeked={() => {
          if (htmlVideoRef.current) {
            const t = htmlVideoRef.current.currentTime;
            lastKnownTimeRef.current = t;
            if (
              htmlInitialSeekTargetRef.current !== null &&
              Math.abs(t - htmlInitialSeekTargetRef.current) <= 1.5
            ) {
              htmlInitialSeekTargetRef.current = null;
              return;
            }
            htmlInitialSeekTargetRef.current = null;
            onSeekedRef.current?.(t);
          }
        }}
        onPlay={() => onPlayRef.current?.()}
        onPause={() => {
          if (!htmlVideoRef.current?.ended) {
            onPauseRef.current?.();
          }
        }}
        onEnded={() => onEndedRef.current?.()}
        aria-label={title}
        className={className}
      >
        {captionUrl ? <track kind="captions" src={captionUrl} srcLang="vi" label="On" /> : null}
      </video>
    );
  },
);
