"use client";

import { ViewTransition } from "react";
import { type WeekModule, type Lesson, type LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { LessonCard } from "./LessonCard";

interface WeekModuleCardProps {
  week: WeekModule;
  courseId: string;
  index: number;
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
  onEditWeek: (week: WeekModule) => void;
  onDeleteWeek: (weekId: string, weekTitle: string) => void;
  onAddLesson: (weekId: string) => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string, lessonTitle: string) => void;
  onAddItem: (lessonId: string) => void;
  onEditItem: (item: LearningItem) => void;
  onDeleteItem: (itemId: string, itemTitle: string) => void;
}

export function WeekModuleCard({
  week,
  courseId,
  index,
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
  onEditWeek,
  onDeleteWeek,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: WeekModuleCardProps) {
  return (
    <ViewTransition key={week.id}>
      <div
        data-week-id={week.id}
        style={{ touchAction: "none" }}
        className={`bg-white dark:bg-slate-900 rounded-3xl border ${
          activeDraggingWeekId === week.id
            ? "border-slate-400 dark:border-slate-600 shadow-xl opacity-100 scale-[1.005]"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
        } p-6 shadow-sm space-y-4 transition-shadow`}
      >
        {/* Week Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isInstructorOrAdmin && (
                <div
                  onPointerDown={(e) => onWeekPointerDown(e, week.id, index)}
                  onPointerMove={onWeekPointerMove}
                  onPointerUp={onWeekPointerUp}
                  onPointerCancel={onWeekPointerUp}
                  className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing select-none hover:bg-slate-200 dark:hover:bg-slate-700"
                  title={"Kéo thả Tuần học để sắp xếp"}
                >
                  <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold select-none">
                    ⋮⋮
                  </span>
                </div>
              )}
              <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-black uppercase">
                {"Tuần"} {week.weekNumber}
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {week.title}
              </h3>
            </div>
            {week.summary && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{week.summary}</p>
            )}
          </div>

          {isInstructorOrAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEditWeek(week)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span>{"Sửa Tuần"}</span>
              </button>

              <button
                onClick={() => onDeleteWeek(week.id, week.title)}
                className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:bg-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>{"Xóa Tuần"}</span>
              </button>

              <button
                onClick={() => onAddLesson(week.id)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>{"Thêm Bài học"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Lessons List under this Week */}
        {!week.lessons || week.lessons.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-400">
              {"Chưa có Bài học nào trong Tuần"} {week.weekNumber}
            </p>
          </div>
        ) : (
          <div
            data-lessons-container
            className="space-y-4 pl-2 sm:pl-4 border-l-2 border-slate-200 dark:border-slate-800 relative"
          >
            {week.lessons.map((lesson, lIdx) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                courseId={courseId}
                weekId={week.id}
                index={lIdx}
                isInstructorOrAdmin={isInstructorOrAdmin}
                activeDraggingLessonId={activeDraggingLessonId}
                activeDraggingItemId={activeDraggingItemId}
                onLessonPointerDown={onLessonPointerDown}
                onLessonPointerMove={onLessonPointerMove}
                onLessonPointerUp={onLessonPointerUp}
                onItemPointerDown={onItemPointerDown}
                onItemPointerMove={onItemPointerMove}
                onItemPointerUp={onItemPointerUp}
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
    </ViewTransition>
  );
}
