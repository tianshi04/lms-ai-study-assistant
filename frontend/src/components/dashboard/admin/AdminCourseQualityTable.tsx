"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { CourseStatus, type AdminCourseQualityMetric } from "@/gen/catalog/v1/catalog_pb";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { useAdminCourseMetricsQuery } from "@/lib/queries/useCatalogQueries";
import { AdminDataTable } from "./AdminDataTable";
import { AdminPagination } from "./AdminPagination";
import { AdminSection, EmptyState } from "./AdminSection";
import { AdminTableFilters, type FilterOption } from "./AdminTableFilters";
import { formatNumber, formatPercent, formatVnd, toPercent } from "./formatters";
import { PagedQueryStatus } from "./PagedQueryStatus";
import { useAdminTableState } from "./useAdminTableState";

const PAGE_SIZE = 10;
const NO_COURSES: AdminCourseQualityMetric[] = [];

type CourseStatusBadgeVariant = "success" | "warning" | "muted" | "destructive";

const COURSE_STATUS: Partial<
  Record<CourseStatus, { label: string; variant: CourseStatusBadgeVariant }>
> = {
  [CourseStatus.PUBLISHED]: { label: "Đã xuất bản", variant: "success" },
  [CourseStatus.PENDING_REVIEW]: { label: "Chờ duyệt", variant: "warning" },
  [CourseStatus.DRAFT]: { label: "Bản nháp", variant: "muted" },
  [CourseStatus.REJECTED]: { label: "Bị từ chối", variant: "destructive" },
};

const STATUS_OPTIONS: FilterOption[] = [
  { value: String(CourseStatus.UNSPECIFIED), label: "Tất cả trạng thái" },
  { value: String(CourseStatus.PUBLISHED), label: "Đã xuất bản" },
  { value: String(CourseStatus.PENDING_REVIEW), label: "Chờ duyệt" },
  { value: String(CourseStatus.DRAFT), label: "Bản nháp" },
  { value: String(CourseStatus.REJECTED), label: "Bị từ chối" },
];

const COLUMN_CLASS_NAMES = {
  enrolled: { head: "text-right", cell: "text-right font-mono" },
  completion: { head: "min-w-40" },
  rating: { head: "text-right", cell: "text-right" },
  revenue: { head: "text-right", cell: "text-right font-mono" },
  actions: { head: "text-right", cell: "text-right" },
};

function CourseStatusBadge({ status }: { status: CourseStatus }) {
  const { label, variant } = COURSE_STATUS[status] ?? {
    label: "Không xác định",
    variant: "muted" as const,
  };
  return (
    <Badge size="pill" variant={variant}>
      {label}
    </Badge>
  );
}

function CompletionProgressCell({
  title,
  completedCount,
  enrolledCount,
}: Pick<AdminCourseQualityMetric, "title" | "completedCount" | "enrolledCount">) {
  const [isAnimated, setIsAnimated] = useState(false);
  const percent = toPercent(completedCount, enrolledCount);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsAnimated(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="space-y-1">
      <Progress
        value={isAnimated ? percent : 0}
        label={`Tỷ lệ hoàn thành ${title}`}
        className="[&_*]:duration-[1200ms] [&_*]:ease-out"
      />
      <p className="text-xs font-mono text-muted-foreground">
        {formatPercent(completedCount, enrolledCount)} ({formatNumber(completedCount)}/
        {formatNumber(enrolledCount)})
      </p>
    </div>
  );
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
    cell: ({ row }) => (
      <CompletionProgressCell
        title={row.original.title}
        completedCount={row.original.completedCount}
        enrolledCount={row.original.enrolledCount}
      />
    ),
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
        {row.original.status === CourseStatus.PENDING_REVIEW && (
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

      {(isLoading || courses.length > 0) && (
        <div
          className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
          aria-busy={isLoading || isPlaceholderData}
        >
          <AdminDataTable
            table={table}
            columnClassNames={COLUMN_CLASS_NAMES}
            isLoading={isLoading}
          />
        </div>
      )}

      {table.getPageCount() > 1 && (
        <AdminPagination table={table} itemLabel="khóa học" ariaLabel="Phân trang khóa học" />
      )}
    </AdminSection>
  );
}
