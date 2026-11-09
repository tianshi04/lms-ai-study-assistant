"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AdminAssessmentAlertKind,
  type AdminAssessmentAlert,
  type AdminLowReviewAlert,
} from "@/gen/identity/v1/identity_pb";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { AdminCertificatesPanel } from "./AdminCertificatesPanel";
import { AdminSection, EmptyState } from "./AdminSection";
import { formatDateTime, formatNumber } from "./formatters";
import { StatusBadge } from "./StatusBadge";

type AlertTab = "assessment" | "reviews" | "certificates";

const ALERT_KIND_LABELS: Record<AdminAssessmentAlertKind, string> = {
  [AdminAssessmentAlertKind.UNSPECIFIED]: "Khác",
  [AdminAssessmentAlertKind.GRADE_APPEAL]: "Khiếu nại điểm",
  [AdminAssessmentAlertKind.REPORTED_PEER_REVIEW]: "Báo cáo lượt chấm chéo",
  [AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW]: "Chấm điểm lệch bất thường",
};

const REPORT_PREFIX_PATTERN = /^\[REPORT_REVIEW:[^\]]*\]\s*/;

/** Tells the admin when a capped list hides older items, so the tab count is not misleading. */
function TruncationNote({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null;
  return (
    <p className="pt-3 text-xs text-muted-foreground">
      Đang hiển thị {formatNumber(shown)} mục mới nhất trong tổng số {formatNumber(total)}.
    </p>
  );
}

function AssessmentAlertsTable({ alerts }: { alerts: AdminAssessmentAlert[] }) {
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.Head>Loại</Table.Head>
          <Table.Head>Người gửi / người chấm</Table.Head>
          <Table.Head>Chi tiết</Table.Head>
          <Table.Head>Bài nộp</Table.Head>
          <Table.Head>Thời gian</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {alerts.map((alert) => (
          <Table.Row key={alert.alertId}>
            <Table.Cell>
              <StatusBadge tone="warning">{ALERT_KIND_LABELS[alert.kind]}</StatusBadge>
            </Table.Cell>
            <Table.Cell>
              <p className="font-semibold">{alert.userName || "Không rõ"}</p>
              <p className="text-xs font-mono text-muted-foreground">{alert.userId}</p>
            </Table.Cell>
            <Table.Cell className="max-w-sm text-xs">
              {alert.kind === AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW
                ? `Điểm chấm ${alert.totalScore.toFixed(1)}% lệch bất thường so với các lượt chấm khác`
                : alert.reason.replace(REPORT_PREFIX_PATTERN, "") || "—"}
            </Table.Cell>
            <Table.Cell className="font-mono text-xs">{alert.submissionId}</Table.Cell>
            <Table.Cell className="text-xs whitespace-nowrap">
              {formatDateTime(alert.createdAt)}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function LowReviewsTable({ reviews }: { reviews: AdminLowReviewAlert[] }) {
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.Head>Khóa học</Table.Head>
          <Table.Head>Học viên</Table.Head>
          <Table.Head>Điểm</Table.Head>
          <Table.Head>Nhận xét</Table.Head>
          <Table.Head>Thời gian</Table.Head>
          <Table.Head className="text-right">Thao tác</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {reviews.map((review) => (
          <Table.Row key={review.reviewId}>
            <Table.Cell className="font-bold">{review.courseTitle}</Table.Cell>
            <Table.Cell>{review.userName || "Ẩn danh"}</Table.Cell>
            <Table.Cell className="font-mono text-warning">{review.ratingStars} ★</Table.Cell>
            <Table.Cell className="max-w-sm text-xs">{review.commentText || "—"}</Table.Cell>
            <Table.Cell className="text-xs whitespace-nowrap">
              {formatDateTime(review.createdAt)}
            </Table.Cell>
            <Table.Cell className="text-right">
              <Button size="sm" variant="outlined" render={<Link href="/admin/courses/review" />}>
                Kiểm duyệt khóa
              </Button>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

interface AdminQualityAlertsProps {
  assessmentAlerts: AdminAssessmentAlert[];
  /** True number of open assessment alerts, which can exceed `assessmentAlerts.length`. */
  assessmentTotal: number;
  lowReviews: AdminLowReviewAlert[];
  /** True number of low-rating reviews, which can exceed `lowReviews.length`. */
  lowReviewTotal: number;
  certificateTotal: number;
}

export function AdminQualityAlerts({
  assessmentAlerts,
  assessmentTotal,
  lowReviews,
  lowReviewTotal,
  certificateTotal,
}: AdminQualityAlertsProps) {
  const [activeTab, setActiveTab] = useState<AlertTab>("assessment");

  return (
    <AdminSection
      id="admin-quality-alerts"
      title="Kiểm soát chất lượng & vi phạm"
      description="Các báo cáo cần Admin xem xét: chấm điểm bất thường, đánh giá thấp và quản lý chứng chỉ."
    >
      <Tabs.Root
        value={activeTab}
        onValueChange={(value) => {
          if (value != null) setActiveTab(value as AlertTab);
        }}
      >
        <Tabs.List className="overflow-x-auto pb-1">
          <Tabs.Tab value="assessment">
            {`Chấm điểm & khiếu nại (${formatNumber(assessmentTotal)})`}
          </Tabs.Tab>
          <Tabs.Tab value="reviews">{`Đánh giá thấp (${formatNumber(lowReviewTotal)})`}</Tabs.Tab>
          <Tabs.Tab value="certificates">
            {`Chứng chỉ (${formatNumber(certificateTotal)})`}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="assessment">
          {assessmentAlerts.length === 0 ? (
            <EmptyState message="Không có báo cáo chấm điểm hay khiếu nại nào đang chờ xử lý." />
          ) : (
            <>
              <AssessmentAlertsTable alerts={assessmentAlerts} />
              <TruncationNote shown={assessmentAlerts.length} total={assessmentTotal} />
            </>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="reviews">
          {lowReviews.length === 0 ? (
            <EmptyState message="Chưa có đánh giá 1–2 sao nào." />
          ) : (
            <>
              <LowReviewsTable reviews={lowReviews} />
              <TruncationNote shown={lowReviews.length} total={lowReviewTotal} />
            </>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="certificates">
          <AdminCertificatesPanel />
        </Tabs.Panel>
      </Tabs.Root>
    </AdminSection>
  );
}
