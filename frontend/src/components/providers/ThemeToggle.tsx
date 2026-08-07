"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={toggleTheme}
      className="rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 shrink-0"
      aria-label="Chuyển đổi giao diện sáng/tối"
      title={isDark ? "Chuyển sang Chế độ Sáng" : "Chuyển sang Chế độ Tối"}
    >
      {isDark ? (
        <Moon className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Sun className="w-5 h-5" aria-hidden="true" />
      )}
    </Button>
  );
}
