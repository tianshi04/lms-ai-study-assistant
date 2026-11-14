"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  MessageSquare,
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CourseStatus, type Course, type InstructorAnalytics } from "@/gen/catalog/v1/catalog_pb";

interface EnrichedCourseItem {
  course: Course;
  totalStudents: number;
  compRate: number;
  rating: number;
  pendingGrading: number;
  overdueGrading: number;
  pendingQa: number;
}

interface InstructorCourseComparisonTableProps {
  courses: Course[];
  analyticsByCourseId?: Map<string, InstructorAnalytics | null | undefined>;
  pendingGradingByCourseId?: Map<string, number>;
  overdueGradingByCourseId?: Map<string, number>;
  pendingQaByCourseId?: Map<string, number>;
  onSelectCourse: (courseId: string) => void;
}

function renderCourseStatusBadge(status?: CourseStatus) {
  switch (status) {
    case CourseStatus.PUBLISHED:
      return (
        <Badge variant="success" className="whitespace-nowrap text-[10px] font-bold px-2 py-0.5">
          Đã xuất bản
        </Badge>
      );
    case CourseStatus.DRAFT:
      return (
        <Badge variant="secondary" className="whitespace-nowrap text-[10px] font-bold px-2 py-0.5">
          Bản nháp
        </Badge>
      );
    case CourseStatus.PENDING_REVIEW:
      return (
        <Badge variant="warning" className="whitespace-nowrap text-[10px] font-bold px-2 py-0.5">
          Đang duyệt
        </Badge>
      );
    case CourseStatus.REJECTED:
      return (
        <Badge variant="error" className="whitespace-nowrap text-[10px] font-bold px-2 py-0.5">
          Từ chối
        </Badge>
      );
    default:
      return (
        <Badge variant="success" className="whitespace-nowrap text-[10px] font-bold px-2 py-0.5">
          Đã xuất bản
        </Badge>
      );
  }
}

