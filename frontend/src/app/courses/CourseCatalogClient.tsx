"use client";

import { useState, useEffect } from "react";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseGridSkeleton } from "@/components/course/CourseGridSkeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { useCoursesQuery, useCategoriesQuery } from "@/lib/query_hooks";

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

  const {
    data: courses = [],
    isLoading: loading,
    isFetching,
    error: queryError,
  } = useCoursesQuery({
    searchQuery: debouncedSearch,
    subject,
    level,
    sortBy,
  });

  const { data: subjects = [] } = useCategoriesQuery("SUBJECT");
  const { data: levels = [] } = useCategoriesQuery("LEVEL");
  const error = queryError ? queryError.message : null;

  const getCategoryTranslation = (slug: string, fallback: string) => {
    return fallback;
  };

  return (
    <main className="w-full max-w-7xl mx-auto px-6 py-12 min-h-[65vh]">
      <div className="mb-10 text-center md:text-left max-w-5xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l9-5-9-5-9 5 9 5z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
            />
          </svg>
          {"Coursera-Style Specializations & Courses"}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4 text-balance">
          {"Khám phá Khóa học & Lộ trình Học tập"}
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          {
            "Học tập với bài giảng video tương tác, phụ đề cuộn thông minh, bài tập thực hành nâng cao và thảo luận cộng đồng."
          }
        </p>
      </div>

      {/* Controls Section: Search & Filters */}
      <div className="w-full mb-8 bg-card p-4 md:p-5 rounded-2xl border border-border shadow-xs space-y-3.5">
        {/* Top Toolbar: Search Bar + Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-border">
          {/* Search Bar (Spans remaining space smoothly) */}
          <div className="relative flex-1">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
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
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={"Tìm kiếm khóa học theo tên hoặc từ khóa…"}
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-muted border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Controls: Reset Filters + Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            {subject || level || searchQuery || sortBy ? (
              <button
                onClick={() => {
                  setSubject("");
                  setLevel("");
                  setSearchQuery("");
                  setSortBy("");
                }}
                className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-destructive bg-muted hover:bg-destructive/10 rounded-xl transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>{"Xóa bộ lọc"}</span>
              </button>
            ) : null}

            {/* Sort Dropdown */}
            <div className="w-40 sm:w-44">
              <Select value={sortBy} onValueChange={(val) => setSortBy((val as string) || "")}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder={"Mặc định"}>
                    {sortBy === "rating"
                      ? "Đánh giá cao nhất"
                      : sortBy === "popular"
                        ? "Phổ biến nhất"
                        : sortBy === "newest"
                          ? "Mới nhất"
                          : "Mặc định"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{"Mặc định"}</SelectItem>
                  <SelectItem value="rating">{"Đánh giá cao nhất"}</SelectItem>
                  <SelectItem value="popular">{"Phổ biến nhất"}</SelectItem>
                  <SelectItem value="newest">{"Mới nhất"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Filter Chips Section */}
        <div className="space-y-2.5">
          {/* Subject Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-16 shrink-0 hidden md:inline-block">
              {"Chủ đề"}
            </span>
            <button
              onClick={() => setSubject("")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                subject === ""
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {"Tất cả chủ đề"}
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubject(s.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  subject === s.id
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {getCategoryTranslation(s.slug, s.name)}
              </button>
            ))}
          </div>

          {/* Level Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-16 shrink-0 hidden md:inline-block">
              {"Cấp độ"}
            </span>
            <button
              onClick={() => setLevel("")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                level === ""
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {"Tất cả cấp độ"}
            </button>
            {levels.map((l) => (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  level === l.id
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
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
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl text-center">
          <p className="font-semibold">{error}</p>
          <p className="text-xs opacity-80 mt-2">
            {"Vui lòng kiểm tra kết nối mạng hoặc thử lại sau."}
          </p>
        </div>
      ) : courses.length === 0 ? (
        <div className="w-full min-h-[360px] flex flex-col items-center justify-center text-center p-8 bg-muted/50 rounded-3xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            {"Không tìm thấy khóa học phù hợp"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
            {
              "Chúng tôi không tìm thấy kết quả nào khớp với từ khóa tìm kiếm của bạn. Vui lòng thử từ khóa khác."
            }
          </p>
          {(subject || level || searchQuery || sortBy) && (
            <button
              onClick={() => {
                setSubject("");
                setLevel("");
                setSearchQuery("");
                setSortBy("");
              }}
              className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary-hover rounded-xl transition-all shadow-md shadow-primary/20 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{"Xóa bộ lọc"}</span>
            </button>
          )}
        </div>
      ) : (
        <div
          className={`w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6 transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : "opacity-100"}`}
        >
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </main>
  );
}
