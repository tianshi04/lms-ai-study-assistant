"use client";

import { useMemo } from "react";
import {
  useAllInstructorAnalyticsQueries,
  useAllCourseReviewsQueries,
  useGradingQueueQuery,
  useForumThreadsQuery,
} from "@/lib/query_hooks";
import { GradingQueueStatus } from "@/gen/assessment/v1/assessment_pb";
import type { Course, InstructorAnalytics } from "@/gen/catalog/v1/catalog_pb";
import type { StudentPacingRecord } from "../../InstructorPacingModal";
import type {
  OverviewActionTask,
  OverviewReview,
  OverviewCertificate,
  ComparisonCourseCardItem,
} from "../types";

export interface UseInstructorOverviewDataProps {
  courses: Course[];
  enabled: boolean;
  currentTimeMs: number;
}

export function useInstructorOverviewData({
  courses,
  enabled,
  currentTimeMs,
}: UseInstructorOverviewDataProps) {
  // Analytics của tất cả các môn giảng dạy
  const allAnalyticsQueries = useAllInstructorAnalyticsQueries(courses, {
    enabled,
  });

  const analyticsByCourseId = useMemo(() => {
    const map = new Map<string, InstructorAnalytics | null | undefined>();
    courses.forEach((c, idx) => {
      map.set(c.id, allAnalyticsQueries[idx]?.data);
    });
    return map;
  }, [courses, allAnalyticsQueries]);

  // Map số lượng học viên theo từng môn học
  const courseStudentCounts = useMemo<Record<string, number>>(() => {
    const record: Record<string, number> = {};
    courses.forEach((c, idx) => {
      const an = allAnalyticsQueries[idx]?.data;
      const count = an?.totalEnrolledStudents ?? an?.students?.length ?? 0;
      record[c.id] = count;
    });
    return record;
  }, [courses, allAnalyticsQueries]);

  // Tính tổng số lượng sinh viên trên toàn bộ các môn học phụ trách
  const totalStudentsAllCourses = useMemo(() => {
    let count = 0;
    courses.forEach((c) => {
      const an = analyticsByCourseId.get(c.id);
      count += an?.totalEnrolledStudents ?? an?.students?.length ?? 0;
    });
    return count;
  }, [courses, analyticsByCourseId]);

  // Danh sách chứng chỉ sinh viên đã hoàn thành trên tất cả các khóa học
  const allCompletedStudentsList = useMemo<OverviewCertificate[]>(() => {
    const list: OverviewCertificate[] = [];
    courses.forEach((c) => {
      const an = analyticsByCourseId.get(c.id);
      const students = an?.students || [];
      students
        .filter((st) => st.progressPercent >= 100)
        .forEach((st) => {
          list.push({
            certId: `CERT-${st.userId.slice(0, 8).toUpperCase()}`,
            userName: st.userName || "Học viên",
            userEmail: st.userEmail || "",
            courseTitle: c.title,
            issueDate: st.enrolledAt
              ? new Date(st.enrolledAt).toLocaleDateString("vi-VN")
              : "Gần đây",
          });
        });
    });
    return list;
  }, [courses, analyticsByCourseId]);

  const totalCertificatesAllCourses = allCompletedStudentsList.length;

  // Dữ liệu enriched phục vụ Sơ đồ so sánh tỷ lệ hoàn thành theo môn
  const enrichedCoursesForComparison = useMemo<ComparisonCourseCardItem[]>(() => {
    return courses.map((course) => {
      const an = analyticsByCourseId.get(course.id);
      const totalStudents = an?.totalEnrolledStudents ?? an?.students?.length ?? 0;
      const compRate = an?.averageCompletionRate != null ? Math.round(an.averageCompletionRate) : 0;
      const rating = an?.averageRating || course.averageRating || 5.0;

      return {
        id: course.id,
        title: course.title,
        subject: course.subject,
        rating,
        totalStudents,
        weekCount: course.weekModules?.length || 1,
        compRate,
      };
    });
  }, [courses, analyticsByCourseId]);

  // Truy vấn đánh giá học viên của toàn bộ các khóa học
  const allReviewsQueries = useAllCourseReviewsQueries(courses, {
    enabled,
  });

  const overviewReviews = useMemo<OverviewReview[]>(() => {
    const list: OverviewReview[] = [];
    courses.forEach((c, idx) => {
      const revs = allReviewsQueries[idx]?.data || [];
      revs.forEach((r) => {
        list.push({
          id: r.id,
          userName: r.userName || "Học viên",
          rating: r.ratingStars || 5,
          courseTitle: c.title,
          courseId: c.id,
          comment: r.commentText || "Khóa học rất hay và bổ ích!",
          timeAgo: r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "Gần đây",
        });
      });
    });
    return list;
  }, [courses, allReviewsQueries]);

  // Tính điểm đánh giá trung bình động trực tiếp từ mảng reviews thực tế
  const avgRatingAllCourses = useMemo(() => {
    if (overviewReviews.length > 0) {
      const sum = overviewReviews.reduce((acc, r) => acc + r.rating, 0);
      return (sum / overviewReviews.length).toFixed(1);
    }
    const ratings = courses.map((c) => c.averageRating).filter((r) => r > 0);
    if (ratings.length === 0) return "5.0";
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  }, [overviewReviews, courses]);

  const totalReviewsAllCourses = useMemo(() => {
    let count = 0;
    courses.forEach((c) => {
      const an = analyticsByCourseId.get(c.id);
      count += an?.reviewCount || 0;
    });
    return count;
  }, [courses, analyticsByCourseId]);

  const avgCompletionRateAllCourses = useMemo(() => {
    if (courses.length === 0) return 0;
    let totalRate = 0;
    let count = 0;
    courses.forEach((c) => {
      const an = analyticsByCourseId.get(c.id);
      if (an?.averageCompletionRate != null) {
        totalRate += an.averageCompletionRate;
        count++;
      }
    });
    return count > 0 ? Math.round(totalRate / count) : 0;
  }, [courses, analyticsByCourseId]);

  const totalLearningHoursAllCourses = useMemo(() => {
    let hours = 0;
    courses.forEach((c) => {
      const an = analyticsByCourseId.get(c.id);
      const students = an?.students || [];
      students.forEach((s) => {
        hours += Math.round((s.progressPercent / 10) * 1.5);
      });
    });
    return hours || (totalStudentsAllCourses > 0 ? totalStudentsAllCourses * 8 : 0);
  }, [courses, analyticsByCourseId, totalStudentsAllCourses]);

  const growthPercent = useMemo(() => {
    return totalStudentsAllCourses > 0 ? 15 : 0;
  }, [totalStudentsAllCourses]);

  // Truy vấn hàng đợi bài chấm thi trên toàn bộ các môn học phụ trách
  const { data: allGradingData } = useGradingQueueQuery(
    { courseId: "", status: GradingQueueStatus.ALL },
    { enabled },
  );

  // Truy vấn chủ đề thảo luận trên toàn bộ các môn học phụ trách
  const { data: allThreads = [] } = useForumThreadsQuery("", {
    enabled,
  });

  const overviewActionTasks = useMemo<OverviewActionTask[]>(() => {
    const tasks: OverviewActionTask[] = [];

    const pendingGrading = (allGradingData?.items || []).filter(
      (i) => i.status !== GradingQueueStatus.GRADED,
    );
    pendingGrading.slice(0, 3).forEach((item) => {
      tasks.push({
        id: `task-grading-${item.submissionId}`,
        type: "grading",
        title: item.itemTitle || "Bài nộp đánh giá ngang hàng",
        studentName: item.studentName || "Sinh viên",
        courseTitle: item.courseTitle || "Khóa học",
        timeAgo: "Chờ chấm",
        actionText: "Chấm ngay",
        actionUrl: `/instructor/courses/${item.courseId}/grading?submissionId=${item.submissionId}`,
      });
    });

    const pendingQA = allThreads.filter((th) => {
      const r = (th.authorRole || "").toUpperCase();
      const isStaff =
        r.includes("INSTRUCTOR") ||
        r.includes("GIẢNG VIÊN") ||
        r === "2" ||
        r.includes("TA") ||
        r === "3" ||
        r.includes("ADMIN");
      const titleLower = th.title.trim().toLowerCase();
      const isAnnouncement =
        titleLower.startsWith("[thông báo]") ||
        titleLower.startsWith("[thong bao]") ||
        titleLower.startsWith("[announcement]");
      const hasStaffReply = th.replies?.some((reply) => reply.isStaffAnswer);
      return !th.isStaffPinned && !isStaff && !isAnnouncement && !hasStaffReply;
    });

    pendingQA.slice(0, 3).forEach((thread) => {
      const course = courses.find((c) => c.id === thread.courseId);
      tasks.push({
        id: `task-qa-${thread.id}`,
        type: "video_qa",
        title: thread.title,
        lessonTitle: "Hỏi đáp thảo luận",
        studentName: thread.authorName || "Sinh viên",
        courseTitle: course?.title || "Khóa học",
        timeAgo: "Cần phản hồi",
        actionText: "Trả lời",
        actionUrl: `/instructor/courses/${thread.courseId}/discussions?threadId=${thread.id}`,
      });
    });

    return tasks;
  }, [allGradingData, allThreads, courses]);

  const pendingGradingByCourseId = useMemo(() => {
    const map = new Map<string, number>();
    const items = allGradingData?.items || [];
    items.forEach((item) => {
      if (item.status !== GradingQueueStatus.GRADED && item.courseId) {
        map.set(item.courseId, (map.get(item.courseId) || 0) + 1);
      }
    });
    return map;
  }, [allGradingData]);

  const pendingQaByCourseId = useMemo(() => {
    const map = new Map<string, number>();
    allThreads.forEach((th) => {
      const r = (th.authorRole || "").toUpperCase();
      const isStaff =
        r.includes("INSTRUCTOR") ||
        r.includes("GIẢNG VIÊN") ||
        r === "2" ||
        r.includes("TA") ||
        r === "3" ||
        r.includes("ADMIN");
      const titleLower = th.title.trim().toLowerCase();
      const isAnnouncement =
        titleLower.startsWith("[thông báo]") ||
        titleLower.startsWith("[thong bao]") ||
        titleLower.startsWith("[announcement]");
      const hasStaffReply = th.replies?.some((reply) => reply.isStaffAnswer);
      if (!isStaff && !isAnnouncement && !hasStaffReply && th.courseId) {
        map.set(th.courseId, (map.get(th.courseId) || 0) + 1);
      }
    });
    return map;
  }, [allThreads]);

  // Danh sách toàn bộ học viên kèm nhịp độ học tập trên TẤT CẢ các khóa học
  const allPacingStudents = useMemo<StudentPacingRecord[]>(() => {
    const result: StudentPacingRecord[] = [];
    const nowMs = currentTimeMs > 0 ? currentTimeMs : 0;

    courses.forEach((course) => {
      const an = analyticsByCourseId.get(course.id);
      if (!an?.students || an.students.length === 0) return;

      const totalWeeks = course.weekModules?.length || 2;
      const courseDurationDays = Math.max(14, totalWeeks * 7);

      an.students.forEach((st) => {
        let pace: "AHEAD" | "ON_TRACK" | "BEHIND" = "ON_TRACK";
        let paceDescription = "Bám sát tiến độ tuần học";

        const enrolledMs = st.enrolledAt ? new Date(st.enrolledAt).getTime() : nowMs;
        const daysElapsed = Math.max(0, Math.floor((nowMs - enrolledMs) / (1000 * 60 * 60 * 24)));
        const expectedProgressPct = Math.min(
          100,
          Math.round((daysElapsed / courseDurationDays) * 100),
        );

        if (st.progressPercent >= 100) {
          pace = "AHEAD";
          paceDescription = "Đã hoàn thành toàn diện khóa học";
        } else if (st.progressPercent >= 80 || st.progressPercent >= expectedProgressPct + 20) {
          pace = "AHEAD";
          paceDescription = "Học nhanh hơn tiến độ đề xuất";
        } else if (
          st.progressPercent < Math.max(25, expectedProgressPct - 25) ||
          (daysElapsed > courseDurationDays && st.progressPercent < 75)
        ) {
          pace = "BEHIND";
          paceDescription = "Có nguy cơ chậm tiến độ, cần khích lệ học";
        }

        const currentWeekNumber = Math.max(
          1,
          Math.min(totalWeeks, Math.ceil((st.progressPercent / 100) * totalWeeks)),
        );

        result.push({
          id: st.userId,
          name: st.userName || "Học viên",
          email: st.userEmail || "",
          courseId: course.id,
          courseTitle: course.title,
          progressPercent: Math.round(st.progressPercent),
          currentLesson:
            st.progressPercent >= 100
              ? "Đã hoàn thành toàn bộ khóa học"
              : `Tiến độ ${Math.round(st.progressPercent)}% đề cương`,
          currentWeekNumber,
          lastActive: "Gần đây",
          daysInactive: Math.min(daysElapsed, 7),
          pace,
          paceDescription,
          bottleneckStuck: pace === "BEHIND",
        });
      });
    });

    return result;
  }, [courses, analyticsByCourseId, currentTimeMs]);

  // Bộ chỉ số tổng hợp tỷ trọng nhịp độ học tập toàn hệ thống
  const pacingCohortSummary = useMemo(() => {
    const total = allPacingStudents.length;
    const ahead = allPacingStudents.filter((s) => s.pace === "AHEAD").length;
    const onTrack = allPacingStudents.filter((s) => s.pace === "ON_TRACK").length;
    const behind = allPacingStudents.filter((s) => s.pace === "BEHIND").length;

    return {
      total,
      aheadCount: ahead,
      aheadPercent: total > 0 ? Math.round((ahead / total) * 100) : 0,
      onTrackCount: onTrack,
      onTrackPercent: total > 0 ? Math.round((onTrack / total) * 100) : 0,
      behindCount: behind,
      behindPercent: total > 0 ? Math.round((behind / total) * 100) : 0,
    };
  }, [allPacingStudents]);

  const totalPendingGradingCount = useMemo(() => {
    return (allGradingData?.items || []).filter((i) => i.status !== GradingQueueStatus.GRADED)
      .length;
  }, [allGradingData]);

  const totalPendingQaCount = useMemo(() => {
    return allThreads.filter((th) => {
      const r = (th.authorRole || "").toUpperCase();
      const isStaff =
        r.includes("INSTRUCTOR") ||
        r.includes("GIẢNG VIÊN") ||
        r === "2" ||
        r.includes("TA") ||
        r === "3" ||
        r.includes("ADMIN");
      const titleLower = th.title.trim().toLowerCase();
      const isAnnouncement =
        titleLower.startsWith("[thông báo]") ||
        titleLower.startsWith("[thong bao]") ||
        titleLower.startsWith("[announcement]");
      const hasStaffReply = th.replies?.some((reply) => reply.isStaffAnswer);
      return !th.isStaffPinned && !isStaff && !isAnnouncement && !hasStaffReply;
    }).length;
  }, [allThreads]);

  const totalPendingTasksCount = totalPendingGradingCount + totalPendingQaCount;

  return {
    analyticsByCourseId,
    courseStudentCounts,
    totalStudentsAllCourses,
    allCompletedStudentsList,
    totalCertificatesAllCourses,
    enrichedCoursesForComparison,
    overviewReviews,
    avgRatingAllCourses,
    totalReviewsAllCourses,
    avgCompletionRateAllCourses,
    totalLearningHoursAllCourses,
    growthPercent,
    overviewActionTasks,
    totalPendingTasksCount,
    pendingGradingByCourseId,
    pendingQaByCourseId,
    allPacingStudents,
    pacingCohortSummary,
  };
}
