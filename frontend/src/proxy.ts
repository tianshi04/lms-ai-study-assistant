import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/my-courses",
  "/learn",
  "/assessments",
  "/financial-aid",
  "/auth/profile",
];
const INSTRUCTOR_ROUTES = ["/instructor"];
const ADMIN_ROUTES = ["/admin"];

function extractRoleFromToken(token?: string): number | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const payload = JSON.parse(jsonPayload);

    const roleMap: Record<string, number> = {
      USER_ROLE_LEARNER: 1,
      LEARNER: 1,
      USER_ROLE_INSTRUCTOR: 2,
      INSTRUCTOR: 2,
      USER_ROLE_TA: 3,
      TA: 3,
      USER_ROLE_SUPER_ADMIN: 4,
      SUPER_ADMIN: 4,
    };
    if (typeof payload.role === "number") return payload.role;
    if (typeof payload.role === "string") {
      return roleMap[payload.role.toUpperCase()] ?? (parseInt(payload.role, 10) || null);
    }
  } catch {
    return null;
  }
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const roleFromJwt = extractRoleFromToken(token);
  const roleStr = request.cookies.get("user_role")?.value;
  const role = roleFromJwt ?? (roleStr ? parseInt(roleStr, 10) : null);

  // 1. Check Protected User Routes
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Check Instructor Routes (Role 2: Instructor, Role 3: TA, Role 4: Super Admin)
  const isInstructorRoute = INSTRUCTOR_ROUTES.some((route) => pathname.startsWith(route));
  if (isInstructorRoute) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const isAllowed = role !== null && [2, 3, 4].includes(role);
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/courses", request.url));
    }
  }

  // 3. Check Admin Routes (Role 4: Super Admin)
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  if (isAdminRoute) {
    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const isAllowed = role !== null && [4].includes(role);
    if (!isAllowed) {
      return NextResponse.redirect(new URL("/courses", request.url));
    }
  }

  return NextResponse.next();
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
