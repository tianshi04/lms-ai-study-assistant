"use client";

import { Pencil, Trash2, Plus } from "lucide-react";
import { type WeekModule, type Lesson, type LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { LessonCard } from "./LessonCard";
import { Button } from "@/components/ui/Button";

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
    <div
      data-week-id={week.id}
      style={{ touchAction: "none" }}
      className={`bg-card rounded-3xl border ${
        activeDraggingWeekId === week.id
          ? "border-primary shadow-xl opacity-100 scale-[1.005]"
          : "border-border hover:border-input"
      } p-6 shadow-sm space-y-4 transition-shadow`}
    >
      {/* Week Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isInstructorOrAdmin && (
              <div
                onPointerDown={(e) => onWeekPointerDown(e, week.id, index)}
                onPointerMove={onWeekPointerMove}
                onPointerUp={onWeekPointerUp}
                onPointerCancel={onWeekPointerUp}
                className="flex items-center bg-muted rounded-lg px-2 py-1 border border-border cursor-grab active:cursor-grabbing select-none hover:bg-muted/80"
                title={"Kéo thả Tuần học để sắp xếp"}
              >
                <span className="text-muted-foreground hover:text-foreground text-xs font-bold select-none">
                  ⋮⋮
                </span>
              </div>
            )}
            <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-black uppercase">
              {"Tuần"} {week.weekNumber}
            </span>
            <h3 className="text-lg font-extrabold text-foreground">{week.title}</h3>
          </div>
          {week.summary && <p className="text-xs text-muted-foreground">{week.summary}</p>}
        </div>

        {isInstructorOrAdmin && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outlined"
              size="sm"
              onClick={() => onEditWeek(week)}
              className="bg-muted text-foreground border-border text-xs font-semibold hover:bg-muted/80"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{"Sửa Tuần"}</span>
            </Button>

            <Button
              type="button"
              variant="outlined"
              size="sm"
              onClick={() => onDeleteWeek(week.id, week.title)}
              className="bg-destructive/10 text-destructive border-destructive/20 text-xs font-semibold hover:bg-destructive/20"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{"Xóa Tuần"}</span>
            </Button>

            <Button
              type="button"
              variant="outlined"
              size="sm"
              onClick={() => onAddLesson(week.id)}
              className="bg-muted hover:bg-muted/80 text-foreground text-xs font-bold"
            >
              <Plus className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>{"Thêm Bài học"}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Lessons List under this Week */}
      {!week.lessons || week.lessons.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">
            {"Chưa có Bài học nào trong Tuần"} {week.weekNumber}
          </p>
        </div>
      ) : (
        <div data-lessons-container className="space-y-4 relative">
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
  );
}
