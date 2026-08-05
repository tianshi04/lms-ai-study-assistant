"use server";

import { cookies } from "next/headers";
import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { IdentityService } from "@/gen/identity/v1/identity_pb";
import { normalizeUserRole } from "@/lib/jwt";

const API_BASE_URL =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 hour (matches backend 60m expiry)
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (matches backend 7d expiry)

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function getUnauthenticatedBackendClient() {
  const transport = createConnectTransport({
    baseUrl: API_BASE_URL,
  });
  return createClient(IdentityService, transport);
}

export async function loginAction(email: string, password: string) {
  try {
    const client = getUnauthenticatedBackendClient();
    const res = await client.login({ email, password });

    if (!res.accessToken || !res.user) {
      return { success: false, error: "Email hoặc mật khẩu không chính xác" };
    }

    const cookieStore = await cookies();
    cookieStore.set("access_token", res.accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    if (res.refreshToken) {
      cookieStore.set("refresh_token", res.refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
    }

    return {
      success: true,
      user: {
        id: res.user.id,
        fullName: res.user.fullName,
        email: res.user.email,
        role: normalizeUserRole(String(res.user.role)),
        avatarUrl: res.user.avatarUrl,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Đăng nhập thất bại. Vui lòng thử lại.";
    return { success: false, error: msg };
  }
}

export async function refreshSessionAction() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;
    if (!refreshToken) {
      return { success: false, error: "No refresh token available" };
    }

    const client = getUnauthenticatedBackendClient();
    const res = await client.refreshToken({ refreshToken });

    if (!res.accessToken) {
      cookieStore.delete("access_token");
      cookieStore.delete("refresh_token");
      return { success: false, error: "Invalid refresh token" };
    }

    cookieStore.set("access_token", res.accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    if (res.refreshToken) {
      cookieStore.set("refresh_token", res.refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
    }

    return { success: true };
  } catch {
    const cookieStore = await cookies();
    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    return { success: false, error: "Token refresh failed" };
  }
}

export async function googleRegisterVerifyAction(googleIdToken: string) {
  try {
    const client = getUnauthenticatedBackendClient();
    const res = await client.googleRegisterVerify({ googleIdToken });
    return {
      success: true,
      tempToken: res.tempToken,
      email: res.email,
      fullName: res.fullName,
      avatarUrl: res.avatarUrl,
      isAlreadyRegistered: res.isAlreadyRegistered,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Xác minh Google thất bại.";
    return { success: false, error: msg };
  }
}

export async function completeGoogleRegistrationAction(
  tempToken: string,
  password: string,
  fullName: string,
  role: number
) {
  try {
    const client = getUnauthenticatedBackendClient();
    const res = await client.completeGoogleRegistration({
      tempToken,
      password,
      fullName,
      role,
    });

    if (!res.accessToken || !res.user) {
      return { success: false, error: "Hoàn tất đăng ký thất bại." };
    }

    const cookieStore = await cookies();
    cookieStore.set("access_token", res.accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    if (res.refreshToken) {
      cookieStore.set("refresh_token", res.refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
    }

    return {
      success: true,
      user: {
        id: res.user.id,
        fullName: res.user.fullName,
        email: res.user.email,
        role: normalizeUserRole(String(res.user.role)),
        avatarUrl: res.user.avatarUrl,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Đăng ký thất bại.";
    return { success: false, error: msg };
  }
}

export async function googleLoginAction(googleIdToken: string) {
  try {
    const client = getUnauthenticatedBackendClient();
    const res = await client.googleLogin({ googleIdToken });

    if (!res.accessToken || !res.user) {
      return { success: false, error: "Đăng nhập bằng Google thất bại." };
    }

    const cookieStore = await cookies();
    cookieStore.set("access_token", res.accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    if (res.refreshToken) {
      cookieStore.set("refresh_token", res.refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
    }

    return {
      success: true,
      user: {
        id: res.user.id,
        fullName: res.user.fullName,
        email: res.user.email,
        role: normalizeUserRole(String(res.user.role)),
        avatarUrl: res.user.avatarUrl,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Đăng nhập bằng Google thất bại.";
    return { success: false, error: msg };
  }
}

export async function googleResetPasswordVerifyAction(googleIdToken: string) {
  try {
    const client = getUnauthenticatedBackendClient();
    const res = await client.googleResetPasswordVerify({ googleIdToken });
    return {
      success: true,
      tempToken: res.tempToken,
      email: res.email,
      fullName: res.fullName,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Xác minh Google thất bại.";
    return { success: false, error: msg };
  }
}

export async function completeResetPasswordAction(
  tempToken: string,
  newPassword: string
) {
  try {
    const client = getUnauthenticatedBackendClient();
    const res = await client.completeResetPassword({
      tempToken,
      newPassword,
    });

    if (!res.accessToken || !res.user) {
      return { success: false, error: "Đặt lại mật khẩu thất bại." };
    }

    const cookieStore = await cookies();
    cookieStore.set("access_token", res.accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    if (res.refreshToken) {
      cookieStore.set("refresh_token", res.refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
    }

    return {
      success: true,
      user: {
        id: res.user.id,
        fullName: res.user.fullName,
        email: res.user.email,
        role: normalizeUserRole(String(res.user.role)),
        avatarUrl: res.user.avatarUrl,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Cập nhật mật khẩu thất bại.";
    return { success: false, error: msg };
  }
}
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
  // Clear legacy cookies if present
  cookieStore.delete("user_name");
  cookieStore.delete("user_email");
  cookieStore.delete("user_role");
  return { success: true };
}

