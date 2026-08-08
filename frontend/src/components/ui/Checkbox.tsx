"use client";

import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { FieldRoot, FieldLabel, FieldError, FieldDescription } from "./Field";

export interface CheckboxProps extends React.ComponentProps<typeof BaseCheckbox.Root> {
  label?: string;
  error?: string;
  helperText?: string;
}

function CheckboxComponent({
  label,
  error,
  helperText,
  className = "",
  id,
  ref,
  ...props
}: CheckboxProps) {
  const generatedId = React.useId();
  const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : generatedId);

  const checkboxElement = (
    <BaseCheckbox.Root
      ref={ref}
      id={checkboxId}
      className={cn(
        "peer h-5 w-5 shrink-0 rounded-md border border-input bg-background transition-colors duration-m3-short-4 ease-m3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground flex items-center justify-center cursor-pointer",
        error && "border-destructive focus-visible:ring-destructive/50",
        className,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator className="flex items-center justify-center text-current">
        <Check aria-hidden="true" className="h-3.5 w-3.5 stroke-[3]" />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );

  if (!label && !error && !helperText) {
    return checkboxElement;
  }

  return (
    <FieldRoot invalid={!!error} className="space-y-1">
      <div className="flex items-center gap-2.5">
        {checkboxElement}
        {label && (
          <FieldLabel htmlFor={checkboxId} className="mb-0 text-sm font-medium cursor-pointer">
            {label}
          </FieldLabel>
        )}
      </div>
      {error && <FieldError>{error}</FieldError>}
      {helperText && !error && <FieldDescription>{helperText}</FieldDescription>}
    </FieldRoot>
  );
}

export const Checkbox = Object.assign(CheckboxComponent, {
  Root: BaseCheckbox.Root,
  Indicator: BaseCheckbox.Indicator,
  Label: FieldLabel,
  Error: FieldError,
  HelperText: FieldDescription,
});
