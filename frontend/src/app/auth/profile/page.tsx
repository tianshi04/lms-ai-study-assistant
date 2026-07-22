"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService, type User } from "@/gen/identity/v1/identity_pb";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [enterpriseKey, setEnterpriseKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      router.push("/auth/login");
      return;
    }

    async function loadProfile() {
      try {
        const client = getRpcClient(IdentityService);
        const res = await client.getUserProfile({ userId: userId! });
        if (res.user) {
          setUser(res.user);
          setEnterpriseKey(res.user.enterpriseSeatKey || "");
        }
      } catch (err) {
        console.error("Lỗi tải thông tin cá nhân:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleAssignKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !enterpriseKey) return;

    setSavingKey(true);
    setMessage(null);

    try {
      const client = getRpcClient(IdentityService);
      const res = await client.assignEnterpriseSeat({
        userId: user.id,
        enterpriseSeatKey: enterpriseKey,
      });

      if (res.success) {
        setMessage({ type: "success", text: res.message || "Kích hoạt suất học doanh nghiệp thành công!" });
        setUser({ ...user, enterpriseSeatKey: enterpriseKey });
      } else {
        setMessage({ type: "error", text: res.message || "Không thể kích hoạt mã này." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xảy ra lỗi khi kích hoạt.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSavingKey(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <svg className="animate-spin h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span className="text-sm font-medium">Đang tải hồ sơ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between transition-colors">
      {/* Header */}
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
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 w-full flex-1">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
          {/* User Banner */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"}
              alt={user?.fullName || "User Avatar"}
              className="w-24 h-24 rounded-full border-4 border-blue-500/20 shadow-inner bg-slate-100 dark:bg-slate-800"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{user?.fullName}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{user?.email}</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                Vai trò: {user?.role === 1 ? "Learner (Học viên)" : user?.role === 2 ? "Instructor (Giảng viên)" : "TA / Admin"}
              </span>
            </div>
          </div>

          {/* Enterprise Seat Key Section */}
          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Suất học Doanh nghiệp / Đối tác (Enterprise License)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Nhập mã kích hoạt (Enterprise Seat Key) được cấp bởi trường đại học hoặc doanh nghiệp để mở khóa 100% tài nguyên học tập trả phí.
            </p>

            {message && (
              <div
                className={`mb-6 p-4 rounded-2xl border text-sm flex items-center gap-3 ${
                  message.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
                }`}
              >
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleAssignKey} className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={enterpriseKey}
                onChange={(e) => setEnterpriseKey(e.target.value)}
                placeholder="Nhập mã Enterprise Key (ví dụ: ENT-UNI-2026-X99)"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-mono"
              />
              <button
                type="submit"
                disabled={savingKey || !enterpriseKey}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {savingKey ? "Đang kích hoạt..." : "Kích hoạt mã"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
