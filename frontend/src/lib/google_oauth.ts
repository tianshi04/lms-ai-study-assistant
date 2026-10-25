import { getGoogleClientIdAction } from "@/app/auth/actions";
import { sanitizeRedirectPath } from "@/lib/safe_redirect";

/**
 * Google OAuth 2.0 Authorization Code flow with `state` (CSRF) and OIDC `nonce`
 * (replay/ID-token binding). One callback page serves every intent.
 *
 * Per-attempt secrets live in `sessionStorage` (tab-scoped, never sent to a server, not
 * writable from a sibling subdomain like a JS cookie), are single-use and expire in 10 min.
 */

export type GoogleIntent = "login" | "register" | "reset";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const CALLBACK_PATH = "/auth/google/callback";
const TXN_KEY = "google_oauth_txn";
const PENDING_KEY = "google_oauth_pending";
const TTL_MS = 10 * 60 * 1000;

interface GoogleTransaction {
  state: string;
  nonce: string;
  intent: GoogleIntent;
  redirect: string;
  createdAt: number;
}

export interface GoogleCallbackContext {
  code: string;
  nonce: string;
  redirectUri: string;
  intent: GoogleIntent;
  redirect: string;
}

export interface PendingGoogleVerification {
  intent: Exclude<GoogleIntent, "login">;
  tempToken: string;
  email: string;
  fullName: string;
  createdAt: number;
}

function randomUrlSafe(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return toBase64Url(bytes);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function googleRedirectUri(): string {
  return `${window.location.origin}${CALLBACK_PATH}`;
}

/** Throws when Google sign-in is not configured; there is deliberately no mock fallback. */
export async function startGoogleOAuth(intent: GoogleIntent, redirect = ""): Promise<void> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || (await getGoogleClientIdAction());
  if (!clientId) {
    throw new Error("Đăng nhập bằng Google chưa được cấu hình.");
  }

  const transaction: GoogleTransaction = {
    state: randomUrlSafe(32),
    nonce: randomUrlSafe(32),
    intent,
    redirect: sanitizeRedirectPath(redirect, ""),
    createdAt: Date.now(),
  };
  sessionStorage.setItem(TXN_KEY, JSON.stringify(transaction));

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: transaction.state,
    nonce: transaction.nonce,
    prompt: "select_account",
  });
  window.location.assign(`${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Validates the callback against the stored transaction (fail-closed) and consumes it.
 * Returns null on missing/expired/mismatched state, so a forged callback is never exchanged.
 */
export function consumeGoogleTransaction(
  code: string,
  state: string,
): GoogleCallbackContext | null {
  const raw = sessionStorage.getItem(TXN_KEY);
  sessionStorage.removeItem(TXN_KEY);
  if (!raw || !code || !state) return null;

  let txn: GoogleTransaction;
  try {
    txn = JSON.parse(raw) as GoogleTransaction;
  } catch {
    return null;
  }
  if (
    typeof txn.state !== "string" ||
    typeof txn.nonce !== "string" ||
    !["login", "register", "reset"].includes(txn.intent) ||
    typeof txn.createdAt !== "number" ||
    Date.now() - txn.createdAt > TTL_MS ||
    !timingSafeEqual(txn.state, state)
  ) {
    return null;
  }

  return {
    code,
    nonce: txn.nonce,
    redirectUri: googleRedirectUri(),
    intent: txn.intent,
    redirect: sanitizeRedirectPath(txn.redirect, ""),
  };
}

export function storePendingGoogleVerification(
  pending: Omit<PendingGoogleVerification, "createdAt">,
): void {
  const value: PendingGoogleVerification = { ...pending, createdAt: Date.now() };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
}

/** Reads (without consuming, so React Strict Mode remounts are safe) a still-valid verification. */
export function readPendingGoogleVerification(
  intent: PendingGoogleVerification["intent"],
): PendingGoogleVerification | null {
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const pending = JSON.parse(raw) as PendingGoogleVerification;
    if (
      pending.intent !== intent ||
      typeof pending.tempToken !== "string" ||
      !pending.tempToken ||
      Date.now() - pending.createdAt > TTL_MS
    ) {
      sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
    return pending;
  } catch {
    sessionStorage.removeItem(PENDING_KEY);
    return null;
  }
}

export function clearPendingGoogleVerification(): void {
  sessionStorage.removeItem(PENDING_KEY);
}
