"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowLeft, CheckCircle2, ShieldCheck, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { googleResetPasswordVerifyAction, completeResetPasswordAction } from "@/app/auth/actions";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get("redirect");
  const redirectTarget =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";

  const { setAuth } = useAuth();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  // Step 1: Google Re-Auth Verification | Step 2: New Password Setup
  const [step, setStep] = useState<1 | 2>(1);
  const [tempToken, setTempToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Handle Step 1: Google verification success
  const handleGoogleSuccess = async (authCode: string, nonce: string) => {
    setErrorMsg("");
    startTransition(async () => {
      const res = await googleResetPasswordVerifyAction(authCode, nonce);
      if (res.success && res.tempToken) {
        setTempToken(res.tempToken);
        setUserEmail(res.email || "");
        setUserName(res.fullName || "");
        setStep(2);
        toast.success("Xác minh tài khoản Google thành công! Vui lòng nhập mật khẩu mới.");
      } else {
        const msg = res.error || "Xác minh thất bại. Vui lòng đảm bảo tài khoản đã được đăng ký!";
        setErrorMsg(msg);
        toast.error(msg);
      }
    });
  };

  // Handle Step 2: Complete Password Reset
  const handleSubmitReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 6 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setErrorMsg("Mật khẩu chưa đạt yêu cầu bảo mật.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp.");
      return;
    }

    startTransition(async () => {
      const res = await completeResetPasswordAction(tempToken, newPassword);
      if (res.success && res.user) {
        setAuth({
          userId: res.user.id,
          userName: res.user.fullName,
          userEmail: res.user.email,
          userRole: res.user.role,
          userAvatar: res.user.avatarUrl,
        });

        toast.success("Đặt lại mật khẩu thành công! Đang chuyển hướng…");
        router.push(redirectTarget);
        router.refresh();
      } else {
        const msg = res.error || "Cập nhật mật khẩu thất bại.";
        setErrorMsg(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-surface text-on-surface">
      <Surface
        variant="bright"
        shape="3xl"
        padding="lg"
        className="w-full max-w-md space-y-6 shadow-xl"
      >
        {/* Header Section */}
        <Surface.Header className="text-center p-0 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 shadow-inner">
            <KeyRound aria-hidden="true" className="w-6 h-6" />
          </div>
          <Surface.Title className="text-2xl font-bold tracking-tight text-on-surface">
            Quên mật khẩu?
          </Surface.Title>
          <Surface.Description className="text-sm text-on-surface-variant">
            {step === 1
              ? "Xác minh qua Google để đặt lại mật khẩu mới cho tài khoản của bạn"
              : `Xác nhận danh tính cho ${userEmail}`}
          </Surface.Description>
        </Surface.Header>

        <Surface.Content className="p-0 space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-3 text-xs font-semibold">
            <span
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors ${
                step === 1
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" /> 1. Xác minh Google
            </span>
            <span className="text-muted-foreground">→</span>
            <span
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors ${
                step === 2
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Lock aria-hidden="true" className="w-3.5 h-3.5" /> 2. Mật khẩu mới
            </span>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: Google Verification */}
          {step === 1 && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/50 border border-border/80 text-xs text-muted-foreground leading-relaxed space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck aria-hidden="true" className="w-4 h-4 text-primary" /> Bảo mật & Tốc
                  độ cao:
                </p>
                <p>Xác thực danh tính trực tiếp qua Google chính chủ mà không cần chờ Email OTP.</p>
              </div>

              <GoogleAuthButton
                onSuccess={handleGoogleSuccess}
                disabled={isPending}
                text="Xác minh bằng Google để đổi MK"
                variant="outlined"
              />
            </div>
          )}

          {/* STEP 2: Password Reset Form */}
          {step === 2 && (
            <form onSubmit={handleSubmitReset} className="space-y-4 pt-2">
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-foreground flex items-center gap-2.5">
                <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="font-semibold block">{userName}</span>
                  <span className="text-muted-foreground">{userEmail}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="text-xs font-semibold text-foreground">
                  Mật khẩu mới
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isPending}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                  Xác nhận mật khẩu mới
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới để xác nhận"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isPending}
                  className="rounded-xl"
                />
              </div>

              <Button
                type="submit"
                variant="filled"
                disabled={isPending}
                className="w-full py-3 rounded-xl font-bold text-sm shadow-md"
              >
                Cập nhật mật khẩu & Đăng nhập
              </Button>
            </form>
          )}

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-border text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Quay lại Đăng nhập</span>
            </Link>
          </div>
        </Surface.Content>
      </Surface>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm font-semibold text-muted-foreground">
          Đang tải…
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
