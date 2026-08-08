"use client";

import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

function DialogBackdrop({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      ref={ref}
      className={cn(
        "fixed inset-0 z-modal bg-scrim backdrop-blur-sm transition-opacity animate-in fade-in duration-m3-medium-2 ease-m3-decelerate",
        className,
      )}
      {...props}
    />
  );
}

const dialogSizeVariants = cva(
  "bg-surface-container-high text-on-surface rounded-3xl shadow-2xl w-full p-6 border border-outline-variant animate-in fade-in zoom-in-95 duration-m3-medium-4 ease-m3-decelerate relative my-8",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        "2xl": "max-w-5xl",
        full: "max-w-[95vw] max-h-[90vh] overflow-y-auto",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

interface DialogContentProps
  extends React.ComponentProps<typeof BaseDialog.Popup>, VariantProps<typeof dialogSizeVariants> {}

function DialogContent({ className, children, size, ref, ...props }: DialogContentProps) {
  return (
    <BaseDialog.Portal>
      <DialogBackdrop />
      <div className="fixed inset-0 z-modal flex items-center justify-center p-4 overflow-y-auto">
        <BaseDialog.Popup
          ref={ref}
          className={cn(dialogSizeVariants({ size, className }))}
          {...props}
        >
          {children}
        </BaseDialog.Popup>
      </div>
    </BaseDialog.Portal>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-4 border-b border-outline-variant", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-outline-variant gap-2 sm:gap-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ref, ...props }: React.ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      ref={ref}
      className={cn("text-lg font-semibold text-on-surface leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      ref={ref}
      className={cn("text-sm text-on-surface-variant mt-1", className)}
      {...props}
    />
  );
}

export const Dialog = Object.assign(BaseDialog.Root, {
  Root: BaseDialog.Root,
  Trigger: BaseDialog.Trigger,
  Portal: BaseDialog.Portal,
  Backdrop: DialogBackdrop,
  Popup: DialogContent,
  Content: DialogContent,
  Header: DialogHeader,
  Footer: DialogFooter,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: BaseDialog.Close,
});
