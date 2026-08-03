"use client";

import Link from "next/link";
import { Bell, BookOpen, MessageSquare, Megaphone, CheckCircle2, Shield } from "lucide-react";
import type { NotificationItem as NotificationItemType } from "@/gen/notification/v1/notification_pb";
import { NotificationCategory } from "@/gen/notification/v1/notification_pb";

interface NotificationItemProps {
  item: NotificationItemType;
  onMarkAsRead?: (id: string) => void;
  compact?: boolean;
}

export function NotificationItem({ item, onMarkAsRead, compact = false }: NotificationItemProps) {
  const getCategoryDetails = (cat: NotificationCategory) => {
    switch (cat) {
      case NotificationCategory.SYSTEM:
        return {
          label: "Hệ thống",
          icon: Shield,
          bgClass: "bg-info/10 text-info border-info/20",
        };
      case NotificationCategory.ACADEMIC:
        return {
          label: "Học tập",
          icon: BookOpen,
          bgClass: "bg-success/10 text-success border-success/20",
        };
      case NotificationCategory.COMMUNITY:
        return {
          label: "Diễn đàn",
          icon: MessageSquare,
          bgClass: "bg-tertiary-container text-on-tertiary-container border-outline-variant",
        };
      case NotificationCategory.ANNOUNCEMENT:
        return {
          label: "Thông báo",
          icon: Megaphone,
          bgClass: "bg-destructive/10 text-destructive border-destructive/20",
        };
      default:
        return {
          label: "Chung",
          icon: Bell,
          bgClass: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  const { label, icon: IconComponent, bgClass } = getCategoryDetails(item.category);

  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div
      className={`relative p-3.5 rounded-2xl transition-all duration-200 ${
        item.isRead
          ? "bg-surface-container-low/60 hover:bg-surface-container-low border border-transparent"
          : "bg-primary-container/25 hover:bg-primary-container/40 border border-primary/20 shadow-2xs"
      }`}
    >
      {/* Unread Indicator Pulse Dot */}
      {!item.isRead && (
        <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}

      <div className="flex items-start gap-3">
        {/* Tonal Category Icon Container */}
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${bgClass}`}
        >
          <IconComponent className="w-5 h-5" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0 pr-2">
          {/* Header Row: Category Badge & Timestamp */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bgClass}`}>
              {label}
            </span>
            <span className="text-[10px] text-on-surface-variant/80 font-medium">
              {formatTime(item.createdAt)}
            </span>
          </div>

          {/* Notification Title & Content */}
          {item.actionUrl ? (
            <Link
              href={item.actionUrl}
              onClick={() => {
                if (!item.isRead && onMarkAsRead) {
                  onMarkAsRead(item.id);
                }
              }}
              className="block group"
            >
              <h4
                className={`text-xs font-bold tracking-tight text-on-surface group-hover:text-primary transition-colors ${
                  compact ? "line-clamp-1" : "line-clamp-2"
                }`}
              >
                {item.title}
              </h4>

              {item.content && (
                <p
                  className={`text-[11px] text-on-surface-variant mt-0.5 leading-relaxed ${
                    compact ? "line-clamp-2" : "line-clamp-3"
                  }`}
                >
                  {item.content}
                </p>
              )}
            </Link>
          ) : (
            <>
              <h4
                className={`text-xs font-bold tracking-tight text-on-surface ${
                  compact ? "line-clamp-1" : "line-clamp-2"
                }`}
              >
                {item.title}
              </h4>

              {item.content && (
                <p
                  className={`text-[11px] text-on-surface-variant mt-0.5 leading-relaxed ${
                    compact ? "line-clamp-2" : "line-clamp-3"
                  }`}
                >
                  {item.content}
                </p>
              )}
            </>
          )}

          {/* Footer Action: Mark As Read button */}
          {!item.isRead && onMarkAsRead && (
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => onMarkAsRead(item.id)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                title="Đánh dấu đã đọc"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Đánh dấu đã đọc</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
