"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Lock, Send, ShieldAlert, UserMinus } from "lucide-react";

import { AdminDataTable } from "@/components/dashboard/admin/AdminDataTable";
import { AdminPagination } from "@/components/dashboard/admin/AdminPagination";
import { EmptyState } from "@/components/dashboard/admin/AdminSection";
import {
  AdminTableFilters,
  type FilterOption,
} from "@/components/dashboard/admin/AdminTableFilters";
import { formatNumber } from "@/components/dashboard/admin/formatters";
import { PagedQueryStatus } from "@/components/dashboard/admin/PagedQueryStatus";
import { useAdminTableState } from "@/components/dashboard/admin/useAdminTableState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  InvitationType,
  type EnterpriseSeat,
  type OrganizationSeatHolder,
} from "@/gen/identity/v1/identity_pb";
import { mapConnectError } from "@/lib/connect_error_mapper";
import {
  useCreateInvitationMutation,
  useEnterpriseSeatsQuery,
  useOrganizationSeatHoldersQuery,
  useRevokeEnterpriseSeatMutation,
} from "@/lib/queries/useIdentityQueries";

const PAGE_SIZE = 10;
const NO_HOLDERS: OrganizationSeatHolder[] = [];

const SEAT_FILTER_OPTIONS: FilterOption[] = [
  { value: "0", label: "Tất cả học viên" },
  { value: "1", label: "Đủ điều kiện thu hồi" },
];

const COLUMN_CLASS_NAMES = {
  enrolled: { head: "text-right", cell: "text-right font-mono" },
  progress: { head: "min-w-40" },
  actions: { head: "text-right", cell: "text-right" },
};

function formatShortDate(isoString: string): string {
  if (!isoString) return "—";
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return isoString;
  return parsed.toLocaleDateString("vi-VN");
}

interface OrgSeatHoldersTabProps {
  organizationId: string;
  organizationName: string;
  isOwnerOrAdmin: boolean;
}

