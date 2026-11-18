"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSaveVideoPositionMutation } from "@/lib/queries/useLearningQueries";
import {
  getCachedVideoPosition,
  normalizeVideoPositionClient,
  setCachedVideoPosition,
} from "@/lib/video_position_cache";

const PERIODIC_SAVE_INTERVAL_MS = 10_000;
const PERIODIC_SAVE_MIN_DIFF_SECONDS = 3;
const SEEK_SAVE_DEBOUNCE_MS = 500;

export interface UseVideoPositionTrackerOptions {
  userId: string | null | undefined;
  courseId: string;
  itemId: string | null;
  isVideoItem: boolean;
  isVideoPlaying: boolean;
  isPreviewMode?: boolean;
  isItemLocked?: boolean;
  initialPositionSeconds?: number;
  initialDurationSeconds?: number;
  onPositionPersisted?: (
    itemId: string,
    positionSeconds: number,
    durationSeconds: number,
    updatedAt: string,
  ) => void;
}

interface ItemTrackerState {
  pos: number;
  duration: number;
  lastSavedPos: number;
  lastSavedDuration: number;
  lastCachedPos: number;
  inFlightPos: number | null;
}

function clampNonNegativeFloor(value: number): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

function getPersistableSnapshot(
  state: ItemTrackerState,
  minDiffSeconds: number,
  force: boolean,
): { positionSeconds: number; durationSeconds: number } | null {
  const normalized = normalizeVideoPositionClient(state.pos, state.duration);
  const effectiveDuration =
    normalized.durationSeconds > 0 ? normalized.durationSeconds : state.lastSavedDuration;

  const diff = Math.abs(normalized.positionSeconds - state.lastSavedPos);
  const isResetToZero = normalized.positionSeconds === 0 && state.lastSavedPos > 0;
  const needsDurationBackfill =
    effectiveDuration > 0 && state.lastSavedDuration === 0 && normalized.positionSeconds > 0;

  if (!force && diff < minDiffSeconds && !isResetToZero && !needsDurationBackfill) {
    return null;
  }

  return {
    positionSeconds: normalized.positionSeconds,
    durationSeconds: effectiveDuration,
  };
}

export function flushVideoPositionKeepalive(payload: {
  courseId: string;
  itemId: string;
  positionSeconds: number;
  durationSeconds: number;
}) {
  if (!payload.courseId || !payload.itemId) return;

  fetch("/rpc/learning.v1.LearningService/SaveVideoPosition", {
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
      positionSeconds: clampNonNegativeFloor(payload.positionSeconds),
      durationSeconds: clampNonNegativeFloor(payload.durationSeconds),
    }),
  }).catch(() => {
    // Ignore background flush error on unload
  });
}