export function InstructorCourseComparisonTable({
  courses,
  analyticsByCourseId,
  pendingGradingByCourseId,
  overdueGradingByCourseId,
  pendingQaByCourseId,
  onSelectCourse,
}: InstructorCourseComparisonTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Làm giàu thông tin khóa học với số liệu thật từ analytics và hàng đợi
  const enrichedCourses: EnrichedCourseItem[] = useMemo(() => {
    return courses.map((course) => {
      const an = analyticsByCourseId?.get(course.id);

      const totalStudents = an?.totalEnrolledStudents ?? an?.students?.length ?? 0;
      const compRate = an?.averageCompletionRate != null ? Math.round(an.averageCompletionRate) : 0;
      const rating = an?.averageRating || course.averageRating || 5.0;

      const pendingGrading = pendingGradingByCourseId?.get(course.id) || 0;
      const overdueGrading = overdueGradingByCourseId?.get(course.id) || 0;
      const pendingQa = pendingQaByCourseId?.get(course.id) || 0;

      return {
        course,
        totalStudents,
        compRate,
        rating,
        pendingGrading,
        overdueGrading,
        pendingQa,
      };
    });
  }, [
    courses,
    analyticsByCourseId,
    pendingGradingByCourseId,
    overdueGradingByCourseId,
    pendingQaByCourseId,
  ]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return enrichedCourses;
    const q = searchQuery.toLowerCase();
    return enrichedCourses.filter(
      (item) =>
        item.course.title.toLowerCase().includes(q) ||
        (item.course.slug && item.course.slug.toLowerCase().includes(q)) ||
        (item.course.partnerName && item.course.partnerName.toLowerCase().includes(q)) ||
        item.course.id.toLowerCase().includes(q),
    );
  }, [enrichedCourses, searchQuery]);

  return (
    <div className="p-5 rounded-3xl bg-surface border border-outline-variant/60 shadow-xs space-y-4">
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

      {/* Bảng so sánh khóa học bọc overflow-x-auto chống tràn co giãn */}
      <div className="overflow-x-auto">
        <Table className="min-w-[550px] w-full">
          <Table.Header className="bg-muted/40">
            <Table.Row className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              <Table.Head className="py-2.5 px-3">Khóa học & Đối tác</Table.Head>
              <Table.Head className="py-2.5 px-1.5 text-center whitespace-nowrap w-[80px]">
                Trạng thái
              </Table.Head>
              <Table.Head className="py-2.5 px-1.5 text-right whitespace-nowrap w-[55px]">
                Học viên
              </Table.Head>
              <Table.Head className="py-2.5 px-1.5 whitespace-nowrap w-[80px]">
                Tiến độ TB
              </Table.Head>
              <Table.Head className="py-2.5 px-1.5 whitespace-nowrap w-[110px]">
                Nhiệm vụ
              </Table.Head>
              <Table.Head className="py-2.5 px-2 text-right whitespace-nowrap w-[90px]">
                Đánh giá
              </Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filtered.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                  Không tìm thấy khóa học nào khớp với từ khóa tìm kiếm.
                </Table.Cell>
              </Table.Row>
            ) : (
              filtered.map((item) => {
                const {
                  course,
                  totalStudents,
                  compRate,
                  rating,
                  pendingGrading,
                  overdueGrading,
                  pendingQa,
                } = item;

                return (
                  <Table.Row
                    key={course.id}
                    onClick={() => onSelectCourse(course.id)}
                    className="text-xs hover:bg-muted/30 cursor-pointer transition-colors group border-b border-border/50"
                  >
                    {/* 1. Tên môn học & Đối tác */}
                    <Table.Cell className="py-2.5 px-3 min-w-[140px]">
                      <div className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1 sm:line-clamp-2">
                        {course.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="font-mono font-bold text-primary text-[10px]">
                          {course.slug || course.id.slice(0, 8)}
                        </span>
                        {course.partnerName && (
                          <>
                            <span>•</span>
                            <span className="text-muted-foreground font-medium text-[10px] truncate max-w-[140px]">
                              {course.partnerName}
                            </span>
                          </>
                        )}
                      </div>
                    </Table.Cell>

                    {/* 2. Trạng thái thực tế */}
                    <Table.Cell className="text-center py-2.5 px-1.5 whitespace-nowrap">
                      {renderCourseStatusBadge(course.status)}
                    </Table.Cell>

                    {/* 3. Số học viên thật */}
                    <Table.Cell className="text-right py-2.5 px-1.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-xs sm:text-sm text-foreground">
                        {totalStudents}{" "}
                        <span className="text-[10px] font-sans font-medium text-muted-foreground">
                          SV
                        </span>
                      </span>
                    </Table.Cell>

                    {/* 4. Tiến độ TB kết hợp thanh mini trực quan */}
                    <Table.Cell className="py-2.5 px-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-foreground w-6 shrink-0">
                          {compRate}%
                        </span>
                        <div className="w-8 sm:w-10 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                          <div
                            className="h-full bg-success rounded-full transition-all duration-300"
                            style={{ width: `${compRate}%` }}
                          />
                        </div>
                      </div>
                    </Table.Cell>

                    {/* 5. Nhiệm vụ cần xử lý có số liệu thật */}
                    <Table.Cell className="py-2.5 px-1.5 whitespace-nowrap">
                      {overdueGrading > 0 || pendingGrading > 0 || pendingQa > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {overdueGrading > 0 && (
                            <Link
                              href={`/instructor/courses/${course.id}/grading`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 px-1.5 py-0.5 rounded-md whitespace-nowrap transition-colors"
                              title="Có bài tập quá hạn 48h quy định cần chấm ngay"
                              aria-label={`Có ${overdueGrading} bài tập quá hạn cần chấm môn ${course.title}`}
                            >
                              <AlertTriangle
                                className="w-3 h-3 text-destructive"
                                aria-hidden="true"
                              />
                              <span>{overdueGrading} quá hạn</span>
                            </Link>
                          )}
                          {pendingGrading > 0 && overdueGrading === 0 && (
                            <Link
                              href={`/instructor/courses/${course.id}/grading`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-warning bg-warning/10 hover:bg-warning/20 border border-warning/20 px-1.5 py-0.5 rounded-md whitespace-nowrap transition-colors"
                              title="Mở Bàn làm việc chấm bài"
                              aria-label={`Có ${pendingGrading} bài chờ chấm môn ${course.title}`}
                            >
                              <ClipboardCheck className="w-3 h-3 text-warning" aria-hidden="true" />
                              <span>{pendingGrading} bài chờ chấm</span>
                            </Link>
                          )}
                          {pendingQa > 0 && (
                            <Link
                              href={`/instructor/courses/${course.id}/discussions`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-1.5 py-0.5 rounded-md whitespace-nowrap transition-colors"
                              title="Mở diễn đàn thảo luận & hỏi đáp"
                              aria-label={`Có ${pendingQa} câu hỏi thảo luận môn ${course.title}`}
                            >
                              <MessageSquare className="w-3 h-3 text-primary" aria-hidden="true" />
                              <span>{pendingQa} hỏi đáp</span>
                            </Link>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 text-success" aria-hidden="true" />
                          <span>Hoàn thành</span>
                        </span>
                      )}
                    </Table.Cell>

                    {/* 6. Đánh giá & Xem chi tiết */}
                    <Table.Cell className="text-right py-2.5 px-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-warning text-xs flex items-center gap-0.5">
                          <span>{rating.toFixed(1)}</span>
                          <span className="text-amber-400">★</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCourse(course.id);
                          }}
                          aria-label={`Xem chi tiết môn ${course.title}`}
                          className="inline-flex items-center gap-0.5 text-xs font-bold text-primary hover:text-primary-hover hover:underline transition-colors cursor-pointer group/btn"
                        >
                          <span>Chi tiết</span>
                          <ArrowRight
                            className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
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
