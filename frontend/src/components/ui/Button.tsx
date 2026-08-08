"use client";

import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const primaryStyle = "bg-primary text-primary-foreground hover:bg-primary-hover";
const outlineStyle = "border border-outline text-primary hover:bg-primary/10";
const textStyle = "hover:bg-primary/10 text-primary";

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium rounded-full transition-colors duration-m3-short-4 ease-m3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
  {
    variants: {
      variant: {
        primary: primaryStyle,
        filled: primaryStyle,
        tonal: "bg-primary-container text-on-primary-container hover:brightness-95",
        secondary: "bg-secondary-container text-on-secondary-container hover:brightness-95",
        outline: outlineStyle,
        outlined: outlineStyle,
        elevated: "bg-surface-container-low text-primary shadow-sm hover:shadow-md",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive-hover focus-visible:ring-destructive/50",
        ghost: textStyle,
        text: textStyle,
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        icon: "h-9 w-9 p-0 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<typeof BaseButton>, VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  isLoading = false,
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  const compClasses = cn(buttonVariants({ variant, size, className }));

  return (
    <BaseButton
      ref={ref}
      className={compClasses}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <span aria-live="polite" className="inline-flex items-center gap-2">
          <Loader2 aria-hidden="true" className="animate-spin h-4 w-4 text-current" />
          Đang tải…
        </span>
      ) : (
        children
      )}
    </BaseButton>
  );
}
