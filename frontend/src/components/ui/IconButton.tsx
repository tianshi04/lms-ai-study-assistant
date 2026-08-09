import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full font-medium transition-all duration-m3-short-4 ease-m3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-38 data-disabled:opacity-38 disabled:pointer-events-none data-disabled:pointer-events-none cursor-pointer select-none relative shrink-0",
  {
    variants: {
      variant: {
        standard:
          "text-on-surface-variant hover:bg-on-surface-variant/10 active:bg-on-surface-variant/15",
        filled: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
        tonal:
          "bg-secondary-container text-on-secondary-container hover:brightness-95 active:brightness-90",
        outlined:
          "border border-outline text-on-surface-variant hover:bg-primary/10 active:bg-primary/15",
      },
      size: {
        xs: "h-8 [&_svg]:size-5 active:rounded-md before:absolute before:content-['']", // Height 32dp, Icon 20dp
        sm: "h-10 [&_svg]:size-6 active:rounded-md before:absolute before:content-['']", // Height 40dp, Icon 24dp
        md: "h-14 [&_svg]:size-6 active:rounded-lg", // Height 56dp, Icon 24dp
        lg: "h-24 [&_svg]:size-8 active:rounded-xl", // Height 96dp, Icon 32dp
        xl: "h-[136px] [&_svg]:size-10 active:rounded-xl", // Height 136dp, Icon 40dp
      },
    },
    defaultVariants: {
      variant: "standard",
      size: "sm",
    },
  },
);

// Measurements from official M3 Expressive Icon Button diagram:
// Default Width:  XS: 32dp, S: 40dp, M: 56dp, L: 96dp, XL: 136dp
// Narrow Width:   XS: 28dp, S: 32dp, M: 48dp, L: 64dp, XL: 104dp
// Wide Width:     XS: 40dp, S: 52dp, M: 72dp, L: 128dp, XL: 184dp
const widthMap: Record<
  "default" | "narrow" | "wide",
  Record<NonNullable<VariantProps<typeof iconButtonVariants>["size"]>, string>
> = {
  default: {
    xs: "w-8", // 32dp
    sm: "w-10", // 40dp
    md: "w-14", // 56dp
    lg: "w-24", // 96dp
    xl: "w-[136px]", // 136dp
  },
  narrow: {
    xs: "w-[28px]", // 28dp
    sm: "w-8", // 32dp
    md: "w-12", // 48dp
    lg: "w-16", // 64dp
    xl: "w-[104px]", // 104dp
  },
  wide: {
    xs: "w-10", // 40dp
    sm: "w-[52px]", // 52dp
    md: "w-[72px]", // 72dp
    lg: "w-32", // 128dp
    xl: "w-[184px]", // 184dp
  },
};

// Target Size Inset bounds per M3 Accessibility Diagram:
// XS (32dp visual height): Target area = 48x48dp
// S (40dp visual height): Target area = 48x48dp (or 48x52dp for wide width)
const targetInsetMap: Record<
  "default" | "narrow" | "wide",
  Record<NonNullable<VariantProps<typeof iconButtonVariants>["size"]>, string>
> = {
  default: {
    xs: "before:inset-y-[-8px] before:inset-x-[-8px]", // 48x48dp
    sm: "before:inset-y-[-4px] before:inset-x-[-4px]", // 48x48dp
    md: "",
    lg: "",
    xl: "",
  },
  narrow: {
    xs: "before:inset-y-[-8px] before:inset-x-[-10px]", // 48x48dp
    sm: "before:inset-y-[-4px] before:inset-x-[-8px]", // 48x48dp
    md: "",
    lg: "",
    xl: "",
  },
  wide: {
    xs: "before:inset-y-[-8px] before:inset-x-[-4px]", // 48x48dp
    sm: "before:inset-y-[-4px] before:inset-x-0", // 48x52dp
    md: "",
    lg: "",
    xl: "",
  },
};

const squareShapeMap = {
  xs: "rounded-lg", // 12dp
  sm: "rounded-lg", // 12dp
  md: "rounded-xl", // 16dp
  lg: "rounded-3xl", // 28dp
  xl: "rounded-3xl", // 28dp
};

const toggleStyles: Record<
  NonNullable<VariantProps<typeof iconButtonVariants>["variant"]>,
  { selected: string; unselected: string }
> = {
  standard: {
    unselected:
      "text-on-surface-variant hover:bg-on-surface-variant/10 active:bg-on-surface-variant/15",
    selected: "text-primary hover:bg-primary/10 active:bg-primary/15",
  },
  filled: {
    unselected:
      "bg-surface-container text-on-surface-variant hover:bg-surface-container-high active:bg-surface-container-highest",
    selected: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
  },
  tonal: {
    unselected:
      "bg-secondary-container text-on-secondary-container hover:brightness-95 active:brightness-90",
    selected: "bg-secondary text-on-secondary hover:brightness-95 active:brightness-90",
  },
  outlined: {
    unselected:
      "border border-outline text-on-surface-variant hover:bg-primary/10 active:bg-primary/15",
    selected:
      "bg-inverse-surface text-inverse-on-surface border-transparent hover:brightness-110 active:brightness-125",
  },
};

export interface IconButtonProps
  extends React.ComponentProps<typeof BaseButton>, VariantProps<typeof iconButtonVariants> {
  selected?: boolean;
  shape?: "round" | "square";
  width?: "default" | "narrow" | "wide";
}

export function IconButton({
  className,
  variant,
  size,
  selected,
  shape = "round",
  width = "default",
  disabled,
  children,
  ref,
  ...props
}: IconButtonProps) {
  const activeVariant = variant ?? "standard";
  const activeSize = size ?? "sm";

  const isToggle = typeof selected === "boolean";
  const toggleStyleClass = isToggle
    ? selected
      ? toggleStyles[activeVariant].selected
      : toggleStyles[activeVariant].unselected
    : "";

  const isSquareState =
    (!isToggle && shape === "square") ||
    (isToggle && ((shape === "round" && selected) || (shape === "square" && !selected)));

  const shapeClass = isSquareState ? squareShapeMap[activeSize] : "rounded-full";
  const widthClass = widthMap[width][activeSize];
  const targetInsetClass = targetInsetMap[width][activeSize];

  const compClasses = cn(
    iconButtonVariants({ variant: activeVariant, size: activeSize }),
    widthClass,
    targetInsetClass,
    shapeClass,
    isToggle && toggleStyleClass,
    className,
  );

  return (
    <BaseButton
      ref={ref}
      className={compClasses}
      disabled={disabled}
      aria-pressed={isToggle ? selected : undefined}
      {...props}
    >
      {children}
    </BaseButton>
  );
}
