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
import type { Course, InstructorAnalytics } from "@/gen/catalog/v1/catalog_pb";
import { InstructorSplineChart } from "../../InstructorSplineChart";
import { InstructorDateRangeForm } from "../components/InstructorDateRangeForm";
import { InstructorCourseComparisonTab } from "../components/InstructorCourseComparisonTab";
import { InstructorCertificatesTab } from "../components/InstructorCertificatesTab";
import { InstructorPacingCohortsCard } from "../components/InstructorPacingCohortsCard";
import { InstructorRecentReviewsCard } from "../components/InstructorRecentReviewsCard";
import { InstructorActionTasksCard } from "../components/InstructorActionTasksCard";
import { InstructorActivityHeatmap } from "../components/InstructorActivityHeatmap";
import { Select } from "@/components/ui/Select";
import { useInstructorActivityTimelineQuery } from "@/lib/queries/useCatalogQueries";
import { formatTimelineToSplineData } from "../utils/time_labels";
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
  courses: _courses,
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
  // Tab biểu đồ ở chế độ tất cả môn: "trend" | "heatmap" | "compare" | "certs"
  const [allChartTab, setAllChartTab] = useState<"trend" | "heatmap" | "compare" | "certs">(
    "trend",
  );
  const [chartDateRange, setChartDateRange] = useState("7d");
  const [chartLearnerFilter, setChartLearnerFilter] = useState<
    "all" | "paid_in_progress" | "paid_completed" | "audit" | "paid" | "in_progress" | "completed"
  >("all");
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

  // Dữ liệu biểu đồ từ API thực tế 100% (Zero-Fallback & No Mock Math.sin)
  const allCoursesWeekDaysData = useMemo(() => {
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

    allCoursesWeekDaysData.forEach((d) => {
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
  }, [allCoursesWeekDaysData]);

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
                onClick={() => setAllChartTab("heatmap")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  allChartTab === "heatmap"
                    ? "bg-surface text-foreground shadow-xs font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-destructive" aria-hidden="true" />
                <span>Khung giờ học</span>
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
                <span>Chứng chỉ đã cấp</span>
              </button>
            </div>

            {/* Thanh điều khiển bộ lọc thời gian & đối tượng học viên (Cố định cho cả Hoạt động và Khung giờ học) */}
            {allChartTab === "trend" || allChartTab === "heatmap" ? (
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
                      aria-label="Chọn khoảng thời gian biểu đồ toàn sàn"
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
                      aria-label="Phân khúc đối tượng học viên vĩ mô"
                      title="Lọc xu hướng phân tích theo nhóm đối tượng học viên trên toàn hệ thống"
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
            {/* Tab 1: Biểu đồ Hoạt động học tập (Đường cong Spline) */}
            {allChartTab === "trend" && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    Lượng học viên hoạt động hàng ngày trên tất cả các khóa học giảng dạy:
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Lượt học viên truy
                      cập
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-success" /> Lượt hoàn thành bài
                      học
                    </span>
                  </div>
                </div>

                <InstructorSplineChart
                  data={allCoursesWeekDaysData}
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

            {/* Tab 2: Sơ đồ Mật độ Khung giờ học tập toàn sàn */}
            {allChartTab === "heatmap" && (
              <InstructorActivityHeatmap heatmap={activityTimelineData?.heatmap || []} />
            )}

            {/* Tab 3: So sánh tỷ lệ hoàn thành & hiệu suất giữa các môn */}
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
                certificates={allCompletedStudentsList}
                totalCount={totalCertificatesAllCourses}
              />
            )}
          </div>
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
      <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
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
