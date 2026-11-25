"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingDown,
  Award,
  Filter,
  Flame,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { Course, EnrolledStudent } from "@/gen/catalog/v1/catalog_pb";
import { InstructorSplineChart } from "../../InstructorSplineChart";
import { InstructorDateRangeForm } from "../components/InstructorDateRangeForm";
import { InstructorWeeklyFunnelTab } from "../components/InstructorWeeklyFunnelTab";
import {
  InstructorCertificatesTab,
  type SpecificCompletedStudent,
} from "../components/InstructorCertificatesTab";
import { InstructorSpecificStudentTable } from "../components/InstructorSpecificStudentTable";
import { InstructorActionTasksCard } from "../components/InstructorActionTasksCard";
import { InstructorContentBottleneckCard } from "../components/InstructorContentBottleneckCard";
import { InstructorActivityHeatmap } from "../components/InstructorActivityHeatmap";
import { Select } from "@/components/ui/Select";
import { useInstructorActivityTimelineQuery } from "@/lib/queries/useCatalogQueries";
import { formatTimelineToSplineData } from "../utils/time_labels";
import type { StudentDetailRecord } from "../../InstructorStudentDetailModal";
import type { CalculatedWeek, StudentWithPacing } from "../types";

export interface InstructorCourseDeepDiveViewProps {
  activeCourse: Course | null;
  pendingQaCount?: number;
  rawStudents: EnrolledStudent[];
  rawStudentsWithPacing: StudentWithPacing[];
  coursePacingCounts: {
    all: number;
    ahead: number;
    onTrack: number;
    behind: number;
  };
  calculatedWeeks: CalculatedWeek[];
  bottleneckWeek: CalculatedWeek | null;
  completedStudents: SpecificCompletedStudent[];
  totalItemsInActiveCourse: number;
  currentTimeMs: number;
  nudgedSpecificStudentIds: Set<string>;
  onNudgeStudent: (student: StudentWithPacing) => void;
  onNudgeAllBehind: () => void;
  onSelectStudentForDetail: (record: StudentDetailRecord) => void;
  weeklyCohortFilter?: "ALL" | "PAID" | "AUDIT";
  onSelectCohortFilter?: (c: "ALL" | "PAID" | "AUDIT") => void;
  paidStudentsCount?: number;
  auditStudentsCount?: number;
}

