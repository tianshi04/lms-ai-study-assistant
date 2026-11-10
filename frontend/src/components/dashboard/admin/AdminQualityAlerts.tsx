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
import { useToast } from "@/components/ui/Toast";
import { useAcknowledgeLowReviewMutation } from "@/lib/queries/useIdentityQueries";
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
  const toast = useToast();
  const acknowledge = useAcknowledgeLowReviewMutation();

  const handleAcknowledge = (reviewId: string) => {
    acknowledge.mutate(reviewId, {
      onSuccess: (res) => {
        if (res.success) {
          toast.success(res.message || "Đã đánh dấu đánh giá là đã xem xét.");
        } else {
          toast.error(res.message || "Không thể đánh dấu đánh giá là đã xem xét.");
        }
      },
      onError: (err) => toast.error(err.message || "Không thể đánh dấu đánh giá là đã xem xét."),
    });
  };

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
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outlined"
                  render={<Link href={`/courses/${review.courseId}`} />}
                >
                  Xem khóa học
                </Button>
                <Button
                  size="sm"
                  variant="tonal"
                  disabled={acknowledge.isPending && acknowledge.variables === review.reviewId}
                  onClick={() => handleAcknowledge(review.reviewId)}
                >
                  Đã xem xét
                </Button>
              </div>
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
  assessmentTotal?: number;
  lowReviews: AdminLowReviewAlert[];
  /** True number of low-rating reviews, which can exceed `lowReviews.length`. */
  lowReviewTotal?: number;
  certificateTotal?: number;
  isLoading?: boolean;
}

const ALERT_SKELETON_ROWS = ["alert-sk-1", "alert-sk-2", "alert-sk-3"];

function AlertSkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {ALERT_SKELETON_ROWS.map((rowKey) => (
        <Table.Row key={rowKey} aria-busy="true">
          {Array.from({ length: columns }, (_, idx) => (
            <Table.Cell key={`${rowKey}-${idx}`}>
              <div className="h-4 w-full max-w-36 rounded bg-muted animate-pulse" />
            </Table.Cell>
          ))}
        </Table.Row>
      ))}
    </>
  );
}

export function AdminQualityAlerts({
  assessmentAlerts,
  assessmentTotal,
  lowReviews,
  lowReviewTotal,
  certificateTotal,
  isLoading = false,
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
            {assessmentTotal !== undefined
              ? `Chấm điểm & khiếu nại (${formatNumber(assessmentTotal)})`
              : "Chấm điểm & khiếu nại"}
          </Tabs.Tab>
          <Tabs.Tab value="reviews">
            {lowReviewTotal !== undefined
              ? `Đánh giá thấp (${formatNumber(lowReviewTotal)})`
              : "Đánh giá thấp"}
          </Tabs.Tab>
          <Tabs.Tab value="certificates">
            {certificateTotal !== undefined
              ? `Chứng chỉ (${formatNumber(certificateTotal)})`
              : "Chứng chỉ"}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="assessment">
          {isLoading ? (
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
                <AlertSkeletonRows columns={5} />
              </Table.Body>
            </Table>
          ) : assessmentAlerts.length === 0 ? (
            <EmptyState message="Không có báo cáo chấm điểm hay khiếu nại nào đang chờ xử lý." />
          ) : (
            <>
              <AssessmentAlertsTable alerts={assessmentAlerts} />
              <TruncationNote shown={assessmentAlerts.length} total={assessmentTotal ?? 0} />
            </>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="reviews">
          {isLoading ? (
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
                <AlertSkeletonRows columns={6} />
              </Table.Body>
            </Table>
          ) : lowReviews.length === 0 ? (
            <EmptyState message="Chưa có đánh giá 1–2 sao nào." />
          ) : (
            <>
              <LowReviewsTable reviews={lowReviews} />
              <TruncationNote shown={lowReviews.length} total={lowReviewTotal ?? 0} />
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
