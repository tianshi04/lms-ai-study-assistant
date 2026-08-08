import * as React from "react";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

export const SliderRoot = BaseSlider.Root;
export const SliderControl = BaseSlider.Control;
export const SliderTrack = BaseSlider.Track;
export const SliderIndicator = BaseSlider.Indicator;
export const SliderThumb = BaseSlider.Thumb;
export const SliderValue = BaseSlider.Value;

export interface SliderProps extends React.ComponentProps<typeof BaseSlider.Root> {
  label?: string;
  showValue?: boolean;
}

export function Slider({ label, showValue = false, className, ref, ...props }: SliderProps) {
  return (
    <div className="space-y-1.5 w-full">
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-medium text-foreground">
          {label && <span>{label}</span>}
          {showValue && <BaseSlider.Value className="text-muted-foreground font-mono" />}
        </div>
      )}
      <BaseSlider.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center py-2 data-[disabled]:opacity-50",
          className,
        )}
        {...props}
      >
        <BaseSlider.Control className="relative flex w-full items-center">
          <BaseSlider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
            <BaseSlider.Indicator className="absolute h-full bg-primary" />
          </BaseSlider.Track>
          <BaseSlider.Thumb className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none" />
        </BaseSlider.Control>
      </BaseSlider.Root>
    </div>
  );
}
