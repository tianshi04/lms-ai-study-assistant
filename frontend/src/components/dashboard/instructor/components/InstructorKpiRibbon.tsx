"use client";

import React from "react";
import { Users, Star, Award, Clock } from "lucide-react";

interface InstructorKpiRibbonProps {
  viewMode: "all" | "specific";
  totalStudents: number;
  paidStudentsCount?: number;
  auditStudentsCount?: number;
  growthPercent?: number;
  avgCompletionRate: number;
  avgRating: string | number;
  reviewCount: number;
  totalCertificates: number;
  totalLearningHours?: number;
  paidLearningHours?: number;
  auditLearningHours?: number;
  loading?: boolean;
}

export function InstructorKpiRibbon({
  viewMode,
  totalStudents,
  paidStudentsCount,
  auditStudentsCount,
  growthPercent: _growthPercent = 18,
  avgCompletionRate,
  avgRating,
  reviewCount,
  totalCertificates,
  totalLearningHours = 0,
  paidLearningHours,
  auditLearningHours,
  loading = false,
}: InstructorKpiRibbonProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Tổng Học Viên & Phân tầng Gói học */}
      <div className="p-4 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center gap-3.5 transition-all hover:border-primary/40">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            {viewMode === "all" ? "Tổng học viên" : "Học viên ghi danh"}
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-foreground font-mono leading-none">
              {loading ? "…" : `${totalStudents} SV`}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground block leading-snug mt-0.5">
            {loading
              ? "Đang tải dữ liệu…"
              : paidStudentsCount !== undefined
                ? `${paidStudentsCount} chính thức • ${auditStudentsCount || 0} học thử`
                : viewMode === "all"
                  ? "Tất cả các khóa phụ trách"
                  : "Sinh viên trong lớp này"}
          </span>
        </div>
      </div>

      {/* 2. Tiến Độ & Thời Lượng Học Thực Tế */}
      <div className="p-4 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center gap-3.5 transition-all hover:border-success/40">
        <div className="w-11 h-11 rounded-2xl bg-success/10 text-success flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            Tiến độ &amp; Thời lượng học
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-success font-mono leading-none">
              {loading ? "…" : `${Math.round(avgCompletionRate)}%`}
            </span>
            {totalLearningHours > 0 && (
              <span className="text-[11px] font-mono font-bold text-muted-foreground">
                ({totalLearningHours}h tích lũy)
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground block leading-snug mt-0.5">
            {loading
              ? "Đang tải dữ liệu…"
              : paidLearningHours !== undefined && auditLearningHours !== undefined
                ? `${paidLearningHours}h chính thức • ${auditLearningHours}h học thử`
                : avgCompletionRate >= 60
                  ? "Tiến độ học tập rất tốt"
                  : "Cần theo dõi & đôn đốc học viên"}
          </span>
        </div>
      </div>

      {/* 3. Đánh Giá Chất Lượng */}
      <div className="p-4 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center gap-3.5 transition-all hover:border-warning/40">
        <div className="w-11 h-11 rounded-2xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
          <Star className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            Đánh giá chất lượng
          </p>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-0.5">
            <span className="inline-flex items-center gap-1 text-xl sm:text-2xl font-black text-foreground font-mono leading-none whitespace-nowrap">
              {loading ? (
                "…"
              ) : (
                <>
                  <span>{typeof avgRating === "number" ? avgRating.toFixed(1) : avgRating}</span>
                  <Star
                    className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0"
                    aria-hidden="true"
                  />
                </>
              )}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
              {reviewCount} đánh giá
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
            Chất lượng khóa học theo học viên
          </span>
        </div>
      </div>

      {/* 4. Tác Động & Chứng Chỉ Đã Cấp */}
      <div className="p-4 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center gap-3.5 transition-all hover:border-primary/40">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Award className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            {viewMode === "all" ? "Tác động tích lũy" : "Chứng chỉ đã cấp"}
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-foreground font-mono leading-none">
              {loading ? "…" : `${totalCertificates} CC`}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground block leading-snug mt-0.5">
            {viewMode === "all" ? "Chứng chỉ số xác thực" : "Học viên đã tốt nghiệp"}
          </span>
        </div>
      </div>
    </div>
  );
}
