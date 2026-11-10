"use client";

import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import { Table } from "@/components/ui/Table";

interface ColumnClassNames {
  head?: string;
  cell?: string;
}

interface AdminDataTableProps<TData> {
  table: TanstackTable<TData>;
  /** Extra classes per column id, e.g. right-aligned numeric columns. */
  columnClassNames?: Record<string, ColumnClassNames>;
  /** Shows placeholder rows inside the table body while the first page is loading. */
  isLoading?: boolean;
  skeletonRowCount?: number;
}

const SKELETON_ROW_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"];

/** Renders a TanStack Table instance with the design-system `Table` primitive. */
export function AdminDataTable<TData>({
  table,
  columnClassNames = {},
  isLoading = false,
  skeletonRowCount = 5,
}: AdminDataTableProps<TData>) {
  // The TanStack `table` instance keeps the same identity while its rows change, so a
  // compiler-memoized child would never re-render with new data.
  "use no memo";

  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const skeletonRows = SKELETON_ROW_KEYS.slice(0, skeletonRowCount);

  return (
    <Table>
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Head key={header.id} className={columnClassNames[header.column.id]?.head}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Head>
            ))}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body>
        {isLoading && rows.length === 0
          ? skeletonRows.map((rowKey) => (
              <Table.Row key={rowKey} aria-busy="true">
                {visibleColumns.map((column) => (
                  <Table.Cell key={column.id} className={columnClassNames[column.id]?.cell}>
                    <div className="h-4 w-full max-w-36 rounded bg-muted animate-pulse" />
                  </Table.Cell>
                ))}
              </Table.Row>
            ))
          : rows.map((row) => (
              <Table.Row key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell key={cell.id} className={columnClassNames[cell.column.id]?.cell}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
      </Table.Body>
    </Table>
  );
}
