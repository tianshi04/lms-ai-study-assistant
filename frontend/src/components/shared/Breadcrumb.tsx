import * as React from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumb({ className, ref, ...props }: React.ComponentProps<"nav">) {
  return <nav ref={ref} aria-label="breadcrumb" className={cn("", className)} {...props} />;
}

export function BreadcrumbList({ className, ref, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
        className,
      )}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className, ref, ...props }: React.ComponentProps<"li">) {
  return <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />;
}

export interface BreadcrumbLinkProps extends React.ComponentProps<"a"> {
  asChild?: boolean;
}

export function BreadcrumbLink({
  className,
  asChild = false,
  children,
  ref,
  ...props
}: BreadcrumbLinkProps) {
  const compClasses = cn(
    "transition-colors hover:text-foreground text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm",
    className,
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      ...props,
      ...child.props,
      ref,
      className: cn(compClasses, child.props.className),
    });
  }

  return (
    <a ref={ref} className={compClasses} {...props}>
      {children}
    </a>
  );
}

export function BreadcrumbPage({ className, ref, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      ref={ref}
      aria-current="page"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function BreadcrumbSeparator({
  children,
  className,
  ref,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5 text-muted-foreground", className)}
      {...props}
    >
      {children ?? <ChevronRight aria-hidden="true" />}
    </li>
  );
}

export function BreadcrumbEllipsis({ className, ref, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn("flex h-9 w-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
      <span className="sr-only">More</span>
    </span>
  );
}
