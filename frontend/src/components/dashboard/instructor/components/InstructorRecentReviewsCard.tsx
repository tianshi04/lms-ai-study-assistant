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

  // Chỉ hiển thị tối đa 3 đánh giá tiêu biểu trên widget để giữ layout cân đối
  const displayReviews = reviews.slice(0, 3);
  const calculatedAvg =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : typeof avgRating === "number"
        ? avgRating
        : parseFloat(avgRating) || 5.0;

  return (
    <>
      <div className="p-4.5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <MessageSquareQuote className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Phản Hồi Sinh Viên
            </h3>
          </div>
          <div
            className="text-xs font-mono font-bold text-warning flex items-center gap-1"
            title="Điểm đánh giá trung bình"
          >
            <Star className="w-3.5 h-3.5 fill-warning text-warning" />
            <span>{calculatedAvg.toFixed(1)} TB</span>
            <span className="text-[10px] text-muted-foreground font-sans font-normal">
              ({reviews.length})
            </span>
          </div>
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
              <div
                key={rev.id}
                className="p-3 rounded-2xl bg-surface border border-outline-variant/60 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      name={rev.userName}
                      src={rev.avatarUrl}
                      size="sm"
                      className="w-6 h-6 text-[10px]"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground leading-tight truncate">
                        {rev.userName}
                      </h4>
                      <span className="text-[10px] text-muted-foreground block truncate">
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

                <div className="pt-0.5 text-[10px] text-muted-foreground font-medium">
                  <span>{rev.timeAgo}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Nút Xem Tất Cả Đánh Giá */}
        {reviews.length > 0 && (
          <Button
            variant="outlined"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="w-full text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary/5 hover:border-primary/40 transition-colors"
          >
            <span>
              {reviews.length > 3 ? `Xem tất cả ${reviews.length} đánh giá` : "Xem tất cả đánh giá"}
            </span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Modal chi tiết đánh giá */}
      <InstructorReviewsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        reviews={reviews}
        avgRating={avgRating}
      />
    </>
  );
}
