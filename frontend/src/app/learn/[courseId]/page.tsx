"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course, type LearningItem, type InVideoQuiz } from "@/gen/catalog/v1/catalog_pb";
import { LearningService, type LearningProgress, type PersonalNote } from "@/gen/learning/v1/learning_pb";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { TranscriptPanel } from "@/components/player/TranscriptPanel";
import { NotesPanel } from "@/components/player/NotesPanel";
import { DeadlinesPanel } from "@/components/player/DeadlinesPanel";

const DEMO_USER_ID = "user-learner-demo";

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

  // Personal Note State
  const [highlightText, setHighlightText] = useState("");
  const [noteComment, setNoteComment] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Load Course & Progress
  useEffect(() => {
    if (!courseId) return;

    async function loadData() {
      try {
        const catalogClient = getRpcClient(CatalogService);
        const courseRes = await catalogClient.getCourseDetail({ courseId });
        setCourse(courseRes.course ?? null);

        // Set initial item
        const firstItem = courseRes.course?.weekModules[0]?.lessons[0]?.items[0];
        if (firstItem) setActiveItem(firstItem);

        const learningClient = getRpcClient(LearningService);
        const progressRes = await learningClient.getProgress({ userId: DEMO_USER_ID, courseId });
        setProgress(progressRes.progress ?? null);

        const notesRes = await learningClient.listPersonalNotes({ userId: DEMO_USER_ID, courseId });
        setNotes(notesRes.notes);
      } catch (err) {
        console.error("Error loading course player data:", err);
      }
    }
    loadData();
  }, [courseId]);

  // Video timeupdate handler for In-Video Quiz interruption
  const handleTimeUpdate = () => {
    if (!videoRef.current || !activeItem) return;
    const time = Math.floor(videoRef.current.currentTime);
    setCurrentTime(time);

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
        userId: DEMO_USER_ID,
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
      const res = await learningClient.resetDeadlines({ userId: DEMO_USER_ID, courseId });
      if (res.updatedProgress) {
        setProgress(res.updatedProgress);
      }
    } catch (err) {
      console.error("Failed to reset deadlines:", err);
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang mở Trình phát bài học...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Top Player Navbar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href={`/courses/${course.id}`}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Quay lại khóa học"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="font-bold text-sm text-white truncate max-w-md">{course.title}</span>
        </div>

        <div className="flex items-center gap-4">
          {progress && (
            <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                  style={{ width: `${progress.overallProgressPercent}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-blue-400">
                {progress.overallProgressPercent}%
              </span>
            </div>
          )}

          <div className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium">
            AI Coach Active 🤖
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Course Content Navigation Tree */}
        <aside className="w-80 bg-slate-900/95 border-r border-slate-800 overflow-y-auto flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-slate-800/80 bg-slate-900 sticky top-0 z-10">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-400">Chương trình bài học</h2>
          </div>

          <div className="p-4 space-y-6">
            {course.weekModules.map((week) => (
              <div key={week.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-blue-400">Tuần {week.weekNumber}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{week.title}</span>
                </div>

                {week.lessons.map((lesson) => (
                  <div key={lesson.id} className="space-y-1">
                    <div className="text-xs font-semibold text-slate-300 px-2 py-1">{lesson.title}</div>
                    <div className="space-y-1 pl-2">
                      {lesson.items.map((item) => {
                        const isActive = activeItem?.id === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveItem(item);
                              setActiveQuiz(null);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                              isActive
                                ? "bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30"
                                : "hover:bg-slate-800/60 text-slate-400"
                            }`}
                          >
                            <span className="truncate flex items-center gap-2">
                              <span>{item.type === 1 ? "🎬" : item.type === 2 ? "📄" : "✏️"}</span>
                              {item.title}
                            </span>
                            <span className="text-[10px] opacity-60">{item.estimatedMinutes}m</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Center Workspace & Bottom Panels */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          {/* Top Video / Reading Media Viewer */}
          <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
            <VideoPlayer
              videoRef={videoRef}
              activeItem={activeItem}
              activeQuiz={activeQuiz}
              selectedOption={selectedOption}
              quizSubmitted={quizSubmitted}
              onTimeUpdate={handleTimeUpdate}
              onSelectOption={setSelectedOption}
              onSubmitQuiz={handleQuizSubmit}
              onContinueVideo={handleContinueVideo}
            />
          </div>

          {/* Bottom Tabs Section */}
          <div className="h-64 bg-slate-900 border-t border-slate-800 flex flex-col flex-shrink-0">
            {/* Tab Header Bar */}
            <div className="h-11 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setActiveTab("transcript")}
                  className={`text-xs font-bold tracking-wide transition-colors py-3 border-b-2 ${
                    activeTab === "transcript"
                      ? "text-blue-400 border-blue-500"
                      : "text-slate-400 border-transparent hover:text-slate-200"
                  }`}
                >
                  📝 Interactive Transcript ({activeItem?.interactiveTranscripts.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("notes")}
                  className={`text-xs font-bold tracking-wide transition-colors py-3 border-b-2 ${
                    activeTab === "notes"
                      ? "text-blue-400 border-blue-500"
                      : "text-slate-400 border-transparent hover:text-slate-200"
                  }`}
                >
                  📌 Personal Notes ({notes.length})
                </button>
                <button
                  onClick={() => setActiveTab("deadlines")}
                  className={`text-xs font-bold tracking-wide transition-colors py-3 border-b-2 ${
                    activeTab === "deadlines"
                      ? "text-blue-400 border-blue-500"
                      : "text-slate-400 border-transparent hover:text-slate-200"
                  }`}
                >
                  ⏰ Deadlines & Tiến độ
                </button>
              </div>
            </div>

            {/* Tab Body Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
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
