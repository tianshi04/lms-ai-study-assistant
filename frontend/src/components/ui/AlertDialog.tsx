import * as React from "react";
import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

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
        "fixed inset-0 z-modal bg-scrim/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-150",
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
            "bg-surface-container-high text-foreground rounded-3xl shadow-2xl w-full max-w-md p-6 border border-outline-variant animate-in fade-in zoom-in-95 duration-200 ease-m3-emphasized relative",
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
      className={cn("text-lg font-semibold text-foreground leading-tight", className)}
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
      className={cn("text-sm text-muted-foreground mt-2", className)}
      {...props}
    />
  );
}

export interface ConfirmAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  isLoading?: boolean;
}

export const ConfirmAlertDialog: React.FC<ConfirmAlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "danger",
  isLoading = false,
}) => {
  const getIcon = () => {
    if (variant === "danger") {
      return (
        <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/15 sm:mx-0 sm:h-10 sm:w-10">
          <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
        </div>
      );
    }
    if (variant === "warning") {
      return (
        <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/15 sm:mx-0 sm:h-10 sm:w-10">
          <AlertCircle className="h-6 w-6 text-warning" aria-hidden="true" />
        </div>
      );
    }
    return (
      <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent sm:mx-0 sm:h-10 sm:w-10">
        <Info className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
      </div>
    );
  };

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) onClose();
      }}
    >
      <AlertDialogContent>
        <div className="sm:flex sm:items-start space-x-0 sm:space-x-4">
          {getIcon()}
          <div className="mt-3 text-center sm:mt-0 sm:text-left">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
