import type { Course, EnrolledStudent } from "@/gen/catalog/v1/catalog_pb";

export interface TimeDataPoint {
  day: string;
  date: string;
  fullDateLabel?: string;
  showTick?: boolean;
  isFuture?: boolean;
}

export interface OverviewCourseStat {
  keyword: string;
  totalStudents: number;
  activeStudents: number;
  compRate: number;
  completedCount: number;
  inProgressCount: number;
  videoDiscussionCount: number;
  pendingDiscussions: number;
  rating: number;
  reviewCount: number;
  pendingAssignments: number;
  pendingQuestions: number;
}

export interface OverviewActionTask {
  id: string;
  type: "grading" | "video_qa";
  title: string;
  lessonTitle?: string;
  studentName: string;
  courseTitle: string;
  timeAgo: string;
  actionText: string;
  actionUrl: string;
}

export interface OverviewReview {
  id: string;
  userName: string;
  rating: number;
  courseTitle: string;
  courseId?: string;
  comment: string;
  timeAgo: string;
}

export interface OverviewCertificate {
  certId: string;
  userName: string;
  userEmail: string;
  courseTitle: string;
  issueDate: string;
}

export interface OverviewData {
  totalStudents: number;
  growthPercent: number;
  avgRating: string;
  reviewCount: number;
  totalCertificates: number;
  totalLearningHours: number;
  learningHoursThisWeek: number;
  courseStats: OverviewCourseStat[];
  actionTasks: OverviewActionTask[];
  recentReviews: OverviewReview[];
  mockCertificates: OverviewCertificate[];
}

export interface ComparisonCourseCardItem {
  id: string;
  title: string;
  subject?: string;
  rating: number;
  totalStudents: number;
  weekCount: number;
  compRate: number;
}

export type EnrichedCourseComparisonItem = Course & {
  totalStudents: number;
  compRate: number;
  completedCount: number;
  inProgressCount: number;
  rating: number;
  reviewCount: number;
  pendingAssignments: number;
  pendingQuestions: number;
  weekCount: number;
  itemCount: number;
};

export interface CalculatedWeek {
  id: string;
  weekNumber: number;
  title: string;
  summary: string;
  reachedCount: number;
  completedCount: number;
  passRate: number;
  dropRate: number;
}

export type StudentWithPacing = EnrolledStudent & {
  pace: "AHEAD" | "ON_TRACK" | "BEHIND";
  paceLabel: string;
  paceDesc: string;
};
