"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { CourseCard } from "@/components/course/CourseCard";
import { useCoursesQuery } from "@/lib/query_hooks";

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: courses = [], isLoading: loading, error: queryError } = useCoursesQuery();
  const error = queryError ? queryError.message : null;

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10 text-center md:text-left max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
            Coursera-Style Specializations & Courses
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
            Khám phá Khóa học & Lộ trình Học tập
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
            Học tập với bài giảng video tương tác, phụ đề cuộn thông minh, bài tập thực hành nâng cao và trợ lý AI Coach giải đáp 24/7.
          </p>

          {/* Search Bar */}
          <div className="mt-8 relative max-w-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm khóa học theo tên hoặc từ khóa..."
              className="w-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 pl-11 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
            />
            <svg
              className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5"
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
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 animate-pulse shadow-sm"
              >
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-6" />
                <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded mb-6" />
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-6 rounded-2xl text-center">
            <p className="font-semibold">{error}</p>
            <p className="text-xs opacity-80 mt-2">Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            Không tìm thấy khóa học nào phù hợp với từ khóa &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
