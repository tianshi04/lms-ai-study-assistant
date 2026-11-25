"use client";

import React, { useState, useMemo } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Search,
  Zap,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Mail,
  X,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import {
  InstructorBulkReminderModal,
  type BulkReminderStudent,
} from "./InstructorBulkReminderModal";
import {
  InstructorStudentDetailModal,
  type StudentDetailRecord,
} from "./InstructorStudentDetailModal";

import type { StudentDailyActivity } from "@/gen/catalog/v1/catalog_pb";

export type PacingCategory = "ALL" | "AHEAD" | "ON_TRACK" | "BEHIND";

export interface StudentPacingRecord {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  courseId: string;
  courseTitle: string;
  progressPercent: number;
  currentLesson: string;
  currentWeekNumber: number;
  currentWeekTitle?: string;
  lastActive: string;
  daysInactive: number;
  isInactive?: boolean;
  pace: "AHEAD" | "ON_TRACK" | "BEHIND";
  paceDescription: string;
  bottleneckStuck?: boolean;
  enrolledAt?: string;
  enrollmentType?: string;
  totalTimeSpentSeconds?: number;
  quizScore?: number;
  quizAttemptsCount?: number;
  isInCooldown?: boolean;
  cooldownUntil?: string;
  peerReviewDutyStatus?: string;
  isPeerReviewOverdue?: boolean;
  completedItemsCount?: number;
  totalCourseItems?: number;
  courseEstimatedMinutes?: number;
  dailyActivities?: StudentDailyActivity[];
  currentStreak?: number;
  longestStreak?: number;
}

export interface InstructorPacingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: PacingCategory;
  students?: StudentPacingRecord[];
  bottleneckWeek?: {
    weekNumber: number;
    title: string;
    dropRate: number;
  } | null;
}

