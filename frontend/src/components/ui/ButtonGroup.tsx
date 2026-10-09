import * as React from "react";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { cn } from "@/lib/utils";

export type ButtonGroupVariant = "standard" | "connected";
export type ButtonGroupSize = "xs" | "sm" | "md" | "lg" | "xl";
export type ButtonGroupShape = "round" | "square";
export type ButtonGroupColorStyle = "tonal" | "filled" | "outlined" | "elevated";

interface ButtonGroupContextValue {
  variant: ButtonGroupVariant;
  size: ButtonGroupSize;
  shape: ButtonGroupShape;
  colorStyle: ButtonGroupColorStyle;
}

const ButtonGroupContext = React.createContext<ButtonGroupContextValue>({
  variant: "standard",
  size: "md",
  shape: "round",
  colorStyle: "tonal",
});

export interface ButtonGroupProps extends Omit<
  React.ComponentProps<typeof BaseToggleGroup>,
  "value" | "defaultValue"
> {
  /** Variant: Standard (separated gaps: XS 18dp, S 12dp, M/L/XL 8dp) or Connected (fused with 2dp inner gap) */
  variant?: ButtonGroupVariant;
  /** Size: xs (28px), sm (32px), md (40px), lg (48px), xl (56px) */
  size?: ButtonGroupSize;
  /** Shape: round (fully round pill) or square (rounded corner box) */
  shape?: ButtonGroupShape;
  /** M3 Color Style: tonal, filled, outlined */
  colorStyle?: ButtonGroupColorStyle;
  /** Value(s) for controlled selection (single string or array of strings) */
  value?: string | readonly string[];
  /** Default value(s) for uncontrolled selection */
  defaultValue?: string | readonly string[];
}

function ButtonGroupComponent({
  variant = "standard",
  size = "md",
  shape = "round",
  colorStyle = "tonal",
  value,
  defaultValue,
  className,
  children,
  ref,
  ...props
}: ButtonGroupProps) {
  // M3 Inner Gaps:
  // Standard: XS: 18dp, S: 12dp, M: 8dp, L: 8dp, XL: 8dp
  // Connected: 2dp for all sizes
  const gapClasses = React.useMemo(() => {
    if (variant === "connected") return "gap-[2px]";
    switch (size) {
      case "xs":
        return "gap-[18px]";
      case "sm":
        return "gap-[12px]";
      case "lg":
      case "xl":
      case "md":
      default:
        return "gap-[8px]";
    }
  }, [variant, size]);

  // Normalize single string to array for BaseToggleGroup
  const normalizedValue = React.useMemo(() => {
    if (value === undefined) return undefined;
    return typeof value === "string" ? [value] : (value as string[]);
  }, [value]);

  const normalizedDefaultValue = React.useMemo(() => {
    if (defaultValue === undefined) return undefined;
    return typeof defaultValue === "string" ? [defaultValue] : (defaultValue as string[]);
  }, [defaultValue]);

  return (
    <ButtonGroupContext.Provider value={{ variant, size, shape, colorStyle }}>
      <BaseToggleGroup
        ref={ref}
        value={normalizedValue}
        defaultValue={normalizedDefaultValue}
        className={cn(
          "inline-flex items-center justify-center flex-wrap shrink-0",
          gapClasses,
          className,
        )}
        {...props}
      >
        {children}
      </BaseToggleGroup>
    </ButtonGroupContext.Provider>
  );
}

export interface ButtonGroupItemProps extends React.ComponentProps<typeof BaseToggle> {
  /** Icon to place inside item */
  icon?: React.ReactNode;
  /** Is icon-only item */
  isIconOnly?: boolean;
}

