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
}

/** Renders a TanStack Table instance with the design-system `Table` primitive. */
export function AdminDataTable<TData>({
  table,
  columnClassNames = {},
}: AdminDataTableProps<TData>) {
  // The TanStack `table` instance keeps the same identity while its rows change, so a
  // compiler-memoized child would never re-render with new data.
  "use no memo";

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
        {table.getRowModel().rows.map((row) => (
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
