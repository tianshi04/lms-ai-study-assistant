import { NextResponse } from "next/server";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService } from "@/gen/identity/v1/identity_pb";

export async function POST(request: Request) {
  try {
    const refreshToken = request.headers.get("cookie")?.split("; ").find(row => row.startsWith("refresh_token="))?.split("=")[1];
    
    if (!refreshToken) {
      return NextResponse.json({ error: "Missing refresh token." }, { status: 401 });
    }

    // Call backend directly from server side
    // We cannot easily use the client's transport here because it's configured for browser.
    // However, getRpcClient is shared. We just need to pass the token.
    const client = getRpcClient(IdentityService);
    const res = await client.refreshToken({ refreshToken });

    if (!res.accessToken) {
      return NextResponse.json({ error: "Token refresh failed." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });

    // Set new cookies
    response.cookies.set({
      name: "access_token",
      value: res.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

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

    return response;
  } catch (_err: unknown) {
    return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
  }
}
