import * as React from "react";
import { Select as BaseSelect } from "@base-ui/react/select";
import { cn } from "@/lib/utils";

export const Select = BaseSelect.Root;
export const SelectValue = BaseSelect.Value;
export const SelectPortal = BaseSelect.Portal;

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger>
>(({ className, children, ...props }, ref) => (
  <BaseSelect.Trigger
    ref={ref}
    className={cn(
      "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none shadow-sm cursor-pointer hover:border-slate-300 transition-colors flex items-center justify-between gap-2",
      className,
    )}
    {...props}
  >
    {children}
    <BaseSelect.Icon className="text-slate-400 dark:text-slate-500 shrink-0">
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </BaseSelect.Icon>
  </BaseSelect.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Popup>
>(({ className, children, ...props }, ref) => (
  <SelectPortal>
    <BaseSelect.Positioner sideOffset={6} className="z-50 outline-none">
      <BaseSelect.Popup
        ref={ref}
        className={cn(
          "min-w-[180px] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-1.5 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150",
          className,
        )}
        {...props}
      >
        {children}
      </BaseSelect.Popup>
    </BaseSelect.Positioner>
  </SelectPortal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSelect.Item>
>(({ className, children, ...props }, ref) => (
  <BaseSelect.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800/80 data-[selected]:text-blue-600 dark:data-[selected]:text-blue-400",
      className,
    )}
    {...props}
  >
    <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
    <BaseSelect.ItemIndicator className="text-blue-600 dark:text-blue-400">
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </BaseSelect.ItemIndicator>
  </BaseSelect.Item>
));
SelectItem.displayName = "SelectItem";
