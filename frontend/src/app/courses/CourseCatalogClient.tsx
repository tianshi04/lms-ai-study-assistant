"use client";

import { useState, useEffect } from "react";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseGridSkeleton } from "@/components/course/CourseGridSkeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import { useCoursesQuery, useCategoriesQuery } from "@/lib/query_hooks";
import { GraduationCap, Search, RotateCcw } from "lucide-react";

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
          <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
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
      <Card className="w-full mb-8 p-4 md:p-5 rounded-2xl shadow-xs space-y-3.5">
        {/* Top Toolbar: Search Bar + Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-border">
          {/* Search Bar (Spans remaining space smoothly) */}
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
              aria-hidden="true"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={"Tìm kiếm khóa học theo tên hoặc từ khóa…"}
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-muted rounded-xl"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            )}
          </div>

          {/* Action Controls: Reset Filters + Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            {subject || level || searchQuery || sortBy ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSubject("");
                  setLevel("");
                  setSearchQuery("");
                  setSortBy("");
                }}
                className="h-9 px-3 text-xs text-muted-foreground hover:text-destructive bg-muted hover:bg-destructive/10 rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                <span>{"Xóa bộ lọc"}</span>
              </Button>
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
            <Button
              variant={subject === "" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSubject("")}
              className="rounded-full text-xs"
            >
              {"Tất cả chủ đề"}
            </Button>
            {subjects.map((s) => (
              <Button
                key={s.id}
                variant={subject === s.id ? "primary" : "secondary"}
                size="sm"
                onClick={() => setSubject(s.id)}
                className="rounded-full text-xs"
              >
                {getCategoryTranslation(s.slug, s.name)}
              </Button>
            ))}
          </div>

          {/* Level Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-16 shrink-0 hidden md:inline-block">
              {"Cấp độ"}
            </span>
            <Button
              variant={level === "" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setLevel("")}
              className="rounded-full text-xs"
            >
              {"Tất cả cấp độ"}
            </Button>
            {levels.map((l) => (
              <Button
                key={l.id}
                variant={level === l.id ? "primary" : "secondary"}
                size="sm"
                onClick={() => setLevel(l.id)}
                className="rounded-full text-xs"
              >
                {getCategoryTranslation(l.slug, l.name)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

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
            <Search className="w-8 h-8" aria-hidden="true" />
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
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSubject("");
                setLevel("");
                setSearchQuery("");
                setSortBy("");
              }}
              className="rounded-xl shadow-md flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{"Xóa bộ lọc"}</span>
            </Button>
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
