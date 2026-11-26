"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useSendStudentReminderMutation } from "@/lib/query_hooks";
import { Users, RotateCcw, Loader2, Send, Info } from "lucide-react";

export interface BulkReminderStudent {
  userId: string;
  userName: string;
  userEmail?: string;
  progressPercent?: number;
  pace?: "AHEAD" | "ON_TRACK" | "BEHIND";
  paceDesc?: string;
  courseId?: string;
  courseTitle?: string;
  isCompleted?: boolean;
  isInCooldown?: boolean;
  cooldownUntil?: string;
  peerReviewDutyStatus?: string;
  isPeerReviewOverdue?: boolean;
  enrollmentType?: string;
  currentWeekNumber?: number;
  currentWeekTitle?: string;
}

export interface InstructorBulkReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string;
  courseTitle?: string;
  students: BulkReminderStudent[];
  bottleneckWeek?: {
    weekNumber: number;
    title: string;
    dropRate?: number;
  } | null;
  onSuccess?: (studentIds: string[]) => void;
}

function getStudentPaceConfig(pace?: "AHEAD" | "ON_TRACK" | "BEHIND") {
  switch (pace) {
    case "AHEAD":
      return {
        label: "Vượt tiến độ",
        textColor: "text-success",
        badgeClass: "bg-success/10 text-success border-success/20",
      };
    case "ON_TRACK":
      return {
        label: "Đúng tiến độ",
        textColor: "text-primary",
        badgeClass: "bg-primary/10 text-primary border-primary/20",
      };
    case "BEHIND":
    default:
      return {
        label: "Chậm tiến độ",
        textColor: "text-destructive",
        badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
      };
  }
}

function getSmartTemplates(
  courseTitle: string,
  bottleneckWeek?: { weekNumber: number; title: string; dropRate?: number } | null,
) {
  const subject = `[Đôn đốc học tập] Thầy/Cô hỗ trợ tiến độ môn ${courseTitle}`;

  let body = "";
  if (bottleneckWeek) {
    body = `Chào các em học viên,\n\nQua theo dõi nhịp độ học tập môn "${courseTitle}", Thầy/Cô nhận thấy một số bạn đang gặp khó khăn và dừng lại ở nội dung Tuần ${bottleneckWeek.weekNumber} (${bottleneckWeek.title}).\n\nCác em hãy sắp xếp thời gian xem lại video bài giảng, trao đổi trên Diễn đàn thảo luận và hoàn thành các bài tập tuần này để bám sát lộ trình nhé!\n\nNếu gặp bất kỳ vướng mắc nào, các em đừng ngần ngại nhắn Thầy/Cô hoặc đặt câu hỏi trên Diễn đàn để được trợ giúp kịp thời. Chúc các em học tập hiệu quả!`;
  } else {
    body = `Chào các em học viên,\n\nThầy/Cô gửi lời nhắc nhở và động viên tới các em học viên đang chậm tiến độ môn "${courseTitle}".\n\nHãy sắp xếp thời gian hoàn thành các bài học và bài kiểm tra tuần này để bám sát lộ trình và đạt chứng chỉ khóa học đúng hạn nhé!\n\nNếu gặp khó khăn trong quá trình học, các em đừng ngần ngại trao đổi trên Diễn đàn môn học. Chúc các em học tốt!`;
  }

  return { subject, body };
}

