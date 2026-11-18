"use client";

import { use, Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  ExternalLink,
  KeyRound,
  Mail,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";

import { formatNumber } from "@/components/dashboard/admin/formatters";
import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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

const SEAT_QUOTA_WARNING_RATIO = 0.8;

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

  const { data: idStats, isLoading: idStatsLoading } = useOrganizationIdentityStatsQuery(slug);
  const { data: catStats, isLoading: catStatsLoading } = useOrganizationCatalogStatsQuery(slug);
  const { data: certStats, isLoading: certStatsLoading } =
    useOrganizationCertificateStatsQuery(slug);

  const orgName =
    partner?.name || currentOrg?.name || (isCommunityOrg ? "Coursera Project Network" : slug);

  const memberCount = idStats?.memberCount ?? 0;
  const instructorCount = idStats?.instructorCount ?? 0;
  const pendingInvitationCount = idStats?.pendingInvitationCount ?? 0;
  const activeLicenseCount = idStats?.activeLicenseCount ?? 0;
  const totalSeats = idStats?.totalSeats ?? 0;
  const usedSeats = idStats?.usedSeats ?? 0;

  const totalCourses = catStats?.totalCourses ?? 0;
  const publishedCourses = catStats?.publishedCourses ?? 0;
  const pendingReviewCourses = catStats?.pendingReviewCourses ?? 0;
  const averageRating = catStats?.averageRating ?? 0;

  const certificatesIssued = certStats?.certificatesIssued ?? 0;
  const certificatesRevoked = certStats?.certificatesRevoked ?? 0;

  const isSeatQuotaWarning = totalSeats > 0 && usedSeats / totalSeats >= SEAT_QUOTA_WARNING_RATIO;

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

        {/* Real-time Bounded-Context KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Identity — Members & Invitations */}
          <Surface
            variant="low"
            shape="2xl"
            className="flex items-start gap-4 hover:border-primary/40 transition-colors p-5"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tổng Thành viên
              </p>
              {idStatsLoading ? (
                <div className="h-8 w-20 rounded-lg bg-muted/70 animate-pulse" />
              ) : (
                <p className="text-3xl font-black text-foreground font-mono">
                  {formatNumber(memberCount)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatNumber(instructorCount)} giảng viên · {formatNumber(pendingInvitationCount)}{" "}
                lời mời đang chờ
              </p>
            </div>
          </Surface>

          {/* Card 2: Catalog — Courses & Pending Approvals */}
          <Surface
            variant="low"
            shape="2xl"
            className="flex items-start gap-4 hover:border-primary/40 transition-colors p-5"
          >
            <div className="w-12 h-12 rounded-2xl bg-info/10 text-info flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Tổng Khóa học Tổ chức
                </p>
                {pendingReviewCourses > 0 && (
                  <Badge size="pill" variant="warning">
                    {formatNumber(pendingReviewCourses)} chờ duyệt
                  </Badge>
                )}
              </div>
              {catStatsLoading ? (
                <div className="h-8 w-20 rounded-lg bg-muted/70 animate-pulse" />
              ) : (
                <p className="text-3xl font-black text-info font-mono">
                  {formatNumber(totalCourses)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Khóa học Đã Xuất Bản: {formatNumber(publishedCourses)}
              </p>
            </div>
          </Surface>

          {/* Card 3: Identity — Enterprise Seat Utilization */}
          <Surface
            variant="low"
            shape="2xl"
            className="flex items-start gap-4 hover:border-primary/40 transition-colors p-5"
          >
            <div className="w-12 h-12 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Hạn mức Seat Doanh nghiệp
                </p>
                {isSeatQuotaWarning && (
                  <Badge size="pill" variant="warning">
                    Sắp đầy
                  </Badge>
                )}
              </div>
              {idStatsLoading ? (
                <div className="h-8 w-28 rounded-lg bg-muted/70 animate-pulse" />
              ) : (
                <p className="text-2xl font-black text-foreground font-mono">
                  {formatNumber(usedSeats)} / {formatNumber(totalSeats)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatNumber(activeLicenseCount)} giấy phép đang hoạt động
              </p>
            </div>
          </Surface>

          {/* Card 4: Certificate — Issued OpenBadges & CSAT */}
          <Surface
            variant="low"
            shape="2xl"
            className="flex items-start gap-4 hover:border-primary/40 transition-colors p-5"
          >
            <div className="w-12 h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Chứng chỉ Đã Cấp
              </p>
              {certStatsLoading ? (
                <div className="h-8 w-20 rounded-lg bg-muted/70 animate-pulse" />
              ) : (
                <p className="text-3xl font-black text-success font-mono">
                  {formatNumber(certificatesIssued)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatNumber(certificatesRevoked)} đã thu hồi · Đánh giá{" "}
                {averageRating > 0 ? `${averageRating.toFixed(1)} ★` : "—"}
              </p>
            </div>
          </Surface>
        </div>

        {/* Quick Navigation Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            variant="outlined"
            render={<Link href={`/organizations/${slug}/members`} />}
            className="hover:border-primary/50 transition-colors group flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1 text-sm">
                Thành viên Tổ chức
                <ArrowRight
                  aria-hidden="true"
                  className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors"
                />
              </h3>
              <p className="text-xs text-muted-foreground">
                Quản lý danh sách giảng viên & đồng nghiệp.
              </p>
            </div>
          </Card>

          {isOwnerOrAdmin && (
            <>
              <Card
                variant="outlined"
                render={<Link href={`/organizations/${slug}/invitations`} />}
                className="hover:border-primary/50 transition-colors group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="font-bold text-foreground group-hover:text-warning transition-colors flex items-center gap-1 text-sm">
                    Lời mời đã gửi ({formatNumber(pendingInvitationCount)})
                    <ArrowRight
                      aria-hidden="true"
                      className="w-3.5 h-3.5 text-muted-foreground group-hover:text-warning transition-colors"
                    />
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Theo dõi lời mời gia nhập & cấp Seat.
                  </p>
                </div>
              </Card>

              <Card
                variant="outlined"
                render={<Link href={`/organizations/${slug}/settings`} />}
                className="hover:border-primary/50 transition-colors group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1 text-sm">
                    Thương hiệu & Ký số
                    <ArrowRight aria-hidden="true" className="w-3.5 h-3.5 text-muted-foreground" />
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Logo, domain email, người ký & khóa OpenBadges.
                  </p>
                </div>
              </Card>
            </>
          )}

          {partner?.slug && (
            <Card
              variant="outlined"
              render={<Link href={`/partners/${partner.slug}`} />}
              className="hover:border-primary/50 transition-colors group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
                <ExternalLink className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="font-bold text-foreground group-hover:text-success transition-colors flex items-center gap-1 text-sm">
                  Trang Đối tác Công khai
                  <ArrowRight aria-hidden="true" className="w-3.5 h-3.5 text-muted-foreground" />
                </h3>
                <p className="text-xs text-muted-foreground">
                  Xem hồ sơ thương hiệu hiển thị cho học viên.
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Server-Paginated Management Tabs */}
        <Surface variant="low" shape="2xl" className="p-6 sm:p-8">
          <Tabs defaultValue="courses">
            <Tabs.List aria-label="Phân hệ quản trị tổ chức">
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
          <span className="text-sm">Đang tải bảng điều khiển…</span>
        </div>
      }
    >
      <OrgManageContent params={params} />
    </Suspense>
  );
}