export function OrgSeatHoldersTab({
  organizationId,
  organizationName,
  isOwnerOrAdmin,
}: OrgSeatHoldersTabProps) {
  const toast = useToast();
  const tableState = useAdminTableState(PAGE_SIZE);
  const { pagination } = tableState;
  const revocableOnly = tableState.status === 1;

  const [revokingHolder, setRevokingHolder] = useState<OrganizationSeatHolder | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedSeatKey, setSelectedSeatKey] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  const { data: orgSeats = [] } = useEnterpriseSeatsQuery(
    { organizationId },
    { enabled: Boolean(organizationId) },
  );
  const activeSeats: EnterpriseSeat[] = useMemo(
    () => orgSeats.filter((s) => s.isActive && s.usedSeats < s.totalSeats),
    [orgSeats],
  );

  const { data, isLoading, isError, error, refetch, isPlaceholderData } =
    useOrganizationSeatHoldersQuery({
      organizationId,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      searchQuery: tableState.searchQuery,
      revocableOnly,
    });

  const revokeMutation = useRevokeEnterpriseSeatMutation();
  const inviteMutation = useCreateInvitationMutation();

  const handleConfirmRevoke = async () => {
    if (!revokingHolder) return;
    try {
      const res = await revokeMutation.mutateAsync({ userId: revokingHolder.userId });
      if (res.success) {
        toast.success(res.message || `Đã thu hồi Seat của ${revokingHolder.fullName}.`);
        setRevokingHolder(null);
      } else {
        toast.error(res.message || "Không thể thu hồi Seat.");
      }
    } catch (err) {
      toast.error(mapConnectError(err, "Không thể thu hồi Seat doanh nghiệp."));
    }
  };

  const handleSendSeatInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetKey = selectedSeatKey || activeSeats[0]?.seatKey || "";
    if (!inviteEmail.trim() || !targetKey) return;

    try {
      await inviteMutation.mutateAsync({
        type: InvitationType.ENTERPRISE_SEAT,
        inviteeEmail: inviteEmail.trim(),
        targetId: targetKey,
        targetName: organizationName,
        message: inviteMessage.trim(),
      });
      toast.success(`Đã gửi lời mời cấp Seat đến ${inviteEmail.trim()}.`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteMessage("");
    } catch (err) {
      toast.error(mapConnectError(err, "Không thể gửi lời mời cấp Seat."));
    }
  };

  const columns = useMemo<ColumnDef<OrganizationSeatHolder>[]>(
    () => [
      {
        id: "learner",
        header: "Học viên",
        cell: ({ row }) => {
          const h = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                {h.avatarUrl ? (
                  <Image
                    src={h.avatarUrl}
                    alt={h.fullName || h.email}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  (h.fullName || h.email || "U").charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{h.fullName || "Học viên"}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{h.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: "seatKey",
        header: "Mã giấy phép Seat",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <Badge size="pill" variant="muted" className="font-mono">
              {row.original.seatKey}
            </Badge>
            <p className="text-[11px] text-muted-foreground">
              Cấp ngày: {formatShortDate(row.original.seatAssignedAt)}
            </p>
          </div>
        ),
      },
      {
        id: "enrolled",
        header: "Khóa đang học",
        cell: ({ row }) => formatNumber(row.original.enrolledCoursesCount),
      },
      {
        id: "progress",
        header: "Tiến độ cao nhất",
        cell: ({ row }) => {
          const pct = Math.round(row.original.maxProgressPercent);
          return (
            <div className="space-y-1">
              <Progress
                value={pct}
                label={`Tiến độ học tập ${row.original.fullName || row.original.email}`}
              />
              <p className="text-xs font-mono text-muted-foreground">{pct}%</p>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Thao tác",
        cell: ({ row }) => {
          if (!isOwnerOrAdmin) return null;
          const holder = row.original;
          if (!holder.canRevoke) {
            return (
              <div className="flex justify-end">
                <Tooltip
                  content={
                    holder.revokeReasonHint ||
                    "Học viên đã đạt tiến độ từ 20% trở lên trong 30 ngày đầu nên chưa thể thu hồi Seat."
                  }
                >
                  <span className="inline-flex cursor-not-allowed">
                    <Button size="sm" variant="outlined" disabled>
                      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                      Đang bảo vệ
                    </Button>
                  </span>
                </Tooltip>
              </div>
            );
          }
          return (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outlined"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setRevokingHolder(holder)}
              >
                <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                Thu hồi Seat
              </Button>
            </div>
          );
        },
      },
    ],
    [isOwnerOrAdmin],
  );

  const holders = data?.holders ?? NO_HOLDERS;
  const totalCount = data?.totalCount ?? 0;
  const table = useReactTable({
    data: holders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (holder) => holder.userId,
    manualPagination: true,
    rowCount: totalCount,
    state: { pagination },
    onPaginationChange: tableState.setPagination,
  });

  const isPastLastPage =
    !isPlaceholderData && holders.length === 0 && totalCount > 0 && pagination.pageIndex > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex-1">
          <AdminTableFilters
            searchValue={tableState.searchInput}
            onSearchChange={tableState.onSearchChange}
            searchLabel="Tìm học viên sử dụng Seat"
            searchPlaceholder="Tìm theo họ tên, email hoặc mã Seat…"
            statusValue={String(tableState.status)}
            onStatusChange={tableState.onStatusChange}
            statusLabel="Lọc điều kiện thu hồi"
            statusOptions={SEAT_FILTER_OPTIONS}
          />
        </div>
        {isOwnerOrAdmin && (
          <Button
            size="sm"
            variant="filled"
            disabled={activeSeats.length === 0}
            onClick={() => {
              setSelectedSeatKey(activeSeats[0]?.seatKey || "");
              setInviteDialogOpen(true);
            }}
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            Cấp Seat qua Email
          </Button>
        )}
      </div>

      <PagedQueryStatus
        isError={isError}
        errorLabel="Không thể tải danh sách học viên nhận Seat"
        errorMessage={error?.message}
        onRetry={() => refetch()}
        isPastLastPage={isPastLastPage}
        onGoToFirstPage={tableState.goToFirstPage}
      />

      {data && totalCount === 0 && (
        <EmptyState
          message={
            tableState.hasActiveFilters
              ? "Không có học viên nào khớp với bộ lọc."
              : "Chưa có học viên nào đang sử dụng Seat tài trợ của Tổ chức."
          }
        />
      )}

      {(isLoading || holders.length > 0) && (
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
          itemLabel="học viên"
          ariaLabel="Phân trang học viên nhận Seat"
        />
      )}

      {/* Dialog: Cấp Seat qua Email */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <Dialog.Content size="md">
          <Dialog.Header>
            <Dialog.Title>Cấp Seat Doanh nghiệp qua Email</Dialog.Title>
            <Dialog.Description>
              Gửi lời mời kích hoạt suất học tài trợ cho sinh viên hoặc nhân sự thuộc{" "}
              <strong>{organizationName}</strong>.
            </Dialog.Description>
          </Dialog.Header>
          <form onSubmit={handleSendSeatInvite} className="space-y-4 pt-2">
            <Input
              label="Email người nhận *"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="sinhvien@university.edu.vn"
            />
            <div>
              <label
                htmlFor="orgSeatLicenseSelect"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Chọn gói giấy phép Seat
              </label>
              <Select
                value={selectedSeatKey || activeSeats[0]?.seatKey || ""}
                onValueChange={(val) => {
                  if (val) setSelectedSeatKey(String(val));
                }}
              >
                <Select.Trigger id="orgSeatLicenseSelect" className="w-full font-mono text-xs">
                  <Select.Value placeholder="Chọn gói giấy phép">
                    {(() => {
                      const currentKey = selectedSeatKey || activeSeats[0]?.seatKey || "";
                      const found = activeSeats.find((s) => s.seatKey === currentKey);
                      return found
                        ? `${found.seatKey} (${found.usedSeats}/${found.totalSeats} đã dùng)`
                        : currentKey;
                    })()}
                  </Select.Value>
                </Select.Trigger>
                <Select.Content>
                  {activeSeats.map((s) => (
                    <Select.Item key={s.id} value={s.seatKey}>
                      {`${s.seatKey} (${s.usedSeats}/${s.totalSeats} đã dùng)`}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <Textarea
              label="Lời nhắn đính kèm (Tùy chọn)"
              rows={2}
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Chào mừng bạn tham gia chương trình đào tạo tài trợ của tổ chức…"
            />
            <Dialog.Footer>
              <Button type="button" variant="text" onClick={() => setInviteDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="filled" disabled={inviteMutation.isPending}>
                Gửi lời mời cấp Seat
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog>

      {/* Dialog: Xác nhận thu hồi Seat */}
      <Dialog
        open={Boolean(revokingHolder)}
        onOpenChange={(open) => {
          if (!open) setRevokingHolder(null);
        }}
      >
        <Dialog.Content size="md">
          <Dialog.Header>
            <Dialog.Icon icon={<ShieldAlert className="w-6 h-6 text-error" aria-hidden="true" />} />
            <Dialog.Title>Xác nhận thu hồi Seat tài trợ</Dialog.Title>
            <Dialog.Description>
              Bạn có chắc chắn muốn thu hồi suất học của{" "}
              <strong>{revokingHolder?.fullName || revokingHolder?.email}</strong>? Suất học sẽ được
              hoàn lại vào quỹ giấy phép của Tổ chức.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="text" onClick={() => setRevokingHolder(null)}>
              Hủy
            </Button>
            <Button
              variant="filled"
              className="bg-error text-on-error hover:bg-destructive-hover active:bg-destructive-active"
              disabled={revokeMutation.isPending}
              onClick={handleConfirmRevoke}
            >
              Thu hồi Seat
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
