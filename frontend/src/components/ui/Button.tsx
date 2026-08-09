import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-m3-short-4 ease-m3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-38 data-disabled:opacity-38 disabled:pointer-events-none data-disabled:pointer-events-none cursor-pointer select-none relative",
  {
    variants: {
      variant: {
        filled: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
        tonal:
          "bg-secondary-container text-on-secondary-container hover:brightness-95 active:brightness-90",
        elevated:
          "bg-surface-container-low text-primary shadow-xs hover:shadow-md hover:bg-surface-container active:shadow-xs disabled:shadow-none data-disabled:shadow-none",
        outlined:
          "border border-outline text-on-surface-variant hover:bg-primary/10 active:bg-primary/15",
        text: "text-primary hover:bg-primary/10 active:bg-primary/15",
      },
      size: {
        xs: "h-8 px-3 text-xs gap-1 [&_svg]:size-5 active:rounded-md before:absolute before:inset-y-[-8px] before:inset-x-0 before:content-['']", // Height 32dp, Padding 12dp, Gap 4dp, Icon 20dp, Pressed 8dp, Touch Target 48dp
        sm: "h-10 px-4 text-xs font-medium gap-2 [&_svg]:size-5 active:rounded-md before:absolute before:inset-y-[-4px] before:inset-x-0 before:content-['']", // Height 40dp, Padding 16dp, Gap 8dp, Icon 20dp, Pressed 8dp, Touch Target 48dp
        md: "h-14 px-6 text-sm font-medium gap-2 [&_svg]:size-6 active:rounded-lg", // Height 56dp, Padding 24dp, Gap 8dp, Icon 24dp, Pressed 12dp
        lg: "h-24 px-12 text-lg font-bold gap-3 [&_svg]:size-8 active:rounded-xl", // Height 96dp, Padding 48dp, Gap 12dp, Icon 32dp, Pressed 16dp
        xl: "h-[136px] px-16 text-xl font-bold gap-4 [&_svg]:size-10 active:rounded-xl", // Height 136dp, Padding 64dp, Gap 16dp, Icon 40dp, Pressed 16dp
      },
    },
    defaultVariants: {
      variant: "filled",
      size: "sm",
    },
  },
);

// Square shape corner radius map per M3 Spec: XS/S -> 12dp, M -> 16dp, L/XL -> 28dp
const squareShapeMap = {
  xs: "rounded-lg", // 12dp
  sm: "rounded-lg", // 12dp
  md: "rounded-xl", // 16dp
  lg: "rounded-3xl", // 28dp
  xl: "rounded-3xl", // 28dp
};

const toggleStyles: Record<
  NonNullable<VariantProps<typeof buttonVariants>["variant"]>,
  { selected: string; unselected: string }
> = {
  elevated: {
    unselected:
      "bg-surface-container-low text-primary hover:bg-surface-container active:bg-surface-container-high",
    selected: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
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
  text: {
    unselected: "text-primary hover:bg-primary/10 active:bg-primary/15",
    selected:
      "bg-primary-container text-on-primary-container hover:brightness-95 active:brightness-90",
  },
};

const iconOnlySizeMap = {
  xs: "w-8 p-0 shrink-0 before:inset-x-[-8px]",
  sm: "w-10 p-0 shrink-0 before:inset-x-[-4px]",
  md: "w-14 p-0 shrink-0",
  lg: "w-24 p-0 shrink-0",
  xl: "w-[136px] p-0 shrink-0",
};

export interface ButtonProps
  extends React.ComponentProps<typeof BaseButton>, VariantProps<typeof buttonVariants> {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  iconOnly?: boolean;
  selected?: boolean;
  shape?: "round" | "square";
}

export function Button({
  className,
  variant,
  size,
  leadingIcon,
  trailingIcon,
  iconOnly = false,
  selected,
  shape = "round",
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  const activeVariant = variant ?? "filled";
  const activeSize = size ?? "sm";

  const isToggle = typeof selected === "boolean";
  const toggleStyleClass = isToggle
    ? selected
      ? toggleStyles[activeVariant].selected
      : toggleStyles[activeVariant].unselected
    : "";

  // Shape resolution per M3 Inversion Rule:
  // - If shape="round": unselected = round (rounded-full), selected = square (12/16/28dp)
  // - If shape="square": unselected = square (12/16/28dp), selected = round (rounded-full)
  const isSquareState =
    (!isToggle && shape === "square") ||
    (isToggle && ((shape === "round" && selected) || (shape === "square" && !selected)));

  const shapeClass = isSquareState ? squareShapeMap[activeSize] : "rounded-full";

  const compClasses = cn(
    buttonVariants({ variant: activeVariant, size: activeSize }),
    shapeClass,
    isToggle && toggleStyleClass,
    iconOnly && iconOnlySizeMap[activeSize],
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
      {leadingIcon && <span className="inline-flex shrink-0">{leadingIcon}</span>}
      {children}
      {trailingIcon && <span className="inline-flex shrink-0">{trailingIcon}</span>}
    </BaseButton>
  );
}
