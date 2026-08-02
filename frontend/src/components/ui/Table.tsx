import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ref, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-auto rounded-lg border border-border">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm border-collapse text-foreground", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ref, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      ref={ref}
      className={cn("bg-muted/50 border-b border-border text-muted-foreground", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ref, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0 divide-y divide-border", className)}
      {...props}
    />
  );
}

export function TableFooter({ className, ref, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      ref={ref}
      className={cn("border-t border-border bg-muted/50 font-medium text-foreground", className)}
      {...props}
    />
  );
}

export function TableRow({ className, ref, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ref, ...props }: React.ComponentProps<"th">) {
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

export function TableCell({ className, ref, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      ref={ref}
      className={cn("p-4 align-middle text-foreground [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

export function TableCaption({ className, ref, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  );
}
