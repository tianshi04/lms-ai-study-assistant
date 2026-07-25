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

  const { data: courses = [], isLoading: loading, error: queryError } = useCoursesQuery({
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
          </div>

          {/* Controls Section: Search & Filters */}
          <div className="mb-12 bg-white dark:bg-slate-900/40 p-5 md:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/5">
            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6 mt-4">
              <div className="flex-1 w-full" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Subject Chips */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2 hidden md:block">{t("catalogFilter.subjectHeader")}</span>
                  <button
                    onClick={() => setSubject("")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${subject === "" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300"}`}
                  >
                    {t("catalogFilter.allSubjects")}
                  </button>
                {subjects.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSubject(s.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${subject === s.id ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300"}`}
                  >
                    {getCategoryTranslation(s.slug, s.name)}
                  </button>
                ))}
              </div>
              
              {/* Level Chips */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2 hidden md:block">{t("catalogFilter.levelHeader")}</span>
                <button
                  onClick={() => setLevel("")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${level === "" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                >
                  {t("catalogFilter.allLevels")}
                </button>
                {levels.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setLevel(l.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${level === l.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                  >
                    {getCategoryTranslation(l.slug, l.name)}
                  </button>
                ))}
              </div>
            </div>

            {/* Base UI Sort Dropdown */}
            <div className="shrink-0 w-full lg:w-48 lg:ml-6" style={{ marginTop: '24px' }}>
              <Select value={sortBy} onValueChange={(val) => setSortBy((val as string) || "")}>
                <SelectTrigger className="w-full">
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

        {/* Content Section: Course Cards Grid */}
        {loading ? (
          <CourseGridSkeleton />
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
  );
}
