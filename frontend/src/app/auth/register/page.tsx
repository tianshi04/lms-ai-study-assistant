"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { googleRegisterVerifyAction, completeGoogleRegistrationAction } from "@/app/auth/actions";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { UserRole } from "@/gen/identity/v1/identity_pb";

import { User, Lock, Eye, EyeOff, Users, CheckCircle2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const { setAuth } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [googleVerifying, setGoogleVerifying] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form for Step 2: Password setup & Profile completion
  const form = useForm({
    defaultValues: {
      fullName: "",
      password: "",
      confirmPassword: "",
      role: UserRole.LEARNER,
    },
    onSubmit: async ({ value }) => {
      if (value.password !== value.confirmPassword) {
        toast.error("Mật khẩu xác nhận không khớp.");
        return;
      }

      setSubmitting(true);
      try {
        const res = await completeGoogleRegistrationAction(
          tempToken,
          value.password,
          value.fullName.trim(),
          value.role,
        );

        if (res.success && res.user) {
          setAuth({
            userId: res.user.id,
            userName: res.user.fullName,
            userEmail: res.user.email,
            userRole: res.user.role,
            userAvatar: res.user.avatarUrl,
          });

          toast.success("Đăng ký tài khoản thành công! Đang chuyển hướng…");
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 1000);
        } else {
          toast.error(res.error || "Đăng ký thất bại. Vui lòng thử lại.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Đăng ký thất bại.";
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleGoogleVerify = async (authCode: string, nonce: string) => {
    setGoogleVerifying(true);
    try {
      const res = await googleRegisterVerifyAction(authCode, nonce);
      if (res.isAlreadyRegistered) {
        toast.error("Email này đã được đăng ký tài khoản. Vui lòng Đăng nhập!");
        setTimeout(() => router.push("/auth/login"), 1500);
        return;
      }

      if (res.success && res.tempToken) {
        setTempToken(res.tempToken);
        setVerifiedEmail(res.email);
        form.setFieldValue("fullName", res.fullName || res.email.split("@")[0]);
        setStep(2);
        toast.success("Xác minh Google thành công! Vui lòng đặt mật khẩu dự phòng.");
      } else {
        toast.error(res.error || "Xác minh Google thất bại. Vui lòng thử lại.");
      }
    } catch {
      toast.error("Không thể kết nối với dịch vụ xác thực Google.");
    } finally {
      setGoogleVerifying(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="rounded-3xl p-8 transition-colors shadow-xl border border-border">
          <div className="text-center mb-8">
            <Link href="/" prefetch={true} className="inline-flex items-center gap-3 group mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl">
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

            {/* Stepper Progress */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  step === 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                1. Xác minh Google
              </span>
              <span className="text-muted-foreground">→</span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  step === 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2. Tạo Mật khẩu
              </span>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2 text-balance">
              {step === 1 ? "Đăng ký tài khoản" : "Tạo Mật khẩu Dự phòng"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {step === 1
                ? "Xác minh email qua Google để bắt đầu đăng ký"
                : "Thiết lập mật khẩu để đảm bảo luôn đăng nhập được"}
            </p>
          </div>

          {step === 1 ? (
            /* STEP 1: GOOGLE VERIFICATION */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-muted/60 border border-border text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
                  <ShieldCheck aria-hidden="true" className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Xác minh Email chính chủ</h3>
                <p className="text-xs text-muted-foreground">
                  Hệ thống yêu cầu xác minh qua Google để đảm bảo địa chỉ email thực & tránh spam.
                </p>
              </div>

              <GoogleAuthButton
                onSuccess={handleGoogleVerify}
                disabled={googleVerifying}
                text="Xác minh bằng Google"
                variant="filled"
                className="py-4 text-base"
              />

              <div className="text-center pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Đã có tài khoản?{" "}
                  <Link href="/auth/login" className="font-semibold text-primary hover:underline">
                    Đăng nhập tại đây
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            /* STEP 2: PASSWORD CREATION */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="space-y-5"
            >
              {/* Verified Email Banner */}
              <div className="p-3 rounded-xl bg-success/10 border border-success/20 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden pr-2">
                  <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-success flex-shrink-0" />
                  <div className="min-w-0 truncate">
                    <span className="text-[10px] uppercase font-bold text-success block tracking-wider">
                      Email đã xác minh Google
                    </span>
                    <span className="text-xs font-semibold text-foreground min-w-0 truncate block">
                      {verifiedEmail}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="text"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium shrink-0"
                >
                  <ArrowLeft aria-hidden="true" className="w-3.5 h-3.5" />
                  Đổi
                </Button>
              </div>

              {/* Full Name Field */}
              <form.Field
                name="fullName"
                validators={{
                  onChange: ({ value }) => {
                    if (!value.trim()) return "Vui lòng nhập họ và tên.";
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
                        Họ và tên
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground z-10">
                          <User aria-hidden="true" className="w-5 h-5" />
                        </div>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="text"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          error={hasError ? String(field.state.meta.errors[0]) : undefined}
                          className="pl-10 py-3 rounded-xl bg-muted"
                          required
                        />
                      </div>
                    </div>
                  );
                }}
              </form.Field>

              {/* Password Field */}
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return "Vui lòng nhập mật khẩu dự phòng.";
                    if (value.length < 6) return "Mật khẩu phải chứa ít nhất 6 ký tự.";
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
                        Mật khẩu dự phòng
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground z-10">
                          <Lock aria-hidden="true" className="w-5 h-5" />
                        </div>
                        <Input
                          id={field.name}
                          name={field.name}
                          type={showPassword ? "text" : "password"}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                          autoComplete="new-password"
                          error={hasError ? String(field.state.meta.errors[0]) : undefined}
                          className="pl-10 pr-11 py-3 rounded-xl bg-muted"
                          required
                        />
                        <IconButton
                          type="button"
                          variant="standard"
                          size="xs"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff aria-hidden="true" className="w-5 h-5" />
                          ) : (
                            <Eye aria-hidden="true" className="w-5 h-5" />
                          )}
                        </IconButton>
                      </div>
                    </div>
                  );
                }}
              </form.Field>

              {/* Confirm Password Field */}
              <form.Field
                name="confirmPassword"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return "Vui lòng nhập lại mật khẩu.";
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
                        Xác nhận mật khẩu
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground z-10">
                          <Lock aria-hidden="true" className="w-5 h-5" />
                        </div>
                        <Input
                          id={field.name}
                          name={field.name}
                          type={showPassword ? "text" : "password"}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Nhập lại mật khẩu để xác nhận"
                          autoComplete="new-password"
                          error={hasError ? String(field.state.meta.errors[0]) : undefined}
                          className="pl-10 py-3 rounded-xl bg-muted"
                          required
                        />
                      </div>
                    </div>
                  );
                }}
              </form.Field>

              {/* User Role Select */}
              <form.Field name="role">
                {(field) => (
                  <div className="space-y-1.5">
                    <label
                      htmlFor={field.name}
                      className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Vai trò người dùng
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10 text-muted-foreground">
                        <Users aria-hidden="true" className="w-5 h-5" />
                      </div>
                      <Select
                        value={String(field.state.value)}
                        onValueChange={(val) => {
                          if (val) field.handleChange(Number(val) as UserRole);
                        }}
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Chọn vai trò">
                            {field.state.value === UserRole.LEARNER
                              ? "Học viên (Learner)"
                              : field.state.value === UserRole.INSTRUCTOR
                                ? "Giảng viên (Instructor)"
                                : ""}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(UserRole.LEARNER)}>
                            Học viên (Learner)
                          </SelectItem>
                          <SelectItem value={String(UserRole.INSTRUCTOR)}>
                            Giảng viên (Instructor)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </form.Field>

              {/* Submit Button */}
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit]) => (
                  <Button
                    type="submit"
                    disabled={submitting || !canSubmit || submitting}
                    variant="filled"
                    className="w-full py-3.5 rounded-xl font-semibold text-sm shadow-lg mt-2"
                  >
                    Hoàn tất Đăng ký & Đăng nhập
                  </Button>
                )}
              </form.Subscribe>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
