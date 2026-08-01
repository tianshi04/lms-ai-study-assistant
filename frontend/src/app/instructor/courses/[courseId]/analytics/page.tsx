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
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/instructor/courses" className="hover:text-primary">
              Giảng viên
            </Link>
            <span>/</span>
            <Link href={`/instructor/courses/${courseId}`} className="hover:text-primary">
              Chi tiết khóa học
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Thống kê lớp học</span>
          </div>

          <Link
            href={`/instructor/courses/${courseId}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            Quay lại Biên soạn
          </Link>
        </div>

        {/* Page Header */}
        <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-extrabold uppercase mb-2">
              Instructor Analytics & Student Roster
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground text-balance">
              Thống kê & Danh sách Học viên
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Theo dõi tình hình ghi danh, tiến độ học tập và mức độ hài lòng của sinh viên theo
              thời gian thực.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">
            <div className="w-8 h-8 border-4 border-success border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span aria-live="polite">Đang tổng hợp dữ liệu học tập…</span>
          </div>
        ) : !analytics ? (
          <div className="py-12 text-center bg-card rounded-3xl border border-border text-muted-foreground">
            Không tìm thấy dữ liệu thống kê cho khóa học này.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stat Cards Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tổng Học Viên
                </span>
                <div className="text-3xl font-black text-primary">
                  {analytics.totalEnrolledStudents}
                </div>
                <p className="text-xs text-muted-foreground">Học viên đã ghi danh</p>
              </div>

              <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tỷ Lệ Hoàn Thành
                </span>
                <div className="text-3xl font-black text-success">
                  {analytics.averageCompletionRate}%
                </div>
                <p className="text-xs text-muted-foreground">Tiến độ hoàn thành trung bình</p>
              </div>

              <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Đánh Giá Trung Bình
                </span>
                <div className="text-3xl font-black text-warning flex items-center gap-1">
                  <span>{analytics.averageRating.toFixed(1)}</span>
                  <span className="text-lg">★</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dựa trên {analytics.reviewCount} nhận xét
                </p>
              </div>

              <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trạng Thái Khóa Học
                </span>
                <div className="text-xl font-bold text-primary pt-1">Đang hoạt động</div>
                <p className="text-xs text-muted-foreground">Mở ghi danh công khai</p>
              </div>
            </div>

            {/* Enrolled Students Table */}
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-success"
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
                <div className="py-10 text-center text-muted-foreground text-sm">
                  Chưa có dữ liệu học viên tham gia khóa học này.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-4">Tên / Email</th>
                        <th className="py-3 px-4">Mã Học Viên</th>
                        <th className="py-3 px-4 text-center">Tiến Độ Học Tập</th>
                        <th className="py-3 px-4 text-right">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {analytics.students.map((student) => (
                        <tr key={student.userId} className="hover:bg-muted/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            <div>{student.userName}</div>
                            <div className="text-xs font-mono font-normal text-muted-foreground">
                              {student.userEmail || "Learner"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                            {student.userId}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-32 bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-success h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, student.progressPercent)}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-foreground font-mono">
                                {student.progressPercent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {student.progressPercent >= 100 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-success/10 text-success">
                                HOÀN THÀNH
                              </span>
                            ) : student.progressPercent > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-primary/10 text-primary">
                                ĐANG HỌC
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-muted text-muted-foreground">
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
