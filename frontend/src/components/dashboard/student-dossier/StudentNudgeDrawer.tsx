"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useSendStudentReminderMutation } from "@/lib/query_hooks";
import {
  getSmartTemplates,
  type SmartTemplateType,
  type StudentDetailRecord,
} from "./dossier_helpers";

const TEMPLATE_KEYS: SmartTemplateType[] = [
  "PEER_REVIEW",
  "HELP_COOLDOWN",
  "PACING",
  "ENCOURAGE",
  "CONGRATS",
];

interface StudentNudgeDrawerProps {
  open: boolean;
  onClose: () => void;
  student: StudentDetailRecord;
  courseId?: string;
  courseTitle: string;
  initialTemplateKey: SmartTemplateType;
  focusItemTitle?: string;
  onSent?: (studentId: string, body: string) => void;
}

export function StudentNudgeDrawer({
  open,
  onClose,
  student,
  courseId,
  courseTitle,
  initialTemplateKey,
  focusItemTitle,
  onSent,
}: StudentNudgeDrawerProps) {
  const toast = useToast();
  const sendReminderMutation = useSendStudentReminderMutation();

  const { templates } = useMemo(
    () => getSmartTemplates(courseTitle, student, focusItemTitle),
    [courseTitle, student, focusItemTitle],
  );

  const [selectedKey, setSelectedKey] = useState<SmartTemplateType>(initialTemplateKey);
  const [subject, setSubject] = useState<string>(
    () => templates[initialTemplateKey]?.subject || "",
  );
  const [body, setBody] = useState<string>(() => templates[initialTemplateKey]?.body || "");
  const [sentSuccessTime, setSentSuccessTime] = useState<string | null>(null);

  const handleTemplateChange = (nextKey: SmartTemplateType) => {
    const tpl = templates[nextKey];
    if (!tpl) return;
    setSelectedKey(nextKey);
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  const handleReset = () => {
    const tpl = templates[selectedKey];
    if (!tpl) return;
    setSubject(tpl.subject);
    setBody(tpl.body);
    toast.info("Đã đặt lại văn bản soạn sẵn ban đầu.");
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Vui lòng nhập tiêu đề thông báo.");
      return;
    }
    if (!body.trim()) {
      toast.error("Vui lòng nhập nội dung thông báo.");
      return;
    }
    if (!courseId) {
      toast.error("Không xác định được mã khóa học.");
      return;
    }

    try {
      const res = await sendReminderMutation.mutateAsync({
        courseId,
        studentIds: [student.userId],
        title: subject.trim(),
        content: body.trim(),
      });

      if (res.sentCount === 0) {
        toast.error(
          "Học viên không còn ghi danh trong khóa học này hoặc không thể nhận thông báo.",
        );
        return;
      }

      const nowStr = new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setSentSuccessTime(nowStr);
      toast.success(`Đã gửi thông báo cho ${student.userName} thành công.`);
      onSent?.(student.userId, body.trim());
    } catch {
      toast.error("Không thể gửi thông báo. Vui lòng thử lại sau.");
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="absolute inset-0 z-20 bg-scrim/20 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        aria-label="Soạn thông báo học tập"
        className="absolute inset-y-0 right-0 z-30 w-full sm:w-[410px] bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground">
              Gửi thông báo &amp; Đôn đốc học tập
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              Người nhận: {student.userName} · {student.userEmail}
            </p>
          </div>
          <IconButton
            type="button"
            variant="standard"
            size="xs"
            onClick={onClose}
            aria-label="Đóng bảng soạn thông báo"
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {sentSuccessTime && (
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-success/10 border border-success/30 text-xs text-success">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="font-medium">
                  Đã gửi cho {student.userName} lúc {sentSuccessTime}.
                </span>
              </div>
              <Button
                type="button"
                size="xs"
                variant="text"
                onClick={() => setSentSuccessTime(null)}
                className="h-6 px-2 text-xs text-success shrink-0"
              >
                Gửi tiếp
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">
              Văn bản soạn sẵn
            </span>
            <Select
              value={selectedKey}
              onValueChange={(val) => {
                if (val) handleTemplateChange(val as SmartTemplateType);
              }}
            >
              <Select.Trigger
                aria-label="Chọn văn bản soạn sẵn"
                className="h-9 px-3 py-0 rounded-xl text-xs font-medium bg-background border border-input"
              >
                <Select.Value>{templates[selectedKey]?.label || "Chọn mẫu thông báo"}</Select.Value>
              </Select.Trigger>
              <Select.Content>
                {TEMPLATE_KEYS.map((key) => (
                  <Select.Item key={key} value={key} className="text-xs py-2 px-3 rounded-lg">
                    {templates[key].label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <Input
            id="dossier-nudge-subject"
            label="Tiêu đề thông báo"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Nhập tiêu đề thông báo..."
            className="text-xs h-9"
          />

          <Textarea
            id="dossier-nudge-body"
            label="Nội dung thông báo"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Nhập nội dung gửi học viên..."
            rows={7}
            className="text-xs leading-relaxed"
          />
        </div>

        <div className="px-5 py-3.5 border-t border-border bg-muted/30 flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            size="xs"
            variant="text"
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            Đặt lại mẫu
          </Button>

          <Button
            type="button"
            size="xs"
            shape="square"
            onClick={handleSend}
            disabled={sendReminderMutation.isPending || !subject.trim() || !body.trim()}
            className="text-xs font-semibold px-3.5"
          >
            {sendReminderMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden="true" />
                Đang gửi...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                Gửi thông báo ngay
              </>
            )}
          </Button>
        </div>
      </section>
    </>
  );
}
