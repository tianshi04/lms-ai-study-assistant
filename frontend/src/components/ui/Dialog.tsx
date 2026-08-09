import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";

function DialogBackdrop({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      ref={ref}
      className={cn(
        "fixed inset-0 z-modal bg-scrim/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-m3-medium-2 ease-m3-decelerate data-[state=closed]:animate-out data-[state=closed]:fade-out duration-m3-short-4 ease-m3-accelerate",
        className,
      )}
      {...props}
    />
  );
}

export const dialogSizeVariants = cva(
  "bg-surface-container-high text-on-surface rounded-[28px] shadow-2xl w-full min-w-[280px] max-w-[560px] p-6 border border-outline-variant/50 animate-in fade-in zoom-in-95 duration-m3-medium-4 ease-m3-decelerate data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out relative outline-none flex flex-col max-h-[calc(100vh-7rem)]",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-md", // 448px (Within 280dp - 560dp)
        lg: "max-w-lg", // 512px (Within 280dp - 560dp)
        xl: "max-w-2xl",
        "2xl": "max-w-4xl",
        full: "max-w-none w-screen h-screen rounded-none my-0 border-none p-0 overflow-y-auto bg-surface-container shadow-none my-0 max-h-none",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

export interface DialogContentProps
  extends React.ComponentProps<typeof BaseDialog.Popup>, VariantProps<typeof dialogSizeVariants> {
  showCloseButton?: boolean;
}

function DialogContent({
  className,
  children,
  size,
  showCloseButton = true,
  ref,
  ...props
}: DialogContentProps) {
  const isFullScreen = size === "full";

  return (
    <BaseDialog.Portal>
      <DialogBackdrop />
      <div
        className={cn(
          "fixed inset-0 z-modal flex items-center justify-center overflow-y-auto",
          isFullScreen ? "p-0" : "p-4 sm:p-8 md:p-14",
        )}
      >
        <BaseDialog.Popup
          ref={ref}
          className={cn(dialogSizeVariants({ size, className }))}
          {...props}
        >
          {showCloseButton && !isFullScreen && (
            <BaseDialog.Close
              render={
                <IconButton
                  variant="standard"
                  aria-label="Đóng cửa sổ"
                  className="absolute top-4 right-4 z-10 text-on-surface-variant hover:text-on-surface"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </IconButton>
              }
            />
          )}
          {children}
        </BaseDialog.Popup>
      </div>
    </BaseDialog.Portal>
  );
}

export interface DialogIconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
}

function DialogIcon({ className, icon, children, ...props }: DialogIconProps) {
  return (
    <div
      className={cn(
        "dialog-icon w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center self-center mx-auto mb-4 shrink-0",
        className,
      )}
      {...props}
    >
      {icon || children}
    </div>
  );
}

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col text-left [&:has(.dialog-icon)]:text-center shrink-0 pb-2",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

export interface DialogFullScreenHeaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
}

function DialogFullScreenHeader({
  className,
  title,
  action,
  onClose,
  children,
  ...props
}: DialogFullScreenHeaderProps) {
  return (
    <div
      className={cn(
        "h-16 px-6 border-b border-outline-variant/50 bg-surface-container flex items-center justify-between sticky top-0 z-10 shrink-0",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        {onClose ? (
          <IconButton
            variant="standard"
            aria-label="Đóng"
            onClick={onClose}
            className="text-on-surface"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </IconButton>
        ) : (
          <BaseDialog.Close
            render={
              <IconButton variant="standard" aria-label="Đóng" className="text-on-surface">
                <X className="w-5 h-5" aria-hidden="true" />
              </IconButton>
            }
          />
        )}
        {title && (
          <span className="text-xl font-semibold text-on-surface tracking-tight">{title}</span>
        )}
      </div>
      {action && <div>{action}</div>}
      {children}
    </div>
  );
}
DialogFullScreenHeader.displayName = "DialogFullScreenHeader";

function DialogDivider({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-b border-outline-variant/50 h-[1px] my-4 -mx-6 shrink-0", className)}
      {...props}
    />
  );
}
DialogDivider.displayName = "DialogDivider";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end pt-6 gap-2 sm:gap-2 shrink-0 mt-auto",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

function DialogTitle({ className, ref, ...props }: React.ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      ref={ref}
      className={cn(
        "text-2xl font-semibold text-on-surface leading-tight tracking-tight",
        className,
      )}
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
      className={cn("text-sm text-on-surface-variant mt-4 leading-relaxed", className)}
      {...props}
    />
  );
}

// Single clean compound component export: Dialog
export const Dialog = Object.assign(BaseDialog.Root, {
  Root: BaseDialog.Root,
  Trigger: BaseDialog.Trigger,
  Portal: BaseDialog.Portal,
  Backdrop: DialogBackdrop,
  Popup: DialogContent,
  Content: DialogContent,
  Header: DialogHeader,
  FullScreenHeader: DialogFullScreenHeader,
  Icon: DialogIcon,
  Divider: DialogDivider,
  Footer: DialogFooter,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: BaseDialog.Close,
});
