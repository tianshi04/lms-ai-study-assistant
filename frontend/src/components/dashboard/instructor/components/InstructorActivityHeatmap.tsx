"use client";

import React, { useMemo } from "react";
import { Flame, Star, Clock, Calendar } from "lucide-react";
import type { HeatmapCell } from "@/gen/catalog/v1/catalog_pb";

interface InstructorActivityHeatmapProps {
  heatmap: HeatmapCell[];
  loading?: boolean;
}

const DAYS_ORDER = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DAY_FULL_LABELS: Record<string, string> = {
  T2: "Thứ Hai",
  T3: "Thứ Ba",
  T4: "Thứ Tư",
  T5: "Thứ Năm",
  T6: "Thứ Sáu",
  T7: "Thứ Bảy",
  CN: "Chủ Nhật",
};

const TIME_SLOTS = [
  "Sáng (06h-12h)",
  "Chiều (12h-18h)",
  "Tối (18h-22h)",
  "Đêm (22h-02h)",
  "Rạng sáng (02h-06h)",
];

const TIME_SLOT_SHORT_LABELS: Record<string, string> = {
  "Sáng (06h-12h)": "Sáng (06-12h)",
  "Chiều (12h-18h)": "Chiều (12-18h)",
  "Tối (18h-22h)": "Tối (18-22h)",
  "Đêm (22h-02h)": "Đêm (22-02h)",
  "Rạng sáng (02h-06h)": "R.sáng (02-06h)",
};

export function InstructorActivityHeatmap({
  heatmap,
  loading = false,
}: InstructorActivityHeatmapProps) {
  // Tìm ô có lượng truy cập cao nhất (Peak cell)
  const { maxCount, peakCell, cellLookup } = useMemo(() => {
    let max = 0;
    let peak: HeatmapCell | null = null;
    const lookup = new Map<string, HeatmapCell>();

    for (const cell of heatmap) {
      const key = `${cell.day}_${cell.timeSlot}`;
      lookup.set(key, cell);
      if (cell.count > max) {
        max = cell.count;
      }
      if (cell.isPeak) {
        peak = cell;
      }
    }

    return { maxCount: max, peakCell: peak, cellLookup: lookup };
  }, [heatmap]);

  // Hàm xác định màu sắc dựa trên mật độ hoạt động (Semantic Tokens)
  const getCellIntensityStyle = (count: number, isPeak: boolean) => {
    if (count === 0 || maxCount === 0) {
      return "bg-muted/40 text-muted-foreground/60 border-border/40";
    }
    const ratio = count / maxCount;
    if (isPeak) {
      return "bg-primary text-primary-foreground font-bold border-primary ring-2 ring-primary/30 shadow-xs";
    }
    if (ratio >= 0.75) {
      return "bg-primary/80 text-primary-foreground font-semibold border-primary/90";
    }
    if (ratio >= 0.45) {
      return "bg-primary/45 text-foreground font-medium border-primary/50";
    }
    if (ratio >= 0.2) {
      return "bg-primary/25 text-foreground border-primary/30";
    }
    return "bg-primary/10 text-muted-foreground border-primary/20";
  };

  return (
    <div className="space-y-4 pt-1">
      {/* HEADER VÀ TÓM TẮT GIỜ CAO ĐIỂM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Sơ đồ Mật độ Khung giờ Học tập
            </h3>
            <p className="text-xs text-muted-foreground">
              Thống kê thời điểm học viên tương tác nhiều nhất trong tuần
            </p>
          </div>
        </div>

        {peakCell && peakCell.count > 0 ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-primary/10 border border-primary/30 text-xs font-semibold text-primary">
            <Star className="w-3.5 h-3.5 fill-primary text-primary" aria-hidden="true" />
            <span>
              Giờ cao điểm:{" "}
              <strong>
                {DAY_FULL_LABELS[peakCell.day] || peakCell.day} • {peakCell.timeSlot}
              </strong>{" "}
              ({peakCell.count} sinh viên)
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-muted/60 border border-border text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Chưa ghi nhận thời điểm cao điểm</span>
          </div>
        )}
      </div>

      {/* MA TRẬN SƠ ĐỒ NHIỆT (7 NGÀY X 5 KHUNG GIỜ: PHỦ TRỌN 24H) */}
      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          {/* Hàng tiêu đề khung giờ */}
          <div className="grid grid-cols-6 gap-2 text-center text-xs font-semibold text-muted-foreground pb-2 border-b border-border">
            <div className="text-left pl-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Thứ</span>
            </div>
            {TIME_SLOTS.map((slot) => (
              <div key={slot} className="truncate">
                {TIME_SLOT_SHORT_LABELS[slot] || slot}
              </div>
            ))}
          </div>

          {/* Các hàng thứ trong tuần */}
          <div className="space-y-1.5 pt-2">
            {DAYS_ORDER.map((day) => {
              return (
                <div key={day} className="grid grid-cols-6 gap-2 items-center">
                  <div className="text-xs font-bold text-foreground pl-2 flex items-center gap-1.5">
                    <span className="w-6 font-mono">{day}</span>
                    <span className="hidden sm:inline text-[11px] font-normal text-muted-foreground">
                      ({DAY_FULL_LABELS[day]})
                    </span>
                  </div>

                  {TIME_SLOTS.map((slot) => {
                    const cell = cellLookup.get(`${day}_${slot}`);
                    const count = cell ? cell.count : 0;
                    const isPeak = Boolean(cell?.isPeak);

                    return (
                      <div
                        key={`${day}_${slot}`}
                        title={`${DAY_FULL_LABELS[day] || day}, ${slot}: ${count} sinh viên học bài`}
                        className={`h-9 rounded-xl border flex items-center justify-center transition-all cursor-default select-none ${getCellIntensityStyle(
                          count,
                          isPeak,
                        )}`}
                      >
                        {loading ? (
                          <span className="text-[10px] text-muted-foreground">…</span>
                        ) : count > 0 ? (
                          <span className="text-xs font-mono font-bold flex items-center gap-1">
                            {count}
                            {isPeak && (
                              <Star className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
                            )}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CHÚ THÍCH DẢI MÀU SẮC (LEGEND) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Mức độ hoạt động:</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px]">Thấp</span>
            <span className="w-3.5 h-3.5 rounded-sm bg-muted/40 border border-border/40 inline-block" />
            <span className="w-3.5 h-3.5 rounded-sm bg-primary/20 border border-primary/30 inline-block" />
            <span className="w-3.5 h-3.5 rounded-sm bg-primary/50 border border-primary/60 inline-block" />
            <span className="w-3.5 h-3.5 rounded-sm bg-primary text-primary-foreground border border-primary inline-block" />
            <span className="text-[10px]">Cao điểm</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="w-3 h-3 text-primary fill-primary" aria-hidden="true" />
          <span>Biểu tượng sao đánh dấu khung giờ sinh viên học tập đông nhất</span>
        </div>
      </div>
    </div>
  );
}
