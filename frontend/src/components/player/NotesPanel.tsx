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
  const locale = 'vi';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Create Note Form */}
      <form onSubmit={onSaveNote} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{"Ghi chú của tôi"}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder={"Nhập nội dung ghi chú bài học..."}
            value={highlightText}
            onChange={(e) => onHighlightTextChange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder={"Nhập nội dung ghi chú bài học..."}
            value={noteComment}
            onChange={(e) => onNoteCommentChange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={savingNote || !highlightText.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
        >
          {savingNote ? "Đang lưu..." : "Lưu ghi chú"}
        </button>
      </form>

      {/* List Saved Notes */}
      {notes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
          {"Chưa có ghi chú nào cho bài học này."}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-xs space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                <span className="font-mono text-[10px]">Note ID: {note.id}</span>
                <span>{new Date(note.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}</span>
              </div>
              <p className="text-blue-600 dark:text-blue-300 font-semibold italic">&quot;{note.highlightedText}&quot;</p>
              {note.noteComment && <p className="text-slate-700 dark:text-slate-300">{note.noteComment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
