import { NextResponse } from "next/server";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService } from "@/gen/identity/v1/identity_pb";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ email và mật khẩu." },
        { status: 400 },
      );
    }

    const client = getRpcClient(IdentityService);
    const res = await client.login({ email, password });

    if (!res.accessToken || !res.user) {
      return NextResponse.json(
        { error: "Đăng nhập thất bại. Không nhận được token." },
        { status: 401 },
      );
    }

    // Create response and set HttpOnly cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: res.user.id,
        email: res.user.email,
        fullName: res.user.fullName,
        role: res.user.role,
      },
    });

    // Set access token cookie
    response.cookies.set({
      name: "access_token",
      value: res.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    // Set refresh token cookie if available
    if (res.refreshToken) {
      response.cookies.set({
        name: "refresh_token",
        value: res.refreshToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    // Also set a non-HttpOnly cookie for user metadata (so frontend can read it without hitting an API)
    // Or we just return it in JSON and frontend can keep storing metadata (not tokens!) in localStorage.
    // We will let frontend store metadata in localStorage for simplicity, as only the tokens are sensitive to XSS.

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Đăng nhập thất bại.";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
