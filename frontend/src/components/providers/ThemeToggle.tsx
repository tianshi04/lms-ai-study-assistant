"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { useTranslation } from "@/lib/i18n/TranslationProvider";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800/40 animate-pulse" />;
  }

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const getThemeInfo = () => {
    if (theme === "light") {
      return {
        label: t("common.themeLight"),
        title: t("common.themeLightDesc"),
        icon: (
          <svg className="w-4 h-4 text-amber-500 transition-transform duration-300 hover:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      };
    }
    if (theme === "dark") {
      return {
        label: t("common.themeDark"),
        title: t("common.themeDarkDesc"),
        icon: (
          <svg className="w-4 h-4 text-indigo-400 transition-transform duration-300 hover:-rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ),
      };
    }
    return {
      label: t("common.themeSystem"),
      title: t("common.themeSystemDesc"),
      icon: (
        <svg className="w-4 h-4 text-slate-600 dark:text-slate-300 transition-transform duration-300 hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    };
  };

  const info = getThemeInfo();

  return (
    <button
      onClick={cycleTheme}
      className="h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 text-xs font-semibold"
      title={info.title}
      aria-label="Cycle Theme"
    >
      {info.icon}
      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 select-none">
        {info.label}
      </span>
    </button>
  );
}
