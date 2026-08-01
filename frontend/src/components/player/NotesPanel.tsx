"use client";

import type { PersonalNote } from "@/gen/learning/v1/learning_pb";

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Create Note Form */}
      <form
        onSubmit={onSaveNote}
        className="bg-card p-4 rounded-xl border border-border space-y-3 shadow-sm"
      >
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
          {"Ghi chú của tôi"}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder={"Nhập nội dung ghi chú bài học…"}
            value={highlightText}
            onChange={(e) => onHighlightTextChange(e.target.value)}
            className="bg-card border border-input rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <input
            type="text"
            placeholder={"Nhập nội dung ghi chú bài học…"}
            value={noteComment}
            onChange={(e) => onNoteCommentChange(e.target.value)}
            className="bg-card border border-input rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={savingNote || !highlightText.trim()}
          className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer"
        >
          <span aria-live="polite">{savingNote ? "Đang lưu…" : "Lưu ghi chú"}</span>
        </button>
      </form>

      {/* List Saved Notes */}
      {notes.length === 0 ? (
        <div className="bg-card border border-border p-6 rounded-xl text-center text-xs text-muted-foreground">
          {"Chưa có ghi chú nào cho bài học này."}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-card border border-border p-3.5 rounded-xl text-xs space-y-1 shadow-sm"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-mono text-[10px]">Note ID: {note.id}</span>
                <span>
                  {new Date(note.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                </span>
              </div>
              <p className="text-primary font-semibold italic">
                &quot;{note.highlightedText}&quot;
              </p>
              {note.noteComment && <p className="text-foreground">{note.noteComment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
