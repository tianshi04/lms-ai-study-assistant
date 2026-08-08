"use client";

import * as React from "react";
import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { cn } from "@/lib/utils";

function CollapsibleTrigger({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseCollapsible.Trigger>) {
  return (
    <BaseCollapsible.Trigger
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

function CollapsibleContent({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseCollapsible.Panel>) {
  return (
    <BaseCollapsible.Panel
      ref={ref}
      className={cn(
        "overflow-hidden transition-colors duration-m3-short-4 ease-m3-emphasized data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down",
        className,
      )}
      {...props}
    />
  );
}

export const Collapsible = Object.assign(BaseCollapsible.Root, {
  Root: BaseCollapsible.Root,
  Trigger: CollapsibleTrigger,
  Panel: CollapsibleContent,
  Content: CollapsibleContent,
});
