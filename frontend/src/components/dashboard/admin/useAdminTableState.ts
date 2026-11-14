"use client";

import { useState } from "react";
import type { PaginationState } from "@tanstack/react-table";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

/** Value of the proto filter enums that means "no status filter". */
const NO_STATUS_FILTER = 0;

/**
 * Pagination, search and status-filter state shared by the paged admin tables.
 * Any change to the search term or status filter goes back to the first page.
 */
export function useAdminTableState(pageSize: number) {
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState(NO_STATUS_FILTER);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });
  // Query with the debounced, trimmed term so typing does not fire a request per keystroke.
  const searchQuery = useDebouncedValue(searchInput.trim());

  const goToFirstPage = () => setPagination((current) => ({ ...current, pageIndex: 0 }));

  return {
    searchInput,
    searchQuery,
    status,
    pagination,
    setPagination,
    goToFirstPage,
    hasActiveFilters: searchQuery !== "" || status !== NO_STATUS_FILTER,
    onSearchChange: (value: string) => {
      setSearchInput(value);
      goToFirstPage();
    },
    onStatusChange: (value: string) => {
      setStatus(Number(value));
      goToFirstPage();
    },
  };
}
