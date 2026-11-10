"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useInstructorCoursesQuery, useInstructorAnalyticsQuery } from "@/lib/query_hooks";
import type { Course } from "@/gen/catalog/v1/catalog_pb";
import type { StudentDetailRecord } from "./InstructorStudentDetailModal";
import { InstructorExecutiveToolbar } from "./instructor/components/InstructorExecutiveToolbar";
import { InstructorKpiRibbon } from "./instructor/components/InstructorKpiRibbon";
import { InstructorOverviewView } from "./instructor/views/InstructorOverviewView";
import { InstructorCourseDeepDiveView } from "./instructor/views/InstructorCourseDeepDiveView";
import { useInstructorOverviewData } from "./instructor/hooks/useInstructorOverviewData";
import { useInstructorCourseData } from "./instructor/hooks/useInstructorCourseData";
import type { StudentWithPacing } from "./instructor/types";

export type { TimeDataPoint } from "./instructor/types";

// =============================================================================
// DYNAMIC MODALS (Nạp lười khi người dùng click để tối ưu First Contentful Paint)
// =============================================================================
const OrganizationMembersModal = dynamic(
  () =>
    import("@/components/identity/OrganizationMembersModal").then(
      (m) => m.OrganizationMembersModal,
    ),
  { ssr: false },
);

const InstructorPacingModal = dynamic(
  () => import("./InstructorPacingModal").then((m) => m.InstructorPacingModal),
  { ssr: false },
);

const InstructorStudentDetailModal = dynamic(
  () => import("./InstructorStudentDetailModal").then((m) => m.InstructorStudentDetailModal),
  { ssr: false },
);

const InstructorBulkReminderModal = dynamic(
  () => import("./InstructorBulkReminderModal").then((m) => m.InstructorBulkReminderModal),
  { ssr: false },
);

