"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { loginAction } from "@/app/auth/actions";
import { useToast } from "@/components/ui/Toast";

import { Mail, Lock, Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

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
            systemRole: res.user.systemRole,
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

  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-3xl p-8 shadow-xl transition-colors">
        <div className="text-center mb-8">
          <Link href="/" prefetch={true} className="inline-flex items-center gap-3 group mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
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
                  <label
                    htmlFor={field.name}
                    className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {"Địa chỉ Email"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="learner@example.com"
                      autoComplete="email"
                      spellCheck={false}
                      className={cn(
                        "w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-colors bg-muted text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
                        hasError
                          ? "border-destructive focus-visible:ring-destructive/50 focus-visible:border-destructive"
                          : "border-input focus-visible:ring-ring focus-visible:border-ring",
                      )}
                      required
                    />
                  </div>
                  {hasError && (
                    <p className="text-xs text-destructive font-medium">
                      {String(field.state.meta.errors[0])}
                    </p>
                  )}
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
                  <div className="flex justify-between items-center">
                    <label
                      htmlFor={field.name}
                      className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {"Mật khẩu"}
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id={field.name}
                      name={field.name}
                      type={showPassword ? "text" : "password"}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={cn(
                        "w-full pl-10 pr-11 py-3 rounded-xl border text-sm transition-all bg-muted text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
                        hasError
                          ? "border-destructive focus-visible:ring-destructive/50 focus-visible:border-destructive"
                          : "border-input focus-visible:ring-ring focus-visible:border-ring",
                      )}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {hasError && (
                    <p className="text-xs text-destructive font-medium">
                      {String(field.state.meta.errors[0])}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>

          {/* Submit Button */}
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit]) => (
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 text-primary-foreground" />
                    <span aria-live="polite">{"Đang đăng nhập…"}</span>
                  </>
                ) : (
                  <span>{"Đăng nhập ngay"}</span>
                )}
              </button>
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
