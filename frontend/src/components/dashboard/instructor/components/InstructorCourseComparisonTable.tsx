"use client";

import React, { useState, useMemo } from "react";
import { FileText, MessageSquare, ArrowRight, BookOpen } from "lucide-react";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import type { Course } from "@/gen/catalog/v1/catalog_pb";
import type { OverviewCourseStat } from "../types";

interface EnrichedCourseItem {
  course: Course;
  stats?: OverviewCourseStat;
  code: string;
  credits: number;
}

interface InstructorCourseComparisonTableProps {
  courses: Course[];
  courseStats: OverviewCourseStat[];
  onSelectCourse: (courseId: string) => void;
}

export function InstructorCourseComparisonTable({
  courses,
  courseStats,
  onSelectCourse,
}: InstructorCourseComparisonTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Làm giàu thông tin khóa học với mã môn và dữ liệu thống kê
  const enrichedCourses: EnrichedCourseItem[] = useMemo(() => {
    return courses.map((course, idx) => {
      const stats = courseStats.find(
        (s) =>
          course.id.toLowerCase().includes(s.keyword) ||
          course.title.toLowerCase().includes(s.keyword),
      );

      const codes = ["ECO101", "BEH201", "MET301", "FIN401", "MGT501"];
      const code = codes[idx % codes.length];

      return {
        course,
        stats,
        code,
        credits: 3,
      };
    });
  }, [courses, courseStats]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return enrichedCourses;
    const q = searchQuery.toLowerCase();
    return enrichedCourses.filter(
      (item) =>
        item.course.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.course.id.toLowerCase().includes(q),
    );
  }, [enrichedCourses, searchQuery]);

  return (
    <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4">
      {/* Header Bảng so sánh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-bold text-foreground">
              Bảng So Sánh Các Khóa Học Giảng Dạy
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              {courses.length} môn
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nhấp vào bất kỳ dòng nào để mở bảng phân tích chi tiết và danh sách lớp của môn học đó
          </p>
        </div>

        {/* Ô tìm kiếm môn học */}
        <div className="w-full sm:w-64">
          <Input
            type="text"
            placeholder="Tìm tên môn, mã học phần…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8.5 text-xs rounded-xl bg-surface border-outline-variant"
          />
        </div>
      </div>

      {/* Container bảng co giãn tự nhiên: Không khóa cứng max-h để tránh thanh cuộn nhân tạo */}
      <div className="overflow-x-auto rounded-2xl border border-outline-variant/60 bg-surface">
        <Table>
          <Table.Header className="bg-surface-container-high/60">
            <Table.Row className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Table.Head className="py-2.5 px-3">Tên khóa học & Mã HP</Table.Head>
              <Table.Head className="py-2.5 px-3 text-center">Trạng thái</Table.Head>
              <Table.Head className="py-2.5 px-3 text-right">Học viên</Table.Head>
              <Table.Head className="py-2.5 px-3">Tiến độ TB</Table.Head>
              <Table.Head className="py-2.5 px-3">Nhiệm vụ chờ</Table.Head>
              <Table.Head className="py-2.5 px-3 text-right">Đánh giá</Table.Head>
              <Table.Head className="py-2.5 px-3 text-right">Thao tác</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filtered.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                  Không tìm thấy khóa học nào khớp với từ khóa tìm kiếm.
                </Table.Cell>
              </Table.Row>
            ) : (
              filtered.map((item) => {
                const { course, stats, code, credits } = item;
                const totalStudents = stats?.totalStudents ?? 45;
                const compRate = stats?.compRate ?? 50;
                const pendingAssignments = stats?.pendingAssignments ?? 1;
                const pendingQuestions = stats?.pendingQuestions ?? 1;

                return (
                  <Table.Row
                    key={course.id}
                    onClick={() => onSelectCourse(course.id)}
                    className="text-xs hover:bg-muted/30 cursor-pointer transition-colors group"
                  >
                    {/* Tên môn học & Metadata sư phạm thay vì ID thô */}
                    <Table.Cell className="py-3 px-3">
                      <div className="font-bold text-foreground group-hover:text-primary transition-colors max-w-[280px] truncate">
                        {course.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-primary">{code}</span>
                        <span>•</span>
                        <span>{credits} Tín chỉ</span>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">
                          {course.partnerName || "NEU Business School"}
                        </span>
                      </div>
                    </Table.Cell>

                    {/* Trạng thái */}
                    <Table.Cell className="text-center py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                        Đã xuất bản
                      </span>
                    </Table.Cell>

                    {/* Số học viên */}
                    <Table.Cell className="text-right font-mono font-bold text-foreground py-3 px-3">
                      {totalStudents} SV
                    </Table.Cell>

                    {/* Thanh tiến độ TB */}
                    <Table.Cell className="py-3 px-3 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="font-bold text-foreground">{compRate}%</span>
                        <span className="text-muted-foreground text-[10px]">Khoảng 2 tuần</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full transition-all duration-300"
                          style={{ width: `${compRate}%` }}
                        />
                      </div>
                    </Table.Cell>

                    {/* Nhiệm vụ chờ */}
                    <Table.Cell className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {pendingAssignments > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                            <FileText className="w-3 h-3" /> {pendingAssignments} bài chấm
                          </span>
                        )}
                        {pendingQuestions > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning">
                            <MessageSquare className="w-3 h-3" /> {pendingQuestions} Q&A
                          </span>
                        )}
                      </div>
                    </Table.Cell>

                    {/* Đánh giá */}
                    <Table.Cell className="text-right font-mono font-bold text-warning py-3 px-3">
                      {stats?.rating ? stats.rating.toFixed(1) : "5.0"} ★
                    </Table.Cell>

                    {/* Thao tác */}
                    <Table.Cell className="text-right whitespace-nowrap py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary group-hover:underline">
                        <span>Chi tiết</span>
                        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
}
