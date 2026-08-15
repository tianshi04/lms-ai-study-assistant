"use client";

import { useRef, useMemo } from "react";
import {
  LearnPageAIChatbot,
  type LearnPageAIChatbotRef,
} from "@/components/player/ai/LearnPageAIChatbot";
import { LearnSidebarRail } from "./LearnSidebarRail";
import { LearnSidebarHeader } from "./LearnSidebarHeader";
import { LearnNonAiTabsPanel } from "./LearnNonAiTabsPanel";
import type { LearnSidebarWorkspaceProps } from "./types";

export function LearnSidebarWorkspace({
  courseId,
  course,
  activeItem,
  currentTime,
  progress,
  notes,
  highlightText,
  noteComment,
  savingNote,
  activeTab,
  isPanelOpen,
  isVideoItem,
  isLectureItem,
  isPreviewMode,
  isAiSupported,
  externalAiPrompt,
  urlThreadId,
  nextItem,
  onTabClick,
  onCloseAiAssistant,
  onClosePanel,
  onSeekVideo,
  onNextLesson,
  onNoteCreated,
  onHighlightTextChange,
  onNoteCommentChange,
  onSaveNote,
  onDeleteNote,
  onResetDeadlines,
  onExternalPromptConsumed,
}: LearnSidebarWorkspaceProps) {
  const chatbotRef = useRef<LearnPageAIChatbotRef>(null);

  const activeModule = useMemo(() => {
    if (!course || !activeItem) return null;
    return course.weekModules.find((wm) =>
      wm.lessons.some((l) => l.items.some((i) => i.id === activeItem.id)),
    );
  }, [course, activeItem]);

  const isAiActive = activeTab === "ai_assistant";

  const handleNewChat = () => {
    chatbotRef.current?.resetChat();
  };

  const handleClose = () => {
    if (isAiActive) {
      onCloseAiAssistant();
    } else {
      onClosePanel();
    }
  };

  return (
    <div
      className={`shrink-0 h-full relative overflow-hidden transition-[width,max-width,opacity] duration-300 ease-m3-emphasized ${
        !isPanelOpen
          ? "w-16 lg:w-20 opacity-100"
          : "w-[396px] lg:w-[412px] xl:w-[452px] max-w-[calc(100vw-24px)] opacity-100"
      }`}
    >
      {/* Vertical Navigation Rail (Fixed at Right Edge - Always accessible) */}
      <LearnSidebarRail
        activeTab={activeTab}
        isPanelOpen={isPanelOpen}
        isVideoItem={isVideoItem}
        isLectureItem={isLectureItem}
        isPreviewMode={isPreviewMode}
        onTabClick={onTabClick}
      />

      {/* Morphing White Card - Locked to left: 0, Right Edge Expands to the Right */}
      <aside
        className={`absolute top-0 bottom-0 left-0 z-10 flex flex-col bg-surface-container-lowest text-on-surface rounded-3xl shadow-xs overflow-hidden transition-all duration-300 ease-m3-emphasized ${
          !isPanelOpen
            ? "opacity-0 pointer-events-none invisible right-[76px] lg:right-[92px]"
            : isAiActive
              ? "opacity-100 pointer-events-auto visible right-0"
              : "opacity-100 pointer-events-auto visible right-[76px] lg:right-[92px]"
        }`}
      >
        {/* Floating Morphing Header Action Controls - Glides seamlessly with the right edge */}
        <LearnSidebarHeader
          activeTab={activeTab}
          isAiSupported={isAiSupported}
          onNewChat={handleNewChat}
          onClose={handleClose}
        />

        {/* Persistent AI Chatbot View with Smooth Dissolve Transition */}
        {isAiSupported && (
          <div
            className={`absolute inset-0 h-full w-[412px] xl:w-[452px] max-w-none shrink-0 flex flex-col transition-all duration-300 ease-m3-emphasized ${
              isAiActive
                ? "opacity-100 translate-x-0 pointer-events-auto visible"
                : "opacity-0 -translate-x-2 pointer-events-none invisible"
            }`}
          >
            <LearnPageAIChatbot
              ref={chatbotRef}
              courseId={courseId}
              courseTitle={course?.title || "Khóa học"}
              moduleTitle={activeModule?.title || "Module bài học"}
              activeItem={activeItem}
              currentTime={currentTime}
              readingMarkdown={activeItem?.readingMarkdown}
              externalPrompt={externalAiPrompt}
              onPromptConsumed={onExternalPromptConsumed}
              onSeek={onSeekVideo}
              onNextLesson={() => {
                if (nextItem) {
                  onNextLesson();
                }
              }}
              onNoteCreated={onNoteCreated}
            />
          </div>
        )}

        {/* Standard Non-AI Tabs View with Smooth Dissolve Transition */}
        <div
          className={`absolute inset-0 h-full w-[320px] xl:w-[360px] max-w-none shrink-0 flex flex-col transition-all duration-300 ease-m3-emphasized ${
            !isAiActive
              ? "opacity-100 translate-x-0 pointer-events-auto visible"
              : "opacity-0 translate-x-2 pointer-events-none invisible"
          }`}
        >
          <LearnNonAiTabsPanel
            courseId={courseId}
            activeItem={activeItem}
            currentTime={currentTime}
            progress={progress}
            notes={notes}
            highlightText={highlightText}
            noteComment={noteComment}
            savingNote={savingNote}
            activeTab={activeTab}
            isVideoItem={isVideoItem}
            isLectureItem={isLectureItem}
            isPreviewMode={isPreviewMode}
            urlThreadId={urlThreadId}
            onSeekVideo={onSeekVideo}
            onHighlightTextChange={onHighlightTextChange}
            onNoteCommentChange={onNoteCommentChange}
            onSaveNote={onSaveNote}
            onDeleteNote={onDeleteNote}
            onResetDeadlines={onResetDeadlines}
          />
        </div>
      </aside>
    </div>
  );
}
