import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover focus:ring-ring",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted focus:ring-ring",
        outline:
          "border border-border text-foreground hover:bg-accent hover:text-accent-foreground focus:ring-ring",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive",
        ghost: "hover:bg-accent hover:text-accent-foreground text-foreground focus:ring-ring",
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        icon: "h-9 w-9 p-0",
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
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  isLoading = false,
  asChild = false,
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  const compClasses = cn(buttonVariants({ variant, size, className }));

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      ...props,
      ...child.props,
      ref,
      className: cn(compClasses, child.props.className),
      disabled: disabled || isLoading || child.props.disabled,
    });
  }

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
          <Loader2 className="animate-spin h-4 w-4 text-current" />
          Đang tải…
        </span>
      ) : (
        children
      )}
    </BaseButton>
  );
}
