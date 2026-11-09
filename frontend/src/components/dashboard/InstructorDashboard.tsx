"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  useInstructorCoursesQuery,
  useInstructorAnalyticsQuery,
  useAllInstructorAnalyticsQueries,
  useAllCourseReviewsQueries,
  useGradingQueueQuery,
  useForumThreadsQuery,
} from "@/lib/query_hooks";
import { GradingQueueStatus } from "@/gen/assessment/v1/assessment_pb";
import dynamic from "next/dynamic";
import type { Course } from "@/gen/catalog/v1/catalog_pb";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import {
  AlertTriangle,
  Search,
  Filter,
  BookOpen,
  X,
  CheckCircle2,
  Clock,
  Mail,
  ArrowRight,
  ChevronRight,
  Star,
  TrendingDown,
  BarChart3,
  Award,
  GitCommit,
  Zap,
} from "lucide-react";
import { InstructorSplineChart } from "./InstructorSplineChart";
import { InstructorHeatmap } from "./InstructorHeatmap";
import type { StudentDetailRecord } from "./InstructorStudentDetailModal";
import type { StudentPacingRecord } from "./InstructorPacingModal";

import { generateTimeLabels } from "./instructor/utils/time_labels";
import type { OverviewActionTask, OverviewReview, OverviewCertificate } from "./instructor/types";
import { InstructorExecutiveToolbar } from "./instructor/components/InstructorExecutiveToolbar";
import { InstructorKpiRibbon } from "./instructor/components/InstructorKpiRibbon";
import { InstructorPacingCohortsCard } from "./instructor/components/InstructorPacingCohortsCard";
import { InstructorActionTasksCard } from "./instructor/components/InstructorActionTasksCard";
import { InstructorCourseComparisonTable } from "./instructor/components/InstructorCourseComparisonTable";
import { InstructorDateRangeForm } from "./instructor/components/InstructorDateRangeForm";
import { InstructorRecentReviewsCard } from "./instructor/components/InstructorRecentReviewsCard";

