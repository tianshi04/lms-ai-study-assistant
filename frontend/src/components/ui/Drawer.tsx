import * as React from "react";
import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Drawer = Object.assign(BaseDrawer.Root, {
  Root: BaseDrawer.Root,
  Trigger: BaseDrawer.Trigger,
  Portal: BaseDrawer.Portal,
  Viewport: BaseDrawer.Viewport,
  Backdrop: DrawerBackdrop,
  Popup: DrawerContent,
  Content: DrawerContent,
  Header: DrawerHeader,
  Title: DrawerTitle,
  Description: DrawerDescription,
  Footer: DrawerFooter,
  Close: BaseDrawer.Close,
});

function DrawerBackdrop({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseDrawer.Backdrop>) {
  return (
    <BaseDrawer.Backdrop
      ref={ref}
      className={cn(
        "fixed inset-0 z-modal bg-scrim/60 backdrop-blur-xs transition-opacity duration-m3-medium-2 ease-m3-decelerate data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

export const drawerSideVariants = cva(
  "fixed z-modal bg-surface-container-low text-on-surface p-6 shadow-2xl transition-transform duration-m3-medium-4 ease-m3-decelerate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b border-outline-variant rounded-b-2xl data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t border-outline-variant rounded-t-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r border-outline-variant rounded-r-2xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right:
          "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l border-outline-variant rounded-l-2xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

export interface DrawerContentProps
  extends React.ComponentProps<typeof BaseDrawer.Popup>, VariantProps<typeof drawerSideVariants> {
  showCloseButton?: boolean;
}

function DrawerContent({
  side,
  showCloseButton = true,
  className,
  children,
  ref,
  ...props
}: DrawerContentProps) {
  return (
    <BaseDrawer.Portal>
      <DrawerBackdrop />
      <BaseDrawer.Viewport className="fixed inset-0 z-modal overflow-hidden">
        <BaseDrawer.Popup
          ref={ref}
          className={cn(drawerSideVariants({ side, className }))}
          {...props}
        >
          {children}
          {showCloseButton && (
            <BaseDrawer.Close className="absolute right-4 top-4 rounded-full p-2 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer">
              <X aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only font-medium">Đóng</span>
            </BaseDrawer.Close>
          )}
        </BaseDrawer.Popup>
      </BaseDrawer.Viewport>
    </BaseDrawer.Portal>
  );
}

function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-left sm:text-left pb-4 border-b border-outline-variant",
        className,
      )}
      {...props}
    />
  );
}

function DrawerTitle({ className, ref, ...props }: React.ComponentProps<typeof BaseDrawer.Title>) {
  return (
    <BaseDrawer.Title
      ref={ref}
      className={cn("text-lg font-semibold text-on-surface leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseDrawer.Description>) {
  return (
    <BaseDrawer.Description
      ref={ref}
      className={cn("text-sm text-on-surface-variant", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 mt-auto border-t border-outline-variant",
        className,
      )}
      {...props}
    />
  );
}
