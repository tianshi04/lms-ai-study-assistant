import * as React from "react";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// --- LINEAR PROGRESS ---

// M3 Measurement Specs (matching Google M3 Specs):
// Active Indicator & Stop Dot: Primary (sys.color.primary / bg-primary)
// Track: Secondary Container (sys.color.secondary-container / bg-secondary-container)
// Track Thickness Options:
// 1. Fixed (4dp): Standard default track thickness (thickness="default")
// 2. Configurable / Thick (8dp): M3 Expressive track thickness (thickness="thick" / thick={true})
// Shape Options:
// 1. Flat: Standard straight rounded bar (wavy={false})
// 2. Wavy: Sinusoidal wave bar (wavy={true}, Container height: 10dp for default 4dp wave, 14dp for thick 8dp wave)
export const linearTrackVariants = cva(
  "w-full relative block shrink-0 flex items-center transition-all duration-m3-medium-4",
  {
    variants: {
      thickness: {
        default: "h-1", // 4dp M3 Standard Fixed (Row 1)
        thick: "h-2", // 8dp M3 Expressive Thick (Row 2)
        wavyDefault: "h-[10px]", // 10dp M3 Standard Wavy (Row 3)
        wavyThick: "h-[14px]", // 14dp M3 Thick Wavy (Row 4)
      },
    },
    defaultVariants: {
      thickness: "default",
    },
  },
);

export interface LinearProgressProps extends Omit<
  React.ComponentProps<typeof BaseProgress.Root>,
  "value"
> {
  value?: number | null;
  progress?: number;
  showLabel?: boolean;
  label?: string;
  wavy?: boolean;
  thick?: boolean;
  thickness?: "default" | "thick";
  inset?: boolean; // 4dp Screen Inset Rule
  showStopIndicator?: boolean;
}

