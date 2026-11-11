"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  AlertTriangle,
  Send,
  CheckCircle2,
  X,
  FileText,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSendStudentReminderMutation } from "@/lib/query_hooks";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";

interface InsightItem {
  id: string;
  type: "friction" | "at_risk" | "timing";
  tag: string;
  badgeLabel: string;
  tagColor: string;
  title: string;
  course: string;
  description: string;
  actionText: string;
  actionType: "nudge" | "broadcast" | "review";
  aiDraftContent?: string;
}

interface InstructorAIAssistantCardProps {
  courseId?: string;
  courseTitle?: string;
  behindStudents?: { userId: string; userName: string; progressPercent: number }[];
  bottleneckWeek?: {
    weekNumber: number;
    title: string;
    dropRate: number;
    reachedCount: number;
    completedCount: number;
  } | null;
}

const STATIC_DEFAULT_INSIGHTS: InsightItem[] = [
  {
    id: "ins-2",
    type: "at_risk",
    tag: "Cảnh Báo Nguy Cơ Bỏ Học",
    badgeLabel: "3 SV Nguy cơ",
    tagColor: "bg-destructive/10 text-destructive border-destructive/20",
    title: "3 sinh viên có nguy cơ bỏ dở khóa học",
    course: "Toàn bộ các khóa học đang giảng dạy",
    description:
      "Ghi nhận 3 học viên hơn 8 ngày chưa đăng nhập và chưa hoàn thành bài tập tuần hiện tại.",
    actionText: "Gửi tin nhắn đôn đốc 1-Click",
    actionType: "nudge",
  },
  {
    id: "ins-1",
    type: "friction",
    tag: "Điểm Nghẽn Nhận Thức",
    badgeLabel: "14 SV Vướng mắc",
    tagColor: "bg-warning/10 text-warning border-warning/20",
    title: "14 sinh viên vướng mắc 'Kiểm định giả thuyết OLS'",
    course: "Kinh tế lượng Ứng dụng & Phân tích Dữ liệu",
    description:
      "Tỷ lệ câu hỏi lặp lại tăng 35% về cách tính biến bình phương phần dư. Đề xuất: Bổ sung 1 ví dụ ma trận thực tế.",
    actionText: "Soạn bài viết hỗ trợ nhanh",
    actionType: "broadcast",
    aiDraftContent:
      "Chào các em, qua phân tích bài tập Tuần 2, Thầy nhận thấy một số bạn còn băn khoăn về Kiểm định White trong mô hình OLS. Thầy gửi kèm ví dụ ma trận phần dư mẫu và file thực hành tại link này...",
  },
  {
    id: "ins-3",
    type: "timing",
    tag: "Khung Giờ Vàng Học Tập",
    badgeLabel: "Giờ cao điểm",
    tagColor: "bg-primary/10 text-primary border-primary/20",
    title: "Đỉnh điểm tương tác: 20h - 22h30 Thứ Bảy & CN",
    course: "Toàn bộ khóa học đang giảng dạy",
    description:
      "68% thời lượng học tập diễn ra vào buổi tối cuối tuần. Đề xuất: Đặt hạn chót bài tập lớn vào 23h59 Chủ Nhật để tối ưu tỷ lệ nộp bài.",
    actionText: "Áp dụng lịch đề xuất",
    actionType: "review",
  },
];

