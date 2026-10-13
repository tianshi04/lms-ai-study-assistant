export interface JwtPayload {
  sub: string; // user_id
  email: string;
  role?: string;
  full_name?: string;
  exp: number;
  iat: number;
  type: string;
}

export function normalizeUserRole(role: string | null | undefined): string {
  if (!role) return "USER_ROLE_LEARNER";
  const r = String(role).toUpperCase();
  if (r === "3" || r.includes("ADMIN")) return "USER_ROLE_ADMIN";
  if (r === "2" || r.includes("INSTRUCTOR")) return "USER_ROLE_INSTRUCTOR";
  return "USER_ROLE_LEARNER";
}

/**
 * Decode JWT payload on client or server without cryptographic verification.
 * Used for extracting claims (e.g. user_id, email, role, full_name) from session tokens.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Base64Url decode
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}
