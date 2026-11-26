"use client";

import React from "react";
import Link from "next/link";
import { Plus, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
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
    <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-3.5">
      {/* Hàng 1: Thông tin định danh giảng viên (Trái) + Phím tắt thao tác nghiệp vụ (Phải) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* 1. Thông tin giảng viên & Ngữ cảnh định danh */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg shadow-2xs shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "P"}
          </div>
          <div className="min-w-0">
            <span
              suppressHydrationWarning
              className="text-xs text-muted-foreground font-medium block"
            >
              {greeting}, Thầy/Cô
            </span>
            <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight truncate">
              {userName || "PGS. TS. Trần Minh Tuấn"}
            </h1>
          </div>
        </div>

        {/* Cụm phím tắt nghiệp vụ: Thành viên tổ chức + Tạo khóa học mới */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
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

      {/* Hàng 2: Bộ lọc ngữ cảnh (Segmented Tabs + Dropdown chọn môn kèm số lượng học viên) */}
      <div className="pt-2.5 border-t border-outline-variant/40 flex items-center gap-2.5 flex-wrap">
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
          <div className="animate-in fade-in duration-150 flex-1 min-w-[260px] max-w-xl sm:max-w-2xl">
            {hasNoCourses ? (
              <Select disabled value="">
                <Select.Trigger
                  disabled
                  aria-label="Chưa có khóa học nào"
                  className="h-9 w-full px-3 py-0 rounded-xl bg-muted/50 border border-outline-variant/60 text-xs font-medium text-muted-foreground"
                >
                  <Select.Value placeholder="Chưa có khóa học nào" />
                </Select.Trigger>
              </Select>
            ) : (
              <Select
                value={selectedCourseId}
                onValueChange={(val) => {
                  if (val) onSelectCourse(String(val));
                }}
              >
                <Select.Trigger
                  aria-label="Chọn khóa học để xem phân tích chi tiết"
                  className="h-9 w-full px-3 py-0 rounded-xl bg-surface border border-outline-variant text-xs font-semibold text-foreground shadow-2xs hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-all"
                  title={courses.find((c) => c.id === selectedCourseId)?.title}
                >
                  <Select.Value placeholder="Chọn khóa học...">
                    {(() => {
                      const currentCourse = courses.find((c) => c.id === selectedCourseId);
                      if (!currentCourse) return "Chọn khóa học...";
                      const studentCount = courseStudentCounts?.[currentCourse.id];
                      const countLabel =
                        studentCount !== undefined ? ` (${studentCount} học viên)` : "";
                      return `${currentCourse.title}${countLabel}`;
                    })()}
                  </Select.Value>
                </Select.Trigger>
                <Select.Content className="min-w-[var(--anchor-width)] w-max max-w-[min(calc(100vw-2rem),46rem)]">
                  {courses.map((course) => {
                    const studentCount = courseStudentCounts?.[course.id];
                    const countLabel =
                      studentCount !== undefined ? ` (${studentCount} học viên)` : "";
                    return (
                      <Select.Item
                        key={course.id}
                        value={course.id}
                        className="text-xs py-2 px-3 rounded-xl cursor-pointer"
                      >
                        <span className="whitespace-normal leading-relaxed">
                          {course.title}
                          {countLabel}
                        </span>
                      </Select.Item>
                    );
                  })}
                </Select.Content>
              </Select>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
