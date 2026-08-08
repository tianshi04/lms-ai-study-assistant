import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, renderPolymorphicElement, type BaseUIRenderProp } from "@/lib/utils";

export const cardVariants = cva(
  "rounded-2xl transition-colors duration-m3-short-4 ease-m3-emphasized p-6",
  {
    variants: {
      variant: {
        elevated: "bg-surface-container-low text-on-surface shadow-sm border-none",
        filled: "bg-surface-container-highest text-on-surface border-none",
        outlined: "bg-surface-container-low text-on-surface border border-outline-variant",
      },
    },
    defaultVariants: {
      variant: "elevated",
    },
  },
);

export interface CardProps extends React.ComponentProps<"div">, VariantProps<typeof cardVariants> {
  render?: BaseUIRenderProp;
}

export function Card({ className, variant, render, children, ref, ...props }: CardProps) {
  const compClasses = cn(cardVariants({ variant, className }));
  return renderPolymorphicElement(
    render,
    { ref, className: compClasses, children, ...props },
    "div",
  );
}

export function CardHeader({ className, ref, ...props }: React.ComponentProps<"div">) {
  return <div ref={ref} className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props} />;
}

export function CardTitle({ className, ref, children, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight text-on-surface", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, ref, ...props }: React.ComponentProps<"p">) {
  return <p ref={ref} className={cn("text-sm text-on-surface-variant", className)} {...props} />;
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
