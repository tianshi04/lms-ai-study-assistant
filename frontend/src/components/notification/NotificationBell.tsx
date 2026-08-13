"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Settings, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/Progress";
import {
  useNotificationsQuery,
  useUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from "@/lib/query_hooks";
import { NotificationItem } from "./NotificationItem";
import { NotificationPreferencesModal } from "./NotificationPreferencesModal";
import { Popover } from "@/components/ui/Popover";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";

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
        <Popover.Trigger
          type="button"
          className="relative p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 transition-colors duration-m3-short-4 ease-m3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          aria-label={`Thông báo (${unreadCount} chưa đọc)`}
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge
              variant="error"
              className="absolute top-0 right-0 font-black shadow-md animate-in zoom-in-50 duration-m3-short-4 ease-m3-decelerate"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Popover.Trigger>

        <Popover.Content align="end" sideOffset={12}>
          {/* Crisp MD3 Popover Header */}
          <div className="p-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-lowest">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-on-surface">Thông báo</h3>
              {unreadCount > 0 && (
                <Badge variant="primary">{unreadCount > 99 ? "99+" : unreadCount}</Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {notifications.length > 0 && (
                <Button
                  type="button"
                  variant="text"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending || unreadCount === 0}
                  className="text-xs font-bold text-primary hover:bg-primary-container/50 disabled:opacity-40"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck className="w-4 h-4" aria-hidden="true" />
                  <span className="text-xs font-bold">Đọc tất cả</span>
                </Button>
              )}

              <IconButton
                type="button"
                variant="standard"
                size="xs"
                onClick={() => {
                  setIsOpen(false);
                  setIsPrefModalOpen(true);
                }}
                className="w-8 h-8 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                title="Cài đặt thông báo"
                aria-label="Cài đặt thông báo"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </IconButton>
            </div>
          </div>

          {/* Scrollable Notifications List - Hidden Scrollbar */}
          <div className="max-h-[380px] overflow-y-auto scrollbar-none p-3 space-y-2 bg-surface-container-lowest">
            {isLoading ? (
              <div className="py-10 flex justify-center items-center text-on-surface-variant">
                <Progress.Circular size="md" ariaLabel="Đang tải thông báo" />
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
            <Button
              render={<Link href="/notifications" onClick={() => setIsOpen(false)} />}
              variant="filled"
              size="sm"
              className="w-full shadow-sm"
            >
              <span>Xem tất cả thông báo</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </Popover.Content>
      </Popover>

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
      />
    </>
  );
}
