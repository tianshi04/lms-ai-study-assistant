"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course, type CourseReview } from "@/gen/catalog/v1/catalog_pb";
import { Navbar } from "@/components/layout/Navbar";

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params?.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;

    async function fetchDetail() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.getCourseDetail({ idOrSlug: courseId });
        setCourse(res.course ?? null);

        const revRes = await client.listCourseReviews({ courseId });
        setReviews(revRes.reviews || []);
      } catch (err: unknown) {
        console.error("Failed to load course detail:", err);
        const message = err instanceof Error ? err.message : "Không thể tải thông tin khóa học";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [courseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải thông tin khóa học...</span>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-900 dark:text-slate-100">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl max-w-md shadow-sm">
          <h2 className="text-xl font-bold text-red-500 dark:text-red-400 mb-2">Không tìm thấy khóa học</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error || `Khóa học với mã "${courseId}" không tồn tại.`}</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            ← Quay lại Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800/80 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
                Specialization Course
              </div>
              {course.averageRating > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  <svg className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.486-.413.87-.837.614L12 17.653l-4.708 2.89c-.424.256-.953-.128-.837-.614l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  <span>{course.averageRating.toFixed(1)} ★ ({course.reviewCount} đánh giá)</span>
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
                <span className="block text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold">Đối tác phát hành</span>
                <span className="font-semibold text-slate-900 dark:text-white">{course.partnerName}</span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <div>
                <span className="block text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold">Giảng viên</span>
                <span className="font-semibold text-slate-900 dark:text-white">{course.instructorNames.join(", ")}</span>
              </div>
            </div>
          </div>

          {/* Enrollment Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-md">
                Enrollment Open
              </span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-3">Miễn Phí Tham Gia</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Đã bao gồm bài giảng Video tương tác & Phụ đề cuộn</p>
            </div>

            <Link
              href={`/learn/${course.id}`}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/20"
            >
              Vào Học Ngay
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <ul className="space-y-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Hạn nộp linh hoạt (Flexible Deadlines)
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tích hợp Coursera AI Coach giải đáp
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Chứng chỉ Xác thực Đã đăng ký
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Course Syllabus Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6">Nội Dung Chương Trình Học (Syllabus)</h2>

        {course.weekModules.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-8 rounded-2xl text-center text-slate-500 dark:text-slate-400">
            Khóa học đang trong quá trình cập nhật các bài giảng tuần tiếp theo.
          </div>
        ) : (
          <div className="space-y-6">
            {course.weekModules.map((week) => (
              <div key={week.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">
                    Tuần {week.weekNumber}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {week.lessons.reduce((sum, l) => sum + l.items.length, 0)} Items bài học
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
                              {item.type === 1 ? (
                                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                </svg>
                              ) : item.type === 2 ? (
                                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Đánh giá & Nhận xét từ Học viên</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Các nhận xét thực tế từ học viên đã tham gia khóa học này
              </p>
            </div>
            {course.averageRating > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-2.5 rounded-xl text-amber-800 dark:text-amber-300">
                <span className="text-3xl font-black text-amber-500">{course.averageRating.toFixed(1)}</span>
                <div>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(course.averageRating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-300 dark:text-slate-700"
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
                    ))}
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Tổng số {course.reviewCount} nhận xét
                  </span>
                </div>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center text-slate-500 dark:text-slate-400">
              Chưa có đánh giá nào cho khóa học này. Hãy là học viên đầu tiên hoàn thành và để lại nhận xét!
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
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          {rev.userName || "Học viên LMS"}
                        </h4>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString("vi-VN") : "Gần đây"}
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
    </div>
  );
}
