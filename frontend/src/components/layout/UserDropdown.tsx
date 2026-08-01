"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAvatarDataUri } from "@/lib/avatar";

import {
  Home,
  User,
  BookOpen,
  Award,
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
          <Home className={`w-4.5 h-4.5 ${getIconClasses("/")}`} />
          <span>{"Bảng điều khiển chính"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={<Link href="/auth/profile" />}
          className={getItemClasses("/auth/profile")}
        >
          <User className={`w-4.5 h-4.5 ${getIconClasses("/auth/profile")}`} />
          <span>{"Trang cá nhân"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={<Link href="/my-courses" />}
          className={getItemClasses("/my-courses")}
        >
          <BookOpen className={`w-4.5 h-4.5 ${getIconClasses("/my-courses")}`} />
          <span>{"Khóa học của tôi"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={<Link href="/certificates" />}
          className={getItemClasses("/certificates")}
        >
          <Award className={`w-4.5 h-4.5 ${getIconClasses("/certificates", "text-primary")}`} />
          <span>{"Chứng chỉ của tôi"}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          render={<Link href="/financial-aid" />}
          className={getItemClasses("/financial-aid")}
        >
          <CircleDollarSign
            className={`w-4.5 h-4.5 ${getIconClasses("/financial-aid", "text-success")}`}
          />
          <span>{"Đơn Hỗ trợ tài chính"}</span>
        </DropdownMenuItem>

        {!isInstructorOrAdmin && (
          <DropdownMenuItem
            render={<Link href="/become-an-instructor" />}
            className={getItemClasses("/become-an-instructor")}
          >
            <GraduationCap
              className={`w-4.5 h-4.5 ${getIconClasses("/become-an-instructor", "text-primary")}`}
            />
            <span className="font-semibold">{"Đăng ký làm Giảng viên"}</span>
          </DropdownMenuItem>
        )}

        {isInstructorOrAdmin && (
          <>
            <DropdownMenuItem
              render={<Link href="/instructor/courses" />}
              className={getItemClasses("/instructor/courses")}
            >
              <Layers
                className={`w-4.5 h-4.5 ${getIconClasses("/instructor/courses", "text-primary")}`}
              />
              <span>{"Giảng Viên"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/instructor/profile" />}
              className={getItemClasses("/instructor/profile")}
            >
              <Edit
                className={`w-4.5 h-4.5 ${getIconClasses("/instructor/profile", "text-primary")}`}
              />
              <span>{"Hồ sơ & Chữ ký Giảng viên"}</span>
            </DropdownMenuItem>
          </>
        )}

        {(userRole === "5" || userRole === "4") && (
          <DropdownMenuItem
            render={<Link href="/partner/settings" />}
            className={getItemClasses("/partner/settings")}
          >
            <Settings
              className={`w-4.5 h-4.5 ${getIconClasses("/partner/settings", "text-warning")}`}
            />
            <span>{"Cấu hình Đối tác"}</span>
          </DropdownMenuItem>
        )}

        {isAdmin && (
          <>
            <DropdownMenuItem
              render={<Link href="/admin/dashboard" />}
              className={getItemClasses("/admin/dashboard")}
            >
              <LayoutDashboard
                className={`w-4.5 h-4.5 ${getIconClasses("/admin/dashboard", "text-primary")}`}
              />
              <span>{"Trang quản trị"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/admin/applications" />}
              className={getItemClasses("/admin/applications")}
            >
              <CheckCircle2
                className={`w-4.5 h-4.5 ${getIconClasses("/admin/applications", "text-success")}`}
              />
              <span>{"Duyệt đơn Giảng viên"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/admin/partners" />}
              className={getItemClasses("/admin/partners")}
            >
              <Building2
                className={`w-4.5 h-4.5 ${getIconClasses("/admin/partners", "text-primary")}`}
              />
              <span>{"Quản trị Đối tác"}</span>
            </DropdownMenuItem>
          </>
        )}

        <div className="border-t border-border my-1" />

        <DropdownMenuItem
          render={<Link href="/partners/stanford-online" />}
          className={getItemClasses("/partners/stanford-online")}
        >
          <Globe
            className={`w-4.5 h-4.5 ${getIconClasses("/partners/stanford-online", "text-success")}`}
          />
          <span>{"Giới thiệu Đối tác"}</span>
        </DropdownMenuItem>

        <div className="border-t border-border my-1" />

        <DropdownMenuItem render={<Link href="/landing" />} className={getItemClasses("/landing")}>
          <ExternalLink
            className={`w-4.5 h-4.5 ${getIconClasses("/landing", "text-muted-foreground")}`}
          />
          <span>{"Xem trang công khai"}</span>
        </DropdownMenuItem>

        <div className="border-t border-border my-1" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive hover:bg-destructive/10 cursor-pointer px-3.5 py-2.5 text-sm font-medium justify-start gap-3 w-full"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>{"Thoát"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
