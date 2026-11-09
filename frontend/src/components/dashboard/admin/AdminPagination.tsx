"use client";

import type { Table as TanstackTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { buildPageWindow, formatNumber } from "./formatters";

interface AdminPaginationProps<TData> {
  /** TanStack Table instance configured with `manualPagination` and `rowCount`. */
  table: TanstackTable<TData>;
  /** Plural noun for the paged items, e.g. "khóa học". */
  itemLabel: string;
  /** Accessible name of the navigation landmark. */
  ariaLabel: string;
}

/** Numbered pager (prev / 1 … n / next) with a "showing X–Y of Z" summary. */
export function AdminPagination<TData>({
  table,
  itemLabel,
  ariaLabel,
}: AdminPaginationProps<TData>) {
  // The TanStack `table` instance keeps the same identity while its state changes, so a
  // compiler-memoized child would keep showing the previous page.
  "use no memo";

  const { pageIndex, pageSize } = table.getState().pagination;
  const page = pageIndex + 1;
  const totalCount = table.getRowCount();
  const firstItem = pageIndex * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalCount);

  return (
    <nav
      aria-label={ariaLabel}
      className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border"
    >
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Hiển thị {formatNumber(firstItem)}–{formatNumber(lastItem)} / {formatNumber(totalCount)}{" "}
        {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <IconButton
          size="xs"
          aria-label="Trang trước"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
        >
          <ChevronLeft aria-hidden="true" />
        </IconButton>
        {buildPageWindow(page, table.getPageCount()).map((item) =>
          typeof item === "number" ? (
            <Button
              key={item}
              size="xs"
              variant={item === page ? "tonal" : "text"}
              aria-label={`Trang ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => table.setPageIndex(item - 1)}
              className="min-w-8 px-2 font-mono"
            >
              {item}
            </Button>
          ) : (
            <span key={item} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </span>
          ),
        )}
        <IconButton
          size="xs"
          aria-label="Trang sau"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
        >
          <ChevronRight aria-hidden="true" />
        </IconButton>
      </div>
    </nav>
  );
}
