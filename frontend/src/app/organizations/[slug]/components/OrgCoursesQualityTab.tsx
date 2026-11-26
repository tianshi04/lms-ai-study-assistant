"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Check, Eye, XCircle } from "lucide-react";

import { revalidateCoursesCache } from "@/app/actions/revalidate";
import { AdminDataTable } from "@/components/dashboard/admin/AdminDataTable";
import { AdminPagination } from "@/components/dashboard/admin/AdminPagination";
import { EmptyState } from "@/components/dashboard/admin/AdminSection";
import {
  AdminTableFilters,
  type FilterOption,
} from "@/components/dashboard/admin/AdminTableFilters";
import {
  formatNumber,
  formatPercent,
  formatVnd,
  toPercent,
} from "@/components/dashboard/admin/formatters";
import { PagedQueryStatus } from "@/components/dashboard/admin/PagedQueryStatus";
import { useAdminTableState } from "@/components/dashboard/admin/useAdminTableState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Progress } from "@/components/ui/Progress";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  CourseReviewAction,
  CourseStatus,
  type AdminCourseQualityMetric,
} from "@/gen/catalog/v1/catalog_pb";
import { mapConnectError } from "@/lib/connect_error_mapper";
import {
  useOrganizationCourseMetricsQuery,
  useReviewCourseMutation,
} from "@/lib/queries/useCatalogQueries";

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
  { value: String(CourseStatus.PENDING_REVIEW), label: "Chờ duyệt" },
  { value: String(CourseStatus.PUBLISHED), label: "Đã xuất bản" },
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

interface OrgCoursesQualityTabProps {
  organizationId: string;
  isOwnerOrAdmin: boolean;
}

export function OrgCoursesQualityTab({
  organizationId,
  isOwnerOrAdmin,
}: OrgCoursesQualityTabProps) {
  const toast = useToast();
  const tableState = useAdminTableState(PAGE_SIZE);
  const { pagination } = tableState;

  const [rejectingCourse, setRejectingCourse] = useState<AdminCourseQualityMetric | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const reviewMutation = useReviewCourseMutation();

  const { data, isLoading, isError, error, refetch, isPlaceholderData } =
    useOrganizationCourseMetricsQuery({
      organizationId,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      searchQuery: tableState.searchQuery,
      status: tableState.status as CourseStatus,
    });

  const handleApprove = async (course: AdminCourseQualityMetric) => {
    setApprovingId(course.courseId);
    try {
      await reviewMutation.mutateAsync({
        courseId: course.courseId,
        action: CourseReviewAction.APPROVE,
      });
      await revalidateCoursesCache();
      toast.success(`Đã phê duyệt xuất bản khóa học "${course.title}".`);
    } catch (err) {
      toast.error(mapConnectError(err, "Không thể phê duyệt khóa học."));
    } finally {
      setApprovingId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingCourse || !rejectionReason.trim()) return;
    try {
      await reviewMutation.mutateAsync({
        courseId: rejectingCourse.courseId,
        action: CourseReviewAction.REJECT,
        rejectionReason: rejectionReason.trim(),
      });
      await revalidateCoursesCache();
      toast.success(`Đã từ chối khóa học "${rejectingCourse.title}".`);
      setRejectingCourse(null);
      setRejectionReason("");
    } catch (err) {
      toast.error(mapConnectError(err, "Không thể từ chối khóa học."));
    }
  };

  const columns = useMemo<ColumnDef<AdminCourseQualityMetric>[]>(
    () => [
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
        cell: ({ row }) => {
          const course = row.original;
          const isPendingReview = course.status === CourseStatus.PENDING_REVIEW;
          return (
            <div className="flex justify-end items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outlined"
                render={<Link href={`/courses/${course.courseId}`} />}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                Xem
              </Button>
              {isOwnerOrAdmin && isPendingReview && (
                <>
                  <Button
                    size="sm"
                    variant="filled"
                    disabled={approvingId === course.courseId || reviewMutation.isPending}
                    onClick={() => handleApprove(course)}
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Duyệt xuất bản
                  </Button>
                  <Button
                    size="sm"
                    variant="outlined"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={reviewMutation.isPending}
                    onClick={() => {
                      setRejectingCourse(course);
                      setRejectionReason("");
                    }}
                  >
                    Từ chối
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOwnerOrAdmin, approvingId, reviewMutation.isPending],
  );

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

  const isPastLastPage =
    !isPlaceholderData && courses.length === 0 && totalCount > 0 && pagination.pageIndex > 0;

  return (
    <div className="space-y-4">
      <AdminTableFilters
        searchValue={tableState.searchInput}
        onSearchChange={tableState.onSearchChange}
        searchLabel="Tìm khóa học của tổ chức"
        searchPlaceholder="Tìm theo tên khóa học…"
        statusValue={String(tableState.status)}
        onStatusChange={tableState.onStatusChange}
        statusLabel="Lọc theo trạng thái"
        statusOptions={STATUS_OPTIONS}
      />

      <PagedQueryStatus
        isError={isError}
        errorLabel="Không thể tải danh sách khóa học của tổ chức"
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
              : "Tổ chức chưa phát hành khóa học nào."
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
        <AdminPagination
          table={table}
          itemLabel="khóa học"
          ariaLabel="Phân trang khóa học tổ chức"
        />
      )}

      <Dialog
        open={Boolean(rejectingCourse)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingCourse(null);
            setRejectionReason("");
          }
        }}
      >
        <Dialog.Content size="md">
          <Dialog.Header>
            <Dialog.Icon icon={<XCircle className="w-6 h-6 text-error" aria-hidden="true" />} />
            <Dialog.Title>Từ chối xuất bản khóa học</Dialog.Title>
            <Dialog.Description>
              Vui lòng nhập lý do từ chối để giảng viên chỉnh sửa lại nội dung khóa học{" "}
              <strong>{rejectingCourse?.title}</strong>.
            </Dialog.Description>
          </Dialog.Header>
          <form onSubmit={handleConfirmReject} className="space-y-4 pt-2">
            <Textarea
              label="Lý do từ chối *"
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ví dụ: Cần bổ sung tài liệu tham khảo và bài kiểm tra cuối tuần 2…"
            />
            <Dialog.Footer>
              <Button
                type="button"
                variant="text"
                onClick={() => {
                  setRejectingCourse(null);
                  setRejectionReason("");
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="filled"
                className="bg-error text-on-error hover:bg-destructive-hover active:bg-destructive-active"
                disabled={reviewMutation.isPending || !rejectionReason.trim()}
              >
                Xác nhận từ chối
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
