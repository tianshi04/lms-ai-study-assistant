import * as React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

export const TabsRoot = BaseTabs.Root;

export function TabsList({ className, ref, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      ref={ref}
      className={cn("flex border-b border-slate-200 dark:border-slate-800 gap-6", className)}
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
        "pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-2 cursor-pointer border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 data-[selected]:border-[#0056D2] data-[selected]:text-[#0056D2] dark:data-[selected]:text-blue-400 focus:outline-none",
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
                    "text-xs px-2 py-0.5 rounded-full font-medium transition-colors",
                    isActive
                      ? "bg-blue-100 text-[#0056D2] dark:bg-blue-900/60 dark:text-blue-200"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
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
