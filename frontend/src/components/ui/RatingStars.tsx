import * as React from "react";
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
            <svg
              key={i}
              aria-hidden="true"
              className={cn(
                sizeClasses[size],
                isFilled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 fill-none",
              )}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.486-.413.87-.837.614L12 17.653l-4.708 2.89c-.424.256-.953-.128-.837-.614l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          );
        })}
      </div>
      {showScore && (
        <span className="text-xs font-bold text-foreground ml-1">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
