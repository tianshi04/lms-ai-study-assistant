"use client";

import { Trash2, StickyNote } from "lucide-react";
import type { PersonalNote } from "@/gen/learning/v1/learning_pb";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Surface } from "@/components/ui/Surface";

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
    <div className="w-full space-y-4">
      {/* Create Note Form */}
      <Surface
        variant="low"
        shape="2xl"
        className="w-full bg-surface-container-low/50 border border-outline-variant/60 p-4 space-y-3.5"
      >
        <form onSubmit={onSaveNote} className="space-y-3.5">
          <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
            <StickyNote className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>{"Ghi chú của tôi"}</span>
          </h4>
          <div className="flex flex-col gap-2.5">
            <Input
              type="text"
              placeholder="Nhập nội dung trích dẫn / ý chính…"
              value={highlightText}
              onChange={(e) => onHighlightTextChange(e.target.value)}
              className="bg-surface-container-lowest"
            />
            <Input
              type="text"
              placeholder="Nhập bình luận / suy nghĩ cá nhân (tùy chọn)…"
              value={noteComment}
              onChange={(e) => onNoteCommentChange(e.target.value)}
              className="bg-surface-container-lowest"
            />
          </div>
          <Button
            type="submit"
            disabled={savingNote || !highlightText.trim()}
            variant="filled"
            size="sm"
            className="w-full sm:w-auto font-bold shadow-xs"
          >
            Lưu ghi chú
          </Button>
        </form>
      </Surface>

      {/* List Saved Notes */}
      {notes.length === 0 ? (
        <Surface
          variant="low"
          shape="2xl"
          className="w-full border border-dashed border-outline-variant/70 bg-surface-container-low/30 p-6 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-2"
        >
          <StickyNote className="w-6 h-6 text-on-surface-variant/50" aria-hidden="true" />
          <span>{"Chưa có ghi chú nào cho bài học này."}</span>
        </Surface>
      ) : (
        <div className="w-full space-y-3">
          {notes.map((note) => (
            <Surface
              key={note.id}
              variant="low"
              shape="2xl"
              className="w-full group border border-outline-variant/70 bg-surface-container-lowest p-4 text-xs space-y-2 relative"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-on-primary-container font-medium italic bg-primary-container/30 p-3 rounded-xl border border-primary/10 leading-relaxed flex-1">
                  &quot;{note.highlightedText}&quot;
                </p>
                {onDeleteNote && (
                  <IconButton
                    type="button"
                    variant="standard"
                    size="xs"
                    onClick={() => onDeleteNote(note.id)}
                    className="text-on-surface-variant hover:text-destructive hover:bg-destructive/10 h-7 w-7 rounded-lg shrink-0 transition-colors"
                    title="Xóa ghi chú này"
                    aria-label="Xóa ghi chú"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </IconButton>
                )}
              </div>
              {note.noteComment && (
                <p className="text-on-surface text-xs pt-0.5 leading-relaxed">{note.noteComment}</p>
              )}
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