export type { TimeDataPoint } from "./instructor/types";

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

  // Chế độ hiển thị: MẶC ĐỊNH LÀ "all" (Tất cả môn học) -> khi click chọn lớp sẽ chuyển sang "specific" (Từng lớp cụ thể)
  const [viewMode, setViewMode] = useState<"all" | "specific">("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Tab biểu đồ phân tích của lớp cụ thể: "bar" (Cột 7 ngày) | "funnel" (Phễu tuần) | "certs" (Chứng chỉ đã cấp)
  const [chartTab, setChartTab] = useState<"bar" | "funnel" | "certs">("bar");

  // Tab biểu đồ ở chế độ tất cả môn: "trend" (Xu hướng 7 ngày toàn sàn) | "heatmap" (Bản đồ nhiệt giờ học) | "compare" (So sánh tỷ lệ hoàn thành các môn) | "certs" (Toàn bộ chứng chỉ)
  const [allChartTab, setAllChartTab] = useState<"trend" | "heatmap" | "compare" | "certs">(
    "trend",
  );

  // Modal kiểm soát nhịp độ học tập toàn hệ thống
  const [isPacingModalOpen, setIsPacingModalOpen] = useState(false);
  const [pacingModalCategory, setPacingModalCategory] = useState<
    "ALL" | "AHEAD" | "ON_TRACK" | "BEHIND"
  >("ALL");

  // Bộ lọc nhịp độ học tập cho môn học đang chọn
  const [studentPacingFilter, setStudentPacingFilter] = useState<
    "ALL" | "AHEAD" | "ON_TRACK" | "BEHIND"
  >("ALL");
  const [nudgedSpecificStudentIds, setNudgedSpecificStudentIds] = useState<Set<string>>(new Set());
  const [isBulkReminderModalOpen, setIsBulkReminderModalOpen] = useState(false);
  // Modal xem chi tiết tiến độ sinh viên & gửi thông báo nhắc nhở
  const [selectedStudentForDetail, setSelectedStudentForDetail] =
    useState<StudentDetailRecord | null>(null);
  const [isStudentDetailModalOpen, setIsStudentDetailModalOpen] = useState(false);

  // Sắp xếp của Sơ đồ So sánh tỷ lệ hoàn thành theo môn
  const [compareSortBy, setCompareSortBy] = useState<"rate" | "students" | "rating">("rate");

  // Kiểu hiển thị của Sơ đồ phễu chi tiết: "pipeline" (Dòng chảy tuần) | "bars" (Cột tỷ lệ)
  const [funnelViewType, setFunnelViewType] = useState<"pipeline" | "bars">("pipeline");

  // Bộ lọc ngày & đối tượng trên biểu đồ
  const [chartDateRange, setChartDateRange] = useState("7d");
  // Bộ lọc môn học cho Tab Chứng chỉ đã cấp toàn hệ thống (Mặc định: Tất cả khóa học)
  const [certCourseFilter, setCertCourseFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  useEffect(() => {
    setCurrentTimeMs(Date.now());
  }, []);

  const currentMonthNumber = useMemo(() => {
    const d = currentTimeMs > 0 ? new Date(currentTimeMs) : new Date("2026-11-01");
    return d.getMonth() + 1;
  }, [currentTimeMs]);

  const lastMonthNumber = useMemo(() => {
    const d = currentTimeMs > 0 ? new Date(currentTimeMs) : new Date("2026-11-01");
    d.setMonth(d.getMonth() - 1);
    return d.getMonth() + 1;
  }, [currentTimeMs]);

  const [chartLearnerFilter, setChartLearnerFilter] = useState<"all" | "in_progress" | "completed">(
    "all",
  );

  // Tương tác lọc danh sách học viên khi click vào Cột Ngày hoặc Tuần học
  const [selectedDayFilter, setSelectedDayFilter] = useState<{ day: string; date: string } | null>(
    null,
  );
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | null>(null);

  // Bộ lọc bảng học viên
  const [studentStatusFilter, setStudentStatusFilter] = useState<
    "ALL" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE"
  >("ALL");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

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

  // Truy vấn thống kê chi tiết lớp học đang chọn qua TanStack Query
  const { data: analytics, isLoading: loadingAnalytics } = useInstructorAnalyticsQuery(
    activeCourse?.id || "",
    { enabled: !!activeCourse?.id },
  );

  // Truy vấn song song dữ liệu phân tích của TẤT CẢ các khóa học để đồng nhất toàn bộ biểu đồ & KPI
  const allAnalyticsQueries = useAllInstructorAnalyticsQueries(courses);

  const analyticsByCourseId = useMemo(() => {
    const map = new Map<string, typeof analytics>();
    courses.forEach((c, idx) => {
      const item = allAnalyticsQueries[idx]?.data;
      if (item) {
        map.set(c.id, item);
      }
    });
    return map;
  }, [courses, allAnalyticsQueries]);

  // Danh sách khóa học được làm giàu với số liệu thực tế từ database phục vụ Sơ đồ 2 & Bảng tổng quan
  const enrichedCoursesForComparison = useMemo(() => {
    const list = courses.map((course) => {
      const isCurrentActive = course.id === activeCourse?.id;
      const an = isCurrentActive ? analytics : analyticsByCourseId.get(course.id);

      const totalStudents = an?.totalEnrolledStudents ?? an?.students?.length ?? 0;
      const compRate = an?.averageCompletionRate != null ? Math.round(an.averageCompletionRate) : 0;
      const completedCount = an?.students?.filter((s) => s.progressPercent >= 100).length ?? 0;
      const inProgressCount = Math.max(0, totalStudents - completedCount);
      const rating = an?.averageRating || course.averageRating || 5.0;
      const reviewCount = an?.reviewCount || 0;
      const pendingAssignments = 0;
      const pendingQuestions = 0;

      const weekCount = course.weekModules?.length || 0;
      const itemCount = course.weekModules
        ? course.weekModules.reduce(
            (acc, wm) =>
              acc + (wm.lessons?.reduce((lAcc, l) => lAcc + (l.items?.length || 0), 0) || 0),
            0,
          )
        : 0;

      return {
        ...course,
        totalStudents,
        compRate,
        completedCount,
        inProgressCount,
        rating,
        reviewCount,
        pendingAssignments,
        pendingQuestions,
        weekCount,
        itemCount,
      };
    });

    if (compareSortBy === "rate") {
      list.sort((a, b) => b.compRate - a.compRate || b.totalStudents - a.totalStudents);
    } else if (compareSortBy === "students") {
      list.sort((a, b) => b.totalStudents - a.totalStudents || b.compRate - a.compRate);
    } else if (compareSortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating || b.totalStudents - a.totalStudents);
    }

    return list;
  }, [courses, analyticsByCourseId, activeCourse?.id, analytics, compareSortBy]);

  const courseStudentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    enrichedCoursesForComparison.forEach((c) => {
      map[c.id] = c.totalStudents;
    });
    return map;
  }, [enrichedCoursesForComparison]);

  // Danh sách học viên thực tế của môn đang chọn
  const rawStudents = useMemo(() => analytics?.students || [], [analytics]);

  // Sinh viên đã hoàn thành (tiến độ >= 100%) của môn đang chọn
  const completedStudents = useMemo(
    () => rawStudents.filter((s) => s.progressPercent >= 100),
    [rawStudents],
  );

  // Thống kê tổng hợp toàn bộ các môn học ở chế độ Tổng quan (100% dữ liệu thật từ DB)
  const totalStudentsAllCourses = useMemo(() => {
    let count = 0;
    courses.forEach((c) => {
      const an = analyticsByCourseId.get(c.id);
      count += an?.totalEnrolledStudents ?? an?.students?.length ?? 0;
    });
    return count;
  }, [courses, analyticsByCourseId]);

  const totalCertificatesAllCourses = useMemo(() => {
    let count = 0;
    courses.forEach((c) => {
      const an = analyticsByCourseId.get(c.id);
      count += an?.students?.filter((s) => s.progressPercent >= 100).length ?? 0;
    });
    return count;
  }, [courses, analyticsByCourseId]);

  const allCompletedStudentsList = useMemo<OverviewCertificate[]>(() => {
    const list: OverviewCertificate[] = [];
    courses.forEach((c) => {
      const an = analyticsByCourseId.get(c.id);
      if (!an?.students) return;
      an.students
        .filter((s) => s.progressPercent >= 100)
        .forEach((s, idx) => {
          list.push({
            certId: `CERT-${c.id.slice(0, 6).toUpperCase()}-${String(idx + 1).padStart(4, "0")}`,
            userName: s.userName || "Học viên",
            userEmail: s.userEmail || "",
            courseTitle: c.title,
            issueDate: s.enrolledAt
              ? new Date(s.enrolledAt).toLocaleDateString("vi-VN")
              : "Gần đây",
          });
        });
    });
    return list;
  }, [courses, analyticsByCourseId]);

  const filteredCertificates = useMemo(() => {
    if (certCourseFilter === "all") return allCompletedStudentsList;
    return allCompletedStudentsList.filter((c) =>
      c.courseTitle.toLowerCase().includes(certCourseFilter.toLowerCase()),
    );
  }, [allCompletedStudentsList, certCourseFilter]);

  const avgRatingAllCourses = useMemo(() => {
    const ratings = courses.map((c) => c.averageRating).filter((r) => r > 0);
    if (ratings.length === 0) return "5.0";
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  }, [courses]);

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

  // Truy vấn đánh giá học viên của toàn bộ các khóa học
  const allReviewsQueries = useAllCourseReviewsQueries(courses, {
    enabled: viewMode === "all",
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

  // Truy vấn hàng đợi bài chấm thi trên toàn bộ các môn học phụ trách
  const { data: allGradingData } = useGradingQueueQuery(
    { courseId: "", status: GradingQueueStatus.ALL },
    { enabled: viewMode === "all" },
  );

  // Truy vấn chủ đề thảo luận trên toàn bộ các môn học phụ trách
  const { data: allThreadsData } = useForumThreadsQuery("", {
    enabled: viewMode === "all",
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
        actionUrl: `/instructor/courses/${item.courseId}/grading`,
      });
    });

    const openThreads = (allThreadsData || []).filter((th) => {
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
      const hasStaffReply = th.replies?.some((r) => r.isStaffAnswer);
      return !th.isStaffPinned && !isStaff && !isAnnouncement && !hasStaffReply;
    });
    openThreads.slice(0, 3).forEach((th) => {
      const course = courses.find((c) => c.id === th.courseId);
      tasks.push({
        id: `task-qa-${th.id}`,
        type: "video_qa",
        title: th.title,
        studentName: th.authorName || "Học viên",
        courseTitle: course?.title || th.courseId,
        timeAgo: "Chờ giải đáp",
        actionText: "Trả lời ngay",
        actionUrl: `/instructor/courses/${th.courseId}/discussions`,
      });
    });

    return tasks;
  }, [allGradingData, allThreadsData, courses]);

  // Bản đồ đếm số bài chấm chờ xử lý theo từng khóa học
  const pendingGradingByCourseId = useMemo(() => {
    const map = new Map<string, number>();
    (allGradingData?.items || []).forEach((item) => {
      if (item.status !== GradingQueueStatus.GRADED && item.courseId) {
        map.set(item.courseId, (map.get(item.courseId) || 0) + 1);
      }
    });
    return map;
  }, [allGradingData]);

  // Bản đồ đếm số câu hỏi học viên chưa giải đáp theo từng khóa học
  const pendingQaByCourseId = useMemo(() => {
    const map = new Map<string, number>();
    (allThreadsData || []).forEach((th) => {
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
  }, [allThreadsData]);

  // Danh sách toàn bộ học viên kèm nhịp độ học tập trên TẤT CẢ các khóa học phụ trách (Dữ liệu thật từ DB)
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

  // Bộ chỉ số tổng hợp tỷ trọng nhịp độ học tập toàn hệ thống từ dữ liệu thật
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

  // Tổng số bài học thực tế trong khóa học đang chọn
  const totalItemsInActiveCourse = useMemo(() => {
    if (!activeCourse?.weekModules) return 0;
    return activeCourse.weekModules.reduce((acc, wm) => {
      const items = wm.lessons
        ? wm.lessons.reduce((lAcc, l) => lAcc + (l.items?.length || 0), 0)
        : 0;
      return acc + items;
    }, 0);
  }, [activeCourse]);

  // Cấu trúc các tuần học và tính toán tỷ lệ hoàn thành/rơi rụng ĐỘNG THEO DỮ LIỆU THẬT
  const calculatedWeeks = useMemo(() => {
    const weeks = activeCourse?.weekModules || [];
    if (weeks.length === 0) return [];
    const total = rawStudents.length;

    return weeks.map((w, idx) => {
      const weekCount = weeks.length;
      const startPct = (idx / weekCount) * 100;
      const endPct = ((idx + 1) / weekCount) * 100;

      const reached = rawStudents.filter((s) => s.progressPercent >= startPct - 0.01).length;
      const completed = rawStudents.filter((s) => s.progressPercent >= endPct - 0.01).length;

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
  }, [activeCourse, rawStudents]);

  // Tìm tuần học thực tế có tỷ lệ dừng học cao nhất (Điểm nghẽn học tập)
  const bottleneckWeek = useMemo(() => {
    if (calculatedWeeks.length === 0 || rawStudents.length === 0) return null;
    const withDrop = [...calculatedWeeks].filter((w) => w.dropRate > 0);
    if (withDrop.length === 0) return null;
    withDrop.sort(
      (a, b) =>
        b.dropRate - a.dropRate ||
        b.reachedCount - b.completedCount - (a.reachedCount - a.completedCount),
    );
    return withDrop[0];
  }, [calculatedWeeks, rawStudents.length]);

  // Làm giàu danh sách học viên của môn đang chọn với phân loại nhịp độ học tập (Pacing)
  const rawStudentsWithPacing = useMemo(() => {
    const totalWeeks = calculatedWeeks.length || 2;
    const courseDurationDays = Math.max(14, totalWeeks * 7);
    const nowMs = currentTimeMs > 0 ? currentTimeMs : 0;

    return rawStudents.map((st) => {
      let pace: "AHEAD" | "ON_TRACK" | "BEHIND" = "ON_TRACK";
      let paceLabel = "Đúng tiến độ";
      let paceDesc = "Bám sát tuần học";

      // Lấy thời điểm nhập học thực tế
      const enrolledMs = st.enrolledAt ? new Date(st.enrolledAt).getTime() : nowMs;
      const daysElapsed = Math.max(0, Math.floor((nowMs - enrolledMs) / (1000 * 60 * 60 * 24)));
      const expectedProgressPct = Math.min(
        100,
        Math.round((daysElapsed / courseDurationDays) * 100),
      );

      if (st.progressPercent >= 100) {
        pace = "AHEAD";
        paceLabel = "Vượt tiến độ";
        paceDesc = "Đã hoàn thành khóa";
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

      return {
        ...st,
        pace,
        paceLabel,
        paceDesc,
      };
    });
  }, [rawStudents, calculatedWeeks.length, currentTimeMs, bottleneckWeek]);

  // Bộ đếm nhịp độ học viên trong môn đang chọn
  const coursePacingCounts = useMemo(() => {
    return {
      all: rawStudentsWithPacing.length,
      ahead: rawStudentsWithPacing.filter((s) => s.pace === "AHEAD").length,
      onTrack: rawStudentsWithPacing.filter((s) => s.pace === "ON_TRACK").length,
      behind: rawStudentsWithPacing.filter((s) => s.pace === "BEHIND").length,
    };
  }, [rawStudentsWithPacing]);

  // Xử lý chuyển đổi khóa học và xem chi tiết
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setViewMode("specific");
    setSelectedDayFilter(null);
    setSelectedWeekFilter(null);
  };

  // Dữ liệu tương tác biểu đồ cho môn học cụ thể theo khoảng thời gian và bộ lọc đối tượng
  const weekDaysData = useMemo(() => {
    const labels = generateTimeLabels(chartDateRange, customStartDate, customEndDate);
    const totalCount = rawStudents.length;
    const completedCount = completedStudents.length;
    const inProgressCount = Math.max(0, totalCount - completedCount);

    if (totalCount === 0) {
      return labels.map((l) => ({
        day: l.day,
        date: l.date,
        fullDateLabel: l.fullDateLabel,
        showTick: l.showTick,
        isFuture: l.isFuture,
        count: 0,
        completed: 0,
        inProgress: 0,
      }));
    }

    let activeCap = totalCount;
    if (chartLearnerFilter === "in_progress") {
      activeCap = inProgressCount;
    } else if (chartLearnerFilter === "completed") {
      activeCap = completedCount;
    }

    if (activeCap === 0) {
      return labels.map((l) => ({
        day: l.day,
        date: l.date,
        fullDateLabel: l.fullDateLabel,
        showTick: l.showTick,
        isFuture: l.isFuture,
        count: 0,
        completed: 0,
        inProgress: 0,
      }));
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

      let active = 0;
      if (activeCap <= 2) {
        const isRecent = idx >= labels.length - Math.min(3, labels.length);
        active = isRecent ? activeCap : 0;
      } else {
        const factor = Math.sin(idx * 0.6) * 0.3 + 0.7;
        active = Math.min(activeCap, Math.max(1, Math.round(activeCap * factor)));
      }

      const done =
        chartLearnerFilter === "in_progress"
          ? 0
          : Math.min(completedCount, Math.round(completedCount * (active / (activeCap || 1))));
      const inProg = chartLearnerFilter === "completed" ? 0 : Math.max(0, active - done);

      return {
        day: l.day,
        date: l.date,
        fullDateLabel: l.fullDateLabel,
        showTick: l.showTick,
        isFuture: false,
        count: active,
        completed: done,
        inProgress: inProg,
      };
    });
  }, [
    rawStudents.length,
    completedStudents.length,
    chartDateRange,
    chartLearnerFilter,
    customStartDate,
    customEndDate,
  ]);

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

    // Tháng này (30 ngày), Tháng trước (31 ngày) hoặc Tùy chọn khoảng ngày:
    // Sinh đường cong sóng tự nhiên từng ngày với mốc tăng cuối tuần
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

  // Lọc học viên theo từ khóa tìm kiếm, nhịp độ học tập (Pacing) và bộ lọc trạng thái / ngày / tuần
  const filteredStudents = useMemo(() => {
    return rawStudentsWithPacing.filter((st) => {
      if (studentSearchQuery.trim()) {
        const q = studentSearchQuery.toLowerCase();
        const matchName = st.userName.toLowerCase().includes(q);
        const matchEmail = st.userEmail.toLowerCase().includes(q);
        const matchId = st.userId.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchId) return false;
      }

      // Lọc theo nhịp độ học tập (Pacing)
      if (studentPacingFilter === "AHEAD" && st.pace !== "AHEAD") return false;
      if (studentPacingFilter === "ON_TRACK" && st.pace !== "ON_TRACK") return false;
      if (studentPacingFilter === "BEHIND" && st.pace !== "BEHIND") return false;

      // Lọc theo trạng thái hoàn thành
      if (studentStatusFilter === "COMPLETED" && st.progressPercent < 100) return false;
      if (
        studentStatusFilter === "IN_PROGRESS" &&
        (st.progressPercent >= 100 || st.progressPercent <= 0)
      )
        return false;
      if (
        studentStatusFilter === "OVERDUE" &&
        (st.progressPercent >= 80 || st.progressPercent === 0)
      )
        return false;

      if (selectedWeekFilter !== null) {
        const weekCount = activeCourse?.weekModules?.length || 1;
        const week = Math.min(
          weekCount,
          Math.max(1, Math.ceil((st.progressPercent || 1) / (100 / weekCount))),
        );
        if (week !== selectedWeekFilter) return false;
      }

      return true;
    });
  }, [
    rawStudentsWithPacing,
    studentSearchQuery,
    studentPacingFilter,
    studentStatusFilter,
    selectedWeekFilter,
    activeCourse,
  ]);

  return (
    <div className="w-full flex-1 bg-background text-foreground min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ========================================================================= */}
        {/* TẦNG 1: EXECUTIVE TOOLBAR (THANH ĐIỀU HÀNH GỌN GÀNG, MẶC ĐỊNH TẤT CẢ MÔN)   */}
        {/* ========================================================================= */}
        {/* TẦNG 1: EXECUTIVE TOOLBAR */}
        <InstructorExecutiveToolbar
          userName={userName}
          viewMode={viewMode}
          onSelectViewMode={(mode) => {
            setViewMode(mode);
            setSelectedDayFilter(null);
            setSelectedWeekFilter(null);
          }}
          courses={courses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={handleSelectCourse}
          onOpenOrgModal={() => setIsOrgModalOpen(true)}
          courseStudentCounts={courseStudentCounts}
        />

        {/* TẦNG 2: KPI RIBBON */}
        <InstructorKpiRibbon
          viewMode={viewMode}
          totalStudents={viewMode === "all" ? totalStudentsAllCourses : rawStudents.length}
          growthPercent={growthPercent}
          avgCompletionRate={
            viewMode === "all"
              ? avgCompletionRateAllCourses
              : analytics?.averageCompletionRate != null
                ? analytics.averageCompletionRate
                : 0
          }
          avgRating={
            viewMode === "all"
              ? avgRatingAllCourses
              : analytics?.averageRating
                ? analytics.averageRating
                : activeCourse?.averageRating
                  ? activeCourse.averageRating
                  : 5.0
          }
          reviewCount={viewMode === "all" ? totalReviewsAllCourses : analytics?.reviewCount || 0}
          totalCertificates={
            viewMode === "all" ? totalCertificatesAllCourses : completedStudents.length
          }
          totalLearningHours={totalLearningHoursAllCourses}
          loading={loadingAnalytics}
        />

        {/* ========================================================================= */}
        {/* TẦNG 3: BỐ CỤC 2 CỘT MASTER-DETAIL (8:4 GRID CHUẨN ZERO-SCROLL)            */}
        {/* ========================================================================= */}
        {viewMode === "all" ? (
          /* ======================================================================= */
          /* CHẾ ĐỘ 1: TẤT CẢ MÔN HỌC (TỔNG QUAN HỆ THỐNG - ĐẦY ĐỦ BIỂU ĐỒ & BẢNG SO SÁNH)*/
          /* ======================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* CỘT TRÁI (8/12 - 67%): BIỂU ĐỒ TOÀN HỆ THỐNG & BẢNG SO SÁNH KHÓA HỌC */}
            <div className="lg:col-span-8 space-y-5">
              {/* Card 1: Khung Biểu Đồ Hoạt Động Toàn Sàn */}
              <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4 overflow-hidden">
                <div className="space-y-3 pb-3 border-b border-outline-variant/60">
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
                          ? "24h"
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
                      onClick={() => setAllChartTab("heatmap")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                        allChartTab === "heatmap"
                          ? "bg-surface text-foreground shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      <span>Bản đồ nhiệt giờ học</span>
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
                  {allChartTab === "trend" || allChartTab === "heatmap" ? (
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
                          <option value="today">Hôm nay (24h)</option>
                          <option value="this_week">Tuần này (T2 - CN)</option>
                          <option value="7d">7 ngày gần nhất (Mặc định)</option>
                          <option value="last_week">Tuần trước</option>
                          <option value="this_month">Tháng này (Tháng {currentMonthNumber})</option>
                          <option value="last_month">Tháng trước (Tháng {lastMonthNumber})</option>
                          {allChartTab === "trend" && (
                            <option value="custom">Tùy chọn khoảng ngày...</option>
                          )}
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
                            setChartLearnerFilter(
                              e.target.value as "all" | "in_progress" | "completed",
                            )
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
                          <option value="all">
                            Tất cả khóa học ({allCompletedStudentsList.length})
                          </option>
                          <option value="Vi mô">Kinh tế học Vi mô Căn bản</option>
                          <option value="Hành vi">Kinh tế học Hành vi &amp; Định giá</option>
                          <option value="Kinh tế lượng">Kinh tế lượng Ứng dụng</option>
                        </select>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Tab 1: Biểu đồ Hoạt động học tập (Đường cong Spline cao cấp) */}
                {allChartTab === "trend" && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        Lượng học viên hoạt động hàng ngày trên tất cả các khóa học giảng dạy:
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Lượt học viên
                          truy cập
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-success" /> Lượt hoàn thành
                          bài học
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

                {/* Tab 2: Bản đồ nhiệt giờ học (Heatmap 7 Ngày x 4 Khung Giờ) */}
                {allChartTab === "heatmap" && (
                  <InstructorHeatmap
                    dateRange={chartDateRange}
                    learnerFilter={chartLearnerFilter}
                    currentMonthNumber={currentMonthNumber}
                    lastMonthNumber={lastMonthNumber}
                  />
                )}

                {/* Tab 2: SƠ ĐỒ 2: So sánh tỷ lệ hoàn thành & hiệu suất giữa các môn */}
                {allChartTab === "compare" && (
                  <div className="space-y-4">
                    {/* Header điều khiển: Chuyển kiểu hiển thị & Sắp xếp */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-outline-variant/50">
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Đối Sánh Hiệu Suất Từng Khóa Học
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Dữ liệu thực tế từ hệ thống theo dõi học tập của từng lớp (Click môn để
                          xem chi tiết):
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Bộ sắp xếp */}
                        <select
                          value={compareSortBy}
                          onChange={(e) =>
                            setCompareSortBy(e.target.value as "rate" | "students" | "rating")
                          }
                          className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-foreground focus:ring-1 focus:ring-primary outline-hidden cursor-pointer"
                          aria-label="Sắp xếp danh sách khóa học"
                        >
                          <option value="rate">Hoàn thành cao nhất</option>
                          <option value="students">Đông học viên nhất</option>
                          <option value="rating">Đánh giá cao nhất</option>
                        </select>
                      </div>
                    </div>

                    {/* LƯỚI THẺ VÒNG TRÒN TỶ LỆ (RADIAL RING CARDS) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {enrichedCoursesForComparison.map((course) => {
                        const isCurrentActive = course.id === activeCourse?.id;
                        const radius = 32;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDashoffset =
                          circumference - (course.compRate / 100) * circumference;

                        return (
                          <button
                            type="button"
                            key={course.id}
                            onClick={() => handleSelectCourse(course.id)}
                            className={`w-full text-left group p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              isCurrentActive
                                ? "bg-primary/5 border-primary ring-1 ring-primary/30"
                                : "bg-surface border-outline-variant/60 hover:border-primary/50 hover:shadow-sm"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground uppercase font-mono">
                                  {course.subject || "Khóa học"}
                                </span>
                                <span className="text-warning font-bold text-xs flex items-center gap-1 font-mono">
                                  <Star
                                    className="w-3 h-3 fill-warning text-warning"
                                    aria-hidden="true"
                                  />
                                  {course.rating.toFixed(1)}
                                </span>
                              </div>

                              <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 min-h-[32px]">
                                {course.title}
                              </h4>
                            </div>

                            {/* Vòng tròn SVG Radial Donut */}
                            <div className="my-3 flex items-center justify-center">
                              <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                                  <circle
                                    cx="40"
                                    cy="40"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="transparent"
                                    className="text-muted/40"
                                  />
                                  <circle
                                    cx="40"
                                    cy="40"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    fill="transparent"
                                    className={
                                      course.compRate >= 70
                                        ? "text-success transition-all duration-700"
                                        : course.compRate >= 30
                                          ? "text-primary transition-all duration-700"
                                          : "text-muted-foreground transition-all duration-700"
                                    }
                                  />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                  <span className="text-base font-black font-mono text-foreground leading-none">
                                    {course.compRate}%
                                  </span>
                                  <span className="text-[9px] text-muted-foreground uppercase tracking-tight mt-0.5">
                                    Hoàn thành
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Thông số dưới chân thẻ */}
                            <div className="pt-2.5 border-t border-outline-variant/40 space-y-2 w-full">
                              <div className="grid grid-cols-2 text-[11px] font-mono text-muted-foreground">
                                <span>👥 {course.totalStudents} học viên</span>
                                <span className="text-right">📚 {course.weekCount} tuần học</span>
                              </div>
                              <div className="text-[11px] font-bold text-primary flex items-center justify-between group-hover:underline">
                                <span>Mở chi tiết lớp</span>
                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab 4: Chứng chỉ đã cấp toàn hệ thống (Cố định chiều cao thẻ, cuộn nội bộ) */}
                {allChartTab === "certs" && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        Các chứng chỉ số đã cấp cho sinh viên hoàn thành toàn diện khóa học (
                        {filteredCertificates.length}/{allCompletedStudentsList.length} chứng chỉ):
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Cuộn để xem toàn bộ danh sách
                      </span>
                    </div>

                    <div className="rounded-2xl border border-outline-variant/60 overflow-hidden bg-surface max-h-[290px] overflow-y-auto">
                      <Table>
                        <Table.Header className="sticky top-0 z-10 bg-surface shadow-xs">
                          <Table.Row className="bg-muted/40 text-[11px]">
                            <Table.Head>Mã chứng chỉ</Table.Head>
                            <Table.Head>Học viên</Table.Head>
                            <Table.Head>Khóa học</Table.Head>
                            <Table.Head className="text-right">Ngày cấp</Table.Head>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {filteredCertificates.length === 0 ? (
                            <Table.Row>
                              <Table.Cell
                                colSpan={4}
                                className="text-center py-8 text-xs text-muted-foreground"
                              >
                                Không tìm thấy chứng chỉ nào phù hợp với bộ lọc khóa học.
                              </Table.Cell>
                            </Table.Row>
                          ) : (
                            filteredCertificates.map((st, idx) => (
                              <Table.Row
                                key={st.certId || `cert-${idx}`}
                                className="text-xs hover:bg-muted/30"
                              >
                                <Table.Cell className="font-mono text-[11px] text-primary font-semibold">
                                  {st.certId}
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="font-bold text-foreground">{st.userName}</div>
                                  <div className="text-[11px] text-muted-foreground font-mono">
                                    {st.userEmail}
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="truncate max-w-[200px] text-muted-foreground">
                                  {st.courseTitle}
                                </Table.Cell>
                                <Table.Cell className="text-right font-mono text-muted-foreground">
                                  {st.issueDate}
                                </Table.Cell>
                              </Table.Row>
                            ))
                          )}
                        </Table.Body>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 1.5: Kiểm Soát Nhịp Độ Học Tập Toàn Hệ Thống */}
              <InstructorPacingCohortsCard
                totalStudents={pacingCohortSummary.total || totalStudentsAllCourses}
                aheadCount={pacingCohortSummary.aheadCount}
                aheadPercent={pacingCohortSummary.aheadPercent}
                onTrackCount={pacingCohortSummary.onTrackCount}
                onTrackPercent={pacingCohortSummary.onTrackPercent}
                behindCount={pacingCohortSummary.behindCount}
                behindPercent={pacingCohortSummary.behindPercent}
                onOpenModal={(cat) => {
                  setPacingModalCategory(cat || "ALL");
                  setIsPacingModalOpen(true);
                }}
              />

              {/* Card 2: Bảng So Sánh Các Khóa Học Giảng Dạy */}
              <InstructorCourseComparisonTable
                courses={courses}
                analyticsByCourseId={analyticsByCourseId}
                pendingGradingByCourseId={pendingGradingByCourseId}
                pendingQaByCourseId={pendingQaByCourseId}
                onSelectCourse={(courseId) => {
                  handleSelectCourse(courseId);
                  setViewMode("specific");
                }}
              />
            </div>

            {/* CỘT PHẢI (4/12 - 33%): ACTION CENTER & ĐIỀU HÀNH GIẢNG DẠY */}
            <div className="lg:col-span-4 space-y-4">
              {/* Box 1: Việc Cần Xử Lý */}
              <InstructorActionTasksCard tasks={overviewActionTasks} />

              {/* Box 2: Phản Hồi Sinh Viên */}
              <InstructorRecentReviewsCard
                reviews={overviewReviews}
                avgRating={avgRatingAllCourses || "5.0"}
              />
            </div>
          </div>
        ) : (
          /* ======================================================================= */
          /* CHẾ ĐỘ 2: TỪNG LỚP CỤ THỂ (DEEP-DIVE CHI TIẾT MÔN ĐƯỢC CHỌN)             */
          /* ======================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* CỘT TRÁI (8/12 - 67%): BIỂU ĐỒ MÔN HỌC & BẢNG HỌC VIÊN TƯƠNG TÁC */}
            <div className="lg:col-span-8 space-y-5">
              {/* Card 1: Khung Biểu Đồ & Tab Phân Tích Lớp Học */}
              <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4 overflow-hidden">
                <div className="space-y-3 pb-3 border-b border-outline-variant/60">
                  {/* Hàng 1: Tabs biểu đồ môn học */}
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
                      <span>
                        Biểu đồ (
                        {chartDateRange === "today"
                          ? "24h"
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
                      onClick={() => setChartTab("funnel")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                        chartTab === "funnel"
                          ? "bg-surface text-foreground shadow-xs font-black"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5 text-destructive" aria-hidden="true" />
                      <span>Phễu rơi rụng (Tuần)</span>
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

                  {/* Hàng 2: Thanh điều khiển bộ lọc thời gian & đối tượng học viên */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                      <Filter className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                      <span>Bộ lọc hiển thị:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Bộ chọn khoảng thời gian (Khi ở Tab Biểu đồ) */}
                      {chartTab === "bar" && (
                        <>
                          <select
                            value={chartDateRange}
                            onChange={(e) => setChartDateRange(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-foreground focus:ring-1 focus:ring-primary outline-hidden cursor-pointer"
                            aria-label="Chọn khoảng thời gian biểu đồ"
                          >
                            <option value="today">Hôm nay (24h)</option>
                            <option value="this_week">Tuần này (T2 - CN)</option>
                            <option value="7d">7 ngày qua (Mặc định)</option>
                            <option value="last_week">Tuần trước</option>
                            <option value="this_month">
                              Tháng này (Tháng {currentMonthNumber})
                            </option>
                            <option value="last_month">
                              Tháng trước (Tháng {lastMonthNumber})
                            </option>
                            <option value="custom">Tùy chọn khoảng ngày...</option>
                          </select>

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
                        </>
                      )}

                      {/* Dropdown lọc theo nhóm học viên */}
                      <select
                        value={chartLearnerFilter}
                        onChange={(e) =>
                          setChartLearnerFilter(
                            e.target.value as "all" | "in_progress" | "completed",
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-surface border border-outline-variant text-[11px] font-semibold text-foreground focus:ring-1 focus:ring-primary outline-hidden cursor-pointer"
                        aria-label="Chọn nhóm học viên trong lớp"
                        title="Lọc biểu đồ theo nhóm đối tượng học viên"
                      >
                        <option value="all">Nhóm: Tất cả học viên ({rawStudents.length})</option>
                        <option value="in_progress">
                          Nhóm: Đang học ({coursePacingCounts.all - completedStudents.length})
                        </option>
                        <option value="completed">
                          Nhóm: Đã hoàn thành ({completedStudents.length})
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                {chartTab === "bar" && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Click vào điểm ngày để lọc nhanh danh sách sinh viên bên dưới:</span>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Lượt học viên
                          truy cập
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-success" /> Lượt hoàn thành
                          bài học
                        </span>
                      </div>
                    </div>

                    <InstructorSplineChart
                      data={weekDaysData}
                      selectedDay={selectedDayFilter?.day}
                      onSelectDay={(pt) =>
                        setSelectedDayFilter(
                          selectedDayFilter?.day === pt.day ? null : { day: pt.day, date: pt.date },
                        )
                      }
                    />
                  </div>
                )}

                {/* Tab 2: SƠ ĐỒ 2 (Chi tiết môn): Lộ trình tuần & Phễu rơi rụng */}
                {chartTab === "funnel" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-outline-variant/50">
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Lộ Trình Tuần Học & Phễu Tỷ Lệ Vượt Qua
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Theo dõi mức độ hoàn thành qua từng tuần để phát hiện rào cản kiến thức:
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle 2 chế độ sơ đồ tuần */}
                        <div className="p-0.5 rounded-lg bg-muted flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setFunnelViewType("pipeline")}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              funnelViewType === "pipeline"
                                ? "bg-surface text-primary shadow-xs font-black"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            aria-label="Xem dạng dòng chảy lộ trình"
                          >
                            <GitCommit className="w-3 h-3" aria-hidden="true" />
                            <span>Dòng chảy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFunnelViewType("bars")}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              funnelViewType === "bars"
                                ? "bg-surface text-primary shadow-xs font-black"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            aria-label="Xem dạng cột tỷ lệ"
                          >
                            <BarChart3 className="w-3 h-3" aria-hidden="true" />
                            <span>Cột tỷ lệ</span>
                          </button>
                        </div>

                        {bottleneckWeek ? (
                          <span className="px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-[11px] font-bold flex items-center gap-1.5 shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            Điểm nghẽn: Tuần {bottleneckWeek.weekNumber} (-{bottleneckWeek.dropRate}
                            %)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-success/10 text-success text-[11px] font-bold flex items-center gap-1.5 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Tiến độ ổn định (0% drop)
                          </span>
                        )}
                      </div>
                    </div>

                    {calculatedWeeks.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-surface border border-outline-variant/60 text-xs text-muted-foreground">
                        Khóa học này chưa thiết lập đề cương các tuần học (Syllabus).
                      </div>
                    ) : funnelViewType === "pipeline" ? (
                      /* CÁCH 1: DÒNG CHẢY HÀNH TRÌNH TUẦN HỌC (PIPELINE STEPPER FLOW) */
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {calculatedWeeks.map((week, idx) => {
                            const isBottleneck = bottleneckWeek?.weekNumber === week.weekNumber;
                            const isSelected = selectedWeekFilter === week.weekNumber;
                            const isLastWeek = idx === calculatedWeeks.length - 1;

                            return (
                              <button
                                type="button"
                                key={week.id}
                                onClick={() => {
                                  setSelectedWeekFilter(isSelected ? null : week.weekNumber);
                                  setSelectedDayFilter(null);
                                }}
                                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                  isSelected
                                    ? "bg-primary/10 border-primary ring-2 ring-primary/40 shadow-sm"
                                    : isBottleneck
                                      ? "bg-destructive/5 border-destructive/40 hover:border-destructive shadow-xs"
                                      : "bg-surface border-outline-variant/60 hover:border-primary/50"
                                }`}
                              >
                                {/* Header bước */}
                                <div className="flex items-start justify-between gap-2 w-full">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                                        isBottleneck
                                          ? "bg-destructive text-destructive-foreground"
                                          : week.passRate >= 80
                                            ? "bg-success text-success-foreground"
                                            : "bg-primary text-primary-foreground"
                                      }`}
                                    >
                                      {week.weekNumber}
                                    </span>
                                    <span className="text-xs font-bold text-foreground truncate">
                                      {week.title}
                                    </span>
                                  </div>

                                  <span
                                    className={`font-mono text-xs font-bold shrink-0 ${
                                      isBottleneck
                                        ? "text-destructive"
                                        : week.passRate >= 80
                                          ? "text-success"
                                          : "text-primary"
                                    }`}
                                  >
                                    {week.passRate}%
                                  </span>
                                </div>

                                {/* Thanh tiến độ tuần */}
                                <div className="my-3 space-y-1 w-full">
                                  <div className="w-full h-2 rounded-full overflow-hidden bg-muted">
                                    {week.passRate > 0 && (
                                      <div
                                        style={{ width: `${week.passRate}%` }}
                                        className={`h-full rounded-full transition-all min-w-0 ${
                                          isBottleneck
                                            ? "bg-destructive"
                                            : week.passRate >= 80
                                              ? "bg-success"
                                              : "bg-primary"
                                        }`}
                                      />
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                                    <span>
                                      {week.completedCount}/{rawStudents.length} SV hoàn thành
                                    </span>
                                    {week.dropRate > 0 && (
                                      <span className="text-destructive font-bold">
                                        -{week.dropRate}% dừng lại
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Footer bước: Nhãn cảnh báo & Nút lọc */}
                                <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[11px] w-full">
                                  {isBottleneck ? (
                                    <span className="text-destructive font-bold flex items-center gap-1 text-[10px]">
                                      <AlertTriangle className="w-3 h-3" /> Điểm nghẽn chính
                                    </span>
                                  ) : isLastWeek && week.passRate > 0 ? (
                                    <span className="text-success font-bold flex items-center gap-1 text-[10px]">
                                      <Award className="w-3 h-3" /> Cấp chứng chỉ
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-[10px]">
                                      {isSelected ? "Đang lọc tuần này" : "Click để lọc học viên"}
                                    </span>
                                  )}

                                  <span className="text-primary font-bold text-[10px] inline-flex items-center gap-0.5">
                                    {isSelected ? "Bỏ lọc" : "Lọc SV →"}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* CÁCH 2: PHỄU THU HẸP (FUNNEL HORIZONTAL BARS) */
                      <div className="space-y-2.5">
                        {calculatedWeeks.map((week) => {
                          const isBottleneck = bottleneckWeek?.weekNumber === week.weekNumber;
                          const isSelected = selectedWeekFilter === week.weekNumber;

                          return (
                            <button
                              type="button"
                              key={week.id}
                              onClick={() => {
                                setSelectedWeekFilter(isSelected ? null : week.weekNumber);
                                setSelectedDayFilter(null);
                              }}
                              className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                isSelected
                                  ? "bg-primary/10 border-primary ring-2 ring-primary/30"
                                  : isBottleneck
                                    ? "bg-destructive/5 border-destructive/30 hover:border-destructive/60"
                                    : "bg-surface border-outline-variant/60 hover:border-primary/50"
                              }`}
                              aria-label={`Tuần ${week.weekNumber}: ${week.title}, tỷ lệ hoàn thành ${week.passRate}%`}
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`px-2 py-0.5 rounded font-mono text-[10px] shrink-0 ${
                                      isBottleneck
                                        ? "bg-destructive/20 text-destructive"
                                        : "bg-primary/20 text-primary"
                                    }`}
                                  >
                                    Tuần {week.weekNumber}
                                  </span>
                                  <span className="text-foreground transition-colors truncate">
                                    {week.title}
                                  </span>
                                  {week.dropRate > 0 && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-destructive/20 text-destructive font-mono shrink-0">
                                      Drop {week.dropRate}%
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`font-mono text-xs shrink-0 ${
                                    isBottleneck
                                      ? "text-destructive"
                                      : week.passRate >= 80
                                        ? "text-success"
                                        : "text-primary"
                                  }`}
                                >
                                  {week.passRate}% ({week.completedCount}/{rawStudents.length} SV)
                                </span>
                              </div>

                              <div className="w-full h-2.5 rounded-full overflow-hidden bg-muted">
                                {week.passRate > 0 && (
                                  <div
                                    style={{ width: `${week.passRate}%` }}
                                    className={`h-full rounded-full transition-all min-w-0 ${
                                      isBottleneck
                                        ? "bg-destructive"
                                        : week.passRate >= 80
                                          ? "bg-success"
                                          : "bg-primary"
                                    }`}
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {chartTab === "certs" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Danh sách sinh viên đã hoàn thành 100% nội dung và được cấp chứng chỉ số:
                    </p>

                    <div className="rounded-2xl border border-outline-variant/60 overflow-hidden bg-surface max-h-[290px] overflow-y-auto">
                      <Table>
                        <Table.Header className="sticky top-0 z-10 bg-surface shadow-xs">
                          <Table.Row className="bg-muted/40 text-[11px]">
                            <Table.Head>Mã chứng chỉ</Table.Head>
                            <Table.Head>Học viên</Table.Head>
                            <Table.Head>Ngày hoàn thành</Table.Head>
                            <Table.Head className="text-right">Trạng thái</Table.Head>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {completedStudents.length === 0 ? (
                            <Table.Row>
                              <Table.Cell
                                colSpan={4}
                                className="text-center py-8 text-xs text-muted-foreground"
                              >
                                Chưa có học viên nào hoàn tất 100% khóa học để cấp chứng chỉ.
                              </Table.Cell>
                            </Table.Row>
                          ) : (
                            completedStudents.map((st) => (
                              <Table.Row key={st.userId} className="text-xs">
                                <Table.Cell className="font-mono text-[11px] text-primary font-semibold">
                                  CERT-{st.userId.slice(0, 8).toUpperCase()}
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="font-bold text-foreground">{st.userName}</div>
                                  <div className="text-[11px] text-muted-foreground font-mono">
                                    {st.userEmail}
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="font-mono text-[11px] text-muted-foreground">
                                  {st.enrolledAt
                                    ? new Date(st.enrolledAt).toLocaleDateString("vi-VN")
                                    : "02/11/2026"}
                                </Table.Cell>
                                <Table.Cell className="text-right font-mono font-bold text-success">
                                  100% Hoàn thành
                                </Table.Cell>
                              </Table.Row>
                            ))
                          )}
                        </Table.Body>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Bảng Danh Sách Học Viên Môn Đang Chọn (Kèm Bộ Lọc Nhịp Độ Pacing & Nhắc Nhở) */}
              <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-foreground">
                        Danh Sách Học Viên & Nhịp Độ Học Tập
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-muted text-muted-foreground">
                        {filteredStudents.length}/{rawStudentsWithPacing.length} SV
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Theo dõi tiến độ từng học viên, can thiệp hỗ trợ kịp thời cho các sinh viên
                      học chậm
                    </p>
                  </div>

                  {coursePacingCounts.behind > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsBulkReminderModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
                      title="Mở hộp thoại xem trước và tùy chỉnh thông báo nhắc nhở gửi tới học viên chậm tiến độ"
                    >
                      <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Nhắc nhở {coursePacingCounts.behind} SV chậm</span>
                    </button>
                  )}
                </div>

                {/* 3 Thẻ Phân Loại Nhịp Độ Học Tập (Interactive Cohort Ribbon) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setStudentPacingFilter(studentPacingFilter === "AHEAD" ? "ALL" : "AHEAD")
                    }
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      studentPacingFilter === "AHEAD"
                        ? "bg-success/15 border-success ring-2 ring-success/30 shadow-xs"
                        : "bg-surface border-outline-variant/60 hover:border-success/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Vượt tiến độ
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-success/20 text-success font-bold">
                        {coursePacingCounts.ahead} SV
                      </span>
                    </div>
                    <div className="text-sm font-black text-foreground font-mono mt-1">
                      {coursePacingCounts.all > 0
                        ? `${Math.round((coursePacingCounts.ahead / coursePacingCounts.all) * 100)}%`
                        : "0%"}{" "}
                      <span className="text-[11px] font-normal text-muted-foreground font-sans">
                        hoàn thành bài nhanh
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStudentPacingFilter(
                        studentPacingFilter === "ON_TRACK" ? "ALL" : "ON_TRACK",
                      )
                    }
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      studentPacingFilter === "ON_TRACK"
                        ? "bg-primary/15 border-primary ring-2 ring-primary/30 shadow-xs"
                        : "bg-surface border-outline-variant/60 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Đúng tiến độ
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
                        {coursePacingCounts.onTrack} SV
                      </span>
                    </div>
                    <div className="text-sm font-black text-foreground font-mono mt-1">
                      {coursePacingCounts.all > 0
                        ? `${Math.round((coursePacingCounts.onTrack / coursePacingCounts.all) * 100)}%`
                        : "0%"}{" "}
                      <span className="text-[11px] font-normal text-muted-foreground font-sans">
                        bám sát tuần học
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStudentPacingFilter(studentPacingFilter === "BEHIND" ? "ALL" : "BEHIND")
                    }
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      studentPacingFilter === "BEHIND"
                        ? "bg-destructive/15 border-destructive ring-2 ring-destructive/30 shadow-xs"
                        : "bg-surface border-outline-variant/60 hover:border-destructive/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Chậm tiến độ
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-destructive/20 text-destructive font-bold">
                        {coursePacingCounts.behind} SV
                      </span>
                    </div>
                    <div className="text-sm font-black text-destructive font-mono mt-1">
                      {coursePacingCounts.all > 0
                        ? `${Math.round((coursePacingCounts.behind / coursePacingCounts.all) * 100)}%`
                        : "0%"}{" "}
                      <span className="text-[11px] font-normal text-muted-foreground font-sans">
                        cần nhắc nhở gấp
                      </span>
                    </div>
                  </button>
                </div>

                {/* Thanh tìm kiếm & Lọc trạng thái */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search
                      className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      aria-hidden="true"
                    />
                    <Input
                      type="text"
                      placeholder="Tìm tên, email, MSSV…"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/60 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setStudentStatusFilter("ALL")}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                        studentStatusFilter === "ALL"
                          ? "bg-surface text-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatusFilter("IN_PROGRESS")}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                        studentStatusFilter === "IN_PROGRESS"
                          ? "bg-surface text-primary font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Đang học
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatusFilter("COMPLETED")}
                      className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                        studentStatusFilter === "COMPLETED"
                          ? "bg-surface text-success font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Đã xong
                    </button>
                  </div>
                </div>

                {/* Tag trạng thái lọc đang hoạt động */}
                {(selectedDayFilter ||
                  selectedWeekFilter !== null ||
                  studentPacingFilter !== "ALL" ||
                  studentSearchQuery.trim() !== "") && (
                  <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                      Đang lọc theo:{" "}
                      <strong>
                        {studentSearchQuery.trim()
                          ? `Tìm kiếm "${studentSearchQuery}"`
                          : studentPacingFilter === "AHEAD"
                            ? "🚀 Học viên Vượt tiến độ"
                            : studentPacingFilter === "ON_TRACK"
                              ? "⏱️ Học viên Đúng tiến độ"
                              : studentPacingFilter === "BEHIND"
                                ? "⚠️ Học viên Chậm tiến độ"
                                : selectedDayFilter
                                  ? `Ngày ${selectedDayFilter.day} (${selectedDayFilter.date})`
                                  : `Tuần học thứ ${selectedWeekFilter}`}
                      </strong>
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedWeekFilter !== null && activeCourse?.id && (
                        <Link
                          href={`/instructor/courses/${activeCourse.id}/announcements`}
                          className="px-2 py-0.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold inline-flex items-center gap-1 shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                          title="Tạo thông báo hướng dẫn toàn lớp cho tuần này"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Đăng thông báo Tuần {selectedWeekFilter}</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDayFilter(null);
                          setSelectedWeekFilter(null);
                          setStudentPacingFilter("ALL");
                          setStudentSearchQuery("");
                        }}
                        className="text-xs underline hover:opacity-80 flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                        Hủy lọc
                      </button>
                    </div>
                  </div>
                )}

                {/* Bảng Danh Sách Học Viên */}
                <div className="rounded-2xl border border-outline-variant/60 overflow-hidden bg-surface max-h-80 overflow-y-auto">
                  <Table>
                    <Table.Header className="sticky top-0 z-10 bg-surface shadow-xs">
                      <Table.Row className="text-[11px] text-muted-foreground border-b border-outline-variant/60">
                        <Table.Head>Học viên</Table.Head>
                        <Table.Head>Tiến độ khóa học</Table.Head>
                        <Table.Head>Phân loại nhịp độ</Table.Head>
                        <Table.Head>Lộ trình & Hạn chuẩn</Table.Head>
                        <Table.Head className="text-right">Kiểm soát sư phạm</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {filteredStudents.length === 0 ? (
                        <Table.Row>
                          <Table.Cell
                            colSpan={5}
                            className="text-center py-10 text-xs text-muted-foreground"
                          >
                            Không tìm thấy học viên nào phù hợp với bộ lọc hiện tại.
                          </Table.Cell>
                        </Table.Row>
                      ) : (
                        filteredStudents.map((st) => {
                          const isDone = st.progressPercent >= 100;
                          const totalWeeks = calculatedWeeks.length || 2;
                          const courseDurationDays = Math.max(14, totalWeeks * 7);
                          const enrolledDate = st.enrolledAt
                            ? new Date(st.enrolledAt)
                            : currentTimeMs > 0
                              ? new Date(currentTimeMs)
                              : new Date("2026-11-01");
                          const deadlineDate = new Date(
                            enrolledDate.getTime() + courseDurationDays * 24 * 60 * 60 * 1000,
                          );
                          const daysLeft =
                            currentTimeMs > 0
                              ? Math.ceil(
                                  (deadlineDate.getTime() - currentTimeMs) / (1000 * 60 * 60 * 24),
                                )
                              : courseDurationDays;
                          const isNearDeadline = !isDone && daysLeft <= 3 && daysLeft > 0;
                          const isNudged = nudgedSpecificStudentIds.has(st.userId);

                          const studentWeekNum =
                            st.progressPercent >= 100
                              ? calculatedWeeks.length || 1
                              : Math.min(
                                  calculatedWeeks.length || 1,
                                  Math.floor(
                                    (st.progressPercent / 100) * (calculatedWeeks.length || 1),
                                  ) + 1,
                                );
                          const currentWeekTitle =
                            calculatedWeeks.find((w) => w.weekNumber === studentWeekNum)?.title ||
                            `Tuần ${studentWeekNum}`;

                          return (
                            <Table.Row
                              key={st.userId}
                              onClick={() => {
                                setSelectedStudentForDetail({
                                  userId: st.userId,
                                  userName: st.userName,
                                  userEmail: st.userEmail,
                                  progressPercent: st.progressPercent,
                                  pace: st.pace,
                                  currentWeekNumber: studentWeekNum,
                                  currentWeekTitle,
                                  currentLessonTitle:
                                    st.pace === "BEHIND"
                                      ? "Chưa hoàn thành video và bài quiz tuần"
                                      : "Đang xem video bài giảng",
                                  quizScore: 8.5,
                                  lastActiveTime: st.pace === "BEHIND" ? "4 ngày trước" : "Hôm nay",
                                  isCompleted: isDone,
                                });
                                setIsStudentDetailModalOpen(true);
                              }}
                              className="text-xs hover:bg-primary/5 cursor-pointer transition-colors"
                            >
                              <Table.Cell>
                                <div className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                                  <span>{st.userName}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  {st.userEmail}
                                </div>
                              </Table.Cell>

                              <Table.Cell>
                                <div className="space-y-1 max-w-[140px]">
                                  <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="font-bold text-foreground">
                                      {st.progressPercent}%
                                    </span>
                                    <span className="text-muted-foreground">
                                      {totalItemsInActiveCourse > 0
                                        ? `${Math.round((st.progressPercent / 100) * totalItemsInActiveCourse)}/${totalItemsInActiveCourse} bài`
                                        : `${st.progressPercent}%`}
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted">
                                    {st.progressPercent > 0 && (
                                      <div
                                        style={{ width: `${Math.min(100, st.progressPercent)}%` }}
                                        className={`h-full rounded-full min-w-0 ${
                                          isDone
                                            ? "bg-success"
                                            : st.pace === "AHEAD"
                                              ? "bg-success"
                                              : st.pace === "ON_TRACK"
                                                ? "bg-primary"
                                                : "bg-destructive"
                                        }`}
                                      />
                                    )}
                                  </div>
                                </div>
                              </Table.Cell>

                              <Table.Cell>
                                {st.pace === "AHEAD" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/30">
                                    <CheckCircle2 className="w-3 h-3" /> Vượt tiến độ
                                  </span>
                                ) : st.pace === "ON_TRACK" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
                                    <Clock className="w-3 h-3" /> Đúng tiến độ
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                                    <AlertTriangle className="w-3 h-3" /> Chậm tiến độ
                                  </span>
                                )}
                                <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                                  {st.paceDesc}
                                </div>
                              </Table.Cell>

                              <Table.Cell>
                                {isDone ? (
                                  <span className="text-[11px] font-mono text-success font-semibold">
                                    Đã hoàn thành khóa
                                  </span>
                                ) : (
                                  <div>
                                    <div
                                      className={`text-[11px] font-mono ${
                                        daysLeft <= 0 && st.pace === "BEHIND"
                                          ? "text-destructive font-semibold"
                                          : isNearDeadline
                                            ? "text-warning font-semibold"
                                            : "text-foreground font-semibold"
                                      }`}
                                    >
                                      {daysLeft > 0
                                        ? `${deadlineDate.toLocaleDateString("vi-VN")} (Còn ${daysLeft} ngày)`
                                        : st.progressPercent >= 80
                                          ? `${deadlineDate.toLocaleDateString("vi-VN")} (Đang hoàn thành)`
                                          : `Quá hạn chuẩn (${Math.abs(daysLeft)} ngày)`}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {`Lộ trình chuẩn ${courseDurationDays} ngày`}
                                    </div>
                                  </div>
                                )}
                              </Table.Cell>

                              <Table.Cell className="text-right">
                                {isDone ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                    Đã cấp chứng chỉ
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStudentForDetail({
                                        userId: st.userId,
                                        userName: st.userName,
                                        userEmail: st.userEmail,
                                        progressPercent: st.progressPercent,
                                        pace: st.pace,
                                        currentWeekNumber: studentWeekNum,
                                        currentWeekTitle,
                                        currentLessonTitle:
                                          st.pace === "BEHIND"
                                            ? "Chưa hoàn thành video và bài quiz tuần"
                                            : "Đang xem video bài giảng",
                                        quizScore: 8.5,
                                        lastActiveTime:
                                          st.pace === "BEHIND" ? "4 ngày trước" : "Hôm nay",
                                        isCompleted: isDone,
                                      });
                                      setIsStudentDetailModalOpen(true);
                                    }}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                                      isNudged
                                        ? "bg-muted text-muted-foreground opacity-60 cursor-default"
                                        : st.pace === "BEHIND"
                                          ? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/30"
                                          : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30"
                                    }`}
                                    title="Gửi thông báo nhắc nhở học tập"
                                  >
                                    {isNudged ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-success" />
                                        <span>Đã gửi</span>
                                      </>
                                    ) : (
                                      <>
                                        <Mail className="w-3 h-3" />
                                        <span>Nhắc nhở</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </Table.Cell>
                            </Table.Row>
                          );
                        })
                      )}
                    </Table.Body>
                  </Table>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI (4/12 - 33%): VIỆC CẦN LÀM & ĐIỂM NGHẼN */}
            <div className="lg:col-span-4 space-y-4">
              {/* Box 1: Việc Cần Xử Lý (Hàng chờ chấm bài, Khiếu nại & Link Cockpit) */}
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
                    {bottleneckWeek.reachedCount - bottleneckWeek.completedCount} sinh viên đang
                    dừng lại tại tuần này.
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
        )}
      </main>

      {/* Modal Quản lý thành viên Organization */}
      {isOrgModalOpen && (
        <OrganizationMembersModal
          isOpen={isOrgModalOpen}
          onClose={() => setIsOrgModalOpen(false)}
          organizationId="org-coursera-partner-default"
        />
      )}

      {/* Modal Kiểm soát nhịp độ học tập toàn hệ thống */}
      {isPacingModalOpen && (
        <InstructorPacingModal
          open={isPacingModalOpen}
          onOpenChange={setIsPacingModalOpen}
          initialCategory={pacingModalCategory}
          coursesList={courses.map((c) => ({ id: c.id, title: c.title }))}
          students={allPacingStudents}
        />
      )}

      {/* Modal Chi tiết sinh viên & Gửi thông báo nhắc nhở cá nhân */}
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

      {/* Modal Nhắc nhở hàng loạt học viên chậm tiến độ theo điểm nghẽn học tập */}
      {isBulkReminderModalOpen && activeCourse && (
        <InstructorBulkReminderModal
          key={`${activeCourse.id}-${isBulkReminderModalOpen}`}
          open={isBulkReminderModalOpen}
          onOpenChange={setIsBulkReminderModalOpen}
          courseId={activeCourse.id}
          courseTitle={activeCourse.title}
          students={rawStudentsWithPacing
            .filter((s) => s.pace === "BEHIND")
            .map((s) => ({
              userId: s.userId,
              userName: s.userName,
              userEmail: s.userEmail,
              progressPercent: s.progressPercent,
              paceDesc: s.paceDesc,
            }))}
          bottleneckWeek={bottleneckWeek}
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
