"use client";

import { useSyncExternalStore } from "react";
import { useTranslation } from "@/lib/i18n/TranslationProvider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu";

const emptySubscribe = () => () => {};

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800/40 animate-pulse" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 text-xs font-semibold focus:outline-none"
        aria-label="Select Language"
      >
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
        </svg>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
          {locale === "vi" ? "VN" : "EN"}
        </span>
        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => setLocale("en")}
          className={locale === "en" ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-500/10" : ""}
        >
          <span>English (US)</span>
          {locale === "en" && (
            <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setLocale("vi")}
          className={locale === "vi" ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-500/10" : ""}
        >
          <span>Tiếng Việt (VN)</span>
          {locale === "vi" && (
            <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
