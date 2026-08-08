"use client";

import * as React from "react";
import { Separator as BaseSeparator } from "@base-ui/react/separator";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.ComponentProps<typeof BaseSeparator> {
  orientation?: "horizontal" | "vertical";
  _decorative?: boolean;
}

function SeparatorComponent({
  orientation = "horizontal",
  _decorative = true,
  className,
  ref,
  ...props
}: SeparatorProps) {
  return (
    <BaseSeparator
      ref={ref}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border transition-colors",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className,
      )}
      {...props}
    />
  );
}

export const Separator = Object.assign(SeparatorComponent, {
  Root: BaseSeparator,
});
