"use client";

import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  List,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { useAdminAssessmentAlertsQuery } from "@/lib/queries/useAssessmentQueries";
import { useAdminCatalogStatsQuery } from "@/lib/queries/useCatalogQueries";
import { useAdminCertificateStatsQuery } from "@/lib/queries/useCertificateQueries";
import { useAdminIdentityStatsQuery } from "@/lib/queries/useIdentityQueries";
import { useAdminLearningStatsQuery } from "@/lib/queries/useLearningQueries";
import { usePartnersQuery } from "@/lib/queries/usePartnerQueries";
import { useAdminPaymentStatsQuery } from "@/lib/queries/usePaymentQueries";
import { AdminCourseQualityTable } from "./admin/AdminCourseQualityTable";
import { AdminOverviewCards } from "./admin/AdminOverviewCards";
import { AdminQualityAlerts } from "./admin/AdminQualityAlerts";
import { formatNumber } from "./admin/formatters";
import { AdminEnterpriseDashboard } from "./AdminEnterpriseDashboard";

interface QuickActionProps {
  href: string;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
  /** Count shown as a badge; `undefined` hides the badge while stats are loading. */
  count?: number;
  /** Highlights the badge when the count represents work waiting for the admin. */
  isPendingQueue?: boolean;
}

function QuickAction({
  href,
  icon: Icon,
  iconClassName,
  title,
  description,
  count,
  isPendingQueue = false,
}: QuickActionProps) {
  const hasPending = isPendingQueue && (count ?? 0) > 0;
  return (
    <Link
      href={href}
      className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-sm transition-colors group flex items-center gap-4"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClassName}`}
      >
        <Icon aria-hidden="true" className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
          {title}
        </h3>
        <p className="text-[10px] leading-3.5 text-muted-foreground line-clamp-2 min-h-7">
          {description}
        </p>
      </div>
      {count !== undefined ? (
        <span
          className={`min-w-7 h-5 px-2 rounded-full text-[11px] font-black font-mono shrink-0 inline-flex items-center justify-center transition-all duration-300 ease-out animate-in fade-in ${
            hasPending ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"
          }`}
          aria-label={isPendingQueue ? `${count} mục đang chờ xử lý` : `${count} mục`}
        >
          {formatNumber(count)}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="min-w-7 h-5 rounded-full bg-muted/60 animate-pulse shrink-0"
        />
      )}
    </Link>
  );
}

export function AdminDashboard({ userName: _userName }: { userName: string }) {
  const { isAuthenticated, isSuperAdmin } = useAuth();
  const identityQuery = useAdminIdentityStatsQuery();
  const catalogQuery = useAdminCatalogStatsQuery();
  const learningQuery = useAdminLearningStatsQuery();
  const paymentQuery = useAdminPaymentStatsQuery();
  const certificateQuery = useAdminCertificateStatsQuery();
  const assessmentQuery = useAdminAssessmentAlertsQuery();
  const partnersQuery = usePartnersQuery({
    enabled: isAuthenticated && isSuperAdmin,
    staleTime: 60 * 1000,
  });

  const summaryQueries = [
    identityQuery,
    catalogQuery,
    learningQuery,
    paymentQuery,
    certificateQuery,
    assessmentQuery,
    partnersQuery,
  ];
  const failedQuery = summaryQueries.find((q) => q.isError);
  const refetchFailed = () => {
    for (const q of summaryQueries) {
      if (q.isError) void q.refetch();
    }
  };

  return (
    <div className="w-full flex-1 bg-background min-h-screen">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Quick Admin Operations Navigation Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <QuickAction
            href="/admin/applications"
            icon={CheckCircle2}
            iconClassName="bg-success/10 text-success"
            title="Duyệt Đơn Giảng Viên"
            description="Xét duyệt đơn đăng ký tác giả/giảng viên"
            count={identityQuery.data?.pendingInstructorApplications}
            isPendingQueue
          />
          <QuickAction
            href="/admin/courses/review"
            icon={Clock}
            iconClassName="bg-warning/10 text-warning"
            title="Duyệt Khóa Học"
            description="Kiểm duyệt chất lượng trước khi xuất bản"
            count={catalogQuery.data?.pendingReviewCourses}
            isPendingQueue
          />
          <QuickAction
            href="/instructor/financial-aid"
            icon={CircleDollarSign}
            iconClassName="bg-primary/10 text-primary"
            title="Duyệt Hỗ Trợ Tài Chính"
            description="Xét duyệt đơn xin học bổng của học viên"
            count={certificateQuery.data?.pendingFinancialAids}
            isPendingQueue
          />
          <QuickAction
            href="/admin/categories"
            icon={List}
            iconClassName="bg-accent text-accent-foreground"
            title="Quản Lý Danh Mục"
            description="Cấu hình cây chủ đề và môn học"
            count={catalogQuery.data?.categoryCount}
          />
          <QuickAction
            href="/admin/partners"
            icon={Building2}
            iconClassName="bg-info/10 text-info"
            title="Quản Trị Đối Tác"
            description="Trường đại học và doanh nghiệp"
            count={partnersQuery.data?.length}
          />
        </div>

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
        />

        <AdminCourseQualityTable />

        <AdminQualityAlerts
          assessmentAlerts={assessmentQuery.data?.alerts ?? []}
          assessmentTotal={assessmentQuery.data?.totalCount}
          lowReviews={catalogQuery.data?.lowReviews ?? []}
          lowReviewTotal={catalogQuery.data?.lowReviewTotal}
          certificateTotal={certificateQuery.data?.certificatesIssued}
          isAssessmentLoading={assessmentQuery.isLoading}
          isReviewsLoading={catalogQuery.isLoading}
        />

        {/* Embedded Core Admin Enterprise Seat Management View */}
        <AdminEnterpriseDashboard />
      </main>
    </div>
  );
}
