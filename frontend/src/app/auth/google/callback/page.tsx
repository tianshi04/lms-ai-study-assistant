"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Parse id_token or access_token from URL hash (implicit flow) or query params
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash || window.location.search);
    const idToken = params.get("id_token") || params.get("credential");
    const error = params.get("error");

    if (window.opener) {
      // If opened in a Popup window
      if (idToken) {
        window.opener.postMessage(
          { type: "GOOGLE_AUTH_SUCCESS", idToken },
          window.location.origin
        );
      } else if (error) {
        window.opener.postMessage(
          { type: "GOOGLE_AUTH_ERROR", error },
          window.location.origin
        );
      }
      window.close();
    } else {
      // If direct page redirect
      if (idToken) {
        sessionStorage.setItem("google_temp_id_token", idToken);
        router.push("/auth/register");
      } else {
        router.push("/auth/login");
      }
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-muted-foreground">
          Đang xác thực tài khoản với Google…
        </p>
      </div>
    </main>
  );
}
