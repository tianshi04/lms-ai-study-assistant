"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService } from "@/gen/identity/v1/identity_pb";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { LanguageToggle } from "@/components/providers/LanguageToggle";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n/TranslationProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectTarget =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/courses";
  const { t } = useTranslation();
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
        const client = getRpcClient(IdentityService);
        const res = await client.login({
          email: value.email.trim(),
          password: value.password,
        });

        if (res.accessToken && res.user) {
          localStorage.setItem("access_token", res.accessToken);
          if (res.refreshToken) {
            localStorage.setItem("refresh_token", res.refreshToken);
          }
          localStorage.setItem("user_id", res.user.id);
          localStorage.setItem("user_email", res.user.email);
          localStorage.setItem("user_name", res.user.fullName);
          localStorage.setItem("user_role", String(res.user.role));

          // Set cookies for SSR hydration
          document.cookie = `user_name=${encodeURIComponent(res.user.fullName)}; path=/; max-age=2592000`;
          document.cookie = `user_email=${encodeURIComponent(res.user.email)}; path=/; max-age=2592000`;
          document.cookie = `user_role=${res.user.role}; path=/; max-age=2592000`;
          document.cookie = `access_token=${res.accessToken}; path=/; max-age=2592000`;

          // Update React Auth Provider state so UI (Navbar, Profile) updates immediately
          setAuth({
            userName: res.user.fullName,
            userEmail: res.user.email,
            userRole: String(res.user.role),
          });

          router.push(redirectTarget);
          router.refresh();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t("auth.loginFailed");
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t("auth.loginTitle")}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {searchParams.get("redirect") ? t("auth.loginSubtitleRedirect") : t("auth.loginSubtitle")}
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
                  return t("auth.fillAllFields");
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
                  return t("auth.invalidEmail");
                }
                return undefined;
              },
            }}
          >
            {(field) => {
              const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;
              return (
                <div className="space-y-1.5">
                  <label htmlFor={field.name} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {t("auth.emailLabel")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
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
                      className={cn(
                        "w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2",
                        hasError
                          ? "border-red-500 focus:ring-red-500/50 focus:border-red-500"
                          : "border-slate-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500"
                      )}
                      required
                    />
                  </div>
                  {hasError && (
                    <p className="text-xs text-red-500 dark:text-red-400 font-medium">
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
                  return t("auth.passwordRequired");
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
                    <label htmlFor={field.name} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      {t("auth.passwordLabel")}
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
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
                        "w-full pl-10 pr-11 py-3 rounded-xl border text-sm transition-all bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2",
                        hasError
                          ? "border-red-500 focus:ring-red-500/50 focus:border-red-500"
                          : "border-slate-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500"
                      )}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c1.274-4.057 5.064-7 9.544-7s8.27 2.943 9.543 7c-1.274 4.057-5.064 7-9.543 7s-8.27-2.943-9.543-7z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {hasError && (
                    <p className="text-xs text-red-500 dark:text-red-400 font-medium">
                      {String(field.state.meta.errors[0])}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>

          {/* Submit Button */}
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit]) => (
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span>{t("auth.loggingIn")}</span>
                  </>
                ) : (
                  <span>{t("auth.loginBtn")}</span>
                )}
              </button>
            )}
          </form.Subscribe>
        </form>

        {/* Quick Test Accounts Selector for Dev Mode */}
        {process.env.NEXT_PUBLIC_ENV !== "production" && (
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t("auth.devAccountsTitle")}
              </span>
              <span className="text-[10px] font-mono text-slate-400">{t("auth.devPasswordHint")}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {[
                { label: t("auth.roleLearner"), email: "learner@coursera.ai", roleTag: "Role 1" },
                { label: t("auth.roleInstructor"), email: "instructor@coursera.ai", roleTag: "Role 2" },
                { label: t("auth.roleTA"), email: "ta@coursera.ai", roleTag: "Role 3" },
                { label: t("auth.roleSuperAdmin"), email: "admin@coursera.ai", roleTag: "Role 4" },
                { label: t("auth.rolePartnerAdmin"), email: "partner@coursera.ai", roleTag: "Role 5" },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    form.setFieldValue("email", acc.email);
                    form.setFieldValue("password", "123456");
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all text-xs font-medium flex items-center justify-between group cursor-pointer"
                >
                  <div className="truncate pr-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                      {acc.label}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">{acc.email}</div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex-shrink-0">
                    {acc.roleTag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-center pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("auth.noAccountYet")}{" "}
            <Link href="/auth/register" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              {t("auth.registerFreeNow")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between transition-colors">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              C
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Coursera AI
              </span>
              <span className="text-xs block text-slate-500 dark:text-slate-400 font-medium">LMS Platform</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="text-slate-500">{t("common.loading")}</div>}>
          <LoginFormContent />
        </Suspense>
      </main>
    </div>
  );
}
