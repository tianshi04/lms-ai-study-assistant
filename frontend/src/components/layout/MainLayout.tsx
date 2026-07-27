"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { AuthNavbar } from "@/components/layout/AuthNavbar";
import { AIChatbot } from "@/components/ai/AIChatbot";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Check if current route is the standalone Course Player page or Auth page
  const isPlayerPage = pathname?.startsWith("/learn/");
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/register";

  if (isPlayerPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {isAuthPage ? <AuthNavbar /> : <Navbar />}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      <AIChatbot />
    </div>
  );
}
