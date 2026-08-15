"use client";

import { TranscriptPanel } from "@/components/player/TranscriptPanel";
import { NotesPanel } from "@/components/player/NotesPanel";
import { DeadlinesPanel } from "@/components/player/DeadlinesPanel";
import { ForumTab } from "@/components/player/ForumTab";
import type { LearningItem } from "@/gen/catalog/v1/catalog_pb";
import type { LearningProgress, PersonalNote } from "@/gen/learning/v1/learning_pb";
import type { SidebarTab } from "./types";

interface LearnNonAiTabsPanelProps {
  courseId: string;
  activeItem: LearningItem | null;
  currentTime: number;
  progress: LearningProgress | null;
  notes: PersonalNote[];
  highlightText: string;
  noteComment: string;
  savingNote: boolean;
  activeTab: SidebarTab;
  isVideoItem: boolean;
  isLectureItem: boolean;
  isPreviewMode: boolean;
  urlThreadId: string | null;
  onSeekVideo: (seconds: number) => void;
  onHighlightTextChange: (text: string) => void;
  onNoteCommentChange: (text: string) => void;
  onSaveNote: (e: React.FormEvent) => void | Promise<void>;
  onDeleteNote: (noteId: string) => void;
  onResetDeadlines: () => void;
}

export function LearnNonAiTabsPanel({
  courseId,
  activeItem,
  currentTime,
  progress,
  notes,
  highlightText,
  noteComment,
  savingNote,
  activeTab,
  isVideoItem,
  isLectureItem,
  isPreviewMode,
  urlThreadId,
  onSeekVideo,
  onHighlightTextChange,
  onNoteCommentChange,
  onSaveNote,
  onDeleteNote,
  onResetDeadlines,
}: LearnNonAiTabsPanelProps) {
  const getTabTitle = () => {
    switch (activeTab) {
      case "transcript":
        return "Phụ đề Tương tác";
      case "forum":
        return "Thảo luận Bài học";
      case "notes":
        return "Ghi chú Cá nhân";
      case "deadlines":
        return "Deadlines & Tiến độ";
      default:
        return "";
    }
  };

  return (
    <>
      {/* Drawer Header */}
      <div className="h-12 px-4 flex items-center justify-between bg-surface-container-lowest shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-on-surface uppercase tracking-wider">
            {getTabTitle()}
          </span>
        </div>
      </div>

      {/* Tab Body Content with Smooth Cross-fade */}
      <div
        key={activeTab}
        className="flex-1 overflow-y-auto p-4 bg-surface-container-lowest min-h-0 flex flex-col animate-in fade-in duration-200 ease-out"
      >
        {activeTab === "transcript" && isVideoItem && (
          <TranscriptPanel
            activeItem={activeItem}
            currentTime={currentTime}
            onSeekVideo={onSeekVideo}
          />
        )}

        {!isPreviewMode && activeTab === "forum" && (
          <ForumTab
            courseId={courseId}
            itemId={activeItem?.id || ""}
            targetThreadId={urlThreadId || undefined}
          />
        )}

        {!isPreviewMode && activeTab === "notes" && isLectureItem && (
          <NotesPanel
            notes={notes}
            highlightText={highlightText}
            noteComment={noteComment}
            savingNote={savingNote}
            onHighlightTextChange={onHighlightTextChange}
            onNoteCommentChange={onNoteCommentChange}
            onSaveNote={onSaveNote}
            onDeleteNote={onDeleteNote}
          />
        )}

        {!isPreviewMode && activeTab === "deadlines" && (
          <DeadlinesPanel progress={progress} onResetDeadlines={onResetDeadlines} />
        )}
      </div>
    </>
  );
}
