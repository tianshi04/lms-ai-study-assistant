import * as React from "react";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = BaseMenu.Root;
export const DropdownMenuTrigger = BaseMenu.Trigger;
export const DropdownMenuPortal = BaseMenu.Portal;

export function DropdownMenuContent({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.Popup>) {
  return (
    <DropdownMenuPortal>
      <BaseMenu.Positioner sideOffset={6} className="z-50 outline-none">
        <BaseMenu.Popup
          ref={ref}
          className={cn(
            "min-w-[150px] overflow-hidden rounded-2xl bg-popover text-popover-foreground p-1.5 shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150",
            className,
          )}
          {...props}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </DropdownMenuPortal>
  );
}

export function DropdownMenuItem({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.Item>) {
  return (
    <BaseMenu.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors hover:bg-accent text-foreground data-[highlighted]:bg-accent",
        className,
      )}
      {...props}
    />
  );
}
