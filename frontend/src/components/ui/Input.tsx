import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import { Field } from "./Field";

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
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  startAdornment,
  endAdornment,
  variant,
  className = "",
  id,
  ref,
  ...props
}: InputProps) {
  const hasAdornments = Boolean(startAdornment || endAdornment);

  const inputControl = (
    <BaseField.Control
      ref={ref}
      id={id}
      render={(controlProps) => (
        <input
          spellCheck={props.spellCheck ?? false}
          {...controlProps}
          {...props}
          id={id || controlProps.id}
          className={cn(
            inputVariants({ variant, className }),
            startAdornment && "pl-10",
            endAdornment && "pr-11",
          )}
        />
      )}
    />
  );

  return (
    <Field.Root invalid={!!error} className="w-full space-y-1.5">
      {label && <Field.Label>{label}</Field.Label>}
      {hasAdornments ? (
        <div className="relative w-full">
          {startAdornment && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground z-10">
              {startAdornment}
            </div>
          )}
          {inputControl}
          {endAdornment && (
            <div className="absolute inset-y-0 right-1 flex items-center z-10">{endAdornment}</div>
          )}
        </div>
      ) : (
        inputControl
      )}
      {error && <Field.Error>{error}</Field.Error>}
      {helperText && !error && <Field.Description>{helperText}</Field.Description>}
    </Field.Root>
  );
}
