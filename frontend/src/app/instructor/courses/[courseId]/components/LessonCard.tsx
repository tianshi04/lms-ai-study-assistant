"use client";

import { type Lesson, type LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { LearningItemRow } from "./LearningItemRow";

interface LessonCardProps {
  lesson: Lesson;
  courseId: string;
  weekId: string;
  index: number;
  isInstructorOrAdmin: boolean;
  activeDraggingLessonId: string | null;
  activeDraggingItemId: string | null;
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
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string, lessonTitle: string) => void;
  onAddItem: (lessonId: string) => void;
  onEditItem: (item: LearningItem) => void;
  onDeleteItem: (itemId: string, itemTitle: string) => void;
}

export function LessonCard({
  lesson,
  courseId,
  weekId,
  index,
  isInstructorOrAdmin,
  activeDraggingLessonId,
  activeDraggingItemId,
  onLessonPointerDown,
  onLessonPointerMove,
  onLessonPointerUp,
  onItemPointerDown,
  onItemPointerMove,
  onItemPointerUp,
  onEditLesson,
  onDeleteLesson,
  onAddItem,
  onEditItem,
  onDeleteItem,
}: LessonCardProps) {
  return (
    <div
      data-lesson-id={lesson.id}
      style={{ touchAction: "none" }}
      className={`bg-muted/50 rounded-2xl p-4 border ${
        activeDraggingLessonId === lesson.id
          ? "border-primary shadow-xl opacity-100 scale-[1.005]"
          : "border-border hover:border-input"
      } space-y-3 transition-shadow`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isInstructorOrAdmin && (
            <div
              onPointerDown={(e) => onLessonPointerDown(e, weekId, lesson.id, index)}
              onPointerMove={onLessonPointerMove}
              onPointerUp={onLessonPointerUp}
              onPointerCancel={onLessonPointerUp}
              className="flex items-center bg-card rounded-lg px-2 py-1 border border-border cursor-grab active:cursor-grabbing select-none hover:bg-muted"
              title={"Kéo thả Bài học để sắp xếp"}
            >
              <span className="text-muted-foreground hover:text-foreground text-xs font-bold select-none">
                ⋮⋮
              </span>
            </div>
          )}
          <svg
            className="w-4 h-4 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="font-bold text-sm text-foreground">{lesson.title}</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            ({lesson.estimatedMinutes} {"phút"})
          </span>
        </div>

        {isInstructorOrAdmin && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEditLesson(lesson)}
              className="px-2 py-1 rounded-lg bg-muted text-foreground text-[11px] font-semibold hover:bg-muted/80 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span>{"Sửa Bài"}</span>
            </button>

            <button
              onClick={() => onDeleteLesson(lesson.id, lesson.title)}
              className="px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-[11px] font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>{"Xóa Bài"}</span>
            </button>

            <button
              onClick={() => onAddItem(lesson.id)}
              className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>{"Thêm Học liệu"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Learning Items under this Lesson */}
      {!lesson.items || lesson.items.length === 0 ? (
        <p className="text-[11px] italic text-muted-foreground pl-6">
          {"Chưa có nội dung video/bài đọc"}
        </p>
      ) : (
        <div data-items-container className="space-y-2 pl-4 relative">
          {lesson.items.map((item, iIdx) => (
            <LearningItemRow
              key={item.id}
              item={item}
              courseId={courseId}
              lessonId={lesson.id}
              index={iIdx}
              isInstructorOrAdmin={isInstructorOrAdmin}
              activeDraggingItemId={activeDraggingItemId}
              onPointerDown={onItemPointerDown}
              onPointerMove={onItemPointerMove}
              onPointerUp={onItemPointerUp}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
