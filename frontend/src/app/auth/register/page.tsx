"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService, UserRole } from "@/gen/identity/v1/identity_pb";
import { useToast } from "@/components/ui/Toast";

import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();

  const toast = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: UserRole.LEARNER,
    },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
      try {
        const client = getRpcClient(IdentityService);
        const res = await client.register({
          fullName: value.fullName.trim(),
          email: value.email.trim(),
          password: value.password,
          role: value.role,
        });

        if (res.user) {
          toast.success("Đăng ký thành công! Đang chuyển hướng đến trang đăng nhập…");
          setTimeout(() => {
            router.push("/auth/login");
          }, 1500);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Đăng ký thất bại. Vui lòng thử lại.";
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xl transition-colors">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2 text-balance">
              {"Đăng ký tài khoản"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {"Bắt đầu hành trình học tập chuyên sâu ngay hôm nay"}
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
            {/* Full Name Field */}
            <form.Field
              name="fullName"
              validators={{
                onChange: ({ value }) => {
                  if (!value.trim()) {
                    return "Vui lòng nhập họ và tên.";
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
                      {"Họ và tên"}
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
                            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                          />
                        </svg>
                      </div>
                      <input
                        id={field.name}
                        name={field.name}
                        type="text"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder={"Nguyễn Văn A"}
                        autoComplete="name"
                        className={cn(
                          "w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all bg-muted text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
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
                  if (value.length < 6) {
                    return "Mật khẩu phải chứa ít nhất 6 ký tự.";
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
                      {"Mật khẩu"}
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
                        autoComplete="new-password"
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
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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

            {/* User Role Select Field */}
            <form.Field name="role">
              {(field) => (
                <div className="space-y-1.5">
                  <label
                    htmlFor={field.name}
                    className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {"Vai trò người dùng"}
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
                          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a5.97 5.97 0 00-.942 3.197m0 0A9.093 9.093 0 012.25 18.24a3 3 0 014.682-2.72"
                        />
                      </svg>
                    </div>
                    <select
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(Number(e.target.value) as UserRole)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-input bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-all text-sm appearance-none cursor-pointer"
                    >
                      <option value={UserRole.LEARNER}>{"Học viên (Learner)"}</option>
                      <option value={UserRole.INSTRUCTOR}>{"Giảng viên (Instructor)"}</option>
                      <option value={UserRole.TA}>{"Trợ giảng (TA)"}</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted-foreground">
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
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
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
                      <span aria-live="polite">{"Đang tạo tài khoản…"}</span>
                    </>
                  ) : (
                    <span>{"Đăng ký ngay"}</span>
                  )}
                </button>
              )}
            </form.Subscribe>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {"Đã có tài khoản?"}{" "}
              <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                {"Đăng nhập tại đây"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
