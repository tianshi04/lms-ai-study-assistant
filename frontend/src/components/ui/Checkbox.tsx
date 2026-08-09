import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

import { FieldRoot, FieldLabel, FieldError, FieldDescription } from "./Field";

export const CheckboxRoot = BaseCheckbox.Root;
export const CheckboxIndicator = BaseCheckbox.Indicator;
export const CheckboxLabel = FieldLabel;
export const CheckboxError = FieldError;
export const CheckboxHelperText = FieldDescription;

export interface CheckboxProps extends React.ComponentProps<typeof BaseCheckbox.Root> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Checkbox({
  label,
  error,
  helperText,
  indeterminate,
  className = "",
  id,
  ref,
  checked,
  ...props
}: CheckboxProps) {
  const generatedId = React.useId();
  const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : generatedId);

  const isIndeterminate = !!indeterminate;

  const checkboxElement = (
    <BaseCheckbox.Root
      ref={ref}
      id={checkboxId}
      checked={checked}
      indeterminate={isIndeterminate}
      className={cn(
        "peer relative h-[18px] w-[18px] shrink-0 rounded-[2px] border-2 transition-all duration-m3-short-4 ease-m3-emphasized flex items-center justify-center cursor-pointer select-none",
        // M3 Measurements: 40dp State-layer & 48dp Touch Target
        "before:absolute before:w-[40px] before:h-[40px] before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:content-[''] before:transition-colors",
        "hover:before:bg-primary/10 active:before:bg-primary/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        // M3 States & Colors:
        // Unselected
        "border-outline bg-transparent hover:border-on-surface text-transparent",
        // Selected & Indeterminate
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-on-primary",
        "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:text-on-primary",
        // Disabled
        "disabled:cursor-not-allowed disabled:border-on-surface/38 disabled:bg-transparent disabled:opacity-38 data-disabled:opacity-38 disabled:before:hidden",
        error && "border-error hover:border-error focus-visible:ring-error/40",
        className,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator className="flex items-center justify-center text-current">
        {isIndeterminate ? (
          <Minus aria-hidden="true" className="h-[14px] w-[14px] stroke-[3]" />
        ) : (
          <Check aria-hidden="true" className="h-[14px] w-[14px] stroke-[3]" />
        )}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );

  if (!label && !error && !helperText) {
    return checkboxElement;
  }

  return (
    <FieldRoot invalid={!!error} className="space-y-1">
      <div className="flex items-center gap-3">
        {checkboxElement}
        {label && (
          <FieldLabel
            htmlFor={checkboxId}
            className="mb-0 text-sm font-medium text-on-surface cursor-pointer select-none"
          >
            {label}
          </FieldLabel>
        )}
      </div>
      {error && <FieldError>{error}</FieldError>}
      {helperText && !error && <FieldDescription>{helperText}</FieldDescription>}
    </FieldRoot>
  );
}
