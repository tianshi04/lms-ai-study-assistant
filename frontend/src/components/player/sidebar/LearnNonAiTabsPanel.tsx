"use client";

import { useScrollEdgeFade } from "@/hooks/useScrollEdgeFade";
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
  const { scrollRef, canScrollUp, canScrollDown, handleScroll } =
    useScrollEdgeFade<HTMLDivElement>();

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
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Drawer Header */}
      <div className="h-12 px-4 flex items-center justify-between bg-surface-container-lowest shrink-0 relative z-20">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-on-surface uppercase tracking-wider">
            {getTabTitle()}
          </span>
        </div>

        {/* Top Floating Gradient Fade Overlay */}
        <div
          className={`absolute top-full inset-x-0 h-8 bg-gradient-to-b from-surface-container-lowest via-surface-container-lowest/80 to-transparent pointer-events-none z-20 transition-opacity duration-200 ${
            canScrollUp ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
      </div>

      {/* Tab Body Content with Smooth Cross-fade */}
      <div
        key={activeTab}
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 bg-surface-container-lowest min-h-0 flex flex-col animate-in fade-in duration-200 ease-out scrollbar-none"
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

      {/* Bottom Floating Gradient Fade Overlay */}
      <div
        className={`absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/80 to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
          canScrollDown ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />
    </div>
  );
}
