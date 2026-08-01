import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = "", id, ref, ...props }: InputProps) {
  const generatedId = React.useId();
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : generatedId);

  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy = error ? errorId : helperText ? helperId : undefined;

  const inputElement = (
    <input
      ref={ref}
      id={inputId}
      aria-invalid={!!error}
      aria-describedby={describedBy}
      className={cn(
        "w-full px-3.5 py-2 text-sm bg-background border text-foreground placeholder:text-muted-foreground rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        error
          ? "border-destructive focus-visible:ring-destructive/50 focus-visible:border-destructive"
          : "border-input",
        className,
      )}
      {...props}
    />
  );

  if (!label && !error && !helperText) {
    return inputElement;
  }

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-foreground">
          {label}
        </label>
      )}
      {inputElement}
      {error && (
        <p id={errorId} className="text-xs text-destructive font-medium">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}
