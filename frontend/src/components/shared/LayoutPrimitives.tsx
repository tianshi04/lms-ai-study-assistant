import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, renderPolymorphicElement, type BaseUIRenderProp } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Container Primitive                                                        */
/* -------------------------------------------------------------------------- */

export const containerVariants = cva("w-full mx-auto", {
  variants: {
    size: {
      sm: "max-w-3xl",
      md: "max-w-4xl",
      lg: "max-w-5xl",
      xl: "max-w-6xl",
      "7xl": "max-w-7xl",
      full: "max-w-full",
    },
    padding: {
      none: "p-0",
      normal: "px-4 sm:px-6 lg:px-8",
      relaxed: "px-6 sm:px-8 lg:px-12",
    },
  },
  defaultVariants: {
    size: "7xl",
    padding: "normal",
  },
});

export interface ContainerProps
  extends React.ComponentProps<"div">, VariantProps<typeof containerVariants> {
  render?: BaseUIRenderProp;
}

export function Container({
  className,
  size,
  padding,
  render,
  children,
  ref,
  ...props
}: ContainerProps) {
  const compClasses = cn(containerVariants({ size, padding, className }));
  return renderPolymorphicElement(
    render,
    { ref, className: compClasses, children, ...props },
    "div",
  );
}

/* -------------------------------------------------------------------------- */
/* Section Primitive                                                          */
/* -------------------------------------------------------------------------- */

export const sectionVariants = cva("", {
  variants: {
    spacing: {
      none: "py-0",
      sm: "py-6 sm:py-8",
      md: "py-10 sm:py-12",
      lg: "py-16 sm:py-20",
    },
    divider: {
      none: "",
      bottom: "border-b border-border",
      top: "border-t border-border",
      all: "border-y border-border",
    },
  },
  defaultVariants: {
    spacing: "md",
    divider: "none",
  },
});

export interface SectionProps
  extends React.ComponentProps<"section">, VariantProps<typeof sectionVariants> {
  render?: BaseUIRenderProp;
}

export function Section({
  className,
  spacing,
  divider,
  render,
  children,
  ref,
  ...props
}: SectionProps) {
  const compClasses = cn(sectionVariants({ spacing, divider, className }));
  return renderPolymorphicElement(
    render,
    { ref, className: compClasses, children, ...props },
    "section",
  );
}

/* -------------------------------------------------------------------------- */
/* PageHeader Compound Primitives                                             */
/* -------------------------------------------------------------------------- */

export function PageHeaderTitle({
  className,
  ref,
  children,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      ref={ref}
      className={cn(
        "text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground text-balance",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function PageHeaderDescription({
  className,
  ref,
  children,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground max-w-3xl leading-relaxed", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function PageHeaderActions({
  className,
  ref,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      className={cn("flex items-center gap-3 shrink-0 flex-wrap", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PageHeaderBreadcrumbs({
  className,
  ref,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div ref={ref} className={cn("text-xs text-muted-foreground mb-2", className)} {...props}>
      {children}
    </div>
  );
}

export function PageHeaderBadge({
  className,
  ref,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
}

export interface PageHeaderProps extends React.ComponentProps<"div"> {
  render?: BaseUIRenderProp;
}

export function PageHeader({ className, children, render, ref, ...props }: PageHeaderProps) {
  const compClasses = cn(
    "flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border mb-6",
    className,
  );
  return renderPolymorphicElement(
    render,
    { ref, className: compClasses, children, ...props },
    "div",
  );
}

/* -------------------------------------------------------------------------- */
/* Stack Layout Primitive                                                     */
/* -------------------------------------------------------------------------- */

export const stackVariants = cva("flex", {
  variants: {
    direction: {
      column: "flex-col",
      row: "flex-row",
    },
    gap: {
      1: "gap-1",
      2: "gap-2",
      3: "gap-3",
      4: "gap-4",
      6: "gap-6",
      8: "gap-8",
      10: "gap-10",
      12: "gap-12",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
    },
    wrap: {
      nowrap: "flex-nowrap",
      wrap: "flex-wrap",
      reverse: "flex-wrap-reverse",
    },
  },
  defaultVariants: {
    direction: "column",
    gap: 4,
    align: "start",
    justify: "start",
    wrap: "nowrap",
  },
});

export interface StackProps
  extends React.ComponentProps<"div">, VariantProps<typeof stackVariants> {
  render?: BaseUIRenderProp;
}

export function Stack({
  className,
  direction,
  gap,
  align,
  justify,
  wrap,
  render,
  children,
  ref,
  ...props
}: StackProps) {
  const compClasses = cn(
    stackVariants({
      direction,
      gap,
      align,
      justify,
      wrap,
      className,
    }),
  );
  return renderPolymorphicElement(
    render,
    { ref, className: compClasses, children, ...props },
    "div",
  );
}
