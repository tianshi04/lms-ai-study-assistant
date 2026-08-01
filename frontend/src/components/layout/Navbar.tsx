"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { UserDropdown } from "@/components/layout/UserDropdown";
import { ThemeToggle } from "@/components/providers/ThemeToggle";

export function Navbar() {
  const { userName, userRole, isInstructorOrAdmin } = useAuth();

  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname?.startsWith(path);
  };

  const getLinkClasses = (path: string) => {
    const active = isActive(path);
    return active
      ? "relative text-primary font-bold px-1 pb-0.5 border-b-2 border-primary transition-all"
      : "relative text-muted-foreground hover:text-foreground px-1 pb-0.5 border-b-2 border-transparent hover:border-border transition-all";
  };

  const getMobileLinkClasses = (path: string) => {
    const active = isActive(path);
    return active
      ? "block px-3.5 py-2.5 rounded-xl text-sm font-bold text-primary border-l-2 border-primary bg-primary/10 pl-4"
      : "block px-3.5 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground border-l-2 border-transparent hover:bg-muted pl-4";
  };

  return (
    <header
      style={{ viewTransitionName: "site-navbar" }}
      className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 transition-colors"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" prefetch={true} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
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
            <Link href="/my-courses" prefetch={true} className={getLinkClasses("/my-courses")}>
              Khóa học của tôi
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
          {(userRole === "4" || userRole === "5" || isInstructorOrAdmin) && (
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
            <UserDropdown />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="text-xs font-semibold px-3.5 py-2 rounded-xl text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                {"Đăng nhập"}
              </Link>
              <Link
                href="/auth/register"
                className="text-xs font-semibold px-3.5 py-2 rounded-xl text-primary-foreground bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 transition-all"
              >
                {"Đăng ký"}
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
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
              href="/my-courses"
              onClick={() => setMobileMenuOpen(false)}
              className={getMobileLinkClasses("/my-courses")}
            >
              Khóa học của tôi
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
          {(userRole === "4" || userRole === "5" || isInstructorOrAdmin) && (
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
