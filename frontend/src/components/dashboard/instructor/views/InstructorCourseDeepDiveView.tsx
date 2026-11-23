"use client";

import React, { useState, useMemo } from "react";
import { BarChart3, TrendingDown, Award, Filter } from "lucide-react";
import { Select } from "@/components/ui/Select";
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
import { useInstructorActivityTimelineQuery } from "@/lib/queries/useCatalogQueries";
import { generateTimeLabels } from "../utils/time_labels";
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
}: InstructorCourseDeepDiveViewProps) {
  // Tab biểu đồ ở chế độ môn học: "bar" | "funnel" | "certs"
  const [chartTab, setChartTab] = useState<"bar" | "funnel" | "certs">("bar");
  const [chartDateRange, setChartDateRange] = useState("7d");
  const [chartLearnerFilter, setChartLearnerFilter] = useState<"all" | "in_progress" | "completed">(
    "all",
  );
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
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

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
    const labels = generateTimeLabels(chartDateRange, customStartDate, customEndDate);
    const timeline = activityTimelineData?.timeline || [];

    return labels.map((l, idx) => {
      const p = timeline[idx];
      return {
        day: l.day,
        date: l.date,
        fullDateLabel: l.fullDateLabel,
        showTick: l.showTick,
        isFuture: l.isFuture,
        count: !p
          ? 0
          : chartLearnerFilter === "in_progress"
            ? p.inProgress
            : chartLearnerFilter === "completed"
              ? p.completedItems
              : p.activeLearners,
        completed: !p ? 0 : chartLearnerFilter === "in_progress" ? 0 : p.completedItems,
        inProgress: !p ? 0 : chartLearnerFilter === "completed" ? 0 : p.inProgress,
      };
    });
  }, [
    activityTimelineData?.timeline,
    chartDateRange,
    chartLearnerFilter,
    customStartDate,
    customEndDate,
  ]);

  // Bộ lọc danh sách sinh viên
  const filteredStudents = useMemo(() => {
    return rawStudentsWithPacing.filter((student) => {
      if (studentStatusFilter === "IN_PROGRESS" && student.progressPercent >= 100) return false;
      if (studentStatusFilter === "COMPLETED" && student.progressPercent < 100) return false;
      if (studentStatusFilter === "OVERDUE" && student.pace !== "BEHIND") return false;

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
    selectedWeekFilter,
    studentSearchQuery,
  ]);

  const handleClearFilters = () => {
    setSelectedDayFilter(null);
    setSelectedWeekFilter(null);
    setStudentPacingFilter("ALL");
    setStudentStatusFilter("ALL");
    setStudentSearchQuery("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* CỘT TRÁI (8/12 - 67%): BIỂU ĐỒ & BẢNG HỌC VIÊN CHI TIẾT */}
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
                onClick={() => setChartTab("funnel")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  chartTab === "funnel"
                    ? "bg-surface text-foreground shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                <span>Phễu hoàn thành theo tuần ({calculatedWeeks.length} tuần)</span>
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
                <span>Chứng chỉ ({completedStudents.length})</span>
              </button>
            </div>

            {/* Thanh điều khiển bộ lọc thời gian & đối tượng học viên */}
            {chartTab === "bar" ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <Filter className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>Bộ lọc hiển thị:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={chartDateRange}
                    onValueChange={(val) => {
                      if (val) setChartDateRange(val as string);
                    }}
                  >
                    <Select.Trigger
                      aria-label="Chọn khoảng thời gian biểu đồ môn học"
                      className="w-auto h-8 px-3 text-[11px] font-semibold rounded-lg"
                    >
                      <Select.Value>
                        {{
                          today: "Hôm nay",
                          "7d": "7 ngày gần nhất",
                          this_week: "Tuần này",
                          last_week: "Tuần trước",
                          this_month: "Tháng này",
                          last_month: "Tháng trước",
                          custom: "Chọn thời gian",
                        }[chartDateRange] ?? chartDateRange}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="today">Hôm nay</Select.Item>
                      <Select.Item value="7d">7 ngày gần nhất</Select.Item>
                      <Select.Item value="this_week">Tuần này</Select.Item>
                      <Select.Item value="last_week">Tuần trước</Select.Item>
                      <Select.Item value="this_month">Tháng này</Select.Item>
                      <Select.Item value="last_month">Tháng trước</Select.Item>
                      <Select.Item value="custom">Chọn thời gian</Select.Item>
                    </Select.Content>
                  </Select>

                  {chartTab === "bar" && chartDateRange === "custom" && (
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
                      if (val) setChartLearnerFilter(val as "all" | "in_progress" | "completed");
                    }}
                  >
                    <Select.Trigger
                      aria-label="Phân khúc đối tượng học viên"
                      className="w-auto h-8 px-3 text-[11px] font-semibold rounded-lg"
                    >
                      <Select.Value>
                        {chartLearnerFilter === "in_progress"
                          ? "Nhóm: Đang học"
                          : chartLearnerFilter === "completed"
                            ? "Nhóm: Đã tốt nghiệp"
                            : "Nhóm: Tất cả học viên"}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="all">Nhóm: Tất cả học viên</Select.Item>
                      <Select.Item value="in_progress">Nhóm: Đang học</Select.Item>
                      <Select.Item value="completed">Nhóm: Đã tốt nghiệp</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>

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
                selectedDay={selectedDayFilter?.day}
                onSelectDay={(pt) =>
                  setSelectedDayFilter(
                    selectedDayFilter?.day === pt.day ? null : { day: pt.day, date: pt.date },
                  )
                }
              />
            </div>
          )}

          {/* Tab 3: Phễu hoàn thành theo tuần */}
          {chartTab === "funnel" && (
            <InstructorWeeklyFunnelTab
              calculatedWeeks={calculatedWeeks}
              bottleneckWeek={bottleneckWeek}
              selectedWeekFilter={selectedWeekFilter}
              onSelectWeekFilter={setSelectedWeekFilter}
              totalStudents={rawStudents.length}
            />
          )}

          {/* Tab 4: Sinh viên nhận chứng chỉ môn học */}
          {chartTab === "certs" && (
            <InstructorCertificatesTab mode="specific" completedStudents={completedStudents} />
          )}
        </div>

        {/* Card 2: Bảng Danh Sách Học Viên Môn Đang Chọn (Kèm Bộ Lọc Pacing & Nhắc Nhở) */}
        <InstructorSpecificStudentTable
          filteredStudents={filteredStudents}
          rawStudentsWithPacing={rawStudentsWithPacing}
          coursePacingCounts={coursePacingCounts}
          studentPacingFilter={studentPacingFilter}
          onChangeStudentPacingFilter={setStudentPacingFilter}
          studentStatusFilter={studentStatusFilter}
          onChangeStudentStatusFilter={setStudentStatusFilter}
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

      {/* CỘT PHẢI (4/12 - 33%): VIỆC CẦN XỬ LÝ */}
      <div className="lg:col-span-4 space-y-4">
        {/* Box: Việc Cần Xử Lý */}
        <InstructorActionTasksCard
          courseId={activeCourse?.id}
          courseTitle={activeCourse?.title}
          totalQaCount={pendingQaCount}
          behindCount={coursePacingCounts.behind}
          onFilterBehind={() => setStudentPacingFilter("BEHIND")}
        />
      </div>
    </div>
  );
}