export function InstructorDashboard({ userName }: { userName: string }) {
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const { data: courses = [] } = useInstructorCoursesQuery(50);

  // Chế độ hiển thị: "all" (Toàn bộ môn học) | "specific" (Từng môn cụ thể)
  const [viewMode, setViewMode] = useState<"all" | "specific">("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Modal nhịp độ toàn hệ thống
  const [isPacingModalOpen, setIsPacingModalOpen] = useState(false);
  const [pacingModalCategory, setPacingModalCategory] = useState<
    "ALL" | "AHEAD" | "ON_TRACK" | "BEHIND"
  >("ALL");

  // State nhắc nhở & xem chi tiết sinh viên
  const [nudgedSpecificStudentIds, setNudgedSpecificStudentIds] = useState<Set<string>>(new Set());
  const [isBulkReminderModalOpen, setIsBulkReminderModalOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] =
    useState<StudentDetailRecord | null>(null);
  const [isStudentDetailModalOpen, setIsStudentDetailModalOpen] = useState(false);

  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  useEffect(() => {
    setCurrentTimeMs(Date.now());
  }, []);

  const currentMonthNumber = useMemo(() => {
    const d = currentTimeMs > 0 ? new Date(currentTimeMs) : new Date();
    return d.getMonth() + 1;
  }, [currentTimeMs]);

  const lastMonthNumber = useMemo(() => {
    const d = currentTimeMs > 0 ? new Date(currentTimeMs) : new Date();
    d.setMonth(d.getMonth() - 1);
    return d.getMonth() + 1;
  }, [currentTimeMs]);

  // Tự động gán khóa học đầu tiên làm active course dự phòng
  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  // Môn học đang được chọn khi xem chi tiết
  const activeCourse = useMemo(() => {
    return courses.find((c: Course) => c.id === selectedCourseId) || courses[0] || null;
  }, [courses, selectedCourseId]);

  // Analytics của môn học đang chọn
  const { data: analytics, isLoading: loadingAnalytics } = useInstructorAnalyticsQuery(
    selectedCourseId,
    { enabled: !!selectedCourseId },
  );

  // Hook dữ liệu cho Chế độ 1: Tổng quan tất cả khóa học
  const overviewData = useInstructorOverviewData({
    courses,
    enabled: viewMode === "all",
    currentTimeMs,
  });

  // Hook dữ liệu cho Chế độ 2: Chi tiết khóa học được chọn
  const courseData = useInstructorCourseData({
    activeCourse,
    analytics,
    currentTimeMs,
  });

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setViewMode("specific");
  };

  const handleNudgeStudent = (student: StudentWithPacing) => {
    setNudgedSpecificStudentIds((prev) => new Set(prev).add(student.userId));
  };

  return (
    <div className="w-full flex-1 bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TẦNG 1: EXECUTIVE TOOLBAR */}
        <InstructorExecutiveToolbar
          userName={userName}
          viewMode={viewMode}
          onSelectViewMode={(mode) => setViewMode(mode)}
          courses={courses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={handleSelectCourse}
          onOpenOrgModal={() => setIsOrgModalOpen(true)}
          courseStudentCounts={overviewData.courseStudentCounts}
        />

        {/* TẦNG 2: KPI RIBBON */}
        <InstructorKpiRibbon
          viewMode={viewMode}
          totalStudents={
            viewMode === "all"
              ? overviewData.totalStudentsAllCourses
              : courseData.rawStudents.length
          }
          growthPercent={overviewData.growthPercent}
          avgCompletionRate={
            viewMode === "all"
              ? overviewData.avgCompletionRateAllCourses
              : analytics?.averageCompletionRate != null
                ? analytics.averageCompletionRate
                : 0
          }
          avgRating={
            viewMode === "all"
              ? overviewData.avgRatingAllCourses
              : analytics?.averageRating
                ? analytics.averageRating
                : activeCourse?.averageRating
                  ? activeCourse.averageRating
                  : 5.0
          }
          reviewCount={
            viewMode === "all" ? overviewData.totalReviewsAllCourses : analytics?.reviewCount || 0
          }
          totalCertificates={
            viewMode === "all"
              ? overviewData.totalCertificatesAllCourses
              : courseData.completedStudents.length
          }
          totalLearningHours={overviewData.totalLearningHoursAllCourses}
          loading={loadingAnalytics}
        />

        {/* TẦNG 3: BỐ CỤC 2 CỘT CHUYÊN BIỆT (PHÂN RÃ SẠCH THEO VIEW) */}
        <div>
          {viewMode === "all" ? (
            <InstructorOverviewView
              courses={courses}
              activeCourse={activeCourse}
              onSelectCourse={handleSelectCourse}
              analyticsByCourseId={overviewData.analyticsByCourseId}
              pendingGradingByCourseId={overviewData.pendingGradingByCourseId}
              overdueGradingByCourseId={overviewData.overdueGradingByCourseId}
              pendingQaByCourseId={overviewData.pendingQaByCourseId}
              overviewActionTasks={overviewData.overviewActionTasks}
              totalPendingTasksCount={overviewData.totalPendingTasksCount}
              totalPendingGradingCount={overviewData.totalPendingGradingCount}
              totalPendingQaCount={overviewData.totalPendingQaCount}
              totalOverdueTasksCount={overviewData.totalOverdueTasksCount}
              overviewReviews={overviewData.overviewReviews}
              avgRatingAllCourses={overviewData.avgRatingAllCourses}
              totalStudentsAllCourses={overviewData.totalStudentsAllCourses}
              totalCertificatesAllCourses={overviewData.totalCertificatesAllCourses}
              allCompletedStudentsList={overviewData.allCompletedStudentsList}
              pacingCohortSummary={overviewData.pacingCohortSummary}
              onOpenPacingModal={(cat) => {
                setPacingModalCategory(cat || "ALL");
                setIsPacingModalOpen(true);
              }}
              enrichedCoursesForComparison={overviewData.enrichedCoursesForComparison}
              currentMonthNumber={currentMonthNumber}
              lastMonthNumber={lastMonthNumber}
            />
          ) : (
            <InstructorCourseDeepDiveView
              activeCourse={activeCourse}
              rawStudents={courseData.rawStudents}
              rawStudentsWithPacing={courseData.rawStudentsWithPacing}
              coursePacingCounts={courseData.coursePacingCounts}
              calculatedWeeks={courseData.calculatedWeeks}
              bottleneckWeek={courseData.bottleneckWeek}
              completedStudents={courseData.completedStudents}
              totalItemsInActiveCourse={courseData.totalItemsInActiveCourse}
              currentTimeMs={currentTimeMs}
              currentMonthNumber={currentMonthNumber}
              lastMonthNumber={lastMonthNumber}
              nudgedSpecificStudentIds={nudgedSpecificStudentIds}
              onNudgeStudent={handleNudgeStudent}
              onNudgeAllBehind={() => setIsBulkReminderModalOpen(true)}
              onSelectStudentForDetail={(record) => {
                setSelectedStudentForDetail(record);
                setIsStudentDetailModalOpen(true);
              }}
            />
          )}
        </div>
      </div>
      {/* ===================================================================== */}
      {/* CÁC DIALOG MODAL QUẢN LÝ (DYNAMIC)                                     */}
      {/* ===================================================================== */}
      {isOrgModalOpen && (
        <OrganizationMembersModal
          isOpen={isOrgModalOpen}
          onClose={() => setIsOrgModalOpen(false)}
          organizationId="org-coursera-partner-default"
        />
      )}

      {isPacingModalOpen && (
        <InstructorPacingModal
          open={isPacingModalOpen}
          onOpenChange={setIsPacingModalOpen}
          initialCategory={pacingModalCategory}
          coursesList={courses.map((c) => ({ id: c.id, title: c.title }))}
          students={overviewData.allPacingStudents}
        />
      )}

      {isStudentDetailModalOpen && (
        <InstructorStudentDetailModal
          open={isStudentDetailModalOpen}
          onOpenChange={setIsStudentDetailModalOpen}
          student={selectedStudentForDetail}
          courseTitle={activeCourse?.title || "Khóa học"}
          courseId={activeCourse?.id}
          isNudged={
            selectedStudentForDetail
              ? nudgedSpecificStudentIds.has(selectedStudentForDetail.userId)
              : false
          }
          onSendReminder={(studentId) => {
            setNudgedSpecificStudentIds((prev) => new Set(prev).add(studentId));
          }}
        />
      )}

      {isBulkReminderModalOpen && activeCourse && (
        <InstructorBulkReminderModal
          key={`${activeCourse.id}-${isBulkReminderModalOpen}`}
          open={isBulkReminderModalOpen}
          onOpenChange={setIsBulkReminderModalOpen}
          courseId={activeCourse.id}
          courseTitle={activeCourse.title}
          students={courseData.rawStudentsWithPacing
            .filter((s) => s.pace === "BEHIND")
            .map((s) => ({
              userId: s.userId,
              userName: s.userName,
              userEmail: s.userEmail,
              progressPercent: s.progressPercent,
              paceDesc: s.paceDesc,
            }))}
          bottleneckWeek={courseData.bottleneckWeek}
          onSuccess={(studentIds) => {
            studentIds.forEach((id) =>
              setNudgedSpecificStudentIds((prev) => new Set(prev).add(id)),
            );
          }}
        />
      )}
    </div>
  );
}
