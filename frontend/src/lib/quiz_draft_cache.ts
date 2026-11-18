"use client";

export const MAX_QUIZ_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EXPIRATION_GRACE_MS = 5_000;

export interface CachedQuizDraft {
  sessionId: string;
  sessionSeed: number;
  answers: number[][];
  updatedAtMs: number;
  version: number;
  synced: boolean;
  expiresAtIso?: string;
}

export function getQuizDraftCacheKey(userId: string, itemId: string): string {
  return `lms_quiz_draft:${userId}:${itemId}`;
}

export function normalizeQuizDraftAnswersClient(
  answers: number[][] | undefined | null,
  questionCount: number,
): number[][] {
  const safeCount = Math.max(0, Math.floor(questionCount));
  if (safeCount === 0) {
    if (!Array.isArray(answers)) return [];
    return answers.map((entry) =>
      Array.isArray(entry)
        ? Array.from(
            new Set(entry.filter((v) => typeof v === "number" && Number.isInteger(v) && v >= 0)),
          ).sort((a, b) => a - b)
        : [],
    );
  }

  return Array.from({ length: safeCount }, (_, idx) => {
    const raw = answers?.[idx];
    if (!Array.isArray(raw)) return [];
    return Array.from(
      new Set(raw.filter((v) => typeof v === "number" && Number.isInteger(v) && v >= 0)),
    ).sort((a, b) => a - b);
  });
}

export function countAnsweredQuestions(answers: number[][] | undefined | null): number {
  if (!Array.isArray(answers)) return 0;
  return answers.filter((entry) => Array.isArray(entry) && entry.length > 0).length;
}

export function getCachedQuizDraft(
  userId: string | null | undefined,
  itemId: string | null | undefined,
): CachedQuizDraft | null {
  if (typeof window === "undefined" || !userId || !itemId) return null;
  const key = getQuizDraftCacheKey(userId, itemId);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedQuizDraft>;
    if (
      typeof parsed.sessionId !== "string" ||
      !parsed.sessionId ||
      !Array.isArray(parsed.answers) ||
      typeof parsed.updatedAtMs !== "number" ||
      !Number.isFinite(parsed.updatedAtMs)
    ) {
      return null;
    }

    const nowMs = Date.now();
    if (nowMs - parsed.updatedAtMs > MAX_QUIZ_DRAFT_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }

    if (typeof parsed.expiresAtIso === "string" && parsed.expiresAtIso) {
      const expiresMs = Date.parse(parsed.expiresAtIso);
      if (Number.isFinite(expiresMs) && nowMs > expiresMs + EXPIRATION_GRACE_MS) {
        window.localStorage.removeItem(key);
        return null;
      }
    }

    return {
      sessionId: parsed.sessionId,
      sessionSeed:
        typeof parsed.sessionSeed === "number" && Number.isFinite(parsed.sessionSeed)
          ? parsed.sessionSeed
          : 0,
      answers: normalizeQuizDraftAnswersClient(parsed.answers, parsed.answers.length),
      updatedAtMs: parsed.updatedAtMs,
      version:
        typeof parsed.version === "number" && Number.isFinite(parsed.version)
          ? Math.max(0, Math.floor(parsed.version))
          : 0,
      synced: Boolean(parsed.synced),
      expiresAtIso: typeof parsed.expiresAtIso === "string" ? parsed.expiresAtIso : undefined,
    };
  } catch {
    return null;
  }
}

export function setCachedQuizDraft(
  userId: string | null | undefined,
  itemId: string | null | undefined,
  draft: {
    sessionId: string;
    sessionSeed: number;
    answers: number[][];
    version: number;
    expiresAtIso?: string;
    updatedAtMs?: number;
    synced?: boolean;
  },
): void {
  if (typeof window === "undefined" || !userId || !itemId || !draft.sessionId) return;
  try {
    const payload: CachedQuizDraft = {
      sessionId: draft.sessionId,
      sessionSeed: draft.sessionSeed,
      answers: normalizeQuizDraftAnswersClient(draft.answers, draft.answers.length),
      updatedAtMs: draft.updatedAtMs ?? Date.now(),
      version: Math.max(0, Math.floor(draft.version)),
      synced: draft.synced ?? false,
      expiresAtIso: draft.expiresAtIso,
    };
    window.localStorage.setItem(getQuizDraftCacheKey(userId, itemId), JSON.stringify(payload));
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export function clearCachedQuizDraft(
  userId: string | null | undefined,
  itemId: string | null | undefined,
): void {
  if (typeof window === "undefined" || !userId || !itemId) return;
  try {
    window.localStorage.removeItem(getQuizDraftCacheKey(userId, itemId));
  } catch {
    // Ignore storage errors
  }
}

export function reconcileQuizDraft(params: {
  serverSessionId: string;
  serverSessionSeed: number;
  serverExpiresAtIso: string;
  serverAnswers: number[][];
  serverDraftUpdatedAt: string;
  serverDraftVersion: number;
  questionCount: number;
  cached: CachedQuizDraft | null;
}): {
  answers: number[][];
  version: number;
  needsServerSync: boolean;
  lastSavedAtMs: number | null;
} {
  const normalizedServer = normalizeQuizDraftAnswersClient(
    params.serverAnswers,
    params.questionCount,
  );
  const serverUpdatedMs = params.serverDraftUpdatedAt
    ? Date.parse(params.serverDraftUpdatedAt)
    : NaN;
  const validServerMs = Number.isFinite(serverUpdatedMs) ? serverUpdatedMs : null;

  if (!params.cached || params.cached.sessionId !== params.serverSessionId) {
    return {
      answers: normalizedServer,
      version: Math.max(0, params.serverDraftVersion),
      needsServerSync: false,
      lastSavedAtMs: validServerMs,
    };
  }

  const normalizedLocal = normalizeQuizDraftAnswersClient(
    params.cached.answers,
    params.questionCount,
  );
  const localHasUnsyncedNewer =
    !params.cached.synced &&
    (params.cached.version > params.serverDraftVersion ||
      (validServerMs === null
        ? countAnsweredQuestions(normalizedLocal) > 0
        : params.cached.updatedAtMs > validServerMs));

  if (localHasUnsyncedNewer) {
    return {
      answers: normalizedLocal,
      version: Math.max(params.cached.version, params.serverDraftVersion + 1),
      needsServerSync: true,
      lastSavedAtMs: params.cached.updatedAtMs,
    };
  }

  return {
    answers: normalizedServer,
    version: Math.max(params.serverDraftVersion, params.cached.version),
    needsServerSync: false,
    lastSavedAtMs:
      validServerMs ??
      (countAnsweredQuestions(normalizedServer) > 0 ? params.cached.updatedAtMs : null),
  };
}
