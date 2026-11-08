"use client";

import React from "react";
import Link from "next/link";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import {
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  BookOpen,
  X,
  Mail,
} from "lucide-react";
import type { Course } from "@/gen/catalog/v1/catalog_pb";
import type { CalculatedWeek, StudentWithPacing } from "../types";
import type { StudentDetailRecord } from "../../InstructorStudentDetailModal";

export interface InstructorSpecificStudentTableProps {
  filteredStudents: StudentWithPacing[];
  rawStudentsWithPacing: StudentWithPacing[];
  coursePacingCounts: {
    all: number;
    ahead: number;
    onTrack: number;
    behind: number;
  };
  studentPacingFilter: "ALL" | "AHEAD" | "ON_TRACK" | "BEHIND";
  onChangeStudentPacingFilter: (filter: "ALL" | "AHEAD" | "ON_TRACK" | "BEHIND") => void;
  studentStatusFilter: "ALL" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  onChangeStudentStatusFilter: (filter: "ALL" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE") => void;
  studentSearchQuery: string;
  onChangeStudentSearchQuery: (query: string) => void;
  selectedDayFilter: { day: string; date: string } | null;
  selectedWeekFilter: number | null;
  selectedStudentId: string | null;
  onClearFilters: () => void;
  activeCourse: Course | null;
  calculatedWeeks: CalculatedWeek[];
  totalItemsInActiveCourse: number;
  currentTimeMs: number;
  nudgedSpecificStudentIds: Set<string>;
  onNudgeStudent: (student: StudentWithPacing) => void;
  onNudgeAllBehind: () => void;
  onSelectStudentForDetail: (record: StudentDetailRecord) => void;
}

export function InstructorSpecificStudentTable({
  filteredStudents,
  rawStudentsWithPacing,
  coursePacingCounts,
  studentPacingFilter,
  onChangeStudentPacingFilter,
  studentStatusFilter,
  onChangeStudentStatusFilter,
  studentSearchQuery,
  onChangeStudentSearchQuery,
  selectedDayFilter,
  selectedWeekFilter,
  selectedStudentId,
  onClearFilters,
  activeCourse,
  calculatedWeeks,
  totalItemsInActiveCourse,
  currentTimeMs,
  nudgedSpecificStudentIds,
  onNudgeStudent,
  onNudgeAllBehind,
  onSelectStudentForDetail,
}: InstructorSpecificStudentTableProps) {
  return (
    <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4">
      {/* Header Danh Sách Học Viên */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">
              Danh Sách Học Viên &amp; Nhịp Độ Học Tập
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-muted text-muted-foreground">
              {filteredStudents.length}/{rawStudentsWithPacing.length} SV
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Theo dõi tiến độ từng học viên, can thiệp hỗ trợ kịp thời cho các sinh viên học chậm
          </p>
        </div>

        {coursePacingCounts.behind > 0 && (
          <button
            type="button"
            onClick={onNudgeAllBehind}
            className="px-3 py-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Nhắc nhở {coursePacingCounts.behind} SV chậm</span>
          </button>
        )}
      </div>

      {/* 3 Thẻ Phân Loại Nhịp Độ Học Tập (Interactive Cohort Ribbon) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() =>
            onChangeStudentPacingFilter(studentPacingFilter === "AHEAD" ? "ALL" : "AHEAD")
          }
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            studentPacingFilter === "AHEAD"
              ? "bg-success/15 border-success ring-2 ring-success/30 shadow-xs"
              : "bg-surface border-outline-variant/60 hover:border-success/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Vượt tiến độ
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-success/20 text-success font-bold">
              {coursePacingCounts.ahead} SV
            </span>
          </div>
          <div className="text-sm font-black text-foreground font-mono mt-1">
            {coursePacingCounts.all > 0
              ? `${Math.round((coursePacingCounts.ahead / coursePacingCounts.all) * 100)}%`
              : "0%"}{" "}
            <span className="text-[11px] font-normal text-muted-foreground font-sans">
              hoàn thành bài nhanh
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            onChangeStudentPacingFilter(studentPacingFilter === "ON_TRACK" ? "ALL" : "ON_TRACK")
          }
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            studentPacingFilter === "ON_TRACK"
              ? "bg-primary/15 border-primary ring-2 ring-primary/30 shadow-xs"
              : "bg-surface border-outline-variant/60 hover:border-primary/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Đúng tiến độ
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
              {coursePacingCounts.onTrack} SV
            </span>
          </div>
          <div className="text-sm font-black text-foreground font-mono mt-1">
            {coursePacingCounts.all > 0
              ? `${Math.round((coursePacingCounts.onTrack / coursePacingCounts.all) * 100)}%`
              : "0%"}{" "}
            <span className="text-[11px] font-normal text-muted-foreground font-sans">
              bám sát tuần học
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            onChangeStudentPacingFilter(studentPacingFilter === "BEHIND" ? "ALL" : "BEHIND")
          }
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            studentPacingFilter === "BEHIND"
              ? "bg-destructive/15 border-destructive ring-2 ring-destructive/30 shadow-xs"
              : "bg-surface border-outline-variant/60 hover:border-destructive/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Chậm tiến độ
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-destructive/20 text-destructive font-bold">
              {coursePacingCounts.behind} SV
            </span>
          </div>
          <div className="text-sm font-black text-destructive font-mono mt-1">
            {coursePacingCounts.all > 0
              ? `${Math.round((coursePacingCounts.behind / coursePacingCounts.all) * 100)}%`
              : "0%"}{" "}
            <span className="text-[11px] font-normal text-muted-foreground font-sans">
              cần nhắc nhở gấp
            </span>
          </div>
        </button>
      </div>

      {/* Thanh tìm kiếm & Lọc trạng thái */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Tìm tên, email, MSSV…"
            value={studentSearchQuery}
            onChange={(e) => onChangeStudentSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface"
          />
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/60 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => onChangeStudentStatusFilter("ALL")}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              studentStatusFilter === "ALL"
                ? "bg-surface text-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => onChangeStudentStatusFilter("IN_PROGRESS")}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              studentStatusFilter === "IN_PROGRESS"
                ? "bg-surface text-primary font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Đang học
          </button>
          <button
            type="button"
            onClick={() => onChangeStudentStatusFilter("COMPLETED")}
            className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
              studentStatusFilter === "COMPLETED"
                ? "bg-surface text-success font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Đã xong
          </button>
        </div>
      </div>

      {/* Tag trạng thái lọc đang hoạt động */}
      {(selectedDayFilter ||
        selectedWeekFilter !== null ||
        studentPacingFilter !== "ALL" ||
        selectedStudentId !== null ||
        studentSearchQuery.trim() !== "") && (
        <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold">
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            Đang lọc theo:{" "}
            <strong>
              {selectedStudentId
                ? `👤 ${rawStudentsWithPacing.find((s) => s.userId === selectedStudentId)?.userName}`
                : studentSearchQuery.trim()
                  ? `Tìm kiếm "${studentSearchQuery}"`
                  : studentPacingFilter === "AHEAD"
                    ? "🚀 Học viên Vượt tiến độ"
                    : studentPacingFilter === "ON_TRACK"
                      ? "⏱️ Học viên Đúng tiến độ"
                      : studentPacingFilter === "BEHIND"
                        ? "⚠️ Học viên Chậm tiến độ"
                        : selectedDayFilter
                          ? `Ngày ${selectedDayFilter.day} (${selectedDayFilter.date})`
                          : `Tuần học thứ ${selectedWeekFilter}`}
            </strong>
          </span>
          <div className="flex items-center gap-2">
            {selectedWeekFilter !== null && activeCourse?.id && (
              <Link
                href={`/instructor/courses/${activeCourse.id}/announcements`}
                className="px-2 py-0.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold inline-flex items-center gap-1 shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                title="Tạo thông báo hướng dẫn toàn lớp cho tuần này"
              >
                <BookOpen className="w-3 h-3" />
                <span>Đăng thông báo Tuần {selectedWeekFilter}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs underline hover:opacity-80 flex items-center gap-1 cursor-pointer font-bold"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              Hủy lọc
            </button>
          </div>
        </div>
      )}

      {/* Bảng Danh Sách Học Viên */}
      <div className="rounded-2xl border border-outline-variant/60 overflow-hidden bg-surface max-h-80 overflow-y-auto">
        <Table>
          <Table.Header className="sticky top-0 z-10 bg-surface shadow-xs">
            <Table.Row className="text-[11px] text-muted-foreground border-b border-outline-variant/60">
              <Table.Head>Học viên</Table.Head>
              <Table.Head>Tiến độ khóa học</Table.Head>
              <Table.Head>Phân loại nhịp độ</Table.Head>
              <Table.Head>Lộ trình &amp; Hạn chuẩn</Table.Head>
              <Table.Head className="text-right">Kiểm soát sư phạm</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filteredStudents.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5} className="text-center py-10 text-xs text-muted-foreground">
                  Không tìm thấy học viên nào phù hợp với bộ lọc hiện tại.
                </Table.Cell>
              </Table.Row>
            ) : (
              filteredStudents.map((st) => {
                const isDone = st.progressPercent >= 100;
                const enrolledDate = st.enrolledAt
                  ? new Date(st.enrolledAt)
                  : currentTimeMs > 0
                    ? new Date(currentTimeMs)
                    : new Date("2026-11-01");
                const deadlineDate = new Date(enrolledDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                const daysLeft =
                  currentTimeMs > 0
                    ? Math.ceil((deadlineDate.getTime() - currentTimeMs) / (1000 * 60 * 60 * 24))
                    : 30;
                const isNearDeadline = !isDone && daysLeft <= 3;
                const isNudged = nudgedSpecificStudentIds.has(st.userId);

                const studentWeekNum =
                  st.progressPercent >= 100
                    ? calculatedWeeks.length || 1
                    : Math.min(
                        calculatedWeeks.length || 1,
                        Math.floor((st.progressPercent / 100) * (calculatedWeeks.length || 1)) + 1,
                      );
                const currentWeekTitle =
                  calculatedWeeks.find((w) => w.weekNumber === studentWeekNum)?.title ||
                  `Tuần ${studentWeekNum}`;

                const studentDetailRecord: StudentDetailRecord = {
                  userId: st.userId,
                  userName: st.userName,
                  userEmail: st.userEmail,
                  progressPercent: st.progressPercent,
                  pace: st.pace,
                  currentWeekNumber: studentWeekNum,
                  currentWeekTitle,
                  currentLessonTitle:
                    st.pace === "BEHIND"
                      ? "Chưa hoàn thành video và bài quiz tuần"
                      : "Đang xem video bài giảng",
                  quizScore: 8.5,
                  lastActiveTime: st.pace === "BEHIND" ? "4 ngày trước" : "Hôm nay",
                  isCompleted: isDone,
                };

                return (
                  <Table.Row
                    key={st.userId}
                    onClick={() => onSelectStudentForDetail(studentDetailRecord)}
                    className="text-xs hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <Table.Cell>
                      <div className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                        <span>{st.userName}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {st.userEmail}
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      <div className="space-y-1 max-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-foreground">{st.progressPercent}%</span>
                          <span className="text-muted-foreground">
                            {totalItemsInActiveCourse > 0
                              ? `${Math.round((st.progressPercent / 100) * totalItemsInActiveCourse)}/${totalItemsInActiveCourse} bài`
                              : `${st.progressPercent}%`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted">
                          {st.progressPercent > 0 && (
                            <div
                              style={{ width: `${Math.min(100, st.progressPercent)}%` }}
                              className={`h-full rounded-full min-w-0 ${
                                isDone
                                  ? "bg-success"
                                  : st.pace === "AHEAD"
                                    ? "bg-success"
                                    : st.pace === "ON_TRACK"
                                      ? "bg-primary"
                                      : "bg-destructive"
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      {st.pace === "AHEAD" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/30">
                          <CheckCircle2 className="w-3 h-3" /> Vượt tiến độ
                        </span>
                      ) : st.pace === "ON_TRACK" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
                          <Clock className="w-3 h-3" /> Đúng tiến độ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                          <AlertTriangle className="w-3 h-3" /> Chậm tiến độ
                        </span>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        {st.paceDesc}
                      </div>
                    </Table.Cell>

                    <Table.Cell>
                      {isDone ? (
                        <span className="text-[11px] font-mono text-success font-semibold">
                          Đã hoàn thành khóa
                        </span>
                      ) : (
                        <div>
                          <div
                            className={`text-[11px] font-mono ${
                              daysLeft <= 0
                                ? "text-destructive font-semibold"
                                : isNearDeadline
                                  ? "text-warning font-semibold"
                                  : "text-foreground"
                            }`}
                          >
                            {daysLeft > 0
                              ? `${deadlineDate.toLocaleDateString("vi-VN")} (Còn ${daysLeft} ngày)`
                              : `Quá hạn chuẩn (${Math.abs(daysLeft)} ngày)`}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Lộ trình chuẩn theo ngày mua
                          </div>
                        </div>
                      )}
                    </Table.Cell>

                    <Table.Cell className="text-right">
                      {isDone ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                          Đã cấp chứng chỉ
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNudgeStudent(st);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                            isNudged
                              ? "bg-muted text-muted-foreground opacity-60 cursor-default"
                              : st.pace === "BEHIND"
                                ? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/30"
                                : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30"
                          }`}
                          title="Gửi thông báo nhắc nhở học tập"
                        >
                          {isNudged ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-success" />
                              <span>Đã gửi</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-3 h-3" />
                              <span>Nhắc nhở</span>
                            </>
                          )}
                        </button>
                      )}
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
