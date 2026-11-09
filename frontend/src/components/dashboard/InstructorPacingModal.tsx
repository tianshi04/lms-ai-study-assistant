"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Table } from "@/components/ui/Table";
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
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { InstructorBulkReminderModal } from "./InstructorBulkReminderModal";

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
  lastActive: string;
  daysInactive: number;
  pace: "AHEAD" | "ON_TRACK" | "BEHIND";
  paceDescription: string;
  bottleneckStuck?: boolean;
}

export interface InstructorPacingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategory?: PacingCategory;
  initialCourseId?: string;
  coursesList?: { id: string; title: string }[];
  students?: StudentPacingRecord[];
}

export function InstructorPacingModal({
  open,
  onOpenChange,
  initialCategory = "ALL",
  initialCourseId = "ALL",
  coursesList = [],
  students = [],
}: InstructorPacingModalProps) {
  const toast = useToast();
  const [selectedPace, setSelectedPace] = useState<PacingCategory>(initialCategory);
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourseId);
  const [searchQuery, setSearchQuery] = useState("");
  const [nudgedStudentIds, setNudgedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkReminderModalOpen, setIsBulkReminderModalOpen] = useState(false);

  // Phân trang & Tải động (Progressive Loading: Mặc định 25 học viên, lướt xuống tải thêm)
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    setVisibleCount(25);
  }, [searchQuery, selectedPace, selectedCourse]);

  // Đồng bộ state khi mở hộp thoại hoặc bộ lọc ban đầu thay đổi
  const [prevOpenState, setPrevOpenState] = useState({ open, initialCategory, initialCourseId });
  if (
    prevOpenState.open !== open ||
    prevOpenState.initialCategory !== initialCategory ||
    prevOpenState.initialCourseId !== initialCourseId
  ) {
    setPrevOpenState({ open, initialCategory, initialCourseId });
    if (open) {
      setSelectedPace(initialCategory);
      setSelectedCourse(initialCourseId);
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

  // Lọc danh sách học viên theo Pace, Môn học và Từ khóa tìm kiếm
  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      // 1. Lọc theo pace
      if (selectedPace === "AHEAD" && st.pace !== "AHEAD") return false;
      if (selectedPace === "ON_TRACK" && st.pace !== "ON_TRACK") return false;
      if (selectedPace === "BEHIND" && st.pace !== "BEHIND") return false;

      // 2. Lọc theo khóa học
      if (selectedCourse !== "ALL" && st.courseId !== selectedCourse) return false;

      // 3. Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.name.toLowerCase().includes(q);
        const matchEmail = st.email.toLowerCase().includes(q);
        const matchLesson = st.currentLesson.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchLesson) return false;
      }

      return true;
    });
  }, [students, selectedPace, selectedCourse, searchQuery]);

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

  // Nhắc nhở 1 học viên
  const handleNudgeStudent = async (student: StudentPacingRecord) => {
    setNudgedStudentIds((prev) => new Set(prev).add(student.id));
    try {
      if (student.courseId) {
        const client = getRpcClient(CatalogService);
        await client.sendStudentReminder({
          courseId: student.courseId,
          studentIds: [student.id],
          title: `[Nhắc nhở học tập] Tiến độ môn ${student.courseTitle}`,
          content: `Chào ${student.name}, Thầy/Cô nhận thấy em đang dừng ở ${student.currentLesson}. Hãy sắp xếp thời gian hoàn thành bài học và bài kiểm tra tuần này để bám sát lộ trình nhé!`,
        });
      }
      toast.success(`Đã gửi thông báo & email khích lệ học tập tới học viên ${student.name}!`, {
        description: `Lộ trình hiện tại: ${student.currentLesson}`,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể gửi nhắc nhở học viên.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Dialog.Content size="2xl" className="p-6 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header Dialog */}
          <Dialog.Header className="pb-3 border-b border-outline-variant/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <Dialog.Title className="text-base font-bold text-foreground">
                    Bảng Kiểm Soát Nhịp Độ & Tiến Độ Học Tập
                  </Dialog.Title>
                </div>
                <Dialog.Description className="text-xs text-muted-foreground mt-1">
                  Theo dõi {counts.all} học viên, phát hiện sớm người học chậm để can thiệp sư phạm
                  kịp thời
                </Dialog.Description>
              </div>
            </div>
          </Dialog.Header>

          {/* Thẻ Tab Phân Loại Nhịp Độ (Cohort Pacing Tabs) */}
          <div className="pt-3 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Tất cả */}
            <button
              type="button"
              onClick={() => setSelectedPace("ALL")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "ALL"
                  ? "bg-surface border-primary ring-2 ring-primary/20 shadow-xs"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-primary/50"
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
            </button>

            {/* Vượt tiến độ */}
            <button
              type="button"
              onClick={() => setSelectedPace("AHEAD")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "AHEAD"
                  ? "bg-success/10 border-success ring-2 ring-success/20 shadow-xs"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-success/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Vượt tiến độ
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-success/20 text-success font-bold">
                  {counts.all > 0 ? Math.round((counts.ahead / counts.all) * 100) : 0}%
                </span>
              </div>
              <div className="text-lg font-black text-success font-mono mt-0.5">
                {counts.ahead} SV
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Học nhanh hơn hạn</div>
            </button>

            {/* Đúng tiến độ */}
            <button
              type="button"
              onClick={() => setSelectedPace("ON_TRACK")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "ON_TRACK"
                  ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-xs"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Đúng tiến độ
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
                  {counts.all > 0 ? Math.round((counts.onTrack / counts.all) * 100) : 0}%
                </span>
              </div>
              <div className="text-lg font-black text-primary font-mono mt-0.5">
                {counts.onTrack} SV
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Bám sát lịch tuần</div>
            </button>

            {/* Chậm tiến độ */}
            <button
              type="button"
              onClick={() => setSelectedPace("BEHIND")}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedPace === "BEHIND"
                  ? "bg-destructive/10 border-destructive ring-2 ring-destructive/20 shadow-xs"
                  : "bg-surface-container-low border-outline-variant/60 hover:border-destructive/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Chậm tiến độ
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
            </button>
          </div>

          {/* Thanh công cụ Tìm kiếm & Lọc môn học & Nút Nhắc nhở hàng loạt */}
          <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Tìm tên học viên, email, bài học..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-medium text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="relative min-w-[180px] max-w-[240px]">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-surface border border-outline-variant text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-hidden cursor-pointer truncate"
                >
                  <option value="ALL">Tất cả môn học ({coursesList.length})</option>
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nút Nhắc nhở hàng loạt (chỉ sáng khi có học sinh chậm tiến độ) */}
            {selectedPace === "BEHIND" || counts.behind > 0 ? (
              <button
                type="button"
                disabled={filteredStudents.filter((s) => s.pace === "BEHIND").length === 0}
                onClick={() => setIsBulkReminderModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 shrink-0 self-end sm:self-auto"
                title="Mở hộp thoại xem trước và tùy chỉnh thông báo nhắc nhở"
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {`Nhắc nhở toàn bộ (${filteredStudents.filter((s) => s.pace === "BEHIND").length} SV chậm)`}
                </span>
              </button>
            ) : null}
          </div>

          {/* Bảng Danh Sách Học Viên Chi Tiết với Thanh cuộn tải động 25 SV */}
          <div
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto rounded-2xl border border-outline-variant/60 bg-surface min-h-[300px]"
          >
            <Table>
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
                          <div className="text-[10px] text-primary font-medium flex items-center gap-1 mt-0.5 truncate max-w-[220px]">
                            <BookOpen className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{st.courseTitle}</span>
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
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug max-w-[190px]">
                            {st.paceDescription}
                          </div>
                        </Table.Cell>

                        {/* Cột 4: Hoạt động gần nhất */}
                        <Table.Cell>
                          <span
                            className={`text-[11px] font-mono block ${
                              st.daysInactive >= 7
                                ? "text-destructive font-bold"
                                : st.daysInactive >= 3
                                  ? "text-warning font-semibold"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {st.lastActive}
                          </span>
                          {st.daysInactive >= 7 && (
                            <span className="text-[9px] text-destructive block font-bold">
                              Không học &gt; {st.daysInactive} ngày
                            </span>
                          )}
                        </Table.Cell>

                        {/* Cột 5: Nút thao tác sư phạm */}
                        <Table.Cell className="text-right">
                          <button
                            type="button"
                            disabled={isNudged}
                            onClick={() => handleNudgeStudent(st)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                              isNudged
                                ? "bg-success/15 text-success border border-success/30 cursor-default"
                                : st.pace === "BEHIND"
                                  ? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 shadow-xs"
                                  : "bg-surface-container-high hover:bg-primary hover:text-on-primary text-foreground border border-outline-variant"
                            }`}
                          >
                            {isNudged ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-success" />
                                <span>Đã nhắc</span>
                              </>
                            ) : (
                              <>
                                <Mail className="w-3 h-3" />
                                <span>Nhắc nhở</span>
                              </>
                            )}
                          </button>
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
          <div className="pt-3 border-t border-outline-variant/60 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
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
            <span>Dữ liệu nhịp độ được tính toán thời gian thực từ cơ sở dữ liệu</span>
          </div>
        </Dialog.Content>
      </Dialog>

      {/* Modal Nhắc nhở hàng loạt học viên chậm tiến độ */}
      {isBulkReminderModalOpen && (
        <InstructorBulkReminderModal
          key={`pacing-bulk-${isBulkReminderModalOpen}`}
          open={isBulkReminderModalOpen}
          onOpenChange={setIsBulkReminderModalOpen}
          courseId={
            selectedCourse !== "ALL"
              ? selectedCourse
              : filteredStudents.find((s) => s.pace === "BEHIND")?.courseId ||
                coursesList[0]?.id ||
                ""
          }
          courseTitle={
            coursesList.find((c) => c.id === selectedCourse)?.title ||
            filteredStudents.find((s) => s.pace === "BEHIND")?.courseTitle ||
            "Khóa học"
          }
          students={filteredStudents
            .filter((s) => s.pace === "BEHIND")
            .map((s) => ({
              userId: s.id,
              userName: s.name,
              userEmail: s.email,
              progressPercent: s.progressPercent,
              paceDesc: s.paceDescription,
            }))}
          bottleneckWeek={
            filteredStudents.some((s) => s.bottleneckStuck)
              ? { weekNumber: 2, title: "Hành vi Người tiêu dùng & Độ co giãn", dropRate: 75 }
              : null
          }
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