export function InstructorBulkReminderModal({
  open,
  onOpenChange,
  courseId = "",
  courseTitle = "Khóa học",
  students,
  bottleneckWeek,
  onSuccess,
}: InstructorBulkReminderModalProps) {
  const toast = useToast();
  const sendReminderMutation = useSendStudentReminderMutation();

  const smartTemplates = React.useMemo(
    () => getSmartTemplates(courseTitle, bottleneckWeek),
    [courseTitle, bottleneckWeek],
  );
  const templateScopeKey = `${courseTitle}:${bottleneckWeek?.weekNumber ?? ""}:${bottleneckWeek?.title ?? ""}`;
  const [prevTemplateScopeKey, setPrevTemplateScopeKey] = useState(templateScopeKey);
  const [subject, setSubject] = useState(smartTemplates.subject);
  const [content, setContent] = useState(smartTemplates.body);
  const [isSending, setIsSending] = useState(false);

  if (prevTemplateScopeKey !== templateScopeKey) {
    setPrevTemplateScopeKey(templateScopeKey);
    setSubject(smartTemplates.subject);
    setContent(smartTemplates.body);
  }

  const handleResetSmartTemplate = () => {
    setSubject(smartTemplates.subject);
    setContent(smartTemplates.body);
    toast.info("Đã khôi phục nội dung gợi ý mẫu theo điểm nghẽn học tập.");
  };

  const handleConfirmSend = async () => {
    if (!subject.trim()) {
      toast.error("Vui lòng nhập tiêu đề thông báo.");
      return;
    }
    if (!content.trim()) {
      toast.error("Vui lòng nhập nội dung thông báo nhắc nhở.");
      return;
    }
    if (students.length === 0) {
      toast.error("Không có học viên nào trong danh sách nhận thông báo.");
      return;
    }

    setIsSending(true);
    try {
      // Nhóm theo courseId khi gửi hàng loạt từ view "Tất cả khóa học" hoặc danh sách nhiều môn
      const groups = new Map<string, { title: string; studentIds: string[] }>();
      for (const s of students) {
        const cId = s.courseId || (courseId !== "ALL" ? courseId : "");
        if (!cId) continue;
        const cTitle = s.courseTitle || courseTitle || "Khóa học";
        if (!groups.has(cId)) {
          groups.set(cId, { title: cTitle, studentIds: [] });
        }
        groups.get(cId)!.studentIds.push(s.userId);
      }

      if (groups.size === 0 && courseId && courseId !== "ALL") {
        groups.set(courseId, {
          title: courseTitle || "Khóa học",
          studentIds: students.map((s) => s.userId),
        });
      }

      if (groups.size === 0) {
        toast.error("Không xác định được mã khóa học tương ứng của học viên.");
        return;
      }

      let totalSent = 0;
      const sentStudentIds: string[] = [];
      const CHUNK_SIZE = 100;

      for (const [targetCourseId, group] of groups.entries()) {
        for (let i = 0; i < group.studentIds.length; i += CHUNK_SIZE) {
          const chunk = group.studentIds.slice(i, i + CHUNK_SIZE);
          const res = await sendReminderMutation.mutateAsync({
            courseId: targetCourseId,
            studentIds: chunk,
            title: subject.trim(),
            content: content.trim(),
          });
          if (res.sentCount > 0) {
            totalSent += res.sentCount;
            if (res.sentStudentIds && res.sentStudentIds.length > 0) {
              sentStudentIds.push(...res.sentStudentIds);
            }
          }
        }
      }

      if (totalSent > 0) {
        toast.success(`Đã gửi thông báo nhắc nhở tới ${totalSent} học viên!`, {
          description:
            groups.size > 1 ? `Đã gửi trên ${groups.size} khóa học` : `Môn: ${courseTitle}`,
        });

        if (onSuccess) {
          onSuccess(sentStudentIds);
        }

        onOpenChange(false);
      } else {
        toast.error(
          "Không có học viên hợp lệ nào nhận được thông báo (có thể do học viên không còn ghi danh).",
          {
            description:
              groups.size > 1
                ? "Vui lòng kiểm tra lại trạng thái học viên."
                : `Môn: ${courseTitle}`,
          },
        );
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Không thể gửi thông báo nhắc nhở học viên.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="xl" className="space-y-4 max-h-[90vh] overflow-y-auto">
        <Dialog.Header>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs bg-primary/10 text-primary">
              <Send className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <Dialog.Title className="text-base font-bold text-foreground">
                Gửi thông báo học tập hàng loạt
              </Dialog.Title>
            </div>
          </div>
        </Dialog.Header>

        <div className="space-y-3.5 text-xs">
          {/* Danh sách học viên nhận tin (Scrollable gọn gàng) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Danh sách học viên nhận thông báo ({students.length} SV)</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Nhóm: Chậm tiến độ
              </span>
            </div>

            <div className="max-h-28 overflow-y-auto rounded-xl border border-outline-variant/60 bg-surface p-2 divide-y divide-outline-variant/30 scrollbar-thin">
              {students.map((st) => {
                const paceConfig = getStudentPaceConfig(st.pace);
                return (
                  <div
                    key={st.userId}
                    className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-semibold text-foreground truncate block">
                        {st.userName}
                      </span>
                      {(st.userEmail || st.courseTitle) && (
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {st.userEmail}
                          {st.courseTitle && ` • ${st.courseTitle}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {st.progressPercent !== undefined && (
                        <span className={`font-mono text-[11px] font-bold ${paceConfig.textColor}`}>
                          {st.progressPercent.toFixed(1)}%
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${paceConfig.badgeClass}`}
                      >
                        {paceConfig.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Thông tin kênh chuyển phát */}
            <div className="p-2.5 rounded-xl bg-info/10 border border-info/25 flex items-center gap-2 text-xs text-foreground">
              <Info className="w-3.5 h-3.5 text-info shrink-0" aria-hidden="true" />
              <p className="text-[11px] text-muted-foreground leading-normal">
                Thông báo sẽ được gửi qua{" "}
                <strong className="text-foreground font-semibold">
                  Thông báo ứng dụng (In-app)
                </strong>{" "}
                kèm <strong className="text-foreground font-semibold">Email tự động</strong> tới học
                viên.
              </p>
            </div>
          </div>

          {/* Khu vực soạn thảo nội dung */}
          <div className="space-y-3 p-4 rounded-2xl bg-surface border border-outline-variant/60">
            <div className="space-y-1">
              <label htmlFor="bulk-reminder-subject" className="text-xs font-bold text-foreground">
                Tiêu đề thông báo:
              </label>
              <Input
                id="bulk-reminder-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs font-semibold"
                placeholder="Nhập tiêu đề thông báo nhắc nhở..."
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="bulk-reminder-content"
                  className="text-xs font-bold text-foreground"
                >
                  Nội dung thông báo:
                </label>
                <button
                  type="button"
                  onClick={handleResetSmartTemplate}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  title="Khôi phục lại nội dung mẫu ban đầu"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  <span>Khôi phục mẫu</span>
                </button>
              </div>
              <Textarea
                id="bulk-reminder-content"
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full text-xs leading-relaxed font-sans"
                placeholder="Nhập nội dung nhắc nhở học viên..."
              />
            </div>
          </div>
        </div>

        {/* Footer Dialog */}
        <Dialog.Footer className="pt-3 flex items-center justify-between">
          <Button
            type="button"
            variant="outlined"
            onClick={() => onOpenChange(false)}
            className="text-xs cursor-pointer"
          >
            Hủy bỏ
          </Button>

          <Button
            type="button"
            disabled={isSending || students.length === 0 || !subject.trim() || !content.trim()}
            onClick={handleConfirmSend}
            className="text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>
              {isSending ? "Đang gửi thông báo..." : `Xác nhận gửi cho ${students.length} học viên`}
            </span>
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
