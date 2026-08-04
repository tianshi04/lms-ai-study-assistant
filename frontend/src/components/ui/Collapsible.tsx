import * as React from "react";
import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { cn } from "@/lib/utils";

export const Collapsible = BaseCollapsible.Root;

export function CollapsibleTrigger({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseCollapsible.Trigger>) {
  return (
    <BaseCollapsible.Trigger
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

export function CollapsibleContent({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseCollapsible.Panel>) {
  return (
    <BaseCollapsible.Panel
      ref={ref}
      className={cn(
        "overflow-hidden transition-all duration-200 ease-m3-emphasized data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down",
        className,
      )}
      {...props}
    />
  );
}
