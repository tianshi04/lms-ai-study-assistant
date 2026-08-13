import * as React from "react";
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Accordion = Object.assign(BaseAccordion.Root, {
  Root: BaseAccordion.Root,
  Item: BaseAccordion.Item,
  Header: BaseAccordion.Header,
  Trigger: AccordionTrigger,
  Panel: AccordionContent,
  Content: AccordionContent,
});

function AccordionTrigger({
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
          "flex flex-1 items-center justify-between py-4 font-medium transition-colors duration-m3-short-4 ease-m3-emphasized hover:no-underline text-foreground cursor-pointer group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg p-1",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 transition-transform duration-m3-medium-2 ease-m3-emphasized group-data-[panel-open]:rotate-180 text-muted-foreground"
        />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

function AccordionContent({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof BaseAccordion.Panel>) {
  return (
    <BaseAccordion.Panel
      ref={ref}
      className={cn(
        "overflow-hidden text-sm transition-all duration-m3-medium-2 ease-m3-decelerate text-muted-foreground pb-4 pt-0 data-[state=open]:animate-collapse-down data-[state=closed]:animate-collapse-up",
        className,
      )}
      {...props}
    >
      <div>{children}</div>
    </BaseAccordion.Panel>
  );
}
