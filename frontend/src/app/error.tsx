"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime errors for observability
    console.error("Unhandled App Error:", error);
  }, [error]);

  return (
    <main className="flex-1 flex items-center justify-center min-h-[70vh] px-6 py-16 text-center">
      <div className="space-y-8 max-w-2xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>{"Đã xảy ra sự cố hệ thống"}</span>
        </div>

        {/* Graphical Illustration */}
        <div className="relative flex items-center justify-center my-4">
          <div className="absolute w-64 h-64 bg-gradient-to-tr from-red-500/20 via-orange-500/20 to-amber-400/20 rounded-full blur-3xl -z-10 animate-pulse" />
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center text-red-500 dark:text-red-400">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Headings */}
        <div className="space-y-3 max-w-xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white text-balance">
            {"Rất tiếc, đã có lỗi không mong muốn xảy ra!"}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            {
              "Hệ thống gặp sự cố tạm thời khi xử lý yêu cầu của bạn. Bạn có thể thử lại hoặc quay về trang chủ."
            }
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-slate-400 dark:text-slate-500 pt-1">
              Mã lỗi: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all duration-200"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {"Thử lại trang"}
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all duration-200"
          >
            {"Về Trang Chủ"}
          </Link>
        </div>
      </div>
    </main>
  );
}
