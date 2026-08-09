import * as React from "react";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { cn } from "@/lib/utils";

import { FieldLabel, FieldDescription } from "./Field";

export const RadioGroup = BaseRadioGroup;
export const RadioItem = BaseRadio.Root;
export const RadioIndicator = BaseRadio.Indicator;
export const RadioLabel = FieldLabel;
export const RadioDescription = FieldDescription;

export interface RadioOptionProps extends React.ComponentProps<typeof BaseRadio.Root> {
  label?: string;
  description?: string;
}

export function RadioOption({
  label,
  description,
  className,
  id,
  ref,
  ...props
}: RadioOptionProps) {
  const generatedId = React.useId();
  const radioId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : generatedId);

  return (
    <div className="flex items-start gap-3">
      <BaseRadio.Root
        ref={ref}
        id={radioId}
        className={cn(
          "aspect-square h-5 w-5 rounded-full border border-input text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary flex items-center justify-center cursor-pointer transition-colors duration-m3-short-4 ease-m3-emphasized mt-0.5",
          className,
        )}
        {...props}
      >
        <BaseRadio.Indicator className="flex items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
        </BaseRadio.Indicator>
      </BaseRadio.Root>
      {(label || description) && (
        <div className="grid gap-0.5 leading-none">
          {label && <RadioLabel htmlFor={radioId}>{label}</RadioLabel>}
          {description && <RadioDescription>{description}</RadioDescription>}
        </div>
      )}
    </div>
  );
}
