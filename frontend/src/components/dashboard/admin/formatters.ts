const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN");

export function formatVnd(amount: number): string {
  return vndFormatter.format(amount);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Returns `part / total` as a 0–100 percentage, or 0 when `total` is not positive. */
export function toPercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (part / total) * 100));
}

export function formatPercent(part: number, total: number): string {
  return `${toPercent(part, total).toFixed(1)}%`;
}

export type PageWindowItem = number | "ellipsis-start" | "ellipsis-end";

/**
 * Builds the page numbers shown in a pager: always the first and last page, plus up to
 * `siblings` pages on each side of the current one, with ellipses for the skipped ranges.
 * Example: current 6 of 12 → [1, "ellipsis-start", 5, 6, 7, "ellipsis-end", 12].
 */
export function buildPageWindow(
  currentPage: number,
  totalPages: number,
  siblings = 1,
): PageWindowItem[] {
  if (totalPages <= 0) return [];
  const first = 1;
  const last = totalPages;
  const start = Math.max(first + 1, currentPage - siblings);
  const end = Math.min(last - 1, currentPage + siblings);

  const items: PageWindowItem[] = [first];
  if (start > first + 1) items.push("ellipsis-start");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < last - 1) items.push("ellipsis-end");
  if (last > first) items.push(last);
  return items;
}

/** Formats an ISO-8601 timestamp in the vi-VN locale; returns the raw value when unparsable. */
export function formatDateTime(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}
