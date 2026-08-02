"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService, type EnterpriseSeat } from "@/gen/identity/v1/identity_pb";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEnterpriseSeatsQuery } from "@/lib/query_hooks";
import { Plus, UserPlus, AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";

const columnHelper = createColumnHelper<EnterpriseSeat>();

export default function AdminEnterpriseDashboardPage() {
  const { isInstructorOrAdmin: isAdmin } = useAuth();

  const {
    data: seats = [],
    isLoading: loading,
    refetch: fetchEnterpriseSeats,
  } = useEnterpriseSeatsQuery();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals visibility
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form States
  const [targetUserId, setTargetUserId] = useState("");
  const [selectedSeatKey, setSelectedSeatKey] = useState("");

  const [newPartnerName, setNewPartnerName] = useState("");
  const [newSeatKey, setNewSeatKey] = useState("");

  // Dynamic stat calculations

  const totalUsedSeats = seats.reduce((sum, s) => {
    const match = s.assignedUserId?.match(/^(\d+)\/(\d+)/);
    return sum + (match ? parseInt(match[1], 10) : 0);
  }, 0);

  const totalCapacitySeats = seats.reduce((sum, s) => {
    const match = s.assignedUserId?.match(/^(\d+)\/(\d+)/);
    return sum + (match ? parseInt(match[2], 10) : 500);
  }, 0);

  const activationRate =
    totalCapacitySeats > 0 ? ((totalUsedSeats / totalCapacitySeats) * 100).toFixed(1) : "0.0";

  const columns = useMemo(
    () => [
      columnHelper.accessor("partnerName", {
        header: "Đối Tác Doanh Nghiệp",
        cell: (info) => info.getValue() || "N/A",
      }),
      columnHelper.accessor("seatKey", {
        header: "Mã Suất Học (License Key)",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("assignedUserId", {
        header: "Học Viên / Tỷ Lệ Kích Hoạt",
        cell: (info) => info.getValue() || "Chưa gán",
      }),
      columnHelper.accessor("status", {
        header: "Trạng Thái Giấy Phép",
        cell: (info) => info.getValue() || "Sẵn sàng",
      }),
    ],
    [],
  );

  // eslint-disable-next-library
  const table = useReactTable({
    data: seats,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Handlers
  const handleAssignSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim() || !selectedSeatKey.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const client = getRpcClient(IdentityService);
      const res = await client.assignEnterpriseSeat({
        userId: targetUserId,
        enterpriseSeatKey: selectedSeatKey,
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
    if (!newPartnerName.trim() || !newSeatKey.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const client = getRpcClient(IdentityService);
      await client.createEnterpriseSeat({
        partnerName: newPartnerName,
        seatKey: newSeatKey,
      });

      setMessage({
        type: "success",
        text: `Đã cấp mã Enterprise mới cho ${newPartnerName} thành công!`,
      });
      setShowCreateModal(false);
      setNewPartnerName("");
      setNewSeatKey("");
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
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span aria-live="polite" className="text-sm font-medium">
            Đang tải bảng điều khiển Enterprise Admin…
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Title Banner */}
        <div className="bg-primary text-primary-foreground rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/10 dark:bg-white/10 text-primary-foreground border border-primary-foreground/20 backdrop-blur-md">
                Admin Enterprise Portal
              </span>
              {isAdmin && (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-warning/20 text-warning-foreground border border-warning/30">
                  Super Admin
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
              Quản trị Suất học Enterprise & Đối tác Doanh nghiệp
            </h1>
            <p className="text-sm opacity-80 max-w-2xl">
              Quản lý danh sách giấy phép tài trợ học tập (Enterprise Seat Licenses), gán suất học
              trực tiếp cho tài khoản học viên và theo dõi chỉ số kích hoạt.
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="outline"
                className="w-full sm:w-auto border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
                <span>Tạo Mã Enterprise Mới</span>
              </Button>

              <Button
                onClick={() => setShowAssignModal(true)}
                variant="secondary"
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
            <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>
              Lưu ý: Bạn đang đăng nhập với tài khoản không có quyền Admin đầy đủ. Tính năng khởi
              tạo và gán suất học yêu cầu tài khoản Quản trị viên hệ thống (Super Admin).
            </span>
          </div>
        )}

        {/* Notification Toast */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-md transition-all ${
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMessage(null)}
              aria-label="Đóng thông báo"
              className="h-6 w-6 opacity-60 hover:opacity-100"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        )}

        {/* Dynamic KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tổng Mã Enterprise
            </span>
            <div className="text-3xl font-extrabold text-primary font-mono">{seats.length}</div>
            <p className="text-xs text-muted-foreground">Giấy phép tài trợ đang lưu hành</p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Trạng thái Hoạt động
            </span>
            <div className="text-3xl font-extrabold text-success font-mono">
              {seats.filter((s) => s.status === "ACTIVE").length} / {seats.length}
            </div>
            <p className="text-xs text-muted-foreground">Gói doanh nghiệp đang kích hoạt</p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Suất học Đã kích hoạt
            </span>
            <div className="text-3xl font-extrabold text-info font-mono">
              {totalUsedSeats} / {totalCapacitySeats}
            </div>
            <p className="text-xs text-muted-foreground">Số suất học viên đã nhận tài trợ</p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tỷ lệ Kích hoạt Seats
            </span>
            <div className="text-3xl font-extrabold text-accent-foreground font-mono">
              {activationRate}%
            </div>
            <p className="text-xs text-muted-foreground">Hiệu suất sử dụng suất học tài trợ</p>
          </div>
        </div>

        {/* Enterprise Seat Keys Table */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h2 className="text-lg font-extrabold text-foreground">
                Danh sách Giấy phép Suất học Doanh nghiệp (Enterprise Seat Keys)
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
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {seats.map((seat) => (
                  <TableRow key={seat.id}>
                    <TableCell className="font-bold">{seat.partnerName}</TableCell>
                    <TableCell className="font-mono font-bold text-primary">
                      {seat.seatKey}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{seat.assignedUserId}</TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                        {seat.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedSeatKey(seat.seatKey);
                          setShowAssignModal(true);
                        }}
                      >
                        Gán học viên
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      {/* Modal: Gán Suất học cho Học viên */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Gán Suất học Enterprise"
        size="md"
      >
        <form onSubmit={handleAssignSeat} className="space-y-4">
          <Input
            label="Mã Học viên (User ID)"
            type="text"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="Ví dụ: user-learner-demo"
            className="font-mono"
            required
          />

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Chọn Mã Enterprise Key
            </label>
            <Select
              value={selectedSeatKey}
              onValueChange={(val) => {
                if (val) setSelectedSeatKey(val as string);
              }}
            >
              <SelectTrigger className="w-full font-mono font-semibold">
                <SelectValue placeholder="Chọn Mã Enterprise Key">
                  {(() => {
                    const s = seats.find((seat) => seat.seatKey === selectedSeatKey);
                    return s ? `${s.partnerName} (${s.seatKey})` : selectedSeatKey;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {seats.map((s) => (
                  <SelectItem key={s.id} value={s.seatKey}>
                    {`${s.partnerName} (${s.seatKey})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowAssignModal(false)}
            >
              Hủy
            </Button>
            <Button type="submit" isLoading={saving} size="sm">
              Kích hoạt gán suất học
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Tạo Mã Enterprise Key Mới */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo Mã Enterprise Mới"
        size="md"
      >
        <form onSubmit={handleCreateSeatKey} className="space-y-4">
          <Input
            label="Tên Trường học / Doanh nghiệp Đối tác"
            type="text"
            value={newPartnerName}
            onChange={(e) => setNewPartnerName(e.target.value)}
            placeholder="Ví dụ: Trường Đại học Bách Khoa TP.HCM"
            required
          />

          <Input
            label="Mã Enterprise Key"
            type="text"
            value={newSeatKey}
            onChange={(e) => setNewSeatKey(e.target.value)}
            placeholder="Ví dụ: BKTPHCM-ENTERPRISE-2026"
            className="font-mono"
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              Hủy
            </Button>
            <Button type="submit" isLoading={saving} size="sm">
              Xác nhận tạo Giấy phép
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
