"use client";

import React, { useState, useMemo } from "react";
import { BarChart3, TrendingDown, Award, Filter } from "lucide-react";
import type { Course, InstructorAnalytics } from "@/gen/catalog/v1/catalog_pb";
import { InstructorSplineChart } from "../../InstructorSplineChart";
import { InstructorDateRangeForm } from "../components/InstructorDateRangeForm";
import { InstructorCourseComparisonTab } from "../components/InstructorCourseComparisonTab";
import { InstructorCertificatesTab } from "../components/InstructorCertificatesTab";
import { InstructorPacingCohortsCard } from "../components/InstructorPacingCohortsCard";
import { InstructorRecentReviewsCard } from "../components/InstructorRecentReviewsCard";
import { generateTimeLabels } from "../utils/time_labels";
import type {
  OverviewActionTask,
  OverviewReview,
  OverviewCertificate,
  ComparisonCourseCardItem,
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
  enrichedCoursesForComparison: ComparisonCourseCardItem[];
  currentMonthNumber: number;
  lastMonthNumber: number;
}

export function InstructorOverviewView({
  courses,
  activeCourse,
  onSelectCourse,
  analyticsByCourseId: _analyticsByCourseId,
  pendingGradingByCourseId: _pendingGradingByCourseId,
  pendingQaByCourseId: _pendingQaByCourseId,
  overviewActionTasks: _overviewActionTasks,
  totalPendingTasksCount: _totalPendingTasksCount,
  totalPendingGradingCount: _totalPendingGradingCount,
  totalPendingQaCount: _totalPendingQaCount,
  totalOverdueTasksCount: _totalOverdueTasksCount = 0,
  overdueGradingByCourseId: _overdueGradingByCourseId,
  overviewReviews,
  avgRatingAllCourses,
  totalStudentsAllCourses,
  totalCertificatesAllCourses,
  allCompletedStudentsList,
  pacingCohortSummary,
  onOpenPacingModal,
  enrichedCoursesForComparison,
  currentMonthNumber,
  lastMonthNumber,
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

  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Lọc danh sách chứng chỉ theo bộ lọc khóa học
  const filteredCertificates = useMemo(() => {
    if (certCourseFilter === "all") return allCompletedStudentsList;
    return allCompletedStudentsList.filter((c) =>
      c.courseTitle.toLowerCase().includes(certCourseFilter.toLowerCase()),
    );
  }, [allCompletedStudentsList, certCourseFilter]);

  // Dữ liệu tương tác biểu đồ cho TOÀN BỘ CÁC MÔN HỌC theo khoảng thời gian và bộ lọc đối tượng
  const allCoursesWeekDaysData = useMemo(() => {
    const labels = generateTimeLabels(chartDateRange, customStartDate, customEndDate);

    if (chartDateRange === "today") {
      const baseCounts = [4, 2, 8, 24, 38, 32, 46, 42, 18];
      return labels.map((l, idx) => {
        if (l.isFuture) {
          return {
            day: l.day,
            date: l.date,
            fullDateLabel: l.fullDateLabel,
            showTick: l.showTick,
            isFuture: true,
            count: 0,
            completed: 0,
            inProgress: 0,
          };
        }
        const count = baseCounts[idx % baseCounts.length];
        const done = Math.round(count * 0.35);
        const inProg = count - done;
        return {
          day: l.day,
          date: l.date,
          fullDateLabel: l.fullDateLabel,
          showTick: l.showTick,
          isFuture: false,
          count:
            chartLearnerFilter === "in_progress"
              ? inProg
              : chartLearnerFilter === "completed"
                ? done
                : count,
          completed: chartLearnerFilter === "in_progress" ? 0 : done,
          inProgress: chartLearnerFilter === "completed" ? 0 : inProg,
        };
      });
    }

    if (
      chartDateRange === "this_week" ||
      chartDateRange === "7d" ||
      chartDateRange === "last_week"
    ) {
      const baseCounts = [26, 34, 28, 39, 46, 36, 42];
      return labels.map((l, idx) => {
        if (l.isFuture) {
          return {
            day: l.day,
            date: l.date,
            fullDateLabel: l.fullDateLabel,
            showTick: l.showTick,
            isFuture: true,
            count: 0,
            completed: 0,
            inProgress: 0,
          };
        }
        const count = baseCounts[idx % baseCounts.length];
        const done = Math.round(count * 0.34);
        const inProg = count - done;
        return {
          day: l.day,
          date: l.date,
          fullDateLabel: l.fullDateLabel,
          showTick: l.showTick,
          isFuture: false,
          count:
            chartLearnerFilter === "in_progress"
              ? inProg
              : chartLearnerFilter === "completed"
                ? done
                : count,
          completed: chartLearnerFilter === "in_progress" ? 0 : done,
          inProgress: chartLearnerFilter === "completed" ? 0 : inProg,
        };
      });
    }

    return labels.map((l, idx) => {
      if (l.isFuture) {
        return {
          day: l.day,
          date: l.date,
          fullDateLabel: l.fullDateLabel,
          showTick: l.showTick,
          isFuture: true,
          count: 0,
          completed: 0,
          inProgress: 0,
        };
      }
      const wave = Math.sin(idx * 0.55) * 10 + Math.cos(idx * 0.3) * 6;
      const base = Math.round(32 + wave);
      const count = Math.max(12, Math.min(50, base));
      const done = Math.round(count * 0.36);
      const inProg = count - done;
      return {
        day: l.day,
        date: l.date,
        fullDateLabel: l.fullDateLabel,
        showTick: l.showTick,
        isFuture: false,
        count:
          chartLearnerFilter === "in_progress"
            ? inProg
            : chartLearnerFilter === "completed"
              ? done
              : count,
        completed: chartLearnerFilter === "in_progress" ? 0 : done,
        inProgress: chartLearnerFilter === "completed" ? 0 : inProg,
      };
    });
  }, [chartDateRange, chartLearnerFilter, customStartDate, customEndDate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* CỘT TRÁI (8/12 - 67%): BIỂU ĐỒ TOÀN HỆ THỐNG & BẢNG SO SÁNH KHÓA HỌC */}
      <div className="lg:col-span-8 space-y-5">
        {/* Card 1: Khung Biểu Đồ Hoạt Động Toàn Sàn */}
        <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4 overflow-hidden">
          <div className="space-y-3 pb-1">
            {/* Tabs biểu đồ toàn sàn */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 overflow-x-auto no-scrollbar w-full sm:w-fit max-w-full">
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
                <span>
                  Hoạt động (
                  {chartDateRange === "today"
                    ? "Hôm nay"
                    : chartDateRange === "this_week"
                      ? "Tuần này"
                      : chartDateRange === "last_week"
                        ? "Tuần trước"
                        : chartDateRange === "this_month"
                          ? `Tháng ${currentMonthNumber}`
                          : chartDateRange === "last_month"
                            ? `Tháng ${lastMonthNumber}`
                            : chartDateRange === "custom"
                              ? "Tùy chọn"
                              : "7 ngày"}
                  )
                </span>
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
                <span>Tỷ lệ hoàn thành theo môn</span>
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
                  <select
                    value={chartDateRange}
                    onChange={(e) => setChartDateRange(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-foreground focus:ring-1 focus:ring-primary outline-hidden cursor-pointer"
                    aria-label="Chọn khoảng thời gian biểu đồ toàn sàn"
                  >
                    <option value="today">Hôm nay</option>
                    <option value="7d">7 ngày gần nhất</option>
                    <option value="this_week">Tuần này</option>
                    <option value="last_week">Tuần trước</option>
                    <option value="this_month">Tháng này</option>
                    <option value="last_month">Tháng trước</option>
                    {allChartTab === "trend" && <option value="custom">Chọn thời gian</option>}
                  </select>

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

                  <select
                    value={chartLearnerFilter}
                    onChange={(e) =>
                      setChartLearnerFilter(e.target.value as "all" | "in_progress" | "completed")
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-foreground focus:ring-1 focus:ring-primary outline-hidden cursor-pointer"
                    aria-label="Phân khúc đối tượng học viên vĩ mô"
                    title="Lọc xu hướng phân tích theo nhóm đối tượng học viên trên toàn hệ thống"
                  >
                    <option value="all">Nhóm: Tất cả học viên</option>
                    <option value="in_progress">Nhóm: Đang học</option>
                    <option value="completed">Nhóm: Đã tốt nghiệp</option>
                  </select>
                </div>
              </div>
            ) : allChartTab === "certs" ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <Filter className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  <span>Khóa học cấp chứng chỉ:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={certCourseFilter}
                    onChange={(e) => setCertCourseFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-foreground focus:ring-1 focus:ring-primary outline-hidden cursor-pointer"
                    aria-label="Lọc chứng chỉ theo khóa học"
                  >
                    <option value="all">Tất cả khóa học ({courses.length})</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.title}>
                        {c.title}
                      </option>
                    ))}
                  </select>
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
              activeCourseId={activeCourse?.id}
              onSelectCourse={onSelectCourse}
            />
          )}

          {/* Tab 3: Danh sách toàn bộ chứng chỉ đã cấp */}
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
        {/* Phản Hồi Sinh Viên */}
        <InstructorRecentReviewsCard
          reviews={overviewReviews}
          avgRating={avgRatingAllCourses || "5.0"}
        />
      </div>
    </div>
  );
}
