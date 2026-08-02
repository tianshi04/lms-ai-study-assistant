import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwtPayload, normalizeUserRole } from "@/lib/jwt";

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const payload = token ? decodeJwtPayload(token) : null;
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

  // 1. Check Protected User Routes
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Check Instructor Routes (Role 2: Instructor or System Admin)
  const isInstructorRoute = INSTRUCTOR_ROUTES.some((route) => pathname.startsWith(route));
  if (isInstructorRoute) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const isAllowed = isSystemAdmin || role === 2;
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/courses", request.url));
    }
  }

  // 3. Check Admin Routes (Role 3: System Admin)
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  if (isAdminRoute) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isSystemAdmin) {
      return NextResponse.redirect(new URL("/courses", request.url));
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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
