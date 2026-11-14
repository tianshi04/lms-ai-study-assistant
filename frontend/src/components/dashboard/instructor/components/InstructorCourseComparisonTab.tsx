"use client";

import React from "react";
import { Star, ChevronRight } from "lucide-react";
import type { ComparisonCourseCardItem } from "../types";

export interface InstructorCourseComparisonTabProps {
  courses: ComparisonCourseCardItem[];
  activeCourseId?: string;
  onSelectCourse: (courseId: string) => void;
}

export function InstructorCourseComparisonTab({
  courses,
  activeCourseId: _activeCourseId,
  onSelectCourse,
}: InstructorCourseComparisonTabProps) {
  return (
    <div className="space-y-4">
      {/* Header: Tiêu đề đối sánh */}
      <div>
        <p className="text-xs font-bold text-foreground">Đối Sánh Hiệu Suất Từng Khóa Học</p>
      </div>

      {/* LƯỚI THẺ VÒNG TRÒN TỶ LỆ (RADIAL RING CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {courses.map((course) => {
          const radius = 32;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (course.compRate / 100) * circumference;

          return (
            <button
              type="button"
              key={course.id}
              onClick={() => onSelectCourse(course.id)}
              className="w-full text-left group p-4 rounded-2xl border border-outline-variant/60 bg-surface hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
    </div>
  );
}
