"use client";

import * as React from "react";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

function ProgressLabel({
  className,
  children = "Tiến độ",
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span className={cn("text-xs font-medium text-muted-foreground", className)} {...props}>
      {children}
    </span>
  );
}

function ProgressValue({
  value,
  className,
  ...props
}: React.ComponentProps<"span"> & { value?: number }) {
  return (
    <span
      className={cn("text-xs font-mono font-medium text-muted-foreground", className)}
      {...props}
    >
      {value !== undefined ? `${Math.round(value)}%` : null}
    </span>
  );
}

const progressBarVariants = cva(
  "h-full transition-colors duration-m3-long-2 ease-m3-emphasized rounded-full",
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

export interface ProgressProps
  extends
    Omit<React.ComponentProps<typeof BaseProgress.Root>, "color" | "value">,
    VariantProps<typeof progressBarVariants> {
  value?: number;
  progress?: number; // 0 to 100
  showLabel?: boolean;
}

function ProgressComponent({
  value,
  progress,
  showLabel = false,
  color,
  className,
  ref,
  ...props
}: ProgressProps) {
  const rawValue = value ?? progress ?? 0;
  const normalizedProgress = Math.min(100, Math.max(0, rawValue));

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
          <ProgressLabel />
          <ProgressValue value={normalizedProgress} />
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

export const Progress = Object.assign(ProgressComponent, {
  Root: BaseProgress.Root,
  Track: BaseProgress.Track,
  Indicator: BaseProgress.Indicator,
  Label: ProgressLabel,
  Value: ProgressValue,
});
