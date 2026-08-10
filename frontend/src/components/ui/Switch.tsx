import * as React from "react";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

export interface SwitchProps extends React.ComponentProps<typeof BaseSwitch.Root> {
  /** Icon for selected (ON) state */
  checkedIcon?: React.ReactNode;
  /** Icon for unselected (OFF) state */
  uncheckedIcon?: React.ReactNode;
}

export function Switch({ checkedIcon, uncheckedIcon, className = "", ref, ...props }: SwitchProps) {
  const hasCheckedIcon = Boolean(checkedIcon);
  const hasUncheckedIcon = Boolean(uncheckedIcon);

  return (
    <div className="relative inline-flex items-center justify-center min-h-[48px] min-w-[48px]">
      <BaseSwitch.Root
        ref={ref}
        className={cn(
          // M3 Anatomy 1: Track (Container) - 52dp x 32dp, Outline width: 2dp, Shape: corner.full (rounded-full)
          "group peer relative inline-flex h-[32px] w-[52px] shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-m3-medium-2 ease-m3-emphasized box-border overflow-visible",
          // Color Role 1: Surface container highest & Color Role 2: Outline (Unselected Track)
          "border-outline bg-surface-container-highest hover:border-on-surface hover:bg-surface-container-highest/80",
          // Color Role 4: Primary (Selected Track)
          "data-[state=checked]:border-primary data-[checked]:border-primary data-[state=checked]:bg-primary data-[checked]:bg-primary data-[state=checked]:hover:border-primary-hover data-[checked]:hover:border-primary-hover data-[state=checked]:hover:bg-primary-hover data-[checked]:hover:bg-primary-hover",
          // State 3: Focused
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          // State 5: Disabled
          "disabled:cursor-not-allowed data-[disabled]:cursor-not-allowed disabled:opacity-38 data-[disabled]:opacity-38",
          "disabled:border-on-surface/12 data-[disabled]:border-on-surface/12 disabled:bg-surface-container-highest/38 data-[disabled]:bg-surface-container-highest/38",
          "data-[checked]:disabled:border-transparent data-[checked]:data-[disabled]:border-transparent data-[checked]:disabled:bg-on-surface/12 data-[checked]:data-[disabled]:bg-on-surface/12",
          className,
        )}
        {...props}
      >
        {/* M3 Anatomy 2: Handle (formerly "thumb") - Circular disc */}
        <BaseSwitch.Thumb
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-m3-medium-2 ease-m3-emphasized shadow-xs",
            // M3 State Layer: 40dp x 40dp translucent overlay circle centered on handle
            "after:pointer-events-none after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:h-[40px] after:w-[40px] after:rounded-full after:opacity-0 after:transition-opacity after:duration-200",
            "group-hover:after:opacity-100 group-hover:after:bg-on-surface/8 group-hover:data-[checked]:after:bg-primary/12",

            // Config 1 & 2: Color Role 3 Outline (Unselected Handle 16dp x 16dp, left inset 6px inside 2px border -> Center X = 14px)
            "data-[state=unchecked]:h-[16px] data-[unchecked]:h-[16px]",
            "data-[state=unchecked]:w-[16px] data-[unchecked]:w-[16px]",
            "data-[state=unchecked]:left-[6px] data-[unchecked]:left-[6px]",
            "data-[state=unchecked]:bg-outline data-[unchecked]:bg-outline",
            // State 2: Hovered OFF without icon
            "group-hover:data-[state=unchecked]:bg-on-surface-variant group-hover:data-[unchecked]:bg-on-surface-variant",

            // Config 3 (OFF with icon): 24dp x 24dp, bg-outline (Role 3), text-surface-container-highest icon, left inset 2px inside border
            hasUncheckedIcon && [
              "data-[state=unchecked]:h-[24px] data-[unchecked]:h-[24px]",
              "data-[state=unchecked]:w-[24px] data-[unchecked]:w-[24px]",
              "data-[state=unchecked]:left-[2px] data-[unchecked]:left-[2px]",
              "data-[state=unchecked]:bg-outline data-[unchecked]:bg-outline",
              "data-[state=unchecked]:text-surface-container-highest data-[unchecked]:text-surface-container-highest",
            ],

            // Color Role 5: On primary (Selected Handle 24dp x 24dp, left inset 22px leaves 2px right padding inside border)
            "data-[state=checked]:h-[24px] data-[checked]:h-[24px]",
            "data-[state=checked]:w-[24px] data-[checked]:w-[24px]",
            "data-[state=checked]:left-[22px] data-[checked]:left-[22px]",
            "data-[state=checked]:bg-on-primary data-[checked]:bg-on-primary",
            // State 2: Hovered ON
            "group-hover:data-[state=checked]:bg-primary-container group-hover:data-[checked]:bg-primary-container",

            // State 4: Pressed OFF (28dp x 28dp): Positioned at left-[0px]
            "group-active:data-[state=unchecked]:h-[28px] group-active:data-[unchecked]:h-[28px]",
            "group-active:data-[state=unchecked]:w-[28px] group-active:data-[unchecked]:w-[28px]",
            "group-active:data-[state=unchecked]:left-[0px] group-active:data-[unchecked]:left-[0px]",

            // State 4: Pressed ON (28dp x 28dp): Positioned at left-[20px] so Center X remains EXACTLY 34px
            "group-active:data-[state=checked]:h-[28px] group-active:data-[checked]:h-[28px]",
            "group-active:data-[state=checked]:w-[28px] group-active:data-[checked]:w-[28px]",
            "group-active:data-[state=checked]:left-[20px] group-active:data-[checked]:left-[20px]",

            // State 5: Disabled Handle
            "group-disabled:data-[unchecked]:bg-on-surface/38 group-data-[disabled]:data-[unchecked]:bg-on-surface/38",
            "group-disabled:data-[checked]:bg-surface group-data-[disabled]:data-[checked]:bg-surface",
          )}
        >
          {/* M3 Anatomy 3: Icon inside handle (16dp x 16dp) */}
          {/* Config 2 & 3: Checked Icon - Color Role 6: On primary container (dark navy blue) with bold 2.5px stroke */}
          {hasCheckedIcon && (
            <span className="hidden group-data-[checked]:inline-flex group-data-[state=checked]:inline-flex items-center justify-center w-4 h-4 text-on-primary-container [&>svg]:stroke-[2.5]">
              {checkedIcon}
            </span>
          )}
          {/* Config 3: Unchecked Icon - Shown strictly when unchecked */}
          {hasUncheckedIcon && (
            <span className="inline-flex group-data-[checked]:hidden group-data-[state=checked]:hidden items-center justify-center w-4 h-4 text-surface-container-highest [&>svg]:stroke-[2.5]">
              {uncheckedIcon}
            </span>
          )}
        </BaseSwitch.Thumb>
      </BaseSwitch.Root>
    </div>
  );
}
