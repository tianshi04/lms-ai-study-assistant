"use client";

import React from "react";
import { Users, CheckCircle2, Star, Award } from "lucide-react";

interface InstructorKpiRibbonProps {
  viewMode: "all" | "specific";
  totalStudents: number;
  growthPercent?: number;
  avgCompletionRate: number;
  avgRating: string | number;
  reviewCount: number;
  totalCertificates: number;
  totalLearningHours: number;
  loading?: boolean;
}

export function InstructorKpiRibbon({
  viewMode,
  totalStudents,
  growthPercent = 18,
  avgCompletionRate,
  avgRating,
  reviewCount,
  totalCertificates,
  totalLearningHours,
  loading = false,
}: InstructorKpiRibbonProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Tổng Học Viên */}
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
            {viewMode === "all" && (
              <span className="text-[10px] font-bold font-mono text-success flex items-center">
                +{growthPercent}%
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
            {viewMode === "all" ? "Tất cả các khóa phụ trách" : "Sinh viên trong lớp này"}
          </span>
        </div>
      </div>

      {/* 2. Tỷ Lệ Hoàn Thành TB */}
      <div className="p-4 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center gap-3.5 transition-all hover:border-success/40">
        <div className="w-11 h-11 rounded-2xl bg-success/10 text-success flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            Tỷ lệ hoàn thành
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-success font-mono leading-none">
              {loading ? "…" : `${Math.round(avgCompletionRate)}%`}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">Mục tiêu: 60%</span>
          </div>
          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
            {avgCompletionRate >= 60 ? "Vượt ngưỡng cam kết sàn" : "Cần tăng cường hỗ trợ"}
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
            Đánh giá trung bình
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-black text-foreground font-mono leading-none">
              {loading
                ? "…"
                : `${typeof avgRating === "number" ? avgRating.toFixed(1) : avgRating} ★`}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              {reviewCount} đánh giá
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
            100% phản hồi tích cực
          </span>
        </div>
      </div>

      {/* 4. Tác Động Giảng Dạy */}
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
            {viewMode === "all" && (
              <span className="text-[10px] font-bold font-mono text-muted-foreground">
                {totalLearningHours.toLocaleString()}h học
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
            {viewMode === "all" ? "Chứng chỉ số xác thực" : "Học viên đã tốt nghiệp"}
          </span>
        </div>
      </div>
    </div>
  );
}
