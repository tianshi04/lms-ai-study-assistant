import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// M3 Badge Measurements:
// Small badge: 6dp x 6dp (h-[6px] w-[6px]), 3dp corner radius (rounded-full)
// Large badge: 16dp height (h-4), 16dp min-width (min-w-4), 34dp max width (max-w-[34px]), 8dp corner radius (rounded-full), 4dp padding (px-1)
export const badgeVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors duration-m3-short-4 ease-m3-emphasized shrink-0 select-none",
  {
    variants: {
      variant: {
        error: "bg-error text-on-error",
        primary: "bg-primary text-on-primary",
        secondary: "bg-secondary-container text-on-secondary-container",
        tertiary: "bg-tertiary-container text-on-tertiary-container",
        outlined: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
        success: "bg-success/15 text-success border border-success/30",
        warning: "bg-warning/15 text-warning border border-warning/30",
      },
      size: {
        dot: "h-[6px] w-[6px] p-0 rounded-full", // Small Badge: 6dp x 6dp, 3dp corner radius, no text
        large:
          "h-4 min-w-4 max-w-[34px] px-1 rounded-full text-[11px] font-medium leading-none tracking-tight overflow-hidden whitespace-nowrap", // Large Badge: 16dp height, 16dp min-width, 34dp max-width, 8dp radius, 4dp padding
      },
    },
    defaultVariants: {
      variant: "error",
      size: "large",
    },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  dot?: boolean;
  render?: React.ReactNode;
}

export function Badge({
  className,
  variant = "error",
  size,
  dot = false,
  render,
  children,
  ref,
  ...props
}: BadgeProps) {
  const activeSize = dot ? "dot" : (size ?? "large");
  const compClasses = cn(badgeVariants({ variant, size: activeSize, className }));

  if (render && React.isValidElement(render)) {
    const element = render as React.ReactElement<any>;
    return React.cloneElement(element, {
      ...props,
      ...element.props,
      ref,
      className: cn(compClasses, element.props.className),
    });
  }

  return (
    <span ref={ref} className={compClasses} {...props}>
      {!dot && children}
    </span>
  );
}
