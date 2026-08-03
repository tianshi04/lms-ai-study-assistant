import * as React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = BaseTooltip.Provider;
export const TooltipRoot = BaseTooltip.Root;
export const TooltipTrigger = BaseTooltip.Trigger;
export const TooltipPortal = BaseTooltip.Portal;

export interface TooltipContentProps extends React.ComponentProps<typeof BaseTooltip.Positioner> {
  children?: React.ReactNode;
}

export function TooltipContent({
  className,
  children,
  sideOffset = 4,
  ref,
  ...props
}: TooltipContentProps) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner sideOffset={sideOffset} ref={ref} {...props}>
        <BaseTooltip.Popup
          className={cn(
            "z-dropdown overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 transition-all",
            className,
          )}
        >
          {children}
          <BaseTooltip.Arrow className="fill-foreground" />
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

export interface SimpleTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function Tooltip({ content, children, side = "top" }: SimpleTooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger>{children}</BaseTooltip.Trigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </BaseTooltip.Root>
  );
}