export function InstructorPacingModal({
  open,
  onOpenChange,
  initialCategory = "ALL",
  students = [],
  bottleneckWeek = null,
}: InstructorPacingModalProps) {
  const [selectedPace, setSelectedPace] = useState<PacingCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [nudgedStudentIds, setNudgedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkReminderModalOpen, setIsBulkReminderModalOpen] = useState(false);
  const [reminderTargetStudents, setReminderTargetStudents] = useState<
    BulkReminderStudent[] | null
  >(null);
  const [selectedStudentForDetail, setSelectedStudentForDetail] =
    useState<StudentDetailRecord | null>(null);

  // Phân trang & Tải động (Progressive Loading: Mặc định 25 học viên, lướt xuống tải thêm)
  const [visibleCount, setVisibleCount] = useState(25);

  // Đồng bộ state khi mở hộp thoại hoặc bộ lọc thay đổi
  const [prevSyncState, setPrevSyncState] = useState({
    open,
    initialCategory,
    searchQuery,
    selectedPace,
  });
  if (
    prevSyncState.open !== open ||
    prevSyncState.initialCategory !== initialCategory ||
    prevSyncState.searchQuery !== searchQuery ||
    prevSyncState.selectedPace !== selectedPace
  ) {
    const filterChanged =
      prevSyncState.searchQuery !== searchQuery || prevSyncState.selectedPace !== selectedPace;
    const openChanged =
      prevSyncState.open !== open || prevSyncState.initialCategory !== initialCategory;
    setPrevSyncState({ open, initialCategory, searchQuery, selectedPace });
    if (openChanged && open) {
      setSelectedPace(initialCategory);
    }
    if (filterChanged) {
      setVisibleCount(25);
    }
  }

  // Bộ đếm phân loại trên toàn hệ thống dựa trên dữ liệu thật
  const counts = useMemo(() => {
    return {
      all: students.length,
      ahead: students.filter((s) => s.pace === "AHEAD").length,
      onTrack: students.filter((s) => s.pace === "ON_TRACK").length,
      behind: students.filter((s) => s.pace === "BEHIND").length,
    };
  }, [students]);

  // Lọc danh sách học viên theo Pace và Từ khóa tìm kiếm
  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      // 1. Lọc theo pace
      if (selectedPace === "AHEAD" && st.pace !== "AHEAD") return false;
      if (selectedPace === "ON_TRACK" && st.pace !== "ON_TRACK") return false;
      if (selectedPace === "BEHIND" && st.pace !== "BEHIND") return false;

      // 2. Lọc theo từ khóa tìm kiếm (tên, email, bài học, môn học)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.name.toLowerCase().includes(q);
        const matchEmail = st.email.toLowerCase().includes(q);
        const matchLesson = st.currentLesson.toLowerCase().includes(q);
        const matchCourse = st.courseTitle.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchLesson && !matchCourse) return false;
      }

      return true;
    });
  }, [students, selectedPace, searchQuery]);

  // Giới hạn số học viên hiển thị theo phân trang 25 mục
  const pagedStudents = useMemo(() => {
    return filteredStudents.slice(0, visibleCount);
  }, [filteredStudents, visibleCount]);

  const hasMore = visibleCount < filteredStudents.length;

  // Lướt xuống gần đáy tự động tải thêm 25 học viên tiếp theo
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 80) {
      if (hasMore) {
        setVisibleCount((prev) => Math.min(prev + 25, filteredStudents.length));
      }
    }
  };

  // Tương tác sư phạm: Mở trực tiếp Modal Chi Tiết Học Viên (đã tích hợp kênh thông báo & văn bản soạn sẵn)
  const handleNudgeStudent = (student: StudentPacingRecord) => {
    setSelectedStudentForDetail({
      userId: student.id,
      userName: student.name,
      userEmail: student.email,
      progressPercent: student.progressPercent,
      pace: student.pace,
      enrolledAt: student.enrolledAt,
      enrollmentType: student.enrollmentType,
      totalTimeSpentSeconds: student.totalTimeSpentSeconds,
      currentWeekNumber: student.currentWeekNumber,
      currentWeekTitle: student.currentWeekTitle,
      currentLessonTitle: student.currentLesson,
      quizScore: student.quizScore,
      quizAttemptsCount: student.quizAttemptsCount,
      isInCooldown: student.isInCooldown,
      cooldownUntil: student.cooldownUntil,
      peerReviewDutyStatus: student.peerReviewDutyStatus,
      isPeerReviewOverdue: student.isPeerReviewOverdue,
      lastActiveTime: student.lastActive,
      isInactive: student.isInactive,
      isCompleted: student.progressPercent >= 100,
      completedItemsCount: student.completedItemsCount,
      totalCourseItems: student.totalCourseItems,
      courseEstimatedMinutes: student.courseEstimatedMinutes,
      dailyActivities: student.dailyActivities,
      currentStreak: student.currentStreak,
      longestStreak: student.longestStreak,
      courseId: student.courseId,
      courseTitle: student.courseTitle,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Dialog.Content size="2xl" className="p-6 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header Dialog */}
          <Dialog.Header className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <Dialog.Title className="text-base font-bold text-foreground">
                    Bảng Nhịp Độ & Tiến Độ Học Tập
                  </Dialog.Title>
                </div>
              </div>
            </div>
          </Dialog.Header>

          {/* Thẻ Tab Phân Loại Nhịp Độ (Cohort Pacing Tabs) */}
          <div className="pt-3 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Tất cả */}
            <Button
              type="button"
              variant="outlined"
              shape="square"
              onClick={() => setSelectedPace("ALL")}
              className={`h-auto block p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "ALL"
                  ? "bg-surface border-primary ring-2 ring-primary/20 shadow-xs"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-primary/50 hover:bg-surface-container-low"
              }`}
            >
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Tất cả học viên
              </div>
              <div className="text-lg font-black text-foreground font-mono mt-0.5">
                {counts.all} SV
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Toàn bộ các khóa phụ trách
              </div>
            </Button>

            {/* Vượt tiến độ */}
            <Button
              type="button"
              variant="outlined"
              shape="square"
              onClick={() => setSelectedPace("AHEAD")}
              className={`h-auto block p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "AHEAD"
                  ? "bg-success/10 border-success ring-2 ring-success/20 shadow-xs hover:bg-success/10"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-success/50 hover:bg-surface-container-low"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Vượt tiến độ
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-success/20 text-success font-bold">
                  {counts.all > 0 ? Math.round((counts.ahead / counts.all) * 100) : 0}%
                </span>
              </div>
              <div className="text-lg font-black text-success font-mono mt-0.5">
                {counts.ahead} SV
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Học nhanh hơn hạn</div>
            </Button>

            {/* Đúng tiến độ */}
            <Button
              type="button"
              variant="outlined"
              shape="square"
              onClick={() => setSelectedPace("ON_TRACK")}
              className={`h-auto block p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "ON_TRACK"
                  ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-xs hover:bg-primary/10"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-primary/50 hover:bg-surface-container-low"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" /> Đúng tiến độ
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
                  {counts.all > 0 ? Math.round((counts.onTrack / counts.all) * 100) : 0}%
                </span>
              </div>
              <div className="text-lg font-black text-primary font-mono mt-0.5">
                {counts.onTrack} SV
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Bám sát lịch tuần</div>
            </Button>

            {/* Chậm tiến độ */}
            <Button
              type="button"
              variant="outlined"
              shape="square"
              onClick={() => setSelectedPace("BEHIND")}
              className={`h-auto block p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "BEHIND"
                  ? "bg-destructive/10 border-destructive ring-2 ring-destructive/20 shadow-xs hover:bg-destructive/10"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-destructive/50 hover:bg-surface-container-low"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Chậm tiến độ
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-destructive/20 text-destructive font-bold">
                  {counts.all > 0 ? Math.round((counts.behind / counts.all) * 100) : 0}%
                </span>
              </div>
              <div className="text-lg font-black text-destructive font-mono mt-0.5">
                {counts.behind} SV
              </div>
              <div className="text-[10px] text-destructive/80 font-bold mt-0.5">
                Cần can thiệp gấp
              </div>
            </Button>
          </div>

          {/* Thanh công cụ Tìm kiếm & Nút Nhắc nhở hàng loạt */}
          <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Tìm tên học viên, email, bài học hoặc môn học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startAdornment={
                  <Search className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                }
                endAdornment={
                  searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Xóa từ khóa tìm kiếm"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  ) : null
                }
                className="h-8.5 text-xs rounded-xl bg-surface border-outline-variant"
              />
            </div>

            {/* Nút Nhắc nhở hàng loạt (chỉ sáng khi có học sinh chậm tiến độ) */}
            {selectedPace === "BEHIND" || counts.behind > 0 ? (
              <Button
                type="button"
                size="xs"
                shape="square"
                disabled={filteredStudents.filter((s) => s.pace === "BEHIND").length === 0}
                onClick={() => {
                  const behindStudents = filteredStudents
                    .filter((s) => s.pace === "BEHIND")
                    .map((s) => ({
                      userId: s.id,
                      userName: s.name,
                      userEmail: s.email,
                      progressPercent: s.progressPercent,
                      pace: s.pace,
                      paceDesc: s.paceDescription,
                      courseId: s.courseId,
                      courseTitle: s.courseTitle,
                    }));
                  setReminderTargetStudents(behindStudents);
                  setIsBulkReminderModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 shrink-0 self-end sm:self-auto"
                title="Mở hộp thoại xem trước và tùy chỉnh thông báo nhắc nhở"
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {`Nhắc nhở toàn bộ (${filteredStudents.filter((s) => s.pace === "BEHIND").length} SV chậm)`}
                </span>
              </Button>
            ) : null}
          </div>

          {/* Bảng Danh Sách Học Viên Chi Tiết với Thanh cuộn tải động 25 SV */}
          <div
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-auto rounded-2xl border border-outline-variant/60 bg-surface min-h-[300px]"
          >
            <Table className="min-w-[650px] w-full">
              <Table.Header className="sticky top-0 z-10 bg-surface shadow-xs">
                <Table.Row className="text-[11px] text-muted-foreground border-b border-outline-variant/60">
                  <Table.Head>Học viên & Môn học</Table.Head>
                  <Table.Head>Tiến độ & Bài học</Table.Head>
                  <Table.Head>Phân loại nhịp độ</Table.Head>
                  <Table.Head>Hoạt động gần nhất</Table.Head>
                  <Table.Head className="text-right">Kiểm soát sư phạm</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredStudents.length === 0 ? (
                  <Table.Row>
                    <Table.Cell
                      colSpan={5}
                      className="text-center py-12 text-xs text-muted-foreground"
                    >
                      Không tìm thấy học viên nào phù hợp với bộ lọc hiện tại.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  pagedStudents.map((st) => {
                    const isNudged = nudgedStudentIds.has(st.id);

                    return (
                      <Table.Row
                        key={`${st.courseId}-${st.id}`}
                        className="text-xs hover:bg-muted/30"
                      >
                        {/* Cột 1: Thông tin học viên */}
                        <Table.Cell>
                          <div className="font-bold text-foreground">{st.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {st.email}
                          </div>
                          <div className="text-[10px] text-primary font-medium flex items-center gap-1 mt-0.5">
                            <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                            <span>{st.courseTitle}</span>
                          </div>
                        </Table.Cell>

                        {/* Cột 2: Tiến độ & Bài học hiện tại */}
                        <Table.Cell>
                          <div className="space-y-1 max-w-[170px]">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="font-bold text-foreground">
                                {st.progressPercent}%
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Tuần {st.currentWeekNumber}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted">
                              <div
                                style={{ width: `${st.progressPercent}%` }}
                                className={`h-full rounded-full ${
                                  st.pace === "AHEAD"
                                    ? "bg-success"
                                    : st.pace === "ON_TRACK"
                                      ? "bg-primary"
                                      : "bg-destructive"
                                }`}
                              />
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                              {st.currentLesson}
                            </div>
                          </div>
                        </Table.Cell>

                        {/* Cột 3: Phân loại nhịp độ */}
                        <Table.Cell>
                          {st.pace === "AHEAD" ? (
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
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug max-w-[190px]">
                            {st.paceDescription}
                          </div>
                        </Table.Cell>

                        {/* Cột 4: Hoạt động gần nhất */}
                        <Table.Cell>
                          {st.progressPercent >= 100 ? (
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-mono text-success font-semibold flex items-center gap-1">
                                <CheckCircle2
                                  className="w-3 h-3 text-success shrink-0"
                                  aria-hidden="true"
                                />
                                Đã tốt nghiệp
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                Hoàn tất chương trình
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span
                                className={`text-[11px] font-mono block ${
                                  st.pace === "BEHIND" && st.daysInactive >= 7
                                    ? "text-destructive font-bold"
                                    : st.daysInactive >= 3
                                      ? "text-warning font-semibold"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {st.lastActive}
                              </span>
                              {st.pace === "BEHIND" && st.daysInactive >= 7 ? (
                                <span className="text-[9px] text-destructive block font-bold">
                                  Không học &gt; {st.daysInactive} ngày
                                </span>
                              ) : st.pace === "AHEAD" && st.daysInactive >= 7 ? (
                                <span className="text-[9px] text-muted-foreground block font-medium">
                                  Tạm nghỉ {st.daysInactive} ngày
                                </span>
                              ) : null}
                            </div>
                          )}
                        </Table.Cell>

                        {/* Cột 5: Nút thao tác sư phạm */}
                        <Table.Cell className="text-right">
                          {st.progressPercent >= 100 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-success/15 text-success border border-success/30">
                              <GraduationCap
                                className="w-3.5 h-3.5 text-success"
                                aria-hidden="true"
                              />
                              <span>Đã tốt nghiệp</span>
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="xs"
                              shape="square"
                              variant="outlined"
                              disabled={isNudged}
                              onClick={() => handleNudgeStudent(st)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                                isNudged
                                  ? "bg-success/15 text-success border border-success/30 cursor-default"
                                  : st.pace === "BEHIND"
                                    ? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 shadow-xs"
                                    : st.pace === "AHEAD"
                                      ? "bg-warning/10 text-warning hover:bg-warning/20 border border-warning/30 shadow-xs"
                                      : "bg-surface-container-high hover:bg-primary hover:text-on-primary text-foreground border border-outline-variant"
                              }`}
                            >
                              {isNudged ? (
                                <>
                                  <CheckCircle2
                                    className="w-3 h-3 text-success"
                                    aria-hidden="true"
                                  />
                                  <span>{st.pace === "AHEAD" ? "Đã khích lệ" : "Đã nhắc"}</span>
                                </>
                              ) : st.pace === "AHEAD" ? (
                                <>
                                  <Sparkles className="w-3 h-3 text-warning" aria-hidden="true" />
                                  <span>Khích lệ</span>
                                </>
                              ) : (
                                <>
                                  <Mail className="w-3 h-3" aria-hidden="true" />
                                  <span>Nhắc nhở</span>
                                </>
                              )}
                            </Button>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                )}
              </Table.Body>
            </Table>

            {/* Thanh trạng thái tải trang & Nút tải thêm 25 */}
            {filteredStudents.length > 0 && (
              <div className="p-3 border-t border-outline-variant/60 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground px-4">
                <span>
                  Đang hiển thị <strong className="text-foreground">{pagedStudents.length}</strong>{" "}
                  trên tổng số{" "}
                  <strong className="text-foreground">{filteredStudents.length}</strong> học viên
                </span>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((prev) => Math.min(prev + 25, filteredStudents.length))
                    }
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                  >
                    Tải thêm 25 học viên
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer thông số tóm tắt */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" /> Vượt: {counts.ahead}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" /> Đúng hạn: {counts.onTrack}
              </span>
              <span className="flex items-center gap-1.5 font-bold text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive" /> Cần can thiệp:{" "}
                {counts.behind}
              </span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog>

      {/* Modal Chi Tiết Học Viên (Tích hợp kênh thông báo & văn bản soạn sẵn) */}
      {selectedStudentForDetail && (
        <InstructorStudentDetailModal
          open={Boolean(selectedStudentForDetail)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSelectedStudentForDetail(null);
          }}
          student={selectedStudentForDetail}
          courseId={selectedStudentForDetail.courseId || ""}
          courseTitle={selectedStudentForDetail.courseTitle || "Khóa học"}
          isNudged={nudgedStudentIds.has(selectedStudentForDetail.userId)}
          onSendReminder={(studentId) => {
            setNudgedStudentIds((prev) => new Set(prev).add(studentId));
          }}
        />
      )}

      {/* Modal Nhắc nhở học viên Hàng loạt */}
      {isBulkReminderModalOpen && reminderTargetStudents && reminderTargetStudents.length > 1 && (
        <InstructorBulkReminderModal
          key={`pacing-reminder-${isBulkReminderModalOpen}-${reminderTargetStudents.map((s) => s.userId).join("-")}`}
          open={isBulkReminderModalOpen}
          onOpenChange={(isOpen) => {
            setIsBulkReminderModalOpen(isOpen);
            if (!isOpen) {
              setReminderTargetStudents(null);
            }
          }}
          courseId=""
          courseTitle="các khóa học phụ trách"
          students={reminderTargetStudents}
          bottleneckWeek={bottleneckWeek ?? null}
          onSuccess={(studentIds) => {
            setNudgedStudentIds((prev) => {
              const next = new Set(prev);
              studentIds.forEach((id) => next.add(id));
              return next;
            });
          }}
        />
      )}
    </>
  );
}
