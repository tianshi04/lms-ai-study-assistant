"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCourseDetailQuery, useCourseReviewsQuery } from "@/lib/query_hooks";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, ItemType } from "@/gen/catalog/v1/catalog_pb";
import { CertificateService } from "@/gen/certificate/v1/certificate_pb";
import { Modal } from "@/components/ui/Modal";
import { RatingStars } from "@/components/ui/RatingStars";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n/TranslationProvider";

const emptySubscribe = () => () => {};

interface CourseDetailClientProps {
  courseId: string;
}

export function CourseDetailClient({ courseId }: CourseDetailClientProps) {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();

  const { data: course, isLoading: loadingCourse, error: courseErr } = useCourseDetailQuery(courseId);
  const { data: reviews = [], isLoading: loadingReviews } = useCourseReviewsQuery(courseId);

  const [hasCert, setHasCert] = useState(false);
  const [certId, setCertId] = useState("");

  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const userRole = isMounted && typeof window !== "undefined" ? localStorage.getItem("user_role") : null;
  const isInstructorOrAdmin = userRole === "2" || userRole === "4" || userRole === "5";

  // Review Modal States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const toast = useToast();

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

      toast.success(t("courseDetail.reviewSuccessTitle"), {
        description: t("courseDetail.reviewSuccessDesc"),
      });
      setIsReviewModalOpen(false);
    } catch (err: unknown) {
      console.error("Failed to submit review:", err);
      const msg = err instanceof Error ? err.message : t("courseDetail.submitting");
      toast.error(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (!courseId) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;

    const certClient = getRpcClient(CertificateService);
    certClient
      .getVerifiedCertificate({ courseId })
      .then((res) => {
        if (res.certificate?.certificateId) {
          setHasCert(true);
          setCertId(res.certificate.certificateId);
        }
      })
      .catch(() => {});
  }, [courseId]);

  const loading = loadingCourse && !course;
  const error = courseErr ? courseErr.message : null;

  if (loading) {
    return (
      <div className="w-full">
        {/* Hero Banner Skeleton */}
        <div className="bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800/80 py-12 animate-pulse">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-2">
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
              <div className="h-10 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="h-20 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="flex gap-6 pt-4">
                <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
            </div>
            {/* Enrollment Card Skeleton */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
              <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            </div>
          </div>
        </div>
        {/* Content Skeleton */}
        <main className="max-w-7xl mx-auto px-6 py-12 space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-36 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6" />
          <div className="h-36 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6" />
        </main>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl max-w-md shadow-sm">
          <h2 className="text-xl font-bold text-red-500 dark:text-red-400 mb-2">{t("catalog.errorLoad")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error || `Course "${courseId}" not found.`}</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            ← {t("player.backToCatalog")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800/80 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
                {t("courseDetail.specializationCourse")}
              </div>
              {isInstructorOrAdmin && (
                <Link
                  href={`/instructor/courses/${course.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>{t("courseDetail.instructorBuilder")}</span>
                </Link>
              )}
              {hasCert && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t("courseDetail.certReceived")}</span>
                </div>
              )}
              {course.averageRating > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  <svg className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.486-.413.87-.837.614L12 17.653l-4.708 2.89c-.424.256-.953-.128-.837-.614l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  <span>{course.averageRating.toFixed(1)} ★ ({course.reviewCount} {t("courseDetail.reviewsCount")})</span>
                </div>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
              {course.title}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-6">
              {course.description}
            </p>
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
              <div>
                <span className="block text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold">{t("courseDetail.partnerPublisher")}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{course.partnerName}</span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="block text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold">{t("courseDetail.instructorLabel")}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{course.instructorNames.join(", ")}</span>
              </div>
            </div>
          </div>

          {/* Enrollment Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-md">
                {t("courseDetail.enrollmentOpen")}
              </span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-3">{t("courseDetail.freeEnrollment")}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("courseDetail.freeEnrollmentDesc")}</p>
            </div>

            {hasCert ? (
              <div className="space-y-3">
                <Link
                  href={`/verify/${certId}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t("courseDetail.viewCert")}</span>
                </Link>
                <Link
                  href={`/learn/${course.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all cursor-pointer"
                >
                  <span>{t("courseDetail.retakeCourse")}</span>
                </Link>
              </div>
            ) : (
              <Link
                href={`/learn/${course.id}`}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                {t("courseDetail.enrollNow")}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            )}

            <ul className="space-y-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t("courseDetail.flexibleDeadlines")}
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t("courseDetail.verifiedCertIncluded")}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Course Syllabus Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6">{t("courseDetail.syllabusTitle")}</h2>

        {course.weekModules.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-8 rounded-2xl text-center text-slate-500 dark:text-slate-400">
            {t("courseDetail.updatingLectures")}
          </div>
        ) : (
          <div className="space-y-6">
            {course.weekModules.map((week) => (
              <div key={week.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">
                    {t("courseDetail.weekLabel")} {week.weekNumber}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {week.lessons.reduce((sum, l) => sum + l.items.length, 0)} {t("courseDetail.itemsCount")}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{week.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{week.summary}</p>

                <div className="space-y-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                  {week.lessons.map((lesson) => (
                    <div key={lesson.id} className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4">
                      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {lesson.title}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                        {lesson.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              {item.type === ItemType.VIDEO ? (
                                <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                </svg>
                              ) : item.type === ItemType.READING ? (
                                <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : item.type === ItemType.AUTO_GRADED_LAB ? (
                                <svg className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                              ) : item.type === ItemType.PEER_REVIEW ? (
                                <svg className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              )}
                            </span>
                            <span className="text-slate-800 dark:text-slate-300 font-medium truncate">{item.title}</span>
                            <span className="text-slate-400 dark:text-slate-500 ml-auto">({item.estimatedMinutes}m)</span>
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
        <div className="mt-16 border-t border-slate-200 dark:border-slate-800 pt-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t("courseDetail.reviewsTitle")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t("courseDetail.reviewsSubtitle")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {course.averageRating > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-2.5 rounded-xl text-amber-800 dark:text-amber-300">
                  <span className="text-3xl font-black text-amber-500">{course.averageRating.toFixed(1)}</span>
                  <div>
                    <RatingStars rating={course.averageRating} size="md" />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {course.reviewCount} {t("courseDetail.reviewsCount")}
                    </span>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
                  if (!token) {
                    window.location.href = `/auth/login?redirect=/courses/${courseId}`;
                    return;
                  }
                  setIsReviewModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <span>{t("courseDetail.writeReview")}</span>
              </button>
            </div>
          </div>

          {loadingReviews ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              {[1, 2].map((n) => (
                <div key={n} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl h-28" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center text-slate-500 dark:text-slate-400">
              {t("courseDetail.noReviewsYet")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                        {rev.userName ? rev.userName.slice(0, 2) : "HV"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {rev.userName || t("courseDetail.studentFallback")}
                          </h4>
                          {rev.isVerifiedCompleter ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              ✓ Verified Completer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Active Learner Review
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US") : t("courseDetail.recent")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <span>{rev.ratingStars}</span>
                      <svg className="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.486-.413.87-.837.614L12 17.653l-4.708 2.89c-.424.256-.953-.128-.837-.614l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </div>
                  </div>
                  {rev.commentText && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
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
        title={t("courseDetail.submitReviewModalTitle")}
        className="max-w-md"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t("courseDetail.selectRatingStars")}
            </label>
            <div className="flex items-center gap-1.5 justify-center py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                >
                  <svg
                    className={`w-7 h-7 ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300 dark:text-slate-700 fill-none"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("courseDetail.commentLabel")}
              </label>
              <span className={`text-[10px] ${comment.length > 2000 ? "text-red-500 font-bold" : "text-slate-400"}`}>
                {comment.length}/2000
              </span>
            </div>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              placeholder={t("courseDetail.commentPlaceholder")}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {t("courseDetail.cancel")}
            </button>
            <button
              type="submit"
              disabled={submittingReview}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              {submittingReview ? t("courseDetail.submitting") : t("courseDetail.submitReview")}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
