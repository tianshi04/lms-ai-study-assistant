"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { googleLoginAction } from "@/app/auth/actions";
import { useToast } from "@/components/ui/Toast";

export function GoogleOneTapPrompt() {
  const { userName, setAuth } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const initializedRef = useRef(false);

  useEffect(() => {
    // If user is already logged in, skip displaying Google One Tap
    // Suppress Next.js dev overlay for Google SDK GSI_LOGGER internal warnings
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].includes("[GSI_LOGGER]")) {
        console.warn(...args);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error = originalConsoleError;
      return;
    }

    const initOneTap = () => {
      if (typeof google === "undefined" || !google.accounts?.id) return;

      try {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response.credential) return;

            try {
              const res = await googleLoginAction(response.credential, "");
              if (res.success && res.user) {
                setAuth({
                  userId: res.user.id,
                  userName: res.user.fullName,
                  userEmail: res.user.email,
                  userRole: res.user.role,
                  userAvatar: res.user.avatarUrl,
                });
                toast.success("Đăng nhập 1 chạm thành công!");
                router.refresh();
              } else if (res.error) {
                toast.error(res.error);
              }
            } catch (err) {
              console.error("Google One Tap login error:", err);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: false,
        });

        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            if (reason === "origin_not_allowed") {
              console.warn(
                "[Google One Tap] Origin '" +
                  (typeof window !== "undefined" ? window.location.origin : "") +
                  "' chưa được thêm vào Authorized JavaScript origins trên Google Cloud Console.",
              );
            }
          }
        });
        initializedRef.current = true;
      } catch (error) {
        console.warn("[Google One Tap] Init error:", error);
      }
    };

    // Retry check in case GIS script is still loading asynchronously
    let timer: NodeJS.Timeout | null = null;
    if (typeof google !== "undefined" && google.accounts?.id) {
      initOneTap();
    } else {
      timer = setInterval(() => {
        if (typeof google !== "undefined" && google.accounts?.id) {
          initOneTap();
          if (timer) clearInterval(timer);
        }
      }, 500);
    }

    return () => {
      if (timer) clearInterval(timer);
      console.error = originalConsoleError;
    };
  }, [userName, setAuth, router, toast]);

  return null;
}
