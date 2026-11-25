"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { CourseStatus, type AdminCourseQualityMetric } from "@/gen/catalog/v1/catalog_pb";
import { Star } from "lucide-react";
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
import { useIsMobile } from "@/lib/hooks/useIsMobile";

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
        <span className="inline-flex items-center gap-1 font-mono">
          <span>{row.original.averageRating.toFixed(1)}</span>
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
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
  const isMobile = useIsMobile();
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
          {isMobile ? (
            <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
              {isLoading && courses.length === 0 ? (
                <div className="p-4 space-y-2">
                  <div className="h-4 w-48 rounded bg-muted/70 animate-pulse" />
                  <div className="h-3 w-32 rounded bg-muted/50 animate-pulse" />
                </div>
              ) : (
                courses.map((course) => (
                  <div key={course.courseId} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground">{course.title}</p>
                        <p className="text-xs text-muted-foreground">{course.partnerName || "—"}</p>
                      </div>
                      <div className="shrink-0">
                        <CourseStatusBadge status={course.status} />
                      </div>
                    </div>
                    <CompletionProgressCell
                      title={course.title}
                      completedCount={course.completedCount}
                      enrolledCount={course.enrolledCount}
                    />
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Ghi danh</span>
                        <span className="font-mono font-bold text-foreground">
                          {formatNumber(course.enrolledCount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Đánh giá</span>
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-foreground">
                          {course.reviewCount > 0 ? (
                            <>
                              <span>{course.averageRating.toFixed(1)}</span>
                              <Star
                                className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0"
                                aria-hidden="true"
                              />
                            </>
                          ) : (
                            "Chưa có"
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Doanh thu</span>
                        <span className="font-mono font-bold text-foreground">
                          {formatVnd(course.revenue)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outlined"
                        render={<Link href={`/courses/${course.courseId}`} />}
                      >
                        Xem
                      </Button>
                      {course.status === CourseStatus.PENDING_REVIEW && (
                        <Button
                          size="sm"
                          variant="tonal"
                          render={<Link href="/admin/courses/review" />}
                        >
                          Kiểm duyệt
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <AdminDataTable
              table={table}
              columnClassNames={COLUMN_CLASS_NAMES}
              isLoading={isLoading}
            />
          )}
        </div>
      )}

      {table.getPageCount() > 1 && (
        <AdminPagination table={table} itemLabel="khóa học" ariaLabel="Phân trang khóa học" />
      )}
    </AdminSection>
  );
}
