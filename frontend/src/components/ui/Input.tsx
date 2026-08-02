import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = "", id, ref, ...props }: InputProps) {
  return (
    <BaseField.Root invalid={!!error} className="w-full space-y-1.5">
      {label && (
        <BaseField.Label className="block text-xs font-semibold text-foreground">
          {label}
        </BaseField.Label>
      )}
      <BaseField.Control
        ref={ref}
        id={id}
        render={(controlProps) => (
          <input
            {...controlProps}
            {...props}
            className={cn(
              "w-full px-3.5 py-2 text-sm bg-background border text-foreground placeholder:text-muted-foreground rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-input data-[invalid]:border-destructive data-[invalid]:focus-visible:ring-destructive/50 data-[invalid]:focus-visible:border-destructive",
              className,
            )}
          />
        )}
      />
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
