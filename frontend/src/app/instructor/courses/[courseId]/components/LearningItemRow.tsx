"use client";

import { ViewTransition } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { ItemType, type LearningItem } from "@/gen/catalog/v1/catalog_pb";

interface LearningItemRowProps {
  item: LearningItem;
  courseId: string;
  lessonId: string;
  index: number;
  isInstructorOrAdmin: boolean;
  activeDraggingItemId: string | null;
  onPointerDown: (
    e: React.PointerEvent<HTMLDivElement>,
    lessonId: string,
    itemId: string,
    index: number,
  ) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onEdit: (item: LearningItem) => void;
  onDelete: (itemId: string, itemTitle: string) => void;
}

export function LearningItemRow({
  item,
  courseId,
  lessonId,
  index,
  isInstructorOrAdmin,
  activeDraggingItemId,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onEdit,
  onDelete,
}: LearningItemRowProps) {
  return (
    <ViewTransition key={item.id}>
      <div
        data-item-id={item.id}
        style={{ touchAction: "none" }}
        className={`flex items-center justify-between p-2.5 rounded-xl bg-card border ${
          activeDraggingItemId === item.id
            ? "border-primary shadow-lg opacity-100 scale-[1.005]"
            : "border-border hover:border-input"
        } text-xs shadow-2xs transition-shadow`}
      >
        <div className="flex items-center gap-2">
          {isInstructorOrAdmin && (
            <div
              onPointerDown={(e) => onPointerDown(e, lessonId, item.id, index)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="flex items-center border-r border-border pr-2 mr-1 cursor-grab active:cursor-grabbing select-none p-1 hover:bg-muted rounded"
              title={"Kéo lên/xuống để sắp xếp thứ tự"}
            >
              <span className="text-muted-foreground hover:text-foreground text-xs font-bold select-none">
                ⋮⋮
              </span>
            </div>
          )}
          {item.type === ItemType.VIDEO ? (
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px]">
              VIDEO
            </span>
          ) : item.type === ItemType.READING ? (
            <span className="px-2 py-0.5 rounded bg-success/10 text-success font-bold text-[10px]">
              READING
            </span>
          ) : item.type === ItemType.AUTO_GRADED_LAB ? (
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px]">
              LAB
            </span>
          ) : item.type === ItemType.PEER_REVIEW ? (
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px]">
              PEER REVIEW
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-warning/10 text-warning font-bold text-[10px]">
              QUIZ
            </span>
          )}
          <span className="font-semibold text-foreground">{item.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            {item.estimatedMinutes} {"phút"}
          </span>

          <Link
            href={`/learn/${courseId}?itemId=${item.id}&preview=true`}
            target="_blank"
            className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
            title={"Xem trước nội dung trong Trình phát bài học"}
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>

          {isInstructorOrAdmin && (
            <>
              <button
                onClick={() => onEdit(item)}
                className="p-1 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors cursor-pointer"
                title={"Sửa nội dung học liệu"}
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                onClick={() => onDelete(item.id, item.title)}
                className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                title={"Xóa học liệu"}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </ViewTransition>
  );
}
