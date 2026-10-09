import type { Course, LearningItem } from "@/gen/catalog/v1/catalog_pb";
import type { LearningProgress, PersonalNote } from "@/gen/learning/v1/learning_pb";

export type SidebarTab = "transcript" | "notes" | "forum" | "deadlines" | "ai_assistant";

export interface LearnSidebarWorkspaceProps {
  courseId: string;
  course: Course | null;
  activeItem: LearningItem | null;
  currentTime: number;
  progress: LearningProgress | null;
  notes: PersonalNote[];
  highlightText: string;
  noteComment: string;
  savingNote: boolean;
  activeTab: SidebarTab;
  isPanelOpen: boolean;
  isVideoItem: boolean;
  isLectureItem: boolean;
  isPreviewMode: boolean;
  isAiSupported: boolean;
  externalAiPrompt: string | null;
  urlThreadId: string | null;
  nextItem: LearningItem | null;
  onTabClick: (tab: SidebarTab) => void;
  onCloseAiAssistant: () => void;
  onClosePanel: () => void;
  onSeekVideo: (seconds: number) => void;
  onNextLesson: () => void;
  onNoteCreated: (note: PersonalNote) => void;
  onHighlightTextChange: (text: string) => void;
  onNoteCommentChange: (text: string) => void;
  onSaveNote: (e: React.FormEvent) => void | Promise<void>;
  onDeleteNote: (noteId: string) => void;
  onResetDeadlines: () => void;
  onExternalPromptConsumed: () => void;
}
