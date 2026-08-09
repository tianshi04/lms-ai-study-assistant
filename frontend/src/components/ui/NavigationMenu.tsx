import * as React from "react";
import { NavigationMenu as BaseNavigationMenu } from "@base-ui/react/navigation-menu";
import { cn } from "@/lib/utils";

export const NavigationMenuRoot = BaseNavigationMenu.Root;

export function NavigationMenuList({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseNavigationMenu.List>) {
  return (
    <BaseNavigationMenu.List
      ref={ref}
      className={cn("flex items-center gap-1 list-none m-0 p-0", className)}
      {...props}
    />
  );
}

export function NavigationMenuItem({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseNavigationMenu.Item>) {
  return <BaseNavigationMenu.Item ref={ref} className={cn("relative", className)} {...props} />;
}

export function NavigationMenuTrigger({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseNavigationMenu.Trigger>) {
  return (
    <BaseNavigationMenu.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[popup-open]:bg-secondary-container data-[popup-open]:text-on-secondary-container",
        className,
      )}
      {...props}
    />
  );
}

export function NavigationMenuContent({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseNavigationMenu.Content>) {
  return (
    <BaseNavigationMenu.Content
      ref={ref}
      className={cn(
        "absolute top-full left-0 mt-2 min-w-[200px] p-2 rounded-2xl bg-surface-container-highest border border-outline-variant shadow-lg z-dropdown animate-in fade-in zoom-in-95 duration-m3-short-4 ease-m3-decelerate focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function NavigationMenuLink({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseNavigationMenu.Link>) {
  return (
    <BaseNavigationMenu.Link
      ref={ref}
      className={cn(
        "block px-3 py-2 rounded-xl text-sm font-medium transition-colors text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
      {...props}
    />
  );
}

export const NavigationMenu = {
  Root: BaseNavigationMenu.Root,
  List: NavigationMenuList,
  Item: NavigationMenuItem,
  Trigger: NavigationMenuTrigger,
  Content: NavigationMenuContent,
  Link: NavigationMenuLink,
  Portal: BaseNavigationMenu.Portal,
  Viewport: BaseNavigationMenu.Viewport,
};
