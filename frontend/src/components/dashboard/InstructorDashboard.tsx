"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useInstructorCoursesQuery, useInstructorAnalyticsQuery } from "@/lib/query_hooks";
import type { Course } from "@/gen/catalog/v1/catalog_pb";
import type { StudentDetailRecord } from "./InstructorStudentDetailModal";
import { formatLastActiveLabel, isInactiveOver7Days } from "./student-dossier/dossier_helpers";
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

  const [currentTimeMs] = useState(() => Date.now());

  // Môn học đang được chọn khi xem chi tiết (suy xuất trực tiếp, tránh setState trong useEffect)
  const effectiveSelectedCourseId = selectedCourseId || courses[0]?.id || "";
  const activeCourse = useMemo(() => {
    return courses.find((c: Course) => c.id === effectiveSelectedCourseId) || courses[0] || null;
  }, [courses, effectiveSelectedCourseId]);

  // Analytics của môn học đang chọn
  const { data: analytics, isLoading: loadingAnalytics } = useInstructorAnalyticsQuery(
    effectiveSelectedCourseId,
    { enabled: !!effectiveSelectedCourseId },
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

  // Chuyển chọn nhanh khóa học từ các widget con sang Chế độ 2
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setViewMode("specific");
  };

  // Ánh xạ itemId -> Tuần & tổng thời lượng ước tính do giảng viên cấu hình cho khóa học đang chọn
  const { activeCourseItemWeekMap, activeCourseEstimatedMinutes } = useMemo(() => {
    const map = new Map<string, number>();
    let totalEstMinutes = 0;
    for (const wk of activeCourse?.weekModules || []) {
      const wkNum = wk.weekNumber || 1;
      for (const lesson of wk.lessons || []) {
        for (const item of lesson.items || []) {
          map.set(item.id, wkNum);
          totalEstMinutes +=
            item.estimatedMinutes && item.estimatedMinutes > 0 ? item.estimatedMinutes : 10;
        }
      }
    }
    return { activeCourseItemWeekMap: map, activeCourseEstimatedMinutes: totalEstMinutes };
  }, [activeCourse]);

  // Chuẩn hóa danh sách học viên của khóa đang chọn cho bố cục 2 cột Master-Detail
  const rosterDetailRecords = useMemo<StudentDetailRecord[]>(() => {
    const weeks = courseData.calculatedWeeks;
    const totalItems = courseData.totalItemsInActiveCourse;
    return courseData.rawStudentsWithPacing.map((student) => {
      const isDone = student.progressPercent >= 100;
      const studentWeekNum = isDone
        ? weeks.length || 1
        : Math.min(
            weeks.length || 1,
            Math.floor((student.progressPercent / 100) * (weeks.length || 1)) + 1,
          );
      const currentWeekTitle =
        weeks.find((w) => w.weekNumber === studentWeekNum)?.title || `Tuần ${studentWeekNum}`;

      return {
        userId: student.userId,
        userName: student.userName,
        userEmail: student.userEmail,
        progressPercent: student.progressPercent,
        pace: student.pace,
        enrolledAt: student.enrolledAt,
        enrollmentType: student.enrollmentType,
        totalTimeSpentSeconds: student.totalTimeSpentSeconds,
        currentWeekNumber: studentWeekNum,
        currentWeekTitle,
        currentLessonTitle: student.lastAccessedItemTitle || undefined,
        quizScore:
          student.quizAttemptsCount && student.quizAttemptsCount > 0
            ? Number(student.averageQuizScore.toFixed(1))
            : undefined,
        quizAttemptsCount: student.quizAttemptsCount,
        isInCooldown: student.isInCooldown,
        cooldownUntil: student.cooldownUntil,
        peerReviewDutyStatus: student.peerReviewDutyStatus,
        isPeerReviewOverdue: student.isPeerReviewOverdue,
        lastActiveTime: formatLastActiveLabel(student.lastAccessedAt, currentTimeMs),
        isInactive: isInactiveOver7Days(student.lastAccessedAt, currentTimeMs),
        isCompleted: isDone,
        completedItemsCount:
          student.totalCourseItems > 0
            ? student.completedItemsCount
            : totalItems > 0
              ? Math.round((student.progressPercent / 100) * totalItems)
              : 0,
        totalCourseItems: student.totalCourseItems > 0 ? student.totalCourseItems : totalItems,
        courseEstimatedMinutes: activeCourseEstimatedMinutes,
        dailyActivities: student.dailyActivities,
        currentStreak: student.currentStreak,
        longestStreak: student.longestStreak,
        courseId: activeCourse?.id,
        courseTitle: activeCourse?.title,
      };
    });
  }, [
    activeCourse?.id,
    activeCourse?.title,
    activeCourseEstimatedMinutes,
    courseData.calculatedWeeks,
    courseData.rawStudentsWithPacing,
    courseData.totalItemsInActiveCourse,
    currentTimeMs,
  ]);

  // Mở trực tiếp Modal Chi Tiết Học Viên (Master-Detail + Nudge Drawer)
  const handleNudgeStudent = (student: StudentWithPacing) => {
    const matched = rosterDetailRecords.find((r) => r.userId === student.userId);
    if (matched) {
      setSelectedStudentForDetail(matched);
      setIsStudentDetailModalOpen(true);
    }
  };

  return (
    <main className="w-full flex-1 bg-background text-foreground min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TẦNG 1: EXECUTIVE TOOLBAR */}
        <InstructorExecutiveToolbar
          userName={userName}
          viewMode={viewMode}
          onSelectViewMode={(mode) => setViewMode(mode)}
          courses={courses}
          selectedCourseId={effectiveSelectedCourseId}
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
          paidStudentsCount={
            viewMode === "all"
              ? overviewData.paidStudentsAllCourses
              : (analytics?.paidStudentsCount ?? courseData.paidStudentsCount)
          }
          auditStudentsCount={
            viewMode === "all"
              ? overviewData.auditStudentsAllCourses
              : (analytics?.auditStudentsCount ?? courseData.auditStudentsCount)
          }
          totalLearningHours={
            viewMode === "all"
              ? overviewData.totalLearningHoursAllCourses
              : courseData.totalLearningHours
          }
          paidLearningHours={
            viewMode === "all"
              ? overviewData.paidLearningHoursAllCourses
              : courseData.paidLearningHours
          }
          auditLearningHours={
            viewMode === "all"
              ? overviewData.auditLearningHoursAllCourses
              : courseData.auditLearningHours
          }
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
            />
          ) : (
            <InstructorCourseDeepDiveView
              key={activeCourse?.id || "none"}
              activeCourse={activeCourse}
              pendingQaCount={
                activeCourse && overviewData.pendingQaByCourseId.has(activeCourse.id)
                  ? overviewData.pendingQaByCourseId.get(activeCourse.id)
                  : undefined
              }
              rawStudents={courseData.rawStudents}
              rawStudentsWithPacing={courseData.rawStudentsWithPacing}
              coursePacingCounts={courseData.coursePacingCounts}
              calculatedWeeks={courseData.calculatedWeeks}
              bottleneckWeek={courseData.bottleneckWeek}
              completedStudents={courseData.completedStudents}
              totalItemsInActiveCourse={courseData.totalItemsInActiveCourse}
              currentTimeMs={currentTimeMs}
              nudgedSpecificStudentIds={nudgedSpecificStudentIds}
              onNudgeStudent={handleNudgeStudent}
              weeklyCohortFilter={courseData.weeklyCohortFilter}
              onSelectCohortFilter={courseData.setWeeklyCohortFilter}
              paidStudentsCount={courseData.paidStudentsCount}
              auditStudentsCount={courseData.auditStudentsCount}
              onNudgeAllBehind={() => {
                setIsBulkReminderModalOpen(true);
              }}
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
          students={overviewData.allPacingStudents}
          bottleneckWeek={viewMode === "specific" ? courseData.bottleneckWeek : null}
        />
      )}

      {isStudentDetailModalOpen && (
        <InstructorStudentDetailModal
          open={isStudentDetailModalOpen}
          onOpenChange={setIsStudentDetailModalOpen}
          student={selectedStudentForDetail}
          students={rosterDetailRecords}
          onSelectStudent={setSelectedStudentForDetail}
          itemWeekMap={activeCourseItemWeekMap}
          courseTitle={activeCourse?.title || "Khóa học"}
          courseId={activeCourse?.id}
          nudgedStudentIds={nudgedSpecificStudentIds}
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
          key={`${activeCourse.id}-${isBulkReminderModalOpen}-bulk`}
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
              pace: s.pace,
              paceDesc: s.paceDesc,
              courseId: activeCourse.id,
              courseTitle: activeCourse.title,
            }))}
          bottleneckWeek={courseData.bottleneckWeek}
          onSuccess={(studentIds) => {
            setNudgedSpecificStudentIds((prev) => {
              const next = new Set(prev);
              studentIds.forEach((id) => next.add(id));
              return next;
            });
          }}
        />
      )}
    </main>
  );
}
