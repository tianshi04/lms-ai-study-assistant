"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCategoriesQuery,
  useCourseDetailQuery,
  useCourseReviewsQuery,
  useLearningProgressQuery,
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
import { Dialog } from "@/components/ui/Dialog";

import { RatingStars } from "@/components/ui/RatingStars";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Textarea } from "@/components/ui/Textarea";
import { Surface } from "@/components/ui/Surface";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { PaymentCheckoutModal } from "@/components/course/PaymentCheckoutModal";
import { CourseCard } from "@/components/course/CourseCard";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Pencil,
  CheckCircle2,
  Star,
  ArrowRight,
  CreditCard,
  Check,
  CircleDollarSign,
  BookOpen,
  PlayCircle,
  FileText,
  Code2,
  Users,
  SquarePen,
  X,
  AlertTriangle,
  Sparkles,
  Award,
} from "lucide-react";

interface CourseDetailClientProps {
  courseId: string;
}

export function CourseDetailClient({ courseId }: CourseDetailClientProps) {
  const { isAuthenticated, isInstructorOrAdmin, userId, userName } = useAuth();
  const locale = "vi";
  const queryClient = useQueryClient();

  const {
    data: courseDetail,
    isLoading: loadingCourse,
    error: courseErr,
  } = useCourseDetailQuery(courseId);

  const course = courseDetail?.course ?? null;
  const foundationalCourses = courseDetail?.foundationalCourses ?? [];
  const recommendedCourses = courseDetail?.recommendedCourses ?? [];
  const specialization = courseDetail?.specialization ?? null;

  const isOwnCourse = useMemo(() => {
    if (!course) return false;
    if (userId && course.ownerId && course.ownerId === userId) return true;
    if (userId && course.coInstructorIds && course.coInstructorIds.includes(userId)) return true;
    if (userName && course.instructorNames && course.instructorNames.includes(userName))
      return true;
    return false;
  }, [course, userId, userName]);

  const { data: subjects } = useCategoriesQuery("SUBJECT", { staleTime: 5 * 60 * 1000 });
  const { data: levels } = useCategoriesQuery("LEVEL", { staleTime: 5 * 60 * 1000 });

  const subjectMap = useMemo(
    () => new Map((subjects ?? []).map((s) => [s.id, s.name])),
    [subjects],
  );
  const levelMap = useMemo(() => new Map((levels ?? []).map((l) => [l.id, l.name])), [levels]);

  const { data: reviews = [], isLoading: loadingReviews } = useCourseReviewsQuery(courseId);
  const { data: learningProgress } = useLearningProgressQuery(courseId, {
    enabled: isAuthenticated && !!courseId,
  });
  const progressPercent = learningProgress?.overallProgressPercent ?? 0;
  const canReview = isAuthenticated && progressPercent >= 50;

  const { data: myCertificates = [], isLoading: loadingCerts } = useMyCertificatesQuery();
  const { data: paymentAccess, isLoading: loadingPayment } = usePaymentAccessQuery(courseId, {
    enabled: isAuthenticated && !!courseId,
  });
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
  const [isSpecializationModalOpen, setIsSpecializationModalOpen] = useState(false);

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
    if (!canReview) {
      toast.error("Cần hoàn thành 50% khóa học để đánh giá");
      return;
    }
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
            {error || `Không tìm thấy khóa học "${courseId}".`}
          </p>
          <Link
            href="/courses"
            prefetch={true}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors"
          >
            ← {"Quay lại Danh mục Khóa học"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Banner */}
      <div className="bg-background border-b border-border py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {course.subject && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide">
                  <span>{subjectMap.get(course.subject) || course.subject}</span>
                </div>
              )}
              {course.level && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-foreground text-xs font-semibold">
                  <span>{levelMap.get(course.level) || course.level}</span>
                </div>
              )}
              {isInstructorOrAdmin && (
                <Chip
                  variant="assist"
                  leadingIcon={<Pencil aria-hidden="true" className="w-3.5 h-3.5" />}
                  render={
                    <Link href={`/instructor/courses/${course.id}`}>
                      {"Biên soạn Bài giảng (Giảng viên)"}
                    </Link>
                  }
                />
              )}
              {hasCert && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 border border-success/20 text-success text-xs font-bold">
                  <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 text-success" />
                  <span>{"Đã Nhận Chứng Chỉ"}</span>
                </div>
              )}
              {course.averageRating > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 border border-warning/20 text-warning text-xs font-bold">
                  <Star aria-hidden="true" className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>
                    {course.averageRating.toFixed(1)} / 5.0 ({course.reviewCount} {"nhận xét"})
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
                  {course.instructorNames.length > 0
                    ? course.instructorNames.join(", ")
                    : `Đội ngũ ${course.partnerName}`}
                </span>
              </div>
            </div>
          </div>

          {/* Enrollment Card (M3 Elevated & Glassmorphism Container Item 1.3) */}
          <Surface
            variant="bright"
            shape="3xl"
            className="relative overflow-hidden border border-primary/20 p-6 space-y-6 shadow-lg"
          >
            {/* M3 Top Gradient Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-accent" />

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
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-warning hover:bg-warning-hover text-warning-foreground font-bold text-sm transition-colors shadow-lg cursor-pointer"
                >
                  <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-warning-foreground" />
                  <span>{"Xem Chứng Chỉ"}</span>
                </Link>
                <Link
                  href={`/learn/${course.id}`}
                  prefetch={true}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold transition-colors cursor-pointer"
                >
                  <span>{"Vào Học Lại"}</span>
                </Link>
              </div>
            ) : isPaidAccess ? (
              <div className="space-y-3">
                <Link
                  href={`/learn/${course.id}`}
                  prefetch={true}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm transition-colors shadow-lg cursor-pointer"
                >
                  <span>{"Vào Học Ngay (Paid Mode)"}</span>
                  <ArrowRight aria-hidden="true" className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  href={`/learn/${course.id}`}
                  prefetch={true}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm transition-colors shadow-lg cursor-pointer"
                >
                  <span>{"Vào Học Ngay (Audit Mode)"}</span>
                  <ArrowRight aria-hidden="true" className="w-4 h-4" />
                </Link>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full py-3 px-6 rounded-full bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary font-semibold text-sm justify-center gap-2"
                >
                  <CreditCard aria-hidden="true" className="w-4 h-4 text-primary" />
                  <span>{"Nâng Cấp Paid Mode / Coursera Plus"}</span>
                </Button>
              </div>
            )}

            {/* Specialization Combo Anchor Callout */}
            {specialization && (
              <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-primary">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    {"Combo Chuyên ngành"}
                  </span>
                  {(specialization.discountPercent ?? 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {`Tiết kiệm ${specialization.discountPercent}%`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {`Khóa học này thuộc chương trình ${specialization.title} gồm ${specialization.courses.length} môn.`}
                </p>
                <a
                  href="#specialization-showcase"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-0.5 group cursor-pointer"
                >
                  <span>{"Xem Lộ trình & Mua Combo"}</span>
                  <ArrowRight
                    className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </a>
              </div>
            )}

            <ul className="space-y-3 text-xs text-muted-foreground border-t border-border pt-4">
              <li className="flex items-center gap-2">
                <Check aria-hidden="true" className="w-4 h-4 text-primary" />
                {"Hạn nộp linh hoạt (Flexible Deadlines)"}
              </li>
              <li className="flex items-center gap-2">
                <Check aria-hidden="true" className="w-4 h-4 text-primary" />
                {"Chứng chỉ Xác thực Đã đăng ký"}
              </li>
              {course.financialAidEnabled && (
                <li className="flex items-center gap-2 pt-1 border-t border-border">
                  <CircleDollarSign aria-hidden="true" className="w-4 h-4 text-success" />
                  <Button
                    type="button"
                    variant="text"
                    size="sm"
                    onClick={handleOpenFinAidModal}
                    disabled={checkingFinAidStatus}
                    className="font-bold text-primary hover:underline p-0 h-auto text-xs justify-start"
                  >
                    <span aria-live="polite">
                      {checkingFinAidStatus ? "Đang kiểm tra…" : "Có chính sách Hỗ trợ Tài chính"}
                    </span>
                    <ArrowRight aria-hidden="true" className="w-3 h-3 ml-1" />
                  </Button>
                </li>
              )}
            </ul>
          </Surface>
        </div>
      </div>

      {/* Course Syllabus Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Section 1: Khóa học Nền tảng Khuyến nghị */}
        {foundationalCourses.length > 0 && (
          <section aria-labelledby="foundational-course-heading" className="mb-12">
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide">
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span id="foundational-course-heading">{"Khóa học Nền tảng Khuyến nghị"}</span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {foundationalCourses.length > 1
                  ? `Khuyến nghị học trước ${foundationalCourses.length} môn nền tảng (Không bắt buộc)`
                  : "Khuyến nghị học trước (Không bắt buộc)"}
              </span>
            </div>

            {foundationalCourses.length === 1 ? (
              <Surface
                variant="low"
                shape="2xl"
                className="p-6 md:p-8 border border-primary/20 bg-primary/5 space-y-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
                      <span className="font-semibold text-foreground">
                        {foundationalCourses[0].partnerName}
                      </span>
                      {foundationalCourses[0].subject && (
                        <>
                          <span>•</span>
                          <span>
                            {subjectMap.get(foundationalCourses[0].subject) ||
                              foundationalCourses[0].subject}
                          </span>
                        </>
                      )}
                      {foundationalCourses[0].level && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-[11px]">
                            {levelMap.get(foundationalCourses[0].level) ||
                              foundationalCourses[0].level}
                          </span>
                        </>
                      )}
                    </div>

                    <h2 className="text-xl md:text-2xl font-bold text-foreground hover:text-primary transition-colors">
                      <Link href={`/courses/${foundationalCourses[0].id}`}>
                        {foundationalCourses[0].title}
                      </Link>
                    </h2>

                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {foundationalCourses[0].description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span>
                        {(foundationalCourses[0].instructorNames ?? []).length > 0
                          ? (foundationalCourses[0].instructorNames ?? []).join(", ")
                          : `Đội ngũ ${foundationalCourses[0].partnerName}`}
                      </span>
                      {(foundationalCourses[0].weekModules ?? []).length > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            {(foundationalCourses[0].weekModules ?? []).length} {"tuần học"}
                          </span>
                        </>
                      )}
                      {foundationalCourses[0].averageRating > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-warning font-semibold">
                            <Star
                              className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                              aria-hidden="true"
                            />
                            {foundationalCourses[0].averageRating.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
                    <Link
                      href={`/courses/${foundationalCourses[0].id}`}
                      prefetch={true}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm transition-colors shadow-sm cursor-pointer"
                    >
                      <span>{"Xem Khóa Nền Tảng"}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </Surface>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {foundationalCourses.map((fc) => (
                  <Surface
                    key={fc.id}
                    variant="low"
                    shape="2xl"
                    className="p-5 border border-primary/20 bg-primary/5 flex flex-col justify-between hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-medium">
                        <span className="font-semibold text-foreground">{fc.partnerName}</span>
                        {fc.subject && (
                          <>
                            <span>•</span>
                            <span>{subjectMap.get(fc.subject) || fc.subject}</span>
                          </>
                        )}
                        {fc.level && (
                          <>
                            <span>•</span>
                            <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-[11px]">
                              {levelMap.get(fc.level) || fc.level}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors line-clamp-1">
                        <Link href={`/courses/${fc.id}`}>{fc.title}</Link>
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {fc.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span>
                          {(fc.instructorNames ?? []).length > 0
                            ? (fc.instructorNames ?? []).join(", ")
                            : `Đội ngũ ${fc.partnerName}`}
                        </span>
                        {fc.averageRating > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-warning font-semibold">
                              <Star
                                className="w-3 h-3 fill-amber-400 text-amber-400"
                                aria-hidden="true"
                              />
                              {fc.averageRating.toFixed(1)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-2 border-t border-primary/10 flex justify-end">
                      <Link
                        href={`/courses/${fc.id}`}
                        prefetch={true}
                        className="inline-flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-xs transition-colors cursor-pointer"
                      >
                        <span>{"Xem Khóa Nền Tảng"}</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </Surface>
                ))}
              </div>
            )}
          </section>
        )}

        <h2 className="text-2xl font-extrabold text-foreground mb-6">
          {"Nội Dung Chương Trình Học"}
        </h2>

        {(course.weekModules ?? []).length === 0 ? (
          <div className="bg-card border border-border p-8 rounded-2xl text-center text-muted-foreground">
            {"Khóa học đang trong quá trình cập nhật các bài giảng tuần tiếp theo."}
          </div>
        ) : (
          <div className="space-y-6">
            {(course.weekModules ?? []).map((week) => (
              <div key={week.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    {"Tuần"} {week.weekNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(week.lessons ?? []).reduce((sum, l) => sum + (l.items ?? []).length, 0)}{" "}
                    {"bài học"}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{week.title}</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{week.summary}</p>

                <div className="space-y-3">
                  {(week.lessons ?? []).map((lesson) => (
                    <div
                      key={lesson.id}
                      className="bg-muted/50 border border-border rounded-xl p-4"
                    >
                      <h4 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                        <BookOpen aria-hidden="true" className="w-4 h-4 text-primary" />
                        {lesson.title}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                        {(lesson.items ?? []).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <span className="flex items-center gap-1">
                              {item.type === ItemType.VIDEO ? (
                                <PlayCircle
                                  aria-hidden="true"
                                  className="w-3.5 h-3.5 text-primary flex-shrink-0"
                                />
                              ) : item.type === ItemType.READING ? (
                                <FileText
                                  aria-hidden="true"
                                  className="w-3.5 h-3.5 text-success flex-shrink-0"
                                />
                              ) : item.type === ItemType.AUTO_GRADED_LAB ? (
                                <Code2
                                  aria-hidden="true"
                                  className="w-3.5 h-3.5 text-primary flex-shrink-0"
                                />
                              ) : item.type === ItemType.PEER_REVIEW ? (
                                <Users
                                  aria-hidden="true"
                                  className="w-3.5 h-3.5 text-primary flex-shrink-0"
                                />
                              ) : (
                                <Pencil
                                  aria-hidden="true"
                                  className="w-3.5 h-3.5 text-warning flex-shrink-0"
                                />
                              )}
                            </span>
                            <span className="text-foreground font-medium min-w-0 truncate">
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

        {/* Specialization Showcase & Combo Bundle Section */}
        {specialization && specialization.courses.length > 0 && (
          <section
            id="specialization-showcase"
            aria-labelledby="specialization-showcase-heading"
            className="mt-16 border-t border-border pt-12 scroll-mt-24"
          >
            {/* Section Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide mb-3">
                <Award className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                <span>{"Chương trình Chuyên ngành (Specialization)"}</span>
              </div>
              <h2
                id="specialization-showcase-heading"
                className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight"
              >
                {specialization.title}
              </h2>
              {specialization.description && (
                <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-3xl leading-relaxed">
                  {specialization.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground font-medium">
                <span>{"Chứng nhận tốt nghiệp cấp bởi"}</span>
                <span className="font-bold text-foreground">{specialization.partnerName}</span>
                <span>•</span>
                <span>{`${specialization.courses.length} khóa học chuyên sâu`}</span>
              </div>
            </div>

            {/* Showcase Grid: 65% Roadmap vs 35% Combo Pricing */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Learning Roadmap */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {"Lộ trình học tập tuần tự"}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {"Đề xuất học từ Cơ bản đến Nâng cao"}
                  </span>
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                  {specialization.courses.map((specCourse, idx) => {
                    const isCurrent = specCourse.id === course.id;
                    const courseOrder = idx + 1;
                    return (
                      <div key={specCourse.id} className="relative group">
                        {/* Dot indicator on timeline */}
                        <div
                          className={`absolute -left-6 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
                            isCurrent
                              ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20"
                              : "bg-card border-border text-muted-foreground group-hover:border-primary group-hover:text-primary"
                          }`}
                        >
                          {courseOrder}
                        </div>

                        {/* Course Card in Roadmap */}
                        <Surface
                          variant={isCurrent ? "bright" : "low"}
                          shape="2xl"
                          className={`p-5 border transition-all ${
                            isCurrent
                              ? "border-primary/40 shadow-md ring-1 ring-primary/20"
                              : "border-border hover:border-border/80 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                  {`Môn ${courseOrder} / ${specialization.courses.length}`}
                                </span>
                                {isCurrent && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                    {"Đang xem"}
                                  </span>
                                )}
                                {specCourse.level && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-semibold border border-border">
                                    {specCourse.level}
                                  </span>
                                )}
                              </div>

                              <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                                {specCourse.title}
                              </h4>

                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {specCourse.description}
                              </p>

                              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
                                {specCourse.averageRating > 0 && (
                                  <span className="flex items-center gap-1 text-warning font-semibold">
                                    <Star
                                      className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                                      aria-hidden="true"
                                    />
                                    {specCourse.averageRating.toFixed(1)}
                                  </span>
                                )}
                                <span>{`${specCourse.weekModules?.length || 4} tuần học`}</span>
                                <span>•</span>
                                <span className="font-semibold text-foreground">
                                  {specCourse.price > 0
                                    ? `${specCourse.price.toLocaleString("vi-VN")} đ`
                                    : "Miễn phí"}
                                </span>
                              </div>
                            </div>

                            {!isCurrent && (
                              <Link
                                href={`/courses/${specCourse.id}`}
                                className="self-center p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors shrink-0"
                                aria-label={`Xem chi tiết ${specCourse.title}`}
                              >
                                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                              </Link>
                            )}
                          </div>
                        </Surface>
                      </div>
                    );
                  })}

                  {/* Destination / Capstone Milestone */}
                  <div className="relative group">
                    <div className="absolute -left-6 top-3 w-5 h-5 rounded-full bg-warning border-2 border-warning text-warning-foreground flex items-center justify-center text-[10px] font-bold shadow">
                      <Award className="w-3 h-3" aria-hidden="true" />
                    </div>
                    <Surface
                      variant="low"
                      shape="2xl"
                      className="p-4 border border-dashed border-warning/40 bg-warning/5 flex items-center gap-3.5"
                    >
                      <div className="p-2.5 rounded-xl bg-warning/10 text-warning shrink-0">
                        <Award className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">
                          {"Đích đến: Chứng chỉ Chuyên ngành Chính thức"}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {`Được cấp bởi ${specialization.partnerName || "Hệ thống"} & xác thực chứng chỉ hoàn thành.`}
                        </p>
                      </div>
                    </Surface>
                  </div>
                </div>
              </div>

              {/* Right Column: Specialization Bundle Checkout Card */}
              <div className="lg:col-span-5 lg:sticky lg:top-24">
                <Surface
                  variant="bright"
                  shape="3xl"
                  className="relative overflow-hidden border-2 border-primary/30 p-6 space-y-6 shadow-xl bg-card"
                >
                  {/* Top Accent Ribbon */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        {"Gói Trọn Bộ Chuyên Ngành"}
                      </span>
                      {(specialization.discountPercent ?? 0) > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-extrabold tracking-wide">
                          {`TIẾT KIỆM ${specialization.discountPercent}%`}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-foreground">
                      {`Mua Trọn Gói ${specialization.courses.length} Khóa Học`}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {
                        "Đăng ký một lần để sở hữu trọn bộ lộ trình chuyên sâu cùng quyền lợi làm Đồ án tốt nghiệp và nhận Chứng chỉ Chuyên ngành."
                      }
                    </p>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{`Tổng giá lẻ từng môn (${specialization.courses.length} môn):`}</span>
                      <span className="line-through font-semibold">
                        {(specialization.totalIndividualPrice ?? 0) > 0
                          ? `${specialization.totalIndividualPrice.toLocaleString("vi-VN")} đ`
                          : "Miễn phí"}
                      </span>
                    </div>

                    {(specialization.discountPercent ?? 0) > 0 &&
                      (specialization.totalIndividualPrice ?? 0) >
                        (specialization.bundlePrice ?? 0) && (
                        <div className="flex items-center justify-between text-xs font-bold text-destructive">
                          <span>{`Ưu đãi Combo Chuyên ngành (-${specialization.discountPercent}%):`}</span>
                          <span>
                            {`-${((specialization.totalIndividualPrice ?? 0) - (specialization.bundlePrice ?? 0)).toLocaleString("vi-VN")} đ`}
                          </span>
                        </div>
                      )}

                    <div className="h-px bg-border my-1" />

                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {"Giá thanh toán trọn gói"}
                        </span>
                        <span className="text-2xl md:text-3xl font-black text-primary tracking-tight">
                          {(specialization.bundlePrice ?? 0) > 0
                            ? `${specialization.bundlePrice.toLocaleString("vi-VN")} đ`
                            : "Miễn phí"}
                        </span>
                      </div>
                      {(specialization.bundlePrice ?? 0) > 0 && (
                        <span className="text-[11px] text-muted-foreground font-semibold">
                          {"(Đã gồm VAT)"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Benefit Checklist */}
                  <ul className="space-y-2.5 text-xs text-foreground">
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        {"Toàn quyền truy cập trọn đời cả "}
                        <strong>{`${specialization.courses.length} khóa học`}</strong>
                        {" trong chương trình"}
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        {"Toàn bộ bài tập thực hành, code lab và bài trắc nghiệm có chấm điểm"}
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong>{"1 Chứng chỉ Chuyên ngành chính thức"}</strong>
                        {` từ ${specialization.partnerName}`}
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{"Thời gian học linh hoạt, không giới hạn tiến độ cá nhân"}</span>
                    </li>
                  </ul>

                  {/* Primary CTA Button */}
                  <div className="space-y-2 pt-2">
                    <Button
                      type="button"
                      variant="filled"
                      onClick={() => setIsSpecializationModalOpen(true)}
                      className="w-full py-4 px-6 rounded-full font-bold text-sm justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      <span>{"Đăng Ký Trọn Gói Chuyên Ngành"}</span>
                    </Button>
                    <p className="text-[11px] text-center text-muted-foreground">
                      {"Cam kết hoàn tiền trong 7 ngày nếu không hài lòng"}
                    </p>
                  </div>
                </Surface>
              </div>
            </div>
          </section>
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
              {!isOwnCourse && (
                <span
                  title={
                    isAuthenticated && !canReview
                      ? "Cần hoàn thành 50% khóa học để đánh giá"
                      : undefined
                  }
                  className="inline-block"
                >
                  <Button
                    type="button"
                    variant="filled"
                    size="sm"
                    disabled={isAuthenticated && !canReview}
                    onClick={() => {
                      if (!isAuthenticated) {
                        window.location.href = `/auth/login?redirect=/courses/${courseId}`;
                        return;
                      }
                      if (!canReview) return;
                      const myReview = reviews.find((r) => r.userId === userId);
                      if (myReview) {
                        setRating(myReview.ratingStars);
                        setComment(myReview.commentText);
                      }
                      setIsReviewModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl font-bold shadow-sm gap-2"
                  >
                    <SquarePen aria-hidden="true" className="w-4 h-4" />
                    <span>{"Đánh giá"}</span>
                  </Button>
                </span>
              )}
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
                <Surface key={rev.id} variant="low" shape="2xl" className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={rev.userName || "Học viên LMS"} size="md" />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-foreground leading-tight">
                            {rev.userName || "Học viên LMS"}
                          </h4>
                          {rev.isVerifiedCompleter ? (
                            <Badge variant="success">✓</Badge>
                          ) : (
                            <Badge variant="outlined">HỌC</Badge>
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
                    <div className="flex items-center gap-0.5 text-warning bg-warning/10 border border-warning/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <span>{rev.ratingStars}</span>
                      <Star
                        aria-hidden="true"
                        className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                      />
                    </div>
                  </div>
                  {rev.commentText && (
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      &ldquo;{rev.commentText}&rdquo;
                    </p>
                  )}
                </Surface>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Khóa học Đề xuất Liên quan */}
        {recommendedCourses.length > 0 && (
          <section
            aria-labelledby="recommended-courses-heading"
            className="mt-16 border-t border-border pt-12"
          >
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide mb-3">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{"Gợi ý thông minh từ AI"}</span>
              </div>
              <h2
                id="recommended-courses-heading"
                className="text-2xl font-extrabold text-foreground"
              >
                {"Khóa học Đề xuất Liên quan"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {
                  "Gợi ý thông minh dựa trên nội dung bài giảng, độ tương đồng tri thức và giảng viên tương ứng."
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedCourses.map((rec) => {
                if (!rec.course || rec.course.id === course.id) return null;
                return <CourseCard key={rec.course.id} course={rec.course} />;
              })}
            </div>
          </section>
        )}
      </main>

      {/* Review & Rating Modal */}
      <Dialog.Root open={isReviewModalOpen} onOpenChange={(open) => setIsReviewModalOpen(open)}>
        <Dialog.Content size="md">
          <Dialog.Header>
            <Dialog.Title>{"Đánh giá khóa học"}</Dialog.Title>
          </Dialog.Header>
          {!canReview && (
            <div className="bg-warning/10 border border-warning/30 p-3 rounded-xl flex items-center gap-2.5 text-warning text-xs font-medium my-4">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{"Cần hoàn thành 50% khóa học để đánh giá"}</span>
            </div>
          )}
          <form onSubmit={handleReviewSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                {"Chọn số sao đánh giá:"}
              </label>
              <div
                aria-label="Chọn số sao đánh giá"
                className="flex items-center gap-1.5 justify-center py-2"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <IconButton
                    key={star}
                    type="button"
                    aria-pressed={rating === star}
                    variant="standard"
                    size="sm"
                    disabled={!canReview}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Đánh giá ${star} sao`}
                  >
                    <Star
                      aria-hidden="true"
                      className={`w-7 h-7 ${
                        star <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40 fill-none"
                      }`}
                    />
                  </IconButton>
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
              <Textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={2000}
                disabled={!canReview}
                placeholder={"Chia sẻ trải nghiệm học tập, đánh giá nội dung bài giảng…"}
                className="text-xs p-3 rounded-xl bg-card resize-none"
              />
            </div>

            <Dialog.Footer className="pt-2">
              <Button
                type="button"
                variant="text"
                size="sm"
                onClick={() => setIsReviewModalOpen(false)}
                className="text-xs text-muted-foreground"
              >
                {"Hủy"}
              </Button>
              <Button
                type="submit"
                variant="filled"
                size="sm"
                disabled={submittingReview || !canReview}
                className="text-xs shadow-sm"
              >
                {"Gửi đánh giá"}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {/* Financial Aid Modal */}
      <Dialog.Root open={isFinAidModalOpen} onOpenChange={(open) => setIsFinAidModalOpen(open)}>
        <Dialog.Content size="lg">
          <Dialog.Header>
            <Dialog.Title>{`Đơn xin Hỗ trợ Tài chính - ${course?.title}`}</Dialog.Title>
          </Dialog.Header>
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
                    <Check aria-hidden="true" className="w-4 h-4 text-success" />
                    {"Đã Phê Duyệt"}
                  </span>
                )}
                {existingFinAidStatus.status === "REJECTED" && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1.5">
                    <X aria-hidden="true" className="w-4 h-4 text-destructive" />
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

              <Dialog.Footer className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="text"
                  size="sm"
                  onClick={() => setExistingFinAidStatus(null)}
                  className="rounded-xl text-xs font-semibold w-full sm:w-auto"
                >
                  {"Nộp bài luận mới"}
                </Button>
                <Button
                  render={<Link href="/financial-aid" />}
                  variant="filled"
                  size="sm"
                  className="rounded-xl text-xs font-bold w-full sm:w-auto"
                >
                  <span>{"Quản lý danh sách Đơn Hỗ trợ tài chính của tôi"}</span>
                  <ArrowRight aria-hidden="true" className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Dialog.Footer>
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
                <Textarea
                  rows={8}
                  value={finAidEssay}
                  onChange={(e) => setFinAidEssay(e.target.value)}
                  placeholder={"Tôi xin nộp đơn xin hỗ trợ tài chính cho khóa học này vì…"}
                  className="p-4 rounded-2xl bg-card text-sm leading-relaxed"
                  required
                />
                <Progress.Linear value={(finAidWordCount / 150) * 100} className="mt-3" />
              </div>

              <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20 text-xs text-warning space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle aria-hidden="true" className="w-4 h-4 text-warning" />
                  {"Cam kết liêm chính học thuật:"}
                </p>
                <p>
                  {
                    "Tôi cam kết cung cấp thông tin trung thực về hoàn cảnh kinh tế và sẽ hoàn thành tất cả các bài kiểm tra của khóa học."
                  }
                </p>
              </div>

              <Dialog.Footer className="pt-4 flex items-center justify-between border-t border-border">
                <Link
                  href="/financial-aid"
                  className="text-xs font-semibold text-muted-foreground hover:text-primary underline"
                >
                  {"Xem danh sách các đơn đã gửi →"}
                </Link>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="text"
                    size="sm"
                    onClick={() => setIsFinAidModalOpen(false)}
                    className="rounded-xl text-xs font-semibold"
                  >
                    {"Hủy"}
                  </Button>
                  <Button
                    type="submit"
                    variant="filled"
                    size="sm"
                    disabled={submittingFinAid || !isFinAidEnoughWords || submittingFinAid}
                    className="rounded-xl text-xs font-bold shadow-lg"
                  >
                    {"Gửi đơn xin Hỗ trợ"}
                  </Button>
                </div>
              </Dialog.Footer>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Root>

      <PaymentCheckoutModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        courseId={course.id}
        courseTitle={course.title}
      />

      {/* Specialization Bundle Checkout Confirmation Modal */}
      {specialization && (
        <Dialog.Root
          open={isSpecializationModalOpen}
          onOpenChange={(open) => setIsSpecializationModalOpen(open)}
        >
          <Dialog.Content className="max-w-xl p-6 bg-card border border-border rounded-3xl shadow-2xl">
            <Dialog.Header className="space-y-1.5 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold">
                  {"Combo Chuyên Ngành"}
                </span>
                {(specialization.discountPercent ?? 0) > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {`Tiết kiệm ${specialization.discountPercent}%`}
                  </span>
                )}
              </div>
              <Dialog.Title className="text-xl font-black text-foreground">
                {specialization.title}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground">
                {`Chương trình chuyên sâu cấp chứng chỉ bởi ${specialization.partnerName || "Hệ thống"}`}
              </Dialog.Description>
            </Dialog.Header>

            <div className="py-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {`Các khóa học bao gồm trong gói (${specialization.courses.length} môn)`}
              </h4>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {specialization.courses.map((sc, idx) => (
                  <div
                    key={sc.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-muted/50 border border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{sc.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {sc.price > 0 ? `${sc.price.toLocaleString("vi-VN")} đ` : "Miễn phí"}
                        </p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
                  </div>
                ))}
              </div>

              {/* Pricing Summary */}
              <div className="p-4 rounded-2xl bg-muted border border-border space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{"Tổng học phí gốc:"}</span>
                  <span className="line-through">
                    {(specialization.totalIndividualPrice ?? 0) > 0
                      ? `${specialization.totalIndividualPrice.toLocaleString("vi-VN")} đ`
                      : "Miễn phí"}
                  </span>
                </div>
                {(specialization.discountPercent ?? 0) > 0 &&
                  (specialization.totalIndividualPrice ?? 0) >
                    (specialization.bundlePrice ?? 0) && (
                    <div className="flex justify-between text-xs font-bold text-destructive">
                      <span>{`Ưu đãi combo (-${specialization.discountPercent}%):`}</span>
                      <span>
                        {`-${((specialization.totalIndividualPrice ?? 0) - (specialization.bundlePrice ?? 0)).toLocaleString("vi-VN")} đ`}
                      </span>
                    </div>
                  )}
                <div className="h-px bg-border my-1" />
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-foreground">
                    {"Tổng thanh toán trọn gói:"}
                  </span>
                  <span className="text-2xl font-black text-primary">
                    {(specialization.bundlePrice ?? 0) > 0
                      ? `${specialization.bundlePrice.toLocaleString("vi-VN")} đ`
                      : "Miễn phí"}
                  </span>
                </div>
              </div>
            </div>

            <Dialog.Footer className="pt-2 border-t border-border flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground italic">
                {"* Cổng thanh toán trọn gói combo chuyên ngành đang được cập nhật."}
              </span>
              <Button
                type="button"
                variant="filled"
                onClick={() => setIsSpecializationModalOpen(false)}
                className="rounded-full text-xs font-semibold"
              >
                {"Đóng"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </>
  );
}
