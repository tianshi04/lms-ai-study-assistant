import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Material Design 3 Card Specs & Measurements:
// - Shape: 12dp corner radius (rounded-xl / rounded-2xl)
// - Left/right padding: 16dp (px-4 / p-6)
// - Padding between cards: 8dp max (gap-2 / space-y-2)
// - Label text alignment: Start-aligned (text-left)
// 1. Elevated Card: bg-surface-container-low, Level 1 shadow-xs resting, Level 2 hover:shadow-md, Level 1 active:shadow-xs, Level 4 aria-grabbed:shadow-xl, Level 0 disabled:shadow-none
// 2. Filled Card: bg-surface-container-highest, Level 0 shadow-none resting, Level 1 hover:shadow-xs, Level 4 aria-grabbed:shadow-xl
// 3. Outlined Card: bg-surface-container-lowest, border border-outline-variant, Level 0 shadow-none resting, Level 1 hover:shadow-xs, Level 4 aria-grabbed:shadow-xl
export const cardVariants = cva(
  "rounded-xl sm:rounded-2xl transition-all duration-m3-short-4 ease-m3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 p-4 sm:p-6 text-left shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        elevated:
          "bg-surface-container-low text-on-surface shadow-xs hover:shadow-md active:shadow-xs aria-grabbed:shadow-xl disabled:shadow-none data-disabled:shadow-none disabled:opacity-38 data-disabled:opacity-38 border-none",
        filled:
          "bg-surface-container-highest text-on-surface shadow-none hover:shadow-xs active:shadow-none aria-grabbed:shadow-xl disabled:opacity-38 data-disabled:opacity-38 border-none",
        outlined:
          "bg-surface-container-lowest text-on-surface border border-outline-variant shadow-none hover:shadow-xs active:shadow-none aria-grabbed:shadow-xl disabled:opacity-38 data-disabled:opacity-38",
      },
    },
    defaultVariants: {
      variant: "elevated",
    },
  },
);

export interface CardProps extends React.ComponentProps<"div">, VariantProps<typeof cardVariants> {
  render?: React.ReactNode;
}

export function Card({ className, variant, render, children, ref, ...props }: CardProps) {
  const compClasses = cn(cardVariants({ variant, className }));

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
    <div ref={ref} className={compClasses} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 pb-4 text-left", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ref, children, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-bold leading-none tracking-tight text-on-surface text-left",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, ref, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-on-surface-variant text-left", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ref, ...props }: React.ComponentProps<"div">) {
  return <div ref={ref} className={cn("pt-0 text-left", className)} {...props} />;
}

export function CardFooter({ className, ref, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center pt-4 border-t border-outline-variant/50", className)}
      {...props}
    />
  );
}

export interface CardMediaProps extends React.ComponentProps<"div"> {
  aspect?: "video" | "square" | "wide" | "banner";
  scrim?: boolean;
}

export function CardMedia({
  className,
  aspect = "video",
  scrim = false,
  children,
  ref,
  ...props
}: CardMediaProps) {
  const aspectClass =
    aspect === "square"
      ? "aspect-square"
      : aspect === "wide"
        ? "aspect-[21/9]"
        : aspect === "banner"
          ? "aspect-[3/1]"
          : "aspect-video";

  return (
    <div
      ref={ref}
      className={cn(
        "-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4 overflow-hidden relative bg-muted",
        aspectClass,
        className,
      )}
      {...props}
    >
      {children}
      {scrim && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none"
        />
      )}
    </div>
  );
}

export interface CardDividerProps extends React.ComponentProps<"hr"> {
  inset?: boolean;
}

export function CardDivider({ className, inset = false, ref, ...props }: CardDividerProps) {
  return (
    <hr
      ref={ref}
      aria-hidden="true"
      className={cn(
        "border-none h-px bg-outline-variant/50 my-4",
        inset ? "mx-0" : "-mx-4 sm:-mx-6",
        className,
      )}
      {...props}
    />
  );
}