export function InstructorCourseDeepDiveView({
  activeCourse,
  pendingQaCount,
  rawStudents,
  rawStudentsWithPacing,
  coursePacingCounts,
  calculatedWeeks,
  bottleneckWeek,
  completedStudents,
  totalItemsInActiveCourse,
  currentTimeMs,
  nudgedSpecificStudentIds,
  onNudgeStudent,
  onNudgeAllBehind,
  onSelectStudentForDetail,
  weeklyCohortFilter = "PAID",
  onSelectCohortFilter,
  paidStudentsCount = 0,
  auditStudentsCount = 0,
}: InstructorCourseDeepDiveViewProps) {
  // Tab biểu đồ ở chế độ môn học: "bar" | "heatmap" | "funnel" | "certs"
  const [chartTab, setChartTab] = useState<"bar" | "heatmap" | "funnel" | "certs">("bar");
  const [chartDateRange, setChartDateRange] = useState("7d");
  const [chartLearnerFilter, setChartLearnerFilter] = useState<
    "all" | "paid_in_progress" | "paid_completed" | "audit" | "paid" | "in_progress" | "completed"
  >("all");
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState<{ day: string; date: string } | null>(
    null,
  );
  const [studentStatusFilter, setStudentStatusFilter] = useState<
    "ALL" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE"
  >("ALL");
  const [studentPacingFilter, setStudentPacingFilter] = useState<
    "ALL" | "AHEAD" | "ON_TRACK" | "BEHIND"
  >("ALL");
  const [studentTierFilter, setStudentTierFilter] = useState<"ALL" | "PAID" | "AUDIT">("ALL");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const handleSelectTierFilter = (tier: "ALL" | "PAID" | "AUDIT") => {
    setStudentTierFilter(tier);
    if (tier === "AUDIT" && studentStatusFilter === "COMPLETED") {
      setStudentStatusFilter("ALL");
    }
  };

  const handleSelectStatusFilter = (status: "ALL" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE") => {
    setStudentStatusFilter(status);
    if (status === "COMPLETED" && studentTierFilter === "AUDIT") {
      setStudentTierFilter("ALL");
    }
  };

  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Truy vấn dữ liệu chuỗi thời gian hoạt động thực tế của khóa học này
  const { data: activityTimelineData } = useInstructorActivityTimelineQuery({
    courseId: activeCourse?.id || "",
    dateRange: chartDateRange,
    startDate: customStartDate,
    endDate: customEndDate,
    learnerFilter: chartLearnerFilter,
  });

  // Dữ liệu biểu đồ từ API thực tế 100% (Zero-Fallback & No Mock Math.sin)
  const currentSplineData = useMemo(() => {
    return formatTimelineToSplineData(
      activityTimelineData?.timeline,
      chartDateRange,
      customStartDate,
      customEndDate,
    );
  }, [activityTimelineData?.timeline, chartDateRange, customStartDate, customEndDate]);

  // Thống kê nhanh dữ liệu chuỗi hoạt động để lấp đầy không gian và tăng giá trị thông tin
  const splineSummary = useMemo(() => {
    let totalAccess = 0;
    let totalCompleted = 0;
    let peakCount = 0;
    let peakLabel = "";

    currentSplineData.forEach((d) => {
      totalAccess += d.count || 0;
      totalCompleted += d.completed || 0;
      if (d.count > peakCount) {
        peakCount = d.count;
        peakLabel = d.fullDateLabel || d.day;
      }
    });

    return {
      totalAccess,
      totalCompleted,
      peakCount,
      peakLabel: peakLabel || "Chưa có đỉnh",
    };
  }, [currentSplineData]);

  // Bộ lọc danh sách sinh viên
  const filteredStudents = useMemo(() => {
    return rawStudentsWithPacing.filter((student) => {
      if (studentStatusFilter === "IN_PROGRESS" && student.progressPercent >= 100) return false;
      if (studentStatusFilter === "COMPLETED" && student.progressPercent < 100) return false;
      if (studentStatusFilter === "OVERDUE" && student.pace !== "BEHIND") return false;

      if (studentTierFilter === "PAID" && student.enrollmentType === "AUDIT") return false;
      if (studentTierFilter === "AUDIT" && student.enrollmentType !== "AUDIT") return false;

      if (studentPacingFilter !== "ALL" && student.pace !== studentPacingFilter) return false;

      if (selectedWeekFilter !== null && student.currentWeekNumber !== selectedWeekFilter) {
        return false;
      }

      if (studentSearchQuery.trim()) {
        const q = studentSearchQuery.toLowerCase();
        const matchName = student.userName.toLowerCase().includes(q);
        const matchEmail = student.userEmail.toLowerCase().includes(q);
        const matchId = student.userId.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchId) return false;
      }

      return true;
    });
  }, [
    rawStudentsWithPacing,
    studentStatusFilter,
    studentPacingFilter,
    studentTierFilter,
    selectedWeekFilter,
    studentSearchQuery,
  ]);

  const handleClearFilters = () => {
    setSelectedDayFilter(null);
    setSelectedWeekFilter(null);
    setStudentPacingFilter("ALL");
    setStudentStatusFilter("ALL");
    setStudentTierFilter("ALL");
    setStudentSearchQuery("");
  };

  return (
    <div className="space-y-5">
      {/* HÀNG 1: BIỂU ĐỒ KHÓA HỌC (8/12) + ĐIỀU HÀNH & ĐIỂM NGHẼN (4/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* CỘT TRÁI (8/12 - 67%): BIỂU ĐỒ KHÓA HỌC */}
        <div className="lg:col-span-8 space-y-5">
          {/* Card 1: Khung Biểu Đồ Khóa Học */}
          <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4 overflow-hidden">
            <div className="space-y-3 pb-1">
              {/* Tabs biểu đồ */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 overflow-x-auto no-scrollbar w-full sm:w-fit max-w-full">
                <button
                  type="button"
                  onClick={() => setChartTab("bar")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                    chartTab === "bar"
                      ? "bg-surface text-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>Hoạt động</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartTab("heatmap")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                    chartTab === "heatmap"
                      ? "bg-surface text-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-destructive" aria-hidden="true" />
                  <span>Khung giờ học</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartTab("funnel")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                    chartTab === "funnel"
                      ? "bg-surface text-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                  <span>Tiến độ theo tuần ({calculatedWeeks.length} tuần)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartTab("certs")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                    chartTab === "certs"
                      ? "bg-surface text-foreground shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
                  <span>Chứng chỉ đã cấp</span>
                </button>
              </div>

              {/* Thanh điều khiển bộ lọc thời gian & đối tượng học viên (Cố định cho cả Hoạt động và Khung giờ học) */}
              {chartTab === "bar" || chartTab === "heatmap" ? (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                    <Filter className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    <span>Bộ lọc hiển thị:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={chartDateRange}
                      onValueChange={(val) => {
                        if (val) setChartDateRange(String(val));
                      }}
                    >
                      <Select.Trigger
                        aria-label="Chọn khoảng thời gian biểu đồ môn học"
                        className="h-8 px-2.5 py-0 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-foreground focus-visible:ring-1 focus-visible:ring-primary shadow-2xs hover:border-primary/50 transition-all gap-1.5"
                      >
                        <Select.Value>
                          {chartDateRange === "today"
                            ? "Hôm nay"
                            : chartDateRange === "7d"
                              ? "7 ngày gần nhất"
                              : chartDateRange === "this_week"
                                ? "Tuần này"
                                : chartDateRange === "last_week"
                                  ? "Tuần trước"
                                  : chartDateRange === "this_month"
                                    ? "Tháng này"
                                    : chartDateRange === "last_month"
                                      ? "Tháng trước"
                                      : chartDateRange === "custom"
                                        ? "Chọn thời gian"
                                        : chartDateRange}
                        </Select.Value>
                      </Select.Trigger>
                      <Select.Content className="w-[160px]">
                        <Select.Item value="today" className="text-xs py-1.5">
                          Hôm nay
                        </Select.Item>
                        <Select.Item value="7d" className="text-xs py-1.5">
                          7 ngày gần nhất
                        </Select.Item>
                        <Select.Item value="this_week" className="text-xs py-1.5">
                          Tuần này
                        </Select.Item>
                        <Select.Item value="last_week" className="text-xs py-1.5">
                          Tuần trước
                        </Select.Item>
                        <Select.Item value="this_month" className="text-xs py-1.5">
                          Tháng này
                        </Select.Item>
                        <Select.Item value="last_month" className="text-xs py-1.5">
                          Tháng trước
                        </Select.Item>
                        <Select.Item value="custom" className="text-xs py-1.5">
                          Chọn thời gian
                        </Select.Item>
                      </Select.Content>
                    </Select>

                    {chartDateRange === "custom" && (
                      <InstructorDateRangeForm
                        startDate={customStartDate}
                        endDate={customEndDate}
                        onChange={(s, e) => {
                          setCustomStartDate(s);
                          setCustomEndDate(e);
                        }}
                      />
                    )}

                    <Select
                      value={chartLearnerFilter}
                      onValueChange={(val) => {
                        if (val) {
                          setChartLearnerFilter(
                            val as
                              | "all"
                              | "paid_in_progress"
                              | "paid_completed"
                              | "audit"
                              | "paid"
                              | "in_progress"
                              | "completed",
                          );
                        }
                      }}
                    >
                      <Select.Trigger
                        aria-label="Phân khúc đối tượng học viên"
                        className="h-8 px-2.5 py-0 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-foreground focus-visible:ring-1 focus-visible:ring-primary shadow-2xs hover:border-primary/50 transition-all gap-1.5"
                      >
                        <Select.Value>
                          {chartLearnerFilter === "all"
                            ? "Nhóm: Tất cả học viên"
                            : chartLearnerFilter === "paid_in_progress"
                              ? "Nhóm: Chính thức — Đang học"
                              : chartLearnerFilter === "paid_completed"
                                ? "Nhóm: Chính thức — Đã tốt nghiệp"
                                : chartLearnerFilter === "audit"
                                  ? "Nhóm: Học viên học thử"
                                  : chartLearnerFilter}
                        </Select.Value>
                      </Select.Trigger>
                      <Select.Content className="w-[230px]">
                        <Select.Item value="all" className="text-xs py-1.5">
                          Nhóm: Tất cả học viên
                        </Select.Item>
                        <Select.Item value="paid_in_progress" className="text-xs py-1.5">
                          Nhóm: Chính thức — Đang học
                        </Select.Item>
                        <Select.Item value="paid_completed" className="text-xs py-1.5">
                          Nhóm: Chính thức — Đã tốt nghiệp
                        </Select.Item>
                        <Select.Item value="audit" className="text-xs py-1.5">
                          Nhóm: Học viên học thử
                        </Select.Item>
                      </Select.Content>
                    </Select>
                  </div>
                </div>
              ) : null}
            </div>

            {/* VÙNG NỘI DUNG BIỂU ĐỒ VỚI CHIỀU CAO TỐI THIỂU CHUẨN HÓA (CHỐNG GIẬT LAYOUT SHIFT) */}
            <div className="min-h-[420px] transition-opacity duration-200 animate-in fade-in-50">
              {/* Tab 1: Biểu đồ Hoạt động học tập (Spline Chart) */}
              {chartTab === "bar" && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Số lượng sinh viên tương tác hàng ngày:</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Lượt truy cập
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-success" /> Hoàn thành bài học
                      </span>
                    </div>
                  </div>

                  <InstructorSplineChart
                    data={currentSplineData}
                    height={270}
                    selectedDay={selectedDayFilter?.day}
                    onSelectDay={(pt) =>
                      setSelectedDayFilter(
                        selectedDayFilter?.day === pt.day ? null : { day: pt.day, date: pt.date },
                      )
                    }
                  />

                  {/* Hàng 3 thẻ tóm tắt nhanh dữ liệu kỳ hoạt động */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface border border-outline-variant/60">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">
                          Tổng lượt truy cập
                        </div>
                        <div className="text-sm font-bold text-foreground font-mono">
                          {splineSummary.totalAccess}{" "}
                          <span className="text-[11px] font-normal text-muted-foreground font-sans">
                            lượt
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface border border-outline-variant/60">
                      <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">
                          Tổng bài hoàn thành
                        </div>
                        <div className="text-sm font-bold text-foreground font-mono">
                          {splineSummary.totalCompleted}{" "}
                          <span className="text-[11px] font-normal text-muted-foreground font-sans">
                            bài
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface border border-outline-variant/60">
                      <div className="w-8 h-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">
                          Ngày cao điểm nhất
                        </div>
                        <div
                          className="text-xs font-bold text-foreground font-mono truncate"
                          title={splineSummary.peakLabel}
                        >
                          {splineSummary.peakCount > 0 ? (
                            <>
                              {splineSummary.peakLabel}{" "}
                              <span className="text-[11px] font-normal text-primary">
                                ({splineSummary.peakCount} SV)
                              </span>
                            </>
                          ) : (
                            "Chưa có dữ liệu"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Sơ đồ Mật độ Khung giờ học tập môn học */}
              {chartTab === "heatmap" && (
                <InstructorActivityHeatmap heatmap={activityTimelineData?.heatmap || []} />
              )}

              {/* Tab 3: Tiến độ hoàn thành theo tuần */}
              {chartTab === "funnel" && (
                <InstructorWeeklyFunnelTab
                  calculatedWeeks={calculatedWeeks}
                  bottleneckWeek={bottleneckWeek}
                  selectedWeekFilter={selectedWeekFilter}
                  onSelectWeekFilter={setSelectedWeekFilter}
                  totalStudents={rawStudents.length}
                  weeklyCohortFilter={weeklyCohortFilter}
                  onSelectCohortFilter={onSelectCohortFilter}
                  paidCount={paidStudentsCount}
                  auditCount={auditStudentsCount}
                />
              )}

              {/* Tab 4: Sinh viên nhận chứng chỉ môn học */}
              {chartTab === "certs" && (
                <InstructorCertificatesTab mode="specific" completedStudents={completedStudents} />
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (4/12 - 33%): VIỆC CẦN XỬ LÝ & ĐIỂM NGHẼN BÀI GIẢNG */}
        <div className="lg:col-span-4 space-y-4">
          {/* Box 1: Việc Cần Xử Lý */}
          <InstructorActionTasksCard
            courseId={activeCourse?.id}
            courseTitle={activeCourse?.title}
            totalQaCount={pendingQaCount}
            behindCount={coursePacingCounts.behind}
            onFilterBehind={() => setStudentPacingFilter("BEHIND")}
          />

          {/* Box 2: Điểm Nghẽn Bài Giảng */}
          <InstructorContentBottleneckCard
            courseId={activeCourse?.id}
            bottleneckWeek={bottleneckWeek}
            rawStudents={rawStudents}
            selectedWeekFilter={selectedWeekFilter}
            onSelectWeekFilter={setSelectedWeekFilter}
          />
        </div>
      </div>

      {/* HÀNG 2 (12/12 - FULL WIDTH): BẢNG DANH SÁCH HỌC VIÊN MÔN ĐANG CHỌN */}
      <InstructorSpecificStudentTable
        filteredStudents={filteredStudents}
        rawStudentsWithPacing={rawStudentsWithPacing}
        coursePacingCounts={coursePacingCounts}
        studentPacingFilter={studentPacingFilter}
        onChangeStudentPacingFilter={setStudentPacingFilter}
        studentStatusFilter={studentStatusFilter}
        onChangeStudentStatusFilter={handleSelectStatusFilter}
        studentTierFilter={studentTierFilter}
        onChangeStudentTierFilter={handleSelectTierFilter}
        studentSearchQuery={studentSearchQuery}
        onChangeStudentSearchQuery={setStudentSearchQuery}
        selectedDayFilter={selectedDayFilter}
        selectedWeekFilter={selectedWeekFilter}
        onClearFilters={handleClearFilters}
        activeCourse={activeCourse}
        calculatedWeeks={calculatedWeeks}
        totalItemsInActiveCourse={totalItemsInActiveCourse}
        currentTimeMs={currentTimeMs}
        nudgedSpecificStudentIds={nudgedSpecificStudentIds}
        onNudgeStudent={onNudgeStudent}
        onNudgeAllBehind={onNudgeAllBehind}
        onSelectStudentForDetail={onSelectStudentForDetail}
      />
    </div>
  );
}
