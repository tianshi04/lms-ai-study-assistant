"use client";

import { Layers, BookOpen, Plus } from "lucide-react";
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
          <Layers className="w-5 h-5 text-primary" aria-hidden="true" />
          {"Cấu trúc Chương trình bài giảng (Course Syllabus)"}
        </h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {"Tổng số tuần:"} {course?.weekModules?.length || 0}
        </span>
      </div>

      {!course?.weekModules || course.weekModules.length === 0 ? (
        <div className="py-16 text-center bg-card rounded-3xl border border-border p-8 space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground" aria-hidden="true" />
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
              <Plus className="w-4 h-4" aria-hidden="true" />
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
