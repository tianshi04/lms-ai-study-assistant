import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export const ratingStarVariants = cva("", {
  variants: {
    size: {
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-6 h-6",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export function RatingScore({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("text-xs font-bold text-on-surface ml-1", className)}>
      {rating.toFixed(1)}
    </span>
  );
}

export interface RatingStarsProps
  extends React.ComponentProps<"span">, VariantProps<typeof ratingStarVariants> {
  rating: number;
  maxStars?: number;
  showScore?: boolean;
  asChild?: boolean;
}

export function RatingStars({
  rating,
  maxStars = 5,
  size = "md",
  showScore = false,
  className,
  asChild = false,
  children,
  ref,
  ...props
}: RatingStarsProps) {
  const roundedRating = Math.round(rating);
  const compClasses = cn("inline-flex items-center gap-1", className);

  const innerContent = (
    <>
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: maxStars }, (_, i) => {
          const starIndex = i + 1;
          const isFilled = starIndex <= roundedRating;
          return (
            <Star
              key={starIndex}
              aria-hidden="true"
              className={cn(
                ratingStarVariants({ size }),
                isFilled ? "fill-amber-400 text-amber-400" : "text-outline-variant fill-none",
              )}
            />
          );
        })}
      </div>

      {showScore && <RatingScore rating={rating} />}
      {children}
    </>
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      ...props,
      ...child.props,
      ref,
      className: cn(compClasses, child.props.className),
    });
  }

  return (
    <span
      ref={ref}
      aria-label={`Đánh giá ${rating.toFixed(1)} trên ${maxStars} sao`}
      className={compClasses}
      {...props}
    >
      {innerContent}
    </span>
  );
}
