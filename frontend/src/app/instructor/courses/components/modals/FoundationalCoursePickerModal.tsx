"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useCategoriesQuery } from "@/lib/query_hooks";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";
import { Search, BookOpen, Star, X, Loader2 } from "lucide-react";

interface FoundationalCoursePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCourseId?: string | null;
  selectedCourses: Course[];
  onSave: (courses: Course[]) => void;
}

export function FoundationalCoursePickerModal({
  open,
  onOpenChange,
  currentCourseId,
  selectedCourses,
  onSave,
}: FoundationalCoursePickerModalProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [nextPageToken, setNextPageToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [tempSelected, setTempSelected] = useState<Course[]>([]);
  const prevOpenRef = useRef(false);
  const toast = useToast();

  const { data: subjects } = useCategoriesQuery("SUBJECT", { staleTime: 5 * 60 * 1000 });
  const { data: levels } = useCategoriesQuery("LEVEL", { staleTime: 5 * 60 * 1000 });

  const subjectMap = useMemo(
    () => new Map((subjects ?? []).map((s) => [s.id, s.name])),
    [subjects],
  );
  const levelMap = useMemo(() => new Map((levels ?? []).map((l) => [l.id, l.name])), [levels]);

  const getSubjectLabel = (slug: string) => subjectMap.get(slug) || slug;
  const getLevelLabel = (slug: string) => levelMap.get(slug) || slug;

  // Initialize temporary selection only when modal transitions from closed to open
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setTempSelected([...selectedCourses]);
    } else if (!open && prevOpenRef.current) {
      setSearchInput("");
      setDebouncedSearch("");
      setCourses([]);
      setNextPageToken("");
    }
    prevOpenRef.current = open;
  }, [open, selectedCourses]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Re-fetch candidates when modal opens or debounced search changes (with race-condition cancel guard)
  useEffect(() => {
    let ignore = false;
    if (open) {
      setIsLoading(true);
      const client = getRpcClient(CatalogService);
      client
        .listFoundationalCourseCandidates({
          courseId: currentCourseId || "",
          searchQuery: debouncedSearch,
          pageSize: 10,
          pageToken: "",
        })
        .then((res) => {
          if (!ignore) {
            setCourses(res.courses || []);
            setNextPageToken(res.nextPageToken || "");
          }
        })
        .catch((err) => {
          if (!ignore) {
            console.error("Failed to fetch foundational course candidates:", err);
          }
        })
        .finally(() => {
          if (!ignore) {
            setIsLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [open, debouncedSearch, currentCourseId]);

  const toggleCourse = (course: Course) => {
    setTempSelected((prev) => {
      const exists = prev.some((c) => c.id === course.id);
      if (exists) {
        return prev.filter((c) => c.id !== course.id);
      }
      if (prev.length >= 10) {
        toast.error("Bạn chỉ có thể chọn tối đa 10 môn học nền tảng.");
        return prev;
      }
      return [...prev, course];
    });
  };

  const handleClearAll = () => {
    setTempSelected([]);
  };

  const handleConfirm = () => {
    onSave(tempSelected);
    onOpenChange(false);
  };

  const handleLoadMore = async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const client = getRpcClient(CatalogService);
      const res = await client.listFoundationalCourseCandidates({
        courseId: currentCourseId || "",
        searchQuery: debouncedSearch,
        pageSize: 10,
        pageToken: nextPageToken,
      });
      setCourses((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const newCourses = (res.courses || []).filter((c) => !existingIds.has(c.id));
        return [...prev, ...newCourses];
      });
      setNextPageToken(res.nextPageToken || "");
    } catch (err) {
      console.error("Failed to load more foundational course candidates:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="xl" className="max-w-2xl">
        <Dialog.Header>
          <Dialog.Title className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
            <span>Chọn Môn Nền Tảng Khuyến Nghị</span>
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mt-1">
            Chọn các khóa học học viên nên hoàn thành trước để có kiến thức nền tảng vững vàng (có
            thể chọn nhiều môn).
          </Dialog.Description>
        </Dialog.Header>

        {/* Search Bar with Debounce */}
        <div className="relative my-3">
          <Search
            className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm theo tên khóa học..."
            className="pl-9 pr-9 h-10 w-full"
          />
          {searchInput && (
            <IconButton
              variant="standard"
              size="sm"
              aria-label="Xóa từ khóa tìm kiếm"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </IconButton>
          )}
        </div>

        {/* List of Courses */}
        <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1 min-h-[160px]">
          {isLoading && courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
              <span className="text-sm">Đang tải danh sách khóa học xếp hạng...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
              <p className="text-sm font-medium">Không tìm thấy khóa học phù hợp</p>
              {debouncedSearch && (
                <p className="text-xs text-muted-foreground mt-1">Thử tìm kiếm với từ khóa khác</p>
              )}
            </div>
          ) : (
            courses.map((c) => {
              const isSelected = tempSelected.some((s) => s.id === c.id);

              return (
                <Surface
                  key={c.id}
                  variant="container"
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => toggleCourse(c)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      toggleCourse(c);
                    }
                  }}
                  className={`p-3 rounded-xl flex items-center justify-between gap-3 transition-all border cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/70 hover:border-primary/40 hover:bg-surface-container-high"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0 pointer-events-none" aria-hidden="true">
                      <Checkbox checked={isSelected} tabIndex={-1} />
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className="text-sm font-semibold text-foreground truncate"
                          title={c.title}
                        >
                          {c.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{c.partnerName}</span>
                        {c.subject && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container">
                              {getSubjectLabel(c.subject)}
                            </span>
                          </>
                        )}
                        {c.level && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                              {getLevelLabel(c.level)}
                            </span>
                          </>
                        )}
                        {c.averageRating > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                              <Star className="w-3 h-3 fill-amber-500" aria-hidden="true" />
                              {c.averageRating.toFixed(1)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Surface>
              );
            })
          )}

          {/* Load More Button */}
          {nextPageToken && !isLoading && (
            <div className="pt-2 text-center">
              <Button
                variant="outlined"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="w-full text-xs"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" aria-hidden="true" />
                    <span>Đang tải thêm...</span>
                  </>
                ) : (
                  <span>Tải thêm khóa học...</span>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <Dialog.Footer className="mt-4 pt-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">
              Đã chọn: <span className="text-primary font-bold">{tempSelected.length}</span> khóa
              học
            </span>
            {tempSelected.length > 0 && (
              <Button
                variant="text"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2"
              >
                <span>Bỏ chọn tất cả</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outlined" size="sm" onClick={() => onOpenChange(false)}>
              <span>Hủy</span>
            </Button>
            <Button variant="filled" size="sm" onClick={handleConfirm}>
              <span>Xác nhận chọn ({tempSelected.length})</span>
            </Button>
          </div>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
