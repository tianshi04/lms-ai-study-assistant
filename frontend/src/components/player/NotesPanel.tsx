"use client";

import { Trash2 } from "lucide-react";
import type { PersonalNote } from "@/gen/learning/v1/learning_pb";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

interface NotesPanelProps {
  notes: PersonalNote[];
  highlightText: string;
  noteComment: string;
  savingNote: boolean;
  onHighlightTextChange: (val: string) => void;
  onNoteCommentChange: (val: string) => void;
  onSaveNote: (e: React.FormEvent) => void;
  onDeleteNote?: (noteId: string) => void;
}

export function NotesPanel({
  notes,
  highlightText,
  noteComment,
  savingNote,
  onHighlightTextChange,
  onNoteCommentChange,
  onSaveNote,
  onDeleteNote,
}: NotesPanelProps) {
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
          disabled={savingNote || !highlightText.trim() || savingNote}
          variant="filled"
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
              className="group bg-surface-container-low border border-outline-variant p-4 rounded-2xl text-xs space-y-1.5 shadow-xs relative"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-primary font-medium italic bg-primary-container/40 p-2.5 rounded-xl border border-primary/10 leading-relaxed flex-1">
                  &quot;{note.highlightedText}&quot;
                </p>
                {onDeleteNote && (
                  <IconButton
                    type="button"
                    variant="standard"
                    size="xs"
                    onClick={() => onDeleteNote(note.id)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 rounded-lg shrink-0 transition-colors"
                    title="Xóa ghi chú này"
                    aria-label="Xóa ghi chú"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </IconButton>
                )}
              </div>
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
