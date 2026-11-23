"use client";

export const VIDEO_RESUME_MIN_SECONDS = 5;
export const VIDEO_END_RESET_THRESHOLD_SECONDS = 5;
export const VIDEO_END_RESET_MIN_DURATION_SECONDS = 15;
export const MAX_VIDEO_POSITION_SECONDS = 86400;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CachedVideoPosition {
  positionSeconds: number;
  durationSeconds: number;
  updatedAtMs: number;
  synced?: boolean;
}

export interface VideoPositionEntry {
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: string;
}

function getCacheKey(userId: string, itemId: string): string {
  return `lms_video_pos:${userId}:${itemId}`;
}

export function normalizeVideoPositionClient(
  positionSeconds: number,
  durationSeconds: number = 0,
): { positionSeconds: number; durationSeconds: number } {
  const safeDuration = Math.max(
    0,
    Math.min(
      Math.floor(Number.isFinite(durationSeconds) ? durationSeconds : 0),
      MAX_VIDEO_POSITION_SECONDS,
    ),
  );
  const safePos = Math.max(0, Math.floor(Number.isFinite(positionSeconds) ? positionSeconds : 0));

  if (safeDuration > 0) {
    const clampedPos = Math.min(safePos, safeDuration);
    if (
      safeDuration > VIDEO_END_RESET_MIN_DURATION_SECONDS &&
      clampedPos >= safeDuration - VIDEO_END_RESET_THRESHOLD_SECONDS
    ) {
      return { positionSeconds: 0, durationSeconds: safeDuration };
    }
    return { positionSeconds: clampedPos, durationSeconds: safeDuration };
  }

  return {
    positionSeconds: Math.min(safePos, MAX_VIDEO_POSITION_SECONDS),
    durationSeconds: 0,
  };
}

export function getCachedVideoPosition(
  userId: string | null | undefined,
  itemId: string | null | undefined,
): CachedVideoPosition | null {
  if (typeof window === "undefined" || !userId || !itemId) return null;
  try {
    const raw = window.localStorage.getItem(getCacheKey(userId, itemId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedVideoPosition>;
    if (
      typeof parsed.positionSeconds !== "number" ||
      !Number.isFinite(parsed.positionSeconds) ||
      typeof parsed.updatedAtMs !== "number" ||
      !Number.isFinite(parsed.updatedAtMs)
    ) {
      return null;
    }
    if (Date.now() - parsed.updatedAtMs > CACHE_TTL_MS) {
      window.localStorage.removeItem(getCacheKey(userId, itemId));
      return null;
    }
    return {
      positionSeconds: Math.max(0, Math.floor(parsed.positionSeconds)),
      durationSeconds:
        typeof parsed.durationSeconds === "number" && Number.isFinite(parsed.durationSeconds)
          ? Math.max(0, Math.floor(parsed.durationSeconds))
          : 0,
      updatedAtMs: parsed.updatedAtMs,
      synced: Boolean(parsed.synced),
    };
  } catch {
    return null;
  }
}

export function setCachedVideoPosition(
  userId: string | null | undefined,
  itemId: string | null | undefined,
  positionSeconds: number,
  durationSeconds: number = 0,
  options?: { updatedAtMs?: number; synced?: boolean },
): void {
  if (typeof window === "undefined" || !userId || !itemId) return;
  try {
    const normalized = normalizeVideoPositionClient(positionSeconds, durationSeconds);
    const existing = getCachedVideoPosition(userId, itemId);
    const effectiveDuration =
      normalized.durationSeconds > 0
        ? normalized.durationSeconds
        : (existing?.durationSeconds ?? 0);

    const payload: CachedVideoPosition = {
      positionSeconds: normalized.positionSeconds,
      durationSeconds: effectiveDuration,
      updatedAtMs: options?.updatedAtMs ?? Date.now(),
      synced: options?.synced ?? false,
    };
    window.localStorage.setItem(getCacheKey(userId, itemId), JSON.stringify(payload));
  } catch {
    // Ignore storage quota or Safari Private Mode errors
  }
}

export function clearCachedVideoPosition(
  userId: string | null | undefined,
  itemId: string | null | undefined,
): void {
  if (typeof window === "undefined" || !userId || !itemId) return;
  try {
    window.localStorage.removeItem(getCacheKey(userId, itemId));
  } catch {
    // Ignore storage errors
  }
}

export function resolveMergedVideoPosition(
  dbRecord?: VideoPositionEntry | null,
  cached?: CachedVideoPosition | null,
  cacheOwner?: { userId?: string | null; itemId?: string | null },
): VideoPositionEntry | null {
  if (cached && dbRecord) {
    const dbUpdatedMs = dbRecord.updatedAt ? Date.parse(dbRecord.updatedAt) : NaN;
    const validDbMs = Number.isFinite(dbUpdatedMs) ? dbUpdatedMs : 0;

    // Only let unconfirmed local buffer beat DB if it is strictly newer than DB's updated_at,
    // or if both carry server timestamps (synced) and local is newer.
    if (cached.updatedAtMs > validDbMs) {
      return {
        positionSeconds: cached.positionSeconds,
        durationSeconds:
          cached.durationSeconds > 0 ? cached.durationSeconds : dbRecord.durationSeconds,
        updatedAt: new Date(cached.updatedAtMs).toISOString(),
      };
    }
    return dbRecord;
  }

  if (dbRecord) {
    return dbRecord;
  }

  if (cached) {
    // If local cache already confirmed synced to DB previously, yet DB now omits it
    // (because last_position_seconds was reset to 0 on another device), trust DB as source of truth.
    if (cached.synced) {
      if (cacheOwner?.userId && cacheOwner?.itemId) {
        clearCachedVideoPosition(cacheOwner.userId, cacheOwner.itemId);
      }
      return null;
    }
    return {
      positionSeconds: cached.positionSeconds,
      durationSeconds: cached.durationSeconds,
      updatedAt: new Date(cached.updatedAtMs).toISOString(),
    };
  }

  return null;
}

export interface VideoResumeSnapshot {
  itemId: string;
  positionSeconds: number;
  durationSeconds: number;
}

export function getResumableSnapshotForItem(
  itemId: string,
  dbRecord?: VideoPositionEntry | null,
  cached?: CachedVideoPosition | null,
  userId?: string | null,
): VideoResumeSnapshot {
  const merged = resolveMergedVideoPosition(dbRecord, cached, { userId, itemId });
  if (!merged) {
    return { itemId, positionSeconds: 0, durationSeconds: 0 };
  }
  const normalized = normalizeVideoPositionClient(merged.positionSeconds, merged.durationSeconds);
  return {
    itemId,
    positionSeconds:
      normalized.positionSeconds >= VIDEO_RESUME_MIN_SECONDS ? normalized.positionSeconds : 0,
    durationSeconds: normalized.durationSeconds,
  };
}
