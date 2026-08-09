import * as React from "react";
import { Select as BaseSelect } from "@base-ui/react/select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const SelectRoot = BaseSelect.Root;
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
        "w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary appearance-none cursor-pointer hover:border-ring transition-colors duration-m3-short-4 ease-m3-emphasized flex items-center justify-between gap-2",
        className,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon className="text-muted-foreground shrink-0">
        <ChevronDown aria-hidden="true" className="w-4 h-4" />
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
      <BaseSelect.Positioner
        sideOffset={6}
        className="z-dropdown outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BaseSelect.Popup
          ref={ref}
          className={cn(
            "min-w-[180px] overflow-hidden rounded-2xl bg-surface-container-high text-on-surface p-1.5 shadow-md border border-outline-variant animate-in fade-in zoom-in-95 duration-m3-short-3 ease-m3-decelerate",
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
        "relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-m3-short-3 ease-m3-emphasized text-on-surface data-[highlighted]:bg-surface-container-highest data-[selected]:bg-secondary-container data-[selected]:text-on-secondary-container data-[selected]:font-bold",
        className,
      )}
      {...props}
    >
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
      <BaseSelect.ItemIndicator className="text-on-secondary-container shrink-0">
        <Check aria-hidden="true" className="w-3.5 h-3.5" />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );
}

export const Select = Object.assign(BaseSelect.Root, {
  Root: BaseSelect.Root,
  Trigger: SelectTrigger,
  Value: BaseSelect.Value,
  Portal: BaseSelect.Portal,
  Positioner: BaseSelect.Positioner,
  Popup: SelectContent,
  Content: SelectContent,
  Item: SelectItem,
  ItemText: BaseSelect.ItemText,
  ItemIndicator: BaseSelect.ItemIndicator,
  Icon: BaseSelect.Icon,
});
