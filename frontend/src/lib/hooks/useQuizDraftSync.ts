"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSaveQuizDraftMutation } from "@/lib/queries/useAssessmentQueries";
import {
  clearCachedQuizDraft,
  getQuizDraftCacheKey,
  normalizeQuizDraftAnswersClient,
  setCachedQuizDraft,
  type CachedQuizDraft,
} from "@/lib/quiz_draft_cache";

const DRAFT_SAVE_DEBOUNCE_MS = 1_000;

export type QuizDraftSyncStatus = "idle" | "saving" | "saved" | "offline_pending" | "error";

export interface UseQuizDraftSyncOptions {
  userId: string | null | undefined;
  itemId: string;
  sessionId: string;
  sessionSeed: number;
  expiresAtIso: string;
  isQuizActive: boolean;
  isPreviewMode?: boolean;
  isSubmitted?: boolean;
  onSessionExpiredOnServer?: () => void;
  onCrossTabDraftUpdated?: (answers: number[][], version: number, updatedAtMs: number) => void;
}

export function flushQuizDraftKeepalive(payload: {
  itemId: string;
  sessionId: string;
  answers: number[][];
  draftVersion: number;
}) {
  if (!payload.itemId || !payload.sessionId) return;

  const questionAnswers = payload.answers.map((indices) => ({
    selectedOptionIndexes: indices,
  }));

  fetch("/rpc/assessment.v1.AssessmentService/SaveQuizDraft", {
    method: "POST",
    keepalive: true,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
    },
    body: JSON.stringify({
      itemId: payload.itemId,
      sessionId: payload.sessionId,
      questionAnswers,
      draftVersion: payload.draftVersion,
    }),
  }).catch(() => {
    // Ignore background flush error on page unload
  });
}

