"use client";

import { Suspense, use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  ChevronRight,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  Star,
  Users,
} from "lucide-react";

import { formatNumber } from "@/components/dashboard/admin/formatters";
import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Surface } from "@/components/ui/Surface";
import {
  useMyOrganizationsQuery,
  useOrganizationCatalogStatsQuery,
  useOrganizationCertificateStatsQuery,
  useOrganizationIdentityStatsQuery,
  usePartnerDetailQuery,
} from "@/lib/query_hooks";

const SEAT_QUOTA_WARNING_RATIO = 0.8;

function OrgAvatarLogo({ src, name }: { src?: string; name: string }) {
  const [hasError, setHasError] = useState(false);

  if (src && !hasError) {
    return (
      <Image
        src={src}
        alt={name}
        width={64}
        height={64}
        unoptimized
        onError={() => setHasError(true)}
        className="w-full h-full object-contain rounded-2xl p-1.5"
      />
    );
  }

  return <span>{name.charAt(0).toUpperCase() || "O"}</span>;
}

function OrgDashboardContent({ params }: { params: Promise<{ slug: string }> }) {
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
  const avatarUrl = partner?.logoUrl || currentOrg?.avatarUrl;

  const memberCount = idStats?.memberCount ?? 0;
  const instructorCount = idStats?.instructorCount ?? 0;
  const pendingInvitationCount = idStats?.pendingInvitationCount ?? 0;
  const activeLicenseCount = idStats?.activeLicenseCount ?? 0;
  const totalSeats = idStats?.totalSeats ?? 0;
  const usedSeats = idStats?.usedSeats ?? 0;
  const remainingSeats = Math.max(0, totalSeats - usedSeats);
  const seatUtilizationRatio = totalSeats > 0 ? Math.min(1, usedSeats / totalSeats) : 0;
  const seatUtilizationPercent = Math.round(seatUtilizationRatio * 100);
  const isSeatQuotaWarning = totalSeats > 0 && seatUtilizationRatio >= SEAT_QUOTA_WARNING_RATIO;

  const totalCourses = catStats?.totalCourses ?? 0;
  const publishedCourses = catStats?.publishedCourses ?? 0;
  const pendingReviewCourses = catStats?.pendingReviewCourses ?? 0;
  const draftCourses = catStats?.draftCourses ?? 0;
  const rejectedCourses = catStats?.rejectedCourses ?? 0;
  const totalReviews = catStats?.totalReviews ?? 0;
  const averageRating = catStats?.averageRating ?? 0;

  const certificatesIssued = certStats?.certificatesIssued ?? 0;
  const certificatesRevoked = certStats?.certificatesRevoked ?? 0;

  const totalActionItems = pendingReviewCourses + (isOwnerOrAdmin ? pendingInvitationCount : 0);
  const showActionBanner = totalActionItems > 0 || isSeatQuotaWarning;

  const courseBreakdown = [
    {
      label: "Đã xuất bản",
      count: publishedCourses,
      barClass: "bg-success",
      textClass: "text-success",
    },
    {
      label: "Chờ phê duyệt",
      count: pendingReviewCourses,
      barClass: "bg-warning",
      textClass: "text-warning",
    },
    {
      label: "Bản nháp",
      count: draftCourses,
      barClass: "bg-info",
      textClass: "text-info",
    },
    {
      label: "Cần chỉnh sửa / Từ chối",
      count: rejectedCourses,
      barClass: "bg-destructive",
      textClass: "text-destructive",
    },
  ];

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <Link href="/my-organizations" className="hover:text-foreground transition-colors">
            Tổ chức của tôi
          </Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-foreground font-semibold">{orgName}</span>
        </nav>

        {/* Standalone Dashboard Header Banner */}
        <header className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl shrink-0 border border-primary/20 overflow-hidden">
              <OrgAvatarLogo src={avatarUrl} name={orgName} />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
                Dashboard Thống kê Tổ chức
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
                {orgName}
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                ID / Slug: {slug} · Số liệu tổng hợp thời gian thực
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {partner?.slug && (
              <Button
                variant="outlined"
                size="sm"
                render={<Link href={`/partners/${partner.slug}`} />}
                className="rounded-xl"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Trang công khai
              </Button>
            )}

            <Button
              variant="filled"
              size="sm"
              render={<Link href={`/organizations/${slug}/manage`} />}
              className="relative rounded-xl font-bold px-4 py-2.5 shadow-sm"
            >
              <Briefcase className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Mở Bàn làm việc Tổ chức
              <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
              {totalActionItems > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-black bg-warning text-warning-foreground">
                  {formatNumber(totalActionItems)}
                </span>
              )}
            </Button>
          </div>
        </header>

        {/* Actionable Status Strip */}
        {showActionBanner && (
          <Surface
            variant="low"
            shape="2xl"
            className="p-4 sm:px-6 border border-warning/30 bg-warning/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="text-xs sm:text-sm text-foreground space-y-0.5">
                <p className="font-bold">Cần xử lý vận hành tại Bàn làm việc Tổ chức</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    pendingReviewCourses > 0
                      ? `${formatNumber(pendingReviewCourses)} khóa học chờ phê duyệt`
                      : null,
                    isOwnerOrAdmin && pendingInvitationCount > 0
                      ? `${formatNumber(pendingInvitationCount)} lời mời gia nhập đang chờ phản hồi`
                      : null,
                    isSeatQuotaWarning
                      ? `Hạn mức Seat Doanh nghiệp đã dùng ${seatUtilizationPercent}% (${formatNumber(usedSeats)}/${formatNumber(totalSeats)})`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>

            <Button
              variant="tonal"
              size="sm"
              render={<Link href={`/organizations/${slug}/manage`} />}
              className="shrink-0 rounded-xl font-semibold"
            >
              Đi tới Bàn làm việc
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
            </Button>
          </Surface>
        )}

        {/* Real-time Bounded-Context KPI Cards */}
        <section aria-label="Chỉ số tổng quan tổ chức">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Identity — Members & Invitations */}
            <Surface variant="low" shape="2xl" className="flex items-start gap-4 p-5">
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
                  {formatNumber(instructorCount)} giảng viên ·{" "}
                  {formatNumber(pendingInvitationCount)} lời mời chờ
                </p>
              </div>
            </Surface>

            {/* Card 2: Catalog — Courses & Pending Approvals */}
            <Surface variant="low" shape="2xl" className="flex items-start gap-4 p-5">
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
                  Đã xuất bản: {formatNumber(publishedCourses)} khóa học
                </p>
              </div>
            </Surface>

            {/* Card 3: Identity — Enterprise Seat Utilization */}
            <Surface variant="low" shape="2xl" className="flex items-start gap-4 p-5">
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
            <Surface variant="low" shape="2xl" className="flex items-start gap-4 p-5">
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
        </section>

        {/* Analytical Breakdown Panels (Read-Only Insights) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: Enterprise Seat Utilization */}
          <Surface variant="low" shape="2xl" className="p-6 sm:p-7 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-warning shrink-0" aria-hidden="true" />
                  Hiệu suất Sử dụng Suất học Doanh nghiệp
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tỷ lệ phân bổ suất học miễn phí trên tổng hạn mức giấy phép của tổ chức.
                </p>
              </div>
              <span className="text-2xl font-black font-mono text-foreground shrink-0">
                {seatUtilizationPercent}%
              </span>
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isSeatQuotaWarning ? "bg-warning" : "bg-primary"
                  }`}
                  style={{ width: `${seatUtilizationPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Đã cấp phát: {formatNumber(usedSeats)} suất</span>
                <span>Tổng hạn mức: {formatNumber(totalSeats)} suất</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Đang sử dụng
                </span>
                <span className="text-lg font-black font-mono text-primary">
                  {formatNumber(usedSeats)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Suất còn trống
                </span>
                <span className="text-lg font-black font-mono text-success">
                  {formatNumber(remainingSeats)}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Gói hoạt động
                </span>
                <span className="text-lg font-black font-mono text-foreground">
                  {formatNumber(activeLicenseCount)}
                </span>
              </div>
            </div>
          </Surface>

          {/* Panel 2: Course Portfolio & Quality Distribution */}
          <Surface variant="low" shape="2xl" className="p-6 sm:p-7 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-info shrink-0" aria-hidden="true" />
                  Cơ cấu Khóa học & Chất lượng Đào tạo
                </h2>
                <p className="text-xs text-muted-foreground">
                  Phân bổ trạng thái học liệu và điểm hài lòng trung bình (CSAT) từ học viên.
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="inline-flex items-center gap-1 text-lg font-black font-mono text-warning">
                  <Star className="w-4 h-4 fill-warning text-warning" aria-hidden="true" />
                  <span>{averageRating > 0 ? averageRating.toFixed(2) : "—"}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {formatNumber(totalReviews)} lượt đánh giá
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              {courseBreakdown.map((item) => {
                const pct = totalCourses > 0 ? Math.round((item.count / totalCourses) * 100) : 0;
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{item.label}</span>
                      <span className={`font-mono font-bold ${item.textClass}`}>
                        {formatNumber(item.count)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.barClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Surface>
        </section>
      </main>
    </div>
  );
}

export default function OrgDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground gap-2">
          <Progress.Circular size="sm" />
          <span className="text-sm">Đang tải Dashboard Tổ chức…</span>
        </div>
      }
    >
      <OrgDashboardContent params={params} />
    </Suspense>
  );
}
