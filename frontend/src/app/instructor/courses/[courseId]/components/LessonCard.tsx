"use client";

import { FileText, Pencil, Trash2, Plus } from "lucide-react";
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
          <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="font-bold text-sm text-foreground">{lesson.title}</span>
          <span className="text-[10px] font-mono text-muted-foreground">
            ({lesson.estimatedMinutes} {"phút"})
          </span>
        </div>

        {isInstructorOrAdmin && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEditLesson(lesson)}
              className="px-2 py-1 rounded-lg bg-muted text-foreground text-[11px] font-semibold hover:bg-muted/80 transition-colors flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pencil className="w-3 h-3" aria-hidden="true" />
              <span>{"Sửa Bài"}</span>
            </button>

            <button
              type="button"
              onClick={() => onDeleteLesson(lesson.id, lesson.title)}
              className="px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-[11px] font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="w-3 h-3" aria-hidden="true" />
              <span>{"Xóa Bài"}</span>
            </button>

            <button
              type="button"
              onClick={() => onAddItem(lesson.id)}
              className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
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
