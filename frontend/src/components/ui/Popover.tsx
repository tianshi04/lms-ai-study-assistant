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
        className="z-dropdown outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BasePopover.Popup
          ref={ref}
          className={cn(
            "w-80 sm:w-[400px] rounded-3xl bg-surface-container-high text-on-surface border border-outline-variant/60 shadow-2xl overflow-hidden outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-m3-short-4 ease-m3-decelerate",
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
