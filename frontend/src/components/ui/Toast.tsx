"use client";

import * as React from "react";
import { Toast as BaseToast } from "@base-ui/react/toast";
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

// Icon Components using clean inline SVG vectors
const VariantIcons: Record<ToastType, React.ReactNode> = {
  default: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    </div>
  ),
  success: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  ),
  error: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.007v.008H12v-.008z" />
      </svg>
    </div>
  ),
  warning: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    </div>
  ),
  info: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    </div>
  ),
  loading: (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  ),
};

const toastBorderVariants: Record<ToastType, string> = {
  default: "border-slate-200 dark:border-slate-800",
  success: "border-emerald-200 dark:border-emerald-900/50",
  error: "border-rose-200 dark:border-rose-900/50",
  warning: "border-amber-200 dark:border-amber-900/50",
  info: "border-sky-200 dark:border-sky-900/50",
  loading: "border-blue-200 dark:border-blue-900/50",
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
        "bg-white/95 backdrop-blur-md dark:bg-slate-900/95 text-slate-900 dark:text-slate-100",
        "data-[ending]:animate-out data-[ending]:fade-out-0 data-[ending]:slide-out-to-right-full data-[ending]:duration-150",
        "data-[starting]:animate-in data-[starting]:fade-in-0 data-[starting]:slide-in-from-bottom-5 data-[starting]:duration-200",
        toastBorderVariants[type]
      )}
    >
      <BaseToast.Content className="flex flex-1 items-start gap-3">
        {icon}
        <div className="flex flex-col gap-1 pt-0.5">
          {toast.title && (
            <BaseToast.Title className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              {toast.title}
            </BaseToast.Title>
          )}
          {toast.description && (
            <BaseToast.Description className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {toast.description}
            </BaseToast.Description>
          )}
        </div>
      </BaseToast.Content>

      {action && (
        <BaseToast.Action
          onClick={action.onClick}
          className="shrink-0 self-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40"
        >
          {action.label}
        </BaseToast.Action>
      )}

      <BaseToast.Close
        aria-label="Close notification"
        className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer -mr-1 -mt-1"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </BaseToast.Close>
    </BaseToast.Root>
  );
};

function ToastViewportList() {
  const { toasts } = BaseToast.useToastManager();

  return (
    <BaseToast.Portal>
      <BaseToast.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-4 sm:p-0">
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
    }
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
    [toastManager]
  );

  const success = React.useCallback(
    (title: React.ReactNode, options?: Omit<ToastOptions, "title">): string => {
      return toastHandler({ ...options, title, type: "success" });
    },
    [toastHandler]
  );

  const error = React.useCallback(
    (title: React.ReactNode, options?: Omit<ToastOptions, "title">): string => {
      return toastHandler({ ...options, title, type: "error" });
    },
    [toastHandler]
  );

  const warning = React.useCallback(
    (title: React.ReactNode, options?: Omit<ToastOptions, "title">): string => {
      return toastHandler({ ...options, title, type: "warning" });
    },
    [toastHandler]
  );

  const info = React.useCallback(
    (title: React.ReactNode, options?: Omit<ToastOptions, "title">): string => {
      return toastHandler({ ...options, title, type: "info" });
    },
    [toastHandler]
  );

  const loading = React.useCallback(
    (title: React.ReactNode, options?: Omit<ToastOptions, "title">): string => {
      return toastHandler({ ...options, title, type: "loading", timeout: 0 });
    },
    [toastHandler]
  );

  const dismiss = React.useCallback(
    (id?: string) => {
      toastManager.close(id);
    },
    [toastManager]
  );

  const promise = React.useCallback(
    async <T,>(
      p: Promise<T>,
      msgs: {
        loading: React.ReactNode;
        success: React.ReactNode | ((data: T) => React.ReactNode);
        error: React.ReactNode | ((err: unknown) => React.ReactNode);
      }
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
        const errorTitle =
          typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
        toastManager.update(toastId, {
          title: errorTitle,
          type: "error",
          timeout: 4500,
        });
        throw err;
      }
    },
    [toastHandler, toastManager]
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
    [toastHandler, success, error, warning, info, loading, dismiss, promise]
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
