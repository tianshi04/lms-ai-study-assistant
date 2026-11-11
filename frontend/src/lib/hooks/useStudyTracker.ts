"use client";

import { useEffect, useRef, useCallback } from "react";
import { Code, ConnectError } from "@connectrpc/connect";
import { useRecordLearningTimeMutation } from "@/lib/queries/useLearningQueries";

interface UseStudyTrackerOptions {
  courseId: string;
  itemId: string | null;
  isVideoPlaying?: boolean;
  isPreviewMode?: boolean;
  isEnrolled: boolean;
}

const HEARTBEAT_INTERVAL_MS = 30_000;
const IDLE_TIMEOUT_MS = 120_000;

export function flushStudyTimeKeepalive(
  payload: {
    courseId: string;
    itemId: string;
    deltaSeconds: number;
    clientTimezone: string;
  },
  onBlocked?: () => void,
) {
  if (payload.deltaSeconds <= 0) return;

  fetch("/rpc/learning.v1.LearningService/RecordLearningTime", {
    method: "POST",
    keepalive: true,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
    },
    body: JSON.stringify({
      courseId: payload.courseId,
      itemId: payload.itemId,
      deltaSeconds: payload.deltaSeconds,
      clientTimezone: payload.clientTimezone,
    }),
  })
    .then((res) => {
      if (res.status === 401 || res.status === 403) {
        onBlocked?.();
      }
    })
    .catch(() => {
      // Ignore background flush error on unload
    });
}

export function useStudyTracker({
  courseId,
  itemId,
  isVideoPlaying = false,
  isPreviewMode = false,
  isEnrolled,
}: UseStudyTrackerOptions) {
  const activeDeltaRef = useRef<number>(0);
  const lastInteractionRef = useRef<number>(0);
  const isVideoPlayingRef = useRef(isVideoPlaying);
  const isBlockedRef = useRef(false);

  useEffect(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  useEffect(() => {
    isBlockedRef.current = false;
  }, [courseId, isPreviewMode, isEnrolled]);

  useEffect(() => {
    activeDeltaRef.current = 0;
  }, [courseId, itemId, isPreviewMode, isEnrolled]);

  useEffect(() => {
    isVideoPlayingRef.current = isVideoPlaying;
  }, [isVideoPlaying]);

  const recordMutation = useRecordLearningTimeMutation({
    onError: (err) => {
      if (
        err instanceof ConnectError &&
        (err.code === Code.PermissionDenied || err.code === Code.Unauthenticated)
      ) {
        isBlockedRef.current = true;
        activeDeltaRef.current = 0;
      }
    },
  });
  const mutateRef = useRef(recordMutation.mutate);
  useEffect(() => {
    mutateRef.current = recordMutation.mutate;
  });

  const getClientTimezone = useCallback(() => {
    return typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "Asia/Ho_Chi_Minh";
  }, []);

  const canTrack = !isPreviewMode && isEnrolled && Boolean(courseId) && Boolean(itemId);

  const flush = useCallback(() => {
    if (!canTrack || !itemId || isBlockedRef.current) return;
    const delta = activeDeltaRef.current;
    if (delta <= 0) return;

    activeDeltaRef.current = 0;
    flushStudyTimeKeepalive(
      {
        courseId,
        itemId,
        deltaSeconds: delta,
        clientTimezone: getClientTimezone(),
      },
      () => {
        isBlockedRef.current = true;
        activeDeltaRef.current = 0;
      },
    );
  }, [canTrack, courseId, itemId, getClientTimezone]);

  useEffect(() => {
    const onUserInteraction = () => {
      lastInteractionRef.current = Date.now();
    };

    window.addEventListener("mousemove", onUserInteraction, { passive: true });
    window.addEventListener("keydown", onUserInteraction, { passive: true });
    window.addEventListener("scroll", onUserInteraction, { passive: true });
    window.addEventListener("touchstart", onUserInteraction, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
      window.removeEventListener("scroll", onUserInteraction);
      window.removeEventListener("touchstart", onUserInteraction);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    const handleBeforeUnload = () => {
      flush();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [flush]);

  useEffect(() => {
    if (!canTrack) return;

    const interval = setInterval(() => {
      if (isBlockedRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      const isVideo = isVideoPlayingRef.current;
      const isRecentInteraction = Date.now() - lastInteractionRef.current < IDLE_TIMEOUT_MS;

      if (isVideo || isRecentInteraction) {
        activeDeltaRef.current += 1;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [canTrack]);

  useEffect(() => {
    if (!canTrack || !itemId) return;

    const heartbeat = setInterval(() => {
      if (isBlockedRef.current) return;
      const delta = activeDeltaRef.current;
      if (delta >= 15) {
        activeDeltaRef.current = 0;
        mutateRef.current({
          courseId,
          itemId,
          deltaSeconds: delta,
        });
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(heartbeat);
  }, [canTrack, courseId, itemId]);

  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  return { flush };
}
