"use client";

import type { PersonalNote } from "@/gen/learning/v1/learning_pb";
import { getMessageText } from "@/components/ai/utils";
import { AssistantMessageItem } from "@/components/ai/AssistantMessageItem";
import { SaveNoteCard, TimestampSeekCard } from "./AIChatToolCards";

export { AssistantMessageItem };

export function renderMessageItem(
  msg: { id: string; role: string; content?: unknown; name?: string },
  courseId: string,
  itemId?: string,
  onNoteCreated?: (note: PersonalNote) => void,
  onSeek?: (seconds: number) => void,
) {
  // 1. User Message (MD3 Tonal Primary Container)
  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end w-full my-1">
        <div className="text-xs px-3.5 py-2 max-w-[85%] rounded-2xl bg-primary-container text-on-primary-container rounded-tr-xs font-medium border border-primary/15 shadow-2xs">
          <p className="whitespace-pre-wrap leading-relaxed">{getMessageText(msg.content)}</p>
        </div>
      </div>
    );
  }

  const rawText = getMessageText(msg.content).trim();

  // 2. Detect Tool Calls / Actions or JSON Payload strings
  if (
    msg.role === "tool" ||
    msg.role === "action" ||
    msg.role === "system" ||
    (rawText.startsWith("{") && rawText.endsWith("}"))
  ) {
    try {
      const parsed = JSON.parse(rawText);

      // Tool 1: Save Note Card
      if (parsed && typeof parsed === "object" && "highlightedContent" in parsed) {
        return (
          <SaveNoteCard
            courseId={courseId}
            itemId={itemId}
            content={String(parsed.highlightedContent || "")}
            comment={String(parsed.commentText || "Lưu từ Trợ lý AI")}
            onNoteCreated={onNoteCreated}
          />
        );
      }

      // Tool 2: Video Timestamp Seek Card
      if (
        parsed &&
        typeof parsed === "object" &&
        ("timestampSeconds" in parsed || "timestampLabel" in parsed)
      ) {
        const seconds = Number(parsed.timestampSeconds || 0);
        return (
          <TimestampSeekCard
            seconds={seconds}
            label={parsed.timestampLabel ? String(parsed.timestampLabel) : undefined}
            reason={parsed.reason ? String(parsed.reason) : undefined}
            onSeek={onSeek}
          />
        );
      }

      // Filter out internal unformatted JSON strings
      return null;
    } catch {
      // If parsing fails, fall through to regular markdown text rendering
    }
  }

  // 3. Regular Assistant Text Response
  if (!rawText) return null;

  return <AssistantMessageItem text={rawText} />;
}
