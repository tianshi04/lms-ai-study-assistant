import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const CheckboxRoot = BaseCheckbox.Root;
export const CheckboxIndicator = BaseCheckbox.Indicator;

export function CheckboxLabel({
  className,
  ref,
  children,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium text-foreground cursor-pointer select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function CheckboxError({ className, ref, children, ...props }: React.ComponentProps<"p">) {
  return (
    <p ref={ref} className={cn("text-xs text-destructive font-medium", className)} {...props}>
      {children}
    </p>
  );
}

export function CheckboxHelperText({
  className,
  ref,
  children,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p ref={ref} className={cn("text-xs text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}

export interface CheckboxProps extends React.ComponentProps<typeof BaseCheckbox.Root> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Checkbox({
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
    <div className="space-y-1">
      <div className="flex items-center gap-2.5">
        {checkboxElement}
        {label && <CheckboxLabel htmlFor={checkboxId}>{label}</CheckboxLabel>}
      </div>
      {error && <CheckboxError>{error}</CheckboxError>}
      {helperText && !error && <CheckboxHelperText>{helperText}</CheckboxHelperText>}
    </div>
  );
}
