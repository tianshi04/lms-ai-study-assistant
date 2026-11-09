"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Table } from "@/components/ui/Table";
import { useAdminCourseMetricsQuery } from "@/lib/queries/useIdentityQueries";
import { AdminPagination } from "./AdminPagination";
import { AdminSection, EmptyState } from "./AdminSection";
import { formatNumber, formatPercent, formatVnd, toPercent } from "./formatters";
import { PagedQueryStatus } from "./PagedQueryStatus";
import { StatusBadge, type StatusBadgeTone } from "./StatusBadge";

const PAGE_SIZE = 10;

const COURSE_STATUS: Record<string, { label: string; tone: StatusBadgeTone }> = {
  PUBLISHED: { label: "Đã xuất bản", tone: "success" },
  PENDING_REVIEW: { label: "Chờ duyệt", tone: "warning" },
  DRAFT: { label: "Bản nháp", tone: "muted" },
  REJECTED: { label: "Bị từ chối", tone: "destructive" },
};

function CourseStatusBadge({ status }: { status: string }) {
  const { label, tone } = COURSE_STATUS[status] ?? { label: status, tone: "muted" };
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

export function AdminCourseQualityTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isPlaceholderData } =
    useAdminCourseMetricsQuery(page, PAGE_SIZE);

  const courses = data?.courses ?? [];
  const totalCount = data?.totalCount ?? 0;
  const pageSize = data?.pageSize || PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  // The requested page can fall past the end if courses were removed while it was open.
  const isPastLastPage = !isPlaceholderData && courses.length === 0 && totalCount > 0 && page > 1;

  return (
    <AdminSection
      id="admin-course-quality"
      title="Chất lượng & hiệu quả theo khóa học"
      description="Số học viên ghi danh, tỷ lệ hoàn thành, điểm đánh giá và doanh thu của từng khóa học, xếp theo doanh thu cao nhất."
    >
      <PagedQueryStatus
        isLoading={isLoading}
        loadingLabel="Đang tải danh sách khóa học…"
        isError={isError}
        errorLabel="Không thể tải danh sách khóa học"
        errorMessage={error?.message}
        onRetry={() => refetch()}
        isPastLastPage={isPastLastPage}
        onGoToFirstPage={() => setPage(1)}
      />

      {data && totalCount === 0 && <EmptyState message="Chưa có khóa học nào trên hệ thống." />}

      {courses.length > 0 && (
        <div
          className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
          aria-busy={isPlaceholderData}
        >
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Khóa học</Table.Head>
                <Table.Head>Trạng thái</Table.Head>
                <Table.Head className="text-right">Ghi danh</Table.Head>
                <Table.Head className="min-w-40">Hoàn thành</Table.Head>
                <Table.Head className="text-right">Đánh giá</Table.Head>
                <Table.Head className="text-right">Doanh thu</Table.Head>
                <Table.Head className="text-right">Thao tác</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {courses.map((course) => (
                <Table.Row key={course.courseId}>
                  <Table.Cell>
                    <p className="font-bold text-foreground">{course.title}</p>
                    <p className="text-xs text-muted-foreground">{course.partnerName || "—"}</p>
                  </Table.Cell>
                  <Table.Cell>
                    <CourseStatusBadge status={course.status} />
                  </Table.Cell>
                  <Table.Cell className="text-right font-mono">
                    {formatNumber(course.enrolledCount)}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="space-y-1">
                      <Progress
                        value={toPercent(course.completedCount, course.enrolledCount)}
                        label={`Tỷ lệ hoàn thành ${course.title}`}
                      />
                      <p className="text-xs font-mono text-muted-foreground">
                        {formatPercent(course.completedCount, course.enrolledCount)} (
                        {formatNumber(course.completedCount)}/{formatNumber(course.enrolledCount)})
                      </p>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    {course.reviewCount > 0 ? (
                      <span className="font-mono">
                        {course.averageRating.toFixed(1)} ★{" "}
                        <span className="text-xs text-muted-foreground">
                          ({formatNumber(course.reviewCount)})
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Chưa có</span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-right font-mono">
                    {formatVnd(course.revenue)}
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outlined"
                        render={<Link href={`/courses/${course.courseId}`} />}
                      >
                        Xem
                      </Button>
                      {course.status === "PENDING_REVIEW" && (
                        <Button
                          size="sm"
                          variant="tonal"
                          render={<Link href="/admin/courses/review" />}
                        >
                          Kiểm duyệt
                        </Button>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          itemLabel="khóa học"
          ariaLabel="Phân trang khóa học"
          onPageChange={setPage}
        />
      )}
    </AdminSection>
  );
}
