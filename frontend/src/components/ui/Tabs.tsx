import * as React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

export const TabsRoot = BaseTabs.Root;

export function TabsList({ className, ref, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      ref={ref}
      className={cn("flex border-b border-border gap-2 md:gap-4", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  isActive,
  ref,
  ...props
}: React.ComponentProps<typeof BaseTabs.Tab> & { isActive?: boolean }) {
  return (
    <BaseTabs.Tab
      ref={ref}
      className={cn(
        "relative pb-3 pt-2 px-3 text-sm font-medium transition-all duration-200 ease-m3-emphasized flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground -mb-px after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:rounded-t-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "data-[selected]:text-primary data-[selected]:font-bold data-[selected]:after:bg-primary",
        "aria-selected:text-primary aria-selected:font-bold aria-selected:after:bg-primary",
        "data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:after:bg-primary",
        isActive && "text-primary font-bold after:bg-primary",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel ref={ref} className={cn("pt-4 focus:outline-none", className)} {...props} />
  );
}

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = "" }) => {
  return (
    <TabsRoot value={activeTab} onValueChange={(val) => onChange(val as string)}>
      <TabsList className={className}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <TabsTrigger key={tab.id} value={tab.id} isActive={isActive}>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium transition-all duration-200 ease-m3-emphasized",
                    isActive
                      ? "bg-primary-container text-on-primary-container font-semibold"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </TabsRoot>
  );
};
