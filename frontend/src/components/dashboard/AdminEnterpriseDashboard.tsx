"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AlertTriangle, Check, Plus, RefreshCw, UserPlus, X } from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { Select } from "@/components/ui/Select";
import { Surface } from "@/components/ui/Surface";
import { Table } from "@/components/ui/Table";
import { IdentityService, type EnterpriseSeat } from "@/gen/identity/v1/identity_pb";
import { getRpcClient } from "@/lib/connect_client";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useEnterpriseSeatsQuery, usePartnersQuery } from "@/lib/query_hooks";

const DEFAULT_SEAT_QUOTA = "500";
const KEY_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const columnHelper = createColumnHelper<EnterpriseSeat>();

function generateRandomKeySuffix(length = 4): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => KEY_CHARSET[b % KEY_CHARSET.length]).join("");
}

function buildEnterpriseKey(slugOrName: string, suffix: string, isSlug = false): string {
  const trimmed = slugOrName.trim();
  if (isSlug && trimmed) {
    const cleanSlug = trimmed
      .toUpperCase()
      .replace(/[^A-Z0-9-]+/g, "")
      .slice(0, 12)
      .replace(/^-+|-+$/g, "");
    if (cleanSlug) {
      return `${cleanSlug}-ENT-${suffix}`;
    }
  }

  if (trimmed) {
    const ascii = trimmed
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "D")
      .toUpperCase();
    const words = ascii.match(/[A-Z0-9]+/g) ?? [];
    let prefix = "";
    if (words.length === 1) {
      prefix = words[0].slice(0, 10);
    } else if (words.length === 2 && words[0].length + words[1].length <= 10) {
      prefix = `${words[0]}${words[1]}`;
    } else if (words.length >= 2) {
      prefix = words
        .map((w) => w[0])
        .join("")
        .slice(0, 8);
    }
    if (prefix) {
      return `${prefix}-ENT-${suffix}`;
    }
  }

  return `ENT-${new Date().getFullYear()}-${suffix}`;
}

