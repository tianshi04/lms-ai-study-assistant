"use client";

import React, { useState, useMemo } from "react";
import { Flame, Clock, Info } from "lucide-react";

export interface InstructorHeatmapProps {
  dateRange?: string; // "today" | "this_week" | "7d" | "last_week" | "this_month" | "last_month" | "custom"
  learnerFilter?: "all" | "in_progress" | "completed";
  currentMonthNumber?: number;
  lastMonthNumber?: number;
  heatmapData?: Array<{ day: string; timeSlot: string; count: number; isPeak?: boolean }>;
  totalActiveInPeriod?: number;
  isLoading?: boolean;
}

interface HeatmapCell {
  day: string;
  timeSlot: string;
  count: number;
  isPeak?: boolean;
  isFuture?: boolean;
}

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const TIME_SLOTS = ["Sáng (06h-12h)", "Chiều (12h-18h)", "Tối (18h-22h)", "Đêm (22h-02h)"];

// 1. Dữ liệu 7 ngày gần nhất (Rolling 7 ngày - Đầy đủ dữ liệu thực tế)
const DATA_7D: HeatmapCell[] = [
  { day: "T2", timeSlot: "Sáng (06h-12h)", count: 8 },
  { day: "T2", timeSlot: "Chiều (12h-18h)", count: 14 },
  { day: "T2", timeSlot: "Tối (18h-22h)", count: 28 },
  { day: "T2", timeSlot: "Đêm (22h-02h)", count: 11 },

  { day: "T3", timeSlot: "Sáng (06h-12h)", count: 6 },
  { day: "T3", timeSlot: "Chiều (12h-18h)", count: 12 },
  { day: "T3", timeSlot: "Tối (18h-22h)", count: 24 },
  { day: "T3", timeSlot: "Đêm (22h-02h)", count: 9 },

  { day: "T4", timeSlot: "Sáng (06h-12h)", count: 9 },
  { day: "T4", timeSlot: "Chiều (12h-18h)", count: 16 },
  { day: "T4", timeSlot: "Tối (18h-22h)", count: 31 },
  { day: "T4", timeSlot: "Đêm (22h-02h)", count: 14 },

  { day: "T5", timeSlot: "Sáng (06h-12h)", count: 7 },
  { day: "T5", timeSlot: "Chiều (12h-18h)", count: 15 },
  { day: "T5", timeSlot: "Tối (18h-22h)", count: 29 },
  { day: "T5", timeSlot: "Đêm (22h-02h)", count: 12 },

  { day: "T6", timeSlot: "Sáng (06h-12h)", count: 11 },
  { day: "T6", timeSlot: "Chiều (12h-18h)", count: 20 },
  { day: "T6", timeSlot: "Tối (18h-22h)", count: 36 },
  { day: "T6", timeSlot: "Đêm (22h-02h)", count: 18 },

  { day: "T7", timeSlot: "Sáng (06h-12h)", count: 16 },
  { day: "T7", timeSlot: "Chiều (12h-18h)", count: 26 },
  { day: "T7", timeSlot: "Tối (18h-22h)", count: 48, isPeak: true },
  { day: "T7", timeSlot: "Đêm (22h-02h)", count: 22 },

  { day: "CN", timeSlot: "Sáng (06h-12h)", count: 19 },
  { day: "CN", timeSlot: "Chiều (12h-18h)", count: 28 },
  { day: "CN", timeSlot: "Tối (18h-22h)", count: 45, isPeak: true },
  { day: "CN", timeSlot: "Đêm (22h-02h)", count: 16 },
];