function ButtonGroupItem({
  icon,
  isIconOnly = false,
  className,
  children,
  ref,
  render,
  nativeButton,
  ...props
}: ButtonGroupItemProps) {
  const { variant, size, shape, colorStyle } = React.useContext(ButtonGroupContext);

  // Size specific dimensions & paddings
  const sizeClasses = React.useMemo(() => {
    switch (size) {
      case "xs":
        return isIconOnly
          ? "h-[28px] w-[28px] min-w-[28px] text-[11px] p-0 before:absolute before:inset-y-[-10px] before:inset-x-[-10px] before:content-['']"
          : "h-[28px] px-2.5 min-w-[28px] text-[11px] gap-1.5 before:absolute before:inset-y-[-10px] before:inset-x-0 before:content-['']";
      case "sm":
        return isIconOnly
          ? "h-[32px] w-[32px] min-w-[32px] text-xs p-0 before:absolute before:inset-y-[-8px] before:inset-x-[-8px] before:content-['']"
          : "h-[32px] px-3 min-w-[32px] text-xs gap-1.5 before:absolute before:inset-y-[-8px] before:inset-x-0 before:content-['']";
      case "lg":
        return isIconOnly
          ? "h-[48px] w-[48px] min-w-[48px] text-base p-0"
          : "h-[48px] px-5 min-w-[48px] text-base gap-2.5";
      case "xl":
        return isIconOnly
          ? "h-[56px] w-[56px] min-w-[56px] text-lg p-0"
          : "h-[56px] px-6 min-w-[56px] text-lg gap-3";
      case "md":
      default:
        return isIconOnly
          ? "h-[40px] w-[40px] min-w-[40px] text-sm p-0"
          : "h-[40px] px-4 min-w-[40px] text-sm gap-2";
    }
  }, [size, isIconOnly]);

  // Color Style variants (Tonal, Filled, Outlined)
  const colorClasses = React.useMemo(() => {
    switch (colorStyle) {
      case "filled":
        return cn(
          "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high",
          "data-[state=on]:bg-primary data-[pressed]:bg-primary data-[state=on]:text-on-primary data-[pressed]:text-on-primary",
        );
      case "elevated":
        return cn(
          "bg-surface-container-low text-on-surface shadow-2xs hover:shadow-xs hover:bg-surface-container-high border border-outline-variant/30",
          "data-[state=on]:bg-secondary-container data-[pressed]:bg-secondary-container data-[state=on]:text-on-secondary-container data-[pressed]:text-on-secondary-container data-[state=on]:shadow-md data-[state=on]:border-transparent",
        );
      case "outlined":
        return cn(
          "border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-lowest",
          "data-[state=on]:bg-secondary-container data-[pressed]:bg-secondary-container data-[state=on]:text-on-secondary-container data-[pressed]:text-on-secondary-container data-[state=on]:border-transparent data-[pressed]:border-transparent",
        );
      case "tonal":
      default:
        return cn(
          "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high",
          "data-[state=on]:bg-secondary-container data-[pressed]:bg-secondary-container data-[state=on]:text-on-secondary-container data-[pressed]:text-on-secondary-container",
        );
    }
  }, [colorStyle]);

  // M3 Inner Corner Radius Specs:
  // XS: 4dp, S: 8dp, M: 8dp, L: 16dp, XL: 20dp
  const shapeClasses = React.useMemo(() => {
    const innerRadiusMap: Record<ButtonGroupSize, string> = {
      xs: "rounded-[4px]",
      sm: "rounded-[8px]",
      md: "rounded-[8px]",
      lg: "rounded-[16px]",
      xl: "rounded-[20px]",
    };
    const innerRadius = innerRadiusMap[size];

    if (variant === "connected") {
      if (shape === "square") {
        return cn(
          innerRadius,
          "first:rounded-l-full last:rounded-r-full",
          "data-[state=on]:rounded-full data-[pressed]:rounded-full",
        );
      }

      // Round Connected: Outer shape fully round, inner shape is corner radius
      return cn(
        innerRadius,
        "first:rounded-l-full last:rounded-r-full",
        "data-[state=on]:rounded-full data-[pressed]:rounded-full",
      );
    }

    // Standard Button Group Morphing:
    if (shape === "square") {
      return cn(innerRadius, "data-[state=on]:rounded-full data-[pressed]:rounded-full");
    }
    return cn("rounded-full", `data-[state=on]:${innerRadius} data-[pressed]:${innerRadius}`);
  }, [variant, shape, size]);

  const isNativeButton = nativeButton ?? (render ? false : true);

  return (
    <BaseToggle
      ref={ref}
      render={render}
      nativeButton={isNativeButton}
      className={cn(
        "relative inline-flex items-center justify-center font-bold tracking-wide transition-all duration-m3-short-4 ease-m3-emphasized cursor-pointer select-none shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-38 data-[disabled]:opacity-38",
        sizeClasses,
        colorClasses,
        shapeClasses,
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="inline-flex items-center justify-center shrink-0 [&>svg]:stroke-[2.2]">
          {icon}
        </span>
      )}
      {children}
    </BaseToggle>
  );
}

export const ButtonGroup = Object.assign(ButtonGroupComponent, {
  Item: ButtonGroupItem,
});
