import * as React from "react";
import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { cn } from "@/lib/utils";

export function ScrollArea({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseScrollArea.Root>) {
  return (
    <BaseScrollArea.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
      <BaseScrollArea.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </BaseScrollArea.Viewport>
      <ScrollBar />
      <BaseScrollArea.Corner />
    </BaseScrollArea.Root>
  );
}

export function ScrollBar({
  className,
  orientation = "vertical",
  ref,
  ...props
}: React.ComponentProps<typeof BaseScrollArea.Scrollbar>) {
  return (
    <BaseScrollArea.Scrollbar
      ref={ref}
      orientation={orientation}
      className={cn(
        "flex touch-none select-none transition-colors duration-m3-short-3 ease-m3-decelerate",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
        className,
      )}
      {...props}
    >
      <BaseScrollArea.Thumb className="relative flex-1 rounded-full bg-border transition-colors hover:bg-muted-foreground/50" />
    </BaseScrollArea.Scrollbar>
  );
}
