import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Container Primitive                                                        */
/* -------------------------------------------------------------------------- */

const containerSizeClasses = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
} as const;

export interface ContainerProps extends React.ComponentProps<"div"> {
  size?: keyof typeof containerSizeClasses;
  padded?: boolean;
}

export function Container({
  className,
  size = "7xl",
  padded = true,
  ref,
  ...props
}: ContainerProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "w-full mx-auto",
        containerSizeClasses[size],
        padded ? "px-4 sm:px-6 lg:px-8" : null,
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Section Primitive                                                          */
/* -------------------------------------------------------------------------- */

const sectionSpacingClasses = {
  none: "py-0",
  sm: "py-6 sm:py-8",
  md: "py-10 sm:py-12",
  lg: "py-16 sm:py-20",
} as const;

export interface SectionProps extends React.ComponentProps<"section"> {
  spacing?: keyof typeof sectionSpacingClasses;
  bordered?: boolean;
}

export function Section({
  className,
  spacing = "md",
  bordered = false,
  ref,
  ...props
}: SectionProps) {
  return (
    <section
      ref={ref}
      className={cn(
        sectionSpacingClasses[spacing],
        bordered ? "border-b border-border" : null,
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* PageHeader Primitive                                                       */
/* -------------------------------------------------------------------------- */

export interface PageHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({
  className,
  title,
  description,
  breadcrumbs,
  actions,
  badge,
  ref,
  ...props
}: PageHeaderProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border mb-6",
        className,
      )}
      {...props}
    >
      <div className="space-y-1.5">
        {breadcrumbs ? (
          <div className="text-xs text-muted-foreground mb-2">{breadcrumbs}</div>
        ) : null}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground text-balance">
            {title}
          </h1>
          {badge ? <div>{badge}</div> : null}
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-3 shrink-0 flex-wrap">{actions}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stack Layout Primitive                                                     */
/* -------------------------------------------------------------------------- */

const stackGapClasses = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
} as const;

const stackAlignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

const stackJustifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
} as const;

export interface StackProps extends React.ComponentProps<"div"> {
  direction?: "row" | "column";
  gap?: keyof typeof stackGapClasses;
  align?: keyof typeof stackAlignClasses;
  justify?: keyof typeof stackJustifyClasses;
  wrap?: boolean;
}

export function Stack({
  className,
  direction = "column",
  gap = 4,
  align = "start",
  justify = "start",
  wrap = false,
  ref,
  ...props
}: StackProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex",
        direction === "column" ? "flex-col" : "flex-row",
        stackGapClasses[gap],
        stackAlignClasses[align],
        stackJustifyClasses[justify],
        wrap ? "flex-wrap" : null,
        className,
      )}
      {...props}
    />
  );
}
