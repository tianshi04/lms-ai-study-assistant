"use client";

import * as React from "react";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NumberFieldProps extends React.ComponentProps<typeof BaseNumberField.Root> {
  label?: string;
  error?: string;
  helperText?: string;
}

function NumberFieldComponent({
  label,
  error,
  helperText,
  className,
  ref,
  ...props
}: NumberFieldProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground leading-none select-none">
          {label}
        </label>
      )}
      <BaseNumberField.Root
        ref={ref}
        className={cn("inline-flex flex-col gap-1", className)}
        {...props}
      >
        <BaseNumberField.Group className="inline-flex items-center rounded-lg border border-input bg-background shadow-xs transition-colors focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary">
          <BaseNumberField.Decrement
            aria-label="Giảm giá trị"
            className="inline-flex h-9 w-9 items-center justify-center rounded-l-lg border-r border-input bg-muted/40 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
          >
            <Minus aria-hidden="true" className="h-4 w-4" />
          </BaseNumberField.Decrement>
          <BaseNumberField.Input className="h-9 w-16 text-center text-sm font-medium text-foreground bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <BaseNumberField.Increment
            aria-label="Tăng giá trị"
            className="inline-flex h-9 w-9 items-center justify-center rounded-r-lg border-l border-input bg-muted/40 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </BaseNumberField.Increment>
        </BaseNumberField.Group>
      </BaseNumberField.Root>
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}

export const NumberField = Object.assign(NumberFieldComponent, {
  Root: BaseNumberField.Root,
  Group: BaseNumberField.Group,
  Input: BaseNumberField.Input,
  Increment: BaseNumberField.Increment,
  Decrement: BaseNumberField.Decrement,
});
