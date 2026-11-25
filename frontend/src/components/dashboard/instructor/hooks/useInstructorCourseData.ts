"use client";

import { useMemo, useState } from "react";
import type { Course, InstructorAnalytics, EnrolledStudent } from "@/gen/catalog/v1/catalog_pb";
import type { SpecificCompletedStudent } from "../components/InstructorCertificatesTab";
import type { CalculatedWeek, StudentWithPacing } from "../types";

export interface UseInstructorCourseDataProps {
  activeCourse: Course | null;
  analytics: InstructorAnalytics | null | undefined;
  currentTimeMs: number;
}

export function useInstructorCourseData({
  activeCourse,
  analytics,
  currentTimeMs,
}: UseInstructorCourseDataProps) {
  const rawStudents = useMemo<EnrolledStudent[]>(() => {
    return analytics?.students || [];
  }, [analytics]);

  const completedStudents = useMemo<SpecificCompletedStudent[]>(() => {
    return rawStudents
      .filter((s) => s.progressPercent >= 100)
      .map((s) => ({
        userId: s.userId,
        userName: s.userName,
        userEmail: s.userEmail,
        enrolledAt: s.enrolledAt,
      }));
  }, [rawStudents]);

  const totalItemsInActiveCourse = useMemo(() => {
    if (!activeCourse?.weekModules) return 0;
    return activeCourse.weekModules.reduce((acc, wm) => {
      const items = wm.lessons
        ? wm.lessons.reduce((lAcc, l) => lAcc + (l.items?.length || 0), 0)
        : 0;
      return acc + items;
    }, 0);
  }, [activeCourse]);

  const [weeklyCohortFilter, setWeeklyCohortFilter] = useState<"ALL" | "PAID" | "AUDIT">("PAID");

  const paidStudentsCount = useMemo(() => {
    return rawStudents.filter((s) => s.enrollmentType !== "AUDIT").length;
  }, [rawStudents]);

  const auditStudentsCount = useMemo(() => {
    return rawStudents.filter((s) => s.enrollmentType === "AUDIT").length;
  }, [rawStudents]);

  const totalLearningHours = useMemo(() => {
    if (analytics?.totalLearningHours !== undefined && analytics.totalLearningHours > 0) {
      return analytics.totalLearningHours;
    }
    const totalSeconds = rawStudents.reduce((acc, s) => acc + (s.totalTimeSpentSeconds || 0), 0);
    return Math.round((totalSeconds / 3600) * 10) / 10;
  }, [analytics, rawStudents]);

  const paidLearningHours = useMemo(() => {
    if (analytics?.paidLearningHours !== undefined && analytics.paidLearningHours > 0) {
      return analytics.paidLearningHours;
    }
    const paidSeconds = rawStudents
      .filter((s) => s.enrollmentType !== "AUDIT")
      .reduce((acc, s) => acc + (s.totalTimeSpentSeconds || 0), 0);
    return Math.round((paidSeconds / 3600) * 10) / 10;
  }, [analytics, rawStudents]);

  const auditLearningHours = useMemo(() => {
    if (analytics?.auditLearningHours !== undefined && analytics.auditLearningHours > 0) {
      return analytics.auditLearningHours;
    }
    const auditSeconds = rawStudents
      .filter((s) => s.enrollmentType === "AUDIT")
      .reduce((acc, s) => acc + (s.totalTimeSpentSeconds || 0), 0);
    return Math.round((auditSeconds / 3600) * 10) / 10;
  }, [analytics, rawStudents]);

  const filteredStudentsForWeeks = useMemo(() => {
    if (weeklyCohortFilter === "PAID") {
      return rawStudents.filter((s) => s.enrollmentType !== "AUDIT");
    }
    if (weeklyCohortFilter === "AUDIT") {
      return rawStudents.filter((s) => s.enrollmentType === "AUDIT");
    }
    return rawStudents;
  }, [rawStudents, weeklyCohortFilter]);

  const calculatedWeeks = useMemo<CalculatedWeek[]>(() => {
    const weeks = activeCourse?.weekModules || [];
    if (weeks.length === 0) return [];
    const total = filteredStudentsForWeeks.length;

    return weeks.map((w, idx) => {
      const weekCount = weeks.length;
      const startPct = (idx / weekCount) * 100;
      const endPct = ((idx + 1) / weekCount) * 100;

      const reached = filteredStudentsForWeeks.filter(
        (s) => s.progressPercent >= startPct - 0.01,
      ).length;
      const completed = filteredStudentsForWeeks.filter(
        (s) => s.progressPercent >= endPct - 0.01,
      ).length;

      const passRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const dropRate = reached > 0 ? Math.round(((reached - completed) / reached) * 100) : 0;

      return {
        id: w.id || `w-${w.weekNumber}`,
        weekNumber: w.weekNumber,
        title: w.title,
        summary: w.summary || "",
        reachedCount: reached,
        completedCount: completed,
        passRate,
        dropRate,
      };
    });
  }, [activeCourse, filteredStudentsForWeeks]);

  const bottleneckWeek = useMemo(() => {
    if (calculatedWeeks.length === 0 || filteredStudentsForWeeks.length === 0) return null;
    const withDrop = [...calculatedWeeks].filter((w) => w.dropRate > 0);
    if (withDrop.length === 0) return null;
    withDrop.sort(
      (a, b) =>
        b.dropRate - a.dropRate ||
        b.reachedCount - b.completedCount - (a.reachedCount - a.completedCount),
    );
    return withDrop[0];
  }, [calculatedWeeks, filteredStudentsForWeeks.length]);

  const rawStudentsWithPacing = useMemo<StudentWithPacing[]>(() => {
    const totalWeeks = calculatedWeeks.length || 2;
    const courseDurationDays = Math.max(14, totalWeeks * 7);
    const nowMs = currentTimeMs > 0 ? currentTimeMs : 0;

    return rawStudents.map((st) => {
      let pace: "AHEAD" | "ON_TRACK" | "BEHIND" = "ON_TRACK";
      let paceLabel = "Đúng tiến độ";
      let paceDesc = "Bám sát tuần học";

      const enrolledMs = st.enrolledAt ? new Date(st.enrolledAt).getTime() : nowMs;
      const daysElapsed = Math.max(0, Math.floor((nowMs - enrolledMs) / (1000 * 60 * 60 * 24)));
      const expectedProgressPct = Math.min(
        100,
        Math.round((daysElapsed / courseDurationDays) * 100),
      );

      if (st.enrollmentType === "AUDIT") {
        pace = "ON_TRACK";
        paceLabel = "Học thử (Audit)";
        paceDesc =
          st.progressPercent >= 20
            ? "Đã học xong Tuần 1 • Sẵn sàng nâng cấp"
            : "Đang xem bài học Tuần 1";
      } else if (st.progressPercent >= 100) {
        pace = "AHEAD";
        paceLabel = "Vượt tiến độ";
        paceDesc = "Đã hoàn thành khóa";
      } else if (st.isInCooldown) {
        pace = "BEHIND";
        paceLabel = "Khóa Cooldown";
        paceDesc = "Tạm khóa thi lại do trượt nhiều lần";
      } else if (st.progressPercent >= 80 || st.progressPercent >= expectedProgressPct + 20) {
        pace = "AHEAD";
        paceLabel = "Vượt tiến độ";
        paceDesc = "Học nhanh hơn hạn dự kiến";
      } else if (
        st.progressPercent < Math.max(25, expectedProgressPct - 25) ||
        (daysElapsed > courseDurationDays && st.progressPercent < 75)
      ) {
        pace = "BEHIND";
        paceLabel = "Chậm tiến độ";
        paceDesc =
          bottleneckWeek && st.progressPercent <= 20
            ? `Dừng lại ở điểm nghẽn Tuần ${bottleneckWeek.weekNumber}`
            : "Có nguy cơ tụt lại bài học";
      }

      const currentWeekNumber = Math.max(
        1,
        Math.min(totalWeeks, Math.ceil((st.progressPercent / 100) * totalWeeks)),
      );

      return {
        ...st,
        pace,
        paceLabel,
        paceDesc,
        currentWeekNumber,
      };
    });
  }, [rawStudents, calculatedWeeks.length, currentTimeMs, bottleneckWeek]);

  const coursePacingCounts = useMemo(() => {
    return {
      all: rawStudentsWithPacing.length,
      ahead: rawStudentsWithPacing.filter((s) => s.pace === "AHEAD").length,
      onTrack: rawStudentsWithPacing.filter((s) => s.pace === "ON_TRACK").length,
      behind: rawStudentsWithPacing.filter((s) => s.pace === "BEHIND").length,
    };
  }, [rawStudentsWithPacing]);

  return {
    rawStudents,
    completedStudents,
    totalItemsInActiveCourse,
    calculatedWeeks,
    bottleneckWeek,
    weeklyCohortFilter,
    setWeeklyCohortFilter,
    paidStudentsCount,
    auditStudentsCount,
    totalLearningHours,
    paidLearningHours,
    auditLearningHours,
    rawStudentsWithPacing,
    coursePacingCounts,
  };
}
