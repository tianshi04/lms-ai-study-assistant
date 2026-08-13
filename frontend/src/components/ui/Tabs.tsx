import * as React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

function TabsList({ className, ref, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      ref={ref}
      className={cn("flex border-b border-border gap-2 md:gap-4", className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ref,
  render,
  nativeButton,
  ...props
}: React.ComponentProps<typeof BaseTabs.Tab>) {
  const isNativeButton = nativeButton ?? (render ? false : true);

  return (
    <BaseTabs.Tab
      ref={ref}
      render={render}
      nativeButton={isNativeButton}
      className={cn(
        "relative pb-3 pt-2 px-3 text-sm font-medium transition-colors duration-m3-short-4 ease-m3-emphasized flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground -mb-px after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:rounded-t-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "data-[selected]:text-primary data-[selected]:font-bold data-[selected]:after:bg-primary",
        "aria-selected:text-primary aria-selected:font-bold aria-selected:after:bg-primary",
        "data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:after:bg-primary",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ref, ...props }: React.ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel
      ref={ref}
      className={cn(
        "pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-in fade-in duration-m3-medium-1 ease-m3-decelerate",
        className,
      )}
      {...props}
    />
  );
}

export const Tabs = Object.assign(BaseTabs.Root, {
  Root: BaseTabs.Root,
  List: TabsList,
  Tab: TabsTrigger,
  Trigger: TabsTrigger,
  Panel: TabsContent,
  Content: TabsContent,
});
