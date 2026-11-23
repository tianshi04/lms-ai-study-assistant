"use client";

import { Suspense, use } from "react";
import { Award, BookOpen, KeyRound } from "lucide-react";

import { formatNumber } from "@/components/dashboard/admin/formatters";
import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Surface } from "@/components/ui/Surface";
import { Tabs } from "@/components/ui/Tabs";
import {
  useMyOrganizationsQuery,
  useOrganizationCatalogStatsQuery,
  useOrganizationCertificateStatsQuery,
  useOrganizationIdentityStatsQuery,
  usePartnerDetailQuery,
} from "@/lib/query_hooks";

import { OrgCertificatesTab } from "../components/OrgCertificatesTab";
import { OrgCoursesQualityTab } from "../components/OrgCoursesQualityTab";
import { OrgHeaderNav } from "../components/OrgHeaderNav";
import { OrgSeatHoldersTab } from "../components/OrgSeatHoldersTab";

function OrgManageContent({ params }: { params: Promise<{ slug: string }> }) {
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
  const { data: partner } = usePartnerDetailQuery(slug, {
    enabled: Boolean(slug) && !isCommunityOrg,
  });

  const { data: idStats } = useOrganizationIdentityStatsQuery(slug);
  const { data: catStats } = useOrganizationCatalogStatsQuery(slug);
  const { data: certStats } = useOrganizationCertificateStatsQuery(slug);

  const orgName =
    partner?.name || currentOrg?.name || (isCommunityOrg ? "Coursera Project Network" : slug);

  const usedSeats = idStats?.usedSeats ?? 0;
  const pendingReviewCourses = catStats?.pendingReviewCourses ?? 0;
  const certificatesIssued = certStats?.certificatesIssued ?? 0;

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <OrgHeaderNav
          slug={slug}
          orgName={orgName}
          avatarUrl={partner?.logoUrl || currentOrg?.avatarUrl}
          activeTab="manage"
          isOwnerOrAdmin={isOwnerOrAdmin}
        />

        {/* Server-Paginated Operational Workspace Tabs */}
        <Surface variant="low" shape="2xl" className="p-6 sm:p-8">
          <Tabs defaultValue="courses">
            <Tabs.List aria-label="Phân hệ tác nghiệp tổ chức">
              <Tabs.Trigger value="courses">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                Chất lượng & Phê duyệt Khóa học
                {pendingReviewCourses > 0 && (
                  <Badge size="pill" variant="warning">
                    {formatNumber(pendingReviewCourses)}
                  </Badge>
                )}
              </Tabs.Trigger>
              <Tabs.Trigger value="seats">
                <KeyRound className="w-4 h-4" aria-hidden="true" />
                Quản lý Seat & Học viên ({formatNumber(usedSeats)})
              </Tabs.Trigger>
              <Tabs.Trigger value="certificates">
                <Award className="w-4 h-4" aria-hidden="true" />
                Chứng chỉ Đã Cấp ({formatNumber(certificatesIssued)})
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="courses">
              <OrgCoursesQualityTab organizationId={slug} isOwnerOrAdmin={isOwnerOrAdmin} />
            </Tabs.Content>

            <Tabs.Content value="seats">
              <OrgSeatHoldersTab
                organizationId={slug}
                organizationName={orgName}
                isOwnerOrAdmin={isOwnerOrAdmin}
              />
            </Tabs.Content>

            <Tabs.Content value="certificates">
              <OrgCertificatesTab organizationId={slug} />
            </Tabs.Content>
          </Tabs>
        </Surface>
      </main>
    </div>
  );
}

export default function OrgManagePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground gap-2">
          <Progress.Circular size="sm" />
          <span className="text-sm">Đang tải bàn làm việc tổ chức…</span>
        </div>
      }
    >
      <OrgManageContent params={params} />
    </Suspense>
  );
}
