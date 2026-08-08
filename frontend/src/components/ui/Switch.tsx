import * as React from "react";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

export const SwitchRoot = BaseSwitch.Root;
export const SwitchThumb = BaseSwitch.Thumb;

export function SwitchLabel({ className, ref, children, ...props }: React.ComponentProps<"label">) {
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

export function SwitchError({ className, ref, children, ...props }: React.ComponentProps<"p">) {
  return (
    <p ref={ref} className={cn("text-xs text-destructive font-medium", className)} {...props}>
      {children}
    </p>
  );
}

export function SwitchHelperText({
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

export interface SwitchProps extends React.ComponentProps<typeof BaseSwitch.Root> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Switch({
  label,
  error,
  helperText,
  className = "",
  id,
  ref,
  ...props
}: SwitchProps) {
  const generatedId = React.useId();
  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : generatedId);

  const switchElement = (
    <BaseSwitch.Root
      ref={ref}
      id={switchId}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-m3-short-4 ease-m3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted",
        error && "focus-visible:ring-destructive/50",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-sm ring-0 transition-transform duration-m3-short-4 ease-m3-emphasized data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        )}
      />
    </BaseSwitch.Root>
  );

  if (!label && !error && !helperText) {
    return switchElement;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        {switchElement}
        {label && <SwitchLabel htmlFor={switchId}>{label}</SwitchLabel>}
      </div>
      {error && <SwitchError>{error}</SwitchError>}
      {helperText && !error && <SwitchHelperText>{helperText}</SwitchHelperText>}
    </div>
  );
}
