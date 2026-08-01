"use client";

import Link from "next/link";
import { useMyEnrolledCoursesQuery } from "@/lib/query_hooks";

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
    <div className="w-full flex-1 bg-background min-h-screen">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Header Greeting */}
        <header className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-2 text-balance">
            {getGreeting()}, <span className="text-primary">{userName}</span>!
          </h1>
          <p className="text-muted-foreground text-lg">
            Sẵn sàng để tiếp tục hành trình học tập của bạn hôm nay chưa?
          </p>
        </header>

        {loading ? (
          <div aria-live="polite" className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <div className="col-span-1 md:col-span-2 h-64 bg-card rounded-3xl border border-border" />
            <div className="h-64 bg-card rounded-3xl border border-border" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-6 rounded-2xl border border-destructive/20 text-center">
            {error}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Row: Continue Learning & Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Continue Learning (Premium Glassmorphism Card) */}
              <div className="lg:col-span-2 relative rounded-3xl overflow-hidden group border border-border shadow-xl bg-card animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                {/* Decorative background blob */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />

                {continueLearningCourse ? (
                  <div className="relative p-8 h-full flex flex-col justify-between z-10 backdrop-blur-xl bg-card/40">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6 border border-primary/20 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Tiếp tục học
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 line-clamp-2">
                        {continueLearningCourse.courseTitle}
                      </h2>
                      <p className="text-muted-foreground font-medium">
                        {continueLearningCourse.partnerName}
                      </p>
                    </div>

                    <div className="mt-8 space-y-5">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-semibold text-foreground">
                          <span>Tiến độ hiện tại</span>
                          <span>{continueLearningCourse.progressPercent}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${Math.max(0, continueLearningCourse.progressPercent)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <Link
                        href={`/learn/${continueLearningCourse.courseId}`}
                        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary-hover hover:shadow-lg transition-all duration-300"
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
                  <div className="relative p-8 h-full flex flex-col items-center justify-center text-center z-10 backdrop-blur-xl bg-card/40">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <svg
                        className="w-8 h-8 text-primary"
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
                    <h2 className="text-xl font-bold text-foreground mb-2">
                      Bạn chưa bắt đầu khóa học nào
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      Khám phá hàng trăm khóa học chất lượng cao và bắt đầu học ngay hôm nay.
                    </p>
                    <Link
                      href="/courses"
                      className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-hover transition-colors"
                    >
                      Khám phá danh mục
                    </Link>
                  </div>
                )}
              </div>

              {/* Quick Stats Column */}
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
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
                    <p className="text-sm font-medium text-muted-foreground">Khóa học đang theo</p>
                    <p className="text-3xl font-black text-foreground">{activeCourses.length}</p>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
                  <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center text-success shrink-0">
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
                    <p className="text-sm font-medium text-muted-foreground">Chứng chỉ đạt được</p>
                    <p className="text-3xl font-black text-foreground">{completedCourses.length}</p>
                  </div>
                </div>

                <Link
                  href="/my-courses"
                  className="bg-muted p-4 rounded-3xl border border-border hover:border-primary/50 flex items-center justify-center gap-2 text-foreground font-semibold transition-all"
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
              <div className="lg:col-span-1 bg-gradient-to-br from-primary to-primary-hover rounded-3xl p-6 text-primary-foreground shadow-lg relative overflow-hidden group">
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
                    <div className="w-12 h-12 bg-primary-foreground/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-4">
                      <svg
                        className="w-6 h-6 text-primary-foreground"
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
                    <p className="text-primary-foreground/80 text-sm mb-6">
                      Bạn có câu hỏi? Trợ lý AI luôn sẵn sàng giải đáp và hướng dẫn bạn 24/7.
                    </p>
                  </div>
                  {/* The AI Chatbot is usually triggered by a global button */}
                  <div className="px-4 py-2.5 bg-primary-foreground text-primary rounded-lg text-sm font-bold text-center cursor-pointer hover:opacity-90 transition-colors shadow-sm">
                    Mở Chatbot (Góc dưới)
                  </div>
                </div>
              </div>

              {/* My Courses Mini List */}
              <div className="lg:col-span-3 bg-card rounded-3xl border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-foreground">Khóa học đang tham gia</h3>
                </div>

                {activeCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeCourses.slice(0, 4).map((course) => (
                      <Link
                        key={course.courseId}
                        href={`/learn/${course.courseId}`}
                        className="group flex gap-4 p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          <svg
                            className="w-6 h-6 text-muted-foreground group-hover:text-primary"
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
                          <h4 className="text-sm font-bold text-foreground truncate mb-1 group-hover:text-primary">
                            {course.courseTitle}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.max(0, course.progressPercent)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {course.progressPercent}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">
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
