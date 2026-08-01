"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DirectionalTransition } from "@/components/transitions/DirectionalTransition";
import { getRpcClient } from "@/lib/connect_client";
import {
  CatalogService,
  type Course,
  type LearningItem,
  type InVideoQuiz,
} from "@/gen/catalog/v1/catalog_pb";
import {
  LearningService,
  type LearningProgress,
  type PersonalNote,
} from "@/gen/learning/v1/learning_pb";
import { CertificateService } from "@/gen/certificate/v1/certificate_pb";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { TranscriptPanel } from "@/components/player/TranscriptPanel";
import { NotesPanel } from "@/components/player/NotesPanel";
import { DeadlinesPanel } from "@/components/player/DeadlinesPanel";
import { ForumTab } from "@/components/player/ForumTab";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { LanguageToggle } from "@/components/providers/LanguageToggle";
import { CourseCompletionModal } from "@/components/course/CourseCompletionModal";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  X,
  ChevronLeft,
  CheckCircle2,
  Check,
  Lock,
  Play,
  FileText,
  Code,
  Users,
  Edit3,
  AlignLeft,
  MessageSquare,
  Bookmark,
  Clock,
} from "lucide-react";

function CoursePlayerContent() {
  const { isAuthenticated, userId: authUserId } = useAuth();
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;

  const searchParams = useSearchParams();
  const previewItemId = searchParams?.get("itemId") || null;
  const isPreviewMode = searchParams?.get("preview") === "true";

  const [userId, setUserId] = useState<string>("");

  const [course, setCourse] = useState<Course | null>(null);
  const [activeItem, setActiveItem] = useState<LearningItem | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [activeTab, setActiveTab] = useState<"transcript" | "forum" | "notes" | "deadlines">(
    "transcript",
  );
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [certificateId, setCertificateId] = useState<string>("");

  // Video & In-Video Quiz State
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxTimeRef = useRef<number>(0);
  const isMarkingRef = useRef<boolean>(false);
  const markedItemIdsRef = useRef<Set<string>>(new Set());
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

  // Total course items count
  const totalCourseItems =
    course?.weekModules.reduce(
      (acc, wm) => acc + wm.lessons.reduce((lAcc, l) => lAcc + l.items.length, 0),
      0,
    ) || 1;

  // Mark Item as Complete
  const handleMarkItemComplete = useCallback(
    async (itemId: string) => {
      if (isPreviewMode) {
        console.log("Preview mode: skipping mark item complete logic");
        return;
      }
      if (!course || !progress || isMarkingRef.current) return;
      isMarkingRef.current = true;
      try {
        const learningClient = getRpcClient(LearningService);
        const res = await learningClient.markItemComplete({
          courseId,
          itemId,
          totalCourseItems,
        });
        if (res.updatedProgress) {
          setProgress(res.updatedProgress);
          if (
            res.updatedProgress.overallProgressPercent >= 100 ||
            res.updatedProgress.completedItemIds.length >= totalCourseItems
          ) {
            try {
              const certClient = getRpcClient(CertificateService);
              const certRes = await certClient.getVerifiedCertificate({ courseId });
              if (certRes.certificate?.certificateId) {
                setCertificateId(certRes.certificate.certificateId);
              } else {
                setCertificateId("");
              }
            } catch (err) {
              console.error("Failed to load certificate on completion:", err);
              setCertificateId("");
            }
            setShowCompletionModal(true);
          }
        }
      } catch (err) {
        console.error("Failed to mark item complete:", err);
      } finally {
        isMarkingRef.current = false;
      }
    },
    [course, progress, totalCourseItems, courseId, isPreviewMode],
  );

  // Load Course & Progress
  useEffect(() => {
    if (!courseId) return;

    // Strict Auth Guard Check
    if (!isAuthenticated) {
      const redirectUrl = `/learn/${courseId}${previewItemId ? `?itemId=${previewItemId}` : ""}${isPreviewMode ? (previewItemId ? "&preview=true" : "?preview=true") : ""}`;
      router.push(`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    const effectiveUserId = authUserId || "";

    async function loadData() {
      if (effectiveUserId) {
        setUserId(effectiveUserId);
      }
      try {
        const catalogClient = getRpcClient(CatalogService);
        const learningClient = getRpcClient(LearningService);

        // Fetch course details, progress, and personal notes in parallel to eliminate waterfalls
        const [courseRes, progressRes, notesRes] = await Promise.all([
          catalogClient.getCourseDetail({ idOrSlug: courseId }),
          isPreviewMode ? Promise.resolve(null) : learningClient.getProgress({ courseId }),
          isPreviewMode ? Promise.resolve(null) : learningClient.listPersonalNotes({ courseId }),
        ]);

        setCourse(courseRes.course ?? null);

        // Set initial item based on previewItemId if provided
        let selectedItem = null;
        if (previewItemId && courseRes.course?.weekModules) {
          for (const wm of courseRes.course.weekModules) {
            for (const l of wm.lessons) {
              const found = l.items.find((item) => item.id === previewItemId);
              if (found) {
                selectedItem = found;
                break;
              }
            }
            if (selectedItem) break;
          }
        }

        if (!selectedItem) {
          selectedItem = courseRes.course?.weekModules[0]?.lessons[0]?.items[0] || null;
        }
        setActiveItem(selectedItem);

        if (isPreviewMode) {
          // Set mock empty progress for preview
          setProgress({
            userId: effectiveUserId || "preview-user",
            courseId,
            overallProgressPercent: 0,
            completedItemIds: [],
            lastResetAt: "",
          } as unknown as LearningProgress);
        } else {
          setProgress(progressRes?.progress ?? null);

          if (progressRes?.progress && progressRes.progress.overallProgressPercent >= 100) {
            try {
              const certClient = getRpcClient(CertificateService);
              const certRes = await certClient.getVerifiedCertificate({ courseId });
              if (certRes.certificate?.certificateId) {
                setCertificateId(certRes.certificate.certificateId);
              }
            } catch (err) {
              console.error("Failed to load certificate on load:", err);
            }
          }

          setNotes(notesRes?.notes || []);
        }
      } catch (err) {
        console.error("Error loading course player data:", err);
      }
    }
    loadData();
  }, [courseId, router, previewItemId, isPreviewMode]);

  // Reset in-video quiz state when switching learning items
  const activeItemId = activeItem?.id;
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setCurrentTime(0);
    maxTimeRef.current = 0;
    setActiveQuiz(null);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setAnsweredQuizTimestamps(new Set());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeItemId]);

  // Mark Item as Complete is now moved above useEffect hooks.

  // Video timeupdate handler for In-Video Quiz interruption & Auto Progress Update at 80%
  const handleTimeUpdate = () => {
    if (!videoRef.current || !activeItem) return;

    const video = videoRef.current;
    if (video.currentTime > maxTimeRef.current) {
      maxTimeRef.current = video.currentTime;
    }

    const time = Math.floor(video.currentTime);
    setCurrentTime(video.currentTime);

    // Auto mark as completed if watched >= 80% of video duration
    if (
      videoRef.current.duration > 0 &&
      videoRef.current.currentTime >= videoRef.current.duration * 0.8 &&
      !progress?.completedItemIds.includes(activeItem.id) &&
      !markedItemIdsRef.current.has(activeItem.id)
    ) {
      markedItemIdsRef.current.add(activeItem.id);
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

  // Video seeking handler
  const handleSeeking = () => {
    if (!videoRef.current || !activeItem) return;
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
      const res = await learningClient.resetDeadlines({ courseId });
      if (res.updatedProgress) {
        setProgress(res.updatedProgress);
      }
    } catch (err) {
      console.error("Failed to reset deadlines:", err);
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span aria-live="polite">Đang mở Trình phát bài học…</span>
        </div>
      </div>
    );
  }

  return (
    <DirectionalTransition>
      <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden transition-colors duration-200">
        {/* Top Player Navbar */}
        <header className="h-14 bg-card border-b border-border px-6 flex items-center justify-between flex-shrink-0 z-30">
          <div className="flex items-center gap-4 min-w-0">
            {isPreviewMode ? (
              <button
                onClick={() => window.close()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold transition-colors cursor-pointer"
                title="Đóng trình xem trước"
              >
                <X className="w-4 h-4" />
                <span>{"Đóng Xem trước"}</span>
              </button>
            ) : (
              <Link
                href={`/courses/${course.id}`}
                className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
                title="Quay lại khóa học"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
            )}
            <span className="font-bold text-sm text-foreground truncate max-w-md">
              {isPreviewMode ? `Xem trước: ${activeItem?.title || course.title}` : course.title}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {!isPreviewMode && progress && (
              <div className="flex items-center gap-3 bg-muted px-3 py-1.5 rounded-lg border border-border">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress.overallProgressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-primary">
                  {progress.overallProgressPercent}%
                </span>
              </div>
            )}

            {!isPreviewMode &&
              progress &&
              (progress.overallProgressPercent >= 100 ||
                progress.completedItemIds.length >= totalCourseItems) && (
                <button
                  onClick={() => setShowCompletionModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-warning hover:bg-warning-hover text-warning-foreground font-bold text-xs shadow-sm hover:shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-warning-foreground" />
                  <span>{"Xem Chứng Chỉ"}</span>
                </button>
              )}

            {isPreviewMode && (
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase bg-warning/10 text-warning border border-warning/20 animate-pulse">
                {"Xem trước học liệu"}
              </span>
            )}

            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        {/* Main Workspace Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Course Content Navigation Tree */}
          {!isPreviewMode && (
            <aside className="w-80 bg-card/95 border-r border-border overflow-y-auto flex-shrink-0 flex flex-col">
              <div className="p-4 border-b border-border bg-muted/50 sticky top-0 z-10">
                <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  {"Lộ trình Bài học"}
                </h2>
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
                        <span className="text-xs font-extrabold uppercase text-primary">
                          {"Tuần {week}".replace("{week}", week.weekNumber.toString())}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {week.title}
                        </span>
                      </div>

                      {week.lessons.map((lesson) => (
                        <div key={lesson.id} className="space-y-1">
                          <div className="text-xs font-semibold text-foreground px-2 py-1">
                            {lesson.title}
                          </div>
                          <div className="space-y-1 pl-2">
                            {lesson.items.map((item) => {
                              const isActive = activeItem?.id === item.id;
                              const isDone = progress?.completedItemIds.includes(item.id);

                              const itemIndex = allItemsInCourse.findIndex((i) => i.id === item.id);
                              const prevItem =
                                itemIndex > 0 ? allItemsInCourse[itemIndex - 1] : null;
                              const isUnlocked =
                                itemIndex <= 0 ||
                                (prevItem && progress?.completedItemIds.includes(prevItem.id));

                              return (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    if (!isUnlocked) {
                                      setLockNotice(
                                        'Bài học "{title}" đang bị khóa. Bạn cần hoàn thành bài học "{prevTitle}" trước.'
                                          .replace("{title}", item.title)
                                          .replace("{prevTitle}", prevItem?.title || ""),
                                      );
                                      setTimeout(() => setLockNotice(""), 4000);
                                      return;
                                    }
                                    setLockNotice("");
                                    setActiveItem(item);
                                    setActiveQuiz(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                                    isActive
                                      ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                      : !isUnlocked
                                        ? "opacity-50 hover:bg-transparent cursor-not-allowed text-muted-foreground"
                                        : "hover:bg-muted text-muted-foreground"
                                  }`}
                                >
                                  <span className="truncate flex items-center gap-2">
                                    {isDone ? (
                                      <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
                                    ) : !isUnlocked ? (
                                      <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    ) : item.type === 1 ? (
                                      <Play className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                    ) : item.type === 2 ? (
                                      <FileText className="w-3.5 h-3.5 text-success flex-shrink-0" />
                                    ) : item.type === 5 ? (
                                      <Code className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                                    ) : item.type === 6 ? (
                                      <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                    ) : (
                                      <Edit3 className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                                    )}
                                    <span className={isDone ? "line-through opacity-80" : ""}>
                                      {item.title}
                                    </span>
                                  </span>
                                  <span className="text-[10px] opacity-60">
                                    {item.estimatedMinutes}m
                                  </span>
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
          )}

          {/* Center Workspace & Bottom Panels */}
          <main className="flex-1 flex flex-col bg-background overflow-hidden relative text-foreground">
            {/* Lock Notice Banner */}
            {lockNotice && (
              <div className="p-3 bg-warning/10 border-b border-warning/30 text-warning text-xs font-semibold flex items-center justify-between px-6 z-20 animate-in fade-in duration-200">
                <span>{lockNotice}</span>
                <button
                  onClick={() => setLockNotice("")}
                  className="text-warning hover:opacity-75 font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Top Video / Reading Media Viewer */}
            <div className="flex-1 bg-card flex items-center justify-center relative overflow-hidden transition-colors duration-200">
              <VideoPlayer
                videoRef={videoRef}
                activeItem={activeItem}
                userId={userId}
                activeQuiz={activeQuiz}
                selectedOption={selectedOption}
                quizSubmitted={quizSubmitted}
                completedItemIds={progress?.completedItemIds || []}
                currentTime={currentTime}
                onTimeUpdate={handleTimeUpdate}
                onSeeking={handleSeeking}
                onSelectOption={setSelectedOption}
                onSubmitQuiz={handleQuizSubmit}
                onContinueVideo={handleContinueVideo}
                onMarkComplete={handleMarkItemComplete}
                isPreviewMode={isPreviewMode}
              />
            </div>

            {/* Bottom Tabs Section */}
            {(!isPreviewMode ||
              (activeItem?.interactiveTranscripts &&
                activeItem.interactiveTranscripts.length > 0) ||
              activeItem?.vttSubtitleUrl) && (
              <div className="h-64 bg-card border-t border-border flex flex-col flex-shrink-0">
                {/* Tab Header Bar */}
                <div className="h-11 border-b border-border px-6 flex items-center justify-between bg-muted/50">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setActiveTab("transcript")}
                      className={`text-xs font-bold tracking-wide transition-colors py-3 border-b-2 inline-flex items-center gap-1.5 cursor-pointer ${
                        activeTab === "transcript"
                          ? "text-primary border-primary"
                          : "text-muted-foreground border-transparent hover:text-foreground"
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      {"Phụ đề Tương tác ({count})".replace(
                        "{count}",
                        (activeItem?.interactiveTranscripts.length || 0).toString(),
                      )}
                    </button>

                    {!isPreviewMode && (
                      <>
                        <button
                          onClick={() => setActiveTab("forum")}
                          className={`text-xs font-bold tracking-wide transition-colors py-3 border-b-2 inline-flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "forum"
                              ? "text-primary border-primary"
                              : "text-muted-foreground border-transparent hover:text-foreground"
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {"Thảo luận"}
                        </button>
                        <button
                          onClick={() => setActiveTab("notes")}
                          className={`text-xs font-bold tracking-wide transition-colors py-3 border-b-2 inline-flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "notes"
                              ? "text-primary border-primary"
                              : "text-muted-foreground border-transparent hover:text-foreground"
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          {"Ghi chú Cá nhân ({count})".replace("{count}", notes.length.toString())}
                        </button>
                        <button
                          onClick={() => setActiveTab("deadlines")}
                          className={`text-xs font-bold tracking-wide transition-colors py-3 border-b-2 inline-flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "deadlines"
                              ? "text-primary border-primary"
                              : "text-muted-foreground border-transparent hover:text-foreground"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {"Deadlines & Tiến độ"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Tab Body Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-background">
                  {activeTab === "transcript" && (
                    <TranscriptPanel
                      activeItem={activeItem}
                      currentTime={currentTime}
                      onSeekVideo={handleSeekVideo}
                    />
                  )}

                  {!isPreviewMode && activeTab === "forum" && (
                    <ForumTab courseId={courseId} itemId={activeItem?.id || ""} />
                  )}

                  {!isPreviewMode && activeTab === "notes" && (
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

                  {!isPreviewMode && activeTab === "deadlines" && (
                    <DeadlinesPanel progress={progress} onResetDeadlines={handleResetDeadlines} />
                  )}
                </div>
              </div>
            )}
          </main>
        </div>

        <CourseCompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          courseId={courseId}
          courseTitle={course?.title || "Khóa học LMS"}
          certificateId={certificateId || `CERT-${courseId.replace("course-", "").toUpperCase()}`}
        />
      </div>
    </DirectionalTransition>
  );
}

export default function CoursePlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span aria-live="polite">Đang mở Trình phát bài học…</span>
          </div>
        </div>
      }
    >
      <CoursePlayerContent />
    </Suspense>
  );
}
