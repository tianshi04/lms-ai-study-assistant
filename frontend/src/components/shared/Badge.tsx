import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, renderPolymorphicElement, type BaseUIRenderProp } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-m3-short-4 ease-m3-emphasized",
  {
    variants: {
      variant: {
        default: "bg-secondary-container text-on-secondary-container",
        primary: "bg-primary-container text-on-primary-container",
        secondary: "bg-secondary-container text-on-secondary-container",
        tertiary: "bg-tertiary-container text-on-tertiary-container",
        verified: "bg-primary-container text-on-primary-container border border-primary/20",
        staff: "bg-warning/15 text-warning border border-warning/30",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        danger: "bg-destructive/15 text-destructive",
        outline: "border border-outline-variant text-on-surface",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  render?: BaseUIRenderProp;
}

export function Badge({ className, variant, render, children, ref, ...props }: BadgeProps) {
  const compClasses = cn(badgeVariants({ variant, className }));
  return renderPolymorphicElement(
    render,
    { ref, className: compClasses, children, ...props },
    "span",
  );
}
