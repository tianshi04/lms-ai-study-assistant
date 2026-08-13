"use client";

import { useState } from "react";
import { BookmarkPlus, Check, Sparkles, Play } from "lucide-react";
import { getRpcClient } from "@/lib/connect_client";
import { LearningService, type PersonalNote } from "@/gen/learning/v1/learning_pb";
import { formatTime } from "./utils";
import { Surface } from "@/components/ui/Surface";
import { Chip } from "@/components/ui/Chip";

export function SaveNoteCard({
  courseId,
  itemId,
  content,
  comment,
  onNoteCreated,
}: {
  courseId: string;
  itemId?: string;
  content: string;
  comment: string;
  onNoteCreated?: (note: PersonalNote) => void;
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!itemId || isSaved || isSaving) return;
    setIsSaving(true);
    try {
      const client = getRpcClient(LearningService);
      const res = await client.savePersonalNote({
        courseId,
        itemId,
        highlightedText: content,
        noteComment: comment,
      });
      if (res.note && onNoteCreated) {
        onNoteCreated(res.note);
      }
      setIsSaved(true);
    } catch (err) {
      console.error("Failed to save AI note via tool:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Surface
      variant="low"
      shape="xl"
      className="my-2 p-3 flex flex-col gap-2 border border-outline-variant/40"
    >
      <div className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5">
        <BookmarkPlus className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
        <span>Gợi ý lưu vào Ghi chú cá nhân:</span>
      </div>
      <blockquote className="text-xs text-on-surface italic bg-surface/50 p-2 rounded-lg border-l-2 border-primary">
        "{content}"
      </blockquote>
      <Chip
        variant="assist"
        disabled={isSaved || isSaving}
        onClick={handleSave}
        className={`w-fit text-xs font-semibold ${
          isSaved
            ? "bg-success/10 text-success border-success/30 cursor-default"
            : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
        }`}
        leadingIcon={
          isSaved ? (
            <Check className="w-3.5 h-3.5 text-success" aria-hidden="true" />
          ) : (
            <BookmarkPlus className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          )
        }
      >
        {isSaved
          ? "Đã lưu vào Ghi chú của bạn"
          : isSaving
            ? "Đang lưu…"
            : "Lưu vào Ghi chú cá nhân"}
      </Chip>
    </Surface>
  );
}

export function TimestampSeekCard({
  seconds,
  label,
  reason,
  onSeek,
}: {
  seconds: number;
  label?: string;
  reason?: string;
  onSeek?: (seconds: number) => void;
}) {
  const displayLabel = label || formatTime(seconds);
  return (
    <Surface
      variant="low"
      shape="xl"
      className="my-2 p-3 flex flex-col gap-2 border border-outline-variant/40 w-full max-w-md"
    >
      <div className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
        <span>{reason || "Gợi ý xem đoạn video liên quan:"}</span>
      </div>
      {onSeek && (
        <Chip
          variant="assist"
          onClick={() => onSeek(seconds)}
          className="w-fit bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border-primary/20"
          leadingIcon={
            <Play className="w-3.5 h-3.5 fill-primary text-primary" aria-hidden="true" />
          }
        >
          Chuyển đến đoạn [{displayLabel}]
        </Chip>
      )}
    </Surface>
  );
}
