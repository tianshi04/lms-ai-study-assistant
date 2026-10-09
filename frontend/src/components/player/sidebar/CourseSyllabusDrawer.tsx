"use client";

import { useScrollEdgeFade } from "@/hooks/useScrollEdgeFade";
import { Button } from "@/components/ui/Button";
import { X, ChevronDown, ChevronUp, CheckCircle2, Lock } from "lucide-react";
import type { Course, LearningItem } from "@/gen/catalog/v1/catalog_pb";
import type { LearningProgress } from "@/gen/learning/v1/learning_pb";

function getItemTypeName(type: number): string {
  switch (type) {
    case 1:
      return "Video bài giảng";
    case 2:
      return "Bài đọc";
    case 3:
      return "Trắc nghiệm luyện tập";
    case 4:
      return "Bài kiểm tra tính điểm";
    case 5:
      return "Bài thực hành Lab";
    case 6:
      return "Chấm điểm bạn học";
    default:
      return "Học liệu";
  }
}

interface CourseSyllabusDrawerProps {
  course: Course;
  isSidebarOpen: boolean;
  activeItem: LearningItem | null;
  progress: LearningProgress | null;
  collapsedWeeks: Record<string, boolean>;
  onClose: () => void;
  onToggleWeek: (weekId: string) => void;
  onSelectItem: (item: LearningItem) => void;
  onSetLockNotice: (msg: string) => void;
  isItemLocked: (item: { type: number }, weekIndex: number) => boolean;
  isWeekUnlocked: (weekIndex: number) => boolean;
  isPaidAccess: boolean;
  isPreviewMode: boolean;
  isGradedItem: (type: number) => boolean;
}

