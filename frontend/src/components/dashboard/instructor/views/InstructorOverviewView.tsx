"use client";

import React, { useState, useMemo } from "react";
import { BarChart3, TrendingDown, Award, Filter } from "lucide-react";
import { Select } from "@/components/ui/Select";
import type { Course, InstructorAnalytics } from "@/gen/catalog/v1/catalog_pb";
import { InstructorSplineChart } from "../../InstructorSplineChart";
import { InstructorDateRangeForm } from "../components/InstructorDateRangeForm";
import { InstructorCourseComparisonTab } from "../components/InstructorCourseComparisonTab";
import { InstructorCertificatesTab } from "../components/InstructorCertificatesTab";
import { InstructorPacingCohortsCard } from "../components/InstructorPacingCohortsCard";
import { InstructorRecentReviewsCard } from "../components/InstructorRecentReviewsCard";
import { InstructorActionTasksCard } from "../components/InstructorActionTasksCard";
import { useInstructorActivityTimelineQuery } from "@/lib/queries/useCatalogQueries";
import { generateTimeLabels } from "../utils/time_labels";
import type {
  OverviewActionTask,
  OverviewReview,
  OverviewCertificate,
  EnrichedCourseComparisonItem,
} from "../types";

export interface InstructorOverviewViewProps {
  courses: Course[];
  activeCourse: Course | null;
  onSelectCourse: (courseId: string) => void;
  analyticsByCourseId: Map<string, InstructorAnalytics | null | undefined>;
  pendingGradingByCourseId: Map<string, number>;
  pendingQaByCourseId: Map<string, number>;
  overviewActionTasks: OverviewActionTask[];
  totalPendingTasksCount?: number;
  totalPendingGradingCount?: number;
  totalPendingQaCount?: number;
  totalOverdueTasksCount?: number;
  overdueGradingByCourseId?: Map<string, number>;
  overviewReviews: OverviewReview[];
  avgRatingAllCourses: string | number;
  totalStudentsAllCourses: number;
  totalCertificatesAllCourses: number;
  allCompletedStudentsList: OverviewCertificate[];
  pacingCohortSummary: {
    total: number;
    aheadCount: number;
    aheadPercent: number;
    onTrackCount: number;
    onTrackPercent: number;
    behindCount: number;
    behindPercent: number;
  };
  onOpenPacingModal: (category?: "ALL" | "AHEAD" | "ON_TRACK" | "BEHIND") => void;
  enrichedCoursesForComparison: EnrichedCourseComparisonItem[];
}

