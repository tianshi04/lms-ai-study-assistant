"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { UserDropdown } from "@/components/layout/UserDropdown";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { NotificationBell } from "@/components/notification/NotificationBell";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { NavigationMenu } from "@/components/ui/NavigationMenu";
import { GoogleOneTapPrompt } from "@/components/auth/GoogleOneTapPrompt";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { userName, isInstructorOrAdmin, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const getLinkClasses = (path: string) => {
    const active = isActive(path);
    return cn(
      "relative px-4 py-2 rounded-full transition-colors font-medium",
      active
        ? "text-on-secondary-container font-bold bg-secondary-container shadow-xs"
        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60",
    );
  };

  const getMobileLinkClasses = (path: string) => {
    const active = isActive(path);
    return cn(
      "block px-4 py-2.5 rounded-full text-sm font-medium transition-colors",
      active
        ? "font-bold text-on-secondary-container bg-secondary-container"
        : "text-on-surface-variant hover:bg-surface-container-high/60",
    );
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-sticky transition-colors duration-m3-medium-2 ease-m3-emphasized",
        isScrolled
          ? "bg-surface-container/90 backdrop-blur-md border-b border-outline-variant shadow-xs"
          : "bg-surface border-b border-transparent shadow-none",
      )}
    >
      <GoogleOneTapPrompt />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Section: Brand Logo & Navigation Links */}
        <div className="flex items-center gap-6">
          <BrandLogo size="md" />

          {/* Navigation Links (Desktop) */}
          <NavigationMenu.Root className="hidden md:flex items-center">
            <NavigationMenu.List className="gap-2">
              <NavigationMenu.Item>
                <Link href="/courses" className={getLinkClasses("/courses")}>
                  {"Khóa học"}
                </Link>
              </NavigationMenu.Item>
              {userName && (
                <NavigationMenu.Item>
                  <Link href="/my-learning" className={getLinkClasses("/my-learning")}>
                    {"Việc học của tôi"}
                  </Link>
                </NavigationMenu.Item>
              )}

              {/* Render Instructor Portal for authorized roles */}
              {isInstructorOrAdmin && (
                <NavigationMenu.Item>
                  <Link
                    href="/instructor/courses"
                    className={`${getLinkClasses("/instructor/courses")} flex items-center gap-1.5`}
                  >
                    <span>{"Giảng Viên"}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      Portal
                    </span>
                  </Link>
                </NavigationMenu.Item>
              )}

              {/* Render Admin Enterprise Dashboard Link */}
              {isSuperAdmin && (
                <NavigationMenu.Item>
                  <Link
                    href="/admin/dashboard"
                    className={`${getLinkClasses("/admin/dashboard")} flex items-center gap-1.5`}
                  >
                    <span>Admin</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      Enterprise
                    </span>
                  </Link>
                </NavigationMenu.Item>
              )}
            </NavigationMenu.List>
          </NavigationMenu.Root>
        </div>

        {/* User Auth & Actions Section */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {userName ? (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <UserDropdown />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="filled"
                size="sm"
                render={<Link href="/auth/login" />}
                className="rounded-xl text-xs font-semibold shadow-md shadow-primary/20 px-4 py-2"
              >
                {"Đăng nhập"}
              </Button>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <IconButton
            type="button"
            variant="standard"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-xl text-muted-foreground hover:bg-muted"
            aria-label="Bật/tắt menu điều hướng"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </IconButton>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-lg px-4 py-4 space-y-1.5 animate-fade-in">
          <Link
            href="/courses"
            onClick={() => setMobileMenuOpen(false)}
            className={getMobileLinkClasses("/courses")}
          >
            {"Khóa học"}
          </Link>
          {userName && (
            <Link
              href="/my-learning"
              onClick={() => setMobileMenuOpen(false)}
              className={getMobileLinkClasses("/my-learning")}
            >
              {"Việc học của tôi"}
            </Link>
          )}
          {isInstructorOrAdmin && (
            <Link
              href="/instructor/courses"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                getMobileLinkClasses("/instructor/courses"),
                "flex items-center justify-between",
              )}
            >
              <span>{"Giảng Viên"}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Portal
              </span>
            </Link>
          )}
          {isSuperAdmin && (
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                getMobileLinkClasses("/admin/dashboard"),
                "flex items-center justify-between",
              )}
            >
              <span>Admin</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Enterprise
              </span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
