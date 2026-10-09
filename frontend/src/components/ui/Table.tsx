import * as React from "react";
import { cn } from "@/lib/utils";

function TableComponent({ className, ref, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-auto rounded-lg border border-outline-variant">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm border-collapse text-foreground", className)}
        {...props}
      />
    </div>
  );
}

export const Table = Object.assign(TableComponent, {
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
  Caption: TableCaption,
});

function TableHeader({ className, ref, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      ref={ref}
      className={cn(
        "bg-surface-container-low border-b border-outline-variant text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ref, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0 divide-y divide-outline-variant", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ref, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      ref={ref}
      className={cn(
        "border-t border-outline-variant bg-surface-container-low font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ref, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-outline-variant transition-colors hover:bg-surface-container-highest/50 data-[state=selected]:bg-surface-container-highest",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ref, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      ref={ref}
      className={cn(
        "h-10 px-4 text-left align-middle font-semibold text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ref, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      ref={ref}
      className={cn("p-4 align-middle text-foreground [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ref, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  );
}
