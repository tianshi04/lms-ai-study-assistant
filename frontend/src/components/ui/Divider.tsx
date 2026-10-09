import * as React from "react";
import { Separator as BaseSeparator } from "@base-ui/react/separator";
import { cn } from "@/lib/utils";

export interface DividerProps extends React.ComponentProps<typeof BaseSeparator> {
  /** M3 Divider layout variant */
  variant?: "full-width" | "inset" | "middle-inset";
  /** Divider orientation */
  orientation?: "horizontal" | "vertical";
  /** Optional M3 supporting text / subheader label */
  supportingText?: React.ReactNode;
}

export function Divider({
  variant = "full-width",
  orientation = "horizontal",
  supportingText,
  className,
  children,
  ref,
  ...props
}: DividerProps) {
  const labelContent = supportingText ?? children;
  const isHorizontal = orientation === "horizontal";

  // Base M3 Line Styling
  const lineClasses = cn(
    "shrink-0 bg-outline-variant transition-colors",
    isHorizontal ? "h-[1px] w-full" : "w-[1px] h-full self-stretch",
    // Layout Variants (Horizontal Insets)
    isHorizontal && variant === "inset" && "ml-[16px] w-[calc(100%-16px)]",
    isHorizontal && variant === "middle-inset" && "mx-[16px] w-[calc(100%-32px)]",
    // Layout Variants (Vertical Insets)
    !isHorizontal && variant === "inset" && "mt-[16px] h-[calc(100%-16px)]",
    !isHorizontal && variant === "middle-inset" && "my-[16px] h-[calc(100%-32px)]",
    className,
  );

  // If no supporting text is provided, render simple BaseSeparator line
  if (!labelContent) {
    return <BaseSeparator ref={ref} orientation={orientation} className={lineClasses} {...props} />;
  }

  // With M3 Supporting Text / Subheader:
  // Space between divider line & supporting text: 4dp (gap-1), Right margin: 8dp (mr-2), Bottom margin: 8dp (mb-2)
  if (isHorizontal) {
    return (
      <div className="flex flex-col w-full gap-1 mb-2">
        <BaseSeparator ref={ref} orientation="horizontal" className={lineClasses} {...props} />
        <div className="text-body-small font-medium text-muted-foreground mr-2 px-[16px]">
          {labelContent}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mr-2 self-stretch">
      <BaseSeparator ref={ref} orientation="vertical" className={lineClasses} {...props} />
      <div className="text-body-small font-medium text-muted-foreground mb-2 py-[16px]">
        {labelContent}
      </div>
    </div>
  );
}
