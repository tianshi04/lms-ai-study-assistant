"use client";

import { useEffect, useState, useSyncExternalStore, ViewTransition } from "react";
import Link from "next/link";
import { DirectionalTransition } from "@/components/transitions/DirectionalTransition";

import { getRpcClient } from "@/lib/connect_client";
import { LearningService, type EnrolledCourseSummary } from "@/gen/learning/v1/learning_pb";
import { useAuth } from "@/components/providers/AuthProvider";

type Tab = "ALL" | "IN_PROGRESS" | "COMPLETED";

const emptySubscribe = () => () => {};

export default function MyCoursesPage() {
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<EnrolledCourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("ALL");

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      window.location.href = "/auth/login?redirect=/my-courses";
      return;
    }

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
          console.error("Failed to fetch my courses:", err);
          setError(err instanceof Error ? err.message : "Lỗi khi tải danh sách khóa học");
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

  const filteredCourses = courses.filter((c) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "IN_PROGRESS")
      return c.status === "IN_PROGRESS" || c.status === "NOT_STARTED";
    if (activeTab === "COMPLETED") return c.status === "COMPLETED";
    return true;
  });

  return (
    <DirectionalTransition>
      <main className="w-full max-w-7xl mx-auto px-6 py-12 flex-1">
        <div className="w-full mb-10 text-center md:text-left max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 text-balance">
            {"Khóa học của tôi"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
            {
              "Theo dõi tiến độ học tập, tiếp tục các khóa đang học, và xem lại chứng chỉ đã hoàn thành."
            }
          </p>
        </div>

        {/* Tabs */}
        <div className="w-full flex items-center gap-2 mb-8 border-b border-slate-200 dark:border-slate-800">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "IN_PROGRESS", label: "Đang học" },
            { id: "COMPLETED", label: "Hoàn thành" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs py-0.5 px-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {tab.id === "ALL"
                  ? courses.length
                  : tab.id === "IN_PROGRESS"
                    ? courses.filter(
                        (c) => c.status === "IN_PROGRESS" || c.status === "NOT_STARTED",
                      ).length
                    : courses.filter((c) => c.status === "COMPLETED").length}
              </span>
            </button>
          ))}
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse shadow-sm flex flex-col justify-between h-64"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/5" />
                  </div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-6" />
                </div>
                <div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
                  <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-6 rounded-2xl text-center">
            <p className="font-semibold">{error}</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <svg
              className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4"
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {"Chưa có khóa học nào"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {"Bạn chưa ghi danh vào khóa học nào. Hãy bắt đầu hành trình học tập ngay hôm nay!"}
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
            >
              {"Khám phá danh mục"}
            </Link>
          </div>
        ) : (
          <div
            style={{ contentVisibility: "auto", containIntrinsicSize: "1px 300px" }}
            className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredCourses.map((course) => (
              <div
                key={course.courseId}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full"
              >
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {course.partnerName}
                    </span>
                    {course.status === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        ✓ {"Hoàn thành"}
                      </span>
                    ) : course.status === "IN_PROGRESS" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                        {"Đang học"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {"Chưa bắt đầu"}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/courses/${course.courseId}`}
                    transitionTypes={["nav-forward"]}
                    className="block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                  >
                    <ViewTransition name={`course-title-${course.courseId}`} share="text-morph">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 mb-3">
                        {course.courseTitle}
                      </h3>
                    </ViewTransition>
                  </Link>

                  <div className="space-y-1.5 mb-2">
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                      <span>{"Tiến độ:"}</span>
                      <span>{course.progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          course.progressPercent === 100
                            ? "bg-emerald-500"
                            : course.progressPercent > 0
                              ? "bg-blue-600 dark:bg-blue-500"
                              : "bg-transparent"
                        }`}
                        style={{ width: `${Math.max(0, course.progressPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50">
                  <Link
                    href={`/learn/${course.courseId}`}
                    transitionTypes={["nav-forward"]}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all cursor-pointer"
                  >
                    {course.status === "COMPLETED"
                      ? "Đánh giá khóa học"
                      : course.status === "NOT_STARTED"
                        ? "Bắt đầu học"
                        : "Tiếp tục học"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </DirectionalTransition>
  );
}
