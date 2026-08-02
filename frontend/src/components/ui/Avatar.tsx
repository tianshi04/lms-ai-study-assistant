import * as React from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const avatarVariants = cva("rounded-full object-cover shrink-0", {
  variants: {
    size: {
      sm: "w-7 h-7 text-xs",
      md: "w-9 h-9 text-sm",
      lg: "w-12 h-12 text-base",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const pixelSizes = {
  sm: 28,
  md: 36,
  lg: 48,
};

export interface AvatarProps
  extends React.ComponentProps<"div">, VariantProps<typeof avatarVariants> {
  name: string;
  src?: string;
}

export function Avatar({ name, src, size = "md", className = "", ref, ...props }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const selectedSize = size || "md";

  if (src) {
    const dim = pixelSizes[selectedSize];
    return (
      <div ref={ref} className={cn("inline-block shrink-0", className)} {...props}>
        <Image
          src={src}
          alt={name}
          width={dim}
          height={dim}
          unoptimized
          className={cn(avatarVariants({ size: selectedSize }), "border border-border")}
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="img"
      aria-label={name}
      className={cn(
        avatarVariants({ size: selectedSize }),
        "bg-primary font-bold text-primary-foreground flex items-center justify-center shadow-sm",
        className,
      )}
      {...props}
    >
      {initials}
    </div>
  );
}
