"use client";

import * as React from "react";
import { Meter as BaseMeter } from "@base-ui/react/meter";
import { cn } from "@/lib/utils";

export interface MeterProps extends React.ComponentProps<typeof BaseMeter.Root> {
  label?: string;
  showValue?: boolean;
}

export function MeterComponent({ label, showValue = true, className, ref, ...props }: MeterProps) {
  return (
    <div className="space-y-1.5 w-full">
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-medium text-foreground">
          {label && (
            <BaseMeter.Label className="font-medium text-foreground">{label}</BaseMeter.Label>
          )}
          {showValue && <BaseMeter.Value className="text-muted-foreground font-mono" />}
        </div>
      )}
      <BaseMeter.Root
        ref={ref}
        className={cn("relative w-full overflow-hidden rounded-full bg-muted h-2", className)}
        {...props}
      >
        <BaseMeter.Track className="h-full w-full">
          <BaseMeter.Indicator className="h-full bg-primary transition-colors duration-m3-medium-2 ease-m3-emphasized rounded-full" />
        </BaseMeter.Track>
      </BaseMeter.Root>
    </div>
  );
}

export const Meter = Object.assign(MeterComponent, {
  Root: BaseMeter.Root,
  Track: BaseMeter.Track,
  Indicator: BaseMeter.Indicator,
  Label: BaseMeter.Label,
  Value: BaseMeter.Value,
});