// 2. Dữ liệu Tuần này (Thứ 2 & Thứ 3 hôm nay có số liệu; Thứ 4..CN tương lai chưa diễn ra)
const DATA_THIS_WEEK: HeatmapCell[] = [
  { day: "T2", timeSlot: "Sáng (06h-12h)", count: 8 },
  { day: "T2", timeSlot: "Chiều (12h-18h)", count: 14 },
  { day: "T2", timeSlot: "Tối (18h-22h)", count: 28, isPeak: true },
  { day: "T2", timeSlot: "Đêm (22h-02h)", count: 11 },

  { day: "T3", timeSlot: "Sáng (06h-12h)", count: 6 },
  { day: "T3", timeSlot: "Chiều (12h-18h)", count: 12 },
  { day: "T3", timeSlot: "Tối (18h-22h)", count: 16 },
  { day: "T3", timeSlot: "Đêm (22h-02h)", count: 0 },

  { day: "T4", timeSlot: "Sáng (06h-12h)", count: 0, isFuture: true },
  { day: "T4", timeSlot: "Chiều (12h-18h)", count: 0, isFuture: true },
  { day: "T4", timeSlot: "Tối (18h-22h)", count: 0, isFuture: true },
  { day: "T4", timeSlot: "Đêm (22h-02h)", count: 0, isFuture: true },

  { day: "T5", timeSlot: "Sáng (06h-12h)", count: 0, isFuture: true },
  { day: "T5", timeSlot: "Chiều (12h-18h)", count: 0, isFuture: true },
  { day: "T5", timeSlot: "Tối (18h-22h)", count: 0, isFuture: true },
  { day: "T5", timeSlot: "Đêm (22h-02h)", count: 0, isFuture: true },

  { day: "T6", timeSlot: "Sáng (06h-12h)", count: 0, isFuture: true },
  { day: "T6", timeSlot: "Chiều (12h-18h)", count: 0, isFuture: true },
  { day: "T6", timeSlot: "Tối (18h-22h)", count: 0, isFuture: true },
  { day: "T6", timeSlot: "Đêm (22h-02h)", count: 0, isFuture: true },

  { day: "T7", timeSlot: "Sáng (06h-12h)", count: 0, isFuture: true },
  { day: "T7", timeSlot: "Chiều (12h-18h)", count: 0, isFuture: true },
  { day: "T7", timeSlot: "Tối (18h-22h)", count: 0, isFuture: true },
  { day: "T7", timeSlot: "Đêm (22h-02h)", count: 0, isFuture: true },

  { day: "CN", timeSlot: "Sáng (06h-12h)", count: 0, isFuture: true },
  { day: "CN", timeSlot: "Chiều (12h-18h)", count: 0, isFuture: true },
  { day: "CN", timeSlot: "Tối (18h-22h)", count: 0, isFuture: true },
  { day: "CN", timeSlot: "Đêm (22h-02h)", count: 0, isFuture: true },
];

// 3. Dữ liệu Tuần trước (Trọn vẹn tuần vừa rồi)
const DATA_LAST_WEEK: HeatmapCell[] = [
  { day: "T2", timeSlot: "Sáng (06h-12h)", count: 10 },
  { day: "T2", timeSlot: "Chiều (12h-18h)", count: 18 },
  { day: "T2", timeSlot: "Tối (18h-22h)", count: 32 },
  { day: "T2", timeSlot: "Đêm (22h-02h)", count: 14 },

  { day: "T3", timeSlot: "Sáng (06h-12h)", count: 8 },
  { day: "T3", timeSlot: "Chiều (12h-18h)", count: 15 },
  { day: "T3", timeSlot: "Tối (18h-22h)", count: 26 },
  { day: "T3", timeSlot: "Đêm (22h-02h)", count: 10 },

  { day: "T4", timeSlot: "Sáng (06h-12h)", count: 12 },
  { day: "T4", timeSlot: "Chiều (12h-18h)", count: 22 },
  { day: "T4", timeSlot: "Tối (18h-22h)", count: 38 },
  { day: "T4", timeSlot: "Đêm (22h-02h)", count: 16 },

  { day: "T5", timeSlot: "Sáng (06h-12h)", count: 9 },
  { day: "T5", timeSlot: "Chiều (12h-18h)", count: 19 },
  { day: "T5", timeSlot: "Tối (18h-22h)", count: 34 },
  { day: "T5", timeSlot: "Đêm (22h-02h)", count: 13 },

  { day: "T6", timeSlot: "Sáng (06h-12h)", count: 14 },
  { day: "T6", timeSlot: "Chiều (12h-18h)", count: 24 },
  { day: "T6", timeSlot: "Tối (18h-22h)", count: 42 },
  { day: "T6", timeSlot: "Đêm (22h-02h)", count: 20 },

  { day: "T7", timeSlot: "Sáng (06h-12h)", count: 20 },
  { day: "T7", timeSlot: "Chiều (12h-18h)", count: 30 },
  { day: "T7", timeSlot: "Tối (18h-22h)", count: 54, isPeak: true },
  { day: "T7", timeSlot: "Đêm (22h-02h)", count: 26 },

  { day: "CN", timeSlot: "Sáng (06h-12h)", count: 22 },
  { day: "CN", timeSlot: "Chiều (12h-18h)", count: 32 },
  { day: "CN", timeSlot: "Tối (18h-22h)", count: 50, isPeak: true },
  { day: "CN", timeSlot: "Đêm (22h-02h)", count: 19 },
];

