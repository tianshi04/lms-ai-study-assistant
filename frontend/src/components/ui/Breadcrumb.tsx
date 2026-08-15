import * as React from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

function BreadcrumbNav({ className, ref, ...props }: React.ComponentProps<"nav">) {
  return <nav ref={ref} aria-label="breadcrumb" className={cn("", className)} {...props} />;
}

export const Breadcrumb = Object.assign(BreadcrumbNav, {
  Root: BreadcrumbNav,
  List: BreadcrumbList,
  Item: BreadcrumbItem,
  Link: BreadcrumbLink,
  Page: BreadcrumbPage,
  Separator: BreadcrumbSeparator,
  Ellipsis: BreadcrumbEllipsis,
});

function BreadcrumbList({ className, ref, ...props }: React.ComponentProps<"ol">) {
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

function BreadcrumbItem({ className, ref, ...props }: React.ComponentProps<"li">) {
  return <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />;
}

export interface BreadcrumbLinkProps extends React.ComponentProps<"a"> {
  render?: React.ReactElement<any>;
}

function BreadcrumbLink({ className, render, children, ref, ...props }: BreadcrumbLinkProps) {
  const compClasses = cn(
    "transition-colors hover:text-foreground text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm",
    className,
  );

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
    <a ref={ref} className={compClasses} {...props}>
      {children}
    </a>
  );
}

function BreadcrumbPage({ className, ref, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      ref={ref}
      aria-current="page"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ref, ...props }: React.ComponentProps<"li">) {
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

function BreadcrumbEllipsis({ className, ref, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn("flex h-9 w-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
      <span className="sr-only">Xem thêm</span>
    </span>
  );
}
