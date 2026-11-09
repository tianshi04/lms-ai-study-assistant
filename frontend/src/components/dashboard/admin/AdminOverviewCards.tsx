"use client";

import {
  Award,
  BookOpen,
  CircleDollarSign,
  GraduationCap,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminOverviewMetrics } from "@/gen/identity/v1/identity_pb";
import { Progress } from "@/components/ui/Progress";
import { Surface } from "@/components/ui/Surface";
import { formatNumber, formatPercent, formatVnd, toPercent } from "./formatters";

interface KpiCardProps {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  details: string[];
}

function KpiCard({ icon: Icon, iconClassName, label, value, details }: KpiCardProps) {
  return (
    <Surface variant="low" shape="2xl" className="p-5 space-y-3">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconClassName}`}
        >
          <Icon aria-hidden="true" className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-black text-foreground font-mono truncate">{value}</p>
        </div>
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {details.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </Surface>
  );
}

function RatingDistribution({ overview }: { overview: AdminOverviewMetrics }) {
  const total = overview.totalReviews;
  return (
    <Surface variant="low" shape="2xl" className="p-5 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-extrabold text-foreground">Phân bổ điểm đánh giá (CSAT)</h3>
        <span className="text-xs text-muted-foreground">{formatNumber(total)} lượt đánh giá</span>
      </div>
      <ul className="space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = overview.ratingDistribution[stars - 1] ?? 0;
          const percent = toPercent(count, total);
          return (
            <li key={stars} className="flex items-center gap-3 text-xs">
              <span className="w-10 shrink-0 font-semibold text-foreground">{stars} sao</span>
              <Progress value={percent} thickness="thick" label={`${stars} sao`} />
              <span className="w-20 shrink-0 text-right font-mono text-muted-foreground">
                {formatNumber(count)} ({percent.toFixed(0)}%)
              </span>
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}

export function AdminOverviewCards({ overview }: { overview: AdminOverviewMetrics }) {
  return (
    <section aria-labelledby="admin-overview-heading" className="space-y-4">
      <h2 id="admin-overview-heading" className="text-lg font-extrabold text-foreground">
        Tổng quan toàn sàn
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={Users}
          iconClassName="bg-primary-container text-on-primary-container"
          label="Tổng người dùng"
          value={formatNumber(overview.totalUsers)}
          details={[
            `${formatNumber(overview.learnerCount)} học viên · ${formatNumber(overview.instructorCount)} giảng viên · ${formatNumber(overview.adminCount)} admin`,
            `${formatNumber(overview.verifiedUserCount)} tài khoản đã xác minh danh tính (KYC)`,
          ]}
        />
        <KpiCard
          icon={BookOpen}
          iconClassName="bg-info/10 text-info"
          label="Khóa học"
          value={formatNumber(overview.totalCourses)}
          details={[
            `${formatNumber(overview.publishedCourses)} đã xuất bản · ${formatNumber(overview.pendingReviewCourses)} chờ duyệt`,
            `${formatNumber(overview.draftCourses)} bản nháp · ${formatNumber(overview.rejectedCourses)} bị từ chối`,
          ]}
        />
        <KpiCard
          icon={GraduationCap}
          iconClassName="bg-success/10 text-success"
          label="Ghi danh & hoàn thành"
          value={formatNumber(overview.totalEnrollments)}
          details={[
            `${formatNumber(overview.completedEnrollments)} lượt đã hoàn thành`,
            `Tỷ lệ hoàn thành: ${formatPercent(overview.completedEnrollments, overview.totalEnrollments)}`,
          ]}
        />
        <KpiCard
          icon={Star}
          iconClassName="bg-warning/10 text-warning"
          label="Mức hài lòng (CSAT)"
          value={overview.totalReviews > 0 ? `${overview.averageRating.toFixed(2)} / 5` : "—"}
          details={[`${formatNumber(overview.totalReviews)} lượt đánh giá khóa học`]}
        />
        <KpiCard
          icon={CircleDollarSign}
          iconClassName="bg-success/10 text-success"
          label="Doanh thu"
          value={formatVnd(overview.totalRevenue)}
          details={[
            `${formatNumber(overview.coursePurchaseCount)} lượt mua khóa học lẻ`,
            `${formatNumber(overview.activeSubscriptions)} gói Coursera Plus đang hiệu lực`,
          ]}
        />
        <KpiCard
          icon={Award}
          iconClassName="bg-accent text-accent-foreground"
          label="Chứng chỉ & học bổng"
          value={formatNumber(overview.certificatesIssued)}
          details={[
            `${formatNumber(overview.certificatesRevoked)} chứng chỉ đã thu hồi`,
            `${formatNumber(overview.approvedFinancialAids)} đơn hỗ trợ tài chính đã được duyệt`,
          ]}
        />
      </div>

      <RatingDistribution overview={overview} />
    </section>
  );
}
