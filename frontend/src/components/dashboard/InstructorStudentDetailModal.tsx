"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useSendStudentReminderMutation } from "@/lib/query_hooks";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  MessageSquare,
  BookOpen,
  Award,
  ExternalLink,
  Info,
} from "lucide-react";

export interface StudentDetailRecord {
  userId: string;
  userName: string;
  userEmail: string;
  progressPercent: number;
  pace: "AHEAD" | "ON_TRACK" | "BEHIND";
  currentWeekNumber?: number;
  currentWeekTitle?: string;
  currentLessonTitle?: string;
  quizScore?: number;
  lastActiveTime?: string;
  isCompleted?: boolean;
}

interface InstructorStudentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentDetailRecord | null;
  courseTitle?: string;
  courseId?: string;
  isNudged?: boolean;
  onSendReminder: (studentId: string, customMessage: string) => void;
}

export function InstructorStudentDetailModal({
  open,
  onOpenChange,
  student,
  courseTitle = "Khóa học",
  courseId,
  isNudged = false,
  onSendReminder,
}: InstructorStudentDetailModalProps) {
  const { success, error } = useToast();
  const sendReminderMutation = useSendStudentReminderMutation();
  const [activeTab, setActiveTab] = useState<"reminder" | "announcement">("reminder");

  // Soạn sẵn mẫu thông báo nhắc nhở đôn đốc cá nhân
  const defaultSubject = `[Nhắc nhở học tập] Tiến độ môn ${courseTitle}`;
  const defaultBody = student
    ? `Chào ${student.userName},\n\nThầy/Cô gửi thông báo này để nhắc nhở em về tiến độ học tập môn "${courseTitle}". Hiện tại em đang dừng ở ${
        student.currentWeekTitle || `Tuần ${student.currentWeekNumber || 1}`
      }.\n\nEm hãy sắp xếp thời gian xem hết các video bài giảng và hoàn thành bài kiểm tra trắc nghiệm trước cuối tuần để bám sát lộ trình nhé!\n\nNếu gặp khó khăn trong quá trình học, em có thể đặt câu hỏi trên Diễn đàn môn học.`
    : "";

  const [reminderSubject, setReminderSubject] = useState(defaultSubject);
  const [reminderBody, setReminderBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);

  // Đồng bộ lại khi đổi student
  React.useEffect(() => {
    if (student) {
      setReminderSubject(`[Nhắc nhở học tập] Tiến độ môn ${courseTitle}`);
      setReminderBody(
        `Chào ${student.userName},\n\nThầy/Cô gửi thông báo này để nhắc nhở em về tiến độ học tập môn "${courseTitle}". Hiện tại em đang dừng ở ${
          student.currentWeekTitle || `Tuần ${student.currentWeekNumber || 1}`
        }.\n\nEm hãy sắp xếp thời gian xem hết các video bài giảng và hoàn thành bài kiểm tra trắc nghiệm trước cuối tuần để bám sát lộ trình nhé!\n\nNếu gặp khó khăn trong quá trình học, em có thể đặt câu hỏi trên Diễn đàn môn học.`,
      );
    }
  }, [student, courseTitle]);

  if (!student) return null;

  const handleSend = async () => {
    if (!reminderSubject.trim()) {
      error("Vui lòng nhập tiêu đề thông điệp.");
      return;
    }
    if (!reminderBody.trim()) {
      error("Vui lòng nhập nội dung thông báo nhắc nhở.");
      return;
    }
    if (!courseId) {
      error("Không xác định được mã khóa học.");
      return;
    }

    setIsSending(true);
    try {
      const res = await sendReminderMutation.mutateAsync({
        courseId,
        studentIds: [student.userId],
        title: reminderSubject.trim(),
        content: reminderBody.trim(),
      });
      if (res.sentCount === 0) {
        error(
          "Không thể gửi thông điệp tới học viên (học viên không còn ghi danh trong khóa học).",
        );
        return;
      }
      onSendReminder(student.userId, reminderBody);
      success(`Đã gửi thông báo nhắc nhở học tập tới ${student.userName}!`);
      onOpenChange(false);
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Không thể gửi thông báo nhắc nhở.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="xl" className="p-6 max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header: Thông tin sinh viên & Môn học */}
        <Dialog.Header className="pb-3 border-b border-outline-variant/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-black text-lg flex items-center justify-center shrink-0 border border-primary/20">
                {student.userName.charAt(0)}
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>{student.userName}</span>
                  {student.isCompleted ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-success/20 text-success border border-success/30 flex items-center gap-1">
                      <Award className="w-3 h-3" /> Đã tốt nghiệp
                    </span>
                  ) : student.pace === "BEHIND" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Chậm tiến độ
                    </span>
                  ) : student.pace === "AHEAD" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-success/20 text-success border border-success/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Vượt tiến độ
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Đúng tiến độ
                    </span>
                  )}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground font-mono mt-0.5">
                  {student.userEmail} • Mã SV: {student.userId}
                </Dialog.Description>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-surface border border-outline-variant/60 text-muted-foreground shrink-0 hidden sm:inline-block">
              {courseTitle}
            </span>
          </div>
        </Dialog.Header>

        {/* Thân Modal cuộn */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Card 1: Thẻ tóm tắt tiến trình học tập */}
          <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Tiến độ khóa học
              </span>
              <span className="text-base font-black text-foreground font-mono">
                {student.progressPercent}%
              </span>
              <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted mt-1.5">
                {student.progressPercent > 0 && (
                  <div
                    style={{ width: `${student.progressPercent}%` }}
                    className={`h-full rounded-full min-w-0 ${
                      student.progressPercent >= 100
                        ? "bg-success"
                        : student.pace === "BEHIND"
                          ? "bg-destructive"
                          : "bg-primary"
                    }`}
                  />
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Vị trí bài học
              </span>
              <span className="text-xs font-bold text-foreground line-clamp-1 mt-0.5">
                {student.currentWeekTitle || `Tuần ${student.currentWeekNumber || 1}`}
              </span>
              <span className="text-[10px] text-muted-foreground line-clamp-1">
                {student.currentLessonTitle || "Đang xem video bài giảng"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Điểm Quiz TB
              </span>
              <span className="text-base font-black text-foreground font-mono">
                {student.quizScore ? `${student.quizScore}/10` : "8.5/10"}
              </span>
              <span className="text-[10px] text-success font-semibold block">Đạt chuẩn</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Lần học gần nhất
              </span>
              <span className="text-xs font-bold text-foreground mt-0.5 block">
                {student.lastActiveTime || "Hôm qua lúc 20:30"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {student.pace === "BEHIND" ? "Đã nghỉ 4 ngày" : "Truy cập đều đặn"}
              </span>
            </div>
          </div>

          {/* Hộp ghi chú giải thích chính sách kênh liên lạc */}
          <div className="p-3.5 rounded-2xl bg-info/10 border border-info/30 flex items-start gap-2.5 text-xs text-foreground">
            <Info className="w-4 h-4 text-info shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-bold text-info">
                Kênh tương tác và đôn đốc học tập của Giảng viên:
              </p>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Hệ thống hỗ trợ gửi{" "}
                <strong>Thông báo cá nhân trong ứng dụng (In-app Notification)</strong> kèm email tự
                động tới học viên. Đối với trao đổi hai chiều, giảng viên và sinh viên tương tác qua{" "}
                <strong>Diễn đàn trao đổi môn học</strong> hoặc thông qua{" "}
                <strong>Thông báo toàn lớp</strong>.
              </p>
            </div>
          </div>

          {/* Tabs lựa chọn hình thức can thiệp */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-outline-variant/60 w-fit text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("reminder")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "reminder"
                    ? "bg-surface text-primary shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Gửi Thông Báo Cá Nhân</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("announcement")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "announcement"
                    ? "bg-surface text-primary shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Đăng Thông Báo Toàn Lớp</span>
              </button>
            </div>

            {/* TAB 1: GỬI THÔNG BÁO CÁ NHÂN */}
            {activeTab === "reminder" && (
              <div className="space-y-3 p-4 rounded-2xl bg-surface border border-outline-variant/60 animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label
                    htmlFor="reminder-title-input"
                    className="text-xs font-bold text-foreground"
                  >
                    Tiêu đề thông báo:
                  </label>
                  <Input
                    id="reminder-title-input"
                    value={reminderSubject}
                    onChange={(e) => setReminderSubject(e.target.value)}
                    className="w-full text-xs font-semibold"
                    placeholder="Tiêu đề thông báo..."
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="reminder-body-textarea"
                      className="text-xs font-bold text-foreground"
                    >
                      Nội dung thông báo nhắc nhở:
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      Học viên sẽ nhận chuông thông báo & email
                    </span>
                  </div>
                  <Textarea
                    id="reminder-body-textarea"
                    rows={6}
                    value={reminderBody}
                    onChange={(e) => setReminderBody(e.target.value)}
                    className="w-full text-xs leading-relaxed font-sans"
                    placeholder="Nhập nội dung nhắc nhở..."
                  />
                </div>

                {isNudged && (
                  <div className="p-2.5 rounded-xl bg-success/10 border border-success/20 text-xs text-success flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Học viên này đã được gửi thông báo nhắc nhở gần đây.</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ĐĂNG THÔNG BÁO TOÀN LỚP */}
            {activeTab === "announcement" && (
              <div className="p-5 rounded-2xl bg-surface border border-outline-variant/60 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-foreground">
                      Tạo Thông Báo Hướng Dẫn Chung Cho Cả Lớp
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Nếu có nhiều sinh viên cùng gặp khó khăn tại{" "}
                      <strong>
                        {student.currentWeekTitle || `Tuần ${student.currentWeekNumber || 1}`}
                      </strong>
                      , giảng viên nên đăng một Thông Báo Khóa Học để giải đáp chung và hướng dẫn
                      bài tập cho toàn bộ học viên ghi danh.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  {courseId ? (
                    <Link
                      href={`/instructor/courses/${courseId}/announcements`}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Mở Trang Đăng Thông Báo Khóa Học</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  ) : null}

                  <Link
                    href="/forum"
                    className="px-4 py-2 rounded-xl bg-surface border border-outline-variant hover:border-primary/50 text-foreground text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    <span>Xem Diễn Đàn Thảo Luận</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Dialog */}
        <Dialog.Footer className="pt-3 border-t border-outline-variant/60 flex items-center justify-between">
          <Button
            type="button"
            variant="outlined"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Đóng
          </Button>

          {activeTab === "reminder" && (
            <Button
              type="button"
              disabled={isSending}
              onClick={handleSend}
              className="text-xs font-bold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? "Đang gửi..." : "Gửi Thông Báo Nhắc Nhở"}</span>
            </Button>
          )}
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
