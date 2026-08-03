import * as React from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;
export const PopoverPortal = BasePopover.Portal;
export const PopoverClose = BasePopover.Close;

export function PopoverContent({
  className,
  children,
  sideOffset = 8,
  align = "end",
  ref,
  ...props
}: React.ComponentProps<typeof BasePopover.Popup> & {
  sideOffset?: number;
  align?: "start" | "center" | "end";
}) {
  return (
    <PopoverPortal>
      <BasePopover.Positioner
        sideOffset={sideOffset}
        align={align}
        className="z-dropdown outline-none"
      >
        <BasePopover.Popup
          ref={ref}
          className={cn(
            "w-80 sm:w-96 rounded-2xl bg-card text-card-foreground border border-border shadow-2xl overflow-hidden outline-none animate-in fade-in-0 zoom-in-95 duration-150",
            className,
          )}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </PopoverPortal>
  );
}
