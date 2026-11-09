"use client";

import Link from "next/link";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import {
  AdminCourseStatusFilter,
  type AdminCourseQualityMetric,
} from "@/gen/identity/v1/identity_pb";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { useAdminCourseMetricsQuery } from "@/lib/queries/useIdentityQueries";
import { AdminDataTable } from "./AdminDataTable";
import { AdminPagination } from "./AdminPagination";
import { AdminSection, EmptyState } from "./AdminSection";
import { AdminTableFilters, type FilterOption } from "./AdminTableFilters";
import { formatNumber, formatPercent, formatVnd, toPercent } from "./formatters";
import { PagedQueryStatus } from "./PagedQueryStatus";
import { StatusBadge, type StatusBadgeTone } from "./StatusBadge";
import { useAdminTableState } from "./useAdminTableState";

const PAGE_SIZE = 10;
const NO_COURSES: AdminCourseQualityMetric[] = [];

const COURSE_STATUS: Record<string, { label: string; tone: StatusBadgeTone }> = {
  PUBLISHED: { label: "Đã xuất bản", tone: "success" },
  PENDING_REVIEW: { label: "Chờ duyệt", tone: "warning" },
  DRAFT: { label: "Bản nháp", tone: "muted" },
  REJECTED: { label: "Bị từ chối", tone: "destructive" },
};

const STATUS_OPTIONS: FilterOption[] = [
  { value: String(AdminCourseStatusFilter.UNSPECIFIED), label: "Tất cả trạng thái" },
  { value: String(AdminCourseStatusFilter.PUBLISHED), label: COURSE_STATUS.PUBLISHED.label },
  {
    value: String(AdminCourseStatusFilter.PENDING_REVIEW),
    label: COURSE_STATUS.PENDING_REVIEW.label,
  },
  { value: String(AdminCourseStatusFilter.DRAFT), label: COURSE_STATUS.DRAFT.label },
  { value: String(AdminCourseStatusFilter.REJECTED), label: COURSE_STATUS.REJECTED.label },
];

const COLUMN_CLASS_NAMES = {
  enrolled: { head: "text-right", cell: "text-right font-mono" },
  completion: { head: "min-w-40" },
  rating: { head: "text-right", cell: "text-right" },
  revenue: { head: "text-right", cell: "text-right font-mono" },
  actions: { head: "text-right", cell: "text-right" },
};

function CourseStatusBadge({ status }: { status: string }) {
  const { label, tone } = COURSE_STATUS[status] ?? { label: status, tone: "muted" };
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

const columns: ColumnDef<AdminCourseQualityMetric>[] = [
  {
    id: "course",
    header: "Khóa học",
    cell: ({ row }) => (
      <>
        <p className="font-bold text-foreground">{row.original.title}</p>
        <p className="text-xs text-muted-foreground">{row.original.partnerName || "—"}</p>
      </>
    ),
  },
  {
    id: "status",
    header: "Trạng thái",
    cell: ({ row }) => <CourseStatusBadge status={row.original.status} />,
  },
  {
    id: "enrolled",
    header: "Ghi danh",
    cell: ({ row }) => formatNumber(row.original.enrolledCount),
  },
  {
    id: "completion",
    header: "Hoàn thành",
    cell: ({ row }) => {
      const { title, completedCount, enrolledCount } = row.original;
      return (
        <div className="space-y-1">
          <Progress
            value={toPercent(completedCount, enrolledCount)}
            label={`Tỷ lệ hoàn thành ${title}`}
          />
          <p className="text-xs font-mono text-muted-foreground">
            {formatPercent(completedCount, enrolledCount)} ({formatNumber(completedCount)}/
            {formatNumber(enrolledCount)})
          </p>
        </div>
      );
    },
  },
  {
    id: "rating",
    header: "Đánh giá",
    cell: ({ row }) =>
      row.original.reviewCount > 0 ? (
        <span className="font-mono">
          {row.original.averageRating.toFixed(1)} ★{" "}
          <span className="text-xs text-muted-foreground">
            ({formatNumber(row.original.reviewCount)})
          </span>
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Chưa có</span>
      ),
  },
  {
    id: "revenue",
    header: "Doanh thu",
    cell: ({ row }) => formatVnd(row.original.revenue),
  },
  {
    id: "actions",
    header: "Thao tác",
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outlined"
          render={<Link href={`/courses/${row.original.courseId}`} />}
        >
          Xem
        </Button>
        {row.original.status === "PENDING_REVIEW" && (
          <Button size="sm" variant="tonal" render={<Link href="/admin/courses/review" />}>
            Kiểm duyệt
          </Button>
        )}
      </div>
    ),
  },
];

export function AdminCourseQualityTable() {
  const tableState = useAdminTableState(PAGE_SIZE);
  const { pagination } = tableState;
  const { data, isLoading, isError, error, refetch, isPlaceholderData } =
    useAdminCourseMetricsQuery({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      searchQuery: tableState.searchQuery,
      status: tableState.status,
    });

  const courses = data?.courses ?? NO_COURSES;
  const totalCount = data?.totalCount ?? 0;
  const table = useReactTable({
    data: courses,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (course) => course.courseId,
    manualPagination: true,
    rowCount: totalCount,
    state: { pagination },
    onPaginationChange: tableState.setPagination,
  });

  // The requested page can fall past the end if courses were removed while it was open.
  const isPastLastPage =
    !isPlaceholderData && courses.length === 0 && totalCount > 0 && pagination.pageIndex > 0;

  return (
    <AdminSection
      id="admin-course-quality"
      title="Chất lượng & hiệu quả theo khóa học"
      description="Số học viên ghi danh, tỷ lệ hoàn thành, điểm đánh giá và doanh thu của từng khóa học, xếp theo doanh thu cao nhất."
    >
      <AdminTableFilters
        searchValue={tableState.searchInput}
        onSearchChange={tableState.onSearchChange}
        searchLabel="Tìm khóa học"
        searchPlaceholder="Tìm theo tên khóa học hoặc đối tác…"
        statusValue={String(tableState.status)}
        onStatusChange={tableState.onStatusChange}
        statusLabel="Lọc theo trạng thái"
        statusOptions={STATUS_OPTIONS}
      />

      <PagedQueryStatus
        isLoading={isLoading}
        loadingLabel="Đang tải danh sách khóa học…"
        isError={isError}
        errorLabel="Không thể tải danh sách khóa học"
        errorMessage={error?.message}
        onRetry={() => refetch()}
        isPastLastPage={isPastLastPage}
        onGoToFirstPage={tableState.goToFirstPage}
      />

      {data && totalCount === 0 && (
        <EmptyState
          message={
            tableState.hasActiveFilters
              ? "Không có khóa học nào khớp với bộ lọc."
              : "Chưa có khóa học nào trên hệ thống."
          }
        />
      )}

      {courses.length > 0 && (
        <div
          className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
          aria-busy={isPlaceholderData}
        >
          <AdminDataTable table={table} columnClassNames={COLUMN_CLASS_NAMES} />
        </div>
      )}

      {table.getPageCount() > 1 && (
        <AdminPagination table={table} itemLabel="khóa học" ariaLabel="Phân trang khóa học" />
      )}
    </AdminSection>
  );
}
