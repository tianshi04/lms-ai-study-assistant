"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { loginAction } from "@/app/auth/actions";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { normalizeUserRole } from "@/lib/jwt";
import { sanitizeRedirectPath } from "@/lib/safe_redirect";

function LoginFormContent() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");

  const toast = useToast();
  const { setAuth } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccessRedirecting, setIsSuccessRedirecting] = useState(false);

  const getDestinationUrl = (role?: string) => {
    const safeRedirect = sanitizeRedirectPath(rawRedirect, "");
    if (safeRedirect) {
      return safeRedirect;
    }
    const r = role ? normalizeUserRole(role) : "";
    if (r === "USER_ROLE_ADMIN") {
      return "/admin/dashboard";
    }
    if (r === "USER_ROLE_INSTRUCTOR") {
      return "/instructor/dashboard";
    }
    return "/learner/dashboard";
  };

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
      setIsSuccessRedirecting(true);
      try {
        const res = await loginAction(value.email.trim(), value.password);

        if (res.success && res.user) {
          setAuth({
            userId: res.user.id,
            userName: res.user.fullName,
            userEmail: res.user.email,
            userRole: res.user.role,
            userAvatar: res.user.avatarUrl,
          });

          window.location.replace(getDestinationUrl(res.user.role));
        } else {
          setIsSuccessRedirecting(false);
          setSubmitting(false);
          toast.error(res.error || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
        }
      } catch (err: unknown) {
        setIsSuccessRedirecting(false);
        setSubmitting(false);
        const msg =
          err instanceof Error
            ? err.message
            : "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
        toast.error(msg);
      }
    },
  });

  const isAnyLoading = submitting || isSuccessRedirecting;

  return (
    <div className="w-full max-w-md relative">
      <Surface
        variant="bright"
        shape="3xl"
        padding="lg"
        className="shadow-xl relative overflow-hidden"
      >
        {/* Instant smooth redirect transition overlay */}
        {isSuccessRedirecting && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-50 flex flex-col items-center justify-center space-y-4 p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-foreground">Đang vào hệ thống học tập…</h3>
              <p className="text-xs text-muted-foreground">
                Đang chuẩn bị không gian học tập của bạn
              </p>
            </div>
          </div>
        )}

        <Surface.Header className="text-center p-0 mb-8 space-y-2 flex flex-col items-center">
          <div className="flex justify-center mb-4">
            <BrandLogo size="md" />
          </div>
          <Surface.Title className="text-2xl font-bold text-on-surface text-balance text-center w-full">
            {"Đăng nhập tài khoản"}
          </Surface.Title>
          <Surface.Description className="text-sm text-on-surface-variant text-center text-pretty w-full">
            {searchParams.get("redirect")
              ? "Vui lòng đăng nhập để tiếp tục bài học"
              : "Chào mừng bạn trở lại với nền tảng LMS AI"}
          </Surface.Description>
        </Surface.Header>

        <Surface.Content className="p-0">
          {/* Google 1-Click Login Option */}
          <div className="space-y-4 mb-6">
            <GoogleAuthButton
              intent="login"
              disabled={isAnyLoading}
              text="Đăng nhập với Google"
              variant="outlined"
            />

            <div className="relative flex items-center justify-center">
              <div className="border-t border-border w-full absolute"></div>
              <span className="bg-card px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground relative z-10">
                Hoặc đăng nhập bằng Email
              </span>
            </div>
          </div>

          {/* Email & Password Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-5"
          >
            {/* Email Field */}
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  if (!value.trim()) {
                    return "Vui lòng điền đầy đủ các thông tin bắt buộc.";
                  }
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
                    return "Địa chỉ email không hợp lệ.";
                  }
                  return undefined;
                },
              }}
            >
              {(field) => {
                const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                return (
                  <div className="space-y-1.5">
                    <Input
                      label="Địa chỉ Email"
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="learner@example.com"
                      autoComplete="username"
                      spellCheck={false}
                      disabled={isAnyLoading}
                      error={hasError ? String(field.state.meta.errors[0]) : undefined}
                      required
                    />
                  </div>
                );
              }}
            </form.Field>

            {/* Password Field */}
            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => {
                  if (!value) {
                    return "Vui lòng nhập mật khẩu.";
                  }
                  return undefined;
                },
              }}
            >
              {(field) => {
                const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                return (
                  <div className="space-y-1.5">
                    <Input
                      label="Mật khẩu"
                      id={field.name}
                      name={field.name}
                      type={showPassword ? "text" : "password"}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Nhập mật khẩu của bạn"
                      autoComplete="current-password"
                      disabled={isAnyLoading}
                      error={hasError ? String(field.state.meta.errors[0]) : undefined}
                      required
                      endAdornment={
                        <IconButton
                          type="button"
                          variant="standard"
                          size="xs"
                          tabIndex={-1}
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                          className="text-muted-foreground hover:text-foreground mr-1"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          )}
                        </IconButton>
                      }
                    />
                    <div className="flex justify-end pt-1">
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs font-semibold text-primary hover:underline transition-colors"
                      >
                        Quên mật khẩu?
                      </Link>
                    </div>
                  </div>
                );
              }}
            </form.Field>

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit]) => (
                <Button
                  type="submit"
                  disabled={isAnyLoading || !canSubmit}
                  size="sm"
                  className="w-full h-11 rounded-xl font-semibold text-sm shadow-md shadow-primary/25 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{"Đang đăng nhập…"}</span>
                    </>
                  ) : (
                    <span>{"Đăng nhập ngay"}</span>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <div className="mt-6 text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {"Chưa có tài khoản?"}{" "}
              <Link href="/auth/register" className="font-semibold text-primary hover:underline">
                {"Đăng ký miễn phí"}
              </Link>
            </p>
          </div>
        </Surface.Content>
      </Surface>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12 bg-surface text-on-surface">
      <Suspense
        fallback={
          <div aria-live="polite" className="text-muted-foreground text-sm">
            {"Đang tải…"}
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </main>
  );
}
