"use client";

import Link from "next/link";
import { Bell, BookOpen, MessageSquare, Megaphone, CheckCircle2, ExternalLink } from "lucide-react";
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
          icon: Bell,
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
      className={`relative p-3.5 rounded-xl border transition-all duration-200 ${
        item.isRead
          ? "bg-card border-border/60 opacity-80 hover:opacity-100"
          : "bg-primary/5 border-primary/20 shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg border flex-shrink-0 ${bgClass}`}>
          <IconComponent className="w-4 h-4" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${bgClass}`}
            >
              {label}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              {formatTime(item.createdAt)}
            </span>
          </div>

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
                className={`text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors ${
                  compact ? "line-clamp-1" : "line-clamp-2"
                }`}
              >
                {item.title}
              </h4>

              {item.content && (
                <p
                  className={`text-xs text-muted-foreground mt-1 leading-relaxed ${
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
                className={`text-sm font-semibold tracking-tight text-foreground ${
                  compact ? "line-clamp-1" : "line-clamp-2"
                }`}
              >
                {item.title}
              </h4>

              {item.content && (
                <p
                  className={`text-xs text-muted-foreground mt-1 leading-relaxed ${
                    compact ? "line-clamp-2" : "line-clamp-3"
                  }`}
                >
                  {item.content}
                </p>
              )}
            </>
          )}

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40 gap-2">
            {item.actionUrl ? (
              <Link
                href={item.actionUrl}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                onClick={() => {
                  if (!item.isRead && onMarkAsRead) {
                    onMarkAsRead(item.id);
                  }
                }}
              >
                <span>Xem chi tiết</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </Link>
            ) : (
              <div />
            )}

            {!item.isRead && onMarkAsRead && (
              <button
                type="button"
                onClick={() => onMarkAsRead(item.id)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                title="Đánh dấu đã đọc"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Đã đọc</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
