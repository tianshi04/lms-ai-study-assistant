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
  onSuccess: (authCode: string, nonce: string) => void;
  disabled?: boolean;
  text?: string;
  variant?: "outlined" | "filled" | "tonal";
  className?: string;
  children?: React.ReactNode;
}

export function GoogleAuthButton({
  onSuccess,
  disabled = false,
  text = "Tiếp tục với Google",
  variant = "outlined",
  className = "",
  children,
}: GoogleAuthButtonProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleClick = async () => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const isProduction = process.env.NEXT_PUBLIC_ENV === "production";

    if (!googleClientId && !isProduction) {
      const inputEmail = window.prompt(
        "Dev Mode: Nhập địa chỉ Gmail để giả lập xác minh Google",
        "user.test@gmail.com",
      );
      if (inputEmail && inputEmail.includes("@")) {
        const mockToken = `mock_google_${inputEmail.trim()}_${inputEmail.split("@")[0]}`;
        onSuccess(mockToken, "mock");
      }
      return;
    }

    if (!googleClientId) {
      console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID chưa được cấu hình");
      return;
    }

    // Fix #3: Guard against GIS script not loaded yet
    if (typeof google === "undefined" || !google.accounts?.oauth2) {
      alert("Hệ thống xác thực Google đang khởi tạo. Vui lòng thử lại sau giây lát.");
      return;
    }

    setInternalLoading(true);

    try {
      if (typeof google !== "undefined" && google.accounts?.oauth2) {
        const client = google.accounts.oauth2.initCodeClient({
          client_id: googleClientId,
          scope: "openid email profile",
          ux_mode: "popup",
          callback: (response) => {
            setInternalLoading(false);
            if (response.error) {
              console.error("Google Auth Error:", response.error, response.error_description);
              return;
            }
            if (response.code) {
              onSuccess(response.code, "");
            }
          },
        });

        // Must be called synchronously within the click event loop to prevent browser popup blocking
        client.requestCode();
      } else {
        setInternalLoading(false);
      }
    } catch (error) {
      console.error(error);
      setInternalLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      onClick={handleClick}
      disabled={disabled || internalLoading}
      leadingIcon={<GoogleIcon />}
      className={`w-full py-3 font-semibold text-sm shadow-sm ${className}`}
    >
      {/* Fix #2: Removed duplicate <GoogleIcon /> — leadingIcon already renders it */}
      <span>{children ?? text}</span>
    </Button>
  );
}
