import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token");
  const path = request.nextUrl.pathname;

  // Protect Admin routes
  if (path.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login?redirect=" + encodeURIComponent(path), request.url));
    }
    // Note: We can't easily decode role from JWT in Edge middleware without external libraries, 
    // so we rely on the backend to reject unauthorized API calls for Admin data.
    // However, we successfully block unauthenticated users from even loading the page!
  }

  // Protect Instructor routes
  if (path.startsWith("/instructor")) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login?redirect=" + encodeURIComponent(path), request.url));
    }
  }

  // Protect general authenticated routes
  const authRoutes = ["/auth/profile", "/financial-aid", "/verify-portal", "/assessments", "/learn"];
  if (authRoutes.some(r => path.startsWith(r))) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login?redirect=" + encodeURIComponent(path), request.url));
    }
  }

  // For /auth/login and /auth/register, redirect to /courses if already logged in
  if (path === "/auth/login" || path === "/auth/register") {
    if (token) {
      return NextResponse.redirect(new URL("/courses", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/instructor/:path*",
    "/auth/profile",
    "/financial-aid",
    "/verify-portal",
    "/assessments",
    "/learn/:path*",
    "/auth/login",
    "/auth/register"
  ],
};
