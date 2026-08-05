"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const AIChatbot = dynamic(() => import("@/components/ai/AIChatbot").then((mod) => mod.AIChatbot), {
  ssr: false,
});

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Check if current route is the standalone Course Player page or Auth page
  const isPlayerPage = pathname?.startsWith("/learn/");
  const isAuthPage = pathname === "/auth/login" || pathname === "/auth/register";

  if (isPlayerPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground selection:bg-primary selection:text-primary-foreground transition-colors duration-m3-short-4 ease-m3-emphasized">
      {!isAuthPage && <Navbar />}
      <main className="flex-1 flex flex-col min-h-screen">{children}</main>
      {!isAuthPage && <Footer />}
      {!isAuthPage && <AIChatbot />}
    </div>
  );
}
