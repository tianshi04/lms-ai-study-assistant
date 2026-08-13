import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const chipVariants = cva(
  "inline-flex items-center justify-start gap-2 h-8 rounded-lg text-xs sm:text-sm font-medium transition-all duration-m3-short-4 ease-m3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-38 disabled:pointer-events-none select-none cursor-pointer shrink-0",
  {
    variants: {
      variant: {
        assist:
          "border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container-high active:scale-[0.98]",
        filter:
          "border border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface active:scale-[0.98] data-[selected=true]:bg-secondary-container data-[selected=true]:text-on-secondary-container data-[selected=true]:border-transparent",
        input:
          "border border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface active:scale-[0.98] data-[selected=true]:bg-secondary-container data-[selected=true]:text-on-secondary-container data-[selected=true]:border-transparent",
        suggestion:
          "border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container-high active:scale-[0.98]",
      },
      elevation: {
        flat: "shadow-none",
        elevated: "shadow-xs hover:shadow-md border-transparent bg-surface-container-low",
      },
    },
    defaultVariants: {
      variant: "assist",
      elevation: "flat",
    },
  },
);

export interface ChipProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">,
    VariantProps<typeof chipVariants> {
  leadingIcon?: React.ReactNode;
  avatar?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  selected?: boolean;
  onRemove?: (e: React.MouseEvent) => void;
  removeAriaLabel?: string;
  render?: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

export function Chip({
  className,
  variant = "assist",
  elevation = "flat",
  leadingIcon,
  avatar,
  trailingIcon,
  selected = false,
  onRemove,
  removeAriaLabel = "Remove tag",
  children,
  render,
  onClick,
  ...props
}: ChipProps) {
  const isFilter = variant === "filter";
  const isInput = variant === "input";

  const content = (
    <>
      {/* Avatar (24dp, 4dp left padding) */}
      {avatar ? (
        <span className="w-6 h-6 shrink-0 rounded-full overflow-hidden flex items-center justify-center -ml-1">
          {avatar}
        </span>
      ) : isFilter && selected ? (
        <Check aria-hidden="true" className="w-[18px] h-[18px] shrink-0 stroke-[2.5]" />
      ) : leadingIcon ? (
        <span className="w-[18px] h-[18px] shrink-0 flex items-center justify-center text-current">
          {leadingIcon}
        </span>
      ) : null}

      {/* Label text */}
      <span className="flex-1 truncate">{children}</span>

      {/* Trailing Icon for Filter/Dropdown Chips */}
      {trailingIcon && !isInput && (
        <span className="w-[18px] h-[18px] shrink-0 flex items-center justify-center text-current">
          {trailingIcon}
        </span>
      )}

      {/* Trailing Remove Button for Input Chip (18dp icon, 48dp Touch Target) */}
      {isInput && onRemove && (
        <button
          type="button"
          aria-label={removeAriaLabel}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          className="relative ml-0.5 rounded-full p-0.5 hover:bg-on-surface/12 active:bg-on-surface/20 transition-colors cursor-pointer inline-flex items-center justify-center border-none bg-transparent before:absolute before:-inset-2.5 before:rounded-full before:content-['']"
        >
          <X aria-hidden="true" className="w-[18px] h-[18px] stroke-[2.5]" />
        </button>
      )}
    </>
  );

  const hasAvatar = Boolean(avatar);
  const hasLeadingIcon = Boolean(leadingIcon || (isFilter && selected));
  const hasTrailingIcon = Boolean(trailingIcon && !isInput);

  const combinedClassName = cn(
    chipVariants({ variant, elevation }),
    // M3 Spec: Min-width 88dp for Input Chips with remove buttons to guarantee dual 48x48dp touch targets
    isInput && onRemove && "min-w-[88px]",
    hasAvatar ? "pl-[4px]" : hasLeadingIcon ? "pl-2" : "pl-4",
    hasTrailingIcon || (isInput && onRemove) ? "pr-2" : "pr-4",
    className,
  );

  const isToggle = isFilter || isInput;

  if (render) {
    return React.cloneElement(render, {
      className: cn(combinedClassName, render.props.className),
      "data-selected": isToggle ? selected : undefined,
      "aria-pressed": isToggle ? selected : undefined,
      onClick,
      ...props,
      children: content,
    } as React.HTMLAttributes<HTMLElement>);
  }

  if (onRemove) {
    const { type: _type, ...divProps } = props;
    return (
      <div className={combinedClassName} {...(divProps as React.HTMLAttributes<HTMLDivElement>)}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-selected={isToggle ? selected : undefined}
      aria-pressed={isToggle ? selected : undefined}
      onClick={onClick}
      className={combinedClassName}
      {...props}
    >
      {content}
    </button>
  );
}
