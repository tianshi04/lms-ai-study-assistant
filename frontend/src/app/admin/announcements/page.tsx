"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Sparkles,
  Send,
  Ban,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  AnnouncementSeverity,
  AnnouncementStatus,
  type SystemAnnouncement,
} from "@/gen/notification/v1/notification_pb";
import {
  useActiveAnnouncementsQuery,
  useSystemAnnouncementsQuery,
  useCreateSystemAnnouncementMutation,
  useCancelSystemAnnouncementMutation,
  useExpireSystemAnnouncementMutation,
} from "@/lib/query_hooks";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Table } from "@/components/ui/Table";
import { Surface } from "@/components/ui/Surface";
import { Dialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/ui/LayoutPrimitives";
import { AnnouncementBannerStyle } from "@/components/notification/AnnouncementBanner";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

const PAGE_SIZE = 20;

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLocalInputPreview(localValue: string): string {
  if (!localValue) return "—";
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDateTime(d.toISOString());
}

function isBannerStillActive(
  ann: SystemAnnouncement,
  activeIds: Set<string>,
  recentlyExpiredIds: Set<string>,
  nowMs: number,
): boolean {
  if (ann.status !== AnnouncementStatus.SENT && ann.status !== AnnouncementStatus.SENDING) {
    return false;
  }
  if (recentlyExpiredIds.has(ann.id)) return false;
  if (activeIds.has(ann.id)) return true;
  if (activeIds.size < 3 || nowMs <= 0) return false;
  const expiresMs = Date.parse(ann.expiresAt);
  return !Number.isNaN(expiresMs) && expiresMs > nowMs;
}

function StatusBadge({
  status,
  isBannerActive,
}: {
  status: AnnouncementStatus;
  isBannerActive: boolean;
}) {
  switch (status) {
    case AnnouncementStatus.SCHEDULED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          Đã lên lịch
        </span>
      );
    case AnnouncementStatus.SENDING:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/30">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          Đang gửi
        </span>
      );
    case AnnouncementStatus.SENT:
      return isBannerActive ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Đang hiển thị
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
          Đã ẩn banner
        </span>
      );
    case AnnouncementStatus.CANCELLED:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
          Đã huỷ
        </span>
      );
    default:
      return null;
  }
}

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const { isSuperAdmin } = useAuth();
  const toast = useToast();
  const isMobile = useIsMobile();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [severity, setSeverity] = useState<AnnouncementSeverity>(AnnouncementSeverity.WARNING);
  const [scheduleMode, setScheduleMode] = useState<"NOW" | "LATER">("NOW");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [expiresAtLocal, setExpiresAtLocal] = useState("");
  const [nowMs, setNowMs] = useState(0);
  const [alsoNotifyBell, setAlsoNotifyBell] = useState(true);
  const [isCritical, setIsCritical] = useState(false);

  const [page, setPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SystemAnnouncement | null>(null);
  const [expireTarget, setExpireTarget] = useState<SystemAnnouncement | null>(null);
  const [recentlyExpiredIds, setRecentlyExpiredIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      const now = Date.now();
      setNowMs(now);
      setStartsAtLocal((prev) => prev || toLocalDatetimeInputValue(new Date(now + 30 * 60 * 1000)));
      setExpiresAtLocal(
        (prev) => prev || toLocalDatetimeInputValue(new Date(now + 2 * 60 * 60 * 1000)),
      );
    }, 0);
    const tick = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(tick);
    };
  }, []);

  const { data: activeAnnouncements = [], refetch: refetchActive } = useActiveAnnouncementsQuery();
  const activeIds = new Set(activeAnnouncements.map((a) => a.id));
  const { data, isLoading, refetch } = useSystemAnnouncementsQuery(page, PAGE_SIZE);
  const createMutation = useCreateSystemAnnouncementMutation();
  const cancelMutation = useCancelSystemAnnouncementMutation();
  const expireMutation = useExpireSystemAnnouncementMutation();

  if (!isSuperAdmin) {
    return <div className="p-12 text-center text-destructive font-bold">Từ chối truy cập</div>;
  }

  const applyMaintenanceTemplate = () => {
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    setTitle("Thông báo bảo trì hệ thống định kỳ");
    setContent(
      `Hệ thống sẽ tạm dừng để bảo trì và nâng cấp từ ${fmt(start)} đến ${fmt(end)}. Vui lòng lưu lại tiến trình học tập trước thời điểm trên.`,
    );
    setSeverity(AnnouncementSeverity.WARNING);
    setAlsoNotifyBell(true);
    setExpiresAtLocal(toLocalDatetimeInputValue(end));
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề thông báo");
      return;
    }
    if (scheduleMode === "LATER") {
      if (!startsAtLocal || Number.isNaN(new Date(startsAtLocal).getTime())) {
        toast.error("Vui lòng chọn thời điểm bắt đầu phát hợp lệ");
        return;
      }
    }
    if (!expiresAtLocal || Number.isNaN(new Date(expiresAtLocal).getTime())) {
      toast.error("Vui lòng chọn thời điểm kết thúc hiển thị hợp lệ");
      return;
    }
    const cleanUrl = actionUrl.trim();
    if (
      cleanUrl &&
      !((cleanUrl.startsWith("/") && !cleanUrl.startsWith("//")) || cleanUrl.startsWith("https://"))
    ) {
      toast.error("Liên kết phải bắt đầu bằng '/' hoặc 'https://'");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmCreate = async () => {
    try {
      const startsAtIso =
        scheduleMode === "LATER" && startsAtLocal ? new Date(startsAtLocal).toISOString() : "";
      const expiresAtIso = new Date(expiresAtLocal).toISOString();

      await createMutation.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        actionUrl: actionUrl.trim(),
        severity,
        startsAt: startsAtIso,
        expiresAt: expiresAtIso,
        alsoNotifyBell,
        isCritical: alsoNotifyBell ? isCritical : false,
      });

      setConfirmOpen(false);
      setTitle("");
      setContent("");
      setActionUrl("");
      setIsCritical(false);
      setPage(1);
      await Promise.all([refetch(), refetchActive()]);
      toast.success(
        scheduleMode === "NOW"
          ? "Đã phát thông báo toàn hệ thống!"
          : "Đã lên lịch thông báo thành công!",
      );
    } catch (err: unknown) {
      toast.error((err as Error).message || "Không thể tạo thông báo");
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget.id);
      setCancelTarget(null);
      refetch();
      toast.success("Đã huỷ thông báo đã lên lịch");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Không thể huỷ thông báo");
    }
  };

  const handleConfirmExpire = async () => {
    if (!expireTarget) return;
    const expiredId = expireTarget.id;
    try {
      await expireMutation.mutateAsync(expiredId);
      setRecentlyExpiredIds((prev) => {
        const next = new Set(prev);
        next.add(expiredId);
        return next;
      });
      setNowMs(Date.now());
      setExpireTarget(null);
      await Promise.all([refetch(), refetchActive()]);
      toast.success("Đã gỡ banner khỏi toàn bộ trang");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Không thể gỡ banner");
    }
  };

  const announcements = data?.announcements ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <PageHeader>
          <div className="space-y-1">
            <PageHeader.Title>Thông báo Toàn Hệ thống</PageHeader.Title>
            <PageHeader.Description>
              Phát thông báo bảo trì, nâng cấp hoặc tin quan trọng tới toàn bộ người dùng qua Banner
              đầu trang và Chuông thông báo.
            </PageHeader.Description>
          </div>
          <PageHeader.Actions>
            <Button variant="text" size="sm" onClick={() => router.push("/admin/dashboard")}>
              &larr; Quay lại Bảng điều khiển
            </Button>
          </PageHeader.Actions>
        </PageHeader>

        {/* Compose + Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Surface variant="low" shape="2xl" className="p-6 lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Megaphone className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Soạn thông báo mới</h2>
              </div>
              <Button type="button" variant="outlined" size="sm" onClick={applyMaintenanceTemplate}>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Mẫu thông báo bảo trì</span>
              </Button>
            </div>

            <form onSubmit={handleOpenConfirm} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="ann-title" className="text-sm font-medium text-foreground">
                    Tiêu đề <span className="text-destructive">*</span>
                  </label>
                  <span className="text-xs text-muted-foreground">{title.length}/150</span>
                </div>
                <Input
                  id="ann-title"
                  maxLength={150}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Hệ thống bảo trì định kỳ lúc 22:00 ngày 20/11"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="ann-content" className="text-sm font-medium text-foreground">
                    Nội dung chi tiết
                  </label>
                  <span className="text-xs text-muted-foreground">{content.length}/1000</span>
                </div>
                <Textarea
                  id="ann-content"
                  rows={3}
                  maxLength={1000}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Mô tả thời gian dự kiến, phạm vi ảnh hưởng và khuyến nghị cho người học..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <fieldset>
                  <legend className="block text-sm font-medium text-foreground mb-1">
                    Mức độ hiển thị
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: AnnouncementSeverity.INFO, label: "Thông tin" },
                      { id: AnnouncementSeverity.WARNING, label: "Cảnh báo" },
                      { id: AnnouncementSeverity.CRITICAL, label: "Khẩn cấp" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSeverity(opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                          severity === opt.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-surface-container text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label
                    htmlFor="ann-url"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    Liên kết đính kèm (tuỳ chọn)
                  </label>
                  <Input
                    id="ann-url"
                    maxLength={500}
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="/courses hoặc https://status.example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <fieldset>
                  <legend className="block text-sm font-medium text-foreground mb-1">
                    Thời điểm phát
                  </legend>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setScheduleMode("NOW")}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        scheduleMode === "NOW"
                          ? "bg-primary/15 text-primary border-primary/40"
                          : "bg-surface-container text-muted-foreground border-border"
                      }`}
                    >
                      Phát ngay
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleMode("LATER")}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        scheduleMode === "LATER"
                          ? "bg-primary/15 text-primary border-primary/40"
                          : "bg-surface-container text-muted-foreground border-border"
                      }`}
                    >
                      Hẹn giờ
                    </button>
                  </div>
                  {scheduleMode === "LATER" && (
                    <Input
                      id="ann-starts"
                      aria-label="Thời gian bắt đầu phát"
                      type="datetime-local"
                      value={startsAtLocal}
                      onChange={(e) => setStartsAtLocal(e.target.value)}
                      required
                    />
                  )}
                </fieldset>

                <div>
                  <label
                    htmlFor="ann-expires"
                    className="block text-sm font-medium text-foreground mb-1"
                  >
                    Hiển thị banner đến <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="ann-expires"
                    type="datetime-local"
                    value={expiresAtLocal}
                    onChange={(e) => setExpiresAtLocal(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Sau thời điểm này banner sẽ tự động ẩn trên mọi trang.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-border">
                <div className="flex items-start gap-3">
                  <input
                    id="ann-notify-bell"
                    type="checkbox"
                    checked={alsoNotifyBell}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAlsoNotifyBell(checked);
                      if (!checked) setIsCritical(false);
                    }}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="ann-notify-bell" className="cursor-pointer select-none">
                    <span className="block text-sm font-semibold text-foreground">
                      Đồng thời gửi vào Chuông thông báo của toàn bộ người dùng
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Tạo thông báo trong Trung tâm thông báo để người dùng đọc lại sau.
                    </span>
                  </label>
                </div>

                {alsoNotifyBell && (
                  <div className="flex items-start gap-3 pl-7">
                    <input
                      id="ann-is-critical"
                      type="checkbox"
                      checked={isCritical}
                      onChange={(e) => setIsCritical(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-destructive focus:ring-destructive cursor-pointer"
                    />
                    <label htmlFor="ann-is-critical" className="cursor-pointer select-none">
                      <span className="block text-sm font-semibold text-foreground">
                        Thông báo khẩn (bỏ qua cài đặt tắt thông báo của người dùng)
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Chỉ bật cho các đợt bảo trì hoặc sự cố ảnh hưởng trực tiếp tới việc học.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {scheduleMode === "NOW" ? "Xem lại & Phát thông báo" : "Xem lại & Lên lịch"}
                  </span>
                </Button>
              </div>
            </form>
          </Surface>

          {/* Live Preview */}
          <Surface variant="low" shape="2xl" className="p-6 lg:col-span-5 space-y-5">
            <h2 className="text-lg font-bold text-foreground">Xem trước hiển thị</h2>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Banner trên đầu mọi trang
              </p>
              <div className="rounded-2xl overflow-hidden border border-border shadow-2xs">
                <AnnouncementBannerStyle
                  severity={severity}
                  title={title.trim() || "Tiêu đề thông báo sẽ hiển thị tại đây"}
                  content={
                    content.trim() || "Nội dung mô tả ngắn gọn (ví dụ khung giờ bảo trì hệ thống)."
                  }
                  actionUrl={actionUrl.trim() || undefined}
                />
                <div className="bg-card px-4 py-5 text-xs text-muted-foreground text-center">
                  Nội dung trang web bên dưới thanh banner…
                </div>
              </div>
            </div>

            {alsoNotifyBell && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  2. Trong Chuông thông báo (/notifications)
                </p>
                <div className="p-4 rounded-2xl bg-card border border-border flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Thông báo hệ thống
                      </span>
                      {isCritical && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                          Khẩn cấp
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-sm text-foreground mt-1">
                      {title.trim() || "Tiêu đề thông báo"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      {content.trim() || "Nội dung chi tiết của thông báo…"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Surface>
        </div>

        {/* History Table */}
        <Surface variant="low" shape="2xl" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Lịch sử thông báo hệ thống ({total})
            </h2>
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
              <span>Đang tải lịch sử thông báo…</span>
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Chưa có thông báo hệ thống nào được tạo.
            </div>
          ) : (
            <>
              {isMobile ? (
                <div className="space-y-3">
                  {announcements.map((ann) => {
                    const canCancel = ann.status === AnnouncementStatus.SCHEDULED;
                    const canExpire = isBannerStillActive(
                      ann,
                      activeIds,
                      recentlyExpiredIds,
                      nowMs,
                    );
                    return (
                      <div
                        key={ann.id}
                        className="p-4 rounded-2xl bg-card border border-border space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-foreground break-words">
                              {ann.title}
                            </p>
                            {ann.content && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {ann.content}
                              </p>
                            )}
                          </div>
                          <StatusBadge status={ann.status} isBannerActive={canExpire} />
                        </div>

                        <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground pt-2 border-t border-border/60">
                          <div>Từ: {formatDateTime(ann.startsAt)}</div>
                          <div>Đến: {formatDateTime(ann.expiresAt)}</div>
                          <div>
                            Chuông:{" "}
                            {ann.alsoNotifyBell ? (
                              <span className="font-semibold text-foreground">
                                {ann.recipientCount} người nhận
                              </span>
                            ) : (
                              <span>Chỉ banner</span>
                            )}
                          </div>
                        </div>

                        {(canCancel || canExpire) && (
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                            {canCancel && (
                              <Button
                                type="button"
                                variant="outlined"
                                size="sm"
                                onClick={() => setCancelTarget(ann)}
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              >
                                <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Huỷ lịch</span>
                              </Button>
                            )}
                            {canExpire && (
                              <Button
                                type="button"
                                variant="outlined"
                                size="sm"
                                onClick={() => setExpireTarget(ann)}
                                className="text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
                              >
                                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Gỡ banner</span>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Thông báo</Table.Head>
                      <Table.Head>Trạng thái</Table.Head>
                      <Table.Head>Hiệu lực Banner</Table.Head>
                      <Table.Head>Chuông</Table.Head>
                      <Table.Head className="text-right">Thao tác</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {announcements.map((ann) => {
                      const canCancel = ann.status === AnnouncementStatus.SCHEDULED;
                      const canExpire = isBannerStillActive(
                        ann,
                        activeIds,
                        recentlyExpiredIds,
                        nowMs,
                      );
                      return (
                        <Table.Row key={ann.id} className="align-top">
                          <Table.Cell className="max-w-md">
                            <p className="font-bold text-foreground">{ann.title}</p>
                            {ann.content && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {ann.content}
                              </p>
                            )}
                          </Table.Cell>
                          <Table.Cell className="whitespace-nowrap">
                            <StatusBadge status={ann.status} isBannerActive={canExpire} />
                          </Table.Cell>
                          <Table.Cell className="text-xs text-muted-foreground whitespace-nowrap">
                            <div>Từ: {formatDateTime(ann.startsAt)}</div>
                            <div>Đến: {formatDateTime(ann.expiresAt)}</div>
                          </Table.Cell>
                          <Table.Cell className="text-xs whitespace-nowrap">
                            {ann.alsoNotifyBell ? (
                              <span className="font-semibold text-foreground">
                                {ann.recipientCount} người nhận
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Chỉ banner</span>
                            )}
                          </Table.Cell>
                          <Table.Cell className="text-right whitespace-nowrap">
                            {canCancel && (
                              <Button
                                type="button"
                                variant="outlined"
                                size="sm"
                                onClick={() => setCancelTarget(ann)}
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              >
                                <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Huỷ lịch</span>
                              </Button>
                            )}
                            {canExpire && (
                              <Button
                                type="button"
                                variant="outlined"
                                size="sm"
                                onClick={() => setExpireTarget(ann)}
                                className="text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
                              >
                                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Gỡ banner</span>
                              </Button>
                            )}
                            {!canCancel && !canExpire && ann.status === AnnouncementStatus.SENT && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Đã gỡ banner</span>
                              </span>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-muted-foreground">
                  <span>
                    Trang {page} / {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outlined"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      <span>Trước</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outlined"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <span>Sau</span>
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Surface>
      </div>

      {/* Confirm Dispatch Dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmOpen(false);
        }}
      >
        <Dialog.Content size="sm">
          <Dialog.Header>
            <Dialog.Icon className="bg-primary/10 text-primary">
              <Megaphone className="w-6 h-6" aria-hidden="true" />
            </Dialog.Icon>
            <Dialog.Title>Xác nhận phát thông báo</Dialog.Title>
            <Dialog.Description>
              {scheduleMode === "NOW"
                ? "Thông báo sẽ hiển thị ngay lập tức trên thanh Banner toàn hệ thống"
                : `Thông báo sẽ tự động hiển thị vào lúc ${formatLocalInputPreview(startsAtLocal)}`}
              {alsoNotifyBell ? " và được gửi tới Chuông thông báo của toàn bộ người dùng." : "."}
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="text" onClick={() => setConfirmOpen(false)}>
              Quay lại sửa
            </Button>
            <Button onClick={handleConfirmCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Đang xử lý…" : "Xác nhận phát"}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      {/* Confirm Cancel Scheduled Announcement Dialog */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <Dialog.Content size="sm">
          <Dialog.Header>
            <Dialog.Icon className="bg-error/10 text-error">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </Dialog.Icon>
            <Dialog.Title>Huỷ thông báo đã lên lịch</Dialog.Title>
            <Dialog.Description>
              Bạn có chắc chắn muốn huỷ thông báo &ldquo;{cancelTarget?.title}&rdquo;? Thông báo sẽ
              không còn được hiển thị hay gửi tới người dùng.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="text" onClick={() => setCancelTarget(null)}>
              Đóng
            </Button>
            <Button
              variant="filled"
              className="bg-error text-on-error hover:bg-error/90"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
            >
              Huỷ thông báo
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      {/* Confirm Early Banner Removal Dialog */}
      <Dialog
        open={!!expireTarget}
        onOpenChange={(open) => {
          if (!open) setExpireTarget(null);
        }}
      >
        <Dialog.Content size="sm">
          <Dialog.Header>
            <Dialog.Icon className="bg-amber-500/15 text-amber-600">
              <EyeOff className="w-6 h-6" aria-hidden="true" />
            </Dialog.Icon>
            <Dialog.Title>Gỡ banner khỏi toàn hệ thống</Dialog.Title>
            <Dialog.Description>
              Banner &ldquo;{expireTarget?.title}&rdquo; sẽ ẩn ngay lập tức trên mọi trang. Các
              thông báo đã gửi vào chuông của người dùng vẫn được giữ trong lịch sử.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="text" onClick={() => setExpireTarget(null)}>
              Đóng
            </Button>
            <Button onClick={handleConfirmExpire} disabled={expireMutation.isPending}>
              {expireMutation.isPending ? "Đang gỡ…" : "Gỡ banner ngay"}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
