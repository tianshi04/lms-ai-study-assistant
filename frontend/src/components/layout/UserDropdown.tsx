"use client";

import React, { useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import { getAvatarDataUri } from "@/lib/avatar";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService } from "@/gen/identity/v1/identity_pb";

import {
  BookOpen,
  ShoppingBag,
  Layers,
  Edit,
  Settings,
  LayoutDashboard,
  CheckCircle2,
  Building2,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useListUserPurchasesQuery } from "@/lib/query_hooks";
import { PaymentOrderStatus, PaymentTargetType, PlanType } from "@/gen/payment/v1/payment_pb";
import { Menu } from "@/components/ui/Menu";
import { Chip } from "@/components/ui/Chip";

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

  const { daysRemaining, isPlusActive, formattedExpDate } = useMemo(() => {
    const rawSub = purchasesData?.activeSubscription;
    let expStr = rawSub?.expiresAt || "";

    if (!expStr && purchasesData?.orders?.length) {
      const completedSubOrders = purchasesData.orders.filter(
        (o) =>
          o.status === PaymentOrderStatus.COMPLETED &&
          o.targetType === PaymentTargetType.SYSTEM_SUBSCRIPTION,
      );
      if (completedSubOrders.length > 0) {
        let accumulatedExp: Date | null = null;
        const sorted = [...completedSubOrders].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        for (const o of sorted) {
          const addDays = o.planType === PlanType.YEARLY ? 365 : 30;
          const orderDate = new Date(o.createdAt);
          if (!accumulatedExp || accumulatedExp.getTime() < orderDate.getTime()) {
            accumulatedExp = new Date(orderDate.getTime() + addDays * 24 * 60 * 60 * 1000);
          } else {
            accumulatedExp = new Date(accumulatedExp.getTime() + addDays * 24 * 60 * 60 * 1000);
          }
        }
        if (accumulatedExp) {
          expStr = accumulatedExp.toISOString();
        }
      }
    }

    if (!expStr) {
      return { daysRemaining: 0, isPlusActive: false, formattedExpDate: "" };
    }

    const expTime = new Date(expStr.trim().replace(" ", "T")).getTime();
    const nowTime = Date.now();
    const diffDays = Math.ceil((expTime - nowTime) / (1000 * 60 * 60 * 24));
    const active = !isNaN(expTime) && diffDays > 0;
    let formattedDate = "";
    try {
      formattedDate = new Date(expTime).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      formattedDate = expStr;
    }
    return {
      daysRemaining: active ? diffDays : 0,
      isPlusActive: active,
      formattedExpDate: formattedDate,
    };
  }, [purchasesData]);

  useEffect(() => {
    if (userName && !userAvatar) {
      try {
        const client = getRpcClient(IdentityService);
        client
          .getUserProfile({})
          .then((res) => {
            if (res.user?.avatarUrl) {
              setAuth({
                userId: res.user.id || userId,
                userName: res.user.fullName || userName,
                userEmail: res.user.email || userEmail,
                userRole: String(res.user.role || userRole),
                userAvatar: res.user.avatarUrl,
              });
            }
          })
          .catch(() => {});
      } catch {
        // Ignore
      }
    }
  }, [userName, userAvatar, userId, userEmail, userRole, setAuth]);

  const avatarSrc = useMemo(
    () => userAvatar || getAvatarDataUri(userEmail || "user"),
    [userAvatar, userEmail],
  );

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
        className="w-68 p-1.5 rounded-2xl bg-card border border-outline-variant shadow-xl"
      >
        {/* User Info Header with Avatar and Stacked Role Badge */}
        <div className="flex items-center gap-3.5 px-3.5 py-3 mb-1.5">
          <Image
            src={avatarSrc}
            alt={displayUserName}
            width={48}
            height={48}
            unoptimized
            className="w-11 h-11 rounded-full bg-primary-container object-cover ring-2 ring-primary/20 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-bold text-on-surface truncate min-w-0 leading-snug">
              {displayUserName}
            </p>
            <p className="text-xs text-on-surface-variant truncate min-w-0">{userEmail}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Chip
                variant="assist"
                className="h-5 text-[10px] py-0 px-2.5 bg-primary-container text-on-primary-container border-primary/20 hover:bg-primary-container uppercase tracking-wider pointer-events-none cursor-default font-bold"
              >
                {roleLabel}
              </Chip>
              {isPlusActive && (
                <Chip
                  variant="assist"
                  className="h-5 text-[10px] py-0 px-2 bg-primary-container text-primary border-primary/20 hover:bg-primary-container uppercase tracking-wider pointer-events-none cursor-default font-bold"
                  leadingIcon={<Sparkles className="w-2.5 h-2.5 text-primary" aria-hidden="true" />}
                >
                  PLUS
                </Chip>
              )}
            </div>
          </div>
        </div>

        {/* Plus Banner Section */}
        {isPlusActive ? (
          <div className="mx-1 my-1.5 p-3 rounded-xl bg-primary-container/20 border border-primary/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" aria-hidden="true" />
                <span>{"Coursera Plus"}</span>
              </div>
              <Chip
                variant="assist"
                className="h-5 text-[10px] py-0 px-2 bg-success/10 text-success border-success/20 hover:bg-success/15 pointer-events-none cursor-default font-bold"
              >
                Đang hoạt động
              </Chip>
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

        {/* Menu Items */}
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

        <Menu.Item render={<Link href="/account-settings" />} className={itemClasses}>
          <Settings aria-hidden="true" className={iconClasses} />
          <span>{"Cài đặt"}</span>
        </Menu.Item>

        {isInstructorOrAdmin && (
          <>
            <Menu.Item render={<Link href="/instructor/courses" />} className={itemClasses}>
              <Layers aria-hidden="true" className={iconClasses} />
              <span>{"Giảng Viên"}</span>
            </Menu.Item>
            <Menu.Item render={<Link href="/instructor/profile" />} className={itemClasses}>
              <Edit aria-hidden="true" className={iconClasses} />
              <span>{"Hồ sơ & Chữ ký Giảng viên"}</span>
            </Menu.Item>
          </>
        )}

        {isSuperAdmin && (
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
