"use client";

import React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export const brandLogoBoxVariants = cva(
  "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 shrink-0 transition-transform group-hover:scale-105",
  {
    variants: {
      size: {
        sm: "w-8 h-8 rounded-lg",
        md: "w-10 h-10 rounded-xl",
        lg: "w-12 h-12 rounded-2xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export const brandLogoIconVariants = cva("", {
  variants: {
    size: {
      sm: "w-4 h-4",
      md: "w-5.5 h-5.5",
      lg: "w-7 h-7",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const brandLogoTextVariants = cva("tracking-tight text-foreground", {
  variants: {
    size: {
      sm: "text-base font-bold",
      md: "text-lg font-extrabold",
      lg: "text-2xl font-black",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export function BrandLogoIcon({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg" | null;
  className?: string;
}) {
  return (
    <div className={cn(brandLogoBoxVariants({ size, className }))}>
      <GraduationCap className={cn(brandLogoIconVariants({ size }))} aria-hidden="true" />
    </div>
  );
}

export function BrandLogoText({
  size = "md",
  className,
  children = "LMS AI Platform",
}: {
  size?: "sm" | "md" | "lg" | null;
  className?: string;
  children?: React.ReactNode;
}) {
  return <span className={cn(brandLogoTextVariants({ size, className }))}>{children}</span>;
}

export interface BrandLogoProps
  extends React.ComponentProps<"div">, VariantProps<typeof brandLogoBoxVariants> {
  showText?: boolean;
  href?: string;
}

export function BrandLogo({
  size = "md",
  showText = true,
  className = "",
  href = "/",
  children,
  ref,
  ...props
}: BrandLogoProps) {
  const logoContent = (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl p-0.5",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <BrandLogoIcon size={size} />
          {showText && <BrandLogoText size={size} />}
        </>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        prefetch={true}
        aria-label="LMS AI Platform - Trang chủ"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl inline-block"
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
