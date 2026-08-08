"use client";

import * as React from "react";
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva("rounded-full object-cover shrink-0 select-none", {
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

export interface AvatarProps
  extends React.ComponentProps<typeof BaseAvatar.Root>, VariantProps<typeof avatarVariants> {
  name?: string;
  src?: string;
}

function AvatarComponent({
  name = "",
  src,
  size = "md",
  className = "",
  children,
  ref,
  ...props
}: AvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <BaseAvatar.Root
      ref={ref}
      className={cn(
        avatarVariants({ size }),
        "inline-flex items-center justify-center overflow-hidden border border-border bg-primary text-primary-foreground font-bold shadow-sm",
        className,
      )}
      {...props}
    >
      {children ? (
        children
      ) : (
        <>
          {src && <BaseAvatar.Image src={src} alt={name} className="h-full w-full object-cover" />}
          <BaseAvatar.Fallback className="flex h-full w-full items-center justify-center font-bold">
            {initials}
          </BaseAvatar.Fallback>
        </>
      )}
    </BaseAvatar.Root>
  );
}

export const Avatar = Object.assign(AvatarComponent, {
  Root: BaseAvatar.Root,
  Image: BaseAvatar.Image,
  Fallback: BaseAvatar.Fallback,
});
