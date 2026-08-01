"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAvatarDataUri } from "@/lib/avatar";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu";

export function UserDropdown() {
  const { userName, userEmail, userRole, logout: handleLogout } = useAuth();
  const pathname = usePathname();

  const avatarSrc = useMemo(() => getAvatarDataUri(userEmail || "user"), [userEmail]);

  const displayUserName = useMemo(() => {
    if (!userName) return "";
    return userName.replace(/\s*\([^)]*\)/g, "").trim();
  }, [userName]);

  const isInstructorOrAdmin = userRole === "2" || userRole === "4";
  const isAdmin = userRole === "4";
  const roleLabel = useMemo(() => {
    switch (userRole) {
      case "2":
        return "Giảng viên";
      case "3":
        return "Trợ giảng";
      case "4":
        return "Quản trị viên hệ thống";
      default:
        return "Học viên";
    }
  }, [userRole]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname?.startsWith(path);
  };

  const getItemClasses = (path: string, customActiveClasses?: string) => {
    const active = isActive(path);
    if (active) {
      return (
        customActiveClasses || "bg-primary/10 text-primary font-bold justify-start gap-3 w-full"
      );
    }
    return "text-foreground font-medium hover:bg-muted/70 justify-start gap-3 w-full";
  };

  const getIconClasses = (path: string, defaultColorClass = "text-muted-foreground") => {
    return isActive(path) ? "text-primary" : defaultColorClass;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all cursor-pointer group p-0.5 border border-border hover:border-primary shrink-0"
        aria-label={displayUserName}
      >
        <Image
          src={avatarSrc}
          alt={displayUserName}
          width={36}
          height={36}
          unoptimized
          className="w-9 h-9 rounded-full bg-primary/10 object-cover group-hover:scale-105 transition-transform"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 p-2 rounded-2xl shadow-2xl bg-card border border-border">
        {/* User Info Header with Avatar and Stacked Role Badge */}
        <div className="flex items-center gap-3 px-3.5 py-3.5 border-b border-border mb-1 bg-muted/50 rounded-t-xl">
          <Image
            src={avatarSrc}
            alt={displayUserName}
            width={48}
            height={48}
            unoptimized
            className="w-12 h-12 rounded-full bg-primary/10 object-cover ring-2 ring-primary/30 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-bold text-foreground truncate">{displayUserName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            <div>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <DropdownMenuItem render={<Link href="/" />} className={getItemClasses("/")}>
          <svg
            className={`w-4.5 h-4.5 ${getIconClasses("/")}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span>{"Bảng điều khiển chính"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={<Link href="/auth/profile" />}
          className={getItemClasses("/auth/profile")}
        >
          <svg
            className={`w-4.5 h-4.5 ${getIconClasses("/auth/profile")}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span>{"Trang cá nhân"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={<Link href="/my-courses" />}
          className={getItemClasses("/my-courses")}
        >
          <svg
            className={`w-4.5 h-4.5 ${getIconClasses("/my-courses")}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span>{"Khóa học của tôi"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={<Link href="/certificates" />}
          className={getItemClasses("/certificates")}
        >
          <svg
            className={`w-4.5 h-4.5 ${getIconClasses("/certificates", "text-primary")}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          <span>{"Chứng chỉ của tôi"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={<Link href="/financial-aid" />}
          className={getItemClasses("/financial-aid")}
        >
          <svg
            className={`w-4.5 h-4.5 ${getIconClasses("/financial-aid", "text-success")}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{"Đơn Hỗ trợ tài chính"}</span>
        </DropdownMenuItem>

        {!isInstructorOrAdmin && (
          <DropdownMenuItem
            render={<Link href="/become-an-instructor" />}
            className={getItemClasses("/become-an-instructor")}
          >
            <svg
              className={`w-4.5 h-4.5 ${getIconClasses("/become-an-instructor", "text-primary")}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
              />
            </svg>
            <span className="font-semibold">{"Đăng ký làm Giảng viên"}</span>
          </DropdownMenuItem>
        )}

        {isInstructorOrAdmin && (
          <>
            <DropdownMenuItem
              render={<Link href="/instructor/courses" />}
              className={getItemClasses("/instructor/courses")}
            >
              <svg
                className={`w-4.5 h-4.5 ${getIconClasses("/instructor/courses", "text-primary")}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span>{"Giảng Viên"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/instructor/profile" />}
              className={getItemClasses("/instructor/profile")}
            >
              <svg
                className={`w-4.5 h-4.5 ${getIconClasses("/instructor/profile", "text-primary")}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span>{"Hồ sơ & Chữ ký Giảng viên"}</span>
            </DropdownMenuItem>
          </>
        )}

        {(userRole === "5" || userRole === "4") && (
          <DropdownMenuItem
            render={<Link href="/partner/settings" />}
            className={getItemClasses("/partner/settings")}
          >
            <svg
              className={`w-4.5 h-4.5 ${getIconClasses("/partner/settings", "text-warning")}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{"Cấu hình Đối tác"}</span>
          </DropdownMenuItem>
        )}

        {isAdmin && (
          <>
            <DropdownMenuItem
              render={<Link href="/admin/dashboard" />}
              className={getItemClasses("/admin/dashboard")}
            >
              <svg
                className={`w-4.5 h-4.5 ${getIconClasses("/admin/dashboard", "text-primary")}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>{"Trang quản trị"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/admin/applications" />}
              className={getItemClasses("/admin/applications")}
            >
              <svg
                className={`w-4.5 h-4.5 ${getIconClasses("/admin/applications", "text-success")}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{"Duyệt đơn Giảng viên"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/admin/partners" />}
              className={getItemClasses("/admin/partners")}
            >
              <svg
                className={`w-4.5 h-4.5 ${getIconClasses("/admin/partners", "text-primary")}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span>{"Quản trị Đối tác"}</span>
            </DropdownMenuItem>
          </>
        )}

        <div className="border-t border-border my-1" />

        <DropdownMenuItem
          render={<Link href="/partners/stanford-online" />}
          className={getItemClasses("/partners/stanford-online")}
        >
          <svg
            className={`w-4.5 h-4.5 ${getIconClasses("/partners/stanford-online", "text-success")}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.6 9h16.8M3.6 15h16.8"
            />
          </svg>
          <span>{"Giới thiệu Đối tác"}</span>
        </DropdownMenuItem>

        <div className="border-t border-border my-1" />

        <DropdownMenuItem render={<Link href="/landing" />} className={getItemClasses("/landing")}>
          <svg
            className={`w-4.5 h-4.5 ${getIconClasses("/landing", "text-muted-foreground")}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{"Xem trang công khai"}</span>
        </DropdownMenuItem>

        <div className="border-t border-border my-1" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive hover:bg-destructive/10 cursor-pointer px-3.5 py-2.5 text-sm font-medium justify-start gap-3 w-full"
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>{"Thoát"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
