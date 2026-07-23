import React from "react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  progress: number; // 0 to 100
  showLabel?: boolean;
  color?: "blue" | "emerald" | "amber";
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  color = "blue",
  className = "",
}) => {
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  const colors = {
    blue: "bg-[#0056D2]",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };

  return (
    <div className={cn("w-full space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>Progress</span>
          <span>{Math.round(normalizedProgress)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300 ease-out", colors[color])}
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
    </div>
  );
};

