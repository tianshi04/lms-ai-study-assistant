export interface JwtPayload {
  sub: string; // user_id
  email: string;
  role: string;
  system_role: string;
  full_name?: string;
  active_org_id?: string;
  exp: number;
  iat: number;
  type: string;
}

export function normalizeUserRole(role: string | null | undefined): string {
  if (!role) return "1";
  const r = String(role).toUpperCase();
  if (r === "2" || r.includes("INSTRUCTOR")) return "2";
  if (r === "3" || r.includes("TA")) return "3";
  if (r === "4" || r.includes("ADMIN")) return "4";
  if (r === "5" || r.includes("PARTNER")) return "5";
  return "1";
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
