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
      <BaseMenu.Positioner sideOffset={6} className="z-dropdown outline-none">
        <BaseMenu.Popup
          ref={ref}
          className={cn(
            "min-w-[160px] overflow-hidden rounded-2xl bg-surface-container-high text-foreground p-1.5 shadow-lg border border-outline-variant animate-in fade-in zoom-in-95 duration-200 ease-m3-emphasized",
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
        "relative flex cursor-pointer select-none items-center justify-start gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition-all duration-200 ease-m3-emphasized hover:bg-surface-container-highest text-foreground data-[highlighted]:bg-surface-container-highest",
        className,
      )}
      {...props}
    />
  );
}
