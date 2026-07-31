import { cookies } from "next/headers";

export interface ServerUserAuth {
  isAuthenticated: boolean;
  accessToken: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
}

/**
 * Extract authenticated user info and tokens from cookies on the server side (Server Components / Route Handlers).
 */
export async function getAuthServer(): Promise<ServerUserAuth> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value || null;
  const rawUserName = token ? cookieStore.get("user_name")?.value : undefined;
  const rawUserEmail = token ? cookieStore.get("user_email")?.value : undefined;
  const userRole = token ? cookieStore.get("user_role")?.value || null : null;

  let userName: string | null = null;
  if (rawUserName) {
    try {
      userName = decodeURIComponent(rawUserName);
    } catch {
      userName = rawUserName;
    }
  }

  let userEmail: string | null = null;
  if (rawUserEmail) {
    try {
      userEmail = decodeURIComponent(rawUserEmail);
    } catch {
      userEmail = rawUserEmail;
    }
  }

  return {
    isAuthenticated: Boolean(token),
    accessToken: token,
    userName,
    userEmail,
    userRole,
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
