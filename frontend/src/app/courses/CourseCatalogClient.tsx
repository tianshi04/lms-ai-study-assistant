"use client";

import { useState, useEffect } from "react";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseGridSkeleton } from "@/components/course/CourseGridSkeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { useCoursesQuery, useCategoriesQuery } from "@/lib/query_hooks";
import { useTranslation } from "@/lib/i18n/TranslationProvider";

export function CourseCatalogClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [sortBy, setSortBy] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: courses = [], isLoading: loading, isFetching, error: queryError } = useCoursesQuery({
    searchQuery: debouncedSearch,
    subject,
    level,
    sortBy,
  });

  const { data: subjects = [] } = useCategoriesQuery("SUBJECT");
  const { data: levels = [] } = useCategoriesQuery("LEVEL");
  const error = queryError ? queryError.message : null;
  const { t } = useTranslation();

  const getCategoryTranslation = (slug: string, fallback: string) => {
    const camelSlug = slug.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const translated = t(`catalogFilter.${camelSlug}`);
    return translated === `catalogFilter.${camelSlug}` ? fallback : translated;
  };

  return (
    <main className="w-full max-w-7xl mx-auto px-6 py-12 min-h-[65vh]">
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
          </div>

          {/* Controls Section: Search & Filters */}
          <div className="w-full mb-8 bg-white dark:bg-slate-900/60 p-4 md:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
            {/* Top Toolbar: Search Bar + Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              {/* Search Bar (Spans remaining space smoothly) */}
              <div className="relative flex-1">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("catalog.searchPlaceholder")}
                  className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Action Controls: Reset Filters + Sort Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                {(subject || level || searchQuery || sortBy) ? (
                  <button
                    onClick={() => {
                      setSubject("");
                      setLevel("");
                      setSearchQuery("");
                      setSortBy("");
                    }}
                    className="h-9 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{t("catalogFilter.clearFilters")}</span>
                  </button>
                ) : null}

                {/* Sort Dropdown */}
                <div className="w-40 sm:w-44">
                  <Select value={sortBy} onValueChange={(val) => setSortBy((val as string) || "")}>
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder={t("catalogFilter.sortDefault")}>
                        {sortBy === "rating"
                          ? t("catalogFilter.sortRating")
                          : sortBy === "popular"
                          ? t("catalogFilter.sortPopular")
                          : sortBy === "newest"
                          ? t("catalogFilter.sortNewest")
                          : t("catalogFilter.sortDefault")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("catalogFilter.sortDefault")}</SelectItem>
                      <SelectItem value="rating">{t("catalogFilter.sortRating")}</SelectItem>
                      <SelectItem value="popular">{t("catalogFilter.sortPopular")}</SelectItem>
                      <SelectItem value="newest">{t("catalogFilter.sortNewest")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Filter Chips Section */}
            <div className="space-y-2.5">
              {/* Subject Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-16 shrink-0 hidden md:inline-block">
                  {t("catalogFilter.subjectHeader")}
                </span>
                <button
                  onClick={() => setSubject("")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    subject === ""
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {t("catalogFilter.allSubjects")}
                </button>
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubject(s.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      subject === s.id
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {getCategoryTranslation(s.slug, s.name)}
                  </button>
                ))}
              </div>

              {/* Level Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-16 shrink-0 hidden md:inline-block">
                  {t("catalogFilter.levelHeader")}
                </span>
                <button
                  onClick={() => setLevel("")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    level === ""
                      ? "bg-indigo-600 text-white shadow-xs font-semibold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {t("catalogFilter.allLevels")}
                </button>
                {levels.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLevel(l.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      level === l.id
                        ? "bg-indigo-600 text-white shadow-xs font-semibold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {getCategoryTranslation(l.slug, l.name)}
                  </button>
                ))}
              </div>
            </div>
          </div>

        {/* Content Section: Course Cards Grid */}
        {loading ? (
          <CourseGridSkeleton />
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-6 rounded-2xl text-center">
            <p className="font-semibold">{error}</p>
            <p className="text-xs opacity-80 mt-2">{t("catalog.errorNetwork")}</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="w-full min-h-[360px] flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
              {t("catalog.noResultsTitle")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
              {t("catalog.noResultsDesc")}
            </p>
            {(subject || level || searchQuery || sortBy) && (
              <button
                onClick={() => {
                  setSubject("");
                  setLevel("");
                  setSearchQuery("");
                  setSortBy("");
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{t("catalogFilter.clearFilters")}</span>
              </button>
            )}
          </div>
        ) : (
          <div className={`w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </main>
  );
}
