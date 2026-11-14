"use client";

import React from "react";
import { TrendingUp, Zap, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface InstructorPacingCohortsCardProps {
  totalStudents: number;
  aheadCount: number;
  aheadPercent: number;
  onTrackCount: number;
  onTrackPercent: number;
  behindCount: number;
  behindPercent: number;
  onOpenModal: (category?: "ALL" | "AHEAD" | "ON_TRACK" | "BEHIND") => void;
}

export function InstructorPacingCohortsCard({
  totalStudents,
  aheadCount,
  aheadPercent,
  onTrackCount,
  onTrackPercent,
  behindCount,
  behindPercent,
  onOpenModal,
}: InstructorPacingCohortsCardProps) {
  return (
    <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4">
      {/* Header Khối Nhịp Độ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              Kiểm Soát Nhịp Độ Học Tập Toàn Hệ Thống
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              {totalStudents} học viên
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="filled"
          size="sm"
          onClick={() => onOpenModal("ALL")}
          className="rounded-xl text-xs font-bold gap-1.5 shrink-0"
        >
          <span>Xem danh sách học viên & Nhắc nhở</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
      </div>

      {/* 1. Thanh Phân Phối Tỷ Trọng Liền Mạch (100% Cohort Distribution Bar) */}
      <div className="space-y-1.5">
        <div className="w-full h-3.5 rounded-full bg-muted/60 p-0.5 flex gap-1 overflow-hidden">
          {aheadPercent > 0 && (
            <button
              type="button"
              style={{ width: `${aheadPercent}%` }}
              className="h-full rounded-full bg-success transition-all duration-500 hover:opacity-90 cursor-pointer border-0 p-0"
              title={`Vượt tiến độ: ${aheadCount} SV (${aheadPercent}%)`}
              aria-label={`Vượt tiến độ: ${aheadCount} học viên`}
              onClick={() => onOpenModal("AHEAD")}
            />
          )}
          {onTrackPercent > 0 && (
            <button
              type="button"
              style={{ width: `${onTrackPercent}%` }}
              className="h-full rounded-full bg-primary transition-all duration-500 hover:opacity-90 cursor-pointer border-0 p-0"
              title={`Đúng tiến độ: ${onTrackCount} SV (${onTrackPercent}%)`}
              aria-label={`Đúng tiến độ: ${onTrackCount} học viên`}
              onClick={() => onOpenModal("ON_TRACK")}
            />
          )}
          {behindPercent > 0 && (
            <button
              type="button"
              style={{ width: `${behindPercent}%` }}
              className="h-full rounded-full bg-warning transition-all duration-500 hover:opacity-90 cursor-pointer border-0 p-0"
              title={`Chậm tiến độ: ${behindCount} SV (${behindPercent}%)`}
              aria-label={`Chậm tiến độ: ${behindCount} học viên`}
              onClick={() => onOpenModal("BEHIND")}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" /> {aheadPercent}% Vượt tiến độ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" /> {onTrackPercent}% Đúng tiến độ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" /> {behindPercent}% Cần nhắc nhở
          </span>
        </div>
      </div>

      {/* 2. Bộ 3 Thẻ Tương Tác Phân Cấp Chuẩn Mực */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card Vượt tiến độ */}
        <button
          type="button"
          onClick={() => onOpenModal("AHEAD")}
          className="p-3.5 rounded-2xl bg-surface border border-outline-variant/60 hover:border-success/50 transition-all cursor-pointer space-y-2 group text-left w-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-success" /> VƯỢT TIẾN ĐỘ
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-success/10 text-success">
              {aheadPercent}%
            </span>
          </div>
          <div>
            <span className="text-xl font-black text-foreground font-mono">{aheadCount}</span>
            <span className="text-xs text-muted-foreground ml-1.5 font-medium">học viên</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            Hoàn thành bài tập trước hạn đề xuất, điểm quiz trung bình đạt 9.2/10.
          </p>
          <div className="pt-1 text-[11px] font-bold text-success group-hover:underline flex items-center gap-1">
            <span>Lọc {aheadCount} học viên nhanh</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        {/* Card Đúng tiến độ */}
        <button
          type="button"
          onClick={() => onOpenModal("ON_TRACK")}
          className="p-3.5 rounded-2xl bg-surface border border-outline-variant/60 hover:border-primary/50 transition-all cursor-pointer space-y-2 group text-left w-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> ĐÚNG TIẾN ĐỘ
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-primary/10 text-primary">
              {onTrackPercent}%
            </span>
          </div>
          <div>
            <span className="text-xl font-black text-foreground font-mono">{onTrackCount}</span>
            <span className="text-xs text-muted-foreground ml-1.5 font-medium">học viên</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            Bám sát thời khóa biểu hàng tuần, nộp bài tập và xem video đúng hạn.
          </p>
          <div className="pt-1 text-[11px] font-bold text-primary group-hover:underline flex items-center gap-1">
            <span>Lọc {onTrackCount} học viên ổn định</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>

        {/* Card Cần nhắc nhở (Chậm tiến độ) - Sử dụng tông Amber dịu mắt, nút CTA rõ ràng */}
        <button
          type="button"
          onClick={() => onOpenModal("BEHIND")}
          className="p-3.5 rounded-2xl bg-surface border border-warning/30 hover:border-warning/60 transition-all cursor-pointer space-y-2 group bg-warning/5 text-left w-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" /> CẦN NHẮC NHỞ
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-warning/15 text-warning border border-warning/20">
              {behindPercent}%
            </span>
          </div>
          <div>
            <span className="text-xl font-black text-warning font-mono">{behindCount}</span>
            <span className="text-xs text-muted-foreground ml-1.5 font-medium">học viên</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            Dừng học quá 7 ngày hoặc chưa vượt qua điểm nghẽn bài học đầu kỳ.
          </p>
          <div className="pt-1 text-[11px] font-bold text-warning group-hover:underline flex items-center gap-1">
            <span>Can thiệp & Nhắc nhở {behindCount} SV</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>
      </div>
    </div>
  );
}
