import * as React from "react";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { cn } from "@/lib/utils";

import { Field } from "./Field";

/* -------------------------------------------------------------------------- */
/* Radio Item (Standard MD3 Radio Control with Label & Description)           */
/* Fixed MD3 Specs: 20dp Icon, 10dp Dot, 40dp State Layer, 48dp Touch Target  */
/* Color Roles: Selected = Primary; Unselected = On Surface Variant / Outline  */
/* Label Color: On Surface (remains the same whether selected or not)         */
/* -------------------------------------------------------------------------- */

export interface RadioItemProps extends React.ComponentProps<typeof BaseRadio.Root> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  containerClassName?: string;
}

export function RadioItem({
  label,
  description,
  id,
  containerClassName,
  className,
  ref,
  ...props
}: RadioItemProps) {
  const generatedId = React.useId();
  const radioId = id || generatedId;

  const radioElement = (
    <BaseRadio.Root
      ref={ref}
      id={radioId}
      className={cn(
        // Base layout & shape (Fixed MD3 Icon Size: 20dp -> h-5 w-5)
        "peer relative h-5 w-5 shrink-0 rounded-full border-2 transition-all duration-m3-short-4 ease-m3-emphasized flex items-center justify-center cursor-pointer select-none mt-0.5",
        // Focus ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        // Color Roles - Unselected
        "border-outline bg-transparent text-transparent hover:border-on-surface",
        // Color Roles - Selected
        "data-[state=checked]:border-primary data-[state=checked]:bg-transparent",
        // State layer (Fixed MD3 State Layer Size: 40dp -> 40px circular overlay)
        "before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-[40px] before:h-[40px] before:rounded-full before:content-[''] before:transition-colors",
        "hover:before:bg-on-surface-variant/10 data-[state=checked]:hover:before:bg-primary/10",
        "active:scale-95 active:before:bg-on-surface-variant/15 data-[state=checked]:active:before:bg-primary/20",
        // Touch Target (Fixed MD3 Target Size: 48dp -> 48px touch target area for accessibility)
        "after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-[48px] after:h-[48px] after:content-['']",
        // Disabled state (0.38 opacity, no state layer)
        "disabled:cursor-not-allowed disabled:border-on-surface/38 disabled:opacity-38 data-disabled:opacity-38 disabled:before:hidden disabled:after:hidden",
        className,
      )}
      {...props}
    >
      <BaseRadio.Indicator className="flex items-center justify-center">
        {/* Fixed MD3 Inner Dot Size: 10dp -> h-[10px] w-[10px] */}
        <span className="h-[10px] w-[10px] rounded-full bg-primary transition-transform duration-m3-short-4 ease-m3-emphasized data-[state=checked]:scale-100 data-[state=unchecked]:scale-0" />
      </BaseRadio.Indicator>
    </BaseRadio.Root>
  );

  if (!label && !description) {
    return radioElement;
  }

  return (
    <label
      htmlFor={radioId}
      className={cn(
        "group flex items-start gap-3 cursor-pointer select-none py-1 px-1 rounded-lg transition-colors duration-m3-short-4 hover:bg-surface-container-low/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-38",
        containerClassName,
      )}
    >
      {radioElement}
      <div className="flex-1 min-w-0">
        {label && (
          <span className="text-sm font-medium text-on-surface leading-tight block">{label}</span>
        )}
        {description && (
          <p className="text-xs text-on-surface-variant leading-normal mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* RadioGroup Component Wrapper with Field integration                         */
/* -------------------------------------------------------------------------- */

export interface RadioGroupProps extends React.ComponentProps<typeof BaseRadioGroup> {
  label?: string;
  description?: string;
  error?: string;
  helperText?: string;
  orientation?: "vertical" | "horizontal";
  containerClassName?: string;
}

function RadioGroupComponent({
  label,
  description,
  error,
  helperText,
  orientation = "vertical",
  containerClassName,
  className,
  children,
  ref,
  ...props
}: RadioGroupProps) {
  const radioGroupElement = (
    <BaseRadioGroup
      ref={ref}
      className={cn(
        "flex",
        orientation === "horizontal" ? "flex-row flex-wrap gap-4" : "flex-col gap-2",
        className,
      )}
      {...props}
    >
      {children}
    </BaseRadioGroup>
  );

  if (!label && !description && !error && !helperText) {
    return radioGroupElement;
  }

  return (
    <Field.Root invalid={!!error} className={cn("space-y-2", containerClassName)}>
      {label && (
        <Field.Label className="text-sm font-bold text-on-surface mb-1">{label}</Field.Label>
      )}
      {description && (
        <Field.Description className="text-xs text-on-surface-variant mb-2">
          {description}
        </Field.Description>
      )}
      {radioGroupElement}
      {error && <Field.Error>{error}</Field.Error>}
      {helperText && !error && <Field.Description>{helperText}</Field.Description>}
    </Field.Root>
  );
}

export const RadioGroup = Object.assign(RadioGroupComponent, {
  Root: BaseRadioGroup,
  Item: RadioItem,
  Indicator: BaseRadio.Indicator,
  Label: Field.Label,
  Description: Field.Description,
  Error: Field.Error,
});
