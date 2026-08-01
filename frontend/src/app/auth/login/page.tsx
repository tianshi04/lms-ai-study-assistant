"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { loginAction } from "@/app/auth/actions";
import { useToast } from "@/components/ui/Toast";

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
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.75}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                        />
                      </svg>
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
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.75}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                        />
                      </svg>
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
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.75}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.75}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12c1.274-4.057 5.064-7 9.544-7s8.27 2.943 9.543 7c-1.274 4.057-5.064 7-9.543 7s-8.27-2.943-9.543-7z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
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
                    <svg
                      className="animate-spin h-4 w-4 text-primary-foreground"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
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
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
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
