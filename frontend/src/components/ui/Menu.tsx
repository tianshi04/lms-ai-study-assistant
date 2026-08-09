import * as React from "react";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

const MenuRoot = BaseMenu.Root;
const MenuTrigger = BaseMenu.Trigger;
const MenuPortal = BaseMenu.Portal;
const MenuPositioner = BaseMenu.Positioner;
const MenuSeparator = BaseMenu.Separator;
const MenuGroup = BaseMenu.Group;

interface DropdownMenuContentProps extends React.ComponentProps<typeof BaseMenu.Popup> {
  sideOffset?: number;
  align?: "start" | "center" | "end";
}

function DropdownMenuContent({
  className,
  children,
  sideOffset = 12,
  align = "end",
  ref,
  ...props
}: DropdownMenuContentProps) {
  return (
    <MenuPortal>
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
    </MenuPortal>
  );
}

function DropdownMenuItem({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseMenu.Item>) {
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

const MenuContent = DropdownMenuContent;
const MenuItem = DropdownMenuItem;

export const Menu = Object.assign(MenuRoot, {
  Root: MenuRoot,
  Trigger: MenuTrigger,
  Portal: MenuPortal,
  Positioner: MenuPositioner,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
  Group: MenuGroup,
});

export const DropdownMenu = Menu;
