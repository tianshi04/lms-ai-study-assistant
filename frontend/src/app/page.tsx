"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);

  // Check backend status on mount using CatalogService
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const catalogClient = getRpcClient(CatalogService);
        await catalogClient.listCourses({});
        setIsBackendOnline(true);
      } catch (err: unknown) {
        console.error("Backend health check failed:", err);
        setIsBackendOnline(false);
      }
    };
    checkStatus();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.1),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.1),transparent_40%)] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              C
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Coursera AI LMS</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Modular Monolith DDD Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/courses"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3 py-1.5 rounded-lg"
            >
              Catalog
            </Link>

            <Link
              href="/auth/login"
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors bg-blue-50 dark:bg-blue-500/10 px-3.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-500/20"
            >
              Đăng nhập
            </Link>

            <Link
              href="/auth/register"
              className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all px-3.5 py-1.5 rounded-lg shadow-md shadow-blue-500/20"
            >
              Đăng ký
            </Link>

            <ThemeToggle />

            <div className="flex items-center space-x-2 pl-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBackendOnline ? 'bg-emerald-400' : isBackendOnline === false ? 'bg-rose-400' : 'bg-amber-400'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isBackendOnline ? 'bg-emerald-500' : isBackendOnline === false ? 'bg-rose-500' : 'bg-amber-500'}`} />
              </span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {isBackendOnline ? "Online" : isBackendOnline === false ? "Offline" : "Checking..."}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner with CTA */}
      <main className="flex-1 relative z-20 max-w-7xl mx-auto px-6 pt-12 pb-12 text-center md:text-left grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Track A & Track D Live: Catalog, Auth, Financial Aid & Certificate
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Nền tảng Học tập Tích hợp <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">Coursera AI Coach</span> & Verified Certificate
          </h2>

          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed max-w-2xl">
            Hệ thống LMS chuẩn Coursera tích hợp đầy đủ quy trình học tập từ Khóa học, Trình phát Video tương tác, Đơn xin Hỗ trợ Tài chính (150 từ), đến Cấp phát Chứng chỉ Xác thực công khai (OpenBadges 2.0 & QR Code).
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/courses"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2 group"
            >
              Khám phá Catalog
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href="/financial-aid?courseId=course-python-ai"
              className="px-5 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold text-sm transition-all flex items-center gap-2 shadow-sm"
            >
              Hỗ trợ tài chính (Financial Aid)
            </Link>

            <Link
              href="/verify/CERT-DEMO12345"
              className="px-5 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-bold text-sm transition-all flex items-center gap-2"
            >
              Xem Chứng chỉ Xác thực Mẫu
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/courses"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Course Catalog</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Xem danh sách khóa học Specialization lấy dữ liệu động từ PostgreSQL 17.</p>
          </Link>

          <Link
            href="/auth/profile"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">User Profile & Enterprise</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Hồ sơ cá nhân & kích hoạt mã Enterprise License cho doanh nghiệp/trường học.</p>
          </Link>

          <Link
            href="/financial-aid?courseId=course-python-ai"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Financial Aid (150 từ)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Nộp đơn xin học bổng 150 từ với bộ đếm từ realtime & tiến độ xét duyệt 14 ngày.</p>
          </Link>

          <Link
            href="/verify/CERT-DEMO12345"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Verified Certificate</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Trang xác thực chứng chỉ công khai chuẩn OpenBadges 2.0 & QR Code.</p>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-600 relative z-10">
        <p>© 2026 Coursera LMS Platform. Built with Next.js 16, ConnectRPC, and Tailwind CSS v4.</p>
      </footer>
    </div>
  );
}
