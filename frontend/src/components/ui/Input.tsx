import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const FieldRoot = BaseField.Root;
export const FieldLabel = BaseField.Label;
export const FieldControl = BaseField.Control;
export const FieldError = BaseField.Error;
export const FieldDescription = BaseField.Description;

export const inputVariants = cva(
  "w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-m3-short-4 ease-m3-emphasized outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed data-[invalid]:border-destructive data-[invalid]:focus-visible:ring-destructive/50 data-[invalid]:focus-visible:border-destructive",
  {
    variants: {
      variant: {
        outlined:
          "bg-background border border-input rounded-xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
        filled:
          "bg-surface-container-highest border-b-2 border-input rounded-t-xl rounded-b-none focus-visible:ring-0 focus-visible:border-primary",
      },
    },
    defaultVariants: {
      variant: "outlined",
    },
  },
);

export interface InputProps
  extends React.ComponentProps<"input">, VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  variant,
  className = "",
  id,
  ref,
  ...props
}: InputProps) {
  const inputEl = (
    <BaseField.Control
      ref={ref}
      id={id}
      render={(controlProps) => (
        <input
          spellCheck={props.spellCheck ?? false}
          {...controlProps}
          {...props}
          className={cn(inputVariants({ variant, className }))}
        />
      )}
    />
  );

  if (!label && !error && !helperText) {
    return inputEl;
  }

  return (
    <BaseField.Root invalid={!!error} className="w-full space-y-1.5">
      {label && (
        <BaseField.Label className="block text-xs font-semibold text-foreground">
          {label}
        </BaseField.Label>
      )}
      {inputEl}
      {error && (
        <BaseField.Error className="text-xs text-destructive font-medium">{error}</BaseField.Error>
      )}
      {helperText && !error && (
        <BaseField.Description className="text-xs text-muted-foreground">
          {helperText}
        </BaseField.Description>
      )}
    </BaseField.Root>
  );
}
