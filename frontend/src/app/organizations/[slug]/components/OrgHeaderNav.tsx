"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Briefcase, ChevronRight, Layers, Mail, Settings, Users } from "lucide-react";

import { cn } from "@/lib/utils";

interface OrgHeaderNavProps {
  slug: string;
  orgName?: string;
  avatarUrl?: string;
  activeTab: "manage" | "members" | "invitations" | "settings";
  isOwnerOrAdmin?: boolean;
}

export function OrgHeaderNav({
  slug,
  orgName = "Tổ chức",
  avatarUrl,
  activeTab,
  isOwnerOrAdmin = true,
}: OrgHeaderNavProps) {
  const pathname = usePathname();
  const [imgError, setImgError] = useState(false);

  const allNavItems = [
    {
      id: "manage",
      label: "Khóa học & Seat",
      href: `/organizations/${slug}/manage`,
      icon: Layers,
      adminOnly: false,
    },
    {
      id: "members",
      label: "Thành viên",
      href: `/organizations/${slug}/members`,
      icon: Users,
      adminOnly: false,
    },
    {
      id: "invitations",
      label: "Lời mời đã gửi",
      href: `/organizations/${slug}/invitations`,
      icon: Mail,
      adminOnly: true,
    },
    {
      id: "settings",
      label: "Cài đặt Tổ chức",
      href: `/organizations/${slug}/settings`,
      icon: Settings,
      adminOnly: true,
    },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || isOwnerOrAdmin);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <Link href="/my-organizations" className="hover:text-foreground transition-colors">
            Tổ chức của tôi
          </Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <Link
            href={`/organizations/${slug}/dashboard`}
            className="hover:text-foreground transition-colors"
          >
            {orgName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-foreground font-semibold">Bàn làm việc</span>
        </nav>

        <Link
          href={`/organizations/${slug}/dashboard`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Dashboard Tổ chức
        </Link>
      </div>

      {/* Header Banner */}
      <header className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center space-x-4 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl shrink-0 border border-primary/20 overflow-hidden">
            {avatarUrl && !imgError ? (
              <Image
                src={avatarUrl}
                alt={orgName || "Org"}
                width={64}
                height={64}
                unoptimized
                onError={() => setImgError(true)}
                className="w-full h-full object-contain rounded-2xl p-1.5"
              />
            ) : (
              orgName.charAt(0).toUpperCase() || "O"
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
              Bàn làm việc Tổ chức
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
              {orgName}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">ID / Slug: {slug}</p>
          </div>
        </div>

        {/* Workspace Tab Navigation Links */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-muted/50 border border-border rounded-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap",
                  isActive
                    ? "bg-card text-primary shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>
    </div>
  );
}
