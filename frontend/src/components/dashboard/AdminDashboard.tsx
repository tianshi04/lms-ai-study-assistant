"use client";

import Link from "next/link";
import AdminEnterpriseDashboardPage from "@/app/admin/dashboard/page";

export function AdminDashboard({ userName: _userName }: { userName: string }) {
  return (
    <div className="w-full flex-1 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-900/10 dark:to-transparent pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Quick Admin Operations Navigation Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/applications"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm transition-all group flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                Duyệt Đơn Giảng Viên
              </h3>
              <p className="text-[10px] text-slate-500">Xét duyệt đơn đăng ký tác giả/giảng viên</p>
            </div>
          </Link>

          <Link
            href="/admin/courses/review"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm transition-all group flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                Duyệt Khóa Học
              </h3>
              <p className="text-[10px] text-slate-500">Kiểm duyệt chất lượng trước khi xuất bản</p>
            </div>
          </Link>

          <Link
            href="/admin/categories"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm transition-all group flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                Quản Lý Danh Mục
              </h3>
              <p className="text-[10px] text-slate-500">Cấu hình cây chủ đề và môn học</p>
            </div>
          </Link>

          <Link
            href="/admin/partners"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm transition-all group flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                Quản Trị Đối Tác
              </h3>
              <p className="text-[10px] text-slate-500">Trường đại học và doanh nghiệp</p>
            </div>
          </Link>
        </div>

        {/* Embedded Core Admin Enterprise Seat Management View */}
        <AdminEnterpriseDashboardPage />
      </main>
    </div>
  );
}
