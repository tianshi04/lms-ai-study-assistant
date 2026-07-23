"use client";

import { useState, useSyncExternalStore, useMemo } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, createColumnHelper } from "@tanstack/react-table";
import { getRpcClient } from "@/lib/connect_client";
import { IdentityService, type EnterpriseSeat } from "@/gen/identity/v1/identity_pb";
import { Navbar } from "@/components/layout/Navbar";
import { useEnterpriseSeatsQuery } from "@/lib/query_hooks";

const emptySubscribe = () => () => {};

const columnHelper = createColumnHelper<EnterpriseSeat>();

export default function AdminEnterpriseDashboardPage() {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const { data: seats = [], isLoading: loading, refetch: fetchEnterpriseSeats } = useEnterpriseSeatsQuery();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals visibility
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form States
  const [targetUserId, setTargetUserId] = useState("user-learner-demo");
  const [selectedSeatKey, setSelectedSeatKey] = useState("");
  
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newSeatKey, setNewSeatKey] = useState("");

  // Authorization Check (Role 4: Super Admin, Role 5: Partner Admin)
  const userRole = isMounted && typeof window !== "undefined" ? localStorage.getItem("user_role") : null;
  const isAdmin = userRole === "4" || userRole === "5";

  // Dynamic stat calculations
  const totalUsedSeats = seats.reduce((sum, s) => {
    const match = s.assignedUserId?.match(/^(\d+)\/(\d+)/);
    return sum + (match ? parseInt(match[1], 10) : 0);
  }, 0);

  const totalCapacitySeats = seats.reduce((sum, s) => {
    const match = s.assignedUserId?.match(/^(\d+)\/(\d+)/);
    return sum + (match ? parseInt(match[2], 10) : 500);
  }, 0);

  const activationRate = totalCapacitySeats > 0 ? ((totalUsedSeats / totalCapacitySeats) * 100).toFixed(1) : "0.0";

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
    []
  );

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

      setMessage({ type: "success", text: `Đã cấp mã Enterprise mới cho ${newPartnerName} thành công!` });
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Đang tải bảng điều khiển Enterprise Admin...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Title Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/20 backdrop-blur-md">
                Admin Enterprise Portal
              </span>
              {userRole === "4" ? (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Super Admin
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Partner Admin
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Quản trị Suất học Enterprise & Đối tác Doanh nghiệp
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Quản lý danh sách giấy phép tài trợ học tập (Enterprise Seat Licenses), gán suất học trực tiếp cho tài khoản học viên và theo dõi chỉ số kích hoạt.
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Tạo Mã Enterprise Mới</span>
              </button>

              <button
                onClick={() => setShowAssignModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Gán Suất học cho Học viên</span>
              </button>
            </div>
          )}
        </div>

        {/* Access Guard Notice */}
        {isMounted && !isAdmin && (
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              Lưu ý: Bạn đang đăng nhập với tài khoản không có quyền Admin đầy đủ. Tính năng khởi tạo và gán suất học yêu cầu tài khoản Quản trị viên Doanh nghiệp (Partner Admin) hoặc Super Admin.
            </span>
          </div>
        )}

        {/* Notification Toast */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-md transition-all ${
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20"
                : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="p-1 rounded-md opacity-60 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Dynamic KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng Mã Enterprise</span>
            <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
              {seats.length}
            </div>
            <p className="text-xs text-slate-500">Giấy phép tài trợ đang lưu hành</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Trạng thái Hoạt động</span>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {seats.filter((s) => s.status === "ACTIVE").length} / {seats.length}
            </div>
            <p className="text-xs text-slate-500">Gói doanh nghiệp đang kích hoạt</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Suất học Đã kích hoạt</span>
            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              {totalUsedSeats} / {totalCapacitySeats}
            </div>
            <p className="text-xs text-slate-500">Số suất học viên đã nhận tài trợ</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tỷ lệ Kích hoạt Seats</span>
            <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
              {activationRate}%
            </div>
            <p className="text-xs text-slate-500">Hiệu suất sử dụng suất học tài trợ</p>
          </div>
        </div>

        {/* Enterprise Seat Keys Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Danh sách Giấy phép Suất học Doanh nghiệp (Enterprise Seat Keys)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Các tổ chức, trường đại học và doanh nghiệp đang liên kết cấp quyền học miễn phí cho nhân sự / học viên.
              </p>
            </div>
          </div>

          {seats.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <p className="text-sm font-semibold">Chưa có Mã Enterprise nào trên hệ thống</p>
              <p className="text-xs">Hãy bấm &quot;Tạo Mã Enterprise Mới&quot; để tạo gói tài trợ học tập đầu tiên.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="py-3 px-4">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {seats.map((seat) => (
                    <tr key={seat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {seat.partnerName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {seat.seatKey}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        {seat.assignedUserId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                          {seat.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedSeatKey(seat.seatKey);
                            setShowAssignModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          Gán học viên
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal: Gán Suất học cho Học viên */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Gán Suất học Enterprise</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAssignSeat} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mã Học viên (User ID)</label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Ví dụ: user-learner-demo"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Chọn Mã Enterprise Key</label>
                <select
                  value={selectedSeatKey}
                  onChange={(e) => setSelectedSeatKey(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono font-semibold"
                  required
                >
                  {seats.map((s) => (
                    <option key={s.id} value={s.seatKey}>
                      {s.partnerName} ({s.seatKey})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md hover:bg-indigo-500 transition-all disabled:opacity-50"
                >
                  {saving ? "Đang xử lý..." : "Kích hoạt gán suất học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tạo Mã Enterprise Key Mới */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Tạo Mã Enterprise Mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSeatKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tên Trường học / Doanh nghiệp Đối tác</label>
                <input
                  type="text"
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  placeholder="Ví dụ: Trường Đại học Bách Khoa TP.HCM"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mã Enterprise Key</label>
                <input
                  type="text"
                  value={newSeatKey}
                  onChange={(e) => setNewSeatKey(e.target.value)}
                  placeholder="Ví dụ: BKTPHCM-ENTERPRISE-2026"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-md hover:bg-indigo-500 transition-all disabled:opacity-50"
                >
                  {saving ? "Đang tạo..." : "Xác nhận tạo Giấy phép"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
