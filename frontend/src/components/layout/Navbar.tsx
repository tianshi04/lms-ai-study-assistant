"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { UserDropdown } from "@/components/layout/UserDropdown";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

export function Navbar() {
  const { userName, userRole } = useAuth();

  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if role is INSTRUCTOR (2) or SUPER_ADMIN (4)
  const isInstructorOrAdmin =
    userRole === "2" ||
    userRole === "4" ||
    userRole === "USER_ROLE_INSTRUCTOR" ||
    userRole === "USER_ROLE_SUPER_ADMIN";

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname?.startsWith(path);
  };

  const getLinkClasses = (path: string) => {
    const active = isActive(path);
    return active
      ? "relative text-blue-600 dark:text-blue-400 font-bold px-1 pb-0.5 border-b-2 border-blue-600 dark:border-blue-400 transition-all"
      : "relative text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-1 pb-0.5 border-b-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-all";
  };

  const getMobileLinkClasses = (path: string) => {
    const active = isActive(path);
    return active
      ? "block px-3.5 py-2.5 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400 border-l-2 border-blue-500 dark:border-blue-400 bg-blue-50/60 dark:bg-blue-500/10 pl-4"
      : "block px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 border-l-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 pl-4";
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            C
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Coursera AI
            </span>
            <span className="text-xs block text-slate-500 dark:text-slate-400 font-medium">
              LMS Platform
            </span>
          </div>
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-semibold">
          <Link href="/courses" className={getLinkClasses("/courses")}>
            {"Khóa học"}
          </Link>
          {userName && (
            <Link href="/my-courses" className={getLinkClasses("/my-courses")}>
              Khóa học của tôi
            </Link>
          )}
          <Link href="/partners/stanford-online" className={getLinkClasses("/partners")}>
            {"Đối tác"}
          </Link>
          <Link href="/forum" className={getLinkClasses("/forum")}>
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
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
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
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                Enterprise
              </span>
            </Link>
          )}

          <Link href="/verify" className={getLinkClasses("/verify")}>
            {"Xác minh chứng chỉ"}
          </Link>
        </nav>
        
        <div className="hidden lg:flex flex-1 max-w-md mx-4">
          <GlobalSearch />
        </div>

        {/* User Auth & Actions Section */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {userName ? (
            <UserDropdown />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="text-xs font-semibold px-3.5 py-2 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 transition-colors"
              >
                {"Đăng nhập"}
              </Link>
              <Link
                href="/auth/register"
                className="text-xs font-semibold px-3.5 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all"
              >
                {"Đăng ký"}
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg px-4 py-4 space-y-1.5 animate-fade-in">
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
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
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
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
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