// 4. Dữ liệu Tháng này (Mật độ trung bình hàng tuần - Weekly Habit Pattern)
// Thay vì cộng dồn cơ học làm số nhảy vọt phi thực tế, hiển thị số lượt học trung bình / buổi
const DATA_THIS_MONTH_AVG: HeatmapCell[] = [
  { day: "T2", timeSlot: "Sáng (06h-12h)", count: 10 },
  { day: "T2", timeSlot: "Chiều (12h-18h)", count: 17 },
  { day: "T2", timeSlot: "Tối (18h-22h)", count: 31 },
  { day: "T2", timeSlot: "Đêm (22h-02h)", count: 13 },

  { day: "T3", timeSlot: "Sáng (06h-12h)", count: 8 },
  { day: "T3", timeSlot: "Chiều (12h-18h)", count: 15 },
  { day: "T3", timeSlot: "Tối (18h-22h)", count: 28 },
  { day: "T3", timeSlot: "Đêm (22h-02h)", count: 11 },

  { day: "T4", timeSlot: "Sáng (06h-12h)", count: 11 },
  { day: "T4", timeSlot: "Chiều (12h-18h)", count: 20 },
  { day: "T4", timeSlot: "Tối (18h-22h)", count: 34 },
  { day: "T4", timeSlot: "Đêm (22h-02h)", count: 15 },

  { day: "T5", timeSlot: "Sáng (06h-12h)", count: 9 },
  { day: "T5", timeSlot: "Chiều (12h-18h)", count: 18 },
  { day: "T5", timeSlot: "Tối (18h-22h)", count: 32 },
  { day: "T5", timeSlot: "Đêm (22h-02h)", count: 14 },

  { day: "T6", timeSlot: "Sáng (06h-12h)", count: 13 },
  { day: "T6", timeSlot: "Chiều (12h-18h)", count: 23 },
  { day: "T6", timeSlot: "Tối (18h-22h)", count: 40 },
  { day: "T6", timeSlot: "Đêm (22h-02h)", count: 20 },

  { day: "T7", timeSlot: "Sáng (06h-12h)", count: 19 },
  { day: "T7", timeSlot: "Chiều (12h-18h)", count: 30 },
  { day: "T7", timeSlot: "Tối (18h-22h)", count: 53, isPeak: true },
  { day: "T7", timeSlot: "Đêm (22h-02h)", count: 25 },

  { day: "CN", timeSlot: "Sáng (06h-12h)", count: 21 },
  { day: "CN", timeSlot: "Chiều (12h-18h)", count: 32 },
  { day: "CN", timeSlot: "Tối (18h-22h)", count: 50, isPeak: true },
  { day: "CN", timeSlot: "Đêm (22h-02h)", count: 19 },
];

// 5. Dữ liệu Tháng trước (Mật độ trung bình hàng tuần)
const DATA_LAST_MONTH_AVG: HeatmapCell[] = [
  { day: "T2", timeSlot: "Sáng (06h-12h)", count: 9 },
  { day: "T2", timeSlot: "Chiều (12h-18h)", count: 16 },
  { day: "T2", timeSlot: "Tối (18h-22h)", count: 29 },
  { day: "T2", timeSlot: "Đêm (22h-02h)", count: 12 },

  { day: "T3", timeSlot: "Sáng (06h-12h)", count: 7 },
  { day: "T3", timeSlot: "Chiều (12h-18h)", count: 14 },
  { day: "T3", timeSlot: "Tối (18h-22h)", count: 26 },
  { day: "T3", timeSlot: "Đêm (22h-02h)", count: 10 },

  { day: "T4", timeSlot: "Sáng (06h-12h)", count: 10 },
  { day: "T4", timeSlot: "Chiều (12h-18h)", count: 19 },
  { day: "T4", timeSlot: "Tối (18h-22h)", count: 32 },
  { day: "T4", timeSlot: "Đêm (22h-02h)", count: 14 },

  { day: "T5", timeSlot: "Sáng (06h-12h)", count: 8 },
  { day: "T5", timeSlot: "Chiều (12h-18h)", count: 17 },
  { day: "T5", timeSlot: "Tối (18h-22h)", count: 30 },
  { day: "T5", timeSlot: "Đêm (22h-02h)", count: 13 },

  { day: "T6", timeSlot: "Sáng (06h-12h)", count: 12 },
  { day: "T6", timeSlot: "Chiều (12h-18h)", count: 21 },
  { day: "T6", timeSlot: "Tối (18h-22h)", count: 38 },
  { day: "T6", timeSlot: "Đêm (22h-02h)", count: 18 },

  { day: "T7", timeSlot: "Sáng (06h-12h)", count: 17 },
  { day: "T7", timeSlot: "Chiều (12h-18h)", count: 28 },
  { day: "T7", timeSlot: "Tối (18h-22h)", count: 49, isPeak: true },
  { day: "T7", timeSlot: "Đêm (22h-02h)", count: 23 },

  { day: "CN", timeSlot: "Sáng (06h-12h)", count: 19 },
  { day: "CN", timeSlot: "Chiều (12h-18h)", count: 30 },
  { day: "CN", timeSlot: "Tối (18h-22h)", count: 47, isPeak: true },
  { day: "CN", timeSlot: "Đêm (22h-02h)", count: 18 },
];

