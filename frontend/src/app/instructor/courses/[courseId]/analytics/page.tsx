"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type InstructorAnalytics } from "@/gen/catalog/v1/catalog_pb";

export default function InstructorAnalyticsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;

  const [analytics, setAnalytics] = useState<InstructorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.getInstructorAnalytics({ courseId });
        if (res.analytics) {
          setAnalytics(res.analytics);
        }
      } catch (err: unknown) {
        console.error("Failed to load instructor analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [courseId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link
              href="/instructor/courses"
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Giảng viên
            </Link>
            <span>/</span>
            <Link
              href={`/instructor/courses/${courseId}`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Chi tiết khóa học
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Thống kê lớp học
            </span>
          </div>

          <Link
            href={`/instructor/courses/${courseId}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
          >
            Quay lại Biên soạn
          </Link>
        </div>

        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold uppercase mb-2">
              Instructor Analytics & Student Roster
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white text-balance">
              Thống kê & Danh sách Học viên
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Theo dõi tình hình ghi danh, tiến độ học tập và mức độ hài lòng của sinh viên theo
              thời gian thực.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span aria-live="polite">Đang tổng hợp dữ liệu học tập…</span>
          </div>
        ) : !analytics ? (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500">
            Không tìm thấy dữ liệu thống kê cho khóa học này.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stat Cards Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tổng Học Viên
                </span>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {analytics.totalEnrolledStudents}
                </div>
                <p className="text-xs text-slate-500">Học viên đã ghi danh</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tỷ Lệ Hoàn Thành
                </span>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {analytics.averageCompletionRate}%
                </div>
                <p className="text-xs text-slate-500">Tiến độ hoàn thành trung bình</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Đánh Giá Trung Bình
                </span>
                <div className="text-3xl font-black text-amber-500 flex items-center gap-1">
                  <span>{analytics.averageRating.toFixed(1)}</span>
                  <span className="text-lg">★</span>
                </div>
                <p className="text-xs text-slate-500">Dựa trên {analytics.reviewCount} nhận xét</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Trạng Thái Khóa Học
                </span>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 pt-1">
                  Đang hoạt động
                </div>
                <p className="text-xs text-slate-500">Mở ghi danh công khai</p>
              </div>
            </div>

            {/* Enrolled Students Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Danh sách Học viên Lớp học ({analytics.students.length})
                </h2>
              </div>

              {analytics.students.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">
                  Chưa có dữ liệu học viên tham gia khóa học này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-4">Tên / Email</th>
                        <th className="py-3 px-4">Mã Học Viên</th>
                        <th className="py-3 px-4 text-center">Tiến Độ Học Tập</th>
                        <th className="py-3 px-4 text-right">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {analytics.students.map((student) => (
                        <tr
                          key={student.userId}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            <div>{student.userName}</div>
                            <div className="text-xs font-mono font-normal text-slate-400">
                              {student.userEmail || "Learner"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                            {student.userId}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-32 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, student.progressPercent)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                                {student.progressPercent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {student.progressPercent >= 100 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                HOÀN THÀNH
                              </span>
                            ) : student.progressPercent > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                ĐANG HỌC
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500">
                                MỚI GHI DANH
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
