"use client";

import {
  type Course,
  type WeekModule,
  type Lesson,
  type LearningItem,
} from "@/gen/catalog/v1/catalog_pb";
import { WeekModuleCard } from "./WeekModuleCard";

interface SyllabusTreeProps {
  course: Course | null;
  courseId: string;
  isInstructorOrAdmin: boolean;
  activeDraggingWeekId: string | null;
  activeDraggingLessonId: string | null;
  activeDraggingItemId: string | null;
  onWeekPointerDown: (e: React.PointerEvent<HTMLDivElement>, weekId: string, index: number) => void;
  onWeekPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onWeekPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onLessonPointerDown: (
    e: React.PointerEvent<HTMLDivElement>,
    weekId: string,
    lessonId: string,
    index: number,
  ) => void;
  onLessonPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onLessonPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onItemPointerDown: (
    e: React.PointerEvent<HTMLDivElement>,
    lessonId: string,
    itemId: string,
    index: number,
  ) => void;
  onItemPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onItemPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onAddWeek: () => void;
  onEditWeek: (week: WeekModule) => void;
  onDeleteWeek: (weekId: string, weekTitle: string) => void;
  onAddLesson: (weekId: string) => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string, lessonTitle: string) => void;
  onAddItem: (lessonId: string) => void;
  onEditItem: (item: LearningItem) => void;
  onDeleteItem: (itemId: string, itemTitle: string) => void;
}

export function SyllabusTree({
  course,
  courseId,
  isInstructorOrAdmin,
  activeDraggingWeekId,
  activeDraggingLessonId,
  activeDraggingItemId,
  onWeekPointerDown,
  onWeekPointerMove,
  onWeekPointerUp,
  onLessonPointerDown,
  onLessonPointerMove,
  onLessonPointerUp,
  onItemPointerDown,
  onItemPointerMove,
  onItemPointerUp,
  onAddWeek,
  onEditWeek,
  onDeleteWeek,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: SyllabusTreeProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          {"Cấu trúc Chương trình bài giảng (Course Syllabus)"}
        </h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {"Tổng số tuần:"} {course?.weekModules?.length || 0}
        </span>
      </div>

      {!course?.weekModules || course.weekModules.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-3xl border border-border p-8 space-y-4">
          <svg
            className="w-12 h-12 mx-auto text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <div className="space-y-1">
            <p className="text-base font-bold text-foreground">
              {"Khóa học này chưa có Tuần học nào"}
            </p>
            <p className="text-xs text-muted-foreground">
              {'Hãy bấm nút "Thêm Tuần học" để khởi tạo mô-đun bài giảng đầu tiên.'}
            </p>
          </div>
          {isInstructorOrAdmin && (
            <button
              onClick={onAddWeek}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>{"Khởi tạo Tuần 1 ngay"}</span>
            </button>
          )}
        </div>
      ) : (
        <div data-weeks-container className="space-y-6 relative">
          {course.weekModules.map((week, wIdx) => (
            <WeekModuleCard
              key={week.id}
              week={week}
              courseId={courseId}
              index={wIdx}
              isInstructorOrAdmin={isInstructorOrAdmin}
              activeDraggingWeekId={activeDraggingWeekId}
              activeDraggingLessonId={activeDraggingLessonId}
              activeDraggingItemId={activeDraggingItemId}
              onWeekPointerDown={onWeekPointerDown}
              onWeekPointerMove={onWeekPointerMove}
              onWeekPointerUp={onWeekPointerUp}
              onLessonPointerDown={onLessonPointerDown}
              onLessonPointerMove={onLessonPointerMove}
              onLessonPointerUp={onLessonPointerUp}
              onItemPointerDown={onItemPointerDown}
              onItemPointerMove={onItemPointerMove}
              onItemPointerUp={onItemPointerUp}
              onEditWeek={onEditWeek}
              onDeleteWeek={onDeleteWeek}
              onAddLesson={onAddLesson}
              onEditLesson={onEditLesson}
              onDeleteLesson={onDeleteLesson}
              onAddItem={onAddItem}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