export function InstructorHeatmap({
  dateRange = "7d",
  learnerFilter: _learnerFilter = "all",
  currentMonthNumber = 11,
  lastMonthNumber = 10,
  heatmapData,
  totalActiveInPeriod,
  isLoading = false,
}: InstructorHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const isAverageMode = dateRange === "this_month" || dateRange === "last_month";

  // Chọn bộ dữ liệu theo mốc thời gian từ API hoặc fallback
  const currentData = useMemo(() => {
    if (heatmapData && heatmapData.length > 0) {
      return heatmapData.map((d) => ({
        day: d.day,
        timeSlot: d.timeSlot,
        count: d.count,
        isPeak: d.isPeak,
        isFuture: false,
      }));
    }
    switch (dateRange) {
      case "this_week":
      case "today":
        return DATA_THIS_WEEK;
      case "last_week":
        return DATA_LAST_WEEK;
      case "this_month":
        return DATA_THIS_MONTH_AVG;
      case "last_month":
        return DATA_LAST_MONTH_AVG;
      case "7d":
      default:
        return DATA_7D;
    }
  }, [dateRange, heatmapData]);

  // Tổng số lượt học trong kỳ
  const totalInteractions = useMemo(() => {
    if (totalActiveInPeriod !== undefined) return totalActiveInPeriod;
    if (heatmapData && heatmapData.length > 0) {
      return currentData.reduce((acc, c) => acc + c.count, 0);
    }
    if (dateRange === "this_month") return 2150;
    if (dateRange === "last_month") return 1980;
    return currentData.reduce((acc, c) => acc + c.count, 0);
  }, [currentData, dateRange, heatmapData, totalActiveInPeriod]);

  // Nhãn thời gian hiển thị
  const timeRangeLabel = useMemo(() => {
    switch (dateRange) {
      case "today":
        return "Hôm nay (24h)";
      case "this_week":
        return "Tuần này (02/11 - 08/11)";
      case "last_week":
        return "Tuần trước";
      case "this_month":
        return `Tháng ${currentMonthNumber} (Mật độ trung bình)`;
      case "last_month":
        return `Tháng ${lastMonthNumber} (Mật độ trung bình)`;
      case "custom":
        return "Tùy chọn khoảng ngày";
      case "7d":
      default:
        return "7 ngày gần nhất";
    }
  }, [dateRange, currentMonthNumber, lastMonthNumber]);

  // Giá trị cao nhất để chuẩn hóa gradient màu
  const maxVal = useMemo(() => {
    return Math.max(1, ...currentData.map((c) => c.count));
  }, [currentData]);

  const getCellColor = (count: number, isPeak?: boolean, isFuture?: boolean) => {
    if (isFuture) {
      return "border border-dashed border-outline-variant/60 bg-surface text-muted-foreground/40";
    }
    if (isPeak) {
      return "bg-primary text-primary-foreground font-bold shadow-xs";
    }
    const ratio = count / maxVal;
    if (ratio >= 0.75) return "bg-primary/85 text-primary-foreground font-semibold";
    if (ratio >= 0.5) return "bg-primary/55 text-foreground font-medium";
    if (ratio >= 0.25) return "bg-primary/30 text-foreground";
    if (count > 0) return "bg-primary/10 text-foreground";
    return "bg-muted/40 text-muted-foreground/60";
  };

  return (
    <div
      className={`space-y-3 rounded-2xl bg-surface border border-outline-variant/60 p-4 ${isLoading ? "opacity-60 pointer-events-none transition-opacity" : ""}`}
    >
      {/* Header Heatmap: Không còn nút thời gian trùng lặp vì đã đồng bộ với bộ lọc phía trên */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-outline-variant/40">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground">Bản Đồ Nhiệt Mật Độ Giờ Học</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                {timeRangeLabel}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-outline-variant/50">
                {isAverageMode
                  ? `Tổng ~${totalInteractions.toLocaleString("vi-VN")} lượt • TB ~${Math.round(totalInteractions / 4).toLocaleString("vi-VN")} lượt/tuần`
                  : `${totalInteractions.toLocaleString("vi-VN")} lượt học`}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {isAverageMode
                ? `Mật độ thói quen học tập trung bình theo thứ trong tuần (Lượt học trung bình / buổi trong Tháng ${dateRange === "last_month" ? lastMonthNumber : currentMonthNumber})`
                : dateRange === "today"
                  ? "Phân bố số lượng sinh viên truy cập trong tuần • Đang làm nổi bật Thứ 3 (Hôm nay)"
                  : "Phân bố số lượng sinh viên truy cập theo 4 khung giờ trong tuần"}
            </span>
          </div>
        </div>

        {/* Legend thang nhiệt độ & Giờ vàng */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
            <span>Ít</span>
            <span className="w-2.5 h-2.5 rounded bg-muted/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded bg-primary/25 inline-block" />
            <span className="w-2.5 h-2.5 rounded bg-primary/60 inline-block" />
            <span className="w-2.5 h-2.5 rounded bg-primary inline-block" />
            <span>Nhiều</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold flex items-center gap-1.5 shrink-0">
            <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Khung giờ vàng: T7 & CN (20h - 22h30)</span>
          </div>
        </div>
      </div>

      {/* Grid Ma Trận Heatmap */}
      <div className="overflow-x-auto overflow-y-hidden p-1.5 scrollbar-thin">
        <div className="min-w-[500px]">
          {/* Header Thứ */}
          <div className="grid grid-cols-8 gap-1.5 text-center text-[11px] font-bold pb-1 text-muted-foreground">
            <div className="text-left font-mono text-[10px]">Khung giờ</div>
            {DAYS.map((d) => {
              const isToday = (dateRange === "today" || dateRange === "this_week") && d === "T3";
              return (
                <div
                  key={d}
                  className={`font-mono flex flex-col items-center justify-center ${
                    isToday ? "text-primary font-black" : ""
                  }`}
                >
                  <span>{d}</span>
                  {isToday && (
                    <span className="text-[9px] font-sans font-bold px-1 py-0.2 rounded bg-primary/10 text-primary">
                      Hôm nay
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hàng Khung Giờ */}
          <div className="space-y-1.5">
            {TIME_SLOTS.map((slot) => (
              <div key={slot} className="grid grid-cols-8 gap-1.5 items-center">
                <div className="text-[10px] font-mono text-muted-foreground truncate pr-1">
                  {slot.split(" ")[0]}
                </div>
                {DAYS.map((d) => {
                  const cell = currentData.find((c) => c.day === d && c.timeSlot === slot) || {
                    day: d,
                    timeSlot: slot,
                    count: 0,
                  };
                  const isHovered = hoveredCell?.day === d && hoveredCell?.timeSlot === slot;

                  return (
                    <button
                      type="button"
                      key={`${d}-${slot}`}
                      disabled={cell.isFuture}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-8 rounded-lg transition-colors flex items-center justify-center text-[10px] relative ${getCellColor(
                        cell.count,
                        cell.isPeak,
                        cell.isFuture,
                      )} ${
                        isHovered
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-surface z-10 font-bold shadow-xs brightness-105"
                          : ""
                      } ${cell.isFuture ? "cursor-default" : "cursor-pointer"}`}
                      aria-label={`${d}, ${slot}: ${cell.isFuture ? "Chưa diễn ra" : isAverageMode ? `Trung bình ${cell.count} lượt/buổi` : `${cell.count} lượt`}`}
                    >
                      <span>{cell.isFuture ? "—" : cell.count}</span>
                      {cell.isPeak && (
                        <Flame
                          className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-amber-300 fill-amber-300 pointer-events-none"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Info & Chú giải */}
      <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between gap-2 text-xs min-h-[32px]">
        <div className="flex items-center gap-2 min-w-0">
          {hoveredCell ? (
            <span className="font-mono text-primary font-bold truncate">
              {hoveredCell.day} • {hoveredCell.timeSlot}:{" "}
              {hoveredCell.isFuture ? (
                <span className="text-muted-foreground font-normal">Chưa diễn ra</span>
              ) : (
                <>
                  {isAverageMode
                    ? `Trung bình ~${hoveredCell.count} lượt/buổi`
                    : `${hoveredCell.count} lượt học viên tương tác`}
                  {hoveredCell.isPeak ? " (Đỉnh điểm giờ vàng 🔥)" : ""}
                </>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1.5 truncate">
              <Info className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              {isAverageMode
                ? "Rê chuột vào từng ô để xem số lượng sinh viên tương tác trung bình mỗi buổi"
                : "Rê chuột vào từng ô để xem số lượng sinh viên tương tác thực tế"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
