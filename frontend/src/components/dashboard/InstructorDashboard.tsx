"use client";

import Link from "next/link";
import { useCoursesQuery } from "@/lib/query_hooks";
import { CourseStatus, type Course } from "@/gen/catalog/v1/catalog_pb";

export function InstructorDashboard({ userName }: { userName: string }) {
  const { data: courses = [], isLoading: loading } = useCoursesQuery();

  const publishedCourses = courses.filter((c: Course) => c.status === CourseStatus.PUBLISHED);
  const draftCourses = courses.filter((c: Course) => c.status === CourseStatus.DRAFT);
  const pendingReviewCourses = courses.filter(
    (c: Course) => c.status === CourseStatus.PENDING_REVIEW,
  );

  const totalStudents = courses.length * 15; // Estimated student count across courses

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  return (
    <div className="w-full flex-1 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-900/10 dark:to-transparent pointer-events-none" />

      <main className="relative max-w-7xl mx-auto px-6 py-12 space-y-10">
        {/* Header Banner */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              Bảng Điều Khiển Giảng Viên
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {getGreeting()},{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-white bg-clip-text text-transparent">
                Thầy/Cô {userName}
              </span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Quản lý danh sách khóa học giảng dạy, theo dõi lượng học viên đăng ký, kiểm duyệt bài
              tập và cập nhật nội dung bài giảng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/instructor/courses/new"
              className="px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tạo Khóa Học Mới
            </Link>
          </div>
        </header>

        {/* Dynamic KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tổng Học Viên
              </p>
              <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                {totalStudents}
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
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Đã Xuất Bản
              </p>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {publishedCourses.length}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chờ Kiểm Duyệt
              </p>
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {pendingReviewCourses.length}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Bản Nháp (Draft)
              </p>
              <p className="text-3xl font-black text-slate-700 dark:text-slate-300 font-mono">
                {draftCourses.length}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Management Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/instructor/courses"
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm transition-all group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                Danh sách Khóa học Giảng dạy
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Xem và chỉnh sửa chương trình học, bài giảng video, câu hỏi trắc nghiệm và đề thi.
              </p>
            </div>
          </Link>

          <Link
            href="/instructor/profile"
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm transition-all group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
                Hồ sơ & Chữ ký Giảng viên
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cập nhật chức danh, học vị và chữ ký số ký duyệt trên chứng chỉ học viên.
              </p>
            </div>
          </Link>

          <Link
            href="/instructor/financial-aid"
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm transition-all group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                Duyệt Hỗ Trợ Tài Chính
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Xét duyệt các đơn xin miễn giảm học phí từ những học viên có hoàn cảnh đặc biệt.
              </p>
            </div>
          </Link>
        </div>

        {/* Teaching Courses Overview List */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Khóa Học Đang Quản Lý
              </h2>
              <p className="text-xs text-slate-500">
                Danh sách tất cả các khóa học bạn phụ trách chuyên môn.
              </p>
            </div>
            <Link
              href="/instructor/courses"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
              Đang tải danh sách khóa học...
            </div>
          ) : courses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <p className="text-sm font-semibold">Bạn chưa khởi tạo khóa học nào trên hệ thống.</p>
              <Link
                href="/instructor/courses/new"
                className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Khởi tạo khóa học đầu tiên
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.slice(0, 6).map((c: Course) => (
                <Link
                  key={c.id}
                  href={`/instructor/courses/${c.id}`}
                  className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {c.subject || "COURSE"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === CourseStatus.PUBLISHED
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : c.status === CourseStatus.PENDING_REVIEW
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {CourseStatus[c.status] || "DRAFT"}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                      {c.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <span>{c.level || "Tất cả cấp độ"}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                      Chỉnh sửa →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
