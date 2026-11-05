"use client";

import React from "react";
import Link from "next/link";
import { Plus, Users, CheckCircle2, ChevronDown } from "lucide-react";
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
}

export function InstructorExecutiveToolbar({
  userName,
  viewMode,
  onSelectViewMode,
  courses,
  selectedCourseId,
  onSelectCourse,
  onOpenOrgModal,
}: InstructorExecutiveToolbarProps) {
  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Thông tin giảng viên & Ngữ cảnh học thuật */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg shadow-2xs shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "P"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">
                Chào buổi tối, Thầy/Cô
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              {userName || "PGS. TS. Trần Minh Tuấn"}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
              <span>Đang phụ trách {courses.length} khóa học</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-success font-medium">
                <CheckCircle2 className="w-3 h-3" /> SLA phản hồi: 3.4h (Tốt)
              </span>
            </p>
          </div>
        </div>

        {/* Cụm điều khiển chế độ xem & Thao tác chính */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Segmented Control: Tất cả môn vs Chi tiết từng lớp */}
          <div className="p-1 rounded-2xl bg-muted/70 flex items-center gap-1">
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

          {/* Progressive Disclosure: CHỈ hiện Dropdown chọn môn khi ở chế độ "specific" */}
          {viewMode === "specific" && courses.length > 0 && (
            <div className="relative animate-in fade-in slide-in-from-left-2 duration-150">
              <select
                value={selectedCourseId}
                onChange={(e) => onSelectCourse(e.target.value)}
                className="h-9 px-3 pr-8 rounded-xl bg-surface border border-outline-variant text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary outline-hidden appearance-none cursor-pointer max-w-[220px] sm:max-w-[280px] truncate shadow-2xs"
                aria-label="Chọn khóa học để xem phân tích chi tiết"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
            </div>
          )}

          {/* Nút thành viên tổ chức */}
          <Button
            type="button"
            variant="outlined"
            size="sm"
            onClick={onOpenOrgModal}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tổ chức</span>
          </Button>

          {/* Nút tạo khóa học mới (Primary CTA) */}
          <Link
            href="/instructor/courses/new"
            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>+ Soạn khóa</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
