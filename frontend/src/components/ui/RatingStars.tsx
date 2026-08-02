import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
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
  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  return (
    <div
      role="img"
      aria-label={`Đánh giá ${rating.toFixed(1)} trên ${maxStars} sao`}
      className={cn("inline-flex items-center gap-1", className)}
    >
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: maxStars }).map((_, i) => {
          const starIndex = i + 1;
          const isFilled = starIndex <= Math.round(rating);
          return (
            <Star
              key={i}
              aria-hidden="true"
              className={cn(
                sizeClasses[size],
                isFilled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 fill-none",
              )}
            />
          );
        })}
      </div>
      {showScore && (
        <span className="text-xs font-bold text-foreground ml-1">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
