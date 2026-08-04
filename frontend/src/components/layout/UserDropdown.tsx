"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAvatarDataUri } from "@/lib/avatar";

import {
  BookOpen,
  CircleDollarSign,
  GraduationCap,
  Layers,
  Edit,
  Settings,
  LayoutDashboard,
  CheckCircle2,
  Building2,
  Globe,
  ExternalLink,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/DropdownMenu";

const itemClasses =
  "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/70 font-medium justify-start gap-3 w-full rounded-xl px-3.5 py-2.5 my-0.5 transition-all cursor-pointer";
const iconClasses = "w-4.5 h-4.5 text-on-surface-variant";

export function UserDropdown() {
  const {
    userName,
    userEmail,
    userRole,
    isInstructorOrAdmin,
    isSuperAdmin,
    logout: handleLogout,
  } = useAuth();

  const avatarSrc = useMemo(() => getAvatarDataUri(userEmail || "user"), [userEmail]);

  const displayUserName = useMemo(() => {
    if (!userName) return "";
    return userName.replace(/\s*\([^)]*\)/g, "").trim();
  }, [userName]);

  const roleLabel = useMemo(() => {
    if (isSuperAdmin) return "Quản trị viên hệ thống";
    const r = String(userRole || "").toUpperCase();
    if (r === "2" || r.includes("INSTRUCTOR")) return "Giảng viên";
    if (r === "TA" || r.includes("TA")) return "Trợ giảng";
    return "Học viên";
  }, [userRole, isSuperAdmin]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all cursor-pointer group p-0.5 border border-outline-variant hover:border-primary shrink-0"
        aria-label={displayUserName || "Tài khoản người dùng"}
      >
        <Image
          src={avatarSrc}
          alt={displayUserName || "Tài khoản người dùng"}
          width={36}
          height={36}
          unoptimized
          className="w-9 h-9 rounded-full bg-primary-container object-cover pointer-events-none"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        sideOffset={14}
        align="end"
        className="w-64 p-1.5 rounded-2xl bg-card border border-outline-variant shadow-xl"
      >
        {/* User Info Header with Avatar and Stacked Role Badge */}
        <div className="flex items-center gap-3.5 px-3.5 py-3 border-b border-outline-variant mb-1.5">
          <Image
            src={avatarSrc}
            alt={displayUserName}
            width={48}
            height={48}
            unoptimized
            className="w-11 h-11 rounded-full bg-primary-container object-cover ring-2 ring-primary/20 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-bold text-on-surface truncate leading-snug">
              {displayUserName}
            </p>
            <p className="text-xs text-on-surface-variant truncate">{userEmail}</p>
            <div>
              <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container border border-primary/20 uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <DropdownMenuItem render={<Link href="/my-learning" />} className={itemClasses}>
          <BookOpen className={iconClasses} />
          <span>{"Việc học của tôi"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem render={<Link href="/account-settings" />} className={itemClasses}>
          <Settings className={iconClasses} />
          <span>{"Cài đặt"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem render={<Link href="/financial-aid" />} className={itemClasses}>
          <CircleDollarSign className={iconClasses} />
          <span>{"Đơn Hỗ trợ tài chính"}</span>
        </DropdownMenuItem>

        {!isInstructorOrAdmin && (
          <DropdownMenuItem render={<Link href="/become-an-instructor" />} className={itemClasses}>
            <GraduationCap className={iconClasses} />
            <span className="font-semibold">{"Đăng ký làm Giảng viên"}</span>
          </DropdownMenuItem>
        )}

        {isInstructorOrAdmin && (
          <>
            <DropdownMenuItem render={<Link href="/instructor/courses" />} className={itemClasses}>
              <Layers className={iconClasses} />
              <span>{"Giảng Viên"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/instructor/profile" />} className={itemClasses}>
              <Edit className={iconClasses} />
              <span>{"Hồ sơ & Chữ ký Giảng viên"}</span>
            </DropdownMenuItem>
          </>
        )}

        {isSuperAdmin && (
          <DropdownMenuItem render={<Link href="/partner/settings" />} className={itemClasses}>
            <Settings className={iconClasses} />
            <span>{"Cấu hình Đối tác"}</span>
          </DropdownMenuItem>
        )}

        {isSuperAdmin && (
          <>
            <DropdownMenuItem render={<Link href="/admin/dashboard" />} className={itemClasses}>
              <LayoutDashboard className={iconClasses} />
              <span>{"Trang quản trị"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/admin/applications" />} className={itemClasses}>
              <CheckCircle2 className={iconClasses} />
              <span>{"Duyệt đơn Giảng viên"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/admin/partners" />} className={itemClasses}>
              <Building2 className={iconClasses} />
              <span>{"Quản trị Đối tác"}</span>
            </DropdownMenuItem>
          </>
        )}

        <div className="border-t border-outline-variant my-1.5" />

        <DropdownMenuItem
          render={<Link href="/partners/stanford-online" />}
          className={itemClasses}
        >
          <Globe className={iconClasses} />
          <span>{"Giới thiệu Đối tác"}</span>
        </DropdownMenuItem>

        <div className="border-t border-outline-variant my-1.5" />

        <DropdownMenuItem render={<Link href="/landing" />} className={itemClasses}>
          <ExternalLink className={iconClasses} />
          <span>{"Xem trang công khai"}</span>
        </DropdownMenuItem>

        <div className="border-t border-outline-variant my-1.5" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-error hover:bg-error-container/40 cursor-pointer px-3.5 py-2.5 text-sm font-medium justify-start gap-3 w-full rounded-xl my-0.5 transition-all"
        >
          <LogOut className="w-4.5 h-4.5 text-error" />
          <span>{"Thoát"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
