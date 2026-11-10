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

const SKELETON_ROW_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6", "sk-7", "sk-8"];

/** Renders a TanStack Table instance with the design-system `Table` primitive. */
export function AdminDataTable<TData>({
  table,
  columnClassNames = {},
  isLoading = false,
  skeletonRowCount = 8,
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
                {visibleColumns.map((column, colIdx) => (
                  <Table.Cell key={column.id} className={columnClassNames[column.id]?.cell}>
                    {colIdx === 0 ? (
                      <div className="space-y-1.5 py-0.5">
                        <div className="h-4 w-44 rounded bg-muted/70 animate-pulse" />
                        <div className="h-3 w-28 rounded bg-muted/50 animate-pulse" />
                      </div>
                    ) : (
                      <div className="h-4 w-full max-w-24 rounded bg-muted/60 animate-pulse inline-block" />
                    )}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))
          : rows.map((row) => (
              <Table.Row key={row.id} className="animate-in fade-in duration-300 ease-out">
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
