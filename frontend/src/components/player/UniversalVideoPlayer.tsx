"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
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
  onTimeUpdate?: (currentTime: number) => void;
  onSeeking?: () => void;
  onEnded?: () => void;
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
      onTimeUpdate,
      onSeeking,
      onEnded,
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
    const containerIdRef = useRef<string>(
      `yt-player-${Math.random().toString(36).substring(2, 9)}`,
    );
    const activeVideoIdRef = useRef<string | null>(null);
    const [isYtReady, setIsYtReady] = useState(false);

    const lastKnownTimeRef = useRef<number>(0);

    const onTimeUpdateRef = useRef(onTimeUpdate);
    onTimeUpdateRef.current = onTimeUpdate;

    const onSeekingRef = useRef(onSeeking);
    onSeekingRef.current = onSeeking;

    const onEndedRef = useRef(onEnded);
    onEndedRef.current = onEnded;

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
          activeVideoIdRef.current = videoId;
          ytPlayerRef.current.cueVideoById(videoId);
          lastKnownTimeRef.current = 0;
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

          activeVideoIdRef.current = videoId;
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
                      const t = event.target.getCurrentTime();
                      const state = event.target.getPlayerState?.();
                      const isPausedOrEnded = state === 2 || state === 0;
                      if (typeof t === "number" && !isNaN(t)) {
                        if (t === 0 && lastKnownTimeRef.current > 2 && !isPausedOrEnded) return;
                        if (t > 0) lastKnownTimeRef.current = t;
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
            const currentTime = player.getCurrentTime();
            const state = player.getPlayerState?.();
            const isPausedOrEnded = state === 2 || state === 0;
            if (typeof currentTime === "number" && !isNaN(currentTime)) {
              if (currentTime === 0 && lastKnownTimeRef.current > 2 && !isPausedOrEnded) return;
              if (currentTime > 0) lastKnownTimeRef.current = currentTime;
              onTimeUpdateRef.current?.(currentTime);
            }
          } catch {
            // Player may be unmounting or destroyed
          }
        }
      }, 250);

      return () => {
        isCancelled = true;
        if (intervalId) clearInterval(intervalId);
      };
    }, [isYouTube, videoId]);

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
            if (typeof data.info.currentTime === "number" && !isNaN(data.info.currentTime)) {
              const t = data.info.currentTime;
              const player = ytPlayerRef.current;
              const state = player?.getPlayerState?.();
              const isPausedOrEnded = state === 2 || state === 0;
              if (t === 0 && lastKnownTimeRef.current > 2 && !isPausedOrEnded) return;
              if (t > 0) lastKnownTimeRef.current = t;
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
                if (typeof t === "number" && !isNaN(t) && t > 0) {
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
                if (typeof t === "number" && !isNaN(t) && t > 0) {
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
      [isYouTube],
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
        {captionUrl ? <track kind="captions" src={captionUrl} srcLang="vi" label="On" /> : null}
      </video>
    );
  },
);
