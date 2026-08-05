import * as React from "react";
import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Drawer = BaseDrawer.Root;
export const DrawerTrigger = BaseDrawer.Trigger;
export const DrawerPortal = BaseDrawer.Portal;
export const DrawerClose = BaseDrawer.Close;

export function DrawerBackdrop({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseDrawer.Backdrop>) {
  return (
    <BaseDrawer.Backdrop
      ref={ref}
      className={cn(
        "fixed inset-0 z-modal bg-black/60 backdrop-blur-xs transition-opacity duration-m3-medium-2 ease-m3-decelerate data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

export interface DrawerContentProps extends React.ComponentProps<typeof BaseDrawer.Popup> {
  side?: "top" | "bottom" | "left" | "right";
  showCloseButton?: boolean;
}

export function DrawerContent({
  side = "right",
  showCloseButton = true,
  className,
  children,
  ref,
  ...props
}: DrawerContentProps) {
  const sideVariants = {
    top: "inset-x-0 top-0 border-b border-border rounded-b-2xl data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
    bottom:
      "inset-x-0 bottom-0 border-t border-border rounded-t-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
    left: "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r border-border rounded-r-2xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
    right:
      "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l border-border rounded-l-2xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
  };

  return (
    <DrawerPortal>
      <DrawerBackdrop />
      <BaseDrawer.Popup
        ref={ref}
        className={cn(
          "fixed z-modal bg-card p-6 shadow-2xl transition-transform duration-m3-medium-4 ease-m3-decelerate focus-visible:outline-none",
          sideVariants[side],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <BaseDrawer.Close className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer">
            <X className="h-4 w-4" />
            <span className="sr-only font-medium">Đóng</span>
          </BaseDrawer.Close>
        )}
      </BaseDrawer.Popup>
    </DrawerPortal>
  );
}

export function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-left sm:text-left pb-4 border-b border-border",
        className,
      )}
      {...props}
    />
  );
}

export function DrawerTitle({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseDrawer.Title>) {
  return (
    <BaseDrawer.Title
      ref={ref}
      className={cn("text-lg font-semibold text-foreground leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function DrawerDescription({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseDrawer.Description>) {
  return (
    <BaseDrawer.Description
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 mt-auto border-t border-border",
        className,
      )}
      {...props}
    />
  );
}
