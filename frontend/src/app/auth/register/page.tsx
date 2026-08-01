"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService, UserRole } from "@/gen/identity/v1/identity_pb";
import { useToast } from "@/components/ui/Toast";

import { User, Mail, Lock, Eye, EyeOff, Users, ChevronDown, Loader2 } from "lucide-react";
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
            <Link href="/" prefetch={true} className="inline-flex items-center gap-3 group mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                C
              </div>
              <div className="text-left">
                <span className="font-bold text-lg tracking-tight text-foreground block">
                  Coursera AI
                </span>
                <span className="text-xs block text-muted-foreground font-medium">
                  LMS Platform
                </span>
              </div>
            </Link>
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
                        <User className="w-5 h-5" />
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
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
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
                      <Users className="w-5 h-5" />
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
                      <ChevronDown className="w-4 h-4" />
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
                      <Loader2 className="animate-spin h-4 w-4 text-primary-foreground" />
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
