"use client";

import { Search, X } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { ThreadResolutionFilter } from "@/gen/forum/v1/forum_pb";

interface ForumSearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  resolutionFilter: ThreadResolutionFilter;
  onResolutionChange: (value: ThreadResolutionFilter) => void;
  compact?: boolean;
  isSearching?: boolean;
  placeholder?: string;
}

const RESOLUTION_FILTER_OPTIONS: ReadonlyArray<{
  value: ThreadResolutionFilter;
  label: string;
}> = [
  { value: ThreadResolutionFilter.UNSPECIFIED, label: "Tất cả" },
  { value: ThreadResolutionFilter.SOLVED, label: "Đã giải quyết" },
  { value: ThreadResolutionFilter.UNSOLVED, label: "Chưa giải quyết" },
];

export function ForumSearchAndFilterBar({
  searchQuery,
  onSearchChange,
  resolutionFilter,
  onResolutionChange,
  compact = false,
  isSearching = false,
  placeholder = "Tìm kiếm câu hỏi, nội dung, tác giả…",
}: ForumSearchAndFilterBarProps) {
  return (
    <div
      className={
        compact
          ? "flex flex-col gap-2.5"
          : "flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      }
    >
      <div className={compact ? "w-full" : "flex-1 max-w-md"}>
        <Input
          type="search"
          name="forumSearch"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Tìm kiếm thảo luận diễn đàn"
          className={
            compact
              ? "h-9 text-xs [&::-webkit-search-cancel-button]:hidden"
              : "[&::-webkit-search-cancel-button]:hidden"
          }
          startAdornment={<Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />}
          endAdornment={
            searchQuery ? (
              <IconButton
                type="button"
                variant="standard"
                size="xs"
                aria-label="Xóa tìm kiếm"
                onClick={() => onSearchChange("")}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </IconButton>
            ) : undefined
          }
        />
      </div>

      <fieldset className="flex items-center gap-1.5 flex-wrap border-0 p-0 m-0">
        <legend className="sr-only">Lọc theo trạng thái giải quyết</legend>
        {RESOLUTION_FILTER_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            variant="filter"
            selected={resolutionFilter === option.value}
            onClick={() => onResolutionChange(option.value)}
            className={compact ? "h-7 px-2.5 text-xs" : undefined}
          >
            {option.label}
          </Chip>
        ))}
        {isSearching && (
          <span className="text-xs text-muted-foreground ml-1" aria-live="polite">
            Đang lọc…
          </span>
        )}
      </fieldset>
    </div>
  );
}
