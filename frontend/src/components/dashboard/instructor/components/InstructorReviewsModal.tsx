"use client";

import React, { useState, useMemo } from "react";
import { Star, Search, MessageSquareQuote, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { RatingStars } from "@/components/ui/RatingStars";
import type { OverviewReview } from "../types";

interface InstructorReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviews: OverviewReview[];
  avgRating: string | number;
  initialReviewId?: string | null;
}

export function InstructorReviewsModal({
  isOpen,
  onClose,
  reviews,
  avgRating,
  initialReviewId,
}: InstructorReviewsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "ALL">("ALL");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");

  // Danh sách các khóa học duy nhất để làm bộ lọc
  const coursesList = useMemo(() => {
    const set = new Set<string>();
    reviews.forEach((r) => {
      if (r.courseTitle) set.add(r.courseTitle);
    });
    return Array.from(set);
  }, [reviews]);

  // Thống kê phân bố đánh giá
  const stats = useMemo(() => {
    const total = reviews.length;
    const count5 = reviews.filter((r) => Math.round(r.rating) === 5).length;
    const count4 = reviews.filter((r) => Math.round(r.rating) === 4).length;
    const count3Below = reviews.filter((r) => Math.round(r.rating) <= 3).length;
    return { total, count5, count4, count3Below };
  }, [reviews]);

  // Lọc đánh giá
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Lọc theo rating
      if (ratingFilter !== "ALL") {
        if (ratingFilter === 3) {
          if (Math.round(r.rating) > 3) return false;
        } else if (Math.round(r.rating) !== ratingFilter) {
          return false;
        }
      }

      // Lọc theo khóa học
      if (courseFilter !== "ALL" && r.courseTitle !== courseFilter) {
        return false;
      }

      // Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = r.userName.toLowerCase().includes(query);
        const matchComment = r.comment.toLowerCase().includes(query);
        const matchCourse = r.courseTitle.toLowerCase().includes(query);
        if (!matchName && !matchComment && !matchCourse) return false;
      }

      return true;
    });
  }, [reviews, ratingFilter, courseFilter, searchQuery]);

  // Tính điểm trung bình trực tiếp từ danh sách đánh giá thực tế
  const calculatedAvg = useMemo(() => {
    if (reviews.length === 0) {
      return typeof avgRating === "number" ? avgRating : parseFloat(avgRating) || 5.0;
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  }, [reviews, avgRating]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content size="xl" className="max-h-[85vh] flex flex-col p-6 gap-0">
        {/* Header Modal */}
        <div className="flex items-start justify-between pb-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <MessageSquareQuote className="w-4 h-4" aria-hidden="true" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Tất Cả Phản Hồi & Đánh Giá Của Sinh Viên
            </h2>
          </div>
        </div>

        {/* Tổng quan & Thống kê điểm số */}
        <div className="py-3 px-4 bg-muted/30 rounded-2xl border border-border/60 my-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono flex items-center gap-1.5">
              <span>{calculatedAvg.toFixed(1)}</span>
              <Star className="w-5 h-5 fill-warning text-warning" aria-hidden="true" />
            </div>
            <div>
              <RatingStars rating={calculatedAvg} size="sm" />
              <p className="text-[11px] text-muted-foreground mt-0.5">Điểm đánh giá trung bình</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap w-full sm:w-auto justify-start sm:justify-end">
            <span className="px-3 py-1.5 rounded-xl bg-surface border border-border text-foreground font-bold text-xs flex items-center gap-1.5 shadow-xs">
              <span className="font-mono">{stats.total}</span>
              <span>lượt đánh giá</span>
            </span>
          </div>
        </div>

        {/* Thanh tìm kiếm và bộ lọc */}
        <div className="space-y-2.5 pb-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nội dung nhận xét, tên học viên, môn học..."
              className="pl-9 pr-8 text-xs h-9 rounded-xl bg-surface"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            {/* Rating filters */}
            <span className="text-[11px] font-bold text-muted-foreground shrink-0 uppercase tracking-wider">
              Xếp hạng:
            </span>
            <Button
              variant={ratingFilter === "ALL" ? "filled" : "outlined"}
              size="sm"
              onClick={() => setRatingFilter("ALL")}
              className="h-6.5 text-[11px] px-2.5 rounded-lg shrink-0"
            >
              Tất cả ({stats.total})
            </Button>
            {stats.count5 > 0 && (
              <Button
                variant={ratingFilter === 5 ? "filled" : "outlined"}
                size="sm"
                onClick={() => setRatingFilter(5)}
                className="h-6.5 text-[11px] px-2.5 rounded-lg shrink-0 gap-1"
              >
                <Star className="w-3 h-3 fill-warning text-warning" aria-hidden="true" />5 sao (
                {stats.count5})
              </Button>
            )}
            {stats.count4 > 0 && (
              <Button
                variant={ratingFilter === 4 ? "filled" : "outlined"}
                size="sm"
                onClick={() => setRatingFilter(4)}
                className="h-6.5 text-[11px] px-2.5 rounded-lg shrink-0 gap-1"
              >
                <Star className="w-3 h-3 fill-warning text-warning" aria-hidden="true" />4 sao (
                {stats.count4})
              </Button>
            )}
            {stats.count3Below > 0 && (
              <Button
                variant={ratingFilter === 3 ? "filled" : "outlined"}
                size="sm"
                onClick={() => setRatingFilter(3)}
                className="h-6.5 text-[11px] px-2.5 rounded-lg shrink-0"
              >
                ≤ 3 sao ({stats.count3Below})
              </Button>
            )}

            {/* Course Filters if multiple courses */}
            {coursesList.length > 1 && (
              <>
                <span className="text-[11px] font-bold text-muted-foreground shrink-0 uppercase tracking-wider ml-2 border-l border-border pl-2">
                  Khóa học:
                </span>
                <Button
                  variant={courseFilter === "ALL" ? "filled" : "outlined"}
                  size="sm"
                  onClick={() => setCourseFilter("ALL")}
                  className="h-6.5 text-[11px] px-2.5 rounded-lg shrink-0"
                >
                  Tất cả môn
                </Button>
                {coursesList.map((course) => (
                  <Button
                    key={course}
                    variant={courseFilter === course ? "filled" : "outlined"}
                    size="sm"
                    onClick={() => setCourseFilter(course)}
                    className="h-6.5 text-[11px] px-2.5 rounded-lg shrink-0"
                    title={course}
                  >
                    {course}
                  </Button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Danh sách các đánh giá (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 min-h-[240px]">
          {filteredReviews.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-border rounded-2xl bg-muted/10">
              <MessageSquareQuote
                className="w-8 h-8 text-muted-foreground mx-auto opacity-50"
                aria-hidden="true"
              />
              <p className="text-xs font-semibold text-foreground">Không tìm thấy đánh giá nào</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Không có phản hồi nào phù hợp với bộ lọc hiện tại. Vui lòng thử chọn lại tiêu chí
                tìm kiếm hoặc xếp hạng.
              </p>
            </div>
          ) : (
            filteredReviews.map((rev) => {
              const isHighlighted = initialReviewId === rev.id;
              return (
                <div
                  key={rev.id}
                  className={`p-4 rounded-2xl bg-surface border transition-all ${
                    isHighlighted
                      ? "border-primary/60 bg-primary/5 shadow-xs ring-1 ring-primary/40"
                      : "border-border/80 hover:border-border"
                  } space-y-2.5`}
                >
                  {/* Top info row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={rev.userName} src={rev.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">
                            {rev.userName}
                          </h4>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            • {rev.timeAgo}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-[10px] py-0 px-2 font-normal mt-0.5 inline-block"
                        >
                          {rev.courseTitle}
                        </Badge>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-1.5 self-start sm:self-center">
                      <RatingStars rating={rev.rating} size="sm" showScore />
                    </div>
                  </div>

                  {/* Comment Body */}
                  <div className="text-xs sm:text-sm text-foreground/90 bg-muted/20 p-3 rounded-xl leading-relaxed italic border border-border/40">
                    &ldquo;{rev.comment}&rdquo;
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 mt-3 flex items-center justify-end">
          <Button
            variant="outlined"
            size="sm"
            onClick={onClose}
            className="text-xs px-4 rounded-xl"
          >
            Đóng
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
