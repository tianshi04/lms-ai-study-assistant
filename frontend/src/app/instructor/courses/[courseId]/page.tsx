"use client";

import { useEffect, useState, useSyncExternalStore, use } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, ItemType, type Course, type LearningItem } from "@/gen/catalog/v1/catalog_pb";
import { Navbar } from "@/components/layout/Navbar";

const emptySubscribe = () => () => {};

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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
  const [readingMarkdown, setReadingMarkdown] = useState("");
  const [scormFile, setScormFile] = useState<File | null>(null);

  // Edit Modals State
  const [editingWeek, setEditingWeek] = useState<{ id: string; title: string; summary: string } | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ id: string; title: string; estimatedMinutes: number } | null>(null);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    title: string;
    type: ItemType;
    estimatedMinutes: number;
    videoUrl: string;
    content: string;
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
    } catch (err: unknown) {
      console.error("Failed to load course details:", err);
      const errMsg = err instanceof Error ? err.message : "Khóa học không tồn tại.";
      setMessage({ type: "error", text: errMsg });
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
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Failed to load course details:", err);
          const errMsg = err instanceof Error ? err.message : "Khóa học không tồn tại.";
          setMessage({ type: "error", text: errMsg });
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
  }, [courseId]);

  // Handlers for creating elements
  const handleCreateWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weekTitle.trim()) return;

    setSaving(true);
    setMessage(null);

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
      setMessage({ type: "success", text: `Đã thêm Tuần ${weekNumber} vào khóa học thành công!` });
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thêm Tuần học thất bại.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLessonModal || !lessonTitle.trim()) return;

    setSaving(true);
    setMessage(null);

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
      setMessage({ type: "success", text: `Đã thêm Bài học "${lessonTitle}" thành công!` });
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thêm Bài học thất bại.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showItemModal || !itemTitle.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const client = getRpcClient(CatalogService);

      if (itemType === ItemType.SCORM) {
        if (!scormFile) {
          throw new Error("Vui lòng chọn tệp tin ZIP SCORM.");
        }

        // Generate a random ID for the new item
        const itemId = typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "scorm-" + Math.random().toString(36).substring(2, 15) + "-" + Date.now().toString(36);

        // 1. Get presigned upload URL
        const uploadRes = await client.getScormUploadUrl({
          itemId,
          filename: scormFile.name,
        });

        // Ensure http://minio:9000 internal domain is converted to http://localhost:9000 for browser fetch
        const targetUploadUrl = uploadRes.uploadUrl.replace("http://minio:9000", "http://localhost:9000");

        // 2. Upload file to S3
        const uploadResponse = await fetch(targetUploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/zip",
          },
          body: scormFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("Không thể tải tệp tin ZIP lên bộ nhớ lưu trữ.");
        }

        // 3. Process SCORM package on backend
        await client.processScormPackage({
          courseId,
          lessonId: showItemModal,
          title: itemTitle,
          estimatedMinutes: itemMinutes,
          objectKey: uploadRes.objectKey,
        });

        setScormFile(null);
      } else {
        await client.createLearningItem({
          courseId,
          lessonId: showItemModal,
          title: itemTitle,
          type: itemType,
          estimatedMinutes: itemMinutes,
          videoUrl: itemType === ItemType.VIDEO ? videoUrl : "",
          readingMarkdown: itemType === ItemType.READING ? readingMarkdown : "",
        });
      }

      setShowItemModal(null);
      setItemTitle("");
      setReadingMarkdown("");
      setMessage({ type: "success", text: `Đã thêm Học liệu "${itemTitle}" vào bài học thành công!` });
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thêm Học liệu thất bại.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWeek || !editingWeek.title.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const client = getRpcClient(CatalogService);
      await client.updateWeekModule({
        id: editingWeek.id,
        courseId,
        title: editingWeek.title,
        summary: editingWeek.summary,
      });

      setEditingWeek(null);
      setMessage({ type: "success", text: "Đã cập nhật thông tin Tuần học thành công!" });
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cập nhật Tuần học thất bại.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson || !editingLesson.title.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const client = getRpcClient(CatalogService);
      await client.updateLesson({
        id: editingLesson.id,
        courseId,
        title: editingLesson.title,
        estimatedMinutes: editingLesson.estimatedMinutes,
      });

      setEditingLesson(null);
      setMessage({ type: "success", text: "Đã cập nhật Bài học thành công!" });
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cập nhật Bài học thất bại.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const client = getRpcClient(CatalogService);
      await client.updateLearningItem({
        id: editingItem.id,
        courseId,
        title: editingItem.title,
        estimatedMinutes: editingItem.estimatedMinutes,
        videoUrl: editingItem.type === ItemType.VIDEO ? editingItem.videoUrl : undefined,
        readingMarkdown: editingItem.type === ItemType.READING ? editingItem.content : undefined,
      });

      setEditingItem(null);
      setMessage({ type: "success", text: "Đã cập nhật nội dung Học liệu thành công!" });
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cập nhật Học liệu thất bại.";
      setMessage({ type: "error", text: msg });
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
      setMessage({ type: "success", text: `Đã xóa Tuần học "${weekTitle}" thành công!` });
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xóa Tuần học thất bại.";
      setMessage({ type: "error", text: msg });
    }
  };

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Bài học "${lessonTitle}"?`)) {
      return;
    }
    try {
      const client = getRpcClient(CatalogService);
      await client.deleteLesson({ id: lessonId, courseId });
      setMessage({ type: "success", text: `Đã xóa Bài học "${lessonTitle}" thành công!` });
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xóa Bài học thất bại.";
      setMessage({ type: "error", text: msg });
    }
  };

  const handleDeleteItem = async (itemId: string, itemTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Học liệu "${itemTitle}"?`)) {
      return;
    }
    try {
      const client = getRpcClient(CatalogService);
      await client.deleteLearningItem({ id: itemId, courseId });
      setMessage({ type: "success", text: `Đã xóa Học liệu "${itemTitle}" thành công!` });
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xóa Học liệu thất bại.";
      setMessage({ type: "error", text: msg });
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
      setMessage({ type: "success", text: "Đã cập nhật vị trí Tuần học thành công!" });
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
      setMessage({ type: "success", text: "Đã cập nhật thứ tự Bài học thành công!" });
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
      setMessage({ type: "success", text: "Đã cập nhật thứ tự Học liệu thành công!" });
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Đang tải cấu trúc bài giảng khóa học...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Return Nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/instructor/courses" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Giảng viên
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Biên soạn bài học</span>
          </div>

          <Link
            href="/instructor/courses"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Danh sách Khóa học</span>
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
                <span>Giảng viên: {course.instructorNames.join(", ")}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <Link
                href={`/instructor/courses/${courseId}/analytics`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Thống kê lớp học</span>
              </Link>

              <Link
                href={`/instructor/courses/${courseId}/announcements`}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 text-xs font-bold hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <span>Đăng Thông báo</span>
              </Link>

              {isInstructorOrAdmin && (
                <button
                  onClick={() => setShowWeekModal(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Thêm Tuần học</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success / Error Toast Notification */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-md transition-all ${
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20"
                : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="p-1 rounded-md opacity-60 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Course Syllabus Tree Builder View */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Cấu trúc Chương trình bài giảng (Course Syllabus)
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              Tổng số tuần: {course?.weekModules?.length || 0}
            </span>
          </div>

          {(!course?.weekModules || course.weekModules.length === 0) ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
              <svg className="w-12 h-12 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">Khóa học này chưa có Tuần học nào</p>
                <p className="text-xs text-slate-500">Hãy bấm nút &quot;Thêm Tuần học&quot; để khởi tạo mô-đun bài giảng đầu tiên.</p>
              </div>
              {isInstructorOrAdmin && (
                <button
                  onClick={() => setShowWeekModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Khởi tạo Tuần 1 ngay</span>
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
                  onDragEnd={async () => {
                    if (activeDrag && activeDrag.currentIndex !== activeDrag.startIndex) {
                      await handleSaveWeekOrder();
                    }
                    setActiveDrag(null);
                  }}
                  className={`bg-white dark:bg-slate-900 rounded-3xl border ${
                    activeDrag?.type === "week" && activeDrag.id === week.id
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
                            <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-grab active:cursor-grabbing select-none" title="Kéo thả Tuần học để sắp xếp">
                              ⋮⋮
                            </span>
                          </div>
                        )}
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-black uppercase">
                          Tuần {week.weekNumber}
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
                          <span>Sửa Tuần</span>
                        </button>

                        <button
                          onClick={() => handleDeleteWeek(week.id, week.title)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:bg-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Xóa Tuần</span>
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
                          <span>Thêm Bài học</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lessons List under this Week */}
                  {(!week.lessons || week.lessons.length === 0) ? (
                    <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                      <p className="text-xs text-slate-400">Chưa có Bài học nào trong Tuần {week.weekNumber}</p>
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
                          onDragEnd={async () => {
                            if (activeDrag && activeDrag.currentIndex !== activeDrag.startIndex && activeDrag.containerId) {
                              await handleSaveLessonOrder(activeDrag.containerId);
                            }
                            setActiveDrag(null);
                          }}
                          className={`bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border ${
                            activeDrag?.type === "lesson" && activeDrag.id === lesson.id
                              ? "border-indigo-500 ring-2 ring-indigo-500/50 shadow-xl opacity-100 scale-[1.01]"
                              : "border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                          } space-y-3`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isInstructorOrAdmin && (
                                <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-800">
                                  <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-grab active:cursor-grabbing select-none" title="Kéo thả Bài học để sắp xếp">
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
                                ({lesson.estimatedMinutes} phút)
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
                                  <span>Sửa Bài</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                                  className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span>Xóa Bài</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setShowItemModal(lesson.id);
                                    setItemTitle("");
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  <span>Thêm Học liệu</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Learning Items under this Lesson */}
                          {(!lesson.items || lesson.items.length === 0) ? (
                            <p className="text-[11px] italic text-slate-400 pl-6">Chưa có nội dung video/bài đọc</p>
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
                                  onDragEnd={async () => {
                                    if (activeDrag && activeDrag.currentIndex !== activeDrag.startIndex && activeDrag.containerId) {
                                      await handleSaveItemOrder(activeDrag.containerId);
                                    }
                                    setActiveDrag(null);
                                  }}
                                  className={`flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border ${
                                    activeDrag?.type === "item" && activeDrag.id === item.id
                                      ? "border-blue-500 ring-2 ring-blue-500/50 shadow-xl opacity-100 scale-[1.01]"
                                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                  } text-xs shadow-2xs cursor-grab active:cursor-grabbing`}
                                >
                                  <div className="flex items-center gap-2">
                                    {isInstructorOrAdmin && (
                                      <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
                                        <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-0.5 font-bold cursor-grab active:cursor-grabbing select-none" title="Kéo thả để xếp thứ tự">
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
                                      {item.estimatedMinutes} phút
                                    </span>

                                    <Link
                                      href={`/learn/${courseId}?itemId=${item.id}`}
                                      target="_blank"
                                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="Xem trước nội dung trong Trình phát bài học"
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
                                            content: item.readingMarkdown || "",
                                          })}
                                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                          title="Sửa nội dung học liệu"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteItem(item.id, item.title)}
                                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                          title="Xóa học liệu"
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
      {showWeekModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Thêm Tuần học Mới (Week Module)</h3>
              <button onClick={() => setShowWeekModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateWeek} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Số Tuần học</label>
                <input
                  type="number"
                  min={1}
                  value={isNaN(weekNumber) ? "" : weekNumber}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setWeekNumber(isNaN(val) ? 1 : val);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tiêu đề Tuần học</label>
                <input
                  type="text"
                  value={weekTitle ?? ""}
                  onChange={(e) => setWeekTitle(e.target.value)}
                  placeholder="Ví dụ: Week 1: Giới thiệu về Neural Networks"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mô tả tóm tắt</label>
                <textarea
                  rows={3}
                  value={weekSummary ?? ""}
                  onChange={(e) => setWeekSummary(e.target.value)}
                  placeholder="Tóm tắt nội dung chính học viên sẽ thu hoạch được..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWeekModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  {saving ? "Đang tạo..." : "Xác nhận tạo Tuần học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Thêm Bài học Mới */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Thêm Bài học Mới (Lesson)</h3>
              <button onClick={() => setShowLessonModal(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tên Bài học</label>
                <input
                  type="text"
                  value={lessonTitle ?? ""}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Ví dụ: Lesson 1: Activation Functions (ReLU, Sigmoid)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Thời lượng ước tính (Phút)</label>
                <input
                  type="number"
                  min={1}
                  value={isNaN(lessonMinutes) ? "" : lessonMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setLessonMinutes(isNaN(val) ? 15 : val);
                  }}
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
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  {saving ? "Đang tạo..." : "Xác nhận tạo Bài học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Thêm Học liệu Mới (Learning Item: Video/Reading) */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Thêm Học liệu Mới (Learning Item)</h3>
              <button onClick={() => { setShowItemModal(null); setScormFile(null); setItemType(ItemType.VIDEO); }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Loại Học liệu</label>
                <select
                  value={itemType}
                  onChange={(e) => {
                    setItemType(parseInt(e.target.value) as ItemType);
                    setScormFile(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                >
                  <option value={ItemType.VIDEO}>VIDEO (Bài giảng Video)</option>
                  <option value={ItemType.READING}>READING (Bài đọc Markdown)</option>
                  <option value={ItemType.SCORM}>SCORM (Bài học tương tác SCORM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tên Học liệu</label>
                <input
                  type="text"
                  value={itemTitle ?? ""}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder={itemType === ItemType.SCORM ? "Ví dụ: Khóa học SCORM Golf" : "Ví dụ: Video: Hướng dẫn cài đặt NumPy & PyTorch"}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Thời lượng ước tính (Phút)</label>
                <input
                  type="number"
                  min={1}
                  value={isNaN(itemMinutes) ? "" : itemMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setItemMinutes(isNaN(val) ? 10 : val);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  required
                />
              </div>

              {itemType === ItemType.VIDEO ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Đường dẫn Video URL (.mp4 / streaming)</label>
                  <input
                    type="url"
                    value={videoUrl ?? ""}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono"
                    required
                  />
                </div>
              ) : itemType === ItemType.READING ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nội dung Bài đọc (Markdown format)</label>
                  <textarea
                    rows={5}
                    value={readingMarkdown ?? ""}
                    onChange={(e) => setReadingMarkdown(e.target.value)}
                    placeholder="# Giới thiệu bài học&#10;&#10;Nội dung lý thuyết chi tiết..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono"
                    required
                  />
                </div>
              ) : itemType === ItemType.SCORM ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tải lên gói SCORM (.zip)</label>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setScormFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Chọn tệp tin SCORM dạng nén ZIP (chứa file imsmanifest.xml ở thư mục gốc).
                  </p>
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowItemModal(null); setScormFile(null); setItemType(ItemType.VIDEO); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  {saving ? "Đang tạo..." : "Xác nhận tạo Học liệu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh sửa Tuần học */}
      {editingWeek && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Chỉnh sửa Tuần học</h3>
              <button onClick={() => setEditingWeek(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateWeek} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tiêu đề Tuần học</label>
                <input
                  type="text"
                  value={editingWeek.title}
                  onChange={(e) => setEditingWeek({ ...editingWeek, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mô tả tóm tắt</label>
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
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh sửa Bài học */}
      {editingLesson && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Chỉnh sửa Bài học</h3>
              <button onClick={() => setEditingLesson(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateLesson} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tên Bài học</label>
                <input
                  type="text"
                  value={editingLesson.title}
                  onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Thời lượng ước tính (Phút)</label>
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
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh sửa Học liệu */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Chỉnh sửa Nội dung Học liệu</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tên Học liệu</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Thời lượng ước tính (Phút)</label>
                <input
                  type="number"
                  min={1}
                  value={editingItem.estimatedMinutes}
                  onChange={(e) => setEditingItem({ ...editingItem, estimatedMinutes: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  required
                />
              </div>

              {editingItem.type === ItemType.VIDEO ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Đường dẫn Video URL (.mp4 / streaming)</label>
                  <input
                    type="url"
                    value={editingItem.videoUrl}
                    onChange={(e) => setEditingItem({ ...editingItem, videoUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Nội dung Bài đọc (Markdown format)</label>
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

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
