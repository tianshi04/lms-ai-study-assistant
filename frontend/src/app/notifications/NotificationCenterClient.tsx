"use client";

import { useState } from "react";
import {
  Bell,
  CheckCheck,
  Settings,
  Filter,
  Loader2,
  BookOpen,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NotificationItem } from "@/components/notification/NotificationItem";
import { NotificationPreferencesModal } from "@/components/notification/NotificationPreferencesModal";
import {
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from "@/lib/query_hooks";
import { NotificationCategory } from "@/gen/notification/v1/notification_pb";

export function NotificationCenterClient() {
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>(
    NotificationCategory.UNSPECIFIED,
  );
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnreadCountQuery();
  const { data, isLoading, refetch } = useNotificationsQuery(selectedCategory, unreadOnly, 30);

  const markAsReadMutation = useMarkAsReadMutation();
  const markAllAsReadMutation = useMarkAllAsReadMutation();

  const notifications = data?.notifications || [];

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate([id]);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(selectedCategory, {
      onSuccess: () => refetch(),
    });
  };

  const categories = [
    {
      id: NotificationCategory.UNSPECIFIED,
      label: "Tất cả",
      icon: Bell,
    },
    {
      id: NotificationCategory.SYSTEM,
      label: "Hệ thống",
      icon: Bell,
    },
    {
      id: NotificationCategory.ACADEMIC,
      label: "Học tập",
      icon: BookOpen,
    },
    {
      id: NotificationCategory.COMMUNITY,
      label: "Diễn đàn",
      icon: MessageSquare,
    },
    {
      id: NotificationCategory.ANNOUNCEMENT,
      label: "Thông báo",
      icon: Megaphone,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <Bell className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Trung tâm Thông báo
                </h1>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Cập nhật thông tin học tập, diễn đàn, chứng chỉ và kết quả xét duyệt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="flex items-center gap-1.5 rounded-xl border-border hover:bg-muted"
              >
                {markAllAsReadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                )}
                <span>Đánh dấu tất cả đã đọc</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrefModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border-border hover:bg-muted"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span>Cài đặt</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Unread Only Switch */}
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer select-none self-end md:self-auto bg-card border border-border px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>Chỉ xem chưa đọc</span>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer ml-1"
            />
          </label>
        </div>

        {/* Notifications Grid List */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground bg-card border border-border rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" aria-hidden="true" />
            <p className="text-sm font-medium">Đang tải danh sách thông báo...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center px-4 bg-card border border-border rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Bell className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Không tìm thấy thông báo</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
              {unreadOnly
                ? "Bạn không có thông báo chưa đọc nào trong danh mục này."
                : "Danh sách thông báo hiện đang trống."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <NotificationItem
                key={item.id}
                item={item}
                compact={false}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
      />
    </div>
  );
}
