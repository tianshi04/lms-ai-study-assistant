import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({
  label,
  error,
  helperText,
  className = "",
  id,
  ref,
  ...props
}: TextareaProps) {
  const generatedId = React.useId();
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : generatedId);

  const errorId = `${textareaId}-error`;
  const helperId = `${textareaId}-helper`;
  const describedBy = error ? errorId : helperText ? helperId : undefined;

  const textareaElement = (
    <textarea
      ref={ref}
      id={textareaId}
      aria-invalid={!!error}
      aria-describedby={describedBy}
      className={cn(
        "w-full px-3.5 py-2 text-sm bg-background border text-foreground placeholder:text-muted-foreground rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[80px]",
        error
          ? "border-destructive focus-visible:ring-destructive/50 focus-visible:border-destructive"
          : "border-input",
        className,
      )}
      {...props}
    />
  );

  if (!label && !error && !helperText) {
    return textareaElement;
  }

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-foreground">
          {label}
        </label>
      )}
      {textareaElement}
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
