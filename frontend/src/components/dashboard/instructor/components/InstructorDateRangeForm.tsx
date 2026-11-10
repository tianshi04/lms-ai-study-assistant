"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InstructorDateRangeFormProps {
  startDate: string; // Định dạng ISO: YYYY-MM-DD
  endDate: string; // Định dạng ISO: YYYY-MM-DD
  onChange: (startDate: string, endDate: string) => void;
  className?: string;
}

/**
 * Tính số ngày tối đa trong một tháng cụ thể theo lịch Gregory.
 * Tháng 11 luôn có tối đa 30 ngày (tránh lỗi 31.11). Tháng 2 có 28 hoặc 29 ngày theo năm nhuận.
 */
export function getDaysInMonth(year: number, month: number): number {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

function parseIso(isoStr: string, fallback: Date): { day: number; month: number; year: number } {
  if (!isoStr) {
    return {
      day: fallback.getDate(),
      month: fallback.getMonth() + 1,
      year: fallback.getFullYear(),
    };
  }
  const parts = isoStr.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const y = parts[0];
    const m = Math.max(1, Math.min(12, parts[1]));
    const maxD = getDaysInMonth(y, m);
    const d = Math.max(1, Math.min(maxD, parts[2]));
    return { day: d, month: m, year: y };
  }
  return {
    day: fallback.getDate(),
    month: fallback.getMonth() + 1,
    year: fallback.getFullYear(),
  };
}

