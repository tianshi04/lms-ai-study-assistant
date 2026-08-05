"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { loginAction, googleLoginAction } from "@/app/auth/actions";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

import { Eye, EyeOff, Zap } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectTarget =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";

  const toast = useToast();
  const { setAuth } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
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

          router.push(redirectTarget);
          router.refresh();
        } else {
          toast.error(res.error || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleGoogleLogin = async (googleIdToken: string) => {
    setGoogleSubmitting(true);
    try {
      const res = await googleLoginAction(googleIdToken);
      if (res.success && res.user) {
        setAuth({
          userId: res.user.id,
          userName: res.user.fullName,
          userEmail: res.user.email,
          userRole: res.user.role,
          userAvatar: res.user.avatarUrl,
        });

        toast.success("Đăng nhập bằng Google thành công!");
        router.push(redirectTarget);
        router.refresh();
      } else {
        toast.error(res.error || "Đăng nhập bằng Google thất bại.");
      }
    } catch {
      toast.error(
        "Không thể kết nối với dịch vụ xác thực Google. Vui lòng đăng nhập bằng Mật khẩu bên dưới.",
      );
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-3xl p-8 transition-colors shadow-xl">
        <div className="text-center mb-8">
          <Link href="/" prefetch={true} className="inline-flex items-center gap-3 group mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
              C
            </div>
            <div className="text-left">
              <span className="font-bold text-lg tracking-tight text-foreground block">
                Coursera AI
              </span>
              <span className="text-xs block text-muted-foreground font-medium">LMS Platform</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-2 text-balance">
            {"Đăng nhập tài khoản"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {searchParams.get("redirect")
              ? "Vui lòng đăng nhập để bắt đầu học bài giảng này"
              : "Chào mừng bạn quay trở lại với hệ thống học tập Coursera LMS"}
          </p>
        </div>

        {/* Google 1-Click Login Option */}
        <div className="space-y-4 mb-6">
          <GoogleAuthButton
            onSuccess={handleGoogleLogin}
            isLoading={googleSubmitting}
            text="Đăng nhập với Google"
            variant="outline"
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
                    autoComplete="email"
                    spellCheck={false}
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
                  <div className="relative">
                    <Input
                      label="Mật khẩu"
                      id={field.name}
                      name={field.name}
                      type={showPassword ? "text" : "password"}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      error={hasError ? String(field.state.meta.errors[0]) : undefined}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                      className="absolute right-2 top-8 text-muted-foreground hover:text-foreground h-8 w-8"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-semibold text-primary hover:underline transition-all"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                </div>
              );
            }}
          </form.Field>

          {/* Submit Button */}
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit]) => (
              <Button
                type="submit"
                isLoading={submitting}
                disabled={!canSubmit}
                size="lg"
                className="w-full shadow-lg"
              >
                {"Đăng nhập ngay"}
              </Button>
            )}
          </form.Subscribe>
        </form>

        {/* Quick Test Accounts Selector for Dev Mode */}
        {process.env.NEXT_PUBLIC_ENV !== "production" && (
          <div className="mt-6 p-4 rounded-2xl bg-muted border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                {"Tài khoản Test sẵn (Dev Mode)"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {"Mật khẩu: 123456"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {[
                { label: "Học viên Cá nhân", email: "learner@coursera.ai", roleTag: "Learner" },
                {
                  label: "Giảng viên Cá nhân",
                  email: "instructor@coursera.ai",
                  roleTag: "Instructor",
                },
                { label: "Trợ giảng Tổ chức", email: "ta@coursera.ai", roleTag: "Org TA" },
                {
                  label: "Quản trị viên Tổ chức",
                  email: "partner@coursera.ai",
                  roleTag: "Org Admin",
                },
                {
                  label: "Super Admin toàn sàn",
                  email: "admin@coursera.ai",
                  roleTag: "Super Admin",
                },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    form.setFieldValue("email", acc.email);
                    form.setFieldValue("password", "123456");
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-card border border-border hover:border-primary transition-all text-xs font-medium flex items-center justify-between group cursor-pointer"
                >
                  <div className="truncate pr-1">
                    <div className="font-semibold text-foreground group-hover:text-primary truncate">
                      {acc.label}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground truncate">
                      {acc.email}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                    {acc.roleTag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {"Chưa có tài khoản?"}{" "}
            <Link href="/auth/register" className="font-semibold text-primary hover:underline">
              {"Đăng ký miễn phí"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
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
