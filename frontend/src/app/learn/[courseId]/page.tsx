"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course, type LearningItem, type InVideoQuiz } from "@/gen/catalog/v1/catalog_pb";
import { LearningService, type LearningProgress, type PersonalNote } from "@/gen/learning/v1/learning_pb";

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
            {activeItem?.type === 1 && activeItem.videoUrl ? (
              <div className="w-full h-full relative flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={activeItem.videoUrl}
                  controls
                  onTimeUpdate={handleTimeUpdate}
                  className="max-h-full max-w-full object-contain"
                />

                {/* In-Video Quiz Overlay Interruption Modal */}
                {activeQuiz && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-6">
                    <div className="bg-slate-900 border border-slate-700 max-w-lg w-full p-6 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                          ⚡ In-Video Quiz Interruption
                        </span>
                        <span className="text-xs font-mono text-slate-400">Timestamp: {activeQuiz.timestampSeconds}s</span>
                      </div>

                      <h3 className="font-bold text-lg text-white">{activeQuiz.question}</h3>

                      <div className="space-y-2">
                        {activeQuiz.options.map((opt, idx) => (
                          <button
                            key={idx}
                            disabled={quizSubmitted}
                            onClick={() => setSelectedOption(idx)}
                            className={`w-full text-left p-3 rounded-xl text-sm transition-all border ${
                              selectedOption === idx
                                ? "bg-blue-600/20 border-blue-500 text-white font-medium"
                                : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                            }`}
                          >
                            <span className="font-mono text-xs font-bold mr-2 text-slate-400">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            {opt}
                          </button>
                        ))}
                      </div>

                      {!quizSubmitted ? (
                        <button
                          disabled={selectedOption === null}
                          onClick={handleQuizSubmit}
                          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm transition-all"
                        >
                          Nộp Trả Lời
                        </button>
                      ) : (
                        <div className="space-y-4 pt-2 border-t border-slate-800">
                          <div
                            className={`p-3.5 rounded-xl text-sm ${
                              selectedOption === activeQuiz.correctOptionIndex
                                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                                : "bg-red-500/10 border border-red-500/30 text-red-300"
                            }`}
                          >
                            <p className="font-bold mb-1">
                              {selectedOption === activeQuiz.correctOptionIndex ? "✅ Chính xác!" : "❌ Chưa chính xác!"}
                            </p>
                            <p className="text-xs opacity-90">{activeQuiz.explanation}</p>
                          </div>

                          <button
                            onClick={handleContinueVideo}
                            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all"
                          >
                            Tiếp tục xem Video ▶
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : activeItem?.type === 2 ? (
              <div className="w-full h-full overflow-y-auto p-8 bg-slate-900 text-slate-200">
                <div className="max-w-3xl mx-auto prose prose-invert">
                  <h2 className="text-2xl font-bold text-white mb-6">{activeItem.title}</h2>
                  <div className="whitespace-pre-line text-slate-300 leading-relaxed text-sm">
                    {activeItem.readingMarkdown}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 p-8">
                Chọn bài học từ cột danh sách bên trái để bắt đầu.
              </div>
            )}
          </div>

          {/* Bottom Tabs Section: Interactive Transcript / Personal Notes / Deadlines */}
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
                <div className="space-y-2 max-w-4xl mx-auto">
                  {!activeItem?.interactiveTranscripts || activeItem.interactiveTranscripts.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">Không có phụ đề tương tác cho bài học này.</p>
                  ) : (
                    activeItem.interactiveTranscripts.map((t, i) => {
                      const isActive =
                        currentTime >= t.timestampSeconds &&
                        (i === activeItem.interactiveTranscripts.length - 1 ||
                          currentTime < activeItem.interactiveTranscripts[i + 1].timestampSeconds);

                      return (
                        <div
                          key={i}
                          onClick={() => handleSeekVideo(t.timestampSeconds)}
                          className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all flex items-start gap-4 ${
                            isActive
                              ? "bg-blue-600/20 text-blue-200 font-medium border-l-4 border-blue-500 pl-3"
                              : "hover:bg-slate-900 text-slate-400"
                          }`}
                        >
                          <span className="font-mono text-blue-400 flex-shrink-0 font-bold">
                            {Math.floor(t.timestampSeconds / 60)}:
                            {(t.timestampSeconds % 60).toString().padStart(2, "0")}
                          </span>
                          <span className="leading-relaxed">{t.text}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "notes" && (
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Create Note Form */}
                  <form onSubmit={handleSaveNote} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tạo ghi chú mới</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Đoạn văn bản bôi đen/cần ghi chú..."
                        value={highlightText}
                        onChange={(e) => setHighlightText(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Lời nhắn/nhận xét cá nhân..."
                        value={noteComment}
                        onChange={(e) => setNoteComment(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingNote || !highlightText.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      {savingNote ? "Đang lưu..." : "Lưu Ghi Chú"}
                    </button>
                  </form>

                  {/* List Saved Notes */}
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-mono text-[10px]">Note ID: {note.id}</span>
                          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-blue-300 font-semibold italic">&quot;{note.highlightedText}&quot;</p>
                        {note.noteComment && <p className="text-slate-300">{note.noteComment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "deadlines" && (
                <div className="max-w-3xl mx-auto space-y-6">
                  {progress && (
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-white">Lịch Nộp Bài Hàng Tuần (Suggested Deadlines)</h4>
                          <p className="text-xs text-slate-400">Duy trì tiến độ học tập để đảm bảo hoàn thành khóa học đúng hạn.</p>
                        </div>
                        {progress.weeklyDeadlines.some((d) => d.status === 2) && (
                          <button
                            onClick={handleResetDeadlines}
                            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all border border-amber-400/30 flex items-center gap-2 animate-pulse"
                          >
                            <span>🔄</span> Reset My Deadlines
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {progress.weeklyDeadlines.map((d) => (
                          <div
                            key={d.weekNumber}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                              d.status === 2
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                : "bg-slate-950 border-slate-800 text-slate-300"
                            }`}
                          >
                            <div>
                              <span className="font-bold block">Tuần {d.weekNumber}</span>
                              <span className="text-[10px] opacity-80">Hạn nộp: {d.dueDate}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                d.status === 2
                                  ? "bg-amber-500 text-slate-950"
                                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              }`}
                            >
                              {d.status === 2 ? "OVERDUE (Quá hạn)" : "ON TRACK"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
