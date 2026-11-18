"use client";

import Link from "next/link";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";

import { AdminDataTable } from "@/components/dashboard/admin/AdminDataTable";
import { AdminPagination } from "@/components/dashboard/admin/AdminPagination";
import { EmptyState } from "@/components/dashboard/admin/AdminSection";
import {
  AdminTableFilters,
  type FilterOption,
} from "@/components/dashboard/admin/AdminTableFilters";
import { PagedQueryStatus } from "@/components/dashboard/admin/PagedQueryStatus";
import { useAdminTableState } from "@/components/dashboard/admin/useAdminTableState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  AdminCertificateStatusFilter,
  type AdminCertificateSummary,
} from "@/gen/certificate/v1/certificate_pb";
import { useOrganizationCertificatesQuery } from "@/lib/queries/useCertificateQueries";

const PAGE_SIZE = 10;
const NO_CERTIFICATES: AdminCertificateSummary[] = [];

const STATUS_OPTIONS: FilterOption[] = [
  { value: String(AdminCertificateStatusFilter.UNSPECIFIED), label: "Tất cả trạng thái" },
  { value: String(AdminCertificateStatusFilter.VALID), label: "Hợp lệ" },
  { value: String(AdminCertificateStatusFilter.REVOKED), label: "Đã thu hồi" },
];

const COLUMN_CLASS_NAMES = {
  id: { cell: "font-mono text-xs font-bold text-primary" },
  issueDate: { cell: "text-xs whitespace-nowrap" },
  actions: { head: "text-right", cell: "text-right" },
};

const COLUMNS: ColumnDef<AdminCertificateSummary>[] = [
  { id: "id", header: "Mã chứng chỉ", cell: ({ row }) => row.original.certificateId },
  { id: "learner", header: "Học viên", cell: ({ row }) => row.original.learnerName },
  {
    id: "course",
    header: "Khóa học",
    cell: ({ row }) => (
      <>
        <p className="font-semibold text-foreground">{row.original.courseTitle}</p>
        <p className="text-xs text-muted-foreground">{row.original.partnerName}</p>
      </>
    ),
  },
  { id: "issueDate", header: "Ngày cấp", cell: ({ row }) => row.original.issueDate },
  {
    id: "status",
    header: "Trạng thái",
    cell: ({ row }) =>
      row.original.isRevoked ? (
        <div className="space-y-1">
          <Badge size="pill" variant="destructive">
            Đã thu hồi
          </Badge>
          {row.original.revokedReason && (
            <p className="text-xs text-muted-foreground">{row.original.revokedReason}</p>
          )}
        </div>
      ) : (
        <Badge size="pill" variant="success">
          Hợp lệ
        </Badge>
      ),
  },
  {
    id: "actions",
    header: "Tra cứu công khai",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outlined"
          render={<Link href={`/verify/${row.original.certificateId}`} />}
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          Xác minh
        </Button>
      </div>
    ),
  },
];

interface OrgCertificatesTabProps {
  organizationId: string;
}

export function OrgCertificatesTab({ organizationId }: OrgCertificatesTabProps) {
  const tableState = useAdminTableState(PAGE_SIZE);
  const { pagination } = tableState;
  const { data, isLoading, isError, error, refetch, isPlaceholderData } =
    useOrganizationCertificatesQuery({
      organizationId,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      searchQuery: tableState.searchQuery,
      status: tableState.status as AdminCertificateStatusFilter,
    });

  const certificates = data?.certificates ?? NO_CERTIFICATES;
  const totalCount = data?.totalCount ?? 0;
  const table = useReactTable({
    data: certificates,
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (cert) => cert.certificateId,
    manualPagination: true,
    rowCount: totalCount,
    state: { pagination },
    onPaginationChange: tableState.setPagination,
  });

  const isPastLastPage =
    !isPlaceholderData && certificates.length === 0 && totalCount > 0 && pagination.pageIndex > 0;

  return (
    <div className="space-y-4">
      <AdminTableFilters
        searchValue={tableState.searchInput}
        onSearchChange={tableState.onSearchChange}
        searchLabel="Tìm chứng chỉ của tổ chức"
        searchPlaceholder="Tìm theo mã chứng chỉ, tên học viên hoặc khóa học…"
        statusValue={String(tableState.status)}
        onStatusChange={tableState.onStatusChange}
        statusLabel="Lọc theo trạng thái"
        statusOptions={STATUS_OPTIONS}
      />

      <PagedQueryStatus
        isError={isError}
        errorLabel="Không thể tải danh sách chứng chỉ của tổ chức"
        errorMessage={error?.message}
        onRetry={() => refetch()}
        isPastLastPage={isPastLastPage}
        onGoToFirstPage={tableState.goToFirstPage}
      />

      {data && totalCount === 0 && (
        <EmptyState
          message={
            tableState.hasActiveFilters
              ? "Không có chứng chỉ nào khớp với bộ lọc."
              : "Chưa có chứng chỉ nào được cấp cho các khóa học của Tổ chức."
          }
        />
      )}

      {(isLoading || certificates.length > 0) && (
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
          itemLabel="chứng chỉ"
          ariaLabel="Phân trang chứng chỉ tổ chức"
        />
      )}
    </div>
  );
}
