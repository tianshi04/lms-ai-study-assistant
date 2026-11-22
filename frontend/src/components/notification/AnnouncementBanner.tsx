"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertTriangle, Info, ShieldAlert, X, ExternalLink } from "lucide-react";
import { useActiveAnnouncementsQuery } from "@/lib/query_hooks";
import {
  AnnouncementSeverity,
  type SystemAnnouncement,
} from "@/gen/notification/v1/notification_pb";

const DISMISSED_STORAGE_KEY = "lms_dismissed_announcements_v1";
const DISMISSED_EVENT = "lms-dismissed-announcements-change";

function subscribeDismissed(onStoreChange: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === DISMISSED_STORAGE_KEY) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(DISMISSED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(DISMISSED_EVENT, onStoreChange);
  };
}

function getDismissedSnapshot(): string {
  try {
    return window.localStorage.getItem(DISMISSED_STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getServerSnapshot(): string {
  return "[]";
}

function dismissAnnouncementId(id: string): void {
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const ids = Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
    if (!ids.includes(id)) {
      ids.push(id);
      window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(ids));
      window.dispatchEvent(new Event(DISMISSED_EVENT));
    }
  } catch {
    // Ignore storage errors
  }
}

export function AnnouncementBannerStyle({
  severity,
  title,
  content,
  actionUrl,
  onDismiss,
}: {
  severity: AnnouncementSeverity;
  title: string;
  content: string;
  actionUrl?: string;
  onDismiss?: () => void;
}) {
  const isCritical = severity === AnnouncementSeverity.CRITICAL;
  const isWarning = severity === AnnouncementSeverity.WARNING;

  const containerClasses = isCritical
    ? "bg-destructive text-destructive-foreground border-b border-destructive/40"
    : isWarning
      ? "bg-amber-500/15 text-amber-950 dark:text-amber-100 border-b border-amber-500/30"
      : "bg-primary/10 text-foreground border-b border-primary/25";

  const Icon = isCritical ? ShieldAlert : isWarning ? AlertTriangle : Info;

  return (
    <aside
      aria-label="Thông báo hệ thống"
      aria-live="polite"
      className={`w-full px-4 py-2.5 text-sm transition-colors ${containerClasses}`}
    >
      <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
          <Icon className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
            <span className="font-bold">{title}</span>
            {content && <span className="opacity-90 break-words">{content}</span>}
            {actionUrl && (
              <Link
                href={actionUrl}
                target={actionUrl.startsWith("https://") ? "_blank" : undefined}
                rel={actionUrl.startsWith("https://") ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:opacity-80"
              >
                <span>Xem chi tiết</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Đóng thông báo"
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  );
}

export function AnnouncementBanner() {
  const { data: announcements = [] } = useActiveAnnouncementsQuery();
  const dismissedRaw = useSyncExternalStore(
    subscribeDismissed,
    getDismissedSnapshot,
    getServerSnapshot,
  );

  const dismissedIds = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(dismissedRaw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      // Ignore parse errors
    }
    return new Set<string>();
  }, [dismissedRaw]);

  const visible = announcements.filter((a: SystemAnnouncement) => !dismissedIds.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="w-full z-40">
      {visible.map((ann: SystemAnnouncement) => (
        <AnnouncementBannerStyle
          key={ann.id}
          severity={ann.severity}
          title={ann.title}
          content={ann.content}
          actionUrl={ann.actionUrl}
          onDismiss={() => dismissAnnouncementId(ann.id)}
        />
      ))}
    </div>
  );
}
