"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService } from "@/gen/identity/v1/identity_pb";
import { ThemeToggle } from "@/components/ThemeToggle";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/courses";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const client = getRpcClient(IdentityService);
      const res = await client.login({ email, password });
      if (res.accessToken && res.user) {
        localStorage.setItem("access_token", res.accessToken);
        localStorage.setItem("user_id", res.user.id);
        localStorage.setItem("user_email", res.user.email);
        localStorage.setItem("user_name", res.user.fullName);
        localStorage.setItem("user_role", String(res.user.role));
        router.push(redirectTarget);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Đăng nhập tài khoản</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {searchParams.get("redirect") ? "Vui lòng đăng nhập để bắt đầu học bài giảng này" : "Chào mừng bạn quay trở lại với hệ thống học tập Coursera AI"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Địa chỉ Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="learner@example.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Mật khẩu
              </label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng nhập ngay</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Chưa có tài khoản?{" "}
            <Link href="/auth/register" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Đăng ký miễn phí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between transition-colors">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/courses" className="flex items-center gap-3 group">
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
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
          <LoginFormContent />
        </Suspense>
      </main>
    </div>
  );
}
