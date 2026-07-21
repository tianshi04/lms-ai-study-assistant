"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params?.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;

    async function fetchDetail() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.getCourseDetail({ courseId });
        setCourse(res.course ?? null);
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải thông tin khóa học...</span>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Không tìm thấy khóa học</h2>
          <p className="text-sm text-slate-400 mb-6">{error || `Khóa học với mã "${courseId}" không tồn tại.`}</p>
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header / Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 relative z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/courses" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tất cả khóa học
          </Link>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
            {course.partnerName}
          </span>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 border-b border-slate-800/80 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
              Specialization Course
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4 leading-tight">
              {course.title}
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed mb-6">
              {course.description}
            </p>
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
              <div>
                <span className="block text-xs text-slate-500 uppercase font-semibold">Đối tác phát hành</span>
                <span className="font-semibold text-white">{course.partnerName}</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="block text-xs text-slate-500 uppercase font-semibold">Giảng viên</span>
                <span className="font-semibold text-white">{course.instructorNames.join(", ")}</span>
              </div>
            </div>
          </div>

          {/* Enrollment Card */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                Enrollment Open
              </span>
              <h3 className="text-2xl font-bold text-white mt-3">Miễn Phí Tham Gia</h3>
              <p className="text-xs text-slate-400 mt-1">Đã bao gồm bài giảng Video tương tác & Phụ đề cuộn</p>
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

            <ul className="space-y-3 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Hạn nộp linh hoạt (Flexible Deadlines)
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tích hợp Coursera AI Coach giải đáp
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <h2 className="text-2xl font-extrabold text-white mb-6">Nội Dung Chương Trình Học (Syllabus)</h2>

        {course.weekModules.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/80 p-8 rounded-2xl text-center text-slate-400">
            Khóa học đang trong quá trình cập nhật các bài giảng tuần tiếp theo.
          </div>
        ) : (
          <div className="space-y-6">
            {course.weekModules.map((week) => (
              <div key={week.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                    Tuần {week.weekNumber}
                  </span>
                  <span className="text-xs text-slate-400">
                    {week.lessons.reduce((sum, l) => sum + l.items.length, 0)} Items bài học
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{week.title}</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">{week.summary}</p>

                <div className="space-y-3 border-t border-slate-800/80 pt-4">
                  {week.lessons.map((lesson) => (
                    <div key={lesson.id} className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4">
                      <h4 className="font-semibold text-sm text-slate-200 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {lesson.title}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                        {lesson.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1 text-slate-300">
                              {item.type === 1 ? (
                                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                </svg>
                              ) : item.type === 2 ? (
                                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              )}
                            </span>
                            <span className="text-slate-300 font-medium truncate">{item.title}</span>
                            <span className="text-slate-500 ml-auto">({item.estimatedMinutes}m)</span>
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
      </main>
    </div>
  );
}
