"use client";

import React, { useState } from "react";
import { Star, MessageSquareQuote, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { InstructorReviewsModal } from "./InstructorReviewsModal";
import type { OverviewReview } from "../types";

interface InstructorRecentReviewsCardProps {
  reviews: OverviewReview[];
  avgRating: string | number;
}

export function InstructorRecentReviewsCard({
  reviews,
  avgRating,
}: InstructorRecentReviewsCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  // Chỉ hiển thị tối đa 3 đánh giá tiêu biểu trên widget để giữ layout cân đối
  const displayReviews = reviews.slice(0, 3);
  const numericAvg = typeof avgRating === "number" ? avgRating : parseFloat(avgRating) || 5.0;

  const handleOpenReview = (reviewId?: string) => {
    setSelectedReviewId(reviewId || null);
    setIsModalOpen(true);
  };

  return (
    <>
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
          <button
            type="button"
            onClick={() => handleOpenReview()}
            className="text-xs font-mono font-bold text-warning flex items-center gap-1 hover:underline cursor-pointer"
            title="Xem chi tiết điểm đánh giá"
          >
            <Star className="w-3.5 h-3.5 fill-warning text-warning" />
            <span>{numericAvg.toFixed(1)} TB</span>
            <span className="text-[10px] text-muted-foreground font-sans font-normal">
              ({reviews.length})
            </span>
          </button>
        </div>

        {/* Danh sách tối đa 3 đánh giá tiêu biểu */}
        <div className="space-y-2.5">
          {reviews.length === 0 ? (
            <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 text-center space-y-1">
              <p className="text-xs font-medium text-foreground">Chưa có đánh giá mới</p>
              <p className="text-[11px] text-muted-foreground">
                Đánh giá từ sinh viên sau khi hoàn thành khóa học sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            displayReviews.map((rev) => (
              <button
                key={rev.id}
                type="button"
                onClick={() => handleOpenReview(rev.id)}
                className="w-full text-left p-3 rounded-2xl bg-surface border border-outline-variant/60 space-y-1.5 hover:border-primary/50 hover:bg-surface-container/60 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 block"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={rev.userName} size="sm" className="w-6 h-6 text-[10px]" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                        {rev.userName}
                      </h4>
                      <span className="text-[10px] text-muted-foreground block truncate max-w-[140px]">
                        {rev.courseTitle}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold text-warning flex items-center gap-0.5 shrink-0">
                    <Star className="w-3 h-3 fill-warning text-warning" />
                    {rev.rating.toFixed(1)}
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground italic leading-relaxed line-clamp-2">
                  &ldquo;{rev.comment}&rdquo;
                </p>

                <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground font-medium">
                  <span>{rev.timeAgo}</span>
                  <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-semibold">
                    Xem chi tiết <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Nút Xem Tất Cả Đánh Giá */}
        {reviews.length > 0 && (
          <Button
            variant="outlined"
            size="sm"
            onClick={() => handleOpenReview()}
            className="w-full text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary/5 hover:border-primary/40 transition-colors"
          >
            <span>
              {reviews.length > 3
                ? `Xem tất cả ${reviews.length} đánh giá`
                : "Xem chi tiết & quản lý đánh giá"}
            </span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Modal chi tiết đánh giá */}
      <InstructorReviewsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedReviewId(null);
        }}
        reviews={reviews}
        avgRating={avgRating}
        initialReviewId={selectedReviewId}
      />
    </>
  );
}