export function LinearProgress({
  value,
  progress,
  thickness,
  showLabel = false,
  label = "Tiến độ",
  wavy = false,
  thick = false,
  inset = false,
  showStopIndicator = true,
  className,
  ref,
  ...props
}: LinearProgressProps) {
  const rawValue = value ?? progress;
  const isIndeterminate = rawValue === undefined || rawValue === null;
  const normalizedValue = isIndeterminate ? 0 : Math.min(100, Math.max(0, rawValue));

  // Determine exact M3 track thickness variant (Default: 4dp, Thick: 8dp)
  const isThick = thick || thickness === "thick";
  const variantKey = wavy ? (isThick ? "wavyThick" : "wavyDefault") : isThick ? "thick" : "default";
  const inactiveHeightClass = isThick ? "h-2" : "h-1";

  return (
    <BaseProgress.Root
      ref={ref}
      value={isIndeterminate ? null : normalizedValue}
      aria-label={label}
      className={cn("w-full min-w-[40px] space-y-1.5", inset && "px-1", className)}
      {...props}
    >
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-medium text-on-surface-variant">
          <span>{label}</span>
          <span>{isIndeterminate ? "Đang xử lý…" : `${Math.round(normalizedValue)}%`}</span>
        </div>
      )}
      <BaseProgress.Track className={cn(linearTrackVariants({ thickness: variantKey }))}>
        {isIndeterminate ? (
          /* Anatomy 1: Active indicator (Widget.Material3Expressive.LinearProgressIndicator.Wavy Indeterminate) */
          <div className="w-full h-full bg-secondary-container rounded-full overflow-hidden relative">
            <div
              className={cn(
                "h-full w-1/2 rounded-full animate-linear-indeterminate rtl:animate-linear-indeterminate-rtl flex items-center overflow-visible",
                !wavy && "bg-primary",
              )}
            >
              {wavy && (
                <svg
                  className="w-full h-full min-w-[300px] overflow-visible text-primary"
                  preserveAspectRatio="none"
                  viewBox="-8 0 316 24"
                >
                  <path
                    d="M 0 12 Q 10 3 20 12 T 40 12 T 60 12 T 80 12 T 100 12 T 120 12 T 140 12 T 160 12 T 180 12 T 200 12 T 220 12 T 240 12 T 260 12 T 280 12 T 300 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={isThick ? "14" : "10"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex items-center gap-1 rtl:flex-row-reverse relative">
            {/* Anatomy 1: Active indicator (Primary Color Roles: bg-primary / stroke-primary) */}
            {normalizedValue > 0 && (
              <BaseProgress.Indicator
                className={cn(
                  "h-full transition-all duration-m3-medium-4 ease-m3-emphasized relative flex items-center shrink-0 rounded-full",
                  !wavy && "bg-primary",
                  normalizedValue > 0 && "min-w-[8px]",
                )}
                style={{ width: `${normalizedValue}%` }}
              >
                {/* Genuine M3 Expressive Wavy Active Track SVG */}
                {wavy && (
                  <svg
                    className="w-full h-full min-w-[400px] overflow-visible text-primary"
                    preserveAspectRatio="none"
                    viewBox="-8 0 416 24"
                  >
                    <path
                      d="M 0 12 Q 10 3 20 12 T 40 12 T 60 12 T 80 12 T 100 12 T 120 12 T 140 12 T 160 12 T 180 12 T 200 12 T 220 12 T 240 12 T 260 12 T 280 12 T 300 12 T 320 12 T 340 12 T 360 12 T 380 12 T 400 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={isThick ? "14" : "10"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </BaseProgress.Indicator>
            )}

            {/* Anatomy 2: Inactive Track (Secondary Container Color Role: bg-secondary-container) */}
            {normalizedValue < 100 && (
              <div
                className={cn(
                  "flex-1 rounded-full bg-secondary-container relative transition-all duration-m3-medium-4",
                  inactiveHeightClass,
                )}
              />
            )}

            {/* Anatomy 3: Stop indicator dot (4dp circle dot, exact 2dp right offset, centered vertically) */}
            {showStopIndicator && normalizedValue < 100 && (
              <span
                className="absolute right-[2px] rtl:right-auto rtl:left-[2px] top-1/2 -translate-y-1/2 rounded-full w-[4px] h-[4px] shrink-0 z-10 bg-primary"
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}

// --- CIRCULAR PROGRESS ---

// M3 Specs (com.google.android.material.progressindicator.CircularProgressIndicator):
// Standard indicatorSize: 40dp, trackThickness: 4dp
// Thick Expressive indicatorSize: 52dp, trackThickness: 8dp
export const circularSizeVariants = cva(
  "relative inline-flex items-center justify-center shrink-0 min-w-[24px] max-w-[240px]",
  {
    variants: {
      size: {
        sm: "w-6 h-6", // 24dp M3 Small (Min size 24dp)
        md: "w-10 h-10", // 40dp M3 Medium Standard (Widget.Material3.CircularProgressIndicator)
        lg: "w-12 h-12", // 48dp M3 Large Wavy
        xl: "w-[52px] h-[52px]", // 52dp M3 Expressive Thick (Widget.Material3Expressive.CircularProgressIndicator.Wavy)
        huge: "w-60 h-60", // 240dp M3 Max Size Desktop
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const strokeWidthMap = {
  sm: 3,
  md: 4,
  lg: 5,
  xl: 8, // 8dp trackThickness for 52dp Expressive variant
  huge: 8,
};

export interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number | null;
  size?: "sm" | "md" | "lg" | "xl" | "huge";
  wavy?: boolean;
  thick?: boolean;
  ariaLabel?: string;
}

/**
 * Generate mathematical M3 Expressive Wavy Circular Arc Path
 */
function getWavyCirclePath(
  cx: number,
  cy: number,
  r: number,
  amplitude: number,
  waves: number,
  percent: number,
) {
  const endAngle = (percent / 100) * 2 * Math.PI;
  const steps = Math.max(30, Math.floor(percent * 1.5));
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * endAngle;
    const currentRadius = r + amplitude * Math.sin(angle * waves);
    const x = cx + currentRadius * Math.cos(angle);
    const y = cy + currentRadius * Math.sin(angle);
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

export function CircularProgress({
  value,
  size = "md",
  wavy = false,
  thick = false,
  ariaLabel = "Đang tải",
  className,
  ...props
}: CircularProgressProps) {
  const isIndeterminate = value === undefined || value === null;
  const normalizedValue = isIndeterminate ? 75 : Math.min(100, Math.max(0, value));

  const effectiveSize = thick ? "xl" : wavy && size === "md" ? "lg" : size;
  const strokeWidth = strokeWidthMap[effectiveSize || "md"];
  const radius = 20 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  const wavyPath = wavy
    ? getWavyCirclePath(20, 20, radius, 1.8, 12, isIndeterminate ? 75 : normalizedValue)
    : "";

  return (
    <div
      aria-label={ariaLabel}
      aria-valuenow={isIndeterminate ? undefined : normalizedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(circularSizeVariants({ size: effectiveSize, className }))}
      {...props}
    >
      {/* Clockwise rotation from top (-rotate-90), no mirroring needed for Circular in RTL */}
      <svg
        className={cn(
          "w-full h-full transform -rotate-90 overflow-visible",
          isIndeterminate && "animate-spin",
        )}
        viewBox="0 0 40 40"
      >
        {/* Anatomy 2: Track circle (Secondary Container Color Role: stroke-secondary-container) */}
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          className="stroke-secondary-container"
          strokeWidth={strokeWidth}
        />

        {/* Anatomy 1: Active indicator (Primary Color Role: stroke-primary) */}
        {wavy ? (
          <path
            d={wavyPath}
            fill="none"
            className="transition-all duration-m3-medium-4 ease-m3-emphasized stroke-primary"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : isIndeterminate ? (
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            className="transition-all duration-m3-medium-4 ease-m3-emphasized stroke-primary"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
          />
        ) : (
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            className="transition-all duration-m3-medium-4 ease-m3-emphasized stroke-primary"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}

// Single clean compound component export: Progress
export const Progress = Object.assign(LinearProgress, {
  Linear: LinearProgress,
  Circular: CircularProgress,
});
