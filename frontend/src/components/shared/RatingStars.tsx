import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Star } from "lucide-react";
import { cn, renderPolymorphicElement, type BaseUIRenderProp } from "@/lib/utils";

export const ratingStarVariants = cva("shrink-0 transition-colors duration-m3-short-4", {
  variants: {
    size: {
      sm: "h-3.5 w-3.5",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

function RatingScore({ rating }: { rating: number }) {
  return <span className="ml-1 text-xs font-semibold text-on-surface">{rating.toFixed(1)}</span>;
}

export interface RatingStarsProps
  extends React.ComponentProps<"span">, VariantProps<typeof ratingStarVariants> {
  rating: number;
  maxStars?: number;
  showScore?: boolean;
  render?: BaseUIRenderProp;
}

export function RatingStars({
  rating,
  maxStars = 5,
  size = "md",
  showScore = false,
  className,
  render,
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

  return renderPolymorphicElement(
    render,
    {
      ref,
      "aria-label": `Đánh giá ${rating.toFixed(1)} trên ${maxStars} sao`,
      className: compClasses,
      children: innerContent,
      ...props,
    },
    "span",
  );
}
