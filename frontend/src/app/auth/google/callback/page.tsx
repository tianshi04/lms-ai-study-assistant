"use client";

import { useEffect, useRef, useState } from "react";
import {
  googleLoginAction,
  googleRegisterVerifyAction,
  googleResetPasswordVerifyAction,
} from "@/app/auth/actions";
import { useAuth } from "@/components/providers/AuthProvider";
import { normalizeUserRole } from "@/lib/jwt";
import { consumeGoogleTransaction, storePendingGoogleVerification } from "@/lib/google_oauth";
import { sanitizeRedirectPath } from "@/lib/safe_redirect";
import { Loader2 } from "lucide-react";

const FAILURE_REDIRECT_DELAY_MS = 1500;

export default function GoogleCallbackPage() {
  const { setAuth } = useAuth();
  const [errorMsg, setErrorMsg] = useState("");
  const [failurePath, setFailurePath] = useState("/auth/login");
  // The one-time transaction is consumed on first run; guard against effect re-runs (Strict Mode).
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? "";
    const state = params.get("state") ?? "";
    const providerError = params.get("error");

    // Drop the authorization code from the address bar / history before doing anything else.
    window.history.replaceState(null, "", window.location.pathname);

    const fail = (message: string, path = "/auth/login") => {
      setFailurePath(path);
      setErrorMsg(message);
      setTimeout(() => window.location.replace(path), FAILURE_REDIRECT_DELAY_MS);
    };

    if (providerError) {
      fail("Bạn đã huỷ hoặc Google từ chối yêu cầu xác thực.");
      return;
    }

    // Fail-closed: no stored transaction / state mismatch / expired => never exchange the code.
    const context = consumeGoogleTransaction(code, state);
    if (!context) {
      fail("Phiên xác thực Google không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.");
      return;
    }

    const { intent, nonce, redirectUri, redirect } = context;
    const retryPath =
      intent === "register"
        ? "/auth/register"
        : intent === "reset"
          ? "/auth/forgot-password"
          : "/auth/login";

    const run = async () => {
      try {
        if (intent === "login") {
          const res = await googleLoginAction(code, nonce, redirectUri);
          if (!res.success || !res.user) {
            fail(res.error || "Xác thực Google thất bại.", retryPath);
            return;
          }
          setAuth({
            userId: res.user.id,
            userName: res.user.fullName,
            userEmail: res.user.email,
            userRole: res.user.role,
            userAvatar: res.user.avatarUrl,
          });
          const role = normalizeUserRole(res.user.role);
          let defaultTarget = "/learner/dashboard";
          if (role === "USER_ROLE_ADMIN") defaultTarget = "/admin/dashboard";
          else if (role === "USER_ROLE_INSTRUCTOR") defaultTarget = "/instructor/dashboard";
          window.location.replace(sanitizeRedirectPath(redirect, defaultTarget));
          return;
        }

        if (intent === "register") {
          const res = await googleRegisterVerifyAction(code, nonce, redirectUri);
          if (res.success && res.isAlreadyRegistered) {
            fail("Email này đã có tài khoản. Vui lòng đăng nhập.", "/auth/login");
            return;
          }
          if (!res.success || !res.tempToken) {
            fail(res.error || "Xác minh Google thất bại.", retryPath);
            return;
          }
          storePendingGoogleVerification({
            intent,
            tempToken: res.tempToken,
            email: res.email,
            fullName: res.fullName,
          });
          window.location.replace("/auth/register");
          return;
        }

        const res = await googleResetPasswordVerifyAction(code, nonce, redirectUri);
        if (!res.success || !res.tempToken) {
          fail(res.error || "Xác minh Google thất bại.", retryPath);
          return;
        }
        storePendingGoogleVerification({
          intent,
          tempToken: res.tempToken,
          email: res.email,
          fullName: res.fullName,
        });
        window.location.replace(
          redirect
            ? `/auth/forgot-password?redirect=${encodeURIComponent(redirect)}`
            : "/auth/forgot-password",
        );
      } catch (err: unknown) {
        fail(err instanceof Error ? err.message : "Xác thực Google thất bại.", retryPath);
      }
    };

    void run();
  }, [setAuth]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-inner">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <div className="space-y-1">
          <p role={errorMsg ? "alert" : "status"} className="text-base font-bold text-foreground">
            {errorMsg ? errorMsg : "Đang xác thực tài khoản với Google…"}
          </p>
          <p className="text-xs text-muted-foreground">
            {errorMsg
              ? `Đang chuyển về ${failurePath === "/auth/login" ? "trang đăng nhập" : "trang trước"}...`
              : "Vui lòng đợi trong giây lát"}
          </p>
        </div>
      </div>
    </main>
  );
}
