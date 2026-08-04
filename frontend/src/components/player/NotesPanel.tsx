"use client";

import type { PersonalNote } from "@/gen/learning/v1/learning_pb";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface NotesPanelProps {
  notes: PersonalNote[];
  highlightText: string;
  noteComment: string;
  savingNote: boolean;
  onHighlightTextChange: (val: string) => void;
  onNoteCommentChange: (val: string) => void;
  onSaveNote: (e: React.FormEvent) => void;
}

export function NotesPanel({
  notes,
  highlightText,
  noteComment,
  savingNote,
  onHighlightTextChange,
  onNoteCommentChange,
  onSaveNote,
}: NotesPanelProps) {
  const locale = "vi";

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Create Note Form */}
      <form
        onSubmit={onSaveNote}
        className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant space-y-3.5 shadow-xs"
      >
        <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
          {"Ghi chú của tôi"}
        </h4>
        <div className="flex flex-col gap-2.5">
          <Input
            type="text"
            placeholder="Nhập nội dung trích dẫn / ý chính…"
            value={highlightText}
            onChange={(e) => onHighlightTextChange(e.target.value)}
          />
          <Input
            type="text"
            placeholder="Nhập bình luận / suy nghĩ cá nhân (tùy chọn)…"
            value={noteComment}
            onChange={(e) => onNoteCommentChange(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={savingNote || !highlightText.trim()}
          isLoading={savingNote}
          variant="primary"
          className="w-full sm:w-auto"
        >
          Lưu ghi chú
        </Button>
      </form>

      {/* List Saved Notes */}
      {notes.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant p-6 rounded-2xl text-center text-xs text-on-surface-variant">
          {"Chưa có ghi chú nào cho bài học này."}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-surface-container-low border border-outline-variant p-4 rounded-2xl text-xs space-y-1.5 shadow-xs"
            >
              <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
                <span className="font-mono text-[10px] text-on-surface-variant/80">
                  ID: {note.id}
                </span>
                <span>
                  {new Date(note.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                </span>
              </div>
              <p className="text-primary font-medium italic bg-primary-container/40 p-2.5 rounded-xl border border-primary/10 leading-relaxed">
                &quot;{note.highlightedText}&quot;
              </p>
              {note.noteComment && (
                <p className="text-on-surface text-xs pt-1 leading-relaxed">{note.noteComment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
