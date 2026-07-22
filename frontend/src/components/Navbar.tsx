"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const emptySubscribe = () => () => {};

export function Navbar() {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const userName = isMounted && typeof window !== "undefined" ? localStorage.getItem("user_name") : null;
  const userEmail = isMounted && typeof window !== "undefined" ? localStorage.getItem("user_email") : null;
  const userRole = isMounted && typeof window !== "undefined" ? localStorage.getItem("user_role") : null;

  // Check if role is INSTRUCTOR (2), SUPER_ADMIN (4), or PARTNER_ADMIN (5)
  const isInstructorOrAdmin = userRole === "2" || userRole === "4" || userRole === "5";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/auth/login";
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
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

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
          <Link href="/courses" className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Catalog
          </Link>

          {/* Render Instructor Portal ONLY for authorized roles */}
          {isInstructorOrAdmin && (
            <Link href="/instructor/courses" className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
              <span>Giảng Viên</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">Portal</span>
            </Link>
          )}

          <Link href="/financial-aid?courseId=course-python-ai" className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Financial Aid
          </Link>
          <Link href="/verify/CERT-DEMO12345" className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Verify Cert
          </Link>
        </nav>

        {/* User Auth Section */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {isMounted && userName ? (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/profile"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail || "user"}`}
                  alt={userName}
                  className="w-7 h-7 rounded-full bg-blue-500/20"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white max-w-[120px] truncate">
                  {userName}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                Thoát
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="text-xs font-semibold px-3.5 py-2 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/auth/register"
                className="text-xs font-semibold px-3.5 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
