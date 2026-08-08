import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const cardVariants = cva(
  "rounded-2xl transition-colors duration-m3-short-4 ease-m3-emphasized p-6",
  {
    variants: {
      variant: {
        elevated: "bg-surface-container-low text-foreground shadow-sm border-none",
        filled: "bg-surface-container-highest text-foreground border-none",
        outlined: "bg-card text-card-foreground border border-outline-variant",
      },
    },
    defaultVariants: {
      variant: "elevated",
    },
  },
);

export interface CardProps extends React.ComponentProps<"div">, VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

export function Card({ className, variant, asChild = false, children, ref, ...props }: CardProps) {
  const compClasses = cn(cardVariants({ variant, className }));

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      ...props,
      ...child.props,
      ref,
      className: cn(compClasses, child.props.className),
    });
  }

  return (
    <div ref={ref} className={compClasses} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, ref, ...props }: React.ComponentProps<"div">) {
  return <div ref={ref} className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props} />;
}

export function CardTitle({ className, ref, children, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-card-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
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
