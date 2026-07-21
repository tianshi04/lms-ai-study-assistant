"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return <div className="w-24 h-8 bg-slate-200 dark:bg-slate-800/40 rounded-lg animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl text-xs">
      <button
        onClick={() => setTheme("light")}
        className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
          theme === "light"
            ? "bg-white text-slate-900 shadow-sm font-bold border border-slate-200"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
        title="Chuyển giao diện Sáng (Light Mode)"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        Sáng
      </button>

      <button
        onClick={() => setTheme("dark")}
        className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
          theme === "dark"
            ? "bg-blue-600 text-white shadow-sm font-bold"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
        title="Chuyển giao diện Tối (Dark Mode)"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        Tối
      </button>

      <button
        onClick={() => setTheme("system")}
        className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
          theme === "system"
            ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
        title="Theo cài đặt hệ thống (System Auto)"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Hệ thống
      </button>
    </div>
  );
}
