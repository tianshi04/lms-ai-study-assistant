"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course, type LearningItem, type InVideoQuiz } from "@/gen/catalog/v1/catalog_pb";
import { LearningService, type LearningProgress, type PersonalNote } from "@/gen/learning/v1/learning_pb";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { TranscriptPanel } from "@/components/player/TranscriptPanel";
import { NotesPanel } from "@/components/player/NotesPanel";
import { DeadlinesPanel } from "@/components/player/DeadlinesPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

function getActiveUserId(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("user_id") || "user_learner_demo";
  }
  return "user_learner_demo";
}

export default function CoursePlayerPage() {
  const params = useParams();
  const courseId = params?.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [activeItem, setActiveItem] = useState<LearningItem | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [activeTab, setActiveTab] = useState<"transcript" | "notes" | "deadlines">("transcript");

  // Video & In-Video Quiz State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeQuiz, setActiveQuiz] = useState<InVideoQuiz | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [answeredQuizTimestamps, setAnsweredQuizTimestamps] = useState<Set<number>>(new Set());

  // Personal Note & Locking State
  const [highlightText, setHighlightText] = useState("");
  const [noteComment, setNoteComment] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [lockNotice, setLockNotice] = useState("");

  const router = useRouter();

  // Load Course & Progress
  useEffect(() => {
    if (!courseId) return;

    // Strict Auth Guard Check
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      router.push(`/auth/login?redirect=/learn/${courseId}`);
      return;
    }

    async function loadData() {
      try {
        const catalogClient = getRpcClient(CatalogService);
        const courseRes = await catalogClient.getCourseDetail({ courseId });
        setCourse(courseRes.course ?? null);

        // Set initial item
        const firstItem = courseRes.course?.weekModules[0]?.lessons[0]?.items[0];
        if (firstItem) setActiveItem(firstItem);

        const currentUserId = getActiveUserId();
        const learningClient = getRpcClient(LearningService);
        const progressRes = await learningClient.getProgress({ userId: currentUserId, courseId });
        setProgress(progressRes.progress ?? null);

        const notesRes = await learningClient.listPersonalNotes({ userId: currentUserId, courseId });
        setNotes(notesRes.notes);
      } catch (err) {
        console.error("Error loading course player data:", err);
      }
    }
    loadData();
  }, [courseId, router]);

  // Total course items count
  const totalCourseItems = course?.weekModules.reduce(
    (acc, wm) => acc + wm.lessons.reduce((lAcc, l) => lAcc + l.items.length, 0),
    0
  ) || 1;

  // Mark Item as Complete
  const handleMarkItemComplete = async (itemId: string) => {
    try {
      const learningClient = getRpcClient(LearningService);
      const res = await learningClient.markItemComplete({
        userId: getActiveUserId(),
        courseId,
        itemId,
        totalCourseItems,
      });
      if (res.updatedProgress) {
        setProgress(res.updatedProgress);
      }
    } catch (err) {
      console.error("Failed to mark item complete:", err);
    }
  };

  // Video timeupdate handler for In-Video Quiz interruption & Auto Progress Update at 80%
  const handleTimeUpdate = () => {
    if (!videoRef.current || !activeItem) return;
    const time = Math.floor(videoRef.current.currentTime);
    setCurrentTime(time);

    // Auto mark as completed if watched >= 80% of video duration
    if (
      videoRef.current.duration > 0 &&
      videoRef.current.currentTime >= videoRef.current.duration * 0.8 &&
      !progress?.completedItemIds.includes(activeItem.id)
    ) {
      handleMarkItemComplete(activeItem.id);
    }

    // Check for In-Video Quiz at current timestamp
    if (activeItem.inVideoQuizzes && activeItem.inVideoQuizzes.length > 0) {
      for (const quiz of activeItem.inVideoQuizzes) {
        if (
          Math.abs(time - quiz.timestampSeconds) <= 1 &&
          !answeredQuizTimestamps.has(quiz.timestampSeconds) &&
          !activeQuiz
        ) {
          videoRef.current.pause();
          setActiveQuiz(quiz);
          setSelectedOption(null);
          setQuizSubmitted(false);
          break;
        }
      }
    }
  };

  // Jump to video timestamp from transcript
  const handleSeekVideo = (timestampSeconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestampSeconds;
      videoRef.current.play();
    }
  };

  // Submit In-Video Quiz
  const handleQuizSubmit = () => {
    if (selectedOption === null || !activeQuiz) return;
    setQuizSubmitted(true);
  };

  const handleContinueVideo = () => {
    if (activeQuiz) {
      setAnsweredQuizTimestamps((prev) => new Set(prev).add(activeQuiz.timestampSeconds));
      setActiveQuiz(null);
      if (videoRef.current) videoRef.current.play();
    }
  };

  // Save Personal Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlightText.trim() || !activeItem) return;
    setSavingNote(true);
    try {
      const learningClient = getRpcClient(LearningService);
      const res = await learningClient.savePersonalNote({
        userId: getActiveUserId(),
        courseId,
        itemId: activeItem.id,
        highlightedText: highlightText,
        noteComment: noteComment,
      });
      if (res.note) {
        setNotes((prev) => [res.note!, ...prev]);
        setHighlightText("");
        setNoteComment("");
      }
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setSavingNote(false);
    }
  };

  // Reset My Deadlines
  const handleResetDeadlines = async () => {
    try {
      const learningClient = getRpcClient(LearningService);
      const res = await learningClient.resetDeadlines({ userId: getActiveUserId(), courseId });
      if (res.updatedProgress) {
        setProgress(res.updatedProgress);
      }
    } catch (err) {
      console.error("Failed to reset deadlines:", err);
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang mở Trình phát bài học...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden transition-colors duration-200">
      {/* Top Player Navbar */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href={`/courses/${course.id}`}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Quay lại khóa học"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-md">{course.title}</span>
        </div>

        <div className="flex items-center gap-4">
          {progress && (
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="w-24 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.overallProgressPercent}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                {progress.overallProgressPercent}%
              </span>
            </div>
          )}

          <ThemeToggle />

          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Coach Active
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Course Content Navigation Tree */}
        <aside className="w-80 bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 overflow-y-auto flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Chương trình bài học</h2>
          </div>

          <div className="p-4 space-y-6">
            {(() => {
              const allItemsInCourse: LearningItem[] = [];
              course.weekModules.forEach((wm) => {
                wm.lessons.forEach((l) => {
                  allItemsInCourse.push(...l.items);
                });
              });

              return course.weekModules.map((week) => (
                <div key={week.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-blue-600 dark:text-blue-400">Tuần {week.weekNumber}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{week.title}</span>
                  </div>

                  {week.lessons.map((lesson) => (
                    <div key={lesson.id} className="space-y-1">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2 py-1">{lesson.title}</div>
                      <div className="space-y-1 pl-2">
                        {lesson.items.map((item) => {
                          const isActive = activeItem?.id === item.id;
                          const isDone = progress?.completedItemIds.includes(item.id);

                          const itemIndex = allItemsInCourse.findIndex((i) => i.id === item.id);
                          const prevItem = itemIndex > 0 ? allItemsInCourse[itemIndex - 1] : null;
                          const isUnlocked =
                            itemIndex <= 0 ||
                            (prevItem && progress?.completedItemIds.includes(prevItem.id));

                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (!isUnlocked) {
                                  setLockNotice(
                                    `🔒 Bài học "${item.title}" đang bị khóa. Bạn cần hoàn thành bài học "${prevItem?.title || "trước đó"}" trước.`
                                  );
                                  return;
                                }
                                setLockNotice("");
                                setActiveItem(item);
                                setActiveQuiz(null);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                                isActive
                                  ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-500/30"
                                  : !isUnlocked
                                  ? "opacity-50 hover:bg-transparent cursor-not-allowed text-slate-400 dark:text-slate-600"
                                  : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              <span className="truncate flex items-center gap-2">
                                {isDone ? (
                                  <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : !isUnlocked ? (
                                  <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                ) : item.type === 1 ? (
                                  <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  </svg>
                                ) : item.type === 2 ? (
                                  <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                ) : item.type === 5 ? (
                                  <svg className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                  </svg>
                                ) : item.type === 6 ? (
                                  <svg className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                )}
                                <span className={isDone ? "line-through opacity-80" : ""}>{item.title}</span>
                              </span>
                              <span className="text-[10px] opacity-60">{item.estimatedMinutes}m</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        </aside>

        {/* Center Workspace & Bottom Panels */}
        <main className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden relative">
          {/* Lock Notice Banner */}
          {lockNotice && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-900/80 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between px-6 z-20 animate-in fade-in duration-200">
              <span>{lockNotice}</span>
              <button
                onClick={() => setLockNotice("")}
                className="text-amber-800 dark:text-amber-300 hover:opacity-75 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Video / Reading Media Viewer */}
          <div className="flex-1 bg-slate-100 dark:bg-black flex items-center justify-center relative overflow-hidden transition-colors duration-200">
            <VideoPlayer
              videoRef={videoRef}
              activeItem={activeItem}
              userId={getActiveUserId()}
              activeQuiz={activeQuiz}
              selectedOption={selectedOption}
              quizSubmitted={quizSubmitted}
              completedItemIds={progress?.completedItemIds || []}
              onTimeUpdate={handleTimeUpdate}
              onSelectOption={setSelectedOption}
              onSubmitQuiz={handleQuizSubmit}
              onContinueVideo={handleContinueVideo}
              onMarkComplete={handleMarkItemComplete}
            />
          </div>

          {/* Bottom Tabs Section */}
          <div className="h-64 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0">
            {/* Tab Header Bar */}
            <div className="h-11 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setActiveTab("transcript")}
                  className={`text-xs font-bold tracking-wide transition-colors py-3 border-b-2 inline-flex items-center gap-1.5 ${
                    activeTab === "transcript"
                      ? "text-blue-600 dark:text-blue-400 border-blue-500"
                      : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Interactive Transcript ({activeItem?.interactiveTranscripts.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("notes")}
                  className={`text-xs font-bold tracking-wide transition-colors py-3 border-b-2 inline-flex items-center gap-1.5 ${
                    activeTab === "notes"
                      ? "text-blue-600 dark:text-blue-400 border-blue-500"
                      : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Personal Notes ({notes.length})
                </button>
                <button
                  onClick={() => setActiveTab("deadlines")}
                  className={`text-xs font-bold tracking-wide transition-colors py-3 border-b-2 inline-flex items-center gap-1.5 ${
                    activeTab === "deadlines"
                      ? "text-blue-600 dark:text-blue-400 border-blue-500"
                      : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Deadlines & Tiến độ
                </button>
              </div>
            </div>

            {/* Tab Body Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
              {activeTab === "transcript" && (
                <TranscriptPanel
                  activeItem={activeItem}
                  currentTime={currentTime}
                  onSeekVideo={handleSeekVideo}
                />
              )}

              {activeTab === "notes" && (
                <NotesPanel
                  notes={notes}
                  highlightText={highlightText}
                  noteComment={noteComment}
                  savingNote={savingNote}
                  onHighlightTextChange={setHighlightText}
                  onNoteCommentChange={setNoteComment}
                  onSaveNote={handleSaveNote}
                />
              )}

              {activeTab === "deadlines" && (
                <DeadlinesPanel
                  progress={progress}
                  onResetDeadlines={handleResetDeadlines}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
