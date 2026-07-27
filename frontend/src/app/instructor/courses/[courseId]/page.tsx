"use client";

import { useEffect, useState, useSyncExternalStore, use } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, ItemType, type Course, type LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { AssessmentService, type QuestionBank } from "@/gen/assessment/v1/assessment_pb";

import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n/TranslationProvider";
import { VideoUploadWidget } from "@/components/ui/VideoUploadWidget";
import { InVideoQuizEditor, type InVideoQuizItem } from "@/components/ui/InVideoQuizEditor";

const emptySubscribe = () => () => { };

export default function InstructorCourseBuilderPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { t } = useTranslation();

  // Modals visibility
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState<string | null>(null); // weekModuleId
  const [showItemModal, setShowItemModal] = useState<string | null>(null); // lessonId

  // Form States
  const [weekNumber, setWeekNumber] = useState(1);
  const [weekTitle, setWeekTitle] = useState("");
  const [weekSummary, setWeekSummary] = useState("");

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonMinutes, setLessonMinutes] = useState(15);

  const [itemTitle, setItemTitle] = useState("");
  const [itemType, setItemType] = useState<ItemType>(ItemType.VIDEO);
  const [itemMinutes, setItemMinutes] = useState(10);
  const [videoUrl, setVideoUrl] = useState("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4");
  const [vttSubtitleUrl, setVttSubtitleUrl] = useState("");
  const [autoTranscribe, setAutoTranscribe] = useState(false);
  const [inVideoQuizzes, setInVideoQuizzes] = useState<InVideoQuizItem[]>([]);
  const [readingMarkdown, setReadingMarkdown] = useState("");
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

  // Extended Native Fields (Lab, Quiz Matrix, Rubric)
  const [labLanguage, setLabLanguage] = useState("python");
  const [labStarterCode, setLabStarterCode] = useState("# Starter code for lab\ndef solution():\n    pass\n");
  const [labTestCasesJson, setLabTestCasesJson] = useState('[\n  {"input": "1, 2", "expected": "3"}\n]');
  const [quizBankId, setQuizBankId] = useState("");
  const [quizTimeLimit, setQuizTimeLimit] = useState<string | number>("45");
  const [quizPassingThreshold, setQuizPassingThreshold] = useState<string | number>("80");
  const [quizEasyCount, setQuizEasyCount] = useState<string | number>("4");
  const [quizMediumCount, setQuizMediumCount] = useState<string | number>("4");
  const [quizHardCount, setQuizHardCount] = useState<string | number>("2");
  const [peerRubricJson, setPeerRubricJson] = useState('[\n  {"title": "Clarity & Organization", "max_score": 10}\n]');
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);

  // SCORM Review Workspace State
  const [showScormReviewModal, setShowScormReviewModal] = useState(false);
  const [scormPreviewCourse, setScormPreviewCourse] = useState<Course | null>(null);
  const [scormIsSingleItem, setScormIsSingleItem] = useState(false);
  const [scormObjectKey, setScormObjectKey] = useState("");
  const [scormImporting, setScormImporting] = useState(false);

  // Edit Modals State
  const [editingWeek, setEditingWeek] = useState<{ id: string; title: string; summary: string } | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ id: string; title: string; estimatedMinutes: number } | null>(null);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    title: string;
    type: ItemType;
    estimatedMinutes: number;
    videoUrl: string;
    vttSubtitleUrl: string;
    autoTranscribe: boolean;
    content: string;
    inVideoQuizzes: InVideoQuizItem[];
    starterCode: string;
    testCasesJson: string;
    language: string;
    rubricCriteriaJson: string;
    quizMatrixId: string;
  } | null>(null);


  // Authorization Check
  const userRole = isMounted && typeof window !== "undefined" ? localStorage.getItem("user_role") : null;
  const isInstructorOrAdmin = userRole === "2" || userRole === "4" || userRole === "5";

  const fetchCourseDetail = async () => {
    try {
      const client = getRpcClient(CatalogService);
      const res = await client.getCourseDetail({ idOrSlug: courseId });
      if (res.course) {
        setCourse(res.course);
        // Default week number to next week
        const nextWeekNum = (res.course.weekModules?.length || 0) + 1;
        setWeekNumber(nextWeekNum);
      }

      // Fetch Question Banks
      const assessmentClient = getRpcClient(AssessmentService);
      const banksRes = await assessmentClient.listQuestionBanks({ courseId });
      setQuestionBanks(banksRes.banks || []);
    } catch (err: unknown) {
      console.error("Failed to load course details:", err);
      const errMsg = err instanceof Error ? err.message : t("instructorBuilder.toastLoadFail");
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.getCourseDetail({ idOrSlug: courseId });
        if (!ignore && res.course) {
          setCourse(res.course);
          const nextWeekNum = (res.course.weekModules?.length || 0) + 1;
          setWeekNumber(nextWeekNum);
        }

        // Fetch Question Banks
        const assessmentClient = getRpcClient(AssessmentService);
        const banksRes = await assessmentClient.listQuestionBanks({ courseId });
        if (!ignore) {
          setQuestionBanks(banksRes.banks || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Failed to load course details:", err);
          const errMsg = err instanceof Error ? err.message : t("instructorBuilder.toastLoadFail");
          toast.error(errMsg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Handlers for creating elements
  const handleCreateWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weekTitle.trim()) return;

    setSaving(true);

    try {
      const client = getRpcClient(CatalogService);
      await client.createWeekModule({
        courseId,
        weekNumber,
        title: weekTitle,
        summary: weekSummary,
      });

      setShowWeekModal(false);
      setWeekTitle("");
      setWeekSummary("");
      toast.success(`Đã thêm Tuần ${weekNumber} vào khóa học thành công!`);
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("instructorBuilder.toastWeekAddFail");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLessonModal || !lessonTitle.trim()) return;

    setSaving(true);

    try {
      const client = getRpcClient(CatalogService);
      await client.createLesson({
        courseId,
        weekModuleId: showLessonModal,
        title: lessonTitle,
        estimatedMinutes: lessonMinutes,
      });

      setShowLessonModal(null);
      setLessonTitle("");
      toast.success(`Đã thêm Bài học "${lessonTitle}" thành công!`);
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("instructorBuilder.toastLessonAddFail");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showItemModal || !itemTitle.trim()) return;

    setSaving(true);

    try {
      const client = getRpcClient(CatalogService);
      await client.createLearningItem({
        courseId: course?.id || courseId,
        lessonId: showItemModal,
        title: itemTitle,
        type: itemType,
        estimatedMinutes: itemMinutes,
        videoUrl: itemType === ItemType.VIDEO ? videoUrl : "",
        vttSubtitleUrl: itemType === ItemType.VIDEO ? vttSubtitleUrl : "",
        autoTranscribe: itemType === ItemType.VIDEO ? autoTranscribe : false,
        inVideoQuizzes: itemType === ItemType.VIDEO ? inVideoQuizzes.map(q => ({
          timestampSeconds: q.timestampSeconds,
          question: q.question,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
        })) : [],
        readingMarkdown: itemType === ItemType.READING ? readingMarkdown : "",
        starterCode: itemType === ItemType.AUTO_GRADED_LAB ? labStarterCode : "",
        testCasesJson: itemType === ItemType.AUTO_GRADED_LAB ? labTestCasesJson : "",
        language: itemType === ItemType.AUTO_GRADED_LAB ? labLanguage : "",
        rubricCriteriaJson: itemType === ItemType.PEER_REVIEW ? peerRubricJson : "",
        quizMatrixId: (itemType === ItemType.PRACTICE_QUIZ || itemType === ItemType.GRADED_QUIZ) ? quizBankId : "",
      });

      setShowItemModal(null);
      setItemTitle("");
      setVideoUrl("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4");
      setVttSubtitleUrl("");
      setAutoTranscribe(false);
      setReadingMarkdown("");
      setInVideoQuizzes([]);
      toast.success(`Đã thêm Học liệu "${itemTitle}" vào bài học thành công!`);
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("instructorBuilder.toastItemAddFail");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWeek || !editingWeek.title.trim()) return;

    setSaving(true);

    try {
      const client = getRpcClient(CatalogService);
      await client.updateWeekModule({
        id: editingWeek.id,
        courseId,
        title: editingWeek.title,
        summary: editingWeek.summary,
      });

      setEditingWeek(null);
      toast.success(t("instructorBuilder.toastWeekUpdated"));
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("instructorBuilder.toastWeekUpdateFail");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !editingLesson.title.trim()) return;

    setSaving(true);

    try {
      const client = getRpcClient(CatalogService);
      await client.updateLesson({
        id: editingLesson.id,
        courseId,
        title: editingLesson.title,
        estimatedMinutes: editingLesson.estimatedMinutes,
      });

      setEditingLesson(null);
      toast.success(t("instructorBuilder.toastLessonUpdated"));
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("instructorBuilder.toastLessonUpdateFail");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title.trim()) return;

    setSaving(true);

    try {
      const client = getRpcClient(CatalogService);
      await client.updateLearningItem({
        id: editingItem.id,
        courseId,
        title: editingItem.title,
        type: editingItem.type,
        estimatedMinutes: editingItem.estimatedMinutes,
        videoUrl: editingItem.type === ItemType.VIDEO ? editingItem.videoUrl : undefined,
        vttSubtitleUrl: editingItem.type === ItemType.VIDEO ? editingItem.vttSubtitleUrl : undefined,
        autoTranscribe: editingItem.type === ItemType.VIDEO ? editingItem.autoTranscribe : undefined,
        readingMarkdown: editingItem.type === ItemType.READING ? editingItem.content : undefined,
        inVideoQuizzes: editingItem.type === ItemType.VIDEO ? editingItem.inVideoQuizzes.map(q => ({
          timestampSeconds: q.timestampSeconds,
          question: q.question,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
        })) : undefined,
        starterCode: editingItem.type === ItemType.AUTO_GRADED_LAB ? editingItem.starterCode : undefined,
        testCasesJson: editingItem.type === ItemType.AUTO_GRADED_LAB ? editingItem.testCasesJson : undefined,
        language: editingItem.type === ItemType.AUTO_GRADED_LAB ? editingItem.language : undefined,
        rubricCriteriaJson: editingItem.type === ItemType.PEER_REVIEW ? editingItem.rubricCriteriaJson : undefined,
        quizMatrixId: (editingItem.type === ItemType.PRACTICE_QUIZ || editingItem.type === ItemType.GRADED_QUIZ) ? editingItem.quizMatrixId : undefined,
      });

      setEditingItem(null);
      toast.success(t("instructorBuilder.toastItemUpdated"));
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("instructorBuilder.toastItemUpdateFail");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWeek = async (weekId: string, weekTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Tuần học "${weekTitle}"? Thao tác này sẽ xóa tất cả bài học bên trong.`)) {
      return;
    }
    try {
      const client = getRpcClient(CatalogService);
      await client.deleteWeekModule({ id: weekId, courseId });
      toast.success(`Đã xóa Tuần học "${weekTitle}" thành công!`);
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("instructorBuilder.toastWeekDeleteFail");
      toast.error(msg);
    }
  };

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Bài học "${lessonTitle}"?`)) {
      return;
    }
    try {
      const client = getRpcClient(CatalogService);
      await client.deleteLesson({ id: lessonId, courseId });
      toast.success(`Đã xóa Bài học "${lessonTitle}" thành công!`);
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("instructorBuilder.toastLessonDeleteFail");
      toast.error(msg);
    }
  };

  const handleDeleteItem = async (itemId: string, itemTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Học liệu "${itemTitle}"?`)) {
      return;
    }
    try {
      const client = getRpcClient(CatalogService);
      await client.deleteLearningItem({ id: itemId, courseId });
      toast.success(`Đã xóa Học liệu "${itemTitle}" thành công!`);
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("instructorBuilder.toastItemDeleteFail");
      toast.error(msg);
    }
  };

  // Live Drag & Reorder Handlers

  const handleLiveReorderWeeks = (fromIndex: number, toIndex: number) => {
    if (!course || !course.weekModules || fromIndex === toIndex) return;
    const weeks = [...course.weekModules];
    if (fromIndex < 0 || fromIndex >= weeks.length || toIndex < 0 || toIndex >= weeks.length) return;

    const [moved] = weeks.splice(fromIndex, 1);
    weeks.splice(toIndex, 0, moved);
    setCourse({ ...course, weekModules: weeks });
  };

  const handleSaveWeekOrder = async () => {
    if (!course || !course.weekModules) return;
    try {
      const client = getRpcClient(CatalogService);
      await client.reorderWeekModules({
        courseId,
        orderedWeekModuleIds: course.weekModules.map((w) => w.id),
      });
      toast.success(t("instructorBuilder.toastWeekOrderSaved"));
    } catch (err: unknown) {
      console.error("Failed to save week order:", err);
      await fetchCourseDetail();
    }
  };

  const handleLiveReorderLessons = (weekId: string, fromIndex: number, toIndex: number) => {
    if (!course || !course.weekModules || fromIndex === toIndex) return;
    const week = course.weekModules.find((w) => w.id === weekId);
    if (!week || !week.lessons) return;

    const lessons = [...week.lessons];
    if (fromIndex < 0 || fromIndex >= lessons.length || toIndex < 0 || toIndex >= lessons.length) return;

    const [moved] = lessons.splice(fromIndex, 1);
    lessons.splice(toIndex, 0, moved);

    const updatedWeeks = course.weekModules.map((w) =>
      w.id === weekId ? { ...w, lessons } : w
    );
    setCourse({ ...course, weekModules: updatedWeeks });
  };

  const handleSaveLessonOrder = async (weekId: string) => {
    if (!course || !course.weekModules) return;
    const week = course.weekModules.find((w) => w.id === weekId);
    if (!week || !week.lessons) return;

    try {
      const client = getRpcClient(CatalogService);
      await client.reorderLessons({
        courseId,
        weekModuleId: weekId,
        orderedLessonIds: week.lessons.map((l) => l.id),
      });
      toast.success(t("instructorBuilder.toastLessonOrderSaved"));
    } catch (err: unknown) {
      console.error("Failed to save lesson order:", err);
      await fetchCourseDetail();
    }
  };

  const handleLiveReorderItems = (lessonId: string, fromIndex: number, toIndex: number) => {
    if (!course || !course.weekModules || fromIndex === toIndex) return;

    let targetWeekId = "";
    let targetItems: LearningItem[] = [];

    for (const w of course.weekModules) {
      const lesson = w.lessons?.find((l) => l.id === lessonId);
      if (lesson && lesson.items) {
        targetWeekId = w.id;
        targetItems = [...lesson.items];
        break;
      }
    }

    if (fromIndex < 0 || fromIndex >= targetItems.length || toIndex < 0 || toIndex >= targetItems.length) return;

    const [moved] = targetItems.splice(fromIndex, 1);
    targetItems.splice(toIndex, 0, moved);

    const updatedWeeks = course.weekModules.map((w) => {
      if (w.id !== targetWeekId) return w;
      return {
        ...w,
        lessons: w.lessons?.map((l) =>
          l.id === lessonId ? { ...l, items: targetItems } : l
        ),
      };
    });
    setCourse({ ...course, weekModules: updatedWeeks });
  };

  const handleSaveItemOrder = async (lessonId: string) => {
    if (!course || !course.weekModules) return;
    let targetItems: LearningItem[] = [];
    for (const w of course.weekModules) {
      const lesson = w.lessons?.find((l) => l.id === lessonId);
      if (lesson && lesson.items) {
        targetItems = lesson.items;
        break;
      }
    }

    try {
      const client = getRpcClient(CatalogService);
      await client.reorderLearningItems({
        courseId,
        lessonId,
        orderedItemIds: targetItems.map((i) => i.id),
      });
      toast.success(t("instructorBuilder.toastItemOrderSaved"));
    } catch (err: unknown) {
      console.error("Failed to save item order:", err);
      await fetchCourseDetail();
    }
  };

  // Simple Live Drag & Reorder State
  const [activeDrag, setActiveDrag] = useState<{
    type: "week" | "lesson" | "item";
    id: string;
    containerId?: string;
    startIndex: number;
    currentIndex: number;
  } | null>(null);


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center py-24">
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">{t("instructorBuilder.loading")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Return Nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/instructor/courses" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {t("instructorBuilder.breadcrumbInstructor")}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{t("instructorBuilder.breadcrumbBuilder")}</span>
          </div>

          <Link
            href="/instructor/courses"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{t("instructorBuilder.backBtn")}</span>
          </Link>
        </div>

        {/* Course Header Banner */}
        {course && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                  {course.partnerName}
                </span>
                <span className="text-xs font-mono text-slate-400">ID: {course.id}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {course.title}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                {course.description}
              </p>
              <div className="text-xs font-medium text-slate-500 flex items-center gap-2 pt-1">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{t("instructorBuilder.instructorLabel")} {course.instructorNames.join(", ")}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setSaving(true);
                    const client = getRpcClient(CatalogService);
                    const res = await client.exportCourseToScorm({ courseId });
                    if (res.downloadUrl) {
                      toast.success("Đã đóng gói khóa học thành SCORM 1.2 ZIP!");
                      window.open(res.downloadUrl, "_blank");
                    }
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : "Xuất SCORM thất bại.";
                    toast.error(msg);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{t("instructorBuilder.scormExportBtn")}</span>
              </button>

              <label className="px-3.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>{t("instructorBuilder.scormImportBtn")}</span>
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setScormImporting(true);
                      toast.info("Đang phân tích gói SCORM...");
                      const mockKey = `scorm/uploads/${Date.now()}_${file.name}`;
                      const client = getRpcClient(CatalogService);
                      const res = await client.parseScormPackage({ scormObjectKey: mockKey, targetCourseId: courseId });
                      setScormObjectKey(mockKey);
                      setScormPreviewCourse(res.coursePreview || null);
                      setScormIsSingleItem(res.isSingleItem);
                      setShowScormReviewModal(true);
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : "Không thể phân tích gói SCORM.";
                      toast.error(msg);
                    } finally {
                      setScormImporting(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>

              <Link
                href={`/instructor/courses/${courseId}/question-bank`}
                className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>{t("instructorBuilder.questionBankMenuBtn")}</span>
              </Link>

              <Link
                href={`/instructor/courses/${courseId}/analytics`}
                className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>{t("instructorBuilder.analyticsBtn")}</span>
              </Link>

              <Link
                href={`/instructor/courses/${courseId}/announcements`}
                className="px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 text-xs font-bold hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <span>{t("instructorBuilder.announcementBtn")}</span>
              </Link>

              {isInstructorOrAdmin && (
                <button
                  onClick={() => setShowWeekModal(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t("instructorBuilder.addWeekBtn")}</span>
                </button>
              )}
            </div>
          </div>
        )}



        {/* Course Syllabus Tree Builder View */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {t("instructorBuilder.syllabusTitle")}
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {t("instructorBuilder.totalWeeks")} {course?.weekModules?.length || 0}
            </span>
          </div>

          {(!course?.weekModules || course.weekModules.length === 0) ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
              <svg className="w-12 h-12 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">{t("instructorBuilder.noWeeksTitle")}</p>
                <p className="text-xs text-slate-500">{t("instructorBuilder.noWeeksDesc")}</p>
              </div>
              {isInstructorOrAdmin && (
                <button
                  onClick={() => setShowWeekModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t("instructorBuilder.createFirstWeekBtn")}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {course.weekModules.map((week, wIdx) => (
                <div
                  key={week.id}
                  draggable={isInstructorOrAdmin}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setActiveDrag({ type: "week", id: week.id, startIndex: wIdx, currentIndex: wIdx });
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (activeDrag && activeDrag.type === "week" && activeDrag.currentIndex !== wIdx) {
                      handleLiveReorderWeeks(activeDrag.currentIndex, wIdx);
                      setActiveDrag({ ...activeDrag, currentIndex: wIdx });
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={async (e) => {
                    e.stopPropagation();
                    if (activeDrag && activeDrag.currentIndex !== activeDrag.startIndex) {
                      await handleSaveWeekOrder();
                    }
                    setActiveDrag(null);
                  }}
                  className={`bg-white dark:bg-slate-900 rounded-3xl border ${activeDrag?.type === "week" && activeDrag.id === week.id
                    ? "border-blue-500 ring-2 ring-blue-500/50 shadow-xl opacity-100 scale-[1.01]"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    } p-6 shadow-sm space-y-4`}
                >
                  {/* Week Module Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isInstructorOrAdmin && (
                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700">
                            <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-grab active:cursor-grabbing select-none" title={t("instructorBuilder.dragWeek")}>
                              ⋮⋮
                            </span>
                          </div>
                        )}
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-black uppercase">
                          {t("instructorBuilder.weekLabel")} {week.weekNumber}
                        </span>
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                          {week.title}
                        </h3>
                      </div>
                      {week.summary && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {week.summary}
                        </p>
                      )}
                    </div>

                    {isInstructorOrAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingWeek({ id: week.id, title: week.title, summary: week.summary })}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>{t("instructorBuilder.editWeekBtn")}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteWeek(week.id, week.title)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:bg-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>{t("instructorBuilder.deleteWeekBtn")}</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowLessonModal(week.id);
                            setLessonTitle("");
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>{t("instructorBuilder.addLessonBtn")}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lessons List under this Week */}
                  {(!week.lessons || week.lessons.length === 0) ? (
                    <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                      <p className="text-xs text-slate-400">{t("instructorBuilder.noLessonsYet")} {week.weekNumber}</p>
                    </div>
                  ) : (
                    <div className="space-y-4 pl-2 sm:pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                      {week.lessons.map((lesson, lIdx) => (
                        <div
                          key={lesson.id}
                          draggable={isInstructorOrAdmin}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.effectAllowed = "move";
                            setActiveDrag({ type: "lesson", id: lesson.id, containerId: week.id, startIndex: lIdx, currentIndex: lIdx });
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (activeDrag && activeDrag.type === "lesson" && activeDrag.containerId === week.id && activeDrag.currentIndex !== lIdx) {
                              handleLiveReorderLessons(week.id, activeDrag.currentIndex, lIdx);
                              setActiveDrag({ ...activeDrag, currentIndex: lIdx });
                            }
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnd={async (e) => {
                            e.stopPropagation();
                            if (activeDrag && activeDrag.currentIndex !== activeDrag.startIndex && activeDrag.containerId) {
                              await handleSaveLessonOrder(activeDrag.containerId);
                            }
                            setActiveDrag(null);
                          }}
                          className={`bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border ${activeDrag?.type === "lesson" && activeDrag.id === lesson.id
                            ? "border-indigo-500 ring-2 ring-indigo-500/50 shadow-xl opacity-100 scale-[1.01]"
                            : "border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                            } space-y-3`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isInstructorOrAdmin && (
                                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-800">
                                  <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-grab active:cursor-grabbing select-none" title={t("instructorBuilder.dragLesson")}>
                                    ⋮⋮
                                  </span>
                                </div>
                              )}
                              <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                {lesson.title}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                ({lesson.estimatedMinutes} {t("instructorBuilder.minLabel")})
                              </span>
                            </div>

                            {isInstructorOrAdmin && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setEditingLesson({ id: lesson.id, title: lesson.title, estimatedMinutes: lesson.estimatedMinutes })}
                                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <span>{t("instructorBuilder.editLessonBtn")}</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                                  className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span>{t("instructorBuilder.deleteLessonBtn")}</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setShowItemModal(lesson.id);
                                    setItemTitle("");
                                    setInVideoQuizzes([]);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  <span>{t("instructorBuilder.addItemBtn")}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Learning Items under this Lesson */}
                          {(!lesson.items || lesson.items.length === 0) ? (
                            <p className="text-[11px] italic text-slate-400 pl-6">{t("instructorBuilder.noItemsYet")}</p>
                          ) : (
                            <div className="space-y-2 pl-4">
                              {lesson.items.map((item, iIdx) => (
                                <div
                                  key={item.id}
                                  draggable={isInstructorOrAdmin}
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.effectAllowed = "move";
                                    setActiveDrag({ type: "item", id: item.id, containerId: lesson.id, startIndex: iIdx, currentIndex: iIdx });
                                  }}
                                  onDragEnter={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (activeDrag && activeDrag.type === "item" && activeDrag.containerId === lesson.id && activeDrag.currentIndex !== iIdx) {
                                      handleLiveReorderItems(lesson.id, activeDrag.currentIndex, iIdx);
                                      setActiveDrag({ ...activeDrag, currentIndex: iIdx });
                                    }
                                  }}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDragEnd={async (e) => {
                                    e.stopPropagation();
                                    if (activeDrag && activeDrag.currentIndex !== activeDrag.startIndex && activeDrag.containerId) {
                                      await handleSaveItemOrder(activeDrag.containerId);
                                    }
                                    setActiveDrag(null);
                                  }}
                                  className={`flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border ${activeDrag?.type === "item" && activeDrag.id === item.id
                                    ? "border-blue-500 ring-2 ring-blue-500/50 shadow-xl opacity-100 scale-[1.01]"
                                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                    } text-xs shadow-2xs cursor-grab active:cursor-grabbing`}
                                >
                                  <div className="flex items-center gap-2">
                                    {isInstructorOrAdmin && (
                                      <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
                                        <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-0.5 font-bold cursor-grab active:cursor-grabbing select-none" title={t("instructorBuilder.dragItem")}>
                                          ⋮⋮
                                        </span>
                                      </div>
                                    )}
                                    {item.type === ItemType.VIDEO ? (
                                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                                        VIDEO
                                      </span>
                                    ) : item.type === ItemType.READING ? (
                                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                                        READING
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
                                        QUIZ
                                      </span>
                                    )}
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                      {item.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {item.estimatedMinutes} {t("instructorBuilder.minLabel")}
                                    </span>

                                    <Link
                                      href={`/learn/${courseId}?itemId=${item.id}`}
                                      target="_blank"
                                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title={t("instructorBuilder.previewItemTooltip")}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    </Link>

                                    {isInstructorOrAdmin && (
                                      <>
                                        <button
                                          onClick={() => setEditingItem({
                                            id: item.id,
                                            title: item.title,
                                            type: item.type,
                                            estimatedMinutes: item.estimatedMinutes,
                                            videoUrl: item.videoUrl || "",
                                            vttSubtitleUrl: item.vttSubtitleUrl || "",
                                            autoTranscribe: item.autoTranscribe || false,
                                            content: item.readingMarkdown || "",
                                            inVideoQuizzes: item.inVideoQuizzes ? item.inVideoQuizzes.map(q => ({
                                              timestampSeconds: q.timestampSeconds,
                                              question: q.question,
                                              options: q.options ? Array.from(q.options) : [],
                                              correctOptionIndex: q.correctOptionIndex,
                                              explanation: q.explanation || ""
                                            })) : [],
                                            starterCode: item.starterCode || "",
                                            testCasesJson: item.testCasesJson || "",
                                            language: item.language || "",
                                            rubricCriteriaJson: item.rubricCriteriaJson || "",
                                            quizMatrixId: item.quizMatrixId || "",
                                          })}
                                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                          title={t("instructorBuilder.editItemTooltip")}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteItem(item.id, item.title)}
                                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                          title={t("instructorBuilder.deleteItemTooltip")}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal: Thêm Tuần học Mới */}
      <Modal
        isOpen={showWeekModal}
        onClose={() => setShowWeekModal(false)}
        title={t("instructorBuilder.modalAddWeekTitle")}
        size="md"
      >
        <form onSubmit={handleCreateWeek} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldWeekNumber")}</label>
            <input
              type="number"
              min={1}
              value={weekNumber}
              onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldWeekTitle")}</label>
            <input
              type="text"
              value={weekTitle}
              onChange={(e) => setWeekTitle(e.target.value)}
              placeholder={t("instructorBuilder.fieldWeekTitlePlaceholder")}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldWeekSummary")}</label>
            <textarea
              rows={3}
              value={weekSummary}
              onChange={(e) => setWeekSummary(e.target.value)}
              placeholder={t("instructorBuilder.fieldWeekSummaryPlaceholder")}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowWeekModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {t("instructorBuilder.cancelBtn")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
            >
              {saving ? t("instructorBuilder.creatingBtn") : t("instructorBuilder.confirmAddWeekBtn")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Thêm Bài học Mới */}
      <Modal
        isOpen={Boolean(showLessonModal)}
        onClose={() => setShowLessonModal(null)}
        title={t("instructorBuilder.modalAddLessonTitle")}
        size="md"
      >
        <form onSubmit={handleCreateLesson} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldLessonTitle")}</label>
            <input
              type="text"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder={t("instructorBuilder.fieldLessonTitlePlaceholder")}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldDuration")}</label>
            <input
              type="number"
              min={1}
              value={lessonMinutes}
              onChange={(e) => setLessonMinutes(parseInt(e.target.value) || 15)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowLessonModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {t("instructorBuilder.cancelBtn")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
            >
              {saving ? t("instructorBuilder.creatingBtn") : t("instructorBuilder.confirmAddLessonBtn")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Thêm Học liệu Mới (Learning Item: Video/Reading) */}
      <Modal
        isOpen={Boolean(showItemModal)}
        onClose={() => setShowItemModal(null)}
        title={t("instructorBuilder.modalAddItemTitle")}
        size="lg"
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldItemType")}</label>
            <select
              value={itemType}
              onChange={(e) => setItemType(parseInt(e.target.value) as ItemType)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
            >
              <option value={ItemType.VIDEO}>{t("instructorBuilder.optionVideo")}</option>
              <option value={ItemType.READING}>{t("instructorBuilder.optionReading")}</option>
              <option value={ItemType.PRACTICE_QUIZ}>{t("instructorBuilder.optionPracticeQuiz")}</option>
              <option value={ItemType.GRADED_QUIZ}>{t("instructorBuilder.optionGradedQuiz")}</option>
              <option value={ItemType.AUTO_GRADED_LAB}>{t("instructorBuilder.optionLab")}</option>
              <option value={ItemType.PEER_REVIEW}>{t("instructorBuilder.optionPeerReview")}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldItemTitle")}</label>
            <input
              type="text"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder={t("instructorBuilder.fieldItemTitlePlaceholder")}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldDuration")}</label>
            <input
              type="number"
              min={1}
              value={itemMinutes}
              onChange={(e) => setItemMinutes(parseInt(e.target.value) || 10)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              required
            />
          </div>

          {itemType === ItemType.VIDEO && (
            <div className="space-y-4">
              <VideoUploadWidget
                value={videoUrl}
                onChange={setVideoUrl}
                folder="videos"
                label="Học liệu Video Bài giảng (Upload Tệp hoặc Đường dẫn)"
              />


              <InVideoQuizEditor
                videoUrl={videoUrl}
                quizzes={inVideoQuizzes}
                onChange={setInVideoQuizzes}
              />
            </div>
          )}

          {itemType === ItemType.READING && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">{t("instructorBuilder.fieldReadingContent")}</label>
                <button
                  type="button"
                  onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {showMarkdownPreview ? "Sửa Markdown" : "Xem Preview"}
                </button>
              </div>
              {showMarkdownPreview ? (
                <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 prose dark:prose-invert max-w-none text-sm min-h-[140px]">
                  {readingMarkdown || <span className="text-slate-400 italic">Chưa có nội dung xem trước...</span>}
                </div>
              ) : (
                <textarea
                  rows={6}
                  value={readingMarkdown}
                  onChange={(e) => setReadingMarkdown(e.target.value)}
                  placeholder={t("instructorBuilder.fieldReadingPlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono"
                  required
                />
              )}
            </div>
          )}

          {(itemType === ItemType.PRACTICE_QUIZ || itemType === ItemType.GRADED_QUIZ) && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cấu hình Ma trận Đề thi (Quiz Matrix)</div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mã Kho Ngân hàng Đề (Question Bank ID)</label>
                <select
                  value={quizBankId}
                  onChange={(e) => setQuizBankId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="">{t("instructorBuilder.selectQuestionBankPlaceholder")}</option>
                  {questionBanks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.title} ({bank.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Thời gian đếm ngược (Phút)</label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={quizTimeLimit}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setQuizTimeLimit("");
                      } else {
                        const num = parseInt(val);
                        setQuizTimeLimit(isNaN(num) ? "" : Math.min(1440, Math.max(1, num)));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Điểm đỗ tối thiểu (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={quizPassingThreshold}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setQuizPassingThreshold("");
                      } else {
                        const num = parseFloat(val);
                        setQuizPassingThreshold(isNaN(num) ? "" : Math.min(100, Math.max(0, num)));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Số câu Dễ (40%)</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={quizEasyCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setQuizEasyCount("");
                      } else {
                        const num = parseInt(val);
                        setQuizEasyCount(isNaN(num) ? "" : Math.min(200, Math.max(0, num)));
                      }
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Số câu TB (40%)</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={quizMediumCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setQuizMediumCount("");
                      } else {
                        const num = parseInt(val);
                        setQuizMediumCount(isNaN(num) ? "" : Math.min(200, Math.max(0, num)));
                      }
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Số câu Khó (20%)</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={quizHardCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setQuizHardCount("");
                      } else {
                        const num = parseInt(val);
                        setQuizHardCount(isNaN(num) ? "" : Math.min(200, Math.max(0, num)));
                      }
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {itemType === ItemType.AUTO_GRADED_LAB && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cấu hình Docker Sandbox Lab</div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Ngôn ngữ Lập trình</label>
                <select
                  value={labLanguage}
                  onChange={(e) => setLabLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="python">Python 3.12</option>
                  <option value="javascript">JavaScript / Node.js</option>
                  <option value="cpp">C++ 20</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mã mẫu ban đầu (Starter Code)</label>
                <textarea
                  rows={3}
                  value={labStarterCode}
                  onChange={(e) => setLabStarterCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bộ Test Cases (JSON format)</label>
                <textarea
                  rows={3}
                  value={labTestCasesJson}
                  onChange={(e) => setLabTestCasesJson(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {itemType === ItemType.PEER_REVIEW && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cấu hình Bảng tiêu chí Rubric Chấm chéo</div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bảng tiêu chí Rubric (JSON Format)</label>
                <textarea
                  rows={4}
                  value={peerRubricJson}
                  onChange={(e) => setPeerRubricJson(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowItemModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {t("instructorBuilder.cancelBtn")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
            >
              {saving ? t("instructorBuilder.creatingBtn") : t("instructorBuilder.confirmAddItemBtn")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Chỉnh sửa Tuần học */}
      <Modal
        isOpen={Boolean(editingWeek)}
        onClose={() => setEditingWeek(null)}
        title={t("instructorBuilder.modalEditWeekTitle")}
        size="md"
      >
        {editingWeek && (
          <form onSubmit={handleUpdateWeek} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldWeekTitle")}</label>
              <input
                type="text"
                value={editingWeek.title}
                onChange={(e) => setEditingWeek({ ...editingWeek, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldWeekSummary")}</label>
              <textarea
                rows={3}
                value={editingWeek.summary}
                onChange={(e) => setEditingWeek({ ...editingWeek, summary: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingWeek(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {t("instructorBuilder.cancelBtn")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {saving ? t("instructorBuilder.savingBtn") : t("instructorBuilder.saveChangesBtn")}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Chỉnh sửa Bài học */}
      <Modal
        isOpen={Boolean(editingLesson)}
        onClose={() => setEditingLesson(null)}
        title={t("instructorBuilder.modalEditLessonTitle")}
        size="md"
      >
        {editingLesson && (
          <form onSubmit={handleUpdateLesson} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldLessonTitle")}</label>
              <input
                type="text"
                value={editingLesson.title}
                onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldDuration")}</label>
              <input
                type="number"
                min={1}
                value={editingLesson.estimatedMinutes}
                onChange={(e) => setEditingLesson({ ...editingLesson, estimatedMinutes: parseInt(e.target.value) || 15 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingLesson(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {t("instructorBuilder.cancelBtn")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {saving ? t("instructorBuilder.savingBtn") : t("instructorBuilder.saveChangesBtn")}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Chỉnh sửa Học liệu */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title={t("instructorBuilder.modalEditItemTitle")}
        size="lg"
      >
        {editingItem && (
          <form onSubmit={handleUpdateItem} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldItemTitle")}</label>
              <input
                type="text"
                value={editingItem.title}
                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldDuration")}</label>
              <input
                type="number"
                min={1}
                value={editingItem.estimatedMinutes}
                onChange={(e) => setEditingItem({ ...editingItem, estimatedMinutes: parseInt(e.target.value) || 10 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                required
              />
            </div>

            {editingItem.type === ItemType.VIDEO && (
              <div className="space-y-4">
                <VideoUploadWidget
                  value={editingItem.videoUrl}
                  onChange={(url) => setEditingItem({ ...editingItem, videoUrl: url })}
                  folder="videos"
                  label="Học liệu Video Bài giảng (Upload Tệp hoặc Đường dẫn)"
                />



                <InVideoQuizEditor
                  videoUrl={editingItem.videoUrl}
                  quizzes={editingItem.inVideoQuizzes || []}
                  onChange={(quizzes) => setEditingItem({ ...editingItem, inVideoQuizzes: quizzes })}
                />
              </div>
            )}

            {editingItem.type === ItemType.READING && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{t("instructorBuilder.fieldReadingContent")}</label>
                <textarea
                  rows={6}
                  value={editingItem.content}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  placeholder="# Giới thiệu bài học..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono"
                  required
                />
              </div>
            )}

            {(editingItem.type === ItemType.PRACTICE_QUIZ || editingItem.type === ItemType.GRADED_QUIZ) && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cấu hình Ma trận Đề thi (Quiz Matrix)</div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mã Kho Ngân hàng Đề (Question Bank ID)</label>
                  <select
                    value={editingItem.quizMatrixId}
                    onChange={(e) => setEditingItem({ ...editingItem, quizMatrixId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="">{t("instructorBuilder.selectQuestionBankPlaceholder")}</option>
                    {questionBanks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.title} ({bank.id})
                      </option>
                    ))}
                  </select>
                </div>
                {/* Visual configurations to match creation UI */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Thời gian đếm ngược (Phút)</label>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      defaultValue={45}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Điểm đỗ tối thiểu (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={80}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Số câu Dễ (40%)</label>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      defaultValue={4}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Số câu TB (40%)</label>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      defaultValue={4}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Số câu Khó (20%)</label>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      defaultValue={2}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {editingItem.type === ItemType.AUTO_GRADED_LAB && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cấu hình Docker Sandbox Lab</div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Ngôn ngữ Lập trình</label>
                  <select
                    value={editingItem.language}
                    onChange={(e) => setEditingItem({ ...editingItem, language: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="python">Python 3.12</option>
                    <option value="javascript">JavaScript / Node.js</option>
                    <option value="cpp">C++ 20</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mã mẫu ban đầu (Starter Code)</label>
                  <textarea
                    rows={3}
                    value={editingItem.starterCode}
                    onChange={(e) => setEditingItem({ ...editingItem, starterCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bộ Test Cases (JSON format)</label>
                  <textarea
                    rows={3}
                    value={editingItem.testCasesJson}
                    onChange={(e) => setEditingItem({ ...editingItem, testCasesJson: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {editingItem.type === ItemType.PEER_REVIEW && (
              <div className="space-y-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Cấu hình Bảng tiêu chí Rubric Chấm chéo</div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bảng tiêu chí Rubric (JSON Format)</label>
                  <textarea
                    rows={4}
                    value={editingItem.rubricCriteriaJson}
                    onChange={(e) => setEditingItem({ ...editingItem, rubricCriteriaJson: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {t("instructorBuilder.cancelBtn")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {saving ? t("instructorBuilder.savingBtn") : t("instructorBuilder.saveChangesBtn")}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: SCORM Import & Review Editor Workspace */}
      <Modal
        isOpen={showScormReviewModal}
        onClose={() => setShowScormReviewModal(false)}
        title={t("instructorBuilder.scormImportTitle")}
        size="xl"
      >
        <div className="space-y-6">
          <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white">
                {scormIsSingleItem ? "Single Item Mode" : "Full Course Mode"}
              </span>
              <span className="text-xs font-mono text-slate-500">{scormObjectKey}</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {scormPreviewCourse?.title || "SCORM Package Extracted Structure"}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t("instructorBuilder.scormReviewSubtitle")}
            </p>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {scormPreviewCourse?.weekModules?.map((wm, wIdx) => (
              <div key={wm.id || wIdx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Tuần {wm.weekNumber}: {wm.title}
                </div>
                <div className="space-y-2 pl-4 border-l-2 border-indigo-400">
                  {wm.lessons?.map((l, lIdx) => (
                    <div key={l.id || lIdx} className="space-y-1">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        📖 {l.title} ({l.estimatedMinutes} min)
                      </div>
                      <div className="space-y-1 pl-3">
                        {l.items?.map((item, iIdx) => (
                          <div key={item.id || iIdx} className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span>📄 {item.title}</span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {ItemType[item.type] || "READING"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowScormReviewModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {t("instructorBuilder.cancelBtn")}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  setScormImporting(true);
                  const client = getRpcClient(CatalogService);
                  await client.importCourseFromScorm({ scormObjectKey, courseId });
                  toast.success("Đã bóc tách & lưu nội dung SCORM vào khóa học thành công!");
                  setShowScormReviewModal(false);
                  await fetchCourseDetail();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "Import SCORM thất bại.";
                  toast.error(msg);
                } finally {
                  setScormImporting(false);
                }
              }}
              disabled={scormImporting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {scormImporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang Import...</span>
                </>
              ) : (
                <span>{t("instructorBuilder.scormConfirmImportBtn")}</span>
              )}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
