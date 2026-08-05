import { cookies } from "next/headers";
import { decodeJwtPayload, normalizeUserRole } from "@/lib/jwt";

export interface ServerUserAuth {
  isAuthenticated: boolean;
  accessToken: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  userAvatar: string | null;
}

/**
 * Extract authenticated user info and tokens from cookies on the server side (Server Components / Route Handlers).
 * Decodes the access_token JWT payload directly.
 */
export async function getAuthServer(): Promise<ServerUserAuth> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value || null;

  if (!token) {
    return {
      isAuthenticated: false,
      accessToken: null,
      userId: null,
      userName: null,
      userEmail: null,
      userRole: null,
      userAvatar: null,
    };
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return {
      isAuthenticated: false,
      accessToken: null,
      userId: null,
      userName: null,
      userEmail: null,
      userRole: null,
      userAvatar: null,
    };
  }

  return {
    isAuthenticated: true,
    accessToken: token,
    userId: payload.sub || null,
    userName: payload.full_name || payload.email || null,
    userEmail: payload.email || null,
    userRole: normalizeUserRole(payload.role),
    userAvatar: (payload.avatar_url as string) || null,
  };
}


/**
 * Get authorization headers object for server-side HTTP/ConnectRPC requests.
 */
export async function getAuthHeadersServer(): Promise<Record<string, string>> {
  const { accessToken } = await getAuthServer();
  if (accessToken) {
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }
  return {};
}
