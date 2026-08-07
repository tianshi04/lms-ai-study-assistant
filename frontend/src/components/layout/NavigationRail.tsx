"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, GraduationCap, Award, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavRailItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

const defaultNavItems: NavRailItem[] = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/catalog", label: "Khám phá", icon: Compass },
  { href: "/my-learning", label: "Việc học của tôi", icon: BookOpen },
  { href: "/assessments", label: "Bài kiểm tra", icon: GraduationCap },
  { href: "/my-learning?tab=certificates", label: "Chứng chỉ", icon: Award },
];

export interface NavigationRailProps {
  items?: NavRailItem[];
  className?: string;
}

export function NavigationRail({ items = defaultNavItems, className }: NavigationRailProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Thanh điều hướng chính"
      className={cn(
        "hidden xl:flex flex-col items-center w-20 py-4 bg-surface-container-low border-r border-border sticky top-16 h-[calc(100vh-4rem)] z-sticky gap-6",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const cleanHref = item.href.split("?")[0];
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(cleanHref));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full py-2.5 px-1 rounded-2xl transition-colors duration-m3-short-4 ease-m3-emphasized group text-center gap-1",
                isActive
                  ? "bg-primary-container text-on-primary-container font-semibold"
                  : "text-muted-foreground hover:bg-surface-container-highest hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-7 rounded-full transition-colors duration-m3-short-4 ease-m3-emphasized",
                  isActive ? "bg-primary text-primary-foreground" : "group-hover:bg-primary/10",
                )}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-[11px] leading-tight font-medium tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
