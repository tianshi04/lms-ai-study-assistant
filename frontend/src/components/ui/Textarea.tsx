import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: "outlined" | "filled";
}

export function Textarea({
  label,
  error,
  helperText,
  variant = "outlined",
  className = "",
  id,
  ref,
  ...props
}: TextareaProps) {
  const variantStyles = {
    outlined:
      "bg-background border border-input rounded-xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
    filled:
      "bg-surface-container-highest border-b-2 border-input rounded-t-xl rounded-b-none focus-visible:ring-0 focus-visible:border-primary",
  };

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
          <textarea
            spellCheck={props.spellCheck ?? false}
            {...controlProps}
            {...props}
            className={cn(
              "w-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-m3-short-4 ease-m3-emphasized disabled:opacity-50 disabled:cursor-not-allowed min-h-[80px] data-[invalid]:border-destructive data-[invalid]:focus-visible:ring-destructive/50 data-[invalid]:focus-visible:border-destructive",
              variantStyles[variant],
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
