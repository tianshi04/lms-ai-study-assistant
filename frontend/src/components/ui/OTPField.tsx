"use client";

import * as React from "react";
import { OTPField as BaseOTPField } from "@base-ui/react/otp-field";
import { cn } from "@/lib/utils";

export interface OTPFieldProps extends React.ComponentProps<typeof BaseOTPField.Root> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function OTPFieldComponent({
  label,
  error,
  helperText,
  className,
  ref,
  ...props
}: OTPFieldProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground leading-none select-none">
          {label}
        </label>
      )}
      <BaseOTPField.Root ref={ref} className={cn("flex items-center gap-2", className)} {...props}>
        <BaseOTPField.Input className="flex h-11 w-full max-w-xs items-center justify-between rounded-lg border border-input bg-background px-4 text-center font-mono text-lg font-bold tracking-[0.5em] text-foreground shadow-xs transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50" />
      </BaseOTPField.Root>
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}

export const OTPField = Object.assign(OTPFieldComponent, {
  Root: BaseOTPField.Root,
  Input: BaseOTPField.Input,
});
