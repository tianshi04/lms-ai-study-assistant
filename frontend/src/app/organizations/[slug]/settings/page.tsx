"use client";

import { use, Suspense } from "react";
import Link from "next/link";
import { Building2, ExternalLink, Settings, ShieldAlert } from "lucide-react";

import { PartnerSelfServiceForm } from "@/components/partner/PartnerSelfServiceForm";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Surface } from "@/components/ui/Surface";
import { useMyOrganizationsQuery, usePartnerDetailQuery } from "@/lib/query_hooks";

import { OrgHeaderNav } from "../components/OrgHeaderNav";

function OrgSettingsContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { userRole, isSuperAdmin } = useAuth();
  const { data: myOrgs = [] } = useMyOrganizationsQuery();

  const currentOrg = myOrgs.find((o) => o.slug === slug || o.id === slug);
  const roleUpper = (currentOrg?.roleInOrg || "").toUpperCase();
  const isOwnerOrAdmin =
    isSuperAdmin ||
    userRole === "3" ||
    (userRole || "").toUpperCase().includes("ADMIN") ||
    roleUpper.includes("ADMIN") ||
    roleUpper.includes("OWNER");

  const isCommunityOrg = slug === "partner_community";
  const {
    data: partner,
    isLoading,
    refetch,
  } = usePartnerDetailQuery(slug, {
    enabled: Boolean(slug) && !isCommunityOrg,
  });

  const orgName =
    partner?.name || currentOrg?.name || (isCommunityOrg ? "Coursera Project Network" : slug);

  if (!isOwnerOrAdmin) {
    return (
      <div className="w-full flex-1 bg-background min-h-screen">
        <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          <OrgHeaderNav
            slug={slug}
            orgName={orgName}
            avatarUrl={partner?.logoUrl || currentOrg?.avatarUrl}
            activeTab="settings"
            isOwnerOrAdmin={false}
          />
          <Surface
            variant="low"
            shape="2xl"
            className="p-12 text-center space-y-4 max-w-xl mx-auto"
          >
            <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-foreground">Không có quyền quản trị</h3>
            <p className="text-xs text-muted-foreground">
              Bạn đang ở vai trò <strong>{currentOrg?.roleInOrg || "Giảng viên"}</strong>. Bạn không
              có quyền thay đổi thông tin cài đặt của Tổ chức này.
            </p>
            <Button render={<Link href={`/organizations/${slug}/manage`} />} size="sm">
              Quay lại Tổng quan
            </Button>
          </Surface>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <OrgHeaderNav
          slug={slug}
          orgName={orgName}
          avatarUrl={partner?.logoUrl || currentOrg?.avatarUrl}
          activeTab="settings"
          isOwnerOrAdmin={isOwnerOrAdmin}
        />

        <Surface variant="container" shape="2xl" className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Cài đặt Thương hiệu, Ký số & OpenBadges
                </h2>
                <p className="text-xs text-muted-foreground">
                  Quản lý nhận diện thương hiệu, tên miền email tự động cấp Seat, đại diện ký chứng
                  chỉ và khóa ECDSA P-256 của Tổ chức.
                </p>
              </div>
            </div>
            {partner?.slug && (
              <Button
                variant="outlined"
                size="sm"
                render={<Link href={`/partners/${partner.slug}`} />}
              >
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                Xem trang công khai
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Progress.Circular size="md" />
              <p className="text-sm">Đang tải thông tin cài đặt…</p>
            </div>
          ) : !partner ? (
            <div className="py-12 text-center space-y-4 max-w-lg mx-auto">
              <Building2
                className="w-14 h-14 mx-auto text-muted-foreground/60"
                aria-hidden="true"
              />
              <h3 className="text-base font-bold text-foreground">
                Tổ chức nội bộ chưa có hồ sơ Đối tác Phát hành độc lập
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tổ chức hệ thống này dùng cấu hình mặc định toàn sàn. Để thiết lập thương hiệu phát
                hành OpenBadges riêng biệt, Quản trị viên hệ thống có thể khởi tạo hồ sơ tại trang
                Quản trị Đối tác.
              </p>
              {isSuperAdmin && (
                <Button variant="tonal" size="sm" render={<Link href="/admin/partners" />}>
                  Mở Quản trị Đối tác
                </Button>
              )}
            </div>
          ) : (
            <PartnerSelfServiceForm
              key={partner.id}
              activePartner={partner}
              refetchPartners={refetch}
              slugReadOnly
            />
          )}
        </Surface>
      </main>
    </div>
  );
}

export default function OrgSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground gap-2">
          <Progress.Circular size="sm" />
          <span className="text-sm">Đang tải cài đặt tổ chức…</span>
        </div>
      }
    >
      <OrgSettingsContent params={params} />
    </Suspense>
  );
}
