"use client";

import React, { useState } from "react";
import {
  Sparkles,
  BrainCircuit,
  AlertTriangle,
  Flame,
  Send,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

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

const INSIGHTS: InsightItem[] = [
  {
    id: "ins-2",
    type: "at_risk",
    tag: "Cảnh Báo Nguy Cơ Bỏ Học",
    badgeLabel: "3 SV Nguy cơ",
    tagColor: "bg-destructive/10 text-destructive border-destructive/20",
    title: "3 sinh viên có nguy cơ bỏ dở khóa học",
    course: "Kinh tế học Vi mô Căn bản & Kinh tế lượng",
    description:
      "Lê Quốc Huy, Hoàng Văn Nam, Nguyễn Văn An đã hơn 8 ngày chưa đăng nhập và chưa nộp bài tập Tuần 2.",
    actionText: "Gửi tin nhắn đôn đốc 1-Click",
    actionType: "nudge",
  },
  {
    id: "ins-1",
    type: "friction",
    tag: "Điểm Nghẽn Nhận Thức",
    badgeLabel: "14 SV Vướng mắc",
    tagColor: "bg-warning/10 text-warning border-warning/20",
    title: "14 sinh viên vướng mắc 'Kiểm định White'",
    course: "Kinh tế lượng Ứng dụng & Phân tích Dữ liệu",
    description:
      "AI Tutor ghi nhận tỷ lệ câu hỏi lặp lại tăng 35% về cách tính biến bình phương phần dư. Đề xuất: Bổ sung 1 ví dụ ma trận thực tế.",
    actionText: "Soạn bài viết hỗ trợ nhanh",
    actionType: "broadcast",
    aiDraftContent:
      "Chào các em, qua phân tích bài tập Tuần 2, Thầy nhận thấy 14 bạn còn băn khoăn về Kiểm định White trong mô hình OLS. Thầy gửi kèm ví dụ ma trận phần dư mẫu và file Stata thực hành tại link này...",
  },
  {
    id: "ins-3",
    type: "timing",
    tag: "Khung Giờ Vàng Học Tập",
    badgeLabel: "Giờ cao điểm",
    tagColor: "bg-primary/10 text-primary border-primary/20",
    title: "Đỉnh điểm tương tác: 20h - 22h30 Thứ Bảy & CN",
    course: "Toàn bộ 3 khóa học đang giảng dạy",
    description:
      "68% thời lượng học tập diễn ra vào buổi tối cuối tuần. Đề xuất: Đặt hạn chót bài tập lớn vào 23h59 Chủ Nhật để tối ưu tỷ lệ nộp bài.",
    actionText: "Áp dụng lịch đề xuất",
    actionType: "review",
  },
];

export function InstructorAIAssistantCard() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [nudged, setNudged] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSent, setBroadcastSent] = useState(false);

  const current = INSIGHTS[activeIdx];

  const handleAction = () => {
    if (current.actionType === "nudge") {
      setNudged(true);
      setTimeout(() => setNudged(false), 3500);
    } else if (current.actionType === "broadcast") {
      setIsBroadcastOpen(true);
      setBroadcastTitle(`[Hỗ trợ kiến thức] ${current.title}`);
      setBroadcastBody(current.aiDraftContent || "");
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim()) return;
    setBroadcastSent(true);
    setTimeout(() => {
      setBroadcastSent(false);
      setIsBroadcastOpen(false);
      setBroadcastTitle("");
      setBroadcastBody("");
    }, 2000);
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
          3 đề xuất mới
        </span>
      </div>

      {/* Category Tabs: Loại bỏ bẫy giấu thông tin của Carousel */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-muted/60 relative z-10">
        {INSIGHTS.map((item, idx) => {
          const isSelected = activeIdx === idx;
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
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                  item.type === "at_risk"
                    ? "bg-destructive"
                    : item.type === "friction"
                      ? "bg-warning"
                      : "bg-primary"
                }`}
              />
              {item.badgeLabel}
            </button>
          );
        })}
      </div>

      {/* Nội dung Insight được chọn */}
      <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/60 space-y-2.5 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${current.tagColor}`}
          >
            {current.tag}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
            {current.course}
          </span>
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            {current.type === "friction" ? (
              <BrainCircuit className="w-3.5 h-3.5 text-warning shrink-0" />
            ) : current.type === "at_risk" ? (
              <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
            ) : (
              <Flame className="w-3.5 h-3.5 text-primary shrink-0" />
            )}
            <span>{current.title}</span>
          </h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{current.description}</p>
        </div>

        {/* Nút hành động trực tiếp */}
        <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between gap-2">
          {nudged ? (
            <span className="text-[11px] font-bold text-success flex items-center gap-1 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã gửi tin nhắn đôn đốc tới 3 sinh viên!
            </span>
          ) : (
            <button
              type="button"
              onClick={handleAction}
              className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                current.type === "at_risk"
                  ? "bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/25"
                  : current.type === "friction"
                    ? "bg-warning/10 hover:bg-warning/20 text-warning border-warning/25"
                    : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/25"
              }`}
            >
              <span>{current.actionText}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Khối Phát Thông Báo Nhanh AI Assistant (Quick Broadcast with AI Draft) */}
      {isBroadcastOpen && (
        <form
          onSubmit={handleSendBroadcast}
          className="p-3.5 rounded-2xl bg-surface border border-primary/40 space-y-2.5 text-xs relative z-10 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/40">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              Phát Thông Báo Hỗ Trợ Kiến Thức
            </span>
            <button
              type="button"
              onClick={() => setIsBroadcastOpen(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label
                htmlFor="ai-broadcast-title"
                className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1"
              >
                Tiêu đề bài viết diễn đàn
              </label>
              <input
                id="ai-broadcast-title"
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Tiêu đề thông báo..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-foreground outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="ai-broadcast-body"
                className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center justify-between mb-1"
              >
                <span>Nội dung AI soạn sẵn (Có thể sửa)</span>
                <span className="text-primary flex items-center gap-1">
                  <FileText className="w-3 h-3" /> AI Drafted
                </span>
              </label>
              <textarea
                id="ai-broadcast-body"
                rows={3}
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                placeholder="Nhập nội dung giảng viên muốn gửi..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant text-[11px] text-foreground leading-relaxed outline-hidden focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                size="xs"
                variant="outlined"
                onClick={() => setIsBroadcastOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" size="xs" variant="filled" className="font-bold">
                {broadcastSent ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đã đăng bài!
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Send className="w-3 h-3" /> Đăng lên Diễn đàn môn
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
