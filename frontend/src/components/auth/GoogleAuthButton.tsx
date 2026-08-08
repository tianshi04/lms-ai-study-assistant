"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function GoogleIcon({ className = "w-5 h-5 flex-shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

interface GoogleAuthButtonProps {
  onSuccess: (googleIdToken: string) => void;
  isLoading?: boolean;
  text?: string;
  variant?: "outline" | "primary" | "secondary";
  className?: string;
  children?: React.ReactNode;
}

export function GoogleAuthButton({
  onSuccess,
  isLoading = false,
  text = "Tiếp tục với Google",
  variant = "outline",
  className = "",
  children,
}: GoogleAuthButtonProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleClick = () => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      const inputEmail = window.prompt(
        "Dev Mode: Nhập địa chỉ Gmail để giả lập xác minh Google",
        "user.test@gmail.com",
      );
      if (inputEmail && inputEmail.includes("@")) {
        const mockToken = `mock_google_${inputEmail.trim()}_${inputEmail.split("@")[0]}`;
        onSuccess(mockToken);
      }
      return;
    }

    setInternalLoading(true);

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const width = 500;
    const height = 620;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        response_type: "token id_token",
        scope: "openid email profile",
        nonce: Math.random().toString(36).substring(2),
        prompt: "select_account",
      }).toString();

    const popup = window.open(
      authUrl,
      "GoogleOAuthPopup",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`,
    );

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GOOGLE_AUTH_SUCCESS" && event.data?.idToken) {
        window.removeEventListener("message", handleMessage);
        setInternalLoading(false);
        onSuccess(event.data.idToken);
      } else if (event.data?.type === "GOOGLE_AUTH_ERROR") {
        window.removeEventListener("message", handleMessage);
        setInternalLoading(false);
      }
    };

    window.addEventListener("message", handleMessage);

    const timer = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(timer);
        window.removeEventListener("message", handleMessage);
        setInternalLoading(false);
      }
    }, 1000);
  };

  return (
    <Button
      type="button"
      variant={variant}
      onClick={handleClick}
      disabled={isLoading || internalLoading}
      isLoading={isLoading || internalLoading}
      className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 border border-border bg-card hover:bg-muted/80 text-foreground transition-colors shadow-sm ${className}`}
    >
      <GoogleIcon />
      <span>{children ?? text}</span>
    </Button>
  );
}
