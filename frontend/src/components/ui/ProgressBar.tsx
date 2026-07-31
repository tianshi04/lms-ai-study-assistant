import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const progressBarVariants = cva("h-full transition-all duration-300 ease-out", {
  variants: {
    color: {
      blue: "bg-[#0056D2]",
      emerald: "bg-emerald-500",
      amber: "bg-amber-500",
      danger: "bg-red-500",
    },
  },
  defaultVariants: {
    color: "blue",
  },
});

export interface ProgressBarProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
    VariantProps<typeof progressBarVariants> {
  progress: number; // 0 to 100
  showLabel?: boolean;
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ progress, showLabel = false, color, className, ...props }, ref) => {
    const normalizedProgress = Math.min(100, Math.max(0, progress));

    return (
      <div ref={ref} className={cn("w-full space-y-1", className)} {...props}>
        {showLabel && (
          <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Progress</span>
            <span>{Math.round(normalizedProgress)}%</span>
          </div>
        )}
        <div
          role="progressbar"
          aria-valuenow={Math.round(normalizedProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tiến độ học tập"
          className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"
        >
          <div
            className={cn(progressBarVariants({ color }))}
            style={{ width: `${normalizedProgress}%` }}
          />
        </div>
      </div>
    );
  },
);
ProgressBar.displayName = "ProgressBar";
