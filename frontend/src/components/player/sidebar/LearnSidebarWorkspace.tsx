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
  progress,
  notes,
  highlightText,
  noteComment,
  savingNote,
  noteError,
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
      className={`w-full relative lg:overflow-hidden transition-[width,max-width,opacity] duration-300 ease-m3-emphasized ${
        !isPanelOpen
          ? "h-auto shrink-0 lg:h-full lg:w-20 opacity-100"
          : "flex-1 min-h-0 flex flex-col gap-2 lg:block lg:flex-none lg:h-full lg:w-[412px] xl:w-[452px] lg:max-w-[calc(100vw-24px)] opacity-100"
      }`}
    >
      {/* Morphing White Card (Desktop) / Inline Split Panel Below Video (Mobile) */}
      <aside
        inert={!isPanelOpen}
        className={`relative flex-1 min-h-0 w-full lg:w-auto lg:absolute lg:top-0 lg:bottom-0 lg:left-0 lg:z-10 lg:h-full flex-col bg-surface-container-lowest text-on-surface rounded-3xl shadow-xs overflow-hidden transition-all duration-300 ease-m3-emphasized ${
          !isPanelOpen
            ? "hidden lg:flex opacity-0 pointer-events-none invisible lg:right-[92px]"
            : isAiActive
              ? "flex opacity-100 pointer-events-auto visible lg:right-0"
              : "flex opacity-100 pointer-events-auto visible lg:right-[92px]"
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
            className={`absolute inset-0 h-full w-full lg:w-[412px] xl:w-[452px] max-w-none shrink-0 flex flex-col transition-all duration-300 ease-m3-emphasized ${
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
          className={`absolute inset-0 h-full w-full lg:w-[320px] xl:w-[360px] max-w-none shrink-0 flex flex-col transition-all duration-300 ease-m3-emphasized ${
            !isAiActive
              ? "opacity-100 translate-x-0 pointer-events-auto visible"
              : "opacity-0 translate-x-2 pointer-events-none invisible"
          }`}
        >
          <LearnNonAiTabsPanel
            courseId={courseId}
            activeItem={activeItem}
            progress={progress}
            notes={notes}
            highlightText={highlightText}
            noteComment={noteComment}
            savingNote={savingNote}
            noteError={noteError}
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

      {/* Vertical Navigation Rail on Desktop / Horizontal Bottom Bar on Mobile */}
      <LearnSidebarRail
        activeTab={activeTab}
        isPanelOpen={isPanelOpen}
        isVideoItem={isVideoItem}
        isLectureItem={isLectureItem}
        isPreviewMode={isPreviewMode}
        onTabClick={onTabClick}
      />
    </div>
  );
}
