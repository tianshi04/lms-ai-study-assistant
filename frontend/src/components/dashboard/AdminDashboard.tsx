"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, CircleAlert } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { useAdminCatalogStatsQuery } from "@/lib/queries/useCatalogQueries";
import { useAdminCertificateStatsQuery } from "@/lib/queries/useCertificateQueries";
import { useAdminIdentityStatsQuery } from "@/lib/queries/useIdentityQueries";
import { useAdminLearningStatsQuery } from "@/lib/queries/useLearningQueries";
import { formatCornerBadgeCount } from "@/lib/queries/useAdminNavCounts";
import { useAdminPaymentStatsQuery } from "@/lib/queries/usePaymentQueries";
import { AdminOverviewCards } from "./admin/AdminOverviewCards";
import { formatNumber } from "./admin/formatters";

interface PendingShortcut {
  href: string;
  label: string;
  count: number;
}

export function AdminDashboard({ userName }: { userName: string }) {
  const identityQuery = useAdminIdentityStatsQuery();
  const catalogQuery = useAdminCatalogStatsQuery();
  const learningQuery = useAdminLearningStatsQuery();
  const paymentQuery = useAdminPaymentStatsQuery();
  const certificateQuery = useAdminCertificateStatsQuery();

  const summaryQueries = [
    identityQuery,
    catalogQuery,
    learningQuery,
    paymentQuery,
    certificateQuery,
  ];
  const failedQuery = summaryQueries.find((q) => q.isError);
  const refetchFailed = () => {
    for (const q of summaryQueries) {
      if (q.isError) void q.refetch();
    }
  };

  const pendingInstructorApplications = identityQuery.data?.pendingInstructorApplications ?? 0;
  const pendingReviewCourses = catalogQuery.data?.pendingReviewCourses ?? 0;
  const pendingFinancialAids = certificateQuery.data?.pendingFinancialAids ?? 0;
  const lowReviewTotal = catalogQuery.data?.lowReviewTotal ?? 0;

  const totalActionablePending =
    pendingInstructorApplications + pendingReviewCourses + pendingFinancialAids + lowReviewTotal;

  const pendingShortcuts: PendingShortcut[] = [
    {
      href: "/admin/applications",
      label: "Đơn Giảng viên",
      count: pendingInstructorApplications,
    },
    {
      href: "/admin/courses/review",
      label: "Khóa học chờ duyệt",
      count: pendingReviewCourses,
    },
    {
      href: "/admin/financial-aid",
      label: "Hỗ trợ tài chính",
      count: pendingFinancialAids,
    },
    {
      href: "/admin/moderation",
      label: "Đánh giá thấp cần xem",
      count: lowReviewTotal,
    },
  ].filter((item) => item.count > 0);

  const displayName = userName.replace(/\s*\([^)]*\)/g, "").trim() || "Quản trị viên";

  return (
    <div className="w-full flex-1 bg-background min-h-screen relative">
      {/* Subtle decorative top glow */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Standalone Overview Header Banner */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-primary text-primary-foreground rounded-3xl p-6 sm:p-8 shadow-lg">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20">
              <span className="w-2 h-2 rounded-full bg-primary-foreground" aria-hidden="true" />
              Bảng Điều Khiển Quản Trị Hệ Thống
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
              Xin chào, <span className="opacity-95">{displayName}</span>
            </h1>
            <p className="text-sm opacity-85 max-w-2xl">
              Theo dõi chỉ số KPI toàn sàn, xu hướng ghi danh theo lĩnh vực, doanh thu, mức hài lòng
              (CSAT) và tình hình cấp chứng chỉ theo thời gian thực.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/admin/enterprise"
              className="relative inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-primary-foreground text-primary hover:bg-primary-foreground/95 font-bold text-sm shadow-md transition-colors"
            >
              <Briefcase className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Mở Bàn làm việc Quản trị</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              {totalActionablePending > 0 && (
                <Badge
                  variant="error"
                  size="large"
                  aria-label={`${totalActionablePending} mục đang chờ xử lý`}
                  className="absolute -top-2 -right-2 shadow-sm ring-2 ring-primary font-mono font-bold"
                >
                  {formatCornerBadgeCount(totalActionablePending)}
                </Badge>
              )}
            </Link>
          </div>
        </header>

        {/* Compact Actionable Pending Strip */}
        {pendingShortcuts.length > 0 && (
          <Surface
            variant="low"
            shape="2xl"
            className="px-4 py-3 border border-error/25 bg-error/5 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <CircleAlert className="w-4 h-4 text-error shrink-0" aria-hidden="true" />
              <span>
                Đang có{" "}
                <strong className="font-mono text-error">
                  {formatNumber(totalActionablePending)}
                </strong>{" "}
                hạng mục chờ quản trị viên xử lý:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pendingShortcuts.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border hover:border-error/40 text-xs font-semibold text-foreground transition-colors"
                >
                  <span>{item.label}</span>
                  <Badge variant="error" size="large" className="font-mono font-bold">
                    {formatCornerBadgeCount(item.count)}
                  </Badge>
                </Link>
              ))}
            </div>
          </Surface>
        )}

        {failedQuery && (
          <Surface
            variant="low"
            shape="2xl"
            className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-destructive/30"
          >
            <div>
              <h2 className="text-sm font-extrabold text-destructive">
                Không thể tải số liệu dashboard
              </h2>
              <p className="text-xs text-muted-foreground">{failedQuery.error?.message}</p>
            </div>
            <Button variant="outlined" size="sm" onClick={refetchFailed}>
              Thử lại
            </Button>
          </Surface>
        )}

        <AdminOverviewCards
          identityStats={identityQuery.data}
          catalogStats={catalogQuery.data}
          learningStats={learningQuery.data}
          paymentStats={paymentQuery.data}
          certificateStats={certificateQuery.data}
          defaultMetric="learning"
        />
      </main>
    </div>
  );
}
