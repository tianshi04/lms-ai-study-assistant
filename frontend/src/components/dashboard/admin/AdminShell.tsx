"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CircleDollarSign,
  Clock,
  KeyRound,
  List,
  Megaphone,
  ShieldAlert,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import {
  formatCornerBadgeCount,
  useAdminWorkspaceBadgeCounts,
} from "@/lib/queries/useAdminNavCounts";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

interface WorkspaceNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
  badgeVariant?: "error" | "warning";
  badgeAriaLabel?: string;
}

function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/admin/courses") return false;
  return pathname.startsWith(`${href}/`);
}

function AdminWorkspaceNav({ pathname }: { pathname: string }) {
  const {
    pendingInstructorApplications,
    pendingReviewCourses,
    pendingFinancialAids,
    lowReviewTotal,
    assessmentAlertsTotal,
    activeAnnouncementsTotal,
  } = useAdminWorkspaceBadgeCounts();

  const moderationBadgeCount = lowReviewTotal > 0 ? lowReviewTotal : assessmentAlertsTotal;
  const moderationBadgeVariant: "error" | "warning" = lowReviewTotal > 0 ? "error" : "warning";
  const moderationAriaLabel =
    lowReviewTotal > 0
      ? `${lowReviewTotal} đánh giá thấp cần xem xét`
      : `${assessmentAlertsTotal} cảnh báo chấm điểm đang theo dõi`;

  const navItems: WorkspaceNavItem[] = [
    {
      href: "/admin/enterprise",
      label: "Suất học Enterprise",
      icon: KeyRound,
    },
    {
      href: "/admin/applications",
      label: "Duyệt Giảng viên",
      icon: UserCheck,
      badgeCount: pendingInstructorApplications,
      badgeVariant: "error",
      badgeAriaLabel: `${pendingInstructorApplications} đơn giảng viên chờ duyệt`,
    },
    {
      href: "/admin/courses/review",
      label: "Duyệt Khóa học",
      icon: Clock,
      badgeCount: pendingReviewCourses,
      badgeVariant: "error",
      badgeAriaLabel: `${pendingReviewCourses} khóa học chờ duyệt`,
    },
    {
      href: "/admin/financial-aid",
      label: "Hỗ trợ Tài chính",
      icon: CircleDollarSign,
      badgeCount: pendingFinancialAids,
      badgeVariant: "error",
      badgeAriaLabel: `${pendingFinancialAids} đơn hỗ trợ tài chính chờ duyệt`,
    },
    {
      href: "/admin/moderation",
      label: "Vi phạm & Chứng chỉ",
      icon: ShieldAlert,
      badgeCount: moderationBadgeCount,
      badgeVariant: moderationBadgeVariant,
      badgeAriaLabel: moderationAriaLabel,
    },
    {
      href: "/admin/courses",
      label: "Chất lượng Khóa học",
      icon: BookOpen,
    },
    {
      href: "/admin/categories",
      label: "Danh mục",
      icon: List,
    },
    {
      href: "/admin/partners",
      label: "Đối tác",
      icon: Building2,
    },
    {
      href: "/admin/announcements",
      label: "Thông báo Hệ thống",
      icon: Megaphone,
      badgeCount: activeAnnouncementsTotal,
      badgeVariant: "warning",
      badgeAriaLabel: `${activeAnnouncementsTotal} thông báo hệ thống đang hiển thị`,
    },
  ];

  return (
    <div className="border-b border-border bg-card/70 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-extrabold text-foreground tracking-tight">
              Bàn làm việc Quản trị
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Admin Portal
            </span>
          </div>

          <Button
            variant="outlined"
            size="sm"
            render={<Link href="/admin/dashboard" />}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dashboard Tổng quan</span>
          </Button>
        </div>

        <nav
          aria-label="Điều hướng bàn làm việc quản trị"
          className="flex flex-wrap items-center gap-1.5 p-1.5 bg-muted/50 border border-border rounded-2xl"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(pathname, item.href);
            const showBadge = (item.badgeCount ?? 0) > 0;
            const isWarningBadge = item.badgeVariant === "warning";

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0",
                  active
                    ? "bg-card text-primary shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/60 border border-transparent",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
                {showBadge && (
                  <Badge
                    variant={isWarningBadge ? "warning" : "error"}
                    size="large"
                    aria-label={item.badgeAriaLabel}
                    className={cn(
                      "absolute -top-1.5 -right-1 shadow-xs ring-2 ring-background font-mono font-bold",
                      isWarningBadge && "bg-warning text-warning-foreground border-0",
                    )}
                  >
                    {formatCornerBadgeCount(item.badgeCount ?? 0)}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { isSuperAdmin } = useAuth();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (isMounted && !isSuperAdmin) {
    return (
      <div className="w-full flex-1 bg-background min-h-screen flex items-center justify-center px-4 py-16">
        <Surface variant="low" shape="2xl" className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-error/10 text-error mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-extrabold text-foreground">Từ chối truy cập</h1>
            <p className="text-sm text-muted-foreground">
              Khu vực này chỉ dành cho tài khoản Quản trị viên hệ thống (Super Admin).
            </p>
          </div>
          <Button variant="filled" size="sm" render={<Link href="/" />} className="rounded-xl">
            Quay về trang chủ
          </Button>
        </Surface>
      </div>
    );
  }

  // Dashboard stands independently outside the workspace chrome.
  if (pathname === "/admin/dashboard") {
    return <>{children}</>;
  }

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      <AdminWorkspaceNav pathname={pathname} />
      {children}
    </div>
  );
}
