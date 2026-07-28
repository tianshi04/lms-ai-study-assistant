"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";


const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <div className="w-14 h-8 rounded-full bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700/60 shrink-0" />
    );
  }

  const isDark = (resolvedTheme || theme) === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center h-8 w-14 rounded-full p-1 transition-colors duration-300 ease-in-out cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 shrink-0 shadow-inner ${
        isDark
          ? "bg-slate-800 border border-slate-700/80 hover:bg-slate-800/90"
          : "bg-slate-200/90 border border-slate-300/80 hover:bg-slate-300/80"
      }`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? ("Sáng") : ("Tối")}
    >
      {/* Background Track Icons */}
      <span className="absolute left-1.5 flex items-center justify-center pointer-events-none">
        <svg
          className={`w-3.5 h-3.5 transition-opacity duration-200 ${
            isDark ? "text-amber-500/50 opacity-100" : "opacity-0"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      </span>

      <span className="absolute right-1.5 flex items-center justify-center pointer-events-none">
        <svg
          className={`w-3.5 h-3.5 transition-opacity duration-200 ${
            isDark ? "opacity-0" : "text-indigo-400/50 opacity-100"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </span>

      {/* Sliding Knob Thumb */}
      <span
        className={`pointer-events-none relative inline-flex items-center justify-center w-6 h-6 rounded-full transform transition-transform duration-300 ease-in-out shadow-md ${
          isDark
            ? "translate-x-6 bg-slate-900 text-indigo-400 ring-1 ring-white/10"
            : "translate-x-0 bg-white text-amber-500 ring-1 ring-slate-900/5"
        }`}
      >
        {isDark ? (
          <svg
            className="w-3.5 h-3.5 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
