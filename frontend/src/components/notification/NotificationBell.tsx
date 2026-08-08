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
import { Popover } from "@/components/ui/Popover";
import { Button } from "@/components/ui/Button";

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
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger
          type="button"
          aria-label="Thông báo"
          className="relative rounded-full p-2.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer group"
        >
          <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error shadow-sm animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Popover.Trigger>

        <Popover.Content align="end" sideOffset={12}>
          {/* Crisp MD3 Popover Header */}
          <div className="p-4 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-lowest">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-on-surface">Thông báo</h3>
            </div>

            <div className="flex items-center gap-1.5">
              {notifications.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending || unreadCount === 0}
                  className="h-8 px-2.5 text-xs text-primary hover:bg-primary/10"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  Đã đọc tất cả
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsPrefModalOpen(true)}
                className="h-8 w-8 text-on-surface-variant hover:text-on-surface"
                title="Cài đặt thông báo"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* List of Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-outline-variant/30">
            {isLoading ? (
              <div className="p-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
                <span className="text-xs">Đang tải thông báo...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 text-outline opacity-40" aria-hidden="true" />
                <p className="text-sm font-medium">Không có thông báo nào</p>
                <p className="text-xs text-muted-foreground">
                  Bạn sẽ nhận được thông báo về khóa học, diễn đàn và tài khoản tại đây.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <NotificationItem key={item.id} item={item} onMarkAsRead={handleMarkAsRead} />
              ))
            )}
          </div>

          {/* Footer View All Link */}
          <div className="p-3 border-t border-outline-variant/40 text-center bg-surface-container-lowest">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors"
            >
              Xem tất cả thông báo
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </Popover.Content>
      </Popover.Root>

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
      />
    </>
  );
}
