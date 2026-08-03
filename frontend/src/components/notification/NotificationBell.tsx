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
          className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          aria-label={`Thông báo (${unreadCount} chưa đọc)`}
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-primary-foreground bg-primary rounded-full animate-in zoom-in-50 shadow-md">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </PopoverTrigger>

        <PopoverContent align="end" sideOffset={8}>
          {/* Popover Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                  className="p-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Đọc tất cả</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsPrefModalOpen(true);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Cài đặt thông báo"
                aria-label="Cài đặt thông báo"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-2">
            {isLoading ? (
              <div className="py-8 flex justify-center items-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center px-4">
                <Bell
                  className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold text-foreground">Không có thông báo mới</p>
                <p className="text-xs text-muted-foreground mt-1">
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

          {/* Popover Footer */}
          <div className="p-2.5 border-t border-border bg-muted/20 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors w-full py-1.5 rounded-lg hover:bg-primary/5"
            >
              <span>Xem tất cả thông báo</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
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