export function AdminEnterpriseDashboard() {
  const { isSuperAdmin: isAdmin } = useAuth();
  const isMobile = useIsMobile();

  const {
    data: seats = [],
    isLoading: loading,
    refetch: fetchEnterpriseSeats,
  } = useEnterpriseSeatsQuery(undefined, { enabled: isAdmin });
  const { data: partners = [] } = usePartnersQuery({ enabled: isAdmin });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [targetUserId, setTargetUserId] = useState("");
  const [selectedSeatKey, setSelectedSeatKey] = useState("");

  const [newPartnerName, setNewPartnerName] = useState("");
  const [newSeatKey, setNewSeatKey] = useState("");
  const [keySuffix, setKeySuffix] = useState("");
  const [isCustomSeatKey, setIsCustomSeatKey] = useState(false);
  const [newOrganizationId, setNewOrganizationId] = useState("");
  const [newTotalSeats, setNewTotalSeats] = useState(DEFAULT_SEAT_QUOTA);

  const ensureKeySuffix = () => {
    if (keySuffix) return keySuffix;
    const next = generateRandomKeySuffix();
    setKeySuffix(next);
    return next;
  };

  const handleOpenCreateModal = () => {
    const suffix = generateRandomKeySuffix();
    setKeySuffix(suffix);
    setIsCustomSeatKey(false);
    setNewOrganizationId("");
    setNewPartnerName("");
    setNewSeatKey(buildEnterpriseKey("", suffix));
    setNewTotalSeats(DEFAULT_SEAT_QUOTA);
    setShowCreateModal(true);
  };

  const handleRegenerateSeatKey = () => {
    const suffix = generateRandomKeySuffix();
    setKeySuffix(suffix);
    setIsCustomSeatKey(false);
    const linked = partners.find((p) => p.id === newOrganizationId);
    setNewSeatKey(
      buildEnterpriseKey(linked?.slug || newPartnerName, suffix, Boolean(linked?.slug)),
    );
  };

  const totalUsedSeats = seats.reduce((sum, s) => sum + (s.usedSeats || 0), 0);
  const totalCapacitySeats = seats.reduce((sum, s) => sum + (s.totalSeats || 0), 0);
  const activeSeatLicenses = seats.filter((s) => s.isActive).length;

  const activationRate =
    totalCapacitySeats > 0 ? ((totalUsedSeats / totalCapacitySeats) * 100).toFixed(1) : "0.0";

  const columns = useMemo(
    () => [
      columnHelper.accessor("partnerName", {
        header: "Đối Tác Doanh Nghiệp",
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor("seatKey", {
        header: "Mã Suất Học (License Key)",
        cell: (info) => info.getValue(),
      }),
      columnHelper.display({
        id: "utilization",
        header: "Sử Dụng / Hạn Mức",
        cell: ({ row }) => `${row.original.usedSeats} / ${row.original.totalSeats}`,
      }),
      columnHelper.accessor("isActive", {
        header: "Trạng Thái Giấy Phép",
        cell: (info) => (info.getValue() ? "Đang hoạt động" : "Tạm ngưng"),
      }),
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: seats,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleAssignSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim() || !selectedSeatKey.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const client = getRpcClient(IdentityService);
      const res = await client.assignEnterpriseSeat({
        userId: targetUserId.trim(),
        enterpriseSeatKey: selectedSeatKey.trim(),
      });

      if (res.success) {
        setMessage({ type: "success", text: res.message || "Gán suất học thành công!" });
        setShowAssignModal(false);
        await fetchEnterpriseSeats();
      } else {
        setMessage({ type: "error", text: res.message || "Gán suất học thất bại." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xảy ra lỗi khi gán suất học Enterprise.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSeatKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const client = getRpcClient(IdentityService);
      const parsedTotal = Number.parseInt(newTotalSeats, 10);
      const res = await client.createEnterpriseSeat({
        partnerName: newPartnerName.trim(),
        seatKey: newSeatKey.trim(),
        organizationId: newOrganizationId,
        totalSeats: Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : 0,
      });

      const issuedKey = res.seat?.seatKey || newSeatKey.trim();
      setMessage({
        type: "success",
        text: issuedKey
          ? `Đã cấp mã Enterprise ${issuedKey} cho ${newPartnerName} thành công!`
          : `Đã cấp mã Enterprise mới cho ${newPartnerName} thành công!`,
      });
      setShowCreateModal(false);
      setNewPartnerName("");
      setNewSeatKey("");
      setIsCustomSeatKey(false);
      setNewOrganizationId("");
      setNewTotalSeats(DEFAULT_SEAT_QUOTA);
      await fetchEnterpriseSeats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tạo mã Enterprise thất bại.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Progress.Circular size="md" />
          <span aria-live="polite" className="text-sm font-medium">
            Đang tải bảng điều khiển Enterprise Admin…
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header Title Banner */}
        <div className="bg-primary text-primary-foreground rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 backdrop-blur-md">
                Cổng Quản trị Enterprise
              </span>
              {isAdmin && (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-warning/20 text-warning-foreground border border-warning/30">
                  Quản trị viên Hệ thống
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
              Quản trị Suất học Enterprise & Đối tác Doanh nghiệp
            </h1>
            <p className="text-sm opacity-80 max-w-2xl">
              Quản lý danh sách giấy phép tài trợ học tập, liên kết với Tổ chức Đối tác và theo dõi
              hạn mức suất học đang lưu hành.
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Button
                onClick={handleOpenCreateModal}
                variant="outlined"
                className="w-full sm:w-auto border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                <span>Tạo Mã Enterprise Mới</span>
              </Button>

              <Button
                onClick={() => setShowAssignModal(true)}
                variant="tonal"
                className="w-full sm:w-auto"
              >
                <UserPlus className="w-4 h-4 mr-1.5 text-primary" aria-hidden="true" />
                <span>Gán Suất học cho Học viên</span>
              </Button>
            </div>
          )}
        </div>

        {/* Access Guard Notice */}
        {!isAdmin && (
          <div className="p-5 rounded-2xl bg-warning/10 border border-warning/30 text-warning text-xs leading-relaxed flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>
              Lưu ý: Tính năng khởi tạo và cấp phát giấy phép Enterprise toàn sàn yêu cầu tài khoản
              Quản trị viên hệ thống.
            </span>
          </div>
        )}

        {/* Notification Toast */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-md transition-colors ${
              message.type === "success"
                ? "bg-success/10 text-success border border-success/30"
                : "bg-destructive/10 text-destructive border border-destructive/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <Check className="w-5 h-5 text-success" aria-hidden="true" />
              ) : (
                <X className="w-5 h-5 text-destructive" aria-hidden="true" />
              )}
              <span>{message.text}</span>
            </div>
            <IconButton
              variant="standard"
              size="xs"
              onClick={() => setMessage(null)}
              aria-label="Đóng thông báo"
              className="opacity-60 hover:opacity-100"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </IconButton>
          </div>
        )}

        {/* Dynamic KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Surface variant="low" shape="2xl" className="space-y-2 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tổng Mã Enterprise
            </span>
            <div className="text-3xl font-extrabold text-primary font-mono">{seats.length}</div>
            <p className="text-xs text-muted-foreground">Giấy phép tài trợ đang lưu hành</p>
          </Surface>

          <Surface variant="low" shape="2xl" className="space-y-2 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Trạng thái Hoạt động
            </span>
            <div className="text-3xl font-extrabold text-success font-mono">
              {activeSeatLicenses} / {seats.length}
            </div>
            <p className="text-xs text-muted-foreground">Gói doanh nghiệp đang kích hoạt</p>
          </Surface>

          <Surface variant="low" shape="2xl" className="space-y-2 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Suất học Đã kích hoạt
            </span>
            <div className="text-3xl font-extrabold text-info font-mono">
              {totalUsedSeats} / {totalCapacitySeats}
            </div>
            <p className="text-xs text-muted-foreground">Số suất học viên đã nhận tài trợ</p>
          </Surface>

          <Surface variant="low" shape="2xl" className="space-y-2 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tỷ lệ Kích hoạt Suất học
            </span>
            <div className="text-3xl font-extrabold text-accent-foreground font-mono">
              {activationRate}%
            </div>
            <p className="text-xs text-muted-foreground">Hiệu suất sử dụng suất học tài trợ</p>
          </Surface>
        </div>

        {/* Enterprise Seat Keys Table */}
        <Surface variant="low" shape="2xl" className="space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h2 className="text-lg font-extrabold text-foreground">
                Danh sách Giấy phép Suất học Doanh nghiệp
              </h2>
              <p className="text-xs text-muted-foreground">
                Các tổ chức, trường đại học và doanh nghiệp đang liên kết cấp quyền học miễn phí cho
                nhân sự / học viên.
              </p>
            </div>
          </div>

          {seats.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <p className="text-sm font-semibold">Chưa có Mã Enterprise nào trên hệ thống</p>
              <p className="text-xs">
                Hãy bấm &quot;Tạo Mã Enterprise Mới&quot; để tạo gói tài trợ học tập đầu tiên.
              </p>
            </div>
          ) : isMobile ? (
            <div className="divide-y divide-border">
              {seats.map((seat) => (
                <div key={seat.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{seat.partnerName}</p>
                      {seat.organizationId && (
                        <p className="text-xs font-mono text-muted-foreground">
                          Tổ chức: {seat.organizationId}
                        </p>
                      )}
                      <p className="font-mono text-xs font-bold text-primary break-all">
                        {seat.seatKey}
                      </p>
                    </div>
                    {seat.isActive ? (
                      <Badge size="pill" variant="success">
                        Đang hoạt động
                      </Badge>
                    ) : (
                      <Badge size="pill" variant="muted">
                        Tạm ngưng
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                      {seat.usedSeats} / {seat.totalSeats} suất
                    </span>
                    <Button
                      size="sm"
                      variant="outlined"
                      disabled={!seat.isActive || seat.usedSeats >= seat.totalSeats}
                      onClick={() => {
                        setSelectedSeatKey(seat.seatKey);
                        setShowAssignModal(true);
                      }}
                    >
                      Gán học viên
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <Table.Header>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <Table.Row key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <Table.Head key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </Table.Head>
                      ))}
                      <Table.Head className="text-right">Thao tác</Table.Head>
                    </Table.Row>
                  ))}
                </Table.Header>
                <Table.Body>
                  {seats.map((seat) => (
                    <Table.Row key={seat.id}>
                      <Table.Cell>
                        <p className="font-bold text-foreground">{seat.partnerName}</p>
                        {seat.organizationId && (
                          <p className="text-xs font-mono text-muted-foreground">
                            Tổ chức: {seat.organizationId}
                          </p>
                        )}
                      </Table.Cell>
                      <Table.Cell className="font-mono font-bold text-primary">
                        {seat.seatKey}
                      </Table.Cell>
                      <Table.Cell className="font-mono font-semibold">
                        {seat.usedSeats} / {seat.totalSeats}
                      </Table.Cell>
                      <Table.Cell>
                        {seat.isActive ? (
                          <Badge size="pill" variant="success">
                            Đang hoạt động
                          </Badge>
                        ) : (
                          <Badge size="pill" variant="muted">
                            Tạm ngưng
                          </Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <Button
                          size="sm"
                          variant="outlined"
                          disabled={!seat.isActive || seat.usedSeats >= seat.totalSeats}
                          onClick={() => {
                            setSelectedSeatKey(seat.seatKey);
                            setShowAssignModal(true);
                          }}
                        >
                          Gán học viên
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          )}
        </Surface>
      </div>

      {/* Modal: Gán Suất học cho Học viên */}
      <Dialog open={showAssignModal} onOpenChange={(open) => setShowAssignModal(open)}>
        <Dialog.Content size="md">
          <Dialog.Header>
            <Dialog.Title>{"Gán Suất học Enterprise"}</Dialog.Title>
          </Dialog.Header>
          <form onSubmit={handleAssignSeat} className="space-y-4 pt-2">
            <Input
              label="Mã Học viên (User ID)"
              type="text"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="Ví dụ: user_learner_03"
              className="font-mono"
              required
            />

            <div>
              <label
                htmlFor="selectedSeatKey"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                {"Chọn Mã Enterprise Key"}
              </label>
              <Select
                value={selectedSeatKey}
                onValueChange={(val) => {
                  if (val) setSelectedSeatKey(val as string);
                }}
              >
                <Select.Trigger
                  id="selectedSeatKey"
                  aria-label="Chọn Mã Enterprise Key"
                  className="w-full font-mono font-semibold"
                >
                  <Select.Value placeholder="Chọn Mã Enterprise Key">
                    {(() => {
                      const s = seats.find((seat) => seat.seatKey === selectedSeatKey);
                      return s ? `${s.partnerName} (${s.seatKey})` : selectedSeatKey;
                    })()}
                  </Select.Value>
                </Select.Trigger>
                <Select.Content>
                  {seats.map((s) => (
                    <Select.Item key={s.id} value={s.seatKey}>
                      {`${s.partnerName} (${s.seatKey})`}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            <Dialog.Footer className="pt-2">
              <Button
                type="button"
                variant="text"
                size="sm"
                onClick={() => setShowAssignModal(false)}
              >
                {"Hủy"}
              </Button>
              <Button type="submit" variant="filled" disabled={saving} size="sm">
                {"Kích hoạt gán suất học"}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog>

      {/* Modal: Tạo Mã Enterprise Key Mới */}
      <Dialog open={showCreateModal} onOpenChange={(open) => setShowCreateModal(open)}>
        <Dialog.Content size="lg">
          <Dialog.Header>
            <Dialog.Title>{"Tạo Mã Enterprise Mới"}</Dialog.Title>
          </Dialog.Header>
          <form onSubmit={handleCreateSeatKey} className="space-y-4 pt-2">
            <div>
              <label
                htmlFor="enterpriseOrgSelect"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Liên kết với Tổ chức Đối tác (Tùy chọn)
              </label>
              <Select
                value={newOrganizationId}
                onValueChange={(val) => {
                  const nextId = String(val ?? "");
                  setNewOrganizationId(nextId);
                  const found = partners.find((p) => p.id === nextId);
                  const nextPartnerName = found ? found.name : newPartnerName;
                  if (found) {
                    setNewPartnerName(found.name);
                  }
                  if (!isCustomSeatKey) {
                    const suffix = ensureKeySuffix();
                    setNewSeatKey(
                      buildEnterpriseKey(
                        found?.slug || nextPartnerName,
                        suffix,
                        Boolean(found?.slug),
                      ),
                    );
                  }
                }}
              >
                <Select.Trigger id="enterpriseOrgSelect" className="w-full text-xs">
                  <Select.Value placeholder="Không liên kết (Giấy phép độc lập)">
                    {(() => {
                      if (!newOrganizationId) return "Không liên kết (Giấy phép độc lập)";
                      const found = partners.find((p) => p.id === newOrganizationId);
                      return found ? found.name : newOrganizationId;
                    })()}
                  </Select.Value>
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="">Không liên kết (Giấy phép độc lập)</Select.Item>
                  {partners.map((p) => (
                    <Select.Item key={p.id} value={p.id}>
                      {p.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            <Input
              label="Tên Trường học / Doanh nghiệp Đối tác"
              type="text"
              value={newPartnerName}
              onChange={(e) => {
                const nextName = e.target.value;
                setNewPartnerName(nextName);
                const linked = partners.find((p) => p.id === newOrganizationId);
                if (!isCustomSeatKey && !linked?.slug) {
                  const suffix = ensureKeySuffix();
                  setNewSeatKey(buildEnterpriseKey(nextName, suffix, false));
                }
              }}
              placeholder="Ví dụ: Trường Đại học Bách Khoa TP.HCM"
              required
            />

            <Input
              label="Mã Enterprise Key (Tự động tạo)"
              type="text"
              value={newSeatKey}
              onChange={(e) => {
                const nextVal = e.target.value.toUpperCase();
                setNewSeatKey(nextVal);
                setIsCustomSeatKey(Boolean(nextVal.trim()));
              }}
              placeholder="Để trống hệ thống sẽ tự cấp (VD: STANFORD-ENT-7K4P)"
              helperText="Tự động sinh mã theo đối tác. Bấm nút xoay để đổi mã khác, sửa tay, hoặc để trống."
              className="font-mono tracking-wide"
              endAdornment={
                <IconButton
                  type="button"
                  size="xs"
                  variant="standard"
                  aria-label="Tạo mã Enterprise ngẫu nhiên mới"
                  title="Tạo mã mới"
                  onClick={handleRegenerateSeatKey}
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                </IconButton>
              }
            />

            <Input
              label="Tổng số suất học (Total Seats)"
              type="number"
              min={1}
              value={newTotalSeats}
              onChange={(e) => setNewTotalSeats(e.target.value)}
              className="font-mono"
              required
            />

            <Dialog.Footer className="pt-2">
              <Button
                type="button"
                variant="text"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                {"Hủy"}
              </Button>
              <Button type="submit" variant="filled" disabled={saving} size="sm">
                {"Xác nhận tạo Giấy phép"}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog>
    </>
  );
}
