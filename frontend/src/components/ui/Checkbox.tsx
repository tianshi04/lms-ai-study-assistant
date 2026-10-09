import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

import { Field } from "./Field";

/* -------------------------------------------------------------------------- */
/* Checkbox Component (Material Design 3 Spec)                                */
/* Measurements: 18dp Box, 2dp Radius, 40dp State Layer, 48dp Touch Target    */
/* Colors: Selected = Primary; Unselected = Outline / On Surface Variant      */
/* Label Color: On Surface (remains the same whether selected or not)         */
/* -------------------------------------------------------------------------- */

export interface CheckboxProps extends React.ComponentProps<typeof BaseCheckbox.Root> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

function CheckboxComponent({
  label,
  description,
  error,
  helperText,
  indeterminate,
  containerClassName,
  className = "",
  id,
  ref,
  checked,
  ...props
}: CheckboxProps) {
  const generatedId = React.useId();
  const checkboxId = id || generatedId;

  const isIndeterminate = !!indeterminate;

  const checkboxElement = (
    <BaseCheckbox.Root
      ref={ref}
      id={checkboxId}
      checked={checked}
      indeterminate={isIndeterminate}
      className={cn(
        // Base layout & shape (Fixed MD3 Box Size: 18dp -> h-[18px] w-[18px], 2dp corner radius)
        "peer relative h-[18px] w-[18px] shrink-0 rounded-[2px] border-2 transition-all duration-m3-short-4 ease-m3-emphasized flex items-center justify-center cursor-pointer select-none mt-0.5",
        // Focus ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        // Color Roles - Unselected
        "border-outline bg-transparent text-transparent hover:border-on-surface",
        // Color Roles - Selected & Indeterminate
        "data-[checked]:bg-primary data-[state=checked]:bg-primary data-[checked]:border-primary data-[state=checked]:border-primary data-[checked]:text-on-primary data-[state=checked]:text-on-primary",
        "data-[indeterminate]:bg-primary data-[state=indeterminate]:bg-primary data-[indeterminate]:border-primary data-[state=indeterminate]:border-primary data-[indeterminate]:text-on-primary data-[state=indeterminate]:text-on-primary",
        // State layer (Fixed MD3 State Layer Size: 40dp -> 40px circular overlay)
        "before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-[40px] before:h-[40px] before:rounded-full before:content-[''] before:transition-colors",
        "hover:before:bg-on-surface-variant/10 data-[checked]:hover:before:bg-primary/10 data-[state=checked]:hover:before:bg-primary/10 data-[indeterminate]:hover:before:bg-primary/10 data-[state=indeterminate]:hover:before:bg-primary/10",
        "active:scale-95 active:before:bg-on-surface-variant/15 data-[checked]:active:before:bg-primary/20 data-[state=checked]:active:before:bg-primary/20 data-[indeterminate]:active:before:bg-primary/20 data-[state=indeterminate]:active:before:bg-primary/20",
        // Touch Target (Fixed MD3 Target Size: 48dp -> 48px touch target area for accessibility)
        "after:pointer-events-none after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-[48px] after:h-[48px] after:content-['']",
        // Disabled state (0.38 opacity, no state layer)
        "disabled:cursor-not-allowed disabled:border-on-surface/38 disabled:bg-transparent disabled:opacity-38 data-disabled:opacity-38 disabled:before:hidden disabled:after:hidden",
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

  if (!label && !description && !error && !helperText) {
    return checkboxElement;
  }

  return (
    <Field.Root invalid={!!error} className={cn("space-y-1", containerClassName)}>
      <label
        htmlFor={checkboxId}
        className="group flex items-start gap-3 cursor-pointer select-none py-1 px-1 rounded-lg transition-colors duration-m3-short-4 hover:bg-surface-container-low/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-38"
      >
        {checkboxElement}
        <div className="flex-1 min-w-0">
          {label && (
            <span className="text-sm font-medium text-on-surface leading-tight block">{label}</span>
          )}
          {description && (
            <p className="text-xs text-on-surface-variant leading-normal mt-0.5">{description}</p>
          )}
        </div>
      </label>
      {error && <Field.Error>{error}</Field.Error>}
      {helperText && !error && <Field.Description>{helperText}</Field.Description>}
    </Field.Root>
  );
}

export const Checkbox = Object.assign(CheckboxComponent, {
  Root: BaseCheckbox.Root,
  Indicator: BaseCheckbox.Indicator,
  Label: Field.Label,
  Error: Field.Error,
  Description: Field.Description,
  HelperText: Field.Description,
});
