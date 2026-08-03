import * as React from "react";
import { Select as BaseSelect } from "@base-ui/react/select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = BaseSelect.Root;
export const SelectValue = BaseSelect.Value;
export const SelectPortal = BaseSelect.Portal;

export function SelectTrigger({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseSelect.Trigger>) {
  return (
    <BaseSelect.Trigger
      ref={ref}
      className={cn(
        "w-full bg-background border border-input rounded-xl px-4 py-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 appearance-none shadow-sm cursor-pointer hover:border-ring transition-colors flex items-center justify-between gap-2",
        className,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon className="text-muted-foreground shrink-0">
        <ChevronDown className="w-4 h-4" />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseSelect.Popup>) {
  return (
    <SelectPortal>
      <BaseSelect.Positioner sideOffset={6} className="z-dropdown outline-none">
        <BaseSelect.Popup
          ref={ref}
          className={cn(
            "min-w-[180px] overflow-hidden rounded-2xl bg-popover text-popover-foreground p-1.5 shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150",
            className,
          )}
          {...props}
        >
          {children}
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </SelectPortal>
  );
}

export function SelectItem({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseSelect.Item>) {
  return (
    <BaseSelect.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-colors hover:bg-accent text-foreground data-[highlighted]:bg-accent data-[selected]:text-primary",
        className,
      )}
      {...props}
    >
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
      <BaseSelect.ItemIndicator className="text-primary">
        <Check className="w-3.5 h-3.5" />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );
}
