"use client";

import * as React from "react";
import { Toast as BaseToast } from "@base-ui/react/toast";
import { Bell, CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "default" | "success" | "error" | "warning" | "info" | "loading";

export interface ToastActionOption {
  label: string;
  onClick: () => void;
  altText?: string;
}

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  type?: ToastType;
  timeout?: number;
  action?: ToastActionOption;
  onClose?: () => void;
  id?: string;
}

// Icon Components using lucide-react icons
const VariantIcons: Record<ToastType, React.ReactNode> = {
  default: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Bell className="h-5 w-5" aria-hidden="true" />
    </div>
  ),
  success: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
    </div>
  ),
  error: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
      <AlertCircle className="h-5 w-5" aria-hidden="true" />
    </div>
  ),
  warning: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
      <AlertTriangle className="h-5 w-5" aria-hidden="true" />
    </div>
  ),
  info: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info/15 text-info">
      <Info className="h-5 w-5" aria-hidden="true" />
    </div>
  ),
  loading: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
    </div>
  ),
};

const toastBorderVariants: Record<ToastType, string> = {
  default: "border-border",
  success: "border-success/30",
  error: "border-destructive/30",
  warning: "border-warning/30",
  info: "border-info/30",
  loading: "border-primary/30",
};

interface ToastItemProps {
  toast: ReturnType<typeof BaseToast.useToastManager>["toasts"][number];
}

const ToastItem: React.FC<ToastItemProps> = ({ toast }) => {
  const type: ToastType = (toast.type as ToastType) || "default";
  const icon = VariantIcons[type] || VariantIcons.default;
  const action = (toast.data as { action?: ToastActionOption } | undefined)?.action;

  return (
    <BaseToast.Root
      toast={toast}
      className={cn(
        "pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all duration-200 ease-out",
        "bg-card/95 backdrop-blur-md text-card-foreground",
        "data-[ending]:animate-out data-[ending]:fade-out-0 data-[ending]:slide-out-to-right-full data-[ending]:duration-150",
        "data-[starting]:animate-in data-[starting]:fade-in-0 data-[starting]:slide-in-from-top-5 data-[starting]:duration-200",
        toastBorderVariants[type],
      )}
    >
      <BaseToast.Content className="flex flex-1 items-start gap-3">
        {icon}
        <div className="flex flex-col gap-1 pt-0.5">
          {toast.title && (
            <BaseToast.Title className="text-sm font-semibold text-card-foreground leading-snug">
              {toast.title}
            </BaseToast.Title>
          )}
          {toast.description && (
            <BaseToast.Description className="text-xs text-muted-foreground leading-relaxed">
              {toast.description}
            </BaseToast.Description>
          )}
        </div>
      </BaseToast.Content>

      {action && (
        <BaseToast.Action
          onClick={action.onClick}
          className="shrink-0 self-center text-xs font-semibold text-primary hover:text-primary-hover transition-colors px-2 py-1 rounded-md hover:bg-accent"
        >
          {action.label}
        </BaseToast.Action>
      )}

      <BaseToast.Close
        aria-label="Close notification"
        className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer -mr-1 -mt-1"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </BaseToast.Close>
    </BaseToast.Root>
  );
};

function ToastViewportList() {
  const { toasts } = BaseToast.useToastManager();

  return (
    <BaseToast.Portal>
      <BaseToast.Viewport className="fixed top-4 right-4 z-toast flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-4 sm:p-0">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
}

export interface ToastContextValue {
  toast: (options: ToastOptions | string) => string;
  success: (title: React.ReactNode, options?: Omit<ToastOptions, "title">) => string;
  error: (title: React.ReactNode, options?: Omit<ToastOptions, "title">) => string;
  warning: (title: React.ReactNode, options?: Omit<ToastOptions, "title">) => string;
  info: (title: React.ReactNode, options?: Omit<ToastOptions, "title">) => string;
  loading: (title: React.ReactNode, options?: Omit<ToastOptions, "title">) => string;
  dismiss: (id?: string) => void;
  promise: <T>(
    promise: Promise<T>,
    msgs: {
      loading: React.ReactNode;
      success: React.ReactNode | ((data: T) => React.ReactNode);
      error: React.ReactNode | ((err: unknown) => React.ReactNode);
    },
  ) => Promise<T>;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

function ToastController({ children }: { children: React.ReactNode }) {
  const toastManager = BaseToast.useToastManager();

  const toastHandler = React.useCallback(
    (options: ToastOptions | string): string => {
      const opts = typeof options === "string" ? { title: options } : options;
      return toastManager.add({
        id: opts.id,
        title: opts.title,
        description: opts.description,
        type: opts.type || "default",
        timeout: opts.timeout ?? 4500,
        onClose: opts.onClose,
        data: { action: opts.action },
      });
    },
    [toastManager],
  );

  const success = React.useCallback(
    (title: React.ReactNode, options?: Omit<ToastOptions, "title">): string => {
      return toastHandler({ ...options, title, type: "success" });
    },
    [toastHandler],
  );

  const error = React.useCallback(
    (title: React.ReactNode, options?: Omit<ToastOptions, "title">): string => {
      return toastHandler({ ...options, title, type: "error" });
    },
    [toastHandler],
  );

  const warning = React.useCallback(
    (title: React.ReactNode, options?: Omit<ToastOptions, "title">): string => {
      return toastHandler({ ...options, title, type: "warning" });
    },
    [toastHandler],
  );

  const info = React.useCallback(
    (title: React.ReactNode, options?: Omit<ToastOptions, "title">): string => {
      return toastHandler({ ...options, title, type: "info" });
    },
    [toastHandler],
  );

  const loading = React.useCallback(
    (title: React.ReactNode, options?: Omit<ToastOptions, "title">): string => {
      return toastHandler({ ...options, title, type: "loading", timeout: 0 });
    },
    [toastHandler],
  );

  const dismiss = React.useCallback(
    (id?: string) => {
      toastManager.close(id);
    },
    [toastManager],
  );

  const promise = React.useCallback(
    async <T,>(
      p: Promise<T>,
      msgs: {
        loading: React.ReactNode;
        success: React.ReactNode | ((data: T) => React.ReactNode);
        error: React.ReactNode | ((err: unknown) => React.ReactNode);
      },
    ): Promise<T> => {
      const toastId = toastHandler({
        title: msgs.loading,
        type: "loading",
        timeout: 0,
      });

      try {
        const result = await p;
        const successTitle =
          typeof msgs.success === "function" ? msgs.success(result) : msgs.success;
        toastManager.update(toastId, {
          title: successTitle,
          type: "success",
          timeout: 4500,
        });
        return result;
      } catch (err) {
        const errorTitle = typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
        toastManager.update(toastId, {
          title: errorTitle,
          type: "error",
          timeout: 4500,
        });
        throw err;
      }
    },
    [toastHandler, toastManager],
  );

  const value = React.useMemo(
    () => ({
      toast: toastHandler,
      success,
      error,
      warning,
      info,
      loading,
      dismiss,
      promise,
    }),
    [toastHandler, success, error, warning, info, loading, dismiss, promise],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewportList />
    </ToastContext.Provider>
  );
}

export function ToastProvider({
  children,
  timeout = 4500,
  limit = 5,
}: {
  children: React.ReactNode;
  timeout?: number;
  limit?: number;
}) {
  return (
    <BaseToast.Provider timeout={timeout} limit={limit}>
      <ToastController>{children}</ToastController>
    </BaseToast.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
