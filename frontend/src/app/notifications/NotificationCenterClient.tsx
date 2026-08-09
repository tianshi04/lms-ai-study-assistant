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
  Shield,
  Inbox,
} from "lucide-react";
import { NotificationItem } from "@/components/notification/NotificationItem";
import { NotificationPreferencesModal } from "@/components/notification/NotificationPreferencesModal";
import { Button } from "@/components/ui/Button";
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
      icon: Inbox,
    },
    {
      id: NotificationCategory.SYSTEM,
      label: "Hệ thống",
      icon: Shield,
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
    <div className="min-h-screen bg-surface text-on-surface py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-surface-container-low border border-outline-variant/40 shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-2xs">
              <Bell className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">
                  Trung tâm Thông báo
                </h1>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>
              <p className="text-sm text-on-surface-variant mt-0.5">
                Cập nhật thông tin học tập, diễn đàn, chứng chỉ và kết quả xét duyệt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="outlined"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="rounded-full text-xs font-bold bg-surface-container-high text-primary hover:bg-primary-container/40 border border-outline-variant/40"
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
              type="button"
              variant="outlined"
              onClick={() => setIsPrefModalOpen(true)}
              className="rounded-full text-xs font-bold bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/40"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span>Cài đặt</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <Button
                  key={cat.id}
                  type="button"
                  variant={isSelected ? "filled" : "text"}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full text-xs font-bold whitespace-nowrap ${
                    isSelected
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container-low text-on-surface-variant border border-outline-variant/40 hover:text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  <IconComp className="w-4 h-4" aria-hidden="true" />
                  <span>{cat.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Unread Only MD3 Filter Chip */}
          <Button
            type="button"
            variant="outlined"
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`rounded-full text-xs font-bold whitespace-nowrap select-none self-end md:self-auto ${
              unreadOnly
                ? "bg-primary-container text-on-primary-container border-primary/40 shadow-2xs"
                : "bg-surface-container-low text-on-surface-variant border-outline-variant/40 hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            <Filter
              className={`w-3.5 h-3.5 ${unreadOnly ? "text-primary font-extrabold" : "text-on-surface-variant"}`}
              aria-hidden="true"
            />
            <span>Chỉ xem chưa đọc</span>
            {unreadCount > 0 && (
              <span
                className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full transition-colors ${
                  unreadOnly
                    ? "bg-primary text-on-primary"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </Button>
        </div>

        {/* Notifications Grid List */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-low border border-outline-variant/40 rounded-3xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" aria-hidden="true" />
            <p className="text-sm font-bold">Đang tải danh sách thông báo…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center px-4 bg-surface-container-low border border-outline-variant/40 rounded-3xl shadow-2xs">
            <div className="w-16 h-16 rounded-3xl bg-primary-container text-on-primary-container flex items-center justify-center mx-auto mb-4 shadow-2xs">
              <Bell className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-extrabold text-on-surface">Không tìm thấy thông báo</h3>
            <p className="text-sm text-on-surface-variant max-w-sm mx-auto mt-1">
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
