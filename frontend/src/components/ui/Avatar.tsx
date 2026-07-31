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
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof avatarVariants> {
  name: string;
  src?: string;
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, src, size = "md", className = "", ...props }, ref) => {
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
            className={cn(
              avatarVariants({ size: selectedSize }),
              "border border-slate-200 dark:border-slate-700",
            )}
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
          "bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-white flex items-center justify-center shadow-sm",
          className,
        )}
        {...props}
      >
        {initials}
      </div>
    );
  },
);
Avatar.displayName = "Avatar";
