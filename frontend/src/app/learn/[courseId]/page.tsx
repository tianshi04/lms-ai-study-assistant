"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { DirectionalTransition } from "@/components/transitions/DirectionalTransition";
import { CourseCompletionModal } from "@/components/course/CourseCompletionModal";
import { X, ChevronLeft, ChevronDown, ChevronUp, CheckCircle2, Check, Lock } from "lucide-react";

function getItemTypeName(type: number): string {
  switch (type) {
    case 1:
      return "Video";
    case 2:
      return "Reading";
    case 3:
      return "Practice Quiz";
    case 4:
      return "Graded Quiz";
    case 5:
      return "Lab";
    case 6:
      return "Peer Review";
    case 7:
      return "SCORM";
    default:
      return "Item";
  }
}

function CoursePlayerContent() {
  const params = useParams();
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});
  const prevActiveItemIdRef = useRef<string | null>(null);

  const toggleWeek = (weekId: string) => {
    setCollapsedWeeks((prev) => ({
      ...prev,
      [weekId]: !prev[weekId],
    }));
  };

  const isWeekUnlocked = useCallback(
    (weekIndex: number): boolean => {
      if (isPreviewMode || weekIndex === 0 || !course) return true;
      for (let k = 0; k < weekIndex; k++) {
        const precedingWeek = course.weekModules[k];
        if (!precedingWeek) continue;
        const allPrecedingItems = precedingWeek.lessons.flatMap((l) => l.items);
        const allDone = allPrecedingItems.every((item) =>
          progress?.completedItemIds.includes(item.id),
        );
        if (!allDone) return false;
      }
      return true;
    },
    [course, progress, isPreviewMode],
  );

  useEffect(() => {
    if (course && activeItem && activeItem.id !== prevActiveItemIdRef.current) {
      prevActiveItemIdRef.current = activeItem.id;
      const parentWeek = course.weekModules.find((wm) =>
        wm.lessons.some((l) => l.items.some((i) => i.id === activeItem.id)),
      );
      if (parentWeek) {
        setCollapsedWeeks((prev) => {
          if (prev[parentWeek.id]) {
            const next = { ...prev };
            delete next[parentWeek.id];
            return next;
          }
          return prev;
        });
      }
    }
  }, [activeItem, course]);

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
  const isVideoItem = activeItem?.type === 1 || Boolean(activeItem?.videoUrl);
  const isLectureItem = isVideoItem || activeItem?.type === 2;

  // Auto-adjust activeTab when activeItem changes if the activeTab is not supported
  useEffect(() => {
    if (!activeItem) return;
    if (activeTab === "transcript" && !isVideoItem) {
      if (isLectureItem) {
        setActiveTab("notes");
      } else {
        setActiveTab("deadlines");
      }
    } else if ((activeTab === "notes" || activeTab === "forum") && !isLectureItem) {
      setActiveTab("deadlines");
    }
  }, [activeItem, activeTab, isVideoItem, isLectureItem]);

  // Total course items count
  const totalCourseItems =
    course?.weekModules.reduce(
      (acc, wm) => acc + wm.lessons.reduce((lAcc, l) => lAcc + l.items.length, 0),
      0,
    ) || 1;

  // Flatten all course items for Coursera-style Previous / Next navigation
  const allCourseItems = useMemo(() => {
    if (!course) return [];
    const items: LearningItem[] = [];
    course.weekModules.forEach((wm) => {
      wm.lessons.forEach((l) => {
        l.items.forEach((i) => {
          items.push(i);
        });
      });
    });
    return items;
  }, [course]);

  const currentItemIndex = useMemo(() => {
    return allCourseItems.findIndex((i: LearningItem) => i.id === activeItem?.id);
  }, [allCourseItems, activeItem]);

  const nextItem =
    currentItemIndex !== -1 && currentItemIndex < allCourseItems.length - 1
      ? allCourseItems[currentItemIndex + 1]
      : null;

  // Mark Item as Complete
  const handleMarkItemComplete = useCallback(
    async (itemId: string) => {
      if (isPreviewMode) {
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

  const scormTrackingRef = useRef<Record<string, string>>({
    "cmi.core.lesson_status": "not attempted",
    "cmi.core.score.raw": "0",
    "cmi.core.lesson_location": "",
    "cmi.suspend_data": "",
    "cmi.core.session_time": "",
  });

  useEffect(() => {
    if (!activeItem || (activeItem.type as unknown as number) !== 7) {
      if (typeof window !== "undefined") {
        delete (window as Window & { API?: unknown }).API;
      }
      return;
    }

    if (isPreviewMode) {
      // Mock API Adapter for SCORM
      const apiAdapter = {
        LMSInitialize: () => {
          console.log("SCORM API Mock: LMSInitialize called");
          return "true";
        },
        LMSFinish: () => {
          console.log("SCORM API Mock: LMSFinish called");
          return "true";
        },
        LMSGetValue: (element: string) => {
          console.log(`SCORM API Mock: LMSGetValue(${element})`);
          return "";
        },
        LMSSetValue: (element: string, value: string) => {
          console.log(`SCORM API Mock: LMSSetValue(${element}, ${value})`);
          return "true";
        },
        LMSCommit: () => {
          console.log("SCORM API Mock: LMSCommit called");
          return "true";
        },
        LMSGetLastError: () => 0,
        LMSGetErrorString: () => "No error",
        LMSGetDiagnostic: () => "No diagnostic",
      };
      (window as Window & { API?: unknown }).API = apiAdapter;
      return () => {
        if (typeof window !== "undefined") {
          delete (window as Window & { API?: unknown }).API;
        }
      };
    }

    let active = true;

    async function initScorm() {
      try {
        const learningClient = getRpcClient(LearningService);
        const res = await (learningClient as any).getScormTracking({ itemId: activeItem!.id });
        if (!active) return;

        scormTrackingRef.current = {
          "cmi.core.lesson_status": res.tracking?.cmiCoreLessonStatus || "not attempted",
          "cmi.core.score.raw": String(res.tracking?.cmiCoreScoreRaw || 0.0),
          "cmi.core.lesson_location": res.tracking?.cmiCoreLessonLocation || "",
          "cmi.suspend_data": res.tracking?.cmiSuspendData || "",
          "cmi.core.session_time": res.tracking?.cmiCoreSessionTime || "",
        };

        // Define the SCORM 1.2 API Adapter
        const apiAdapter = {
          LMSInitialize: () => {
            console.log("SCORM API: LMSInitialize called");
            return "true";
          },
          LMSFinish: () => {
            console.log("SCORM API: LMSFinish called");
            saveTracking();
            return "true";
          },
          LMSGetValue: (element: string) => {
            const val = scormTrackingRef.current[element] || "";
            console.log(`SCORM API: LMSGetValue(${element}) -> ${val}`);
            return val;
          },
          LMSSetValue: (element: string, value: string) => {
            console.log(`SCORM API: LMSSetValue(${element}, ${value})`);
            scormTrackingRef.current[element] = value;

            if (
              element === "cmi.core.lesson_status" &&
              (value === "completed" || value === "passed")
            ) {
              if (activeItem && !progress?.completedItemIds.includes(activeItem.id)) {
                handleMarkItemComplete(activeItem.id);
              }
            }
            return "true";
          },
          LMSCommit: () => {
            console.log("SCORM API: LMSCommit called");
            saveTracking();
            return "true";
          },
          LMSGetLastError: () => 0,
          LMSGetErrorString: () => "No error",
          LMSGetDiagnostic: () => "No diagnostic",
        };

        (window as Window & { API?: unknown }).API = apiAdapter;
      } catch (err) {
        console.error("Failed to fetch SCORM tracking data:", err);
      }
    }

    async function saveTracking() {
      if (!activeItem) return;
      try {
        const learningClient = getRpcClient(LearningService);
        await (learningClient as any).saveScormTracking({
          itemId: activeItem.id,
          cmiCoreLessonStatus:
            scormTrackingRef.current["cmi.core.lesson_status"] || "not attempted",
          cmiCoreScoreRaw: parseFloat(scormTrackingRef.current["cmi.core.score.raw"]) || 0.0,
          cmiCoreLessonLocation: scormTrackingRef.current["cmi.core.lesson_location"] || "",
          cmiSuspendData: scormTrackingRef.current["cmi.suspend_data"] || "",
          cmiCoreSessionTime: scormTrackingRef.current["cmi.core.session_time"] || "",
        });
        console.log("SCORM API: Saved tracking progress successfully");
      } catch (err) {
        console.error("Failed to save SCORM tracking progress:", err);
      }
    }

    initScorm();

    return () => {
      active = false;
      saveTracking();
      if (typeof window !== "undefined") {
        delete (window as Window & { API?: unknown }).API;
      }
    };
  }, [activeItem, courseId, progress, handleMarkItemComplete, isPreviewMode]);

  const router = useRouter();

  // Load Course & Progress
  useEffect(() => {
    if (!courseId) return;

    const storedUserId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

    async function loadData() {
      if (storedUserId) {
        setUserId(storedUserId);
      }
      try {
        const catalogClient = getRpcClient(CatalogService);
        const courseRes = await catalogClient.getCourseDetail({ idOrSlug: courseId });
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
            userId: storedUserId || "preview-user",
            courseId,
            overallProgressPercent: 0,
            completedItemIds: [],
            lastResetAt: "",
          } as unknown as LearningProgress);
        } else {
          const learningClient = getRpcClient(LearningService);
          const progressRes = await learningClient.getProgress({ courseId });
          setProgress(progressRes.progress ?? null);

          if (progressRes.progress && progressRes.progress.overallProgressPercent >= 100) {
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

          const notesRes = await learningClient.listPersonalNotes({ courseId });
          setNotes(notesRes.notes);
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
    setCurrentTime(time);

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang mở Trình phát bài học...</span>
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
          {/* Left Sidebar Icon Strip when collapsed */}
          {!isSidebarOpen && !isPreviewMode && (
            <div className="w-14 bg-card border-r border-border flex flex-col items-center py-4 shrink-0 z-20 select-none">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-12 py-2.5 px-1 rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                title="Mở Lộ trình Bài học"
              >
                <svg
                  className="w-5 h-5 mb-1 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                <span className="text-[10px] tracking-tight leading-none font-semibold">
                  Lộ trình
                </span>
              </button>
            </div>
          )}

          {/* Left Sidebar - Course Content Navigation Tree */}
          {isSidebarOpen && !isPreviewMode && (
            <aside className="w-80 bg-card/95 border-r border-border overflow-y-auto flex-shrink-0 flex flex-col transition-all duration-300">
              <div className="p-4 border-b border-border bg-muted/50 sticky top-0 z-10 flex items-center justify-between">
                <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  {"Lộ trình Bài học"}
                </h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-6 h-6 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                  title="Ẩn Lộ trình Bài học"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-4 space-y-6">
                {course.weekModules.map((week, weekIndex) => {
                  const isCollapsed = Boolean(collapsedWeeks[week.id]);
                  const unlocked = isWeekUnlocked(weekIndex);
                  const displayWeekTitle =
                    week.title.startsWith("Tuần") || week.title.startsWith("Week")
                      ? week.title
                      : `Tuần ${week.weekNumber}: ${week.title}`;

                  return (
                    <div key={week.id} className="space-y-3">
                      {/* Module / Week Accordion Header */}
                      <button
                        type="button"
                        onClick={() => toggleWeek(week.id)}
                        className="w-full text-left flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors group cursor-pointer"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold tracking-wide text-muted-foreground group-hover:text-primary transition-colors">
                              {`Module ${week.weekNumber}`}
                            </span>
                            {!unlocked && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                                <Lock className="w-3 h-3" /> Bị khóa
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-extrabold text-foreground group-hover:text-primary transition-colors leading-snug truncate">
                            {displayWeekTitle}
                          </div>
                        </div>
                        <div className="text-muted-foreground group-hover:text-foreground transition-colors p-1 shrink-0">
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronUp className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {/* Collapsible Lessons & Items List */}
                      {!isCollapsed && (
                        <div className="space-y-4 pl-1">
                          {week.lessons.map((lesson, lessonIndex) => {
                            const displayLessonTitle =
                              lesson.title.startsWith("Bài") || lesson.title.startsWith("Lesson")
                                ? lesson.title
                                : `Bài ${lessonIndex + 1}: ${lesson.title}`;

                            return (
                              <div key={lesson.id} className="space-y-1.5">
                                {/* Lesson Subheading */}
                                <div className="text-xs font-bold text-muted-foreground px-2 pt-1">
                                  {displayLessonTitle}
                                </div>

                                {/* Learning Items */}
                                <div className="space-y-1">
                                  {lesson.items.map((item) => {
                                    const isActive = activeItem?.id === item.id;
                                    const isDone = progress?.completedItemIds.includes(item.id);

                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                          if (!unlocked) {
                                            setLockNotice(
                                              `Bạn cần hoàn thành tất cả các bài học ở Tuần ${weekIndex} để mở khóa Tuần ${weekIndex + 1}.`,
                                            );
                                            return;
                                          }
                                          setLockNotice("");
                                          setActiveItem(item);
                                          setActiveQuiz(null);
                                        }}
                                        className={`w-full text-left p-3 rounded-2xl flex items-start gap-3 transition-all cursor-pointer ${
                                          !unlocked
                                            ? "opacity-60 cursor-not-allowed hover:bg-transparent"
                                            : isActive
                                              ? "bg-primary/10 border border-primary/20 text-foreground shadow-2xs"
                                              : "hover:bg-muted/60 text-foreground"
                                        }`}
                                      >
                                        {/* Status Icon */}
                                        <div className="shrink-0 mt-0.5">
                                          {!unlocked ? (
                                            <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center">
                                              <Lock className="w-3 h-3 text-muted-foreground" />
                                            </div>
                                          ) : isDone ? (
                                            <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
                                              <Check className="w-3.5 h-3.5 text-success-foreground stroke-[3]" />
                                            </div>
                                          ) : (
                                            <div className="w-5 h-5 rounded-full bg-muted border border-border" />
                                          )}
                                        </div>

                                        {/* Title & Sub-info */}
                                        <div className="flex-1 min-w-0">
                                          <div
                                            className={`text-xs leading-snug truncate ${
                                              isActive
                                                ? "font-bold text-foreground"
                                                : isDone
                                                  ? "font-medium text-foreground"
                                                  : "font-normal text-muted-foreground"
                                            }`}
                                          >
                                            {item.title}
                                          </div>
                                          <div className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                                            {!unlocked
                                              ? `Bị khóa • Hoàn thành Tuần ${weekIndex}`
                                              : `${getItemTypeName(item.type)} • ${item.estimatedMinutes || 5} min`}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Center Workspace & Bottom Panels */}
          <main className="flex-1 flex flex-col bg-background overflow-hidden relative text-foreground min-w-[360px]">
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

            {/* Center Video & Side Tool Panel Layout - Locked 3-Frame Row */}
            <div className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden relative min-h-0">
              {/* Left/Center Video / Reading Media Viewer Column */}
              <div className="flex-1 min-w-[360px] bg-card flex flex-col items-center justify-between relative overflow-y-auto transition-colors duration-200 min-h-0">
                <div className="w-full flex-1 flex items-start justify-center p-2 sm:p-3 pt-1 min-h-0 overflow-y-auto">
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

                {/* Coursera-style Bottom Control Navigation Footer Bar */}
                <div className="w-full h-14 border-t border-border px-4 sm:px-6 flex items-center justify-between bg-muted/30 shrink-0 z-10">
                  <div />

                  {/* Right: Next Item Button - Clean Text Only */}
                  {nextItem ? (
                    <button
                      onClick={() => {
                        if (!nextItem || !course) return;
                        const nextWeekIndex = course.weekModules.findIndex((wm) =>
                          wm.lessons.some((l) => l.items.some((i) => i.id === nextItem.id)),
                        );
                        if (nextWeekIndex !== -1 && !isWeekUnlocked(nextWeekIndex)) {
                          setLockNotice(
                            `Bạn cần hoàn thành tất cả các bài học ở Tuần ${nextWeekIndex} để mở khóa Tuần ${nextWeekIndex + 1}.`,
                          );
                          return;
                        }
                        setLockNotice("");
                        setActiveItem(nextItem);
                        setActiveQuiz(null);
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <span>{"Bài tiếp theo"}</span>
                      <svg
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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

              {/* Coursera-style Expandable Side Drawer Panel - Locked Width Column */}
              {isPanelOpen &&
                ((activeTab === "transcript" && isVideoItem) ||
                  ((activeTab === "notes" || activeTab === "forum") &&
                    isLectureItem &&
                    !isPreviewMode) ||
                  (activeTab === "deadlines" && !isPreviewMode)) && (
                  <aside className="w-80 xl:w-96 bg-card border-l border-border flex flex-col shrink-0 h-full overflow-hidden shadow-xs z-10 transition-all duration-300">
                    {/* Drawer Header */}
                    <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-muted/40 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                          {activeTab === "transcript" && "Phụ đề Tương tác"}
                          {activeTab === "forum" && "Thảo luận Bài học"}
                          {activeTab === "notes" && "Ghi chú Cá nhân"}
                          {activeTab === "deadlines" && "Deadlines & Tiến độ"}
                        </span>
                      </div>
                      <button
                        onClick={() => setIsPanelOpen(false)}
                        className="w-7 h-7 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                        title="Đóng bảng công cụ"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Tab Body Content */}
                    <div className="flex-1 overflow-y-auto p-4 bg-background min-h-0 flex flex-col">
                      {activeTab === "transcript" && isVideoItem && (
                        <TranscriptPanel
                          activeItem={activeItem}
                          currentTime={currentTime}
                          onSeekVideo={handleSeekVideo}
                        />
                      )}

                      {!isPreviewMode && activeTab === "forum" && isLectureItem && (
                        <ForumTab courseId={courseId} itemId={activeItem?.id || ""} />
                      )}

                      {!isPreviewMode && activeTab === "notes" && isLectureItem && (
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
                        <DeadlinesPanel
                          progress={progress}
                          onResetDeadlines={handleResetDeadlines}
                        />
                      )}
                    </div>
                  </aside>
                )}

              {/* Coursera-style Vertical Icon Action Bar (Far Right Strip - Rigid Vertical Column) */}
              <div className="w-16 lg:w-20 bg-card border-l border-border flex flex-col items-center justify-start py-4 gap-4 shrink-0 h-full z-20 select-none">
                {/* Transcript Button: Only for Video Items */}
                {isVideoItem && (
                  <button
                    onClick={() => handleTabClick("transcript")}
                    className={`w-14 lg:w-16 py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isPanelOpen && activeTab === "transcript"
                        ? "bg-primary/10 text-primary font-bold shadow-2xs border border-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    title="Phụ đề"
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
                        d="M4 6h16M4 12h16m-7 6h7"
                      />
                    </svg>
                    <span className="text-[10px] tracking-tight leading-none">Phụ đề</span>
                  </button>
                )}

                {!isPreviewMode && (
                  <>
                    {/* Notes Button: For Video & Reading Lecture Items */}
                    {isLectureItem && (
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
                    )}

                    {/* Forum Button: For Video & Reading Lecture Items */}
                    {isLectureItem && (
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
                    )}

                    {/* Deadlines Button */}
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
          </main>

          <CourseCompletionModal
            isOpen={showCompletionModal}
            onClose={() => setShowCompletionModal(false)}
            courseId={courseId}
            courseTitle={course?.title || "Khóa học LMS"}
            certificateId={certificateId || `CERT-${courseId.replace("course-", "").toUpperCase()}`}
          />
        </div>
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
