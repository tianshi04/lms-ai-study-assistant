"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme) {
      document.cookie = `theme=${resolvedTheme}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [resolvedTheme]);

  const toggleTheme = () => {
    const isDarkNow =
      typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const nextTheme = isDarkNow ? "light" : "dark";
    setTheme(nextTheme);
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative inline-flex items-center h-8 w-14 rounded-full p-1 transition-colors duration-300 ease-in-out cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-ring shrink-0 shadow-inner bg-muted border border-border hover:bg-muted/80"
      aria-label="Chuyển đổi giao diện sáng/tối"
    >
      {/* Background Track Icons */}
      <span className="absolute left-1.5 flex items-center justify-center pointer-events-none">
        <Sun className="w-3.5 h-3.5 transition-opacity duration-200 opacity-0 dark:opacity-100 text-warning/50" />
      </span>

      <span className="absolute right-1.5 flex items-center justify-center pointer-events-none">
        <Moon className="w-3.5 h-3.5 transition-opacity duration-200 opacity-100 dark:opacity-0 text-primary/50" />
      </span>

      {/* Sliding Knob Thumb */}
      <span className="pointer-events-none relative inline-flex items-center justify-center w-6 h-6 rounded-full transform transition-transform duration-300 ease-in-out shadow-md translate-x-0 dark:translate-x-6 bg-card text-foreground border border-border">
        <Sun className="w-3.5 h-3.5 text-warning block dark:hidden" />
        <Moon className="w-3.5 h-3.5 text-primary hidden dark:block" />
      </span>
    </button>
  );
}
