import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.ComponentProps<"div"> {
  variant?: "elevated" | "filled" | "outlined";
}

export function Card({ className, variant = "elevated", ref, ...props }: CardProps) {
  const variantStyles = {
    elevated: "bg-surface-container-low text-foreground shadow-sm border-none",
    filled: "bg-surface-container-highest text-foreground border-none",
    outlined: "bg-card text-card-foreground border border-outline-variant",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl transition-all duration-200 ease-m3-emphasized p-6",
        variantStyles[variant],
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
      className={cn("flex items-center pt-4 border-t border-outline-variant", className)}
      {...props}
    />
  );
}
