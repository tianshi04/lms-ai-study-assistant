"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
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
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const handleTabClick = (tab: "transcript" | "forum" | "notes" | "deadlines") => {
    if (isPanelOpen && activeTab === tab) {
      setIsPanelOpen(false);
    } else {
      setActiveTab(tab);
      setIsPanelOpen(true);
    }
  };
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

  // Calculate prev and next learning items in course order
  const allItems: LearningItem[] = useMemo(() => {
    if (!course?.weekModules) return [];
    const items: LearningItem[] = [];
    course.weekModules.forEach((wm) => {
      wm.lessons.forEach((l) => {
        items.push(...l.items);
      });
    });
    return items;
  }, [course]);

  const activeIndexInCourse = useMemo(() => {
    if (!activeItem) return -1;
    return allItems.findIndex((i) => i.id === activeItem.id);
  }, [allItems, activeItem]);

  const prevItem = activeIndexInCourse > 0 ? allItems[activeIndexInCourse - 1] : null;
  const nextItem =
    activeIndexInCourse >= 0 && activeIndexInCourse < allItems.length - 1
      ? allItems[activeIndexInCourse + 1]
      : null;

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
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>{"Đóng Xem trước"}</span>
              </button>
            ) : (
              <Link
                href={`/courses/${course.id}`}
                className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
                title="Quay lại khóa học"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
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
                  <svg
                    className="w-4 h-4 text-warning-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.25}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
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
        <div className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden">
          {/* Left Sidebar - Course Content Navigation Tree */}
          {!isPreviewMode && (
            <aside className="w-80 shrink-0 bg-card/95 border-r border-border overflow-y-auto flex flex-col">
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
                              const _isUnlocked =
                                itemIndex <= 0 ||
                                (prevItem && progress?.completedItemIds.includes(prevItem.id));

                              return (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    setLockNotice("");
                                    setActiveItem(item);
                                    setActiveQuiz(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                                    isActive
                                      ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                      : "hover:bg-muted text-muted-foreground"
                                  }`}
                                >
                                  <span className="truncate flex items-center gap-2">
                                    {isDone ? (
                                      <svg
                                        className="w-3.5 h-3.5 text-success flex-shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2.5}
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    ) : item.type === 1 ? (
                                      <svg
                                        className="w-3.5 h-3.5 text-primary flex-shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                        />
                                      </svg>
                                    ) : item.type === 2 ? (
                                      <svg
                                        className="w-3.5 h-3.5 text-success flex-shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                    ) : item.type === 5 ? (
                                      <svg
                                        className="w-3.5 h-3.5 text-accent flex-shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                                        />
                                      </svg>
                                    ) : item.type === 6 ? (
                                      <svg
                                        className="w-3.5 h-3.5 text-primary flex-shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        className="w-3.5 h-3.5 text-warning flex-shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                      </svg>
                                    )}
                                    <span className={isDone ? "font-bold text-foreground" : ""}>
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

          {/* Center Workspace & Bottom Controls */}
          <main className="flex-1 min-w-[360px] flex flex-col bg-background overflow-hidden relative text-foreground">
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

            {/* Center Video & Bottom Control Bar Layout */}
            <div className="flex-1 flex flex-col items-center justify-between relative overflow-y-auto p-6 transition-colors duration-200">
              <div className="w-full flex-1 flex items-center justify-center min-h-[360px]">
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

              {/* Bottom Control Bar */}
              <div className="w-full max-w-5xl mt-4 flex items-center justify-between bg-card border border-border p-3 rounded-2xl shadow-2xs z-10">
                {prevItem ? (
                  <button
                    onClick={() => setActiveItem(prevItem)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={prevItem.title}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    <span>{"Bài trước"}</span>
                  </button>
                ) : (
                  <div />
                )}

                {nextItem ? (
                  <button
                    onClick={() => setActiveItem(nextItem)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground transition-colors shadow-md flex items-center gap-2 cursor-pointer"
                    title={nextItem.title}
                  >
                    <span>{"Bài tiếp theo"}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground font-semibold">
                    {"Đã đến bài học cuối cùng"}
                  </span>
                )}
              </div>
            </div>
          </main>

          {/* Right Side Drawer Panel (Coursera-style Side-by-Side Video & Transcript/Tools) */}
          {isPanelOpen &&
            (!isPreviewMode ||
              (activeItem?.interactiveTranscripts &&
                activeItem.interactiveTranscripts.length > 0) ||
              activeItem?.vttSubtitleUrl) && (
              <aside className="w-80 xl:w-96 bg-card border-l border-border flex flex-col shrink-0 h-full z-10 transition-all duration-200">
                {/* Drawer Header */}
                <div className="h-14 border-b border-border px-4 flex items-center justify-between bg-muted/30 shrink-0">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    {activeTab === "transcript" && "Phụ đề Tương tác"}
                    {activeTab === "forum" && "Thảo luận Bài học"}
                    {activeTab === "notes" && "Ghi chú Cá nhân"}
                    {activeTab === "deadlines" && "Deadlines & Tiến độ"}
                  </h3>
                  <button
                    onClick={() => setIsPanelOpen(false)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Đóng bảng công cụ"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-background min-h-0 flex flex-col">
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
              </aside>
            )}

          {/* Coursera-style Vertical Icon Strip (Far Right Strip) */}
          <div className="w-16 lg:w-20 bg-card border-l border-border flex flex-col items-center justify-start py-4 gap-4 shrink-0 h-full z-20 select-none">
            {/* Transcript Icon Button */}
            <button
              onClick={() => handleTabClick("transcript")}
              className={`w-14 lg:w-16 py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                isPanelOpen && activeTab === "transcript"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title="Phụ đề"
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
              <span className="text-[10px] tracking-tight leading-none">Phụ đề</span>
            </button>

            {!isPreviewMode && (
              <>
                {/* Notes Icon Button */}
                <button
                  onClick={() => handleTabClick("notes")}
                  className={`w-14 lg:w-16 py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isPanelOpen && activeTab === "notes"
                      ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  title="Ghi chú"
                >
                  <svg
                    className="w-5 h-5 mb-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span className="text-[10px] tracking-tight leading-none">Ghi chú</span>
                </button>

                {/* Forum Icon Button */}
                <button
                  onClick={() => handleTabClick("forum")}
                  className={`w-14 lg:w-16 py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isPanelOpen && activeTab === "forum"
                      ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  title="Thảo luận"
                >
                  <svg
                    className="w-5 h-5 mb-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                    />
                  </svg>
                  <span className="text-[10px] tracking-tight leading-none">Thảo luận</span>
                </button>

                {/* Deadlines Icon Button */}
                <button
                  onClick={() => handleTabClick("deadlines")}
                  className={`w-14 lg:w-16 py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isPanelOpen && activeTab === "deadlines"
                      ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  title="Deadlines"
                >
                  <svg
                    className="w-5 h-5 mb-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-[10px] tracking-tight leading-none">Deadlines</span>
                </button>
              </>
            )}
          </div>
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
