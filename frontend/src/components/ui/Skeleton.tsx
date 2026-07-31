import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.ComponentProps<"div"> {}

export function Skeleton({ className, ref, ...props }: SkeletonProps) {
  return (
    <div
      ref={ref}
      className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-700/60", className)}
      {...props}
    />
  );
}
