"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { CourseCard } from "@/components/course/CourseCard";
import { useCoursesQuery } from "@/lib/query_hooks";
import { useTranslation } from "@/lib/i18n/TranslationProvider";
import { CourseSubject, CourseLevel } from "@/gen/catalog/v1/catalog_pb";

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [subject, setSubject] = useState<CourseSubject>(CourseSubject.UNSPECIFIED);
  const [level, setLevel] = useState<CourseLevel>(CourseLevel.UNSPECIFIED);
  const [sortBy, setSortBy] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: courses = [], isLoading: loading, error: queryError } = useCoursesQuery({
    searchQuery: debouncedSearch,
    subject,
    level,
    sortBy,
  });
  const error = queryError ? queryError.message : null;
  const { t } = useTranslation();

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
            {t("common.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
            {t("catalog.title")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
            {t("catalog.subtitle")}
          </p>

          {/* Search Bar */}
          <div className="mt-8 relative max-w-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("catalog.searchPlaceholder")}
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

          {/* Filter Bar */}
          <div className="mt-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1 space-y-4">
              {/* Subject Chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSubject(CourseSubject.UNSPECIFIED)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${subject === CourseSubject.UNSPECIFIED ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  {t("catalogFilter.allSubjects")}
                </button>
                <button
                  onClick={() => setSubject(CourseSubject.AI_ML)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${subject === CourseSubject.AI_ML ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  {t("catalogFilter.aiMl")}
                </button>
                <button
                  onClick={() => setSubject(CourseSubject.WEB_DEVELOPMENT)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${subject === CourseSubject.WEB_DEVELOPMENT ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  {t("catalogFilter.webDev")}
                </button>
                <button
                  onClick={() => setSubject(CourseSubject.DATA_SCIENCE)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${subject === CourseSubject.DATA_SCIENCE ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  {t("catalogFilter.dataScience")}
                </button>
              </div>
              
              {/* Level Chips */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLevel(CourseLevel.UNSPECIFIED)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${level === CourseLevel.UNSPECIFIED ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                >
                  {t("catalogFilter.allLevels")}
                </button>
                <button
                  onClick={() => setLevel(CourseLevel.BEGINNER)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${level === CourseLevel.BEGINNER ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                >
                  {t("catalogFilter.beginner")}
                </button>
                <button
                  onClick={() => setLevel(CourseLevel.INTERMEDIATE)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${level === CourseLevel.INTERMEDIATE ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                >
                  {t("catalogFilter.intermediate")}
                </button>
                <button
                  onClick={() => setLevel(CourseLevel.ADVANCED)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${level === CourseLevel.ADVANCED ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                >
                  {t("catalogFilter.advanced")}
                </button>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="shrink-0 mt-4 md:mt-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none shadow-sm cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
              >
                <option value="">{t("catalogFilter.sortDefault")}</option>
                <option value="rating">{t("catalogFilter.sortRating")}</option>
                <option value="popular">{t("catalogFilter.sortPopular")}</option>
                <option value="newest">{t("catalogFilter.sortNewest")}</option>
              </select>
            </div>
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
            <p className="text-xs opacity-80 mt-2">{t("catalog.errorNetwork")}</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            {t("catalog.noResults")} {searchQuery ? `"${searchQuery}"` : ""}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
