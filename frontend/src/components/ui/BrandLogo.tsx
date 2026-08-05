"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  href?: string;
}

export function BrandLogo({
  size = "md",
  showText = true,
  className = "",
  href = "/",
}: BrandLogoProps) {
  const sizeStyles = {
    sm: {
      box: "w-8 h-8 rounded-lg",
      icon: "w-4 h-4",
      text: "text-base font-bold",
    },
    md: {
      box: "w-10 h-10 rounded-xl",
      icon: "w-5.5 h-5.5",
      text: "text-lg font-extrabold",
    },
    lg: {
      box: "w-12 h-12 rounded-2xl",
      icon: "w-7 h-7",
      text: "text-2xl font-black",
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  const logoContent = (
    <div className={`flex items-center gap-3 group ${className}`}>
      <div
        className={`${currentSize.box} bg-gradient-to-br from-primary to-primary-hover text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 shrink-0 transition-transform group-hover:scale-105`}
      >
        <GraduationCap className={currentSize.icon} aria-hidden="true" />
      </div>
      {showText && (
        <span className={`${currentSize.text} tracking-tight text-foreground`}>
          LMS AI Platform
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} prefetch={true} aria-label="LMS AI Platform - Trang chủ">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
