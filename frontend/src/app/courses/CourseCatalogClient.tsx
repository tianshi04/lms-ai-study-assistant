"use client";

import { useState, useEffect } from "react";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseGridSkeleton } from "@/components/course/CourseGridSkeleton";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCoursesQuery, useCategoriesQuery } from "@/lib/query_hooks";
import { Search, RotateCcw } from "lucide-react";

import type { Course, Category } from "@/gen/catalog/v1/catalog_pb";

interface CourseCatalogClientProps {
  initialCourses?: Course[];
  initialSubjects?: Category[];
  initialLevels?: Category[];
}

export function CourseCatalogClient({
  initialCourses,
  initialSubjects,
  initialLevels,
}: CourseCatalogClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [sortBy, setSortBy] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const hasActiveFilters = Boolean(debouncedSearch || subject || level || sortBy);

  const {
    data: courses = [],
    isLoading: loading,
    isFetching,
    error: queryError,
  } = useCoursesQuery(
    {
      searchQuery: debouncedSearch,
      subject,
      level,
      sortBy,
    },
    !hasActiveFilters && initialCourses && initialCourses.length > 0
      ? { initialData: initialCourses }
      : undefined,
  );

  const { data: subjects = [] } = useCategoriesQuery(
    "SUBJECT",
    initialSubjects && initialSubjects.length > 0 ? { initialData: initialSubjects } : undefined,
  );
  const { data: levels = [] } = useCategoriesQuery(
    "LEVEL",
    initialLevels && initialLevels.length > 0 ? { initialData: initialLevels } : undefined,
  );
  const error = queryError ? queryError.message : null;

  const getCategoryTranslation = (slug: string, fallback: string) => fallback;

  return (
    <>
      {/* Controls Section: Search & Filters (MD3 Surface Container) */}
      <Surface variant="container" shape="3xl" className="w-full mb-10 p-5 md:p-6 space-y-5">
        {/* Top Toolbar: Search Bar + Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant">
          {/* Search Bar (MD3 Pill Input) */}
          <div className="relative flex-1">
            <Search
              className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none z-10"
              aria-hidden="true"
            />
            <Input
              type="text"
              name="search"
              autoComplete="off"
              aria-label="Tìm kiếm khóa học"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={"Tìm kiếm khóa học theo tên hoặc từ khóa…"}
              className="w-full pl-11 pr-9 py-2.5 text-xs sm:text-sm bg-surface-container-lowest border border-outline-variant rounded-full text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <IconButton
                type="button"
                variant="standard"
                size="xs"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
              >
                ✕
              </IconButton>
            )}
          </div>

          {/* Action Controls: Reset Filters + Sort Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            {subject || level || searchQuery || sortBy ? (
              <Button
                type="button"
                variant="text"
                size="sm"
                onClick={() => {
                  setSubject("");
                  setLevel("");
                  setSearchQuery("");
                  setSortBy("");
                }}
                className="h-10 px-4 text-xs font-bold text-error bg-error-container/30 hover:bg-error-container/60 rounded-full border border-error/20"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                <span>{"Xóa bộ lọc"}</span>
              </Button>
            ) : null}

            {/* Sort Dropdown */}
            <div className="w-44 sm:w-48">
              <Select value={sortBy} onValueChange={(val) => setSortBy((val as string) || "")}>
                <Select.Trigger className="w-full h-10 text-xs font-bold bg-surface-container-lowest border border-outline-variant rounded-full px-4 text-on-surface">
                  <Select.Value placeholder={"Mặc định"}>
                    {sortBy === "rating"
                      ? "Đánh giá cao nhất"
                      : sortBy === "popular"
                        ? "Phổ biến nhất"
                        : sortBy === "newest"
                          ? "Mới nhất"
                          : "Mặc định"}
                  </Select.Value>
                </Select.Trigger>
                <Select.Content className="bg-surface-container-high border border-outline-variant rounded-2xl shadow-lg">
                  <Select.Item value="">{"Mặc định"}</Select.Item>
                  <Select.Item value="rating">{"Đánh giá cao nhất"}</Select.Item>
                  <Select.Item value="popular">{"Phổ biến nhất"}</Select.Item>
                  <Select.Item value="newest">{"Mới nhất"}</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>
        </div>

        {/* Filter Chips Section (MD3 Filter Chips) */}
        <div className="space-y-3">
          {/* Subject Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider w-16 shrink-0 hidden md:inline-block">
              {"Chủ đề"}
            </span>
            <Chip variant="filter" selected={subject === ""} onClick={() => setSubject("")}>
              {"Tất cả chủ đề"}
            </Chip>
            {subjects.map((s) => (
              <Chip
                key={s.id}
                variant="filter"
                selected={subject === s.id}
                onClick={() => setSubject(s.id)}
              >
                {getCategoryTranslation(s.slug, s.name)}
              </Chip>
            ))}
          </div>

          {/* Level Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider w-16 shrink-0 hidden md:inline-block">
              {"Cấp độ"}
            </span>
            <Chip variant="filter" selected={level === ""} onClick={() => setLevel("")}>
              {"Tất cả cấp độ"}
            </Chip>
            {levels.map((l) => (
              <Chip
                key={l.id}
                variant="filter"
                selected={level === l.id}
                onClick={() => setLevel(l.id)}
              >
                {getCategoryTranslation(l.slug, l.name)}
              </Chip>
            ))}
          </div>
        </div>
      </Surface>

      {/* Content Section: Course Cards Grid */}
      {loading || isFetching ? (
        <CourseGridSkeleton />
      ) : error ? (
        <div className="bg-error-container text-on-error-container border border-error/20 p-6 rounded-3xl text-center">
          <p className="font-bold">{error}</p>
          <p className="text-xs opacity-80 mt-2">
            {"Vui lòng kiểm tra kết nối mạng hoặc thử lại sau."}
          </p>
        </div>
      ) : courses.length === 0 ? (
        <div className="w-full min-h-[360px] flex flex-col items-center justify-center text-center p-8 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant">
          <div className="w-16 h-16 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center mb-4">
            <Search className="w-8 h-8" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-1">
            {"Không tìm thấy khóa học phù hợp"}
          </h3>
          <p className="text-sm text-on-surface-variant max-w-md mb-6 leading-relaxed">
            {
              "Chúng tôi không tìm thấy kết quả nào khớp với từ khóa tìm kiếm của bạn. Vui lòng thử từ khóa khác."
            }
          </p>
          {(subject || level || searchQuery || sortBy) && (
            <Button
              variant="filled"
              size="sm"
              onClick={() => {
                setSubject("");
                setLevel("");
                setSearchQuery("");
                setSortBy("");
              }}
              className="rounded-full px-6 shadow-xs flex items-center gap-2 font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{"Xóa bộ lọc"}</span>
            </Button>
          )}
        </div>
      ) : (
        <div
          className={`w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-m3-short-4 ease-m3-emphasized ${isFetching ? "opacity-60 pointer-events-none" : "opacity-100"}`}
        >
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </>
  );
}
