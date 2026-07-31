import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Container Primitive                                                        */
/* -------------------------------------------------------------------------- */

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "7xl" | "full";
  padded?: boolean;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "7xl", padded = true, ...props }, ref) => {
    const sizeClasses = {
      sm: "max-w-3xl",
      md: "max-w-4xl",
      lg: "max-w-5xl",
      xl: "max-w-6xl",
      "7xl": "max-w-7xl",
      full: "max-w-full",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "w-full mx-auto",
          sizeClasses[size],
          padded && "px-4 sm:px-6 lg:px-8",
          className,
        )}
        {...props}
      />
    );
  },
);
Container.displayName = "Container";

/* -------------------------------------------------------------------------- */
/* Section Primitive                                                          */
/* -------------------------------------------------------------------------- */

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: "sm" | "md" | "lg" | "none";
  bordered?: boolean;
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, spacing = "md", bordered = false, ...props }, ref) => {
    const spacingClasses = {
      none: "py-0",
      sm: "py-6 sm:py-8",
      md: "py-10 sm:py-12",
      lg: "py-16 sm:py-20",
    };

    return (
      <section
        ref={ref}
        className={cn(
          spacingClasses[spacing],
          bordered && "border-b border-slate-200 dark:border-slate-800",
          className,
        )}
        {...props}
      />
    );
  },
);
Section.displayName = "Section";

/* -------------------------------------------------------------------------- */
/* PageHeader Primitive                                                       */
/* -------------------------------------------------------------------------- */

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, breadcrumbs, actions, badge, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800/80 mb-6",
          className,
        )}
        {...props}
      >
        <div className="space-y-1.5">
          {breadcrumbs && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{breadcrumbs}</div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0 flex-wrap">{actions}</div>}
      </div>
    );
  },
);
PageHeader.displayName = "PageHeader";

/* -------------------------------------------------------------------------- */
/* Stack Layout Primitive                                                     */
/* -------------------------------------------------------------------------- */

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column";
  gap?: 1 | 2 | 3 | 4 | 6 | 8 | 10 | 12;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  (
    {
      className,
      direction = "column",
      gap = 4,
      align = "start",
      justify = "start",
      wrap = false,
      ...props
    },
    ref,
  ) => {
    const gapClasses = {
      1: "gap-1",
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
      6: "gap-6",
      8: "gap-8",
      10: "gap-10",
      12: "gap-12",
    };

    const alignClasses = {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    };

    const justifyClasses = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          direction === "column" ? "flex-col" : "flex-row",
          gapClasses[gap],
          alignClasses[align],
          justifyClasses[justify],
          wrap && "flex-wrap",
          className,
        )}
        {...props}
      />
    );
  },
);
Stack.displayName = "Stack";
