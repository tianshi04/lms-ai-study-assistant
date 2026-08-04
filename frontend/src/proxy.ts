import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { IdentityService } from "@/gen/identity/v1/identity_pb";
import { decodeJwtPayload, normalizeUserRole } from "@/lib/jwt";

const API_BASE_URL =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 hour (matches backend 60m expiry)
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (matches backend 7d expiry)

async function refreshTokens(refreshToken: string) {
  try {
    const transport = createConnectTransport({ baseUrl: API_BASE_URL });
    const client = createClient(IdentityService, transport);
    const res = await client.refreshToken({ refreshToken });
    if (res.accessToken) {
      return {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken || refreshToken,
      };
    }
  } catch {
    // Silent catch if backend token refresh fails
  }
  return null;
}

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/my-courses",
  "/learn",
  "/assessments",
  "/financial-aid",
  "/auth/profile",
  "/partner",
];
const INSTRUCTOR_ROUTES = ["/instructor"];
const ADMIN_ROUTES = ["/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let token = request.cookies.get("access_token")?.value;
  const refreshTokenVal = request.cookies.get("refresh_token")?.value;
  let payload = token ? decodeJwtPayload(token) : null;

  let newlyRefreshedAccessToken: string | null = null;
  let newlyRefreshedRefreshToken: string | null = null;
  let refreshFailed = false;

  // If access token is missing/invalid but refresh_token exists, attempt auto-refresh on server-side
  if (!payload && refreshTokenVal) {
    const refreshed = await refreshTokens(refreshTokenVal);
    if (refreshed) {
      token = refreshed.accessToken;
      newlyRefreshedAccessToken = refreshed.accessToken;
      newlyRefreshedRefreshToken = refreshed.refreshToken;
      payload = decodeJwtPayload(token);
    } else {
      refreshFailed = true;
    }
  }

  const roleStr = payload
    ? normalizeUserRole(payload.role)
    : request.cookies.get("user_role")?.value;
  const role = roleStr ? parseInt(roleStr, 10) : null;
  const isSystemAdmin = Boolean(
    role === 3 || payload?.role === "3" || payload?.role?.includes("ADMIN"),
  );

  const requestHeaders = new Headers(request.headers);
  if (token && !requestHeaders.has("authorization")) {
    requestHeaders.set("authorization", `Bearer ${token}`);
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isInstructorRoute = INSTRUCTOR_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  // Helper to build redirect response to login while clearing invalid tokens
  const redirectToLogin = () => {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    if (refreshFailed) {
      redirectResponse.cookies.delete("access_token");
      redirectResponse.cookies.delete("refresh_token");
    }
    return redirectResponse;
  };

  // 1. Check Protected User Routes
  if (isProtectedRoute && !payload) {
    return redirectToLogin();
  }

  // 2. Check Instructor Routes (Role 2: Instructor or System Admin)
  if (isInstructorRoute) {
    if (!payload) {
      return redirectToLogin();
    }
    const isAllowed = isSystemAdmin || role === 2;
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/courses", request.url));
    }
  }

  // 3. Check Admin Routes (Role 3: System Admin)
  if (isAdminRoute) {
    if (!payload) {
      return redirectToLogin();
    }
    if (!isSystemAdmin) {
      return NextResponse.redirect(new URL("/courses", request.url));
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Attach updated cookies if token was refreshed
  if (newlyRefreshedAccessToken) {
    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set("access_token", newlyRefreshedAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    if (newlyRefreshedRefreshToken) {
      response.cookies.set("refresh_token", newlyRefreshedRefreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: REFRESH_TOKEN_MAX_AGE,
      });
    }
  } else if (refreshFailed && !token) {
    // Clean up stale cookies on public routes if refresh failed
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, svgs, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
