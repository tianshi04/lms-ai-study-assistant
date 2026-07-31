"use client";

import Link from "next/link";

export function PartnerDashboard({ userName }: { userName: string }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  return (
    <div className="w-full flex-1 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-6 py-12 space-y-10">
        {/* Header Banner */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Bảng Điều Khiển Đối Tác Doanh Nghiệp
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {getGreeting()},{" "}
              <span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-white bg-clip-text text-transparent">
                Đại diện {userName}
              </span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Quản lý gói suất học tài trợ (Enterprise Seat Licenses), phân bổ cho nhân sự và theo
              dõi báo cáo kích hoạt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/partner/settings"
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Cấu Hình Gói Doanh Nghiệp
            </Link>
          </div>
        </header>

        {/* Quick Shortcut Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Trạng Thái Suất Học Enterprise
          </h2>
          <p className="text-sm text-slate-500">
            Truy cập trang Cấu Hình Đối Tác để gán license key cho danh sách nhân sự của đơn vị bạn.
          </p>
          <Link
            href="/partner/settings"
            className="inline-block px-6 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm shadow-md hover:bg-amber-400 transition-all"
          >
            Đến trang quản lý suất học →
          </Link>
        </div>
      </main>
    </div>
  );
}
