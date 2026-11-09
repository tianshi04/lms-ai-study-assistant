import type { ReactNode } from "react";

const TONE_CLASSES = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  muted: "bg-muted text-muted-foreground border-border",
} as const;

export type StatusBadgeTone = keyof typeof TONE_CLASSES;

interface StatusBadgeProps {
  tone: StatusBadgeTone;
  children: ReactNode;
}

/** Small pill used across the admin dashboard to flag a status, kind or state. */
export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
