"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingDown,
  Award,
  Filter,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
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
import { useInstructorActivityTimelineQuery } from "@/lib/queries/useCatalogQueries";
import { generateTimeLabels } from "../utils/time_labels";
import type { StudentDetailRecord } from "../../InstructorStudentDetailModal";
import type { CalculatedWeek, StudentWithPacing } from "../types";

export interface InstructorCourseDeepDiveViewProps {
  activeCourse: Course | null;
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
  currentMonthNumber: number;
  lastMonthNumber: number;
  nudgedSpecificStudentIds: Set<string>;
  onNudgeStudent: (student: StudentWithPacing) => void;
  onNudgeAllBehind: () => void;
  onSelectStudentForDetail: (record: StudentDetailRecord) => void;
}

export function InstructorCourseDeepDiveView({
  activeCourse,
  rawStudents,
  rawStudentsWithPacing,
  coursePacingCounts,
  calculatedWeeks,
  bottleneckWeek,
  completedStudents,
  totalItemsInActiveCourse,
  currentTimeMs,
  currentMonthNumber,
  lastMonthNumber,
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
                  <select
                    value={chartDateRange}
                    onChange={(e) => setChartDateRange(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-foreground focus:ring-1 focus:ring-primary outline-hidden cursor-pointer"
                    aria-label="Chọn khoảng thời gian biểu đồ môn học"
                  >
                    <option value="today">Hôm nay</option>
                    <option value="7d">7 ngày gần nhất</option>
                    <option value="this_week">Tuần này</option>
                    <option value="last_week">Tuần trước</option>
                    <option value="this_month">Tháng này (Tháng {currentMonthNumber})</option>
                    <option value="last_month">Tháng trước (Tháng {lastMonthNumber})</option>
                    {chartTab === "bar" && <option value="custom">Chọn thời gian</option>}
                  </select>

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

                  <select
                    value={chartLearnerFilter}
                    onChange={(e) =>
                      setChartLearnerFilter(e.target.value as "all" | "in_progress" | "completed")
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-foreground focus:ring-1 focus:ring-primary outline-hidden cursor-pointer"
                    aria-label="Phân khúc đối tượng học viên"
                  >
                    <option value="all">Nhóm: Tất cả học viên</option>
                    <option value="in_progress">Nhóm: Đang học</option>
                    <option value="completed">Nhóm: Đã tốt nghiệp</option>
                  </select>
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

      {/* CỘT PHẢI (4/12 - 33%): VIỆC CẦN LÀM & ĐIỂM NGHẼN */}
      <div className="lg:col-span-4 space-y-4">
        {/* Box 1: Việc Cần Xử Lý */}
        <InstructorActionTasksCard
          courseId={activeCourse?.id}
          courseTitle={activeCourse?.title}
          behindCount={coursePacingCounts.behind}
          onFilterBehind={() => setStudentPacingFilter("BEHIND")}
        />

        {/* Box 2: Cảnh Báo Điểm Nghẽn */}
        {bottleneckWeek ? (
          <div className="p-4 rounded-3xl bg-destructive/5 border border-destructive/20 space-y-3">
            <div className="flex items-center gap-2 text-destructive font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Điểm Nghẽn Cần Khắc Phục</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>
                Tuần {bottleneckWeek.weekNumber}: &ldquo;{bottleneckWeek.title}&rdquo;
              </strong>{" "}
              có tỷ lệ dừng học cao nhất ({bottleneckWeek.dropRate}%). Hiện có{" "}
              {bottleneckWeek.reachedCount - bottleneckWeek.completedCount} sinh viên đang dừng lại
              tại tuần này.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedWeekFilter(bottleneckWeek.weekNumber);
                setSelectedDayFilter(null);
                setChartTab("funnel");
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Xem danh sách học viên dừng ở Tuần {bottleneckWeek.weekNumber}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-success/5 border border-success/20 space-y-2">
            <div className="flex items-center gap-2 text-success font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Tiến Độ Học Tập Ổn Định</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {rawStudents.length === 0
                ? "Khóa học hiện chưa có dữ liệu học viên để phát hiện điểm nghẽn."
                : calculatedWeeks.length === 0
                  ? "Khóa học chưa cấu hình các tuần học trong đề cương."
                  : "Chưa ghi nhận điểm nghẽn học tập. Tất cả sinh viên đang duy trì tiến độ hoàn thành tốt."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
