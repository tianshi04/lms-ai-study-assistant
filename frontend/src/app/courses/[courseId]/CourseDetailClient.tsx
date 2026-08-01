"use client";

import { useState } from "react";
import { DirectionalTransition } from "@/components/transitions/DirectionalTransition";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCourseDetailQuery,
  useCourseReviewsQuery,
  useMyCertificatesQuery,
  usePaymentAccessQuery,
} from "@/lib/query_hooks";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, ItemType } from "@/gen/catalog/v1/catalog_pb";
import {
  CertificateService,
  type FinancialAidApplication,
} from "@/gen/certificate/v1/certificate_pb";
import { Modal } from "@/components/ui/Modal";
import { RatingStars } from "@/components/ui/RatingStars";
import { useToast } from "@/components/ui/Toast";
import { PaymentCheckoutModal } from "@/components/course/PaymentCheckoutModal";
import { useAuth } from "@/components/providers/AuthProvider";

interface CourseDetailClientProps {
  courseId: string;
}

export function CourseDetailClient({ courseId }: CourseDetailClientProps) {
  const { isAuthenticated, isInstructorOrAdmin } = useAuth();
  const locale = "vi";
  const queryClient = useQueryClient();

  const {
    data: course,
    isLoading: loadingCourse,
    error: courseErr,
  } = useCourseDetailQuery(courseId);
  const { data: reviews = [], isLoading: loadingReviews } = useCourseReviewsQuery(courseId);

  const { data: myCertificates = [], isLoading: loadingCerts } = useMyCertificatesQuery();
  const { data: paymentAccess, isLoading: loadingPayment } = usePaymentAccessQuery(courseId);
  const loadingAccess = loadingCerts || loadingPayment;
  const isPaidAccess = paymentAccess?.hasPaidAccess ?? false;
  const matchingCert = course?.title
    ? myCertificates.find((c) => c.courseTitle.toLowerCase() === course.title.toLowerCase())
    : undefined;
  const hasCert = !!matchingCert;
  const certId = matchingCert?.certificateId || "";

  // Review Modal States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const toast = useToast();

  // Financial Aid Modal States
  const [isFinAidModalOpen, setIsFinAidModalOpen] = useState(false);
  const [finAidEssay, setFinAidEssay] = useState("");
  const [submittingFinAid, setSubmittingFinAid] = useState(false);
  const [existingFinAidStatus, setExistingFinAidStatus] = useState<FinancialAidApplication | null>(
    null,
  );
  const [checkingFinAidStatus, setCheckingFinAidStatus] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const finAidWordCount = finAidEssay.trim() === "" ? 0 : finAidEssay.trim().split(/\s+/).length;
  const isFinAidEnoughWords = finAidWordCount >= 150;

  const handleOpenFinAidModal = async () => {
    if (!course) return;
    setCheckingFinAidStatus(true);
    try {
      const client = getRpcClient(CertificateService);
      const res = await client.getFinancialAidStatus({ courseId: course.id });
      setExistingFinAidStatus(res.application || null);
    } catch (err) {
      console.error("Check fin aid status error:", err);
      setExistingFinAidStatus(null);
    } finally {
      setCheckingFinAidStatus(false);
      setIsFinAidModalOpen(true);
    }
  };

  const handleFinAidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    if (!isFinAidEnoughWords) {
      toast.error(`Bài luận cần tối thiểu 150 từ (Hiện tại ${finAidWordCount}/150 từ).`);
      return;
    }

    setSubmittingFinAid(true);
    try {
      const client = getRpcClient(CertificateService);
      const res = await client.applyFinancialAid({
        courseId: course.id,
        essay150Words: finAidEssay,
      });

      if (res.application) {
        toast.success("Đơn xin Hỗ trợ Tài chính đã được gửi thành công!");
        setExistingFinAidStatus(res.application);
        setFinAidEssay("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gửi đơn thất bại. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setSubmittingFinAid(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    setSubmittingReview(true);

    try {
      const client = getRpcClient(CatalogService);
      await client.submitCourseReview({
        courseId: course.id,
        ratingStars: rating,
        commentText: comment,
      });

      // Invalidate queries in real-time
      queryClient.invalidateQueries({ queryKey: ["courseDetail", course.id] });
      queryClient.invalidateQueries({ queryKey: ["courseReviews", course.id] });

      toast.success("Đã gửi đánh giá thành công!", {
        description: "Cảm ơn bạn đã phản hồi ý kiến cho khóa học.",
      });
      setIsReviewModalOpen(false);
    } catch (err: unknown) {
      console.error("Failed to submit review:", err);
      const msg = err instanceof Error ? err.message : "Đang gửi…";
      toast.error(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const loading = loadingCourse && !course;
  const error = courseErr ? courseErr.message : null;

  if (loading) {
    return (
      <div className="w-full">
        {/* Hero Banner Skeleton */}
        <div className="bg-background border-b border-border py-12 animate-pulse">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-2">
                <div className="h-6 w-32 bg-muted rounded-full" />
                <div className="h-6 w-24 bg-muted rounded-full" />
              </div>
              <div className="h-10 w-3/4 bg-muted rounded-xl" />
              <div className="h-20 w-full bg-muted rounded-xl" />
              <div className="flex gap-6 pt-4">
                <div className="h-10 w-32 bg-muted rounded-lg" />
                <div className="h-10 w-32 bg-muted rounded-lg" />
              </div>
            </div>
            {/* Enrollment Card Skeleton */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-xl space-y-6">
              <div className="h-6 w-24 bg-muted rounded" />
              <div className="h-8 w-40 bg-muted rounded" />
              <div className="h-12 w-full bg-muted rounded-xl" />
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-4 w-2/3 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
        {/* Content Skeleton */}
        <main className="max-w-7xl mx-auto px-6 py-12 space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-lg" />
          <div className="h-36 w-full bg-card border border-border rounded-2xl p-6" />
          <div className="h-36 w-full bg-card border border-border rounded-2xl p-6" />
        </main>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-card border border-border p-8 rounded-2xl max-w-md shadow-sm">
          <h2 className="text-xl font-bold text-destructive mb-2">
            {"Không thể tải danh sách khóa học"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {error || `Course "${courseId}" not found.`}
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors"
          >
            ← {"Trở lại Catalog"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DirectionalTransition>
      {/* Hero Banner */}
      <div className="bg-background border-b border-border py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
                {"Khóa học Chuyên sâu (Specialization)"}
              </div>
              {isInstructorOrAdmin && (
                <Link
                  href={`/instructor/courses/${course.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-extrabold shadow-md transition-all cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>{"Biên soạn Bài giảng (Instructor Builder)"}</span>
                </Link>
              )}
              {hasCert && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 border border-success/20 text-success text-xs font-bold">
                  <svg
                    className="w-3.5 h-3.5 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{"Đã Nhận Chứng Chỉ"}</span>
                </div>
              )}
              {course.averageRating > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 border border-warning/20 text-warning text-xs font-bold">
                  <svg
                    className="w-4 h-4 text-amber-400 fill-amber-400"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.486-.413.87-.837.614L12 17.653l-4.708 2.89c-.424.256-.953-.128-.837-.614l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </svg>
                  <span>
                    {course.averageRating.toFixed(1)} ★ ({course.reviewCount} {"nhận xét"})
                  </span>
                </div>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4 leading-tight text-balance">
              {course.title}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              {course.description}
            </p>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div>
                <span className="block text-xs text-muted-foreground uppercase font-semibold">
                  {"Đối tác phát hành"}
                </span>
                <span className="font-semibold text-foreground">{course.partnerName}</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="block text-xs text-muted-foreground uppercase font-semibold">
                  {"Giảng viên"}
                </span>
                <span className="font-semibold text-foreground">
                  {course.instructorNames.join(", ")}
                </span>
              </div>
            </div>
          </div>

          {/* Enrollment Card */}
          <div className="bg-card border border-border p-6 rounded-2xl shadow-xl space-y-6">
            <div>
              <h3 aria-live="polite" className="text-2xl font-bold text-foreground">
                {loadingAccess
                  ? "Đang tải thông tin…"
                  : hasCert
                    ? "Hoàn Thành Xuất Sắc"
                    : isPaidAccess
                      ? "Đã Mở Khóa Đầy Đủ (Paid Mode)"
                      : "Miễn Phí Tham Gia"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isPaidAccess
                  ? "Toàn bộ bài kiểm tra Graded Quiz, bài Lab và Chứng chỉ đã sẵn sàng."
                  : "Đã bao gồm bài giảng Video tương tác & Phụ đề cuộn"}
              </p>
            </div>

            {loadingAccess ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-12 w-full bg-muted rounded-xl" />
                <div className="h-10 w-full bg-muted rounded-xl" />
              </div>
            ) : hasCert ? (
              <div className="space-y-3">
                <Link
                  href={`/verify/${certId}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-warning hover:bg-warning-hover text-warning-foreground font-bold text-sm transition-all shadow-lg cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-warning-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{"Xem Chứng Chỉ"}</span>
                </Link>
                <Link
                  href={`/learn/${course.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold transition-all cursor-pointer"
                >
                  <span>{"Vào Học Lại"}</span>
                </Link>
              </div>
            ) : isPaidAccess ? (
              <div className="space-y-3">
                <Link
                  href={`/learn/${course.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm transition-all shadow-lg cursor-pointer"
                >
                  <span>{"Vào Học Ngay (Paid Mode)"}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  href={`/learn/${course.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm transition-all shadow-lg cursor-pointer"
                >
                  <span>{"Vào Học Ngay (Audit Mode)"}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-semibold text-sm transition-all cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{"Nâng Cấp Paid Mode / Coursera Plus"}</span>
                </button>
              </div>
            )}

            <ul className="space-y-3 text-xs text-muted-foreground border-t border-border pt-4">
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {"Hạn nộp linh hoạt (Flexible Deadlines)"}
              </li>
              <li className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {"Chứng chỉ Xác thực Đã đăng ký"}
              </li>
              {course.financialAidEnabled && (
                <li className="flex items-center gap-2 pt-1 border-t border-border">
                  <svg
                    className="w-4 h-4 text-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <button
                    type="button"
                    onClick={handleOpenFinAidModal}
                    disabled={checkingFinAidStatus}
                    className="font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-xs disabled:opacity-50"
                  >
                    <span aria-live="polite">
                      {checkingFinAidStatus ? "Đang kiểm tra…" : "Financial Aid available"}
                    </span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Course Syllabus Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-extrabold text-foreground mb-6">
          {"Nội Dung Chương Trình Học (Syllabus)"}
        </h2>

        {course.weekModules.length === 0 ? (
          <div className="bg-card border border-border p-8 rounded-2xl text-center text-muted-foreground">
            {"Khóa học đang trong quá trình cập nhật các bài giảng tuần tiếp theo."}
          </div>
        ) : (
          <div className="space-y-6">
            {course.weekModules.map((week) => (
              <div key={week.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    {"Tuần"} {week.weekNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {week.lessons.reduce((sum, l) => sum + l.items.length, 0)} {"Items bài học"}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{week.title}</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{week.summary}</p>

                <div className="space-y-3 border-t border-border pt-4">
                  {week.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="bg-muted/50 border border-border rounded-xl p-4"
                    >
                      <h4 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        {lesson.title}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                        {lesson.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <span className="flex items-center gap-1">
                              {item.type === ItemType.VIDEO ? (
                                <svg
                                  className="w-3.5 h-3.5 text-primary flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                  />
                                </svg>
                              ) : item.type === ItemType.READING ? (
                                <svg
                                  className="w-3.5 h-3.5 text-success flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              ) : item.type === ItemType.AUTO_GRADED_LAB ? (
                                <svg
                                  className="w-3.5 h-3.5 text-primary flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                                  />
                                </svg>
                              ) : item.type === ItemType.PEER_REVIEW ? (
                                <svg
                                  className="w-3.5 h-3.5 text-primary flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-3.5 h-3.5 text-warning flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              )}
                            </span>
                            <span className="text-foreground font-medium truncate">
                              {item.title}
                            </span>
                            <span className="text-muted-foreground ml-auto">
                              ({item.estimatedMinutes}m)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Course Rating & Reviews Section */}
        <div className="mt-16 border-t border-border pt-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-foreground">
                {"Đánh giá & Nhận xét từ Học viên"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {"Các nhận xét thực tế từ học viên đã tham gia khóa học này"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {course.averageRating > 0 && (
                <div className="flex items-center gap-3 bg-warning/10 border border-warning/20 px-4 py-2.5 rounded-xl text-warning">
                  <span className="text-3xl font-black text-warning">
                    {course.averageRating.toFixed(1)}
                  </span>
                  <div>
                    <RatingStars rating={course.averageRating} size="md" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {course.reviewCount} {"nhận xét"}
                    </span>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    window.location.href = `/auth/login?redirect=/courses/${courseId}`;
                    return;
                  }
                  setIsReviewModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
                <span>{"Viết / Sửa đánh giá"}</span>
              </button>
            </div>
          </div>

          {loadingReviews ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              {[1, 2].map((n) => (
                <div key={n} className="bg-card border border-border p-6 rounded-2xl h-28" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-card border border-border p-8 rounded-2xl text-center text-muted-foreground">
              {
                "Chưa có đánh giá nào cho khóa học này. Hãy là học viên đầu tiên hoàn thành và để lại nhận xét!"
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold uppercase shadow-sm">
                        {rev.userName ? rev.userName.slice(0, 2) : "HV"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-foreground leading-tight">
                            {rev.userName || "Học viên LMS"}
                          </h4>
                          {rev.isVerifiedCompleter ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20">
                              ✓ Verified Completer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-input">
                              Active Learner Review
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {rev.createdAt
                            ? new Date(rev.createdAt).toLocaleDateString(
                                locale === "vi" ? "vi-VN" : "en-US",
                              )
                            : "Gần đây"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400 bg-warning/10 border border-warning/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <span>{rev.ratingStars}</span>
                      <svg
                        className="w-3.5 h-3.5 fill-amber-400"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.486-.413.87-.837.614L12 17.653l-4.708 2.89c-.424.256-.953-.128-.837-.614l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    </div>
                  </div>
                  {rev.commentText && (
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      &ldquo;{rev.commentText}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Review & Rating Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={"Đánh giá khóa học"}
        className="max-w-md"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">
              {"Chọn số sao đánh giá:"}
            </label>
            <div className="flex items-center gap-1.5 justify-center py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md cursor-pointer"
                >
                  <svg
                    className={`w-7 h-7 ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/40 fill-none"
                    }`}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.486-.413.87-.837.614L12 17.653l-4.708 2.89c-.424.256-.953-.128-.837-.614l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-foreground">
                {"Nội dung nhận xét:"}
              </label>
              <span
                className={`text-[10px] ${comment.length > 2000 ? "text-destructive font-bold" : "text-muted-foreground"}`}
              >
                {comment.length}/2000
              </span>
            </div>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              placeholder={"Chia sẻ trải nghiệm học tập, đánh giá nội dung bài giảng…"}
              className="w-full text-xs p-3 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
            >
              {"Hủy"}
            </button>
            <button
              type="submit"
              disabled={submittingReview}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <span aria-live="polite">{submittingReview ? "Đang gửi…" : "Gửi đánh giá"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Financial Aid Modal */}
      <Modal
        isOpen={isFinAidModalOpen}
        onClose={() => setIsFinAidModalOpen(false)}
        title={`Đơn xin Hỗ trợ Tài chính - ${course?.title}`}
        className="max-w-2xl"
      >
        {existingFinAidStatus ? (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <span className="text-xs font-mono font-semibold text-muted-foreground">
                  Mã đơn: #{existingFinAidStatus.id}
                </span>
                <h3 className="text-base font-bold text-foreground mt-0.5">{course?.title}</h3>
              </div>

              {existingFinAidStatus.status === "PENDING" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                  {"Đang xét duyệt"}
                </span>
              )}
              {existingFinAidStatus.status === "APPROVED" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20 flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {"Đã Phê Duyệt"}
                </span>
              )}
              {existingFinAidStatus.status === "REJECTED" && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-destructive"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  {"Chưa được duyệt"}
                </span>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-muted/50 border border-border text-xs text-muted-foreground space-y-2">
              <p>{"Bạn đã gửi đơn xin hỗ trợ tài chính cho khóa học này."}</p>
              {existingFinAidStatus.status === "PENDING" && (
                <p>
                  {"Thời gian phản hồi dự kiến còn lại: "}
                  <strong className="text-primary">
                    {existingFinAidStatus.reviewDeadlineDaysLeft} ngày
                  </strong>
                  .
                </p>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {"Bài luận đã gửi:"}
              </span>
              <div className="p-4 rounded-2xl bg-muted/50 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {existingFinAidStatus.essay150Words}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setExistingFinAidStatus(null)}
                className="px-4 py-2 rounded-xl border border-input text-foreground text-xs font-semibold hover:bg-muted cursor-pointer"
              >
                {"Nộp bài luận mới"}
              </button>
              <Link
                href="/financial-aid"
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>{"Quản lý danh sách Đơn Hỗ trợ tài chính của tôi"}</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFinAidSubmit} className="space-y-6 pt-2">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {"Bài luận giải trình hoàn cảnh & Mục tiêu (Tối thiểu 150 từ)"}
                </label>
                <span
                  className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md ${
                    isFinAidEnoughWords
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {finAidWordCount} / 150 {"từ"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {
                  "Hãy giải thích lý do bạn xin hỗ trợ tài chính, dự định học tập và việc hoàn thành khóa học này sẽ giúp ích thế nào cho sự nghiệp của bạn."
                }
              </p>
              <textarea
                rows={8}
                value={finAidEssay}
                onChange={(e) => setFinAidEssay(e.target.value)}
                placeholder={"Tôi xin nộp đơn xin hỗ trợ tài chính cho khóa học này vì…"}
                className="w-full p-4 rounded-2xl border border-input bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-sm leading-relaxed"
                required
              />
              <div className="w-full bg-muted h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${isFinAidEnoughWords ? "bg-success" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, (finAidWordCount / 150) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20 text-xs text-warning space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 text-warning"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {"Cam kết liêm chính học thuật:"}
              </p>
              <p>
                {
                  "Tôi cam kết cung cấp thông tin trung thực về hoàn cảnh kinh tế và sẽ hoàn thành tất cả các bài kiểm tra của khóa học."
                }
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-border">
              <Link
                href="/financial-aid"
                className="text-xs font-semibold text-muted-foreground hover:text-primary underline"
              >
                {"Xem danh sách các đơn đã gửi →"}
              </Link>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFinAidModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-input text-foreground text-xs font-semibold hover:bg-muted cursor-pointer"
                >
                  {"Hủy"}
                </button>
                <button
                  type="submit"
                  disabled={submittingFinAid || !isFinAidEnoughWords}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  <span aria-live="polite">
                    {submittingFinAid ? "Đang gửi đơn…" : "Gửi đơn xin Hỗ trợ"}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <PaymentCheckoutModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        courseId={course.id}
        courseTitle={course.title}
      />
    </DirectionalTransition>
  );
}
