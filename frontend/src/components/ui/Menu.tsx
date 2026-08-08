"use client";

import * as React from "react";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

interface MenuContentProps extends React.ComponentProps<typeof BaseMenu.Popup> {
  sideOffset?: number;
  align?: "start" | "center" | "end";
}

function MenuContent({
  className,
  children,
  sideOffset = 12,
  align = "end",
  ref,
  ...props
}: MenuContentProps) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner
        sideOffset={sideOffset}
        align={align}
        className="z-dropdown outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BaseMenu.Popup
          ref={ref}
          className={cn(
            "min-w-[160px] overflow-hidden rounded-2xl bg-surface-container-high text-on-surface p-1.5 shadow-lg border border-outline-variant animate-in fade-in zoom-in-95 duration-m3-short-4 ease-m3-decelerate",
            className,
          )}
          {...props}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

function MenuItem({ className, ref, ...props }: React.ComponentProps<typeof BaseMenu.Item>) {
  return (
    <BaseMenu.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center justify-start gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-m3-short-4 ease-m3-emphasized hover:bg-surface-container-highest text-on-surface data-[highlighted]:bg-surface-container-highest",
        className,
      )}
      {...props}
    />
  );
}

export const Menu = Object.assign(BaseMenu.Root, {
  Root: BaseMenu.Root,
  Trigger: BaseMenu.Trigger,
  Portal: BaseMenu.Portal,
  Positioner: BaseMenu.Positioner,
  Content: MenuContent,
  Item: MenuItem,
  Separator: BaseMenu.Separator,
  Group: BaseMenu.Group,
});