function formatIso(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Form tùy chọn khoảng ngày chuẩn định dạng Việt Nam: Ngày -> Tháng -> Năm (DD/MM/YYYY).
 * Tự động kiểm tra và giới hạn số ngày hợp lệ theo từng tháng (vd: Tháng 11 tối đa 30 ngày).
 */
export function InstructorDateRangeForm({
  startDate,
  endDate,
  onChange,
  className,
}: InstructorDateRangeFormProps) {
  const startPickerRef = useRef<HTMLInputElement>(null);
  const endPickerRef = useRef<HTMLInputElement>(null);

  const [fallbackNow] = useState(() => new Date());
  const [fallbackPast] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d;
  });

  const startParsed = useMemo(() => parseIso(startDate, fallbackPast), [startDate, fallbackPast]);
  const endParsed = useMemo(() => parseIso(endDate, fallbackNow), [endDate, fallbackNow]);

  // Tự động chuẩn hóa nếu dữ liệu ban đầu chứa ngày không tồn tại (vd: 31.11 -> 30.11)
  useEffect(() => {
    const validStartIso = formatIso(startParsed.year, startParsed.month, startParsed.day);
    const validEndIso = formatIso(endParsed.year, endParsed.month, endParsed.day);
    if (validStartIso !== startDate || validEndIso !== endDate) {
      onChange(validStartIso, validEndIso);
    }
  }, [startParsed, endParsed, startDate, endDate, onChange]);

  const maxStartDays = getDaysInMonth(startParsed.year, startParsed.month);
  const maxEndDays = getDaysInMonth(endParsed.year, endParsed.month);

  const handleUpdateStart = (day: number, month: number, year: number) => {
    const y = Math.max(2020, Math.min(2035, year || 2026));
    const m = Math.max(1, Math.min(12, month || 1));
    const maxD = getDaysInMonth(y, m);
    const d = Math.max(1, Math.min(maxD, day || 1));
    const newStart = formatIso(y, m, d);
    onChange(newStart, endDate);
  };

  const handleUpdateEnd = (day: number, month: number, year: number) => {
    const y = Math.max(2020, Math.min(2035, year || 2026));
    const m = Math.max(1, Math.min(12, month || 1));
    const maxD = getDaysInMonth(y, m);
    const d = Math.max(1, Math.min(maxD, day || 1));
    const newEnd = formatIso(y, m, d);
    onChange(startDate, newEnd);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150",
        className,
      )}
    >
      {/* Khối Từ ngày (Ngày / Tháng / Năm) */}
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface border border-outline-variant shadow-2xs">
        <span className="text-[10px] text-muted-foreground font-bold tracking-tight">Từ ngày:</span>
        <input
          type="number"
          min={1}
          max={maxStartDays}
          value={startParsed.day}
          onChange={(e) =>
            handleUpdateStart(Number(e.target.value), startParsed.month, startParsed.year)
          }
          className="w-7 text-center font-mono font-bold text-foreground bg-muted/60 rounded border border-outline-variant/60 focus:border-primary outline-hidden py-0.5 text-[11px]"
          aria-label="Ngày bắt đầu"
          title={`Ngày (1 - ${maxStartDays})`}
        />
        <span className="text-muted-foreground/60 font-bold text-[11px]">/</span>
        <input
          type="number"
          min={1}
          max={12}
          value={startParsed.month}
          onChange={(e) =>
            handleUpdateStart(startParsed.day, Number(e.target.value), startParsed.year)
          }
          className="w-7 text-center font-mono font-bold text-foreground bg-muted/60 rounded border border-outline-variant/60 focus:border-primary outline-hidden py-0.5 text-[11px]"
          aria-label="Tháng bắt đầu"
          title="Tháng (1 - 12)"
        />
        <span className="text-muted-foreground/60 font-bold text-[11px]">/</span>
        <input
          type="number"
          min={2020}
          max={2035}
          value={startParsed.year}
          onChange={(e) =>
            handleUpdateStart(startParsed.day, startParsed.month, Number(e.target.value))
          }
          className="w-12 text-center font-mono font-bold text-foreground bg-muted/60 rounded border border-outline-variant/60 focus:border-primary outline-hidden py-0.5 text-[11px]"
          aria-label="Năm bắt đầu"
          title="Năm"
        />
        <button
          type="button"
          onClick={() => startPickerRef.current?.showPicker?.()}
          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors cursor-pointer"
          title="Chọn ngày bắt đầu từ lịch"
          aria-label="Chọn ngày bắt đầu từ lịch"
        >
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
          <input
            ref={startPickerRef}
            type="date"
            className="sr-only"
            tabIndex={-1}
            value={startDate}
            onChange={(e) => {
              if (e.target.value) {
                onChange(e.target.value, endDate);
              }
            }}
          />
        </button>
      </div>

      <span className="text-muted-foreground font-bold text-xs">→</span>

      {/* Khối Đến ngày (Ngày / Tháng / Năm) */}
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface border border-outline-variant shadow-2xs">
        <span className="text-[10px] text-muted-foreground font-bold tracking-tight">
          Đến ngày:
        </span>
        <input
          type="number"
          min={1}
          max={maxEndDays}
          value={endParsed.day}
          onChange={(e) => handleUpdateEnd(Number(e.target.value), endParsed.month, endParsed.year)}
          className="w-7 text-center font-mono font-bold text-foreground bg-muted/60 rounded border border-outline-variant/60 focus:border-primary outline-hidden py-0.5 text-[11px]"
          aria-label="Ngày kết thúc"
          title={`Ngày (1 - ${maxEndDays})`}
        />
        <span className="text-muted-foreground/60 font-bold text-[11px]">/</span>
        <input
          type="number"
          min={1}
          max={12}
          value={endParsed.month}
          onChange={(e) => handleUpdateEnd(endParsed.day, Number(e.target.value), endParsed.year)}
          className="w-7 text-center font-mono font-bold text-foreground bg-muted/60 rounded border border-outline-variant/60 focus:border-primary outline-hidden py-0.5 text-[11px]"
          aria-label="Tháng kết thúc"
          title="Tháng (1 - 12)"
        />
        <span className="text-muted-foreground/60 font-bold text-[11px]">/</span>
        <input
          type="number"
          min={2020}
          max={2035}
          value={endParsed.year}
          onChange={(e) => handleUpdateEnd(endParsed.day, endParsed.month, Number(e.target.value))}
          className="w-12 text-center font-mono font-bold text-foreground bg-muted/60 rounded border border-outline-variant/60 focus:border-primary outline-hidden py-0.5 text-[11px]"
          aria-label="Năm kết thúc"
          title="Năm"
        />
        <button
          type="button"
          onClick={() => endPickerRef.current?.showPicker?.()}
          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors cursor-pointer"
          title="Chọn ngày kết thúc từ lịch"
          aria-label="Chọn ngày kết thúc từ lịch"
        >
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
          <input
            ref={endPickerRef}
            type="date"
            className="sr-only"
            tabIndex={-1}
            value={endDate}
            onChange={(e) => {
              if (e.target.value) {
                onChange(startDate, e.target.value);
              }
            }}
          />
        </button>
      </div>
    </div>
  );
}
