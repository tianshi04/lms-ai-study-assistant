"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function NotFoundClient() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col justify-between w-full relative z-10">
      {/* Background radial decorations */}

      {/* Main 404 Container */}
      <main className="flex-1 relative z-10 flex items-center justify-center max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="space-y-8 w-full">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>{"Lỗi 404 - Không tìm thấy trang"}</span>
          </div>

          {/* Graphical 404 Hero Illustration */}
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute w-72 h-72 bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-sky-400/20 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="relative">
              <span className="text-8xl sm:text-9xl font-black tracking-tighter bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 bg-clip-text text-transparent select-none drop-shadow-sm">
                404
              </span>
              {/* Floating Compass / Search SVG overlay */}
              <div className="absolute -top-3 -right-4 sm:-top-4 sm:-right-6 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center rotate-12 transform hover:rotate-0 transition-transform duration-300">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Headings */}
          <div className="space-y-3 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
              {"Rất tiếc! Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển."}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              {
                "Địa chỉ đường dẫn (URL) có thể đã bị thay đổi, bị xoá hoặc không khả dụng tạm thời. Hãy kiểm tra lại hoặc quay về trang chính."
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                id="btn-notfound-home"
                href="/"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <span>{"Về trang chủ"}</span>
              </Link>

              <Link
                id="btn-notfound-catalog"
                href="/courses"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <span>{"Khám phá khóa học"}</span>
              </Link>
            </div>

            <div className="flex justify-center pt-2">
              <button
                id="btn-notfound-goback"
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-semibold transition-colors duration-200 cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span>{"Quay lại"}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="relative z-10 py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>{"© 2026 Coursera LMS Platform. Nền tảng học tập trực tuyến hàng đầu."}</p>
      </footer>
    </div>
  );
}
