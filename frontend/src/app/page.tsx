"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";

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
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.15),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.15),transparent_40%)] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              C
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Coursera AI LMS</h1>
              <p className="text-xs text-slate-400">Modular Monolith DDD Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <Link
              href="/courses"
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-3.5 py-1.5 rounded-lg border border-blue-500/20 inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Browse Catalog
            </Link>

            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBackendOnline ? 'bg-emerald-400' : isBackendOnline === false ? 'bg-rose-400' : 'bg-amber-400'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isBackendOnline ? 'bg-emerald-500' : isBackendOnline === false ? 'bg-rose-500' : 'bg-amber-500'}`} />
              </span>
              <span className="text-xs font-medium text-slate-300">
                {isBackendOnline ? "Backend: Online" : isBackendOnline === false ? "Backend: Offline" : "Checking..."}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner with CTA */}
      <main className="flex-1 relative z-20 max-w-7xl mx-auto px-6 pt-16 pb-12 text-center md:text-left grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Track A Live: Catalog, Video Player & Learning Progress
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Nền tảng Học tập Thông minh Tích hợp <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Coursera AI Coach</span>
          </h2>

          <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
            Trải nghiệm các khóa học chuẩn quốc tế với Video tương tác, Phụ đề cuộn thông minh (Interactive Transcript), In-Video Quiz ngắt ngang, và quản lý lịch học linh hoạt (Flexible Deadlines).
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/courses"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2 group"
            >
              Xem Danh Sách Khóa Học (Catalog)
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <Link
              href="/learn/course-python-ai"
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-sm transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Demo Course Player
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/courses"
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-blue-400 transition-colors">Course Catalog</h3>
            <p className="text-xs text-slate-400">Xem danh sách khóa học Specialization theo chuẩn Coursera.</p>
          </Link>

          <Link
            href="/learn/course-python-ai"
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-white text-base mb-1 group-hover:text-blue-400 transition-colors">Interactive Player</h3>
            <p className="text-xs text-slate-400">Phát Video + Interactive Transcript cuộn & In-Video Quiz.</p>
          </Link>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-white text-base mb-1">Reset Deadlines</h3>
            <p className="text-xs text-slate-400">Gia hạn lịch nộp bài linh hoạt không trừ điểm thi.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h3 className="font-bold text-white text-base mb-1">Personal Notes</h3>
            <p className="text-xs text-slate-400">Bôi đen bài giảng & lưu ghi chú cá nhân tức thì.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 py-6 text-center text-xs text-slate-600 relative z-10">
        <p>© 2026 Coursera LMS Platform. Built with Next.js 15, ConnectRPC, and Tailwind CSS v4.</p>
      </footer>
    </div>
  );
}
