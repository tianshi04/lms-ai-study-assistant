"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export interface FilterOption {
  /** Select item values are strings; callers convert to and from their enum. */
  value: string;
  label: string;
}

interface AdminTableFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  statusValue: string;
  onStatusChange: (value: string) => void;
  statusLabel: string;
  statusOptions: FilterOption[];
}

/** Search box plus a status dropdown shared by the paged admin tables. */
export function AdminTableFilters({
  searchValue,
  onSearchChange,
  searchLabel,
  searchPlaceholder,
  statusValue,
  onStatusChange,
  statusLabel,
  statusOptions,
}: AdminTableFiltersProps) {
  const selectedLabel = statusOptions.find((option) => option.value === statusValue)?.label;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <Input
          type="search"
          name="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          startAdornment={<Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
          className="text-xs"
        />
      </div>
      <div className="w-full sm:w-56">
        <Select value={statusValue} onValueChange={(value) => onStatusChange(String(value ?? ""))}>
          <Select.Trigger aria-label={statusLabel} className="w-full text-xs">
            <Select.Value placeholder={statusLabel}>{selectedLabel}</Select.Value>
          </Select.Trigger>
          <Select.Content>
            {statusOptions.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>
    </div>
  );
}
