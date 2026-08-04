import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const starSizeClasses = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-6 h-6",
} as const;

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: keyof typeof starSizeClasses;
  className?: string;
  showScore?: boolean;
}

export function RatingStars({
  rating,
  maxStars = 5,
  size = "md",
  className,
  showScore = false,
}: RatingStarsProps) {
  const roundedRating = Math.round(rating);

  return (
    <div
      role="img"
      aria-label={`Đánh giá ${rating.toFixed(1)} trên ${maxStars} sao`}
      className={cn("inline-flex items-center gap-1", className)}
    >
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: maxStars }, (_, i) => {
          const starIndex = i + 1;
          const isFilled = starIndex <= roundedRating;
          return (
            <Star
              key={starIndex}
              aria-hidden="true"
              className={cn(
                starSizeClasses[size],
                isFilled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 fill-none",
              )}
            />
          );
        })}
      </div>
      {showScore ? (
        <span className="text-xs font-bold text-foreground ml-1">{rating.toFixed(1)}</span>
      ) : null}
    </div>
  );
}
