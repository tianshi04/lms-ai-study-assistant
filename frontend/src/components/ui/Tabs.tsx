import * as React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

export const TabsRoot = BaseTabs.Root;

export function TabsList({ className, ref, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      ref={ref}
      className={cn("flex border-b border-border gap-6", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      ref={ref}
      className={cn(
        "pb-3 pt-2 text-sm font-medium transition-all duration-200 ease-m3-emphasized border-b-2 -mb-px flex items-center gap-2 cursor-pointer border-transparent text-muted-foreground hover:text-foreground data-[selected]:border-primary data-[selected]:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
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
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium transition-all duration-200 ease-m3-emphasized",
                    isActive
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-highest text-muted-foreground",
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
