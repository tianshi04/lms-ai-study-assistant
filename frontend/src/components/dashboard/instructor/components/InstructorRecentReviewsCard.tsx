"use client";

import React from "react";
import { Star, MessageSquareQuote } from "lucide-react";
import type { OverviewReview } from "../types";

interface InstructorRecentReviewsCardProps {
  reviews: OverviewReview[];
  avgRating: string | number;
}

export function InstructorRecentReviewsCard({
  reviews,
  avgRating,
}: InstructorRecentReviewsCardProps) {
  return (
    <div className="p-4.5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
            <MessageSquareQuote className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Phản Hồi Sinh Viên
          </h3>
        </div>
        <span className="text-xs font-mono font-bold text-warning flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-warning text-warning" />
          {typeof avgRating === "number" ? avgRating.toFixed(1) : avgRating} TB
        </span>
      </div>

      {/* Danh sách đánh giá sinh viên */}
      <div className="space-y-2.5">
        {reviews.length === 0 ? (
          <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 text-center space-y-1">
            <p className="text-xs font-medium text-foreground">Chưa có đánh giá mới</p>
            <p className="text-[11px] text-muted-foreground">
              Đánh giá từ sinh viên sau khi hoàn thành khóa học sẽ hiển thị tại đây.
            </p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-3 rounded-2xl bg-surface border border-outline-variant/60 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center">
                    {rev.userName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-tight">
                      {rev.userName}
                    </h4>
                    <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">
                      {rev.courseTitle}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-mono font-bold text-warning flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-warning text-warning" />
                  {rev.rating.toFixed(1)}
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground italic leading-relaxed line-clamp-3">
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
