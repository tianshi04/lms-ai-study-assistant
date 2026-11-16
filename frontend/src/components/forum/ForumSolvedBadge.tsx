import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";

interface ForumSolvedBadgeProps {
  className?: string;
}

export function ForumSolvedBadge({ className }: ForumSolvedBadgeProps) {
  return (
    <Badge
      variant="success"
      size="pill"
      className={className ? `gap-1 shrink-0 ${className}` : "gap-1 shrink-0"}
    >
      <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>Đã giải quyết</span>
    </Badge>
  );
}
