"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Settings, ArrowRight, Loader2 } from "lucide-react";
import {
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from "@/lib/query_hooks";
import { NotificationItem } from "./NotificationItem";
import { NotificationPreferencesModal } from "./NotificationPreferencesModal";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnreadCountQuery();
  const { data, isLoading } = useNotificationsQuery(undefined, false, 5);
  const markAsReadMutation = useMarkAsReadMutation();
  const markAllAsReadMutation = useMarkAllAsReadMutation();

  const notifications = data?.notifications || [];

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate([id]);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(undefined);
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          type="button"
          className="relative p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          aria-label={`Thông báo (${unreadCount} chưa đọc)`}
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-primary-foreground bg-primary rounded-full animate-in zoom-in-50 shadow-md">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </PopoverTrigger>

        <PopoverContent align="end" sideOffset={12}>
          {/* Crisp MD3 Popover Header */}
          <div className="p-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-lowest">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-on-surface">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending || unreadCount === 0}
                  className="px-3 py-1.5 rounded-full text-xs font-bold text-primary hover:bg-primary-container/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-bold">Đọc tất cả</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsPrefModalOpen(true);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                title="Cài đặt thông báo"
                aria-label="Cài đặt thông báo"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Scrollable Notifications List - Hidden Scrollbar */}
          <div className="max-h-[380px] overflow-y-auto scrollbar-none p-3 space-y-2 bg-surface-container-lowest">
            {isLoading ? (
              <div className="py-10 flex justify-center items-center text-on-surface-variant">
                <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <Bell
                  className="w-10 h-10 text-on-surface-variant/30 mx-auto mb-2"
                  aria-hidden="true"
                />
                <p className="text-sm font-bold text-on-surface">Không có thông báo mới</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Bạn đã cập nhật tất cả thông tin mới nhất!
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  compact={true}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))
            )}
          </div>

          {/* Full Primary Capsule Button Footer */}
          <div className="p-3 border-t border-outline-variant/40 bg-surface-container-lowest text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-2 text-xs font-bold bg-primary hover:bg-primary-hover text-on-primary transition-all w-full py-2.5 rounded-full shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98]"
            >
              <span>Xem tất cả thông báo</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
      />
    </>
  );
}
