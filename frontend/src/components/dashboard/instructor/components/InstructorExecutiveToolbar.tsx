"use client";

import React from "react";
import Link from "next/link";
import { Plus, Users, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Course } from "@/gen/catalog/v1/catalog_pb";

interface InstructorExecutiveToolbarProps {
  userName: string;
  viewMode: "all" | "specific";
  onSelectViewMode: (mode: "all" | "specific") => void;
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (id: string) => void;
  onOpenOrgModal: () => void;
  courseStudentCounts?: Record<string, number>;
}

function getDynamicGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Chào buổi sáng";
  if (hour >= 12 && hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function InstructorExecutiveToolbar({
  userName,
  viewMode,
  onSelectViewMode,
  courses,
  selectedCourseId,
  onSelectCourse,
  onOpenOrgModal,
  courseStudentCounts,
}: InstructorExecutiveToolbarProps) {
  const hasNoCourses = courses.length === 0;
  const greeting = getDynamicGreeting();

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* 1. Thông tin giảng viên & Ngữ cảnh định danh */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg shadow-2xs shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "P"}
          </div>
          <div>
            <span
              suppressHydrationWarning
              className="text-xs text-muted-foreground font-medium block"
            >
              {greeting}, Thầy/Cô
            </span>
            <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              {userName || "PGS. TS. Trần Minh Tuấn"}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <span>Đang phụ trách {courses.length} khóa học</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-success font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> SLA phản hồi: 3.4h (Tốt)
              </span>
            </p>
          </div>
        </div>

        {/* 2. Cụm điều khiển: Bộ lọc ngữ cảnh + Cụm phím tắt nghiệp vụ */}
        <div className="flex items-center justify-between xl:justify-end gap-3 flex-wrap lg:flex-nowrap min-w-0">
          {/* Bộ lọc ngữ cảnh (Segmented Tabs + Dropdown chọn môn kèm số lượng học viên) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Segmented Control: Tất cả môn vs Chi tiết từng lớp */}
            <div className="p-1 rounded-2xl bg-muted/70 flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onSelectViewMode("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "all"
                    ? "bg-surface text-primary shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tất cả môn ({courses.length})
              </button>
              <button
                type="button"
                onClick={() => onSelectViewMode("specific")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "specific"
                    ? "bg-surface text-primary shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Chi tiết từng lớp
              </button>
            </div>

            {/* Dropdown danh sách khóa học kèm số lượng học viên (Xử lý cả khi có và chưa có khóa học) */}
            {viewMode === "specific" && (
              <div className="relative animate-in fade-in duration-150">
                {hasNoCourses ? (
                  <select
                    disabled
                    className="h-9 px-3 pr-8 rounded-xl bg-muted/50 border border-outline-variant/60 text-xs font-medium text-muted-foreground cursor-not-allowed max-w-[200px] truncate"
                    aria-label="Chưa có khóa học nào"
                  >
                    <option>Chưa có khóa học nào</option>
                  </select>
                ) : (
                  <select
                    value={selectedCourseId}
                    onChange={(e) => onSelectCourse(e.target.value)}
                    className="h-9 px-3 pr-8 rounded-xl bg-surface border border-outline-variant text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary outline-hidden appearance-none cursor-pointer max-w-[200px] sm:max-w-[260px] truncate shadow-2xs"
                    aria-label="Chọn khóa học để xem phân tích chi tiết"
                    title={courses.find((c) => c.id === selectedCourseId)?.title}
                  >
                    {courses.map((course) => {
                      const studentCount = courseStudentCounts?.[course.id];
                      const countLabel =
                        studentCount !== undefined ? ` (${studentCount} học viên)` : "";
                      return (
                        <option key={course.id} value={course.id}>
                          {course.title}
                          {countLabel}
                        </option>
                      );
                    })}
                  </select>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                    hasNoCourses ? "text-muted-foreground/50" : "text-muted-foreground"
                  }`}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>

          {/* Cụm phím tắt nghiệp vụ: Cố định nhóm, không bao giờ bị rớt lẻ */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Nút Thành viên tổ chức */}
            <Button
              type="button"
              variant="outlined"
              size="sm"
              onClick={onOpenOrgModal}
              className="rounded-xl text-xs font-bold gap-1.5 shrink-0 h-9 px-3"
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Thành viên tổ chức</span>
            </Button>

            {/* Nút Tạo khóa học mới (Primary CTA) */}
            <Link
              href="/instructor/courses/new"
              className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs shrink-0 ${
                hasNoCourses
                  ? "bg-primary hover:bg-primary-hover text-primary-foreground ring-4 ring-primary/25 shadow-md animate-pulse"
                  : "bg-primary hover:bg-primary-hover text-primary-foreground"
              }`}
            >
              {hasNoCourses ? (
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Plus className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Tạo khóa học mới</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
