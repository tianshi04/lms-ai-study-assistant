"use client";

import { useEffect, useState } from "react";
import { googleLoginAction } from "@/app/auth/actions";
import { useAuth } from "@/components/providers/AuthProvider";
import { normalizeUserRole } from "@/lib/jwt";
import { Loader2 } from "lucide-react";

export default function GoogleCallbackPage() {
  const { setAuth } = useAuth();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Parse auth code or id_token from URL query params or hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash || window.location.search);
    const authCode = params.get("code") || params.get("id_token") || params.get("credential");
    const error = params.get("error");

    if (window.opener) {
      // If opened in a Popup window
      if (authCode) {
        window.opener.postMessage(
          { type: "GOOGLE_AUTH_SUCCESS", idToken: authCode },
          window.location.origin,
        );
      } else if (error) {
        window.opener.postMessage({ type: "GOOGLE_AUTH_ERROR", error }, window.location.origin);
      }
      window.close();
      return;
    }

    if (error) {
      window.location.replace(`/auth/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!authCode) {
      window.location.replace("/auth/login");
      return;
    }

    // CSRF State Validation (Fail-Closed) & Target Redirect Extraction
    const stateParam = params.get("state");
    const cookieMatch = document.cookie.match(/(?:^|; )g_oauth_state=([^;]*)/);
    const cookieCsrfToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
    document.cookie = "g_oauth_state=; Path=/; max-age=0";

    let targetRedirectUrl = "";
    let isValidState = false;

    if (cookieCsrfToken && stateParam) {
      try {
        const stateObj = JSON.parse(decodeURIComponent(stateParam));
        if (stateObj && typeof stateObj === "object") {
          const { csrfToken, redirectUrl } = stateObj;
          if (csrfToken && csrfToken === cookieCsrfToken) {
            isValidState = true;
            if (
              redirectUrl &&
              typeof redirectUrl === "string" &&
              redirectUrl.startsWith("/") &&
              !redirectUrl.startsWith("//")
            ) {
              targetRedirectUrl = redirectUrl;
            }
          }
        }
      } catch {
        isValidState = false;
      }
    }

    if (!isValidState) {
      setErrorMsg("Xác thực OAuth State không hợp lệ hoặc đã hết hạn, nghi ngờ tấn công CSRF!");
      setTimeout(() => {
        window.location.replace("/auth/login");
      }, 2000);
      return;
    }

    const processLogin = async () => {
      try {
        const callbackRedirectUri = `${window.location.origin}/auth/google/callback`;
        const res = await googleLoginAction(authCode, "", callbackRedirectUri);
        if (res.success && res.user) {
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

          const finalTarget = targetRedirectUrl || defaultTarget;
          window.location.replace(finalTarget);
        } else {
          setErrorMsg(res.error || "Xác thực Google thất bại.");
          setTimeout(() => {
            window.location.replace("/auth/login");
          }, 1500);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Xác thực Google thất bại.";
        setErrorMsg(msg);
        setTimeout(() => {
          window.location.replace("/auth/login");
        }, 1500);
      }
    };

    processLogin();
  }, [setAuth]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-inner">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-bold text-foreground">
            {errorMsg ? errorMsg : "Đang xác thực tài khoản với Google…"}
          </p>
          <p className="text-xs text-muted-foreground">
            {errorMsg
              ? "Đang chuyển về trang đăng nhập..."
              : "Đang chuyển thẳng vào không gian học tập của bạn"}
          </p>
        </div>
      </div>
    </main>
  );
}
