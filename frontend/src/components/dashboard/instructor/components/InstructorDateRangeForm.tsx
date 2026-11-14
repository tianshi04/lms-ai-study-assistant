"use client";

import React, { useRef, useMemo, useEffect, useState, useCallback } from "react";
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

function parseIso(
  isoStr: string,
  defaultDay = 1,
  defaultMonth = 1,
  defaultYear = 2026,
): { day: number; month: number; year: number } {
  if (isoStr) {
    const parts = isoStr.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const y = parts[0];
      const m = Math.max(1, Math.min(12, parts[1]));
      const maxD = getDaysInMonth(y, m);
      const d = Math.max(1, Math.min(maxD, parts[2]));
      return { day: d, month: m, year: y };
    }
  }
  return {
    day: defaultDay,
    month: defaultMonth,
    year: defaultYear,
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
 * Hỗ trợ gõ bàn phím tự nhiên (clamp trên onBlur) và đảm bảo startDate <= endDate.
 */
export function InstructorDateRangeForm({
  startDate,
  endDate,
  onChange,
  className,
}: InstructorDateRangeFormProps) {
  const startPickerRef = useRef<HTMLInputElement>(null);
  const endPickerRef = useRef<HTMLInputElement>(null);

  const startParsed = useMemo(() => parseIso(startDate, 1, 1, 2026), [startDate]);
  const endParsed = useMemo(() => parseIso(endDate, 15, 1, 2026), [endDate]);

  const [startInput, setStartInput] = useState({
    day: String(startParsed.day),
    month: String(startParsed.month),
    year: String(startParsed.year),
  });

  const [endInput, setEndInput] = useState({
    day: String(endParsed.day),
    month: String(endParsed.month),
    year: String(endParsed.year),
  });

  useEffect(() => {
    setStartInput({
      day: String(startParsed.day),
      month: String(startParsed.month),
      year: String(startParsed.year),
    });
  }, [startParsed]);

  useEffect(() => {
    setEndInput({
      day: String(endParsed.day),
      month: String(endParsed.month),
      year: String(endParsed.year),
    });
  }, [endParsed]);

  // Chuẩn hóa ban đầu nếu prop không hợp lệ
  useEffect(() => {
    const validStartIso = formatIso(startParsed.year, startParsed.month, startParsed.day);
    const validEndIso = formatIso(endParsed.year, endParsed.month, endParsed.day);
    if (validStartIso !== startDate || validEndIso !== endDate) {
      onChange(validStartIso, validEndIso);
    }
  }, [startParsed, endParsed, startDate, endDate, onChange]);

  const commitStart = useCallback(() => {
    const y = Math.max(2020, Math.min(2035, Number(startInput.year) || startParsed.year || 2026));
    const m = Math.max(1, Math.min(12, Number(startInput.month) || startParsed.month || 1));
    const maxD = getDaysInMonth(y, m);
    const d = Math.max(1, Math.min(maxD, Number(startInput.day) || startParsed.day || 1));
    const newStart = formatIso(y, m, d);

    setStartInput({ day: String(d), month: String(m), year: String(y) });

    let validEnd = endDate;
    if (newStart > validEnd) {
      validEnd = newStart;
    }
    onChange(newStart, validEnd);
  }, [startInput, startParsed, endDate, onChange]);

  const commitEnd = useCallback(() => {
    const y = Math.max(2020, Math.min(2035, Number(endInput.year) || endParsed.year || 2026));
    const m = Math.max(1, Math.min(12, Number(endInput.month) || endParsed.month || 1));
    const maxD = getDaysInMonth(y, m);
    const d = Math.max(1, Math.min(maxD, Number(endInput.day) || endParsed.day || 1));
    const newEnd = formatIso(y, m, d);

    setEndInput({ day: String(d), month: String(m), year: String(y) });

    let validStart = startDate;
    if (validStart > newEnd) {
      validStart = newEnd;
    }
    onChange(validStart, newEnd);
  }, [endInput, endParsed, startDate, onChange]);

  const maxStartDays = getDaysInMonth(
    Number(startInput.year) || 2026,
    Number(startInput.month) || 1,
  );
  const maxEndDays = getDaysInMonth(Number(endInput.year) || 2026, Number(endInput.month) || 1);

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
          value={startInput.day}
          onChange={(e) => setStartInput((prev) => ({ ...prev, day: e.target.value }))}
          onBlur={commitStart}
          onKeyDown={(e) => e.key === "Enter" && commitStart()}
          className="w-7 text-center font-mono font-bold text-foreground bg-muted/60 rounded border border-outline-variant/60 focus:border-primary outline-hidden py-0.5 text-[11px]"
          aria-label="Ngày bắt đầu"
          title={`Ngày (1 - ${maxStartDays})`}
        />
        <span className="text-muted-foreground/60 font-bold text-[11px]">/</span>
        <input
          type="number"
          min={1}
          max={12}
          value={startInput.month}
          onChange={(e) => setStartInput((prev) => ({ ...prev, month: e.target.value }))}
          onBlur={commitStart}
          onKeyDown={(e) => e.key === "Enter" && commitStart()}
          className="w-7 text-center font-mono font-bold text-foreground bg-muted/60 rounded border border-outline-variant/60 focus:border-primary outline-hidden py-0.5 text-[11px]"
          aria-label="Tháng bắt đầu"
          title="Tháng (1 - 12)"
        />
        <span className="text-muted-foreground/60 font-bold text-[11px]">/</span>
        <input
          type="number"
          min={2020}
          max={2035}
          value={startInput.year}
          onChange={(e) => setStartInput((prev) => ({ ...prev, year: e.target.value }))}
          onBlur={commitStart}
          onKeyDown={(e) => e.key === "Enter" && commitStart()}
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
                const picked = e.target.value;
                const validEnd = picked > endDate ? picked : endDate;
                onChange(picked, validEnd);
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
          value={endInput.day}
          onChange={(e) => setEndInput((prev) => ({ ...prev, day: e.target.value }))}
          onBlur={commitEnd}
          onKeyDown={(e) => e.key === "Enter" && commitEnd()}
          className="w-7 text-center font-mono font-bold text-foreground bg-muted/60 rounded border border-outline-variant/60 focus:border-primary outline-hidden py-0.5 text-[11px]"
          aria-label="Ngày kết thúc"
          title={`Ngày (1 - ${maxEndDays})`}
        />
        <span className="text-muted-foreground/60 font-bold text-[11px]">/</span>
        <input
          type="number"
          min={1}
          max={12}
          value={endInput.month}
          onChange={(e) => setEndInput((prev) => ({ ...prev, month: e.target.value }))}
          onBlur={commitEnd}
          onKeyDown={(e) => e.key === "Enter" && commitEnd()}
          className="w-7 text-center font-mono font-bold text-foreground bg-muted/60 rounded border border-outline-variant/60 focus:border-primary outline-hidden py-0.5 text-[11px]"
          aria-label="Tháng kết thúc"
          title="Tháng (1 - 12)"
        />
        <span className="text-muted-foreground/60 font-bold text-[11px]">/</span>
        <input
          type="number"
          min={2020}
          max={2035}
          value={endInput.year}
          onChange={(e) => setEndInput((prev) => ({ ...prev, year: e.target.value }))}
          onBlur={commitEnd}
          onKeyDown={(e) => e.key === "Enter" && commitEnd()}
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
                const picked = e.target.value;
                const validStart = picked < startDate ? picked : startDate;
                onChange(validStart, picked);
              }
            }}
          />
        </button>
      </div>
    </div>
  );
}
