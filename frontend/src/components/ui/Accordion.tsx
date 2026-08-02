import * as React from "react";
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Accordion = BaseAccordion.Root;
export const AccordionItem = BaseAccordion.Item;

export function AccordionTrigger({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseAccordion.Trigger>) {
  return (
    <BaseAccordion.Header className="flex">
      <BaseAccordion.Trigger
        ref={ref}
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline text-foreground cursor-pointer group text-left",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[panel-open]:rotate-180 text-muted-foreground" />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseAccordion.Panel>) {
  return (
    <BaseAccordion.Panel
      ref={ref}
      className={cn(
        "overflow-hidden text-sm transition-all text-muted-foreground pb-4 pt-0",
        className,
      )}
      {...props}
    >
      <div>{children}</div>
    </BaseAccordion.Panel>
  );
}