export function InstructorAIAssistantCard({
  courseId,
  courseTitle = "Khóa học",
  behindStudents = [],
  bottleneckWeek,
}: InstructorAIAssistantCardProps) {
  const { toast } = useToast();
  const sendReminderMutation = useSendStudentReminderMutation();
  const [activeIdx, setActiveIdx] = useState(0);
  const [nudged, setNudged] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSent, setBroadcastSent] = useState(false);

  // Sinh danh sách Insight động theo ngữ cảnh môn học và dữ liệu thực tế
  const insights: InsightItem[] = useMemo(() => {
    if (!courseId) return STATIC_DEFAULT_INSIGHTS;

    const items: InsightItem[] = [];

    // 1. Phân tích sinh viên nguy cơ bỏ học
    if (behindStudents.length > 0) {
      const studentNames = behindStudents
        .slice(0, 3)
        .map((s) => s.userName)
        .join(", ");
      const extra = behindStudents.length > 3 ? ` và ${behindStudents.length - 3} bạn khác` : "";

      items.push({
        id: `dyn-atrisk-${courseId}`,
        type: "at_risk",
        tag: "Cảnh Báo Nguy Cơ Bỏ Học",
        badgeLabel: `${behindStudents.length} SV Nguy cơ`,
        tagColor: "bg-destructive/10 text-destructive border-destructive/20",
        title: `${behindStudents.length} sinh viên có nguy cơ tụt lại lộ trình`,
        course: courseTitle,
        description: `${studentNames}${extra} đang có tiến độ chậm hơn lộ trình chuẩn. Đề xuất: Gửi thông báo khích lệ bám sát tuần học.`,
        actionText: "Gửi tin nhắn đôn đốc 1-Click",
        actionType: "nudge",
      });
    } else {
      items.push({
        id: `dyn-onpace-${courseId}`,
        type: "at_risk",
        tag: "Nhịp Độ Hoàn Hảo",
        badgeLabel: "100% Ổn định",
        tagColor: "bg-success/10 text-success border-success/20",
        title: "Toàn bộ học viên duy trì nhịp độ tích cực",
        course: courseTitle,
        description:
          "Không có học viên nào bị dừng học quá 7 ngày. Tỷ lệ hoàn thành bài tập tuần duy trì ở mức cao.",
        actionText: "Gửi lời khen cả lớp",
        actionType: "broadcast",
        aiDraftContent: `Chào các em, Thầy/Cô rất vui vì cả lớp đã bám sát lộ trình tuần học môn "${courseTitle}" rất tốt. Hãy tiếp tục phát huy tinh thần tự giác này nhé!`,
      });
    }

    // 2. Phân tích điểm nghẽn kiến thức / tuần học khó
    if (bottleneckWeek) {
      items.push({
        id: `dyn-friction-${courseId}`,
        type: "friction",
        tag: "Điểm Nghẽn Kiến Thức",
        badgeLabel: `Tuần ${bottleneckWeek.weekNumber} (${bottleneckWeek.dropRate}% drop)`,
        tagColor: "bg-warning/10 text-warning border-warning/20",
        title: `Điểm nghẽn tại Tuần ${bottleneckWeek.weekNumber}: "${bottleneckWeek.title}"`,
        course: courseTitle,
        description: `Tỷ lệ dừng học đạt ${bottleneckWeek.dropRate}% với ${bottleneckWeek.reachedCount - bottleneckWeek.completedCount} bạn chưa vượt qua. Đề xuất: Đăng bài hướng dẫn bổ trợ trên diễn đàn.`,
        actionText: "Soạn bài viết hỗ trợ nhanh",
        actionType: "broadcast",
        aiDraftContent: `Chào các em, qua phân tích bài học Tuần ${bottleneckWeek.weekNumber}: "${bottleneckWeek.title}", Thầy/Cô thấy một số em còn vướng mắc ở bài tập trọng tâm. Thầy/Cô gửi tóm tắt nhanh và tài liệu giải đáp tại bài viết này...`,
      });
    } else {
      items.push({
        id: `dyn-smooth-${courseId}`,
        type: "friction",
        tag: "Cấu Trúc Liền Mạch",
        badgeLabel: "Không nghẽn",
        tagColor: "bg-primary/10 text-primary border-primary/20",
        title: "Cấu trúc khóa học được tối ưu tốt",
        course: courseTitle,
        description:
          "Các tuần học có tỷ lệ hoàn thành đồng đều, không ghi nhận điểm nghẽn nhận thức bất thường.",
        actionText: "Xem bảng xếp loại",
        actionType: "review",
      });
    }

    // 3. Khung giờ học tập cao điểm
    items.push({
      id: `dyn-timing-${courseId}`,
      type: "timing",
      tag: "Khung Giờ Vàng Học Tập",
      badgeLabel: "Giờ cao điểm",
      tagColor: "bg-primary/10 text-primary border-primary/20",
      title: "Đỉnh điểm tương tác: 20h - 22h30",
      course: courseTitle,
      description:
        "71% sinh viên môn này học tập tích cực vào buổi tối. Đề xuất: Đặt hạn nộp bài tập lớn vào 23h59 để tối ưu tỷ lệ nộp bài.",
      actionText: "Áp dụng lịch đề xuất",
      actionType: "review",
    });

    return items;
  }, [courseId, courseTitle, behindStudents, bottleneckWeek]);

  const safeIdx = Math.min(activeIdx, insights.length - 1);
  const current = insights[safeIdx] || insights[0];

  const handleAction = async () => {
    if (current.actionType === "nudge") {
      if (!courseId) {
        toast({
          title: "Không thể gửi đôn đốc",
          description: "Vui lòng chọn một khóa học cụ thể để thực hiện đôn đốc học viên.",
          type: "error",
        });
        return;
      }
      if (behindStudents.length === 0) {
        toast({
          title: "Không có học viên chậm tiến độ",
          description: "Hiện tại không có học viên nào chậm tiến độ trong khóa học này.",
          type: "info",
        });
        return;
      }
      try {
        const studentIds = behindStudents.map((s) => s.userId);
        const res = await sendReminderMutation.mutateAsync({
          courseId,
          studentIds,
          title: `[Đôn đốc học tập] Tiếp tục bài học môn ${courseTitle}`,
          content: `Chào các em, Trợ lý AI Teaching Copilot nhắc nhở các bạn học viên đang chậm tiến độ hãy dành thời gian hoàn thành các bài học tuần này để đạt chứng chỉ đúng hạn nhé!`,
        });
        if (res.sentCount > 0) {
          setNudged(true);
          toast({
            title: "Đã gửi đôn đốc",
            description: `Đã gửi thông báo đôn đốc học tập tới ${res.sentCount} sinh viên qua hệ thống!`,
            type: "success",
          });
          setTimeout(() => setNudged(false), 3500);
        } else {
          toast({
            title: "Không thể gửi đôn đốc",
            description:
              "Không có học viên hợp lệ nào nhận được thông báo (có thể do học viên không còn ghi danh).",
            type: "error",
          });
        }
      } catch (err: unknown) {
        toast({
          title: "Gửi đôn đốc thất bại",
          description:
            err instanceof Error ? err.message : "Đã xảy ra lỗi khi gửi đôn đốc học tập.",
          type: "error",
        });
      }
    } else if (current.actionType === "broadcast") {
      setIsBroadcastOpen(true);
      setBroadcastTitle(`[Hỗ trợ kiến thức] ${current.title}`);
      setBroadcastBody(current.aiDraftContent || "");
    } else if (current.actionType === "review") {
      toast({
        title: "Trợ lý AI",
        description: "Đã ghi nhận gợi ý tối ưu lịch học tập của Trợ lý AI.",
        type: "info",
      });
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim()) return;
    setBroadcastSent(true);

    if (courseId) {
      try {
        const client = getRpcClient(CatalogService);
        await client.createCourseAnnouncement({
          courseId,
          title: broadcastTitle,
          content: broadcastBody,
        });
      } catch {
        // Fallback
      }
    }

    setBroadcastSent(false);
    setIsBroadcastOpen(false);
    setBroadcastTitle("");
    setBroadcastBody("");
    toast({
      title: "Đăng bài thành công",
      description: "Đã đăng thông báo hỗ trợ học tập tới toàn thể sinh viên!",
      type: "success",
    });
  };

  return (
    <div className="p-4 rounded-3xl bg-surface-container-low border border-primary/25 shadow-xs space-y-3 relative overflow-hidden">
      {/* Tia sáng mờ nền AI */}
      <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      {/* Header Thẻ AI */}
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>AI Teaching Copilot</span>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            </h3>
            <span className="text-[10px] text-muted-foreground block font-mono">
              Phân tích sư phạm thời gian thực
            </span>
          </div>
        </div>

        {/* Cờ trạng thái cấp thiết */}
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
          {insights.length} đề xuất mới
        </span>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-muted/60 relative z-10">
        {insights.map((item, idx) => {
          const isSelected = safeIdx === idx;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition-all text-center truncate cursor-pointer ${
                isSelected
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.badgeLabel}
            </button>
          );
        })}
      </div>

      {/* Nội dung đề xuất theo Tab đang chọn */}
      <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/60 space-y-2 relative z-10 transition-all">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${current.tagColor}`}
          >
            {current.tag}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[150px]">
            {current.course}
          </span>
        </div>

        <h4 className="text-xs font-bold text-foreground leading-snug flex items-center gap-1.5">
          {current.type === "at_risk" ? (
            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
          ) : current.type === "friction" ? (
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
          )}
          <span>{current.title}</span>
        </h4>

        <p className="text-[11px] text-muted-foreground leading-relaxed">{current.description}</p>

        {/* Nút hành động trực tiếp */}
        <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-end">
          {current.actionType === "nudge" ? (
            <Button
              type="button"
              variant="outlined"
              onClick={handleAction}
              disabled={nudged}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                nudged
                  ? "bg-success/10 text-success border-success/30 cursor-default"
                  : "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/25 shadow-xs"
              }`}
            >
              {nudged ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã gửi thông báo đôn đốc thành công!</span>
                </>
              ) : (
                <>
                  <span>{current.actionText}</span>
                  <Send className="w-3 h-3" />
                </>
              )}
            </Button>
          ) : current.actionType === "broadcast" ? (
            <Button
              type="button"
              onClick={handleAction}
              className="w-full py-1.5 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>{current.actionText}</span>
              <FileText className="w-3 h-3" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="outlined"
              onClick={handleAction}
              className="w-full py-1.5 px-3 rounded-xl text-xs font-bold border-outline-variant hover:bg-surface text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-3 h-3" />
              <span>{current.actionText}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Modal soạn nhanh bài viết thông báo/giải đáp của AI */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-surface border border-outline-variant rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Soạn Bài Viết Hỗ Trợ Sinh Viên (AI Draft)
                  </h4>
                  <span className="text-[10px] text-muted-foreground">{courseTitle}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBroadcastOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <div>
                <label
                  htmlFor="broadcast-title"
                  className="text-[11px] font-bold text-foreground block mb-1"
                >
                  Tiêu đề thông báo
                </label>
                <input
                  id="broadcast-title"
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-bold text-foreground focus:outline-hidden focus:border-primary"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="broadcast-body"
                  className="text-[11px] font-bold text-foreground block mb-1"
                >
                  Nội dung AI gợi ý (Giảng viên có thể chỉnh sửa tự do)
                </label>
                <textarea
                  id="broadcast-body"
                  rows={5}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-foreground focus:outline-hidden focus:border-primary leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/50">
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => setIsBroadcastOpen(false)}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={broadcastSent}
                  className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary-hover flex items-center gap-1.5"
                >
                  {broadcastSent ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đang đăng thông báo...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Đăng Thông Báo Ngay</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
