import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-card text-card-foreground rounded-xl border border-border shadow-sm p-6",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ref, ...props }: React.ComponentProps<"div">) {
  return <div ref={ref} className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props} />;
}

export function CardTitle({ className, ref, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ref, ...props }: React.ComponentProps<"p">) {
  return <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ref, ...props }: React.ComponentProps<"div">) {
  return <div ref={ref} className={cn("pt-0", className)} {...props} />;
}

export function CardFooter({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center pt-4 border-t border-border", className)}
      {...props}
    />
  );
}
