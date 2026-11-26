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
  Lock,
  ShieldAlert,
} from "lucide-react";
import type { Course } from "@/gen/catalog/v1/catalog_pb";
import type { CalculatedWeek, StudentWithPacing } from "../types";
import type { StudentDetailRecord } from "../../InstructorStudentDetailModal";
import { formatLastActiveLabel, isInactiveOver7Days } from "../../student-dossier/dossier_helpers";

function getTierBadge(tier?: string) {
  if (tier === "AUDIT") {
    return {
      label: "Học thử",
      className: "bg-muted text-muted-foreground border-outline-variant/60",
    };
  }
  return {
    label: "Chính thức",
    className: "bg-success/15 text-success border-success/30",
  };
}

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
  studentTierFilter?: "ALL" | "PAID" | "AUDIT";
  onChangeStudentTierFilter?: (filter: "ALL" | "PAID" | "AUDIT") => void;
  studentSearchQuery: string;
  onChangeStudentSearchQuery: (query: string) => void;
  selectedDayFilter: { day: string; date: string; timestamp?: string } | null;
  selectedWeekFilter: number | null;
  selectedStudentId?: string | null;
  onClearFilters: () => void;
  activeCourse: Course | null;
  calculatedWeeks: CalculatedWeek[];
  totalItemsInActiveCourse: number;
  currentTimeMs: number;
  nudgedSpecificStudentIds?: Set<string>;
  onNudgeStudent?: (student: StudentWithPacing) => void;
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
  studentTierFilter = "ALL",
  onChangeStudentTierFilter,
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
  nudgedSpecificStudentIds: _nudgedSpecificStudentIds,
  onNudgeStudent: _onNudgeStudent,
  onNudgeAllBehind,
  onSelectStudentForDetail,
}: InstructorSpecificStudentTableProps) {
  const isWeekFiltered = selectedWeekFilter != null;
  const isDayFiltered = Boolean(selectedDayFilter);
  const isPacingFiltered = studentPacingFilter !== "ALL";
  const isStatusFiltered = studentStatusFilter !== "ALL";
  const isTierFiltered = studentTierFilter !== "ALL";
  const isSearchFiltered = studentSearchQuery.trim() !== "";
  const isStudentFiltered = Boolean(selectedStudentId);

  const cohortCounts = React.useMemo(() => {
    let paidInProgress = 0;
    let paidCompleted = 0;
    let audit = 0;
    rawStudentsWithPacing.forEach((s) => {
      if (s.enrollmentType === "AUDIT") {
        audit += 1;
      } else if (s.progressPercent >= 100) {
        paidCompleted += 1;
      } else {
        paidInProgress += 1;
      }
    });
    return {
      all: rawStudentsWithPacing.length,
      paidInProgress,
      paidCompleted,
      audit,
    };
  }, [rawStudentsWithPacing]);

  const activeCohort = React.useMemo(() => {
    if (studentTierFilter === "AUDIT") return "AUDIT";
    if (studentTierFilter === "PAID" && studentStatusFilter === "IN_PROGRESS") {
      return "PAID_IN_PROGRESS";
    }
    if (studentTierFilter === "PAID" && studentStatusFilter === "COMPLETED") {
      return "PAID_COMPLETED";
    }
    if (studentTierFilter === "ALL" && studentStatusFilter === "ALL") {
      return "ALL";
    }
    if (studentStatusFilter === "IN_PROGRESS") return "PAID_IN_PROGRESS";
    if (studentStatusFilter === "COMPLETED") return "PAID_COMPLETED";
    return "ALL";
  }, [studentTierFilter, studentStatusFilter]);

  const hasActiveFilter =
    isWeekFiltered ||
    isDayFiltered ||
    isPacingFiltered ||
    isStatusFiltered ||
    isTierFiltered ||
    isSearchFiltered ||
    isStudentFiltered;

  const activeFilterLabel = React.useMemo(() => {
    if (isStudentFiltered) {
      const st = rawStudentsWithPacing.find((s) => s.userId === selectedStudentId);
      return st?.userName || "Học viên";
    }
    if (isSearchFiltered) {
      return `Tìm kiếm "${studentSearchQuery}"`;
    }
    if (activeCohort === "AUDIT") return "Học viên Học thử";
    if (activeCohort === "PAID_IN_PROGRESS") return "Học viên Chính thức — Đang học";
    if (activeCohort === "PAID_COMPLETED") return "Học viên Chính thức — Đã tốt nghiệp";
    if (isTierFiltered) {
      if (studentTierFilter === "PAID") return "Học viên Chính thức";
      if (studentTierFilter === "AUDIT") return "Học viên Học thử";
    }
    if (isPacingFiltered) {
      if (studentPacingFilter === "AHEAD") return "Học viên Vượt tiến độ";
      if (studentPacingFilter === "ON_TRACK") return "Học viên Đúng tiến độ";
      if (studentPacingFilter === "BEHIND") return "Học viên Chậm tiến độ";
    }
    if (isStatusFiltered) {
      if (studentStatusFilter === "IN_PROGRESS") return "Học viên Đang học";
      if (studentStatusFilter === "COMPLETED") return "Học viên Đã tốt nghiệp";
      if (studentStatusFilter === "OVERDUE") return "Học viên Quá hạn";
    }
    if (isDayFiltered && selectedDayFilter) {
      return selectedDayFilter.date && selectedDayFilter.date !== selectedDayFilter.day
        ? `Ngày ${selectedDayFilter.day} (${selectedDayFilter.date})`
        : `Ngày ${selectedDayFilter.day}`;
    }
    if (isWeekFiltered) {
      return `Tuần học thứ ${selectedWeekFilter}`;
    }
    return "";
  }, [
    isStudentFiltered,
    selectedStudentId,
    rawStudentsWithPacing,
    isSearchFiltered,
    studentSearchQuery,
    activeCohort,
    isTierFiltered,
    studentTierFilter,
    isPacingFiltered,
    studentPacingFilter,
    isStatusFiltered,
    studentStatusFilter,
    isDayFiltered,
    selectedDayFilter,
    isWeekFiltered,
    selectedWeekFilter,
  ]);

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
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Vượt tiến độ
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
              <Clock className="w-3 h-3" aria-hidden="true" /> Đúng tiến độ
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
              <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Chậm tiến độ
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
            placeholder="Tìm tên..."
            value={studentSearchQuery}
            onChange={(e) => onChangeStudentSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-xl bg-muted/60 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => {
                onChangeStudentTierFilter?.("ALL");
                onChangeStudentStatusFilter("ALL");
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCohort === "ALL"
                  ? "bg-surface text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tất cả ({cohortCounts.all})
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeStudentTierFilter?.("PAID");
                onChangeStudentStatusFilter("IN_PROGRESS");
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCohort === "PAID_IN_PROGRESS"
                  ? "bg-surface text-primary font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Chính thức — Đang học ({cohortCounts.paidInProgress})
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeStudentTierFilter?.("PAID");
                onChangeStudentStatusFilter("COMPLETED");
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCohort === "PAID_COMPLETED"
                  ? "bg-surface text-success font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Chính thức — Đã tốt nghiệp ({cohortCounts.paidCompleted})
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeStudentTierFilter?.("AUDIT");
                onChangeStudentStatusFilter("ALL");
              }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeCohort === "AUDIT"
                  ? "bg-surface text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Học thử ({cohortCounts.audit})
            </button>
          </div>
        </div>
      </div>

      {/* Tag trạng thái lọc đang hoạt động */}
      {hasActiveFilter && (
        <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-center justify-between transition-opacity duration-150 animate-in fade-in-50">
          <span className="flex items-center gap-1.5 font-semibold">
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            Đang lọc theo: <strong>{activeFilterLabel}</strong>
          </span>
          <div className="flex items-center gap-2">
            {isWeekFiltered && activeCourse?.id && (
              <Link
                href={`/instructor/courses/${activeCourse.id}/announcements`}
                className="px-2 py-0.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold inline-flex items-center gap-1 shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                title="Tạo thông báo hướng dẫn toàn lớp cho tuần này"
              >
                <BookOpen className="w-3 h-3" aria-hidden="true" />
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

      {/* Bảng Danh Sách Học Viên với chiều cao tối thiểu ổn định chống co giật */}
      <div className="rounded-2xl border border-outline-variant/60 overflow-x-auto bg-surface min-h-[360px] max-h-96 overflow-y-auto">
        <Table className="table-fixed min-w-[720px] w-full">
          <Table.Header className="sticky top-0 z-10 bg-surface shadow-xs">
            <Table.Row className="text-[11px] text-muted-foreground border-b border-outline-variant/60">
              <Table.Head className="w-[28%] min-w-[190px]">Học viên &amp; Gói</Table.Head>
              <Table.Head className="w-[20%] min-w-[130px]">Tiến độ khóa học</Table.Head>
              <Table.Head className="w-[22%] min-w-[140px]">Nhịp độ &amp; Điểm TB</Table.Head>
              <Table.Head className="w-[30%] min-w-[200px]">
                Bài học &amp; Lần học gần nhất
              </Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {filteredStudents.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={4} className="text-center py-24 text-xs text-muted-foreground">
                  Không tìm thấy học viên nào phù hợp với bộ lọc hiện tại.
                </Table.Cell>
              </Table.Row>
            ) : (
              filteredStudents.map((st) => {
                const isDone = st.progressPercent >= 100;
                const tierInfo = getTierBadge(st.enrollmentType);
                const lastActiveLabel = formatLastActiveLabel(st.lastAccessedAt, currentTimeMs);
                const isInactive = isInactiveOver7Days(st.lastAccessedAt, currentTimeMs);

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
                  enrolledAt: st.enrolledAt,
                  enrollmentType: st.enrollmentType,
                  totalTimeSpentSeconds: st.totalTimeSpentSeconds,
                  currentWeekNumber: studentWeekNum,
                  currentWeekTitle,
                  currentLessonTitle: st.lastAccessedItemTitle || undefined,
                  quizScore:
                    st.quizAttemptsCount && st.quizAttemptsCount > 0
                      ? Number(st.averageQuizScore.toFixed(1))
                      : undefined,
                  quizAttemptsCount: st.quizAttemptsCount,
                  isInCooldown: st.isInCooldown,
                  cooldownUntil: st.cooldownUntil,
                  peerReviewDutyStatus: st.peerReviewDutyStatus,
                  isPeerReviewOverdue: st.isPeerReviewOverdue,
                  lastActiveTime: lastActiveLabel,
                  isInactive,
                  isCompleted: isDone,
                  completedItemsCount:
                    st.totalCourseItems > 0
                      ? st.completedItemsCount
                      : totalItemsInActiveCourse > 0
                        ? Math.round((st.progressPercent / 100) * totalItemsInActiveCourse)
                        : 0,
                  totalCourseItems:
                    st.totalCourseItems > 0 ? st.totalCourseItems : totalItemsInActiveCourse,
                  dailyActivities: st.dailyActivities,
                  currentStreak: st.currentStreak,
                  longestStreak: st.longestStreak,
                };

                return (
                  <Table.Row
                    key={st.userId}
                    onClick={() => onSelectStudentForDetail(studentDetailRecord)}
                    className="text-xs hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <Table.Cell className="w-[28%] min-w-[180px]">
                      <div className="space-y-0.5 min-w-0">
                        <div
                          className="font-bold text-foreground hover:text-primary transition-colors text-xs leading-tight"
                          title={st.userName}
                        >
                          {st.userName}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold border uppercase tracking-wider ${tierInfo.className}`}
                          >
                            {tierInfo.label}
                          </span>
                        </div>
                      </div>
                    </Table.Cell>

                    <Table.Cell className="w-[20%] min-w-[130px]">
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

                    <Table.Cell className="w-[22%] min-w-[140px]">
                      <div className="space-y-1">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/30">
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Đã tốt nghiệp
                          </span>
                        ) : st.pace === "AHEAD" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/30">
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Vượt tiến độ
                          </span>
                        ) : st.pace === "ON_TRACK" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
                            <Clock className="w-3 h-3" aria-hidden="true" /> Đúng tiến độ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Chậm tiến độ
                          </span>
                        )}

                        {st.quizAttemptsCount && st.quizAttemptsCount > 0 ? (
                          <div className="text-[11px] font-mono text-muted-foreground">
                            Điểm TB:{" "}
                            <strong className="text-primary font-bold">
                              {st.averageQuizScore.toFixed(1)}/10
                            </strong>
                          </div>
                        ) : null}

                        {st.isInCooldown && (
                          <div
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-destructive/10 text-destructive border border-destructive/30"
                            title="Đã làm quá 3 lần làm bài trắc nghiệm, đang trong thời gian chờ mở lại"
                          >
                            <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                            <span>Khóa Quiz tạm thời</span>
                          </div>
                        )}

                        {st.peerReviewDutyStatus === "PENDING" &&
                          (st.isPeerReviewOverdue ? (
                            <div
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-destructive/15 text-destructive border border-destructive/30"
                              title="Đã quá hạn thời gian chấm chéo theo quy định của giảng viên"
                            >
                              <ShieldAlert className="w-2.5 h-2.5" aria-hidden="true" />
                              <span>⚠️ Nợ chấm chéo (Quá hạn)</span>
                            </div>
                          ) : (
                            <div
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-primary/10 text-primary border border-primary/25"
                              title="Đang trong hạn thời gian chấm chéo bài tập cùng lớp"
                            >
                              <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                              <span>🕒 Đang trong hạn chấm</span>
                            </div>
                          ))}
                      </div>
                    </Table.Cell>

                    <Table.Cell className="w-[30%] min-w-[200px]">
                      <div className="space-y-1">
                        <div
                          className="text-xs font-semibold text-foreground line-clamp-2 leading-relaxed"
                          title={st.lastAccessedItemTitle || currentWeekTitle}
                        >
                          {st.lastAccessedItemTitle || currentWeekTitle}
                        </div>

                        <div className="text-[11px] font-mono flex items-center gap-1.5 whitespace-nowrap">
                          <Clock
                            className="w-3 h-3 text-muted-foreground shrink-0"
                            aria-hidden="true"
                          />
                          <span
                            className={
                              isInactive && !isDone
                                ? "text-destructive font-bold"
                                : "text-foreground font-medium"
                            }
                          >
                            {lastActiveLabel}
                          </span>
                        </div>

                        {isInactive && !isDone && (
                          <div className="text-[10px] text-destructive font-semibold">
                            (Vắng mặt &gt; 7 ngày • Cần hỗ trợ)
                          </div>
                        )}
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
