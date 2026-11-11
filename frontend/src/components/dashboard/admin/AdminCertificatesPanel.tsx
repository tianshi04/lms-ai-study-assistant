"use client";

import { useMemo, useState } from "react";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import {
  AdminCertificateStatusFilter,
  type AdminCertificateSummary,
} from "@/gen/certificate/v1/certificate_pb";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAdminCertificatesQuery } from "@/lib/queries/useCertificateQueries";
import { AdminDataTable } from "./AdminDataTable";
import { AdminPagination } from "./AdminPagination";
import { EmptyState } from "./AdminSection";
import { AdminTableFilters, type FilterOption } from "./AdminTableFilters";
import { PagedQueryStatus } from "./PagedQueryStatus";
import { RevokeCertificateDialog } from "./RevokeCertificateDialog";
import { useAdminTableState } from "./useAdminTableState";

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

function createColumns(
  onRevoke: (certificate: AdminCertificateSummary) => void,
): ColumnDef<AdminCertificateSummary>[] {
  return [
    { id: "id", header: "Mã chứng chỉ", cell: ({ row }) => row.original.certificateId },
    { id: "learner", header: "Học viên", cell: ({ row }) => row.original.learnerName },
    {
      id: "course",
      header: "Khóa học",
      cell: ({ row }) => (
        <>
          <p className="font-semibold">{row.original.courseTitle}</p>
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
      header: "Thao tác",
      cell: ({ row }) =>
        row.original.isRevoked ? null : (
          <Button
            size="sm"
            variant="outlined"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => onRevoke(row.original)}
          >
            Thu hồi
          </Button>
        ),
    },
  ];
}

/** Paginated certificate list with search, status filter and the revoke flow. */
export function AdminCertificatesPanel() {
  const tableState = useAdminTableState(PAGE_SIZE);
  const { pagination } = tableState;
  const [revoking, setRevoking] = useState<AdminCertificateSummary | null>(null);
  const columns = useMemo(() => createColumns(setRevoking), []);
  const { data, isLoading, isError, error, refetch, isPlaceholderData } = useAdminCertificatesQuery(
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      searchQuery: tableState.searchQuery,
      status: tableState.status,
    },
  );

  const certificates = data?.certificates ?? NO_CERTIFICATES;
  const totalCount = data?.totalCount ?? 0;
  const table = useReactTable({
    data: certificates,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (certificate) => certificate.certificateId,
    manualPagination: true,
    rowCount: totalCount,
    state: { pagination },
    onPaginationChange: tableState.setPagination,
  });

  // The requested page can fall past the end if certificates were removed while it was open.
  const isPastLastPage =
    !isPlaceholderData && certificates.length === 0 && totalCount > 0 && pagination.pageIndex > 0;

  return (
    <div className="space-y-4">
      <AdminTableFilters
        searchValue={tableState.searchInput}
        onSearchChange={tableState.onSearchChange}
        searchLabel="Tìm chứng chỉ"
        searchPlaceholder="Tìm theo mã chứng chỉ, học viên hoặc khóa học…"
        statusValue={String(tableState.status)}
        onStatusChange={tableState.onStatusChange}
        statusLabel="Lọc theo trạng thái"
        statusOptions={STATUS_OPTIONS}
      />

      <PagedQueryStatus
        isError={isError}
        errorLabel="Không thể tải danh sách chứng chỉ"
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
              : "Chưa có chứng chỉ nào được phát hành."
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
        <AdminPagination table={table} itemLabel="chứng chỉ" ariaLabel="Phân trang chứng chỉ" />
      )}

      <RevokeCertificateDialog certificate={revoking} onClose={() => setRevoking(null)} />
    </div>
  );
}