export function useVideoPositionTracker({
  userId,
  courseId,
  itemId,
  isVideoItem,
  isVideoPlaying,
  isPreviewMode = false,
  isItemLocked = false,
  initialPositionSeconds = 0,
  initialDurationSeconds = 0,
  onPositionPersisted,
}: UseVideoPositionTrackerOptions) {
  const enabled = Boolean(!isPreviewMode && !isItemLocked && isVideoItem && courseId && itemId);

  const stateByItemRef = useRef<Record<string, ItemTrackerState>>({});
  const seekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMutation = useSaveVideoPositionMutation();

  const mutateAsyncRef = useRef(saveMutation.mutateAsync);
  const onPositionPersistedRef = useRef(onPositionPersisted);
  const contextRef = useRef({
    userId,
    courseId,
    itemId,
    enabled,
    initialPositionSeconds,
    initialDurationSeconds,
  });

  useEffect(() => {
    mutateAsyncRef.current = saveMutation.mutateAsync;
    onPositionPersistedRef.current = onPositionPersisted;
    contextRef.current = {
      userId,
      courseId,
      itemId,
      enabled,
      initialPositionSeconds,
      initialDurationSeconds,
    };
  });

  const getOrInitItemState = useCallback(
    (targetItemId: string, seedPos = 0, seedDuration = 0): ItemTrackerState => {
      const existing = stateByItemRef.current[targetItemId];
      if (existing) {
        return existing;
      }
      const floorPos = clampNonNegativeFloor(seedPos);
      const floorDur = clampNonNegativeFloor(seedDuration);
      const created: ItemTrackerState = {
        pos: floorPos,
        duration: floorDur,
        lastSavedPos: floorPos,
        lastSavedDuration: floorDur,
        lastCachedPos: floorPos,
        inFlightPos: null,
      };
      stateByItemRef.current[targetItemId] = created;
      return created;
    },
    [],
  );

  const clearSeekTimer = useCallback(() => {
    if (seekDebounceRef.current) {
      clearTimeout(seekDebounceRef.current);
      seekDebounceRef.current = null;
    }
  }, []);

  const persistItemPosition = useCallback(
    async (
      targetCourseId: string,
      targetItemId: string,
      targetUserId: string | null | undefined,
      minDiffSeconds: number,
      force = false,
    ) => {
      const state = getOrInitItemState(targetItemId);
      const snapshot = getPersistableSnapshot(state, minDiffSeconds, force);
      if (!snapshot) return;
      if (!force && state.inFlightPos === snapshot.positionSeconds) return;

      state.inFlightPos = snapshot.positionSeconds;
      if (snapshot.durationSeconds > state.duration) {
        state.duration = snapshot.durationSeconds;
      }

      try {
        const res = await mutateAsyncRef.current({
          courseId: targetCourseId,
          itemId: targetItemId,
          positionSeconds: snapshot.positionSeconds,
          durationSeconds: snapshot.durationSeconds,
        });

        const savedPos = res.savedPositionSeconds ?? snapshot.positionSeconds;
        state.lastSavedPos = savedPos;
        if (snapshot.durationSeconds > 0) {
          state.lastSavedDuration = snapshot.durationSeconds;
        }
        state.inFlightPos = null;

        const serverMs = res.updatedAt ? Date.parse(res.updatedAt) : NaN;
        if (Math.abs(state.pos - snapshot.positionSeconds) < 2) {
          setCachedVideoPosition(targetUserId, targetItemId, savedPos, snapshot.durationSeconds, {
            updatedAtMs: Number.isFinite(serverMs) ? serverMs : Date.now(),
            synced: true,
          });
          state.lastCachedPos = savedPos;
        }

        onPositionPersistedRef.current?.(
          targetItemId,
          savedPos,
          snapshot.durationSeconds,
          res.updatedAt || new Date().toISOString(),
        );
      } catch {
        state.inFlightPos = null;
      }
    },
    [getOrInitItemState],
  );

  const flushKeepaliveForCurrentItem = useCallback(
    (targetCourseId: string, targetItemId: string, targetUserId: string | null | undefined) => {
      if (!targetCourseId || !targetItemId) return;
      const state = stateByItemRef.current[targetItemId];
      if (!state) return;

      const snapshot = getPersistableSnapshot(state, 1, false);
      if (!snapshot) return;

      state.lastSavedPos = snapshot.positionSeconds;
      if (snapshot.durationSeconds > 0) {
        state.lastSavedDuration = snapshot.durationSeconds;
      }
      state.lastCachedPos = snapshot.positionSeconds;

      setCachedVideoPosition(
        targetUserId,
        targetItemId,
        snapshot.positionSeconds,
        snapshot.durationSeconds,
      );

      flushVideoPositionKeepalive({
        courseId: targetCourseId,
        itemId: targetItemId,
        positionSeconds: snapshot.positionSeconds,
        durationSeconds: snapshot.durationSeconds,
      });

      onPositionPersistedRef.current?.(
        targetItemId,
        snapshot.positionSeconds,
        snapshot.durationSeconds,
        new Date().toISOString(),
      );
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !itemId) return;

    const currentItemId = itemId;
    const currentCourseId = courseId;
    const currentUserId = contextRef.current.userId;
    const initPos = clampNonNegativeFloor(contextRef.current.initialPositionSeconds);
    const initDur = clampNonNegativeFloor(contextRef.current.initialDurationSeconds);

    stateByItemRef.current[currentItemId] = {
      pos: initPos,
      duration: initDur,
      lastSavedPos: initPos,
      lastSavedDuration: initDur,
      lastCachedPos: initPos,
      inFlightPos: null,
    };

    return () => {
      clearSeekTimer();
      flushKeepaliveForCurrentItem(
        currentCourseId,
        currentItemId,
        contextRef.current.userId ?? currentUserId,
      );
    };
  }, [enabled, courseId, itemId, clearSeekTimer, flushKeepaliveForCurrentItem]);

  useEffect(() => {
    if (!enabled || !itemId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearSeekTimer();
        flushKeepaliveForCurrentItem(courseId, itemId, contextRef.current.userId);
      }
    };

    const handlePageHide = () => {
      clearSeekTimer();
      flushKeepaliveForCurrentItem(courseId, itemId, contextRef.current.userId);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [enabled, courseId, itemId, clearSeekTimer, flushKeepaliveForCurrentItem]);

  useEffect(() => {
    if (!enabled || !itemId || !isVideoPlaying) return;

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void persistItemPosition(
        courseId,
        itemId,
        contextRef.current.userId,
        PERIODIC_SAVE_MIN_DIFF_SECONDS,
      );
    }, PERIODIC_SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, courseId, itemId, isVideoPlaying, persistItemPosition]);

  const updateStateAndCache = useCallback(
    (
      targetItemId: string,
      targetUserId: string | null | undefined,
      positionSeconds: number,
      durationSeconds: number,
    ): ItemTrackerState => {
      const state = getOrInitItemState(targetItemId);
      const floorPos = clampNonNegativeFloor(positionSeconds);
      const floorDur = clampNonNegativeFloor(durationSeconds);
      state.pos = floorPos;
      if (floorDur > 0) {
        state.duration = floorDur;
      }
      state.lastCachedPos = floorPos;
      setCachedVideoPosition(targetUserId, targetItemId, floorPos, state.duration);
      return state;
    },
    [getOrInitItemState],
  );

  const reportTimeUpdate = useCallback(
    (positionSeconds: number, durationSeconds: number) => {
      const ctx = contextRef.current;
      if (!ctx.enabled || !ctx.itemId) return;

      const floorPos = clampNonNegativeFloor(positionSeconds);
      const floorDur = clampNonNegativeFloor(durationSeconds);
      const state = getOrInitItemState(ctx.itemId);
      state.pos = floorPos;
      if (floorDur > 0) {
        state.duration = floorDur;
      }

      if (
        Math.abs(floorPos - state.lastCachedPos) >= 1 ||
        (floorPos === 0 && state.lastCachedPos > 0)
      ) {
        state.lastCachedPos = floorPos;
        setCachedVideoPosition(ctx.userId, ctx.itemId, floorPos, state.duration);
      }
    },
    [getOrInitItemState],
  );

  const reportPause = useCallback(
    (positionSeconds: number, durationSeconds: number) => {
      const ctx = contextRef.current;
      if (!ctx.enabled || !ctx.itemId) return;

      clearSeekTimer();
      updateStateAndCache(ctx.itemId, ctx.userId, positionSeconds, durationSeconds);
      void persistItemPosition(ctx.courseId, ctx.itemId, ctx.userId, 1);
    },
    [clearSeekTimer, updateStateAndCache, persistItemPosition],
  );

  const reportSeeked = useCallback(
    (positionSeconds: number, durationSeconds: number) => {
      const ctx = contextRef.current;
      if (!ctx.enabled || !ctx.itemId) return;

      const { courseId: targetCourseId, itemId: targetItemId, userId: targetUserId } = ctx;
      updateStateAndCache(targetItemId, targetUserId, positionSeconds, durationSeconds);

      clearSeekTimer();
      seekDebounceRef.current = setTimeout(() => {
        seekDebounceRef.current = null;
        void persistItemPosition(targetCourseId, targetItemId, targetUserId, 1);
      }, SEEK_SAVE_DEBOUNCE_MS);
    },
    [clearSeekTimer, updateStateAndCache, persistItemPosition],
  );

  const resetPositionToZero = useCallback(
    (durationSeconds: number, onlyIfPreviouslyNonZero: boolean) => {
      const ctx = contextRef.current;
      if (!ctx.enabled || !ctx.itemId) return;

      clearSeekTimer();
      const state = getOrInitItemState(ctx.itemId);
      const hadNonZero =
        state.pos > 0 ||
        state.lastSavedPos > 0 ||
        (getCachedVideoPosition(ctx.userId, ctx.itemId)?.positionSeconds ?? 0) > 0;

      updateStateAndCache(ctx.itemId, ctx.userId, 0, durationSeconds);
      onPositionPersistedRef.current?.(ctx.itemId, 0, state.duration, new Date().toISOString());

      if (!onlyIfPreviouslyNonZero || hadNonZero) {
        void persistItemPosition(ctx.courseId, ctx.itemId, ctx.userId, 0, true);
      }
    },
    [clearSeekTimer, getOrInitItemState, updateStateAndCache, persistItemPosition],
  );

  const reportEnded = useCallback(
    (durationSeconds: number) => resetPositionToZero(durationSeconds, true),
    [resetPositionToZero],
  );

  const resetToZero = useCallback(
    (durationSeconds: number) => resetPositionToZero(durationSeconds, false),
    [resetPositionToZero],
  );

  return {
    reportTimeUpdate,
    reportPause,
    reportSeeked,
    reportEnded,
    resetToZero,
  };
}
