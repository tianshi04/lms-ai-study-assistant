"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { buildPageWindow, formatNumber } from "./formatters";

interface AdminPaginationProps {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  /** Plural noun for the paged items, e.g. "khóa học". */
  itemLabel: string;
  /** Accessible name of the navigation landmark. */
  ariaLabel: string;
  onPageChange: (page: number) => void;
}

/** Numbered pager (prev / 1 … n / next) with a "showing X–Y of Z" summary. */
export function AdminPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  itemLabel,
  ariaLabel,
  onPageChange,
}: AdminPaginationProps) {
  const firstItem = (page - 1) * pageSize + 1;
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
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
        </IconButton>
        {buildPageWindow(page, totalPages).map((item) =>
          typeof item === "number" ? (
            <Button
              key={item}
              size="xs"
              variant={item === page ? "tonal" : "text"}
              aria-label={`Trang ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
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
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden="true" />
        </IconButton>
      </div>
    </nav>
  );
}
