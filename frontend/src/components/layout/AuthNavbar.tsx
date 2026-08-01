"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { LanguageToggle } from "@/components/providers/LanguageToggle";

export function AuthNavbar() {
  return (
    <header
      style={{ viewTransitionName: "site-navbar" }}
      className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" prefetch={true} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            C
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-foreground">Coursera AI</span>
            <span className="text-xs block text-muted-foreground font-medium">LMS Platform</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
