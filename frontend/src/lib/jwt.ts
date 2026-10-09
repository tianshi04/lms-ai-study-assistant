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

function decodeBase64Url(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf-8");
  }
  return "";
}

/**
 * Decode JWT payload on client or server without cryptographic verification.
 * Used for extracting claims (e.g. user_id, email, role, full_name) from session tokens.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const jsonStr = decodeBase64Url(parts[1]);
    if (!jsonStr) return null;
    return JSON.parse(jsonStr) as JwtPayload;
  } catch {
    return null;
  }
}