export function useQuizDraftSync({
  userId,
  itemId,
  sessionId,
  sessionSeed,
  expiresAtIso,
  isQuizActive,
  isPreviewMode = false,
  isSubmitted = false,
  onSessionExpiredOnServer,
  onCrossTabDraftUpdated,
}: UseQuizDraftSyncOptions) {
  const effectiveUserId = userId || "me";
  const enabled = Boolean(!isPreviewMode && !isSubmitted && isQuizActive && itemId && sessionId);

  const [syncStatus, setSyncStatus] = useState<QuizDraftSyncStatus>("idle");
  const [lastSavedAtMs, setLastSavedAtMs] = useState<number | null>(null);

  const saveMutation = useSaveQuizDraftMutation();
  const mutateAsyncRef = useRef(saveMutation.mutateAsync);
  const onExpiredRef = useRef(onSessionExpiredOnServer);
  const onCrossTabRef = useRef(onCrossTabDraftUpdated);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistRef = useRef<() => Promise<void>>(async () => {});
  const stateRef = useRef<{
    userId: string;
    itemId: string;
    sessionId: string;
    sessionSeed: number;
    expiresAtIso: string;
    answers: number[][];
    version: number;
    lastSyncedVersion: number;
    inFlightVersion: number | null;
    dirty: boolean;
    enabled: boolean;
  }>({
    userId: effectiveUserId,
    itemId,
    sessionId,
    sessionSeed,
    expiresAtIso,
    answers: [],
    version: 0,
    lastSyncedVersion: 0,
    inFlightVersion: null,
    dirty: false,
    enabled,
  });

  useEffect(() => {
    mutateAsyncRef.current = saveMutation.mutateAsync;
    onExpiredRef.current = onSessionExpiredOnServer;
    onCrossTabRef.current = onCrossTabDraftUpdated;
    stateRef.current.userId = effectiveUserId;
    stateRef.current.itemId = itemId;
    stateRef.current.sessionId = sessionId;
    stateRef.current.sessionSeed = sessionSeed;
    stateRef.current.expiresAtIso = expiresAtIso;
    stateRef.current.enabled = enabled;
  });

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const persistDraftToServer = useCallback(async () => {
    const s = stateRef.current;
    if (!s.enabled || !s.itemId || !s.sessionId) return;
    if (!s.dirty && s.version <= s.lastSyncedVersion) return;
    if (s.inFlightVersion === s.version) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setSyncStatus("offline_pending");
      return;
    }

    const targetVersion = s.version;
    const targetAnswers = s.answers;
    const targetItemId = s.itemId;
    const targetSessionId = s.sessionId;
    const targetUserId = s.userId;
    const targetSeed = s.sessionSeed;
    const targetExpires = s.expiresAtIso;

    s.inFlightVersion = targetVersion;
    setSyncStatus("saving");

    try {
      const res = await mutateAsyncRef.current({
        itemId: targetItemId,
        sessionId: targetSessionId,
        questionAnswers: targetAnswers.map((indices) => ({
          selectedOptionIndexes: indices,
        })),
        draftVersion: targetVersion,
      });

      if (stateRef.current.inFlightVersion === targetVersion) {
        stateRef.current.inFlightVersion = null;
      }

      if (res.sessionExpired) {
        stateRef.current.dirty = false;
        setSyncStatus("idle");
        onExpiredRef.current?.();
        return;
      }

      const resolvedVersion = Math.max(targetVersion, res.draftVersion || targetVersion);
      if (resolvedVersion >= stateRef.current.lastSyncedVersion) {
        stateRef.current.lastSyncedVersion = resolvedVersion;
      }

      const serverMs = res.draftUpdatedAt ? Date.parse(res.draftUpdatedAt) : NaN;
      const savedMs = Number.isFinite(serverMs) ? serverMs : Date.now();
      setLastSavedAtMs(savedMs);

      if (stateRef.current.version <= resolvedVersion) {
        stateRef.current.dirty = false;
        setCachedQuizDraft(targetUserId, targetItemId, {
          sessionId: targetSessionId,
          sessionSeed: targetSeed,
          answers: stateRef.current.answers,
          version: resolvedVersion,
          expiresAtIso: targetExpires,
          updatedAtMs: savedMs,
          synced: true,
        });
        setSyncStatus("saved");
      } else {
        // Newer change occurred while request was in flight
        void persistRef.current();
      }
    } catch {
      if (stateRef.current.inFlightVersion === targetVersion) {
        stateRef.current.inFlightVersion = null;
      }
      const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
      setSyncStatus(isOffline ? "offline_pending" : "error");
    }
  }, []);

  useEffect(() => {
    persistRef.current = persistDraftToServer;
  }, [persistDraftToServer]);

  const initSessionState = useCallback(
    (params: {
      sessionId: string;
      sessionSeed: number;
      expiresAtIso: string;
      answers: number[][];
      version: number;
      lastSavedAtMs: number | null;
      needsServerSync: boolean;
    }) => {
      clearDebounce();
      const s = stateRef.current;
      s.sessionId = params.sessionId;
      s.sessionSeed = params.sessionSeed;
      s.expiresAtIso = params.expiresAtIso;
      s.answers = params.answers;
      s.version = params.version;
      s.lastSyncedVersion = params.needsServerSync
        ? Math.max(0, params.version - 1)
        : params.version;
      s.inFlightVersion = null;
      s.dirty = params.needsServerSync;

      setLastSavedAtMs(params.lastSavedAtMs);
      setSyncStatus(
        params.needsServerSync ? "saving" : params.lastSavedAtMs !== null ? "saved" : "idle",
      );

      if (!isPreviewMode && params.sessionId) {
        setCachedQuizDraft(s.userId, s.itemId, {
          sessionId: params.sessionId,
          sessionSeed: params.sessionSeed,
          answers: params.answers,
          version: params.version,
          expiresAtIso: params.expiresAtIso,
          updatedAtMs: params.lastSavedAtMs ?? Date.now(),
          synced: !params.needsServerSync,
        });
      }

      if (params.needsServerSync && !isPreviewMode) {
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          void persistDraftToServer();
        }, 150);
      }
    },
    [clearDebounce, isPreviewMode, persistDraftToServer],
  );

  const recordAnswerChange = useCallback(
    (nextAnswers: number[][]) => {
      const s = stateRef.current;
      const normalized = normalizeQuizDraftAnswersClient(nextAnswers, nextAnswers.length);
      const nextVersion = s.version + 1;
      const nowMs = Date.now();

      s.answers = normalized;
      s.version = nextVersion;
      s.dirty = true;

      if (isPreviewMode || !s.sessionId) {
        return;
      }

      setCachedQuizDraft(s.userId, s.itemId, {
        sessionId: s.sessionId,
        sessionSeed: s.sessionSeed,
        answers: normalized,
        version: nextVersion,
        expiresAtIso: s.expiresAtIso,
        updatedAtMs: nowMs,
        synced: false,
      });

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setSyncStatus("offline_pending");
        return;
      }

      setSyncStatus("saving");
      clearDebounce();
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void persistDraftToServer();
      }, DRAFT_SAVE_DEBOUNCE_MS);
    },
    [clearDebounce, isPreviewMode, persistDraftToServer],
  );

  const flushNow = useCallback(async () => {
    clearDebounce();
    await persistDraftToServer();
  }, [clearDebounce, persistDraftToServer]);

  const flushKeepalive = useCallback(() => {
    clearDebounce();
    const s = stateRef.current;
    if (!s.enabled || !s.dirty || !s.itemId || !s.sessionId) return;

    s.dirty = false;
    s.lastSyncedVersion = s.version;
    const nowMs = Date.now();
    setCachedQuizDraft(s.userId, s.itemId, {
      sessionId: s.sessionId,
      sessionSeed: s.sessionSeed,
      answers: s.answers,
      version: s.version,
      expiresAtIso: s.expiresAtIso,
      updatedAtMs: nowMs,
      synced: true,
    });
    flushQuizDraftKeepalive({
      itemId: s.itemId,
      sessionId: s.sessionId,
      answers: s.answers,
      draftVersion: s.version,
    });
  }, [clearDebounce]);

  const clearDraft = useCallback(() => {
    clearDebounce();
    const s = stateRef.current;
    s.dirty = false;
    s.inFlightVersion = null;
    setSyncStatus("idle");
    setLastSavedAtMs(null);
    clearCachedQuizDraft(s.userId, s.itemId);
  }, [clearDebounce]);

  // Flush keepalive on visibilitychange (hidden), pagehide, and unmount
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushKeepalive();
      }
    };

    const handlePageHide = () => {
      flushKeepalive();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      flushKeepalive();
    };
  }, [enabled, flushKeepalive]);

  // Retry automatically when network comes back online
  useEffect(() => {
    if (!enabled) return;
    const handleOnline = () => {
      if (stateRef.current.dirty) {
        void persistDraftToServer();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [enabled, persistDraftToServer]);

  // Listen to cross-tab storage updates for the same quiz session
  useEffect(() => {
    if (!enabled) return;
    const expectedKey = getQuizDraftCacheKey(effectiveUserId, itemId);
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== expectedKey || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as Partial<CachedQuizDraft>;
        if (
          parsed.sessionId === stateRef.current.sessionId &&
          typeof parsed.version === "number" &&
          parsed.version > stateRef.current.version &&
          Array.isArray(parsed.answers)
        ) {
          stateRef.current.answers = parsed.answers;
          stateRef.current.version = parsed.version;
          if (parsed.synced) {
            stateRef.current.lastSyncedVersion = parsed.version;
            stateRef.current.dirty = false;
            setSyncStatus("saved");
          }
          if (typeof parsed.updatedAtMs === "number") {
            setLastSavedAtMs(parsed.updatedAtMs);
          }
          onCrossTabRef.current?.(parsed.answers, parsed.version, parsed.updatedAtMs ?? Date.now());
        }
      } catch {
        // Ignore malformed storage payload
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [effectiveUserId, enabled, itemId]);

  return {
    syncStatus,
    lastSavedAtMs,
    initSessionState,
    recordAnswerChange,
    flushNow,
    clearDraft,
  };
}
