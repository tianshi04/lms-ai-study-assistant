"use client";

import * as React from "react";
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import { cn } from "@/lib/utils";

function ToggleItem({ className, ref, ...props }: React.ComponentProps<typeof BaseToggle>) {
  return (
    <BaseToggle
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground px-3 py-1.5 cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

function ToggleGroupComponent({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseToggleGroup>) {
  return (
    <BaseToggleGroup
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-1 rounded-lg border border-border p-1 bg-background",
        className,
      )}
      {...props}
    />
  );
}

export const ToggleGroup = Object.assign(ToggleGroupComponent, {
  Root: BaseToggleGroup,
  Item: ToggleItem,
  Toggle: ToggleItem,
});
