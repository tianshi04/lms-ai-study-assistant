"use client";

import { useState } from "react";
import type { AdminCertificateSummary } from "@/gen/identity/v1/identity_pb";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { useAdminCertificatesQuery } from "@/lib/queries/useIdentityQueries";
import { AdminPagination } from "./AdminPagination";
import { EmptyState } from "./AdminSection";
import { PagedQueryStatus } from "./PagedQueryStatus";
import { RevokeCertificateDialog } from "./RevokeCertificateDialog";
import { StatusBadge } from "./StatusBadge";

const PAGE_SIZE = 10;

function CertificatesTable({
  certificates,
  onRevoke,
}: {
  certificates: AdminCertificateSummary[];
  onRevoke: (certificate: AdminCertificateSummary) => void;
}) {
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.Head>Mã chứng chỉ</Table.Head>
          <Table.Head>Học viên</Table.Head>
          <Table.Head>Khóa học</Table.Head>
          <Table.Head>Ngày cấp</Table.Head>
          <Table.Head>Trạng thái</Table.Head>
          <Table.Head className="text-right">Thao tác</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {certificates.map((certificate) => (
          <Table.Row key={certificate.certificateId}>
            <Table.Cell className="font-mono text-xs font-bold text-primary">
              {certificate.certificateId}
            </Table.Cell>
            <Table.Cell>{certificate.learnerName}</Table.Cell>
            <Table.Cell>
              <p className="font-semibold">{certificate.courseTitle}</p>
              <p className="text-xs text-muted-foreground">{certificate.partnerName}</p>
            </Table.Cell>
            <Table.Cell className="text-xs whitespace-nowrap">{certificate.issueDate}</Table.Cell>
            <Table.Cell>
              {certificate.isRevoked ? (
                <div className="space-y-1">
                  <StatusBadge tone="destructive">Đã thu hồi</StatusBadge>
                  {certificate.revokedReason && (
                    <p className="text-xs text-muted-foreground">{certificate.revokedReason}</p>
                  )}
                </div>
              ) : (
                <StatusBadge tone="success">Hợp lệ</StatusBadge>
              )}
            </Table.Cell>
            <Table.Cell className="text-right">
              {!certificate.isRevoked && (
                <Button
                  size="sm"
                  variant="outlined"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => onRevoke(certificate)}
                >
                  Thu hồi
                </Button>
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

/** Paginated certificate list with the revoke flow, shown as a tab of the quality alerts. */
export function AdminCertificatesPanel() {
  const [page, setPage] = useState(1);
  const [revoking, setRevoking] = useState<AdminCertificateSummary | null>(null);
  const { data, isLoading, isError, error, refetch, isPlaceholderData } = useAdminCertificatesQuery(
    page,
    PAGE_SIZE,
  );

  const certificates = data?.certificates ?? [];
  const totalCount = data?.totalCount ?? 0;
  const pageSize = data?.pageSize || PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  // The requested page can fall past the end if certificates were removed while it was open.
  const isPastLastPage =
    !isPlaceholderData && certificates.length === 0 && totalCount > 0 && page > 1;

  return (
    <div className="space-y-4">
      <PagedQueryStatus
        isLoading={isLoading}
        loadingLabel="Đang tải danh sách chứng chỉ…"
        isError={isError}
        errorLabel="Không thể tải danh sách chứng chỉ"
        errorMessage={error?.message}
        onRetry={() => refetch()}
        isPastLastPage={isPastLastPage}
        onGoToFirstPage={() => setPage(1)}
      />

      {data && totalCount === 0 && <EmptyState message="Chưa có chứng chỉ nào được phát hành." />}

      {certificates.length > 0 && (
        <div
          className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
          aria-busy={isPlaceholderData}
        >
          <CertificatesTable certificates={certificates} onRevoke={setRevoking} />
        </div>
      )}

      {totalPages > 1 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          itemLabel="chứng chỉ"
          ariaLabel="Phân trang chứng chỉ"
          onPageChange={setPage}
        />
      )}

      <RevokeCertificateDialog certificate={revoking} onClose={() => setRevoking(null)} />
    </div>
  );
}
