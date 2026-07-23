import React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";

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
    <BaseTabs.Root value={activeTab} onValueChange={(val) => onChange(val as string)}>
      <BaseTabs.List className={`flex border-b border-slate-800 gap-6 ${className}`}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <BaseTabs.Tab
              key={tab.id}
              value={tab.id}
              className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "border-[#0056D2] text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? "bg-blue-900/60 text-blue-200" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </BaseTabs.Tab>
          );
        })}
      </BaseTabs.List>
    </BaseTabs.Root>
  );
};
