"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
import type { UniversalVideoRef } from "@/components/player/UniversalVideoPlayer";
import { LearnSidebarWorkspace, type SidebarTab } from "@/components/player/sidebar";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { LanguageToggle } from "@/components/providers/LanguageToggle";
import { UserDropdown } from "@/components/layout/UserDropdown";
import { CourseCompletionModal } from "@/components/course/CourseCompletionModal";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { usePaymentAccessQuery } from "@/lib/query_hooks";
import { CourseSyllabusDrawer } from "@/components/player/sidebar/CourseSyllabusDrawer";
import { Button } from "@/components/ui/Button";
import { Menu, Sparkles, X, CheckCircle2, ChevronRight } from "lucide-react";

function CoursePlayerContent() {
  const params = useParams();
  const courseId = params?.courseId as string;

  const searchParams = useSearchParams();
  const previewItemId = searchParams?.get("itemId") || null;
  const isPreviewMode = searchParams?.get("preview") === "true";
  const urlTab = searchParams?.get("tab");
  const urlThreadId = searchParams?.get("threadId");

  const [userId, setUserId] = useState<string>("");

  const [course, setCourse] = useState<Course | null>(null);
  const [activeItem, setActiveItem] = useState<LearningItem | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [activeTab, setActiveTab] = useState<
    "transcript" | "forum" | "notes" | "deadlines" | "ai_assistant"
  >(
    urlThreadId || urlTab === "forum"
      ? "forum"
      : urlTab && ["transcript", "notes", "deadlines", "ai_assistant"].includes(urlTab)
        ? (urlTab as "transcript" | "notes" | "deadlines" | "ai_assistant")
        : "transcript",
  );
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});
  const prevActiveItemIdRef = useRef<string | null>(null);

  // Auto-collapse sidebars on small screens (< 1024px) for optimal mobile responsiveness
  useEffect(() => {
    const handleResponsiveLayout = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
        setIsPanelOpen(false);
      }
    };
    handleResponsiveLayout();
    window.addEventListener("resize", handleResponsiveLayout);
    return () => window.removeEventListener("resize", handleResponsiveLayout);
  }, []);

  const toggleWeek = (weekId: string) => {
    setCollapsedWeeks((prev) => ({
      ...prev,
      [weekId]: !prev[weekId],
    }));
  };

  const { data: paymentAccess } = usePaymentAccessQuery(courseId, {
    enabled: !!courseId && !isPreviewMode,
  });
  const isPaidAccess = isPreviewMode ? true : (paymentAccess?.hasPaidAccess ?? false);

  const isGradedItem = useCallback((type: number): boolean => {
    return type === 4 || type === 5 || type === 6;
  }, []);

  const isWeekUnlocked = useCallback(
    (weekIndex: number): boolean => {
      if (isPreviewMode || weekIndex === 0 || !course) return true;
      if (!isPaidAccess) return false;
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
    [course, progress, isPreviewMode, isPaidAccess],
  );

  const isItemLocked = useCallback(
    (item: { type: number }, weekIndex: number): boolean => {
      if (isPreviewMode) return false;
      if (!isPaidAccess && isGradedItem(item.type)) return true;
      if (!isWeekUnlocked(weekIndex)) return true;
      return false;
    },
    [isPreviewMode, isPaidAccess, isGradedItem, isWeekUnlocked],
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

  const prevTabBeforeAiRef = useRef<"transcript" | "forum" | "notes" | "deadlines">("transcript");
  const prevPanelOpenBeforeAiRef = useRef<boolean>(true);

  const handleOpenAiAssistant = () => {
    if (activeTab !== "ai_assistant") {
      prevTabBeforeAiRef.current = activeTab as "transcript" | "forum" | "notes" | "deadlines";
      prevPanelOpenBeforeAiRef.current = isPanelOpen;
    }
    setActiveTab("ai_assistant");
    setIsPanelOpen(true);
  };

  const handleCloseAiAssistant = () => {
    setActiveTab(prevTabBeforeAiRef.current || "transcript");
    setIsPanelOpen(prevPanelOpenBeforeAiRef.current);
  };

  const handleToggleAiAssistant = () => {
    if (isPanelOpen && activeTab === "ai_assistant") {
      handleCloseAiAssistant();
    } else {
      handleOpenAiAssistant();
    }
  };

  const handleTabClick = (tab: "transcript" | "forum" | "notes" | "deadlines" | "ai_assistant") => {
    if (tab === "ai_assistant") {
      handleToggleAiAssistant();
      return;
    }
    if (isPanelOpen && activeTab === tab) {
      setIsPanelOpen(false);
    } else {
      setActiveTab(tab);
      setIsPanelOpen(true);
    }
  };

  // AI được hỗ trợ cho học viên đã đăng ký ở các bài học, NGOẠI TRỪ Bài kiểm tra tính điểm (type === 4)
  const isAiSupported = Boolean(activeItem && !isPreviewMode && activeItem.type !== 4);

  useEffect(() => {
    if (!isAiSupported && activeTab === "ai_assistant") {
      setIsPanelOpen(false);
      setActiveTab("transcript");
    }
  }, [isAiSupported, activeTab]);

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [certificateId, setCertificateId] = useState<string>("");

  // Video & In-Video Quiz State
  const videoRef = useRef<UniversalVideoRef | HTMLVideoElement | any>(null);
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
  const [externalAiPrompt, setExternalAiPrompt] = useState<string | null>(null);
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
    } else if (activeTab === "notes" && !isLectureItem) {
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
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "";
              if (
                !msg.includes("BR_CERT_003") &&
                !msg.includes("KYC") &&
                !msg.includes("Xác minh Danh tính")
              ) {
                console.error("Failed to load certificate on completion:", err);
              }
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
          try {
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
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "";
                if (
                  !msg.includes("BR_CERT_003") &&
                  !msg.includes("KYC") &&
                  !msg.includes("Xác minh Danh tính")
                ) {
                  console.error("Failed to load certificate on load:", err);
                }
              }
            }

            const notesRes = await learningClient.listPersonalNotes({ courseId });
            setNotes(notesRes.notes);
          } catch (err) {
            console.error("Failed to load user progress or notes:", err);
          }
        }
      } catch (err) {
        console.error("Error loading course player data:", err);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, previewItemId, isPreviewMode]);

  // Adjust active item if currently active item is locked due to Audit Mode
  useEffect(() => {
    if (!course || isPreviewMode || isPaidAccess || !activeItem) return;
    if (isGradedItem(activeItem.type)) {
      let foundUnlocked = null;
      for (let wIdx = 0; wIdx < course.weekModules.length; wIdx++) {
        const wm = course.weekModules[wIdx];
        for (const l of wm.lessons) {
          for (const it of l.items) {
            if (!isItemLocked(it, wIdx)) {
              foundUnlocked = it;
              break;
            }
          }
          if (foundUnlocked) break;
        }
        if (foundUnlocked) break;
      }
      if (foundUnlocked && foundUnlocked.id !== activeItem.id) {
        setActiveItem(foundUnlocked);
      }
    }
  }, [course, isPreviewMode, isPaidAccess, activeItem, isGradedItem, isItemLocked]);

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
  const handleTimeUpdate = (passedTime?: number) => {
    if (!activeItem) return;

    let currentSeconds = 0;
    if (typeof passedTime === "number" && !isNaN(passedTime)) {
      currentSeconds = passedTime;
    } else if (videoRef.current) {
      currentSeconds = videoRef.current.currentTime || 0;
    }

    if (currentSeconds === 0 && maxTimeRef.current > 2) {
      return;
    }

    if (currentSeconds > maxTimeRef.current) {
      maxTimeRef.current = currentSeconds;
    }

    // Keep exact float precision for currentTime state to prevent clipping end words in transcripts
    const currentFloat = Math.round(currentSeconds * 100) / 100;
    setCurrentTime((prev) => (Math.abs(prev - currentFloat) < 0.1 ? prev : currentFloat));

    const integerTime = Math.floor(currentSeconds);

    // Auto mark as completed if watched >= 80% of video duration
    const videoDuration =
      (videoRef.current as any)?.duration || (videoRef.current as any)?.getDuration?.() || 0;
    if (
      videoDuration > 0 &&
      currentSeconds >= videoDuration * 0.8 &&
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
          Math.abs(integerTime - quiz.timestampSeconds) <= 1 &&
          !answeredQuizTimestamps.has(quiz.timestampSeconds) &&
          !activeQuiz
        ) {
          if (videoRef.current) {
            videoRef.current.pause();
          }
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

  // Delete Personal Note
  const handleDeleteNote = async (noteId: string) => {
    try {
      const learningClient = getRpcClient(LearningService);
      const res = await learningClient.deletePersonalNote({ noteId });
      if (res.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
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

  // Navigate to Next Lesson
  const handleNextLesson = useCallback(() => {
    if (!nextItem || !course) return;
    const nextWeekIndex = course.weekModules.findIndex((wm) =>
      wm.lessons.some((l) => l.items.some((i) => i.id === nextItem.id)),
    );
    if (nextWeekIndex !== -1 && isItemLocked(nextItem, nextWeekIndex)) {
      if (!isPreviewMode && !isPaidAccess && isGradedItem(nextItem.type)) {
        setLockNotice(
          "Tài khoản đang ở chế độ Audit Mode (Miễn phí). Vui lòng nâng cấp Paid Mode hoặc sử dụng mã Enterprise Key / Hỗ trợ tài chính để làm bài kiểm tra tính điểm.",
        );
      } else if (!isPaidAccess && nextWeekIndex > 0) {
        setLockNotice(
          "Tài khoản của bạn đang ở chế độ Audit (Miễn phí). Vui lòng đăng ký Coursera Plus hoặc mua khóa học để mở khóa từ Tuần 2 trở đi.",
        );
      } else {
        setLockNotice(
          `Bạn cần hoàn thành tất cả các bài học ở Tuần ${nextWeekIndex} để mở khóa Tuần ${nextWeekIndex + 1}.`,
        );
      }
      return;
    }
    setLockNotice("");
    setActiveItem(nextItem);
    setActiveQuiz(null);
  }, [nextItem, course, isItemLocked, isPreviewMode, isPaidAccess, isGradedItem]);

  if (!course) {
    return (
      <div
        data-page="learn"
        className="min-h-screen bg-surface-container-low text-muted-foreground flex items-center justify-center"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Đang mở Trình phát bài học…</span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-page="learn"
      className="h-screen h-dvh bg-surface-container-low text-on-surface flex flex-col overflow-hidden transition-colors duration-m3-short-4 ease-m3-emphasized"
    >
      {/* Top Player Navbar - Seamless Borderless Header */}
      <header className="h-14 bg-surface-container-low px-4 sm:px-5 flex items-center justify-between flex-shrink-0 relative z-sticky">
        <div className="flex items-center gap-4 min-w-0">
          <BrandLogo size="sm" />
        </div>

        <div className="flex items-center gap-4">
          {!isPreviewMode &&
            progress &&
            (progress.overallProgressPercent >= 100 ||
              progress.completedItemIds.length >= totalCourseItems) && (
              <Button
                type="button"
                onClick={() => setShowCompletionModal(true)}
                className="px-4 py-1.5 rounded-full bg-warning hover:bg-warning-hover text-warning-foreground font-bold text-xs shadow-xs hover:shadow"
              >
                <CheckCircle2 className="w-4 h-4 text-warning-foreground" aria-hidden="true" />
                <span>{"Xem Chứng Chỉ"}</span>
              </Button>
            )}

          {isPreviewMode && (
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-warning/10 text-warning border border-warning/20 animate-pulse">
              {"Xem trước học liệu"}
            </span>
          )}

          <LanguageToggle />
          <ThemeToggle />

          {/* AI Assistant Icon Button matching ThemeToggle style with colored icon when supported */}
          <Button
            type="button"
            variant="text"
            iconOnly
            disabled={!isAiSupported}
            onClick={handleToggleAiAssistant}
            aria-label="Bật/tắt Trợ lý AI"
            className={`p-2 rounded-full h-9 w-9 shrink-0 ${
              !isAiSupported
                ? "text-on-surface-variant/30 opacity-40 cursor-not-allowed"
                : isPanelOpen && activeTab === "ai_assistant"
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
            }`}
            title={
              isAiSupported
                ? "Trợ lý AI Học tập (Socratic)"
                : isPreviewMode
                  ? "Trợ lý AI chưa hỗ trợ ở chế độ xem trước"
                  : activeItem?.type === 4
                    ? "Trợ lý AI tạm khóa trong bài kiểm tra tính điểm"
                    : "Trợ lý AI chưa hỗ trợ ở trang này"
            }
          >
            <Sparkles
              className={`w-5 h-5 ${isAiSupported ? "text-primary" : "text-on-surface-variant/30"}`}
              aria-hidden="true"
            />
          </Button>

          <UserDropdown />
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left Sidebar - MD3 Collapsible Floating Surface Container Drawer */}
        {!isPreviewMode && !isQuizActive && (
          <aside
            className={`relative bg-surface-container-lowest text-on-surface rounded-3xl shadow-xs h-full overflow-hidden shrink-0 flex flex-col transition-[width,max-width] duration-300 ease-m3-emphasized ${
              isSidebarOpen ? "w-80 xl:w-90 max-w-[calc(100vw-24px)]" : "w-14"
            }`}
            aria-label="Lộ trình khóa học"
          >
            {/* Collapsed Icon Strip Trigger */}
            <div
              className={`absolute top-2 left-2 transition-all duration-300 ease-m3-emphasized z-10 ${
                isSidebarOpen
                  ? "opacity-0 pointer-events-none scale-90 invisible"
                  : "opacity-100 scale-100 visible"
              }`}
            >
              <Button
                type="button"
                variant="text"
                iconOnly
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-10 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                title="Mở Lộ trình Bài học"
                aria-label="Mở Lộ trình Bài học"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </Button>
            </div>

            {/* Expanded Full Drawer Content - Isolated Subcomponent to prevent parent re-renders */}
            <CourseSyllabusDrawer
              course={course}
              isSidebarOpen={isSidebarOpen}
              activeItem={activeItem}
              progress={progress}
              collapsedWeeks={collapsedWeeks}
              onClose={() => setIsSidebarOpen(false)}
              onToggleWeek={toggleWeek}
              onSelectItem={(item) => {
                setActiveItem(item);
                setActiveQuiz(null);
              }}
              onSetLockNotice={setLockNotice}
              isItemLocked={isItemLocked}
              isWeekUnlocked={isWeekUnlocked}
              isPaidAccess={isPaidAccess}
              isPreviewMode={isPreviewMode}
              isGradedItem={isGradedItem}
            />
          </aside>
        )}

        {/* Center Workspace & Bottom Panels */}
        <main className="flex-1 flex flex-col overflow-hidden relative text-on-surface min-w-0 h-full">
          {/* Lock Notice Banner */}
          {lockNotice && !isQuizActive && (
            <div className="p-3 bg-warning/10 text-warning text-xs font-semibold flex items-center justify-between px-6 z-1 animate-in fade-in duration-m3-short-4 ease-m3-decelerate gap-3">
              <span>{lockNotice}</span>
              <div className="flex items-center gap-2 shrink-0">
                {!isPaidAccess && (
                  <Link
                    href="/my-purchases"
                    className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs transition-colors shadow-xs"
                  >
                    Nâng cấp Plus
                  </Link>
                )}
                <Button
                  type="button"
                  variant="text"
                  iconOnly
                  onClick={() => setLockNotice("")}
                  aria-label="Đóng thông báo"
                  className="p-1 h-6 w-6 text-warning hover:opacity-75"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {/* Center Video & Side Tool Panel Layout */}
          <div className="flex-1 flex flex-row overflow-hidden relative min-h-0 gap-3">
            {/* Left/Center Video Media Viewer Canvas - MD3 Floating Surface Card */}
            <div className="flex-1 min-w-0 bg-surface-container-lowest text-on-surface rounded-3xl shadow-xs overflow-hidden flex flex-col relative min-h-0">
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
                isPaidAccess={isPaidAccess}
                onSelectAiPrompt={(promptText) => {
                  setActiveTab("ai_assistant");
                  setIsPanelOpen(true);
                  setExternalAiPrompt(promptText);
                }}
                onNextLesson={handleNextLesson}
                onQuizActiveChange={setIsQuizActive}
              />

              {/* Fixed Bottom-Right Next Lesson Floating Action Button */}
              {nextItem && (
                <div className="absolute bottom-3.5 right-3.5 z-30 pointer-events-auto">
                  <Button
                    type="button"
                    variant="tonal"
                    onClick={handleNextLesson}
                    className="px-4 py-2 rounded-full text-xs font-semibold bg-surface-container-high/90 backdrop-blur-md text-on-surface hover:bg-primary-container hover:text-on-primary-container border border-outline-variant/60 hover:border-primary/40 transition-all shadow-sm hover:shadow-md hover:scale-102 active:scale-98 flex items-center gap-1.5 cursor-pointer"
                    title={`Chuyển sang: ${nextItem.title}`}
                    aria-label={`Chuyển sang: ${nextItem.title}`}
                  >
                    <span>{"Bài tiếp theo"}</span>
                    <ChevronRight
                      className="w-3.5 h-3.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  </Button>
                </div>
              )}
            </div>

            {/* Right Tool & AI Sidebar Workspace */}
            <LearnSidebarWorkspace
              courseId={courseId}
              course={course}
              activeItem={activeItem}
              currentTime={currentTime}
              progress={progress}
              notes={notes}
              highlightText={highlightText}
              noteComment={noteComment}
              savingNote={savingNote}
              activeTab={activeTab as SidebarTab}
              isPanelOpen={isPanelOpen}
              isVideoItem={isVideoItem}
              isLectureItem={isLectureItem}
              isPreviewMode={isPreviewMode}
              isAiSupported={isAiSupported}
              externalAiPrompt={externalAiPrompt}
              urlThreadId={urlThreadId}
              nextItem={nextItem}
              onTabClick={handleTabClick}
              onCloseAiAssistant={handleCloseAiAssistant}
              onClosePanel={() => setIsPanelOpen(false)}
              onSeekVideo={handleSeekVideo}
              onNextLesson={() => {
                if (nextItem) {
                  setActiveItem(nextItem);
                  setActiveQuiz(null);
                }
              }}
              onNoteCreated={(newNote) => setNotes((prev) => [newNote, ...prev])}
              onHighlightTextChange={setHighlightText}
              onNoteCommentChange={setNoteComment}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onResetDeadlines={handleResetDeadlines}
              onExternalPromptConsumed={() => setExternalAiPrompt(null)}
            />
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
  );
}

export default function CoursePlayerPage() {
  return (
    <Suspense
      fallback={
        <div
          data-page="learn"
          className="min-h-screen bg-surface-container-low flex items-center justify-center text-muted-foreground"
        >
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