export function InstructorOverviewView({
  courses,
  activeCourse: _activeCourse,
  onSelectCourse,
  analyticsByCourseId: _analyticsByCourseId,
  pendingGradingByCourseId: _pendingGradingByCourseId,
  pendingQaByCourseId: _pendingQaByCourseId,
  overviewActionTasks,
  totalPendingTasksCount,
  totalPendingGradingCount,
  totalPendingQaCount,
  totalOverdueTasksCount = 0,
  overdueGradingByCourseId: _overdueGradingByCourseId,
  overviewReviews,
  avgRatingAllCourses,
  totalStudentsAllCourses,
  totalCertificatesAllCourses,
  allCompletedStudentsList,
  pacingCohortSummary,
  onOpenPacingModal,
  enrichedCoursesForComparison,
}: InstructorOverviewViewProps) {
  // Tab biểu đồ ở chế độ tất cả môn: "trend" | "compare" | "certs"
  const [allChartTab, setAllChartTab] = useState<"trend" | "compare" | "certs">("trend");
  const [chartDateRange, setChartDateRange] = useState("7d");
  const [chartLearnerFilter, setChartLearnerFilter] = useState<"all" | "in_progress" | "completed">(
    "all",
  );
  const [certCourseFilter, setCertCourseFilter] = useState<string>("all");
  const [selectedDayFilter, setSelectedDayFilter] = useState<{ day: string; date: string } | null>(
    null,
  );

  const [compareSortBy, setCompareSortBy] = useState<"rate" | "students" | "rating">("rate");

  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Truy vấn dữ liệu chuỗi thời gian hoạt động thực tế từ database
  const { data: activityTimelineData } = useInstructorActivityTimelineQuery({
    courseId: "",
    dateRange: chartDateRange,
    startDate: customStartDate,
    endDate: customEndDate,
    learnerFilter: chartLearnerFilter,
  });

  // Lọc danh sách chứng chỉ theo bộ lọc khóa học
  const filteredCertificates = useMemo(() => {
    if (certCourseFilter === "all") return allCompletedStudentsList;
    return allCompletedStudentsList.filter((c) =>
      c.courseTitle.toLowerCase().includes(certCourseFilter.toLowerCase()),
    );
  }, [allCompletedStudentsList, certCourseFilter]);

  // Dữ liệu biểu đồ từ API thực tế 100% (Zero-Fallback & No Mock Math.sin)
  const allCoursesWeekDaysData = useMemo(() => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* CỘT TRÁI (8/12 - 67%): BIỂU ĐỒ TOÀN HỆ THỐNG & BẢNG SO SÁNH KHÓA HỌC */}
      <div className="lg:col-span-8 space-y-5">
        {/* Card 1: Khung Biểu Đồ Hoạt Động Toàn Sàn */}
        <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4 overflow-hidden">
          <div className="space-y-3 pb-1">
            {/* Tabs biểu đồ toàn sàn */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/60 w-full sm:w-fit max-w-full">
              <button
                type="button"
                onClick={() => setAllChartTab("trend")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  allChartTab === "trend"
                    ? "bg-surface text-foreground shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>Hoạt động</span>
              </button>

              <button
                type="button"
                onClick={() => setAllChartTab("compare")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  allChartTab === "compare"
                    ? "bg-surface text-foreground shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                <span>Đối sánh môn học</span>
              </button>

              <button
                type="button"
                onClick={() => setAllChartTab("certs")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  allChartTab === "certs"
                    ? "bg-surface text-foreground shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Award className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
                <span>Chứng chỉ đã cấp ({totalCertificatesAllCourses})</span>
              </button>
            </div>

            {/* Thanh điều khiển bộ lọc thời gian & đối tượng học viên */}
            {allChartTab === "trend" ? (
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
                      aria-label="Chọn khoảng thời gian biểu đồ toàn sàn"
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

                  {allChartTab === "trend" && chartDateRange === "custom" && (
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
                      aria-label="Phân khúc đối tượng học viên vĩ mô"
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
            ) : allChartTab === "certs" ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <Filter className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>Khóa học cấp chứng chỉ:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={certCourseFilter}
                    onValueChange={(val) => {
                      if (val) setCertCourseFilter(val as string);
                    }}
                  >
                    <Select.Trigger
                      aria-label="Lọc chứng chỉ theo khóa học"
                      className="w-auto h-8 px-3 text-[11px] font-semibold rounded-lg"
                    >
                      <Select.Value>
                        {certCourseFilter === "all"
                          ? `Tất cả khóa học (${courses.length})`
                          : certCourseFilter}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="all">Tất cả khóa học ({courses.length})</Select.Item>
                      {courses.map((c) => (
                        <Select.Item key={c.id} value={c.title}>
                          {c.title}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>

          {/* Tab 1: Biểu đồ Hoạt động học tập (Đường cong Spline) */}
          {allChartTab === "trend" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Lượng học viên hoạt động hàng ngày trên tất cả các khóa học giảng dạy:</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Lượt học viên truy cập
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-success" /> Lượt hoàn thành bài học
                  </span>
                </div>
              </div>

              <InstructorSplineChart
                data={allCoursesWeekDaysData}
                selectedDay={selectedDayFilter?.day}
                onSelectDay={(pt) =>
                  setSelectedDayFilter(
                    selectedDayFilter?.day === pt.day ? null : { day: pt.day, date: pt.date },
                  )
                }
              />
            </div>
          )}

          {/* Tab 2: So sánh tỷ lệ hoàn thành & hiệu suất giữa các môn */}
          {allChartTab === "compare" && (
            <InstructorCourseComparisonTab
              courses={enrichedCoursesForComparison}
              compareSortBy={compareSortBy}
              onChangeCompareSortBy={setCompareSortBy}
              onSelectCourse={onSelectCourse}
            />
          )}

          {/* Tab 4: Danh sách toàn bộ chứng chỉ đã cấp */}
          {allChartTab === "certs" && (
            <InstructorCertificatesTab
              mode="all"
              certificates={filteredCertificates}
              totalCount={totalCertificatesAllCourses}
            />
          )}
        </div>

        {/* Card 2: Kiểm Soát Nhịp Độ Học Tập Toàn Hệ Thống */}
        <InstructorPacingCohortsCard
          totalStudents={pacingCohortSummary.total || totalStudentsAllCourses}
          aheadCount={pacingCohortSummary.aheadCount}
          aheadPercent={pacingCohortSummary.aheadPercent}
          onTrackCount={pacingCohortSummary.onTrackCount}
          onTrackPercent={pacingCohortSummary.onTrackPercent}
          behindCount={pacingCohortSummary.behindCount}
          behindPercent={pacingCohortSummary.behindPercent}
          onOpenModal={onOpenPacingModal}
        />
      </div>

      {/* CỘT PHẢI (4/12 - 33%): ACTION CENTER & ĐIỀU HÀNH GIẢNG DẠY */}
      <div className="lg:col-span-4 space-y-4">
        {/* Box 1: Việc Cần Xử Lý */}
        <InstructorActionTasksCard
          tasks={overviewActionTasks}
          totalPendingCount={totalPendingTasksCount}
          totalGradingCount={totalPendingGradingCount}
          totalQaCount={totalPendingQaCount}
          totalOverdueCount={totalOverdueTasksCount}
        />

        {/* Box 2: Phản Hồi Sinh Viên */}
        <InstructorRecentReviewsCard
          reviews={overviewReviews}
          avgRating={avgRatingAllCourses || "0.0"}
        />
      </div>
    </div>
  );
}
