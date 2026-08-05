"use client";

import Link from "next/link";
import { useMyEnrolledCoursesQuery } from "@/lib/query_hooks";
import {
  ArrowRight,
  BookOpen,
  Layers,
  Award,
  ChevronRight,
  Zap,
  MessageSquare,
} from "lucide-react";

export function LearningDashboard({ userName }: { userName: string }) {
  const { data: courses = [], isLoading: loading, error: queryError } = useMyEnrolledCoursesQuery();
  const error = queryError ? queryError.message : null;

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
    <div className="w-full flex-1 bg-surface text-on-surface min-h-screen">
      <main className="relative max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Header Greeting */}
        <header className="animate-in fade-in duration-m3-medium-2 ease-m3-emphasized">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-2 text-balance">
            {getGreeting()}, <span className="text-primary">{userName}</span>!
          </h1>
          <p className="text-on-surface-variant text-lg">
            Sẵn sàng để tiếp tục hành trình học tập của bạn hôm nay chưa?
          </p>
        </header>

        {loading ? (
          <div aria-live="polite" className="space-y-8 animate-pulse">
            {/* Top Row Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-[340px] bg-surface-container-low rounded-3xl border border-outline-variant" />
              <div className="flex flex-col gap-4">
                <div className="h-[162px] bg-surface-container-low rounded-3xl border border-outline-variant" />
                <div className="h-[162px] bg-surface-container-low rounded-3xl border border-outline-variant" />
              </div>
            </div>
            {/* Bottom Row Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-4">
              <div className="lg:col-span-1 h-64 bg-surface-container-low rounded-3xl border border-outline-variant" />
              <div className="lg:col-span-3 h-64 bg-surface-container-low rounded-3xl border border-outline-variant" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-error-container text-on-error-container p-6 rounded-2xl border border-error/20 text-center">
            {error}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Row: Continue Learning & Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Continue Learning (MD3 Tonal Container Card) */}
              <div className="lg:col-span-2 relative rounded-3xl overflow-hidden group border border-outline-variant hover:border-outline bg-surface-container-low transition-all duration-m3-medium-2 ease-m3-emphasized">
                {/* Decorative background blob */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-m3-medium-2 ease-m3-emphasized" />

                {continueLearningCourse ? (
                  <div className="relative p-8 h-full flex flex-col justify-between z-10">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-bold uppercase tracking-wider mb-6 border border-primary/20 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Tiếp tục học
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface mb-2 line-clamp-2">
                        {continueLearningCourse.courseTitle}
                      </h2>
                      <p className="text-on-surface-variant font-medium text-sm md:text-base">
                        {continueLearningCourse.partnerName}
                      </p>
                    </div>

                    <div className="mt-8 space-y-5">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-bold text-on-surface">
                          <span className="text-on-surface-variant">Tiến độ hiện tại</span>
                          <span>{continueLearningCourse.progressPercent}%</span>
                        </div>
                        <div className="h-3 w-full bg-surface-variant rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-m3-medium-2 ease-m3-emphasized"
                            style={{
                              width: `${Math.max(0, continueLearningCourse.progressPercent)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <Link
                        href={`/learn/${continueLearningCourse.courseId}`}
                        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-full bg-primary text-on-primary font-bold hover:bg-primary-hover shadow-xs hover:shadow-md transition-all duration-m3-medium-2 ease-m3-emphasized"
                      >
                        Tiếp tục bài học
                        <ArrowRight
                          className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="relative p-8 h-full flex flex-col items-center justify-center text-center z-10">
                    <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-4">
                      <BookOpen className="w-8 h-8" aria-hidden="true" />
                    </div>
                    <h2 className="text-xl font-bold text-on-surface mb-2">
                      Bạn chưa bắt đầu khóa học nào
                    </h2>
                    <p className="text-on-surface-variant mb-6">
                      Khám phá hàng trăm khóa học chất lượng cao và bắt đầu học ngay hôm nay.
                    </p>
                    <Link
                      href="/courses"
                      className="px-8 py-3.5 rounded-full bg-primary text-on-primary font-bold hover:bg-primary-hover transition-colors shadow-xs"
                    >
                      Khám phá danh mục
                    </Link>
                  </div>
                )}
              </div>

              {/* Quick Stats Column */}
              <div className="flex flex-col gap-4">
                <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant flex items-center gap-5 hover:bg-surface-container hover:border-outline transition-all duration-m3-short-4 ease-m3-emphasized">
                  <div className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                    <Layers className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface-variant">
                      Khóa học đang theo
                    </p>
                    <p className="text-3xl font-black text-on-surface">{activeCourses.length}</p>
                  </div>
                </div>

                <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant flex items-center gap-5 hover:bg-surface-container hover:border-outline transition-all duration-m3-short-4 ease-m3-emphasized">
                  <div className="w-14 h-14 rounded-2xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center shrink-0">
                    <Award className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface-variant">
                      Chứng chỉ đạt được
                    </p>
                    <p className="text-3xl font-black text-on-surface">{completedCourses.length}</p>
                  </div>
                </div>

                <Link
                  href="/my-learning"
                  className="bg-surface-container-high p-4 rounded-full border border-outline-variant hover:bg-surface-container-highest hover:border-outline flex items-center justify-center gap-2 text-on-surface font-bold transition-all text-sm"
                >
                  Xem tất cả khóa học
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Bottom Row: AI Tutor & Active Courses */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-4">
              {/* AI Tutor Card (MD3 Expressive Container) */}
              <div className="lg:col-span-1 bg-gradient-to-br from-primary-container to-surface-container-high border border-outline-variant rounded-3xl p-6 text-on-primary-container relative overflow-hidden group shadow-xs">
                <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:opacity-35 transition-all duration-m3-medium-2 ease-m3-emphasized">
                  <Zap className="w-24 h-24 text-primary" aria-hidden="true" />
                </div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="w-12 h-12 bg-primary text-on-primary rounded-2xl flex items-center justify-center mb-4 shadow-xs">
                      <MessageSquare className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-bold text-on-primary-container mb-2">
                      Trợ lý AI Chatbot
                    </h3>
                    <p className="text-on-primary-container/80 text-sm mb-6 leading-relaxed">
                      Bạn có câu hỏi? Trợ lý AI luôn sẵn sàng giải đáp và hướng dẫn bạn 24/7.
                    </p>
                  </div>
                  <div className="px-5 py-3 bg-primary text-on-primary rounded-full text-sm font-bold text-center cursor-pointer hover:bg-primary-hover transition-colors shadow-xs">
                    Mở Chatbot (Góc dưới)
                  </div>
                </div>
              </div>

              {/* My Courses Mini List */}
              <div className="lg:col-span-3 bg-surface-container-low rounded-3xl border border-outline-variant p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-on-surface">Khóa học đang tham gia</h3>
                </div>

                {activeCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeCourses.slice(0, 4).map((course) => (
                      <Link
                        key={course.courseId}
                        href={`/learn/${course.courseId}`}
                        className="group flex gap-4 p-4 rounded-2xl border border-outline-variant bg-surface-container-lowest hover:border-primary/40 hover:bg-surface-container-high transition-all cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-xl bg-surface-variant flex items-center justify-center shrink-0 group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
                          <BookOpen
                            className="w-6 h-6 text-on-surface-variant group-hover:text-on-primary-container"
                            aria-hidden="true"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-on-surface truncate mb-1.5 group-hover:text-primary">
                            {course.courseTitle}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-surface-variant rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.max(0, course.progressPercent)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-on-surface-variant">
                              {course.progressPercent}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-on-surface-variant text-sm font-medium">
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
