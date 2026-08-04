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
    if (path === "/") return pathname === "/";
    return pathname?.startsWith(path);
  };

  const getLinkClasses = (path: string) => {
    const active = isActive(path);
    return active
      ? "relative text-on-secondary-container font-bold px-4 py-2 rounded-full bg-secondary-container transition-all shadow-xs"
      : "relative text-on-surface-variant hover:text-on-surface px-4 py-2 rounded-full hover:bg-surface-container-high/60 transition-all font-medium";
  };

  const getMobileLinkClasses = (path: string) => {
    const active = isActive(path);
    return active
      ? "block px-4 py-2.5 rounded-full text-sm font-bold text-on-secondary-container bg-secondary-container transition-all"
      : "block px-4 py-2.5 rounded-full text-sm font-medium text-on-surface-variant hover:bg-surface-container-high/60 transition-all";
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-surface-container/90 backdrop-blur-md border-b border-outline-variant shadow-xs"
          : "bg-surface border-b border-transparent shadow-none"
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" prefetch={true} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20">
            C
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-foreground">Coursera AI</span>
            <span className="text-xs block text-muted-foreground font-medium">LMS Platform</span>
          </div>
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-semibold">
          <Link href="/courses" prefetch={true} className={getLinkClasses("/courses")}>
            {"Khóa học"}
          </Link>
          {userName && (
            <Link href="/my-learning" prefetch={true} className={getLinkClasses("/my-learning")}>
              {"Việc học của tôi"}
            </Link>
          )}
          <Link
            href="/partners/stanford-online"
            prefetch={true}
            className={getLinkClasses("/partners")}
          >
            {"Đối tác"}
          </Link>
          <Link href="/forum" prefetch={true} className={getLinkClasses("/forum")}>
            {"Diễn đàn"}
          </Link>

          {/* Render Become Instructor link for learners */}
          {!isInstructorOrAdmin && (
            <Link href="/become-an-instructor" className={getLinkClasses("/become-an-instructor")}>
              {"Trở thành Giảng viên"}
            </Link>
          )}

          {/* Render Instructor Portal for authorized roles */}
          {isInstructorOrAdmin && (
            <Link
              href="/instructor/courses"
              className={`${getLinkClasses("/instructor")} flex items-center gap-1.5`}
            >
              <span>{"Giảng Viên"}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Portal
              </span>
            </Link>
          )}

          {/* Render Admin Enterprise Dashboard Link */}
          {isSuperAdmin && (
            <Link
              href="/admin/dashboard"
              className={`${getLinkClasses("/admin")} flex items-center gap-1.5`}
            >
              <span>Admin</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Enterprise
              </span>
            </Link>
          )}

          <Link href="/verify" className={getLinkClasses("/verify")}>
            {"Xác minh chứng chỉ"}
          </Link>
        </nav>

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
                variant="outline"
                size="sm"
                asChild
                className="rounded-xl text-xs font-semibold bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
              >
                <Link href="/auth/login">{"Đăng nhập"}</Link>
              </Button>
              <Button
                variant="primary"
                size="sm"
                asChild
                className="rounded-xl text-xs font-semibold shadow-md shadow-primary/20"
              >
                <Link href="/auth/register">{"Đăng ký"}</Link>
              </Button>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-xl text-muted-foreground hover:bg-muted"
            aria-label="Bật/tắt menu điều hướng"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </Button>
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
          {!isInstructorOrAdmin && (
            <Link
              href="/become-an-instructor"
              onClick={() => setMobileMenuOpen(false)}
              className={getMobileLinkClasses("/become-an-instructor")}
            >
              {"Trở thành Giảng viên"}
            </Link>
          )}
          <Link
            href="/partners/stanford-online"
            onClick={() => setMobileMenuOpen(false)}
            className={getMobileLinkClasses("/partners")}
          >
            {"Đối tác phát hành"}
          </Link>
          <Link
            href="/forum"
            onClick={() => setMobileMenuOpen(false)}
            className={getMobileLinkClasses("/forum")}
          >
            {"Diễn đàn"}
          </Link>
          {isInstructorOrAdmin && (
            <Link
              href="/instructor/courses"
              onClick={() => setMobileMenuOpen(false)}
              className={`${getMobileLinkClasses("/instructor")} flex items-center justify-between`}
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
              className={`${getMobileLinkClasses("/admin")} flex items-center justify-between`}
            >
              <span>Admin</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Enterprise
              </span>
            </Link>
          )}
          <Link
            href="/verify"
            onClick={() => setMobileMenuOpen(false)}
            className={getMobileLinkClasses("/verify")}
          >
            {"Xác minh chứng chỉ"}
          </Link>
        </div>
      )}
    </header>
  );
}
