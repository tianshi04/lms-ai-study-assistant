"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchCourses() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.listCourses({});
        setCourses(res.courses);
      } catch (err: unknown) {
        console.error("Failed to load catalog:", err);
        const message = err instanceof Error ? err.message : "Không thể tải danh sách khóa học";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Banner / Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 relative z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              C
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Coursera AI LMS
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/courses"
              className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Catalog
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Sprint 1 MVP
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10 text-center md:text-left max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
            Coursera-Style Specializations & Courses
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Khám phá Khóa học & Lộ trình Học tập
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Học tập với bài giảng video tương tác, phụ đề cuộn thông minh, bài tập thực hành nâng cao và trợ lý AI Coach giải đáp 24/7.
          </p>

          {/* Search Bar */}
          <div className="mt-8 relative max-w-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm khóa học theo tên hoặc từ khóa..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3.5 pl-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
            />
            <svg
              className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 animate-pulse"
              >
                <div className="h-6 bg-slate-800 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-800 rounded w-1/2 mb-6" />
                <div className="h-16 bg-slate-800/60 rounded mb-6" />
                <div className="h-10 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
            <p className="font-semibold">{error}</p>
            <p className="text-xs text-red-400/80 mt-2">Vui lòng đảm bảo backend server (port 8000) đang chạy.</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            Không tìm thấy khóa học nào phù hợp với từ khóa &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="group relative bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between"
              >
                <div>
                  {/* Partner Header */}
                  <div className="flex items-center gap-3 mb-4">
                    {course.partnerLogoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={course.partnerLogoUrl}
                        alt={course.partnerName}
                        className="h-7 object-contain"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                        {course.partnerName}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors mb-3 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-slate-400 mb-6 line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div>
                  {/* Instructors & Modules Count */}
                  <div className="pt-4 border-t border-slate-800/80 mb-6 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 truncate max-w-[160px]">
                      <svg className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {course.instructorNames.join(", ") || "Giảng viên Coursera"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {course.weekModules.length} Tuần học
                    </span>
                  </div>

                  {/* Action Link */}
                  <Link
                    href={`/courses/${course.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 group-hover:shadow-blue-500/30"
                  >
                    Xem Chi Tiết Khóa Học
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
