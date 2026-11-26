"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  Edit,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Menu } from "@/components/ui/Menu";
import { IdentityService } from "@/gen/identity/v1/identity_pb";
import { getAvatarDataUri } from "@/lib/avatar";
import { getRpcClient } from "@/lib/connect_client";
import { useListUserPurchasesQuery, useMyOrganizationsQuery } from "@/lib/query_hooks";
import { computeSubscriptionStatus } from "@/lib/subscription";

const itemClasses =
  "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/70 font-medium justify-start gap-3 w-full rounded-xl px-3.5 py-2.5 my-0.5 transition-colors cursor-pointer";
const iconClasses = "w-4.5 h-4.5 text-on-surface-variant";

export function UserDropdown() {
  const {
    userId,
    userName,
    userEmail,
    userRole,
    userAvatar,
    setAuth,
    isInstructorOrAdmin,
    isSuperAdmin,
    logout: handleLogout,
  } = useAuth();

  const { data: purchasesData } = useListUserPurchasesQuery({ enabled: !!userId });
  const { data: myOrgs = [] } = useMyOrganizationsQuery({ enabled: !!userId });

  const ownedOrg = useMemo(
    () =>
      myOrgs.find((org) => {
        if (org.id === "partner_community") return false;
        const roleUpper = (org.roleInOrg || "").toUpperCase();
        return roleUpper.includes("OWNER") || roleUpper.includes("ADMIN");
      }),
    [myOrgs],
  );

  const { daysRemaining, isPlusActive, formattedExpDate } = useMemo(() => {
    return computeSubscriptionStatus(purchasesData?.activeSubscription, purchasesData?.orders);
  }, [purchasesData]);

  useEffect(() => {
    if (!userId) return;
    try {
      const client = getRpcClient(IdentityService);
      client
        .getUserProfile({})
        .then((res) => {
          if (!res.user) return;
          const nextRole = String(res.user.role || userRole);
          const nextAvatar = res.user.avatarUrl || userAvatar || "";
          if (nextRole !== String(userRole || "") || (!userAvatar && nextAvatar)) {
            setAuth({
              userId: res.user.id || userId,
              userName: res.user.fullName || userName,
              userEmail: res.user.email || userEmail,
              userRole: nextRole,
              userAvatar: nextAvatar,
            });
          }
        })
        .catch(() => {});
    } catch {
      // Ignore
    }
  }, [userId, userName, userEmail, userRole, userAvatar, setAuth]);

  const avatarSrc = useMemo(
    () => userAvatar || getAvatarDataUri(userEmail || "user"),
    [userAvatar, userEmail],
  );

  const displayUserName = useMemo(() => {
    if (!userName) return "";
    return userName.replace(/\s*\([^)]*\)/g, "").trim();
  }, [userName]);

  const isOrgTA = useMemo(
    () => myOrgs.some((org) => (org.roleInOrg || "").toUpperCase() === "TA"),
    [myOrgs],
  );

  const roleLabel = useMemo(() => {
    if (isSuperAdmin) return "Quản trị viên hệ thống";
    const r = String(userRole || "").toUpperCase();
    if (r === "2" || r.includes("INSTRUCTOR")) return "Giảng viên";
    if (ownedOrg) return "Quản trị viên Tổ chức";
    if (isOrgTA || r === "TA" || r.includes("TA")) return "Trợ giảng";
    return "Học viên";
  }, [userRole, isSuperAdmin, ownedOrg, isOrgTA]);

  return (
    <Menu>
      <Menu.Trigger
        className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer group p-0.5 border border-outline-variant hover:border-primary shrink-0"
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
      </Menu.Trigger>

      <Menu.Content
        sideOffset={14}
        align="end"
        className="w-76 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5rem)] overflow-y-auto p-2 rounded-2xl bg-card border border-outline-variant shadow-xl"
      >
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1.5 border-b border-outline-variant/40">
          <Image
            src={avatarSrc}
            alt={displayUserName}
            width={44}
            height={44}
            unoptimized
            className="w-11 h-11 rounded-full bg-primary-container object-cover ring-2 ring-primary/20 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p
              title={displayUserName}
              className="text-sm font-bold text-on-surface truncate leading-tight"
            >
              {displayUserName}
            </p>
            <p
              title={userEmail ?? undefined}
              className="text-xs text-on-surface-variant truncate leading-tight mt-0.5"
            >
              {userEmail}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              <Badge
                size="sm"
                variant="secondary"
                className="max-w-full truncate px-2.5 py-0.5 text-[11px] font-semibold bg-primary/15 text-primary border border-primary/25"
              >
                {roleLabel}
              </Badge>
              {isPlusActive && (
                <Badge
                  size="sm"
                  variant="secondary"
                  className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5 text-primary shrink-0" aria-hidden="true" />
                  <span>PLUS</span>
                </Badge>
              )}
            </div>
          </div>
        </div>

        {isPlusActive ? (
          <div className="mx-1 my-1.5 p-3 rounded-xl bg-primary-container/20 border border-primary/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" aria-hidden="true" />
                <span>{"LMS AI Plus"}</span>
              </div>
              <Badge size="sm" variant="success" className="font-bold">
                Đang hoạt động
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {"Còn "}
              <strong className="text-foreground font-semibold">{daysRemaining}</strong>
              {" ngày sử dụng (Đến "}
              {formattedExpDate}
              {")"}
            </p>
            <Link
              href="/my-purchases"
              className="mt-0.5 text-center text-xs font-bold text-primary-foreground bg-primary hover:bg-primary-hover px-3 py-1.5 rounded-lg transition-all shadow-2xs"
            >
              {"Gia hạn Plus"}
            </Link>
          </div>
        ) : (
          <div className="mx-1 my-1.5 p-3 rounded-xl bg-surface-container-high border border-outline-variant/40 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>{"Coursera Plus"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {"Học không giới hạn 500+ khóa học & nhận chứng chỉ."}
            </p>
            <Link
              href="/my-purchases"
              className="mt-0.5 text-center text-xs font-bold text-primary-foreground bg-primary hover:bg-primary-hover px-3 py-1.5 rounded-lg transition-all shadow-2xs"
            >
              {"Nâng cấp Plus ngay"}
            </Link>
          </div>
        )}

        <Menu.Item render={<Link href="/my-learning" />} className={itemClasses}>
          <BookOpen aria-hidden="true" className={iconClasses} />
          <span>{"Việc học của tôi"}</span>
        </Menu.Item>

        <Menu.Item render={<Link href="/my-purchases" />} className={itemClasses}>
          <ShoppingBag aria-hidden="true" className={iconClasses} />
          <span>{"Mua hàng của tôi"}</span>
        </Menu.Item>

        <Menu.Item render={<Link href="/my-organizations" />} className={itemClasses}>
          <Building2 aria-hidden="true" className={iconClasses} />
          <span>{"Tổ chức của tôi"}</span>
        </Menu.Item>

        {ownedOrg && (
          <Menu.Item
            render={<Link href={`/organizations/${ownedOrg.slug || ownedOrg.id}/manage`} />}
            className={itemClasses}
          >
            <LayoutDashboard aria-hidden="true" className={iconClasses} />
            <span>{"Bảng điều khiển Tổ chức"}</span>
          </Menu.Item>
        )}

        <Menu.Item render={<Link href="/account-settings" />} className={itemClasses}>
          <Settings aria-hidden="true" className={iconClasses} />
          <span>{"Cài đặt"}</span>
        </Menu.Item>

        {isInstructorOrAdmin && (
          <>
            <Menu.Item render={<Link href="/instructor/dashboard" />} className={itemClasses}>
              <LayoutDashboard aria-hidden="true" className={iconClasses} />
              <span>{"Bảng điều khiển Giảng viên"}</span>
            </Menu.Item>
            <Menu.Item render={<Link href="/instructor/courses" />} className={itemClasses}>
              <Layers aria-hidden="true" className={iconClasses} />
              <span>{"Khóa học Giảng dạy"}</span>
            </Menu.Item>
            <Menu.Item render={<Link href="/instructor/profile" />} className={itemClasses}>
              <Edit aria-hidden="true" className={iconClasses} />
              <span>{"Hồ sơ & Chữ ký Giảng viên"}</span>
            </Menu.Item>
          </>
        )}

        {(isSuperAdmin || Boolean(ownedOrg)) && (
          <Menu.Item render={<Link href="/partner/settings" />} className={itemClasses}>
            <Settings aria-hidden="true" className={iconClasses} />
            <span>{"Cấu hình Đối tác"}</span>
          </Menu.Item>
        )}

        {isSuperAdmin && (
          <>
            <Menu.Item render={<Link href="/admin/dashboard" />} className={itemClasses}>
              <LayoutDashboard aria-hidden="true" className={iconClasses} />
              <span>{"Trang quản trị"}</span>
            </Menu.Item>
            <Menu.Item render={<Link href="/admin/applications" />} className={itemClasses}>
              <CheckCircle2 aria-hidden="true" className={iconClasses} />
              <span>{"Duyệt đơn Giảng viên"}</span>
            </Menu.Item>
            <Menu.Item render={<Link href="/admin/partners" />} className={itemClasses}>
              <Building2 aria-hidden="true" className={iconClasses} />
              <span>{"Quản trị Đối tác"}</span>
            </Menu.Item>
            <Menu.Item render={<Link href="/admin/announcements" />} className={itemClasses}>
              <Megaphone aria-hidden="true" className={iconClasses} />
              <span>{"Thông báo Hệ thống"}</span>
            </Menu.Item>
          </>
        )}

        <Menu.Item
          onClick={handleLogout}
          className="text-error hover:bg-error-container/40 cursor-pointer px-3.5 py-2.5 text-sm font-medium justify-start gap-3 w-full rounded-xl my-0.5 transition-colors"
        >
          <LogOut aria-hidden="true" className="w-4.5 h-4.5 text-error" />
          <span>{"Thoát"}</span>
        </Menu.Item>
      </Menu.Content>
    </Menu>
  );
}
