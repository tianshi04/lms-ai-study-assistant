"use client";

import React from "react";
import { BarChart3, LayoutGrid, Star, ChevronRight } from "lucide-react";
import type { EnrichedCourseComparisonItem } from "../types";

export interface InstructorCourseComparisonTabProps {
  courses: EnrichedCourseComparisonItem[];
  activeCourseId?: string;
  compareViewType: "bars" | "cards";
  onChangeCompareViewType: (type: "bars" | "cards") => void;
  compareSortBy: "rate" | "students" | "rating";
  onChangeCompareSortBy: (sort: "rate" | "students" | "rating") => void;
  onSelectCourse: (courseId: string) => void;
}

export function InstructorCourseComparisonTab({
  courses,
  activeCourseId,
  compareViewType,
  onChangeCompareViewType,
  compareSortBy,
  onChangeCompareSortBy,
  onSelectCourse,
}: InstructorCourseComparisonTabProps) {
  return (
    <div className="space-y-4">
      {/* Header điều khiển: Chuyển kiểu hiển thị & Sắp xếp */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-outline-variant/50">
        <div>
          <p className="text-xs font-bold text-foreground">Đối Sánh Hiệu Suất Từng Khóa Học</p>
          <p className="text-[11px] text-muted-foreground">
            Dữ liệu thực tế từ hệ thống theo dõi học tập của từng lớp (Click môn để xem chi tiết):
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle 2 chế độ hiển thị Sơ đồ */}
          <div className="p-0.5 rounded-lg bg-muted flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeCompareViewType("bars")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                compareViewType === "bars"
                  ? "bg-surface text-primary shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Xem dạng thước đo đối sánh"
            >
              <BarChart3 className="w-3 h-3" aria-hidden="true" />
              <span>Thước đo</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeCompareViewType("cards")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                compareViewType === "cards"
                  ? "bg-surface text-primary shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Xem dạng thẻ vòng tròn"
            >
              <LayoutGrid className="w-3 h-3" aria-hidden="true" />
              <span>Thẻ tròn</span>
            </button>
          </div>

          {/* Bộ sắp xếp */}
          <select
            value={compareSortBy}
            onChange={(e) =>
              onChangeCompareSortBy(e.target.value as "rate" | "students" | "rating")
            }
            className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-foreground focus:ring-1 focus:ring-primary outline-hidden cursor-pointer"
            aria-label="Sắp xếp danh sách khóa học"
          >
            <option value="rate">Hoàn thành cao nhất</option>
            <option value="students">Đông học viên nhất</option>
            <option value="rating">Đánh giá cao nhất</option>
          </select>
        </div>
      </div>

      {/* CÁCH 1: BIỂU ĐỒ THƯỚC ĐO ĐỐI SÁNH (BENCHMARK SCALE MATRIX) */}
      {compareViewType === "bars" ? (
        <div className="space-y-3">
          {/* Thước đo tỷ lệ 0% - 100% */}
          <div className="relative pt-2 pb-1 px-3 text-[10px] font-mono text-muted-foreground border-b border-outline-variant/40 flex justify-between">
            <span className="w-8">0%</span>
            <span className="w-8 text-center">25%</span>
            <span className="w-8 text-center">50%</span>
            <span className="w-8 text-center">75%</span>
            <span className="w-8 text-right">100%</span>
          </div>

          {/* Danh sách các thanh đối sánh */}
          <div className="space-y-3">
            {courses.map((course) => {
              const isCurrentActive = course.id === activeCourseId;
              return (
                <button
                  type="button"
                  key={course.id}
                  onClick={() => onSelectCourse(course.id)}
                  className={`w-full text-left group p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isCurrentActive
                      ? "bg-primary/5 border-primary ring-1 ring-primary/30"
                      : "bg-surface border-outline-variant/60 hover:border-primary/50 hover:shadow-xs"
                  }`}
                >
                  {/* Header hàng: Tên môn, Trạng thái & Rating */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground uppercase font-mono shrink-0">
                        {course.subject || "Khóa học"}
                      </span>
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {course.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                      <span className="text-muted-foreground text-[11px]">
                        {course.weekCount} tuần • {course.totalStudents} SV
                      </span>
                      <span className="text-warning font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-warning text-warning" aria-hidden="true" />
                        {course.rating.toFixed(1)}
                      </span>
                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded-md ${
                          course.compRate >= 70
                            ? "bg-success/15 text-success"
                            : course.compRate >= 30
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {course.compRate}% TB
                      </span>
                    </div>
                  </div>

                  {/* Thanh tiến độ đa màu (Xanh lá: Hoàn thành, Xanh dương: Đang học) */}
                  <div className="w-full h-3 rounded-full overflow-hidden bg-muted flex relative">
                    {/* Đường chuẩn mờ 50% benchmark */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-foreground/20 z-10 pointer-events-none" />

                    {/* Phần đã tốt nghiệp */}
                    <div
                      style={{
                        width: `${course.totalStudents > 0 ? (course.completedCount / course.totalStudents) * 100 : 0}%`,
                      }}
                      className="h-full bg-success transition-all"
                      title={`Đã hoàn thành: ${course.completedCount} SV`}
                    />
                    {/* Phần đang học */}
                    <div
                      style={{
                        width: `${course.totalStudents > 0 ? (course.inProgressCount / course.totalStudents) * 100 : 0}%`,
                      }}
                      className="h-full bg-primary transition-all"
                      title={`Đang học tích cực: ${course.inProgressCount} SV`}
                    />
                  </div>

                  {/* Footer hàng: Chú thích & Nút xem chi tiết */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success" /> {course.completedCount}{" "}
                        đã cấp chứng chỉ
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary" />{" "}
                        {course.inProgressCount} đang tiến hành
                      </span>
                    </div>
                    <span className="text-primary font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Xem phân tích môn này →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* CÁCH 2: LƯỚI THẺ VÒNG TRÒN TỶ LỆ (RADIAL RING CARDS) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {courses.map((course) => {
            const isCurrentActive = course.id === activeCourseId;
            const radius = 32;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (course.compRate / 100) * circumference;

            return (
              <button
                type="button"
                key={course.id}
                onClick={() => onSelectCourse(course.id)}
                className={`w-full text-left group p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isCurrentActive
                    ? "bg-primary/5 border-primary ring-1 ring-primary/30"
                    : "bg-surface border-outline-variant/60 hover:border-primary/50 hover:shadow-sm"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground uppercase font-mono">
                      {course.subject || "Khóa học"}
                    </span>
                    <span className="text-warning font-bold text-xs flex items-center gap-1 font-mono">
                      <Star className="w-3 h-3 fill-warning text-warning" aria-hidden="true" />
                      {course.rating.toFixed(1)}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 min-h-[32px]">
                    {course.title}
                  </h4>
                </div>

                {/* Vòng tròn SVG Radial Donut */}
                <div className="my-3 flex items-center justify-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="transparent"
                        className="text-muted/40"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className={
                          course.compRate >= 70
                            ? "text-success transition-all duration-700"
                            : course.compRate >= 30
                              ? "text-primary transition-all duration-700"
                              : "text-muted-foreground transition-all duration-700"
                        }
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-base font-black font-mono text-foreground leading-none">
                        {course.compRate}%
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-tight mt-0.5">
                        Hoàn thành
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thông số dưới chân thẻ */}
                <div className="pt-2.5 border-t border-outline-variant/40 space-y-2 w-full">
                  <div className="grid grid-cols-2 text-[11px] font-mono text-muted-foreground">
                    <span>👥 {course.totalStudents} học viên</span>
                    <span className="text-right">📚 {course.weekCount} tuần học</span>
                  </div>
                  <div className="text-[11px] font-bold text-primary flex items-center justify-between group-hover:underline">
                    <span>Mở chi tiết lớp</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