export function CourseSyllabusDrawer({
  course,
  isSidebarOpen,
  activeItem,
  progress,
  collapsedWeeks,
  onClose,
  onToggleWeek,
  onSelectItem,
  onSetLockNotice,
  isItemLocked,
  isWeekUnlocked,
  isPaidAccess,
  isPreviewMode,
  isGradedItem,
}: CourseSyllabusDrawerProps) {
  const { scrollRef, canScrollUp, canScrollDown, handleScroll } =
    useScrollEdgeFade<HTMLDivElement>();

  return (
    <div
      className={`h-full flex flex-col w-80 xl:w-90 min-w-80 xl:min-w-90 shrink-0 transition-all duration-300 ease-m3-emphasized relative ${
        isSidebarOpen
          ? "opacity-100 translate-x-0 visible"
          : "opacity-0 -translate-x-4 invisible pointer-events-none"
      }`}
    >
      {/* Dynamic Header */}
      <div className="p-4 pb-2 bg-surface-container-lowest flex items-start justify-between gap-2 shrink-0 relative z-20">
        <h2
          className="font-bold text-lg text-on-surface leading-snug break-words pr-8"
          title={course.title}
        >
          {course.title}
        </h2>
        <Button
          type="button"
          variant="text"
          iconOnly
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-7 h-7 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full shrink-0"
          title="Ẩn Lộ trình Bài học"
          aria-label="Ẩn Lộ trình Bài học"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>

        {/* Top Floating Gradient Fade Overlay */}
        <div
          className={`absolute top-full inset-x-0 h-8 bg-gradient-to-b from-surface-container-lowest via-surface-container-lowest/80 to-transparent pointer-events-none z-20 transition-opacity duration-200 ${
            canScrollUp ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
      </div>

      {/* Scrollable Module & Lesson List */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 pt-2 space-y-6 scrollbar-none"
      >
        {course.weekModules.map((week, weekIndex) => {
          const isCollapsed = Boolean(collapsedWeeks[week.id]);
          const unlocked = isWeekUnlocked(weekIndex);
          const displayWeekTitle =
            week.title.startsWith("Tuần") || week.title.startsWith("Week")
              ? week.title
              : `Tuần ${week.weekNumber}: ${week.title}`;

          return (
            <div key={week.id} className="space-y-3">
              {/* Module / Week Accordion Header */}
              <Button
                type="button"
                variant="text"
                onClick={() => onToggleWeek(week.id)}
                className="w-full text-left justify-start items-start p-2.5 rounded-2xl hover:bg-surface-container-high/60 h-auto group"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-wide text-on-surface-variant group-hover:text-primary transition-colors">
                      {`Module ${week.weekNumber}`}
                    </span>
                    {!unlocked && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                        <Lock aria-hidden="true" className="w-3 h-3" /> Bị khóa
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-extrabold text-on-surface group-hover:text-primary transition-colors leading-snug break-words mt-0.5">
                    {displayWeekTitle}
                  </div>
                </div>
                <div className="text-on-surface-variant group-hover:text-on-surface transition-colors p-1 shrink-0 mt-0.5">
                  {isCollapsed ? (
                    <ChevronDown aria-hidden="true" className="w-4 h-4" />
                  ) : (
                    <ChevronUp aria-hidden="true" className="w-4 h-4" />
                  )}
                </div>
              </Button>

              {/* Collapsible Lessons & Items List */}
              {!isCollapsed && (
                <div className="space-y-4 pl-1">
                  {week.lessons.map((lesson, lessonIndex) => {
                    const displayLessonTitle =
                      lesson.title.startsWith("Bài") || lesson.title.startsWith("Lesson")
                        ? lesson.title
                        : `Bài ${lessonIndex + 1}: ${lesson.title}`;

                    return (
                      <div key={lesson.id} className="space-y-1.5">
                        {/* Lesson Subheading */}
                        <div className="text-xs font-bold text-on-surface-variant px-2 pt-1 break-words leading-snug">
                          {displayLessonTitle}
                        </div>

                        {/* Learning Items */}
                        <div className="space-y-1">
                          {lesson.items.map((item) => {
                            const isActive = activeItem?.id === item.id;
                            const isDone = progress?.completedItemIds.includes(item.id);
                            const itemLocked = isItemLocked(item, weekIndex);
                            const isAuditLocked =
                              !isPreviewMode && !isPaidAccess && isGradedItem(item.type);

                            return (
                              <Button
                                key={item.id}
                                type="button"
                                variant="text"
                                onClick={() => {
                                  if (itemLocked) {
                                    if (isAuditLocked) {
                                      onSetLockNotice(
                                        "Tài khoản đang ở chế độ Audit Mode (Miễn phí). Vui lòng nâng cấp Paid Mode hoặc sử dụng mã Enterprise Key / Hỗ trợ tài chính để làm bài kiểm tra tính điểm.",
                                      );
                                    } else if (!isPaidAccess && weekIndex > 0) {
                                      onSetLockNotice(
                                        "Tài khoản của bạn đang ở chế độ Audit (Miễn phí). Vui lòng đăng ký Coursera Plus hoặc mua khóa học để mở khóa từ Tuần 2 trở đi.",
                                      );
                                    } else {
                                      onSetLockNotice(
                                        `Bạn cần hoàn thành tất cả các bài học ở Tuần ${weekIndex} để mở khóa Tuần ${weekIndex + 1}.`,
                                      );
                                    }
                                    return;
                                  }
                                  onSetLockNotice("");
                                  onSelectItem(item);
                                }}
                                className={`w-full text-left justify-start items-center gap-3 p-3 rounded-xl h-auto whitespace-normal ${
                                  itemLocked
                                    ? "opacity-60 cursor-not-allowed hover:bg-transparent"
                                    : isActive
                                      ? "bg-primary-container text-on-primary-container shadow-xs font-bold hover:bg-primary-container"
                                      : "hover:bg-surface-container-high/60 text-on-surface"
                                }`}
                              >
                                {/* Status Icon */}
                                <div className="shrink-0 flex items-center justify-center">
                                  {itemLocked ? (
                                    <div className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                                      <Lock
                                        aria-hidden="true"
                                        className="w-3 h-3 text-on-surface-variant"
                                      />
                                    </div>
                                  ) : isDone ? (
                                    <CheckCircle2
                                      aria-hidden="true"
                                      className="w-5 h-5 text-success fill-success/15 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-outline-variant/70 shrink-0" />
                                  )}
                                </div>

                                {/* Title & Sub-info */}
                                <div className="flex-1 min-w-0">
                                  <div
                                    className={`text-xs leading-snug break-words ${
                                      isActive
                                        ? "font-bold text-on-primary-container"
                                        : isDone
                                          ? "font-medium text-on-surface"
                                          : "font-normal text-on-surface-variant"
                                    }`}
                                  >
                                    {item.title}
                                  </div>
                                  <div
                                    className={`text-xs mt-0.5 font-normal ${
                                      isActive
                                        ? "text-on-primary-container/80"
                                        : "text-on-surface-variant"
                                    }`}
                                  >
                                    {itemLocked
                                      ? isAuditLocked
                                        ? "Bị khóa (Audit Mode) • Yêu cầu Paid Mode"
                                        : `Bị khóa • Hoàn thành Tuần ${weekIndex}`
                                      : `${getItemTypeName(item.type)} • ${item.estimatedMinutes || 5} phút`}
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Floating Gradient Fade Overlay */}
      <div
        className={`absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
          canScrollDown ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />
    </div>
  );
}
