import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Material Design 3 Surface Specification:
// - Non-interactive layout container / pane (no hover shadows or click states)
// - Uses M3 Tonal Surface hierarchy (lowest, low, container, high, highest, dim, bright)
// - Uses M3 Corner Shape tokens (none, xs, sm, md, lg, xl, 2xl, 3xl, full)
export const surfaceVariants = cva(
  "shrink-0 relative transition-colors duration-m3-short-4 ease-m3-emphasized",
  {
    variants: {
      variant: {
        base: "bg-surface text-on-surface",
        lowest: "bg-surface-container-lowest text-on-surface",
        low: "bg-surface-container-low text-on-surface",
        container: "bg-surface-container text-on-surface",
        high: "bg-surface-container-high text-on-surface",
        highest: "bg-surface-container-highest text-on-surface",
        dim: "bg-surface-dim text-on-surface",
        bright: "bg-surface-bright text-on-surface",
      },
      shape: {
        none: "rounded-none",
        xs: "rounded-xs",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        "2xl": "rounded-2xl",
        "3xl": "rounded-3xl",
        full: "rounded-full",
      },
      border: {
        none: "border-none",
        default: "border border-outline-variant/40",
        outline: "border border-outline",
      },
      padding: {
        none: "p-0",
        sm: "p-3 sm:p-4",
        md: "p-4 sm:p-6",
        lg: "p-6 sm:p-8",
      },
    },
    defaultVariants: {
      variant: "low",
      shape: "2xl",
      border: "default",
      padding: "md",
    },
  },
);

export interface SurfaceProps
  extends React.ComponentProps<"div">, VariantProps<typeof surfaceVariants> {
  render?: React.ReactNode;
}

function SurfaceComponent({
  className,
  variant,
  shape,
  border,
  padding,
  render,
  children,
  ref,
  ...props
}: SurfaceProps) {
  const compClasses = cn(surfaceVariants({ variant, shape, border, padding, className }));

  if (render && React.isValidElement(render)) {
    const element = render as React.ReactElement<any>;
    return React.cloneElement(element, {
      ...props,
      ...element.props,
      ref,
      className: cn(compClasses, element.props.className),
      children: children ?? element.props.children,
    });
  }

  return (
    <div ref={ref} className={compClasses} {...props}>
      {children}
    </div>
  );
}

function SurfaceHeader({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 pb-4 text-left", className)}
      {...props}
    />
  );
}

function SurfaceTitle({ className, ref, children, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-bold leading-tight tracking-tight text-on-surface text-left",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

function SurfaceDescription({ className, ref, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-on-surface-variant text-left leading-relaxed", className)}
      {...props}
    />
  );
}

function SurfaceContent({ className, ref, ...props }: React.ComponentProps<"div">) {
  return <div ref={ref} className={cn("text-left", className)} {...props} />;
}

function SurfaceFooter({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-end pt-4 border-t border-outline-variant/40 gap-3",
        className,
      )}
      {...props}
    />
  );
}

export const Surface = Object.assign(SurfaceComponent, {
  Header: SurfaceHeader,
  Title: SurfaceTitle,
  Description: SurfaceDescription,
  Content: SurfaceContent,
  Footer: SurfaceFooter,
});
