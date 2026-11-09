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
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Surface } from "@/components/ui/Surface";
import { useAdminDashboardStatsQuery } from "@/lib/queries/useIdentityQueries";
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
        <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      {count !== undefined && (
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-black font-mono shrink-0 ${
            hasPending ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"
          }`}
          aria-label={isPendingQueue ? `${count} mục đang chờ xử lý` : `${count} mục`}
        >
          {formatNumber(count)}
        </span>
      )}
    </Link>
  );
}

export function AdminDashboard({ userName: _userName }: { userName: string }) {
  const { data: stats, isLoading, isError, error, refetch } = useAdminDashboardStatsQuery();
  const overview = stats?.overview;

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
            count={overview?.pendingInstructorApplications}
            isPendingQueue
          />
          <QuickAction
            href="/admin/courses/review"
            icon={Clock}
            iconClassName="bg-warning/10 text-warning"
            title="Duyệt Khóa Học"
            description="Kiểm duyệt chất lượng trước khi xuất bản"
            count={overview?.pendingReviewCourses}
            isPendingQueue
          />
          <QuickAction
            href="/instructor/financial-aid"
            icon={CircleDollarSign}
            iconClassName="bg-primary/10 text-primary"
            title="Duyệt Hỗ Trợ Tài Chính"
            description="Xét duyệt đơn xin học bổng của học viên"
            count={overview?.pendingFinancialAids}
            isPendingQueue
          />
          <QuickAction
            href="/admin/categories"
            icon={List}
            iconClassName="bg-accent text-accent-foreground"
            title="Quản Lý Danh Mục"
            description="Cấu hình cây chủ đề và môn học"
            count={overview?.categoryCount}
          />
          <QuickAction
            href="/admin/partners"
            icon={Building2}
            iconClassName="bg-info/10 text-info"
            title="Quản Trị Đối Tác"
            description="Trường đại học và doanh nghiệp"
            count={overview?.partnerCount}
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Progress.Circular size="md" className="mr-3" />
            <span aria-live="polite" className="text-sm font-medium">
              Đang tải số liệu tổng quan…
            </span>
          </div>
        )}

        {isError && (
          <Surface
            variant="low"
            shape="2xl"
            className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-destructive/30"
          >
            <div>
              <h2 className="text-sm font-extrabold text-destructive">
                Không thể tải số liệu dashboard
              </h2>
              <p className="text-xs text-muted-foreground">{error.message}</p>
            </div>
            <Button variant="outlined" size="sm" onClick={() => refetch()}>
              Thử lại
            </Button>
          </Surface>
        )}

        {stats && overview && (
          <>
            <AdminOverviewCards overview={overview} />
            <AdminCourseQualityTable />
            <AdminQualityAlerts
              assessmentAlerts={stats.assessmentAlerts}
              assessmentTotal={stats.assessmentAlertTotal}
              lowReviews={stats.lowReviews}
              lowReviewTotal={stats.lowReviewTotal}
              certificateTotal={overview.certificatesIssued}
            />
          </>
        )}

        {/* Embedded Core Admin Enterprise Seat Management View */}
        <AdminEnterpriseDashboard />
      </main>
    </div>
  );
}
