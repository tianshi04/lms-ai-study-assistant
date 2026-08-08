import * as React from "react";
import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils";

export const AlertDialog = BaseAlertDialog.Root;
export const AlertDialogTrigger = BaseAlertDialog.Trigger;
export const AlertDialogPortal = BaseAlertDialog.Portal;
export const AlertDialogClose = BaseAlertDialog.Close;

export function AlertDialogBackdrop({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Backdrop>) {
  return (
    <BaseAlertDialog.Backdrop
      ref={ref}
      className={cn(
        "fixed inset-0 z-modal bg-scrim/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-m3-medium-2 ease-m3-decelerate",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDialogContent({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Popup>) {
  return (
    <AlertDialogPortal>
      <AlertDialogBackdrop />
      <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
        <BaseAlertDialog.Popup
          ref={ref}
          className={cn(
            "bg-surface-container-high text-on-surface rounded-3xl shadow-2xl w-full max-w-md p-6 border border-outline-variant animate-in fade-in zoom-in-95 duration-m3-medium-4 ease-m3-decelerate relative",
            className,
          )}
          {...props}
        >
          {children}
        </BaseAlertDialog.Popup>
      </div>
    </AlertDialogPortal>
  );
}

export function AlertDialogTitle({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Title>) {
  return (
    <BaseAlertDialog.Title
      ref={ref}
      className={cn("text-lg font-semibold text-on-surface leading-tight", className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Description>) {
  return (
    <BaseAlertDialog.Description
      ref={ref}
      className={cn("text-sm text-on-surface-variant mt-2", className)}
      {...props}
    />
  );
}

export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0 mt-6",
        className,
      )}
      {...props}
    />
  );
}
