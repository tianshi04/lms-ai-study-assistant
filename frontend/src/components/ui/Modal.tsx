import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogPortal = BaseDialog.Portal;
export const DialogClose = BaseDialog.Close;

export function DialogBackdrop({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      ref={ref}
      className={cn(
        "fixed inset-0 z-modal bg-scrim backdrop-blur-sm transition-opacity animate-in fade-in duration-150",
        className,
      )}
      {...props}
    />
  );
}

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
  full: "max-w-[95vw] max-h-[90vh] overflow-y-auto",
};

export interface DialogContentProps extends React.ComponentProps<typeof BaseDialog.Popup> {
  size?: ModalSize;
}

export function DialogContent({
  className,
  children,
  size = "md",
  ref,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogBackdrop />
      <div className="fixed inset-0 z-modal flex items-center justify-center p-4 overflow-y-auto">
        <BaseDialog.Popup
          ref={ref}
          className={cn(
            "bg-surface-container-high text-foreground rounded-3xl shadow-2xl w-full p-6 border border-outline-variant animate-in fade-in zoom-in-95 duration-200 ease-m3-emphasized relative my-8",
            sizeClasses[size],
            className,
          )}
          {...props}
        >
          {children}
        </BaseDialog.Popup>
      </div>
    </DialogPortal>
  );
}

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 pb-4 border-b border-outline-variant", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-outline-variant gap-2 sm:gap-0",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

export function DialogTitle({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      ref={ref}
      className={cn(
        "text-lg font-semibold text-popover-foreground leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      ref={ref}
      className={cn("text-sm text-muted-foreground mt-1", className)}
      {...props}
    />
  );
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  showCloseButton?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  showCloseButton = true,
  children,
  className,
}) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent size={size} className={className}>
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between pb-4 border-b border-outline-variant">
            <div>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
            {showCloseButton && (
              <DialogClose
                onClick={onClose}
                aria-label="Đóng cửa sổ"
                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg cursor-pointer hover:bg-accent ml-auto -mr-1 -mt-1"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </DialogClose>
            )}
          </div>
        )}
        <div className="pt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export interface ConfirmDialogProps {
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

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "primary",
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

  const buttonVariant = variant === "danger" ? "danger" : "primary";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) onClose();
      }}
    >
      <DialogContent size="sm">
        <div className="sm:flex sm:items-start space-x-0 sm:space-x-4">
          {getIcon()}
          <div className="mt-3 text-center sm:mt-0 sm:text-left">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={buttonVariant} onClick={onConfirm} isLoading={isLoading}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
