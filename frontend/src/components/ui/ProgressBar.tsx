import * as React from "react";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const progressBarVariants = cva(
  "h-full transition-all duration-500 ease-m3-emphasized rounded-full",
  {
    variants: {
      color: {
        blue: "bg-primary",
        emerald: "bg-success",
        amber: "bg-warning",
        danger: "bg-destructive",
      },
    },
    defaultVariants: {
      color: "blue",
    },
  },
);

export interface ProgressBarProps
  extends
    Omit<React.ComponentProps<typeof BaseProgress.Root>, "color" | "value">,
    VariantProps<typeof progressBarVariants> {
  progress: number; // 0 to 100
  showLabel?: boolean;
}

export function ProgressBar({
  progress,
  showLabel = false,
  color,
  className,
  ref,
  ...props
}: ProgressBarProps) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  return (
    <BaseProgress.Root
      ref={ref}
      value={normalizedProgress}
      aria-label="Tiến độ học tập"
      className={cn("w-full space-y-1", className)}
      {...props}
    >
      {showLabel && (
        <div className="flex justify-between text-xs font-medium text-muted-foreground">
          <span>Tiến độ</span>
          <span className="font-mono">{Math.round(normalizedProgress)}%</span>
        </div>
      )}
      <BaseProgress.Track className="w-full h-2 bg-secondary-container rounded-full overflow-hidden block">
        <BaseProgress.Indicator
          className={cn(progressBarVariants({ color }))}
          style={{ width: `${normalizedProgress}%` }}
        />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}
