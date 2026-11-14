"use client";

import React from "react";
import { GitCommit, BarChart3, AlertTriangle, CheckCircle2, Award } from "lucide-react";
import type { CalculatedWeek } from "../types";

export interface InstructorWeeklyFunnelTabProps {
  calculatedWeeks: CalculatedWeek[];
  bottleneckWeek: CalculatedWeek | null;
  funnelViewType: "pipeline" | "bars";
  onChangeFunnelViewType: (type: "pipeline" | "bars") => void;
  selectedWeekFilter: number | null;
  onSelectWeekFilter: (weekNumber: number | null) => void;
  totalStudents: number;
}

export function InstructorWeeklyFunnelTab({
  calculatedWeeks,
  bottleneckWeek,
  funnelViewType,
  onChangeFunnelViewType,
  selectedWeekFilter,
  onSelectWeekFilter,
  totalStudents,
}: InstructorWeeklyFunnelTabProps) {
  return (
    <div className="space-y-4">
      {/* Header điều khiển: Chuyển kiểu hiển thị & Cảnh báo điểm nghẽn */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-outline-variant/50">
        <div>
          <p className="text-xs font-bold text-foreground">
            Lộ Trình Tuần Học &amp; Phễu Tỷ Lệ Vượt Qua
          </p>
          <p className="text-[11px] text-muted-foreground">
            Theo dõi mức độ hoàn thành qua từng tuần để phát hiện rào cản kiến thức:
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle 2 chế độ sơ đồ tuần */}
          <div className="p-0.5 rounded-lg bg-muted flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeFunnelViewType("pipeline")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                funnelViewType === "pipeline"
                  ? "bg-surface text-primary shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Xem dạng dòng chảy lộ trình"
            >
              <GitCommit className="w-3 h-3" aria-hidden="true" />
              <span>Dòng chảy</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeFunnelViewType("bars")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                funnelViewType === "bars"
                  ? "bg-surface text-primary shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Xem dạng cột tỷ lệ"
            >
              <BarChart3 className="w-3 h-3" aria-hidden="true" />
              <span>Cột tỷ lệ</span>
            </button>
          </div>

          {bottleneckWeek ? (
            <span className="px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-[11px] font-bold flex items-center gap-1.5 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              Điểm nghẽn: Tuần {bottleneckWeek.weekNumber} (-{bottleneckWeek.dropRate}%)
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-success/10 text-success text-[11px] font-bold flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              Tiến độ ổn định (0% drop)
            </span>
          )}
        </div>
      </div>

      {calculatedWeeks.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-surface border border-outline-variant/60 text-xs text-muted-foreground">
          Khóa học này chưa thiết lập đề cương các tuần học (Syllabus).
        </div>
      ) : funnelViewType === "pipeline" ? (
        /* CÁCH 1: DÒNG CHẢY HÀNH TRÌNH TUẦN HỌC (PIPELINE STEPPER FLOW) */
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {calculatedWeeks.map((week, idx) => {
              const isBottleneck = bottleneckWeek?.weekNumber === week.weekNumber;
              const isSelected = selectedWeekFilter === week.weekNumber;
              const isLastWeek = idx === calculatedWeeks.length - 1;

              return (
                <button
                  type="button"
                  key={week.id}
                  onClick={() => {
                    onSelectWeekFilter(isSelected ? null : week.weekNumber);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? "bg-primary/10 border-primary ring-2 ring-primary/40 shadow-sm"
                      : isBottleneck
                        ? "bg-destructive/5 border-destructive/40 hover:border-destructive shadow-xs"
                        : "bg-surface border-outline-variant/60 hover:border-primary/50"
                  }`}
                >
                  {/* Header bước */}
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                          isBottleneck
                            ? "bg-destructive text-destructive-foreground"
                            : week.passRate >= 80
                              ? "bg-success text-success-foreground"
                              : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {week.weekNumber}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">
                        {week.title}
                      </span>
                    </div>

                    <span
                      className={`font-mono text-xs font-bold shrink-0 ${
                        isBottleneck
                          ? "text-destructive"
                          : week.passRate >= 80
                            ? "text-success"
                            : "text-primary"
                      }`}
                    >
                      {week.passRate}%
                    </span>
                  </div>

                  {/* Thanh tiến độ tuần */}
                  <div className="my-3 space-y-1 w-full">
                    <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                      {week.passRate > 0 && (
                        <div
                          style={{ width: `${week.passRate}%` }}
                          className={`h-full rounded-full transition-all min-w-0 ${
                            isBottleneck
                              ? "bg-destructive"
                              : week.passRate >= 80
                                ? "bg-success"
                                : "bg-primary"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>
                        {week.completedCount}/{totalStudents} SV hoàn thành
                      </span>
                      {week.dropRate > 0 && (
                        <span className="text-destructive font-bold">
                          -{week.dropRate}% dừng lại
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer bước: Nhãn cảnh báo & Nút lọc */}
                  <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[11px] w-full">
                    {isBottleneck ? (
                      <span className="text-destructive font-bold flex items-center gap-1 text-[10px]">
                        <AlertTriangle className="w-3 h-3" /> Điểm nghẽn chính
                      </span>
                    ) : isLastWeek && week.passRate > 0 ? (
                      <span className="text-success font-bold flex items-center gap-1 text-[10px]">
                        <Award className="w-3 h-3" /> Cấp chứng chỉ
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">
                        {isSelected ? "Đang lọc tuần này" : "Click để lọc học viên"}
                      </span>
                    )}

                    <span className="text-primary font-bold text-[10px] inline-flex items-center gap-0.5">
                      {isSelected ? "Bỏ lọc" : "Lọc SV →"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* CÁCH 2: PHỄU THU HẸP (FUNNEL HORIZONTAL BARS) */
        <div className="space-y-2.5">
          {calculatedWeeks.map((week) => {
            const isBottleneck = bottleneckWeek?.weekNumber === week.weekNumber;
            const isSelected = selectedWeekFilter === week.weekNumber;

            return (
              <button
                type="button"
                key={week.id}
                onClick={() => {
                  onSelectWeekFilter(isSelected ? null : week.weekNumber);
                }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? "bg-primary/10 border-primary ring-2 ring-primary/30"
                    : isBottleneck
                      ? "bg-destructive/5 border-destructive/30 hover:border-destructive/60"
                      : "bg-surface border-outline-variant/60 hover:border-primary/50"
                }`}
                aria-label={`Tuần ${week.weekNumber}: ${week.title}, tỷ lệ hoàn thành ${week.passRate}%`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] shrink-0 ${
                        isBottleneck
                          ? "bg-destructive/20 text-destructive"
                          : "bg-primary/20 text-primary"
                      }`}
                    >
                      Tuần {week.weekNumber}
                    </span>
                    <span className="text-foreground transition-colors truncate">{week.title}</span>
                    {week.dropRate > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-destructive/20 text-destructive font-mono shrink-0">
                        Drop {week.dropRate}%
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-mono text-xs shrink-0 ${
                      isBottleneck
                        ? "text-destructive"
                        : week.passRate >= 80
                          ? "text-success"
                          : "text-primary"
                    }`}
                  >
                    {week.passRate}% ({week.completedCount}/{totalStudents} SV)
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full overflow-hidden bg-muted">
                  {week.passRate > 0 && (
                    <div
                      style={{ width: `${week.passRate}%` }}
                      className={`h-full rounded-full transition-all min-w-0 ${
                        isBottleneck
                          ? "bg-destructive"
                          : week.passRate >= 80
                            ? "bg-success"
                            : "bg-primary"
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
