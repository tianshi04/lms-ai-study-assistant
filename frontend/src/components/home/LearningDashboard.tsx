"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { LearningService, type EnrolledCourseSummary } from "@/gen/learning/v1/learning_pb";

const emptySubscribe = () => () => {};

export function LearningDashboard({ userName }: { userName: string }) {
  const [courses, setCourses] = useState<EnrolledCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isMounted) return;

    let isCancelled = false;
    async function fetchMyCourses() {
      try {
        const client = getRpcClient(LearningService);
        const res = await client.listMyEnrolledCourses({});
        if (!isCancelled) {
          setCourses(res.courses || []);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("Failed to fetch courses for dashboard:", err);
          setError(err instanceof Error ? err.message : "Lỗi khi tải dữ liệu");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }
    fetchMyCourses();
    return () => {
      isCancelled = true;
    };
  }, [isMounted]);

  // Derive stats
  const activeCourses = courses.filter(
    (c) => c.status === "IN_PROGRESS" || c.status === "NOT_STARTED",
  );
  const completedCourses = courses.filter((c) => c.status === "COMPLETED");
  const inProgressCourses = activeCourses.filter((c) => c.status === "IN_PROGRESS");

  // Find the most recent active course (just picking the first one in progress, or first active)
  const continueLearningCourse =
    inProgressCourses.length > 0
      ? inProgressCourses[0]
      : activeCourses.length > 0
        ? activeCourses[0]
        : null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  return (
    <div className="w-full flex-1 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Header Greeting */}
        <header className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            {getGreeting()},{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              {userName}
            </span>
            !
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Sẵn sàng để tiếp tục hành trình học tập của bạn hôm nay chưa?
          </p>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <div className="col-span-1 md:col-span-2 h-64 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800" />
            <div className="h-64 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl border border-red-200 dark:border-red-900/50 text-center">
            {error}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Row: Continue Learning & Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Continue Learning (Premium Glassmorphism Card) */}
              <div className="lg:col-span-2 relative rounded-3xl overflow-hidden group border border-slate-200/60 dark:border-slate-700/50 shadow-xl shadow-blue-900/5 dark:shadow-none bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                {/* Decorative background blob */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-all duration-700" />

                {continueLearningCourse ? (
                  <div className="relative p-8 h-full flex flex-col justify-between z-10 backdrop-blur-xl bg-white/40 dark:bg-slate-900/40">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-6 border border-blue-200 dark:border-blue-500/30 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Tiếp tục học
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                        {continueLearningCourse.courseTitle}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">
                        {continueLearningCourse.partnerName}
                      </p>
                    </div>

                    <div className="mt-8 space-y-5">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
                          <span>Tiến độ hiện tại</span>
                          <span>{continueLearningCourse.progressPercent}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-200/80 dark:bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${Math.max(0, continueLearningCourse.progressPercent)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <Link
                        href={`/learn/${continueLearningCourse.courseId}`}
                        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:scale-105 hover:shadow-lg transition-all duration-300"
                      >
                        Tiếp tục bài học
                        <svg
                          className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
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
                  <div className="relative p-8 h-full flex flex-col items-center justify-center text-center z-10 backdrop-blur-xl bg-white/40 dark:bg-slate-900/40">
                    <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4">
                      <svg
                        className="w-8 h-8 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      Bạn chưa bắt đầu khóa học nào
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                      Khám phá hàng trăm khóa học chất lượng cao và bắt đầu học ngay hôm nay.
                    </p>
                    <Link
                      href="/courses"
                      className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-colors"
                    >
                      Khám phá danh mục
                    </Link>
                  </div>
                )}
              </div>

              {/* Quick Stats Column */}
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Khóa học đang theo
                    </p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                      {activeCourses.length}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Chứng chỉ đạt được
                    </p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                      {completedCourses.length}
                    </p>
                  </div>
                </div>

                <Link
                  href="/my-courses"
                  className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-3xl border border-transparent hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 font-semibold transition-all hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  Xem tất cả khóa học
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Bottom Row: AI Tutor & Active Courses */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              {/* AI Tutor Card (Call to Action) */}
              <div className="lg:col-span-1 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-indigo-900/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 group-hover:opacity-40 transition-all duration-500">
                  <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-4">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Trợ lý AI Chatbot</h3>
                    <p className="text-indigo-100 text-sm mb-6">
                      Bạn có câu hỏi? Trợ lý AI luôn sẵn sàng giải đáp và hướng dẫn bạn 24/7.
                    </p>
                  </div>
                  {/* The AI Chatbot is usually triggered by a global button, so we can just advise the user or trigger an event */}
                  <div className="px-4 py-2.5 bg-white text-indigo-700 rounded-lg text-sm font-bold text-center cursor-pointer hover:bg-indigo-50 transition-colors shadow-sm">
                    Mở Chatbot (Góc dưới)
                  </div>
                </div>
              </div>

              {/* My Courses Mini List */}
              <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Khóa học đang tham gia
                  </h3>
                </div>

                {activeCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeCourses.slice(0, 4).map((course) => (
                      <Link
                        key={course.courseId}
                        href={`/learn/${course.courseId}`}
                        className="group flex gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                          <svg
                            className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {course.courseTitle}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${Math.max(0, course.progressPercent)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500">
                              {course.progressPercent}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                    Bạn chưa có khóa học nào đang học dở.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
