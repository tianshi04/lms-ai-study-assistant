"use client";

import { useEffect, useState, useCallback } from "react";
import { getRpcClient } from "@/lib/connect_client";
import {
  CatalogService,
  ItemType,
  type Course,
  type LearningItem,
} from "@/gen/catalog/v1/catalog_pb";
import { AssessmentService, type QuestionBank } from "@/gen/assessment/v1/assessment_pb";
import { useToast } from "@/components/ui/Toast";
import type { InVideoQuizItem } from "@/components/course/InVideoQuizEditor";

export interface LearningItemPayload {
  lessonId: string;
  title: string;
  type: ItemType;
  estimatedMinutes: number;
  videoUrl?: string;
  vttSubtitleUrl?: string;
  autoTranscribe?: boolean;
  inVideoQuizzes?: InVideoQuizItem[];
  readingMarkdown?: string;
  starterCode?: string;
  testCasesJson?: string;
  language?: string;
  rubricCriteriaJson?: string;
  quizBankId?: string;
  quizMatrixId?: string;
  quizTimeLimit?: number | string;
  quizPassingThreshold?: number | string;
  quizEasyCount?: number | string;
  quizMediumCount?: number | string;
  quizHardCount?: number | string;
  quizMaxAttempts?: number | string;
  quizCooldownHours?: number | string;
}

export interface UpdateItemPayload extends Omit<LearningItemPayload, "lessonId"> {
  id: string;
  quizMatrixId?: string;
}

export function useCourseBuilder(courseId: string) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingLaunch, setSubmittingLaunch] = useState(false);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{
    type: "week" | "lesson" | "item";
    id: string;
    title: string;
  } | null>(null);
  const toast = useToast();

  const fetchCourseDetail = useCallback(async () => {
    try {
      const client = getRpcClient(CatalogService);
      const res = await client.getCourseDetail({ idOrSlug: courseId });
      if (res.course) {
        setCourse(res.course);
      }

      const assessmentClient = getRpcClient(AssessmentService);
      const banksRes = await assessmentClient.listQuestionBanks({ courseId });
      setQuestionBanks(banksRes.banks || []);
    } catch (err: unknown) {
      console.error("Failed to load course details:", err);
      const errMsg = err instanceof Error ? err.message : "Khóa học không tồn tại.";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.getCourseDetail({ idOrSlug: courseId });
        if (!ignore && res.course) {
          setCourse(res.course);
        }

        const assessmentClient = getRpcClient(AssessmentService);
        const banksRes = await assessmentClient.listQuestionBanks({ courseId });
        if (!ignore) {
          setQuestionBanks(banksRes.banks || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Failed to load course details:", err);
          const errMsg = err instanceof Error ? err.message : "Khóa học không tồn tại.";
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
  }, [courseId, toast]);

  const handleSubmitForLaunch = async () => {
    if (!course) return;
    setSubmittingLaunch(true);
    try {
      const client = getRpcClient(CatalogService);
      const res = await client.submitCourseForLaunch({ courseId: course.id });
      if (res.course) {
        setCourse(res.course);
      }
      toast.success(
        "Đã gửi yêu cầu phê duyệt khóa học thành công! Trạng thái hiện tại: PENDING_REVIEW.",
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể gửi yêu cầu phê duyệt.";
      toast.error(msg);
    } finally {
      setSubmittingLaunch(false);
    }
  };

  const handleCreateWeek = async (title: string, summary: string) => {
    if (!title.trim()) return false;
    setSaving(true);
    try {
      const client = getRpcClient(CatalogService);
      await client.createWeekModule({
        courseId,
        title,
        summary,
      });
      toast.success("Đã thêm Tuần học mới vào khóa học thành công!");
      await fetchCourseDetail();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thêm Tuần học thất bại.";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWeek = async (id: string, title: string, summary: string) => {
    if (!title.trim()) return false;
    setSaving(true);
    try {
      const client = getRpcClient(CatalogService);
      await client.updateWeekModule({
        id,
        courseId,
        title,
        summary,
      });
      toast.success("Đã cập nhật thông tin Tuần học thành công!");
      await fetchCourseDetail();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cập nhật Tuần học thất bại.";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWeek = (weekId: string, weekTitle: string) => {
    setConfirmDeleteTarget({ type: "week", id: weekId, title: weekTitle });
  };

  const handleCreateLesson = async (
    weekModuleId: string,
    title: string,
    estimatedMinutes: number,
  ) => {
    if (!weekModuleId || !title.trim()) return false;
    setSaving(true);
    try {
      const client = getRpcClient(CatalogService);
      await client.createLesson({
        courseId,
        weekModuleId,
        title,
        estimatedMinutes,
      });
      toast.success(`Đã thêm Bài học "${title}" thành công!`);
      await fetchCourseDetail();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thêm Bài học thất bại.";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLesson = async (id: string, title: string, estimatedMinutes: number) => {
    if (!title.trim()) return false;
    setSaving(true);
    try {
      const client = getRpcClient(CatalogService);
      await client.updateLesson({
        id,
        courseId,
        title,
        estimatedMinutes,
      });
      toast.success("Đã cập nhật Bài học thành công!");
      await fetchCourseDetail();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cập nhật Bài học thất bại.";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = (lessonId: string, lessonTitle: string) => {
    setConfirmDeleteTarget({ type: "lesson", id: lessonId, title: lessonTitle });
  };

  const handleCreateItem = async (payload: LearningItemPayload) => {
    if (!payload.lessonId || !payload.title.trim()) return false;
    setSaving(true);
    try {
      const client = getRpcClient(CatalogService);
      const res = await client.createLearningItem({
        courseId: course?.id || courseId,
        lessonId: payload.lessonId,
        title: payload.title,
        type: payload.type,
        estimatedMinutes: payload.estimatedMinutes,
        videoUrl: payload.type === ItemType.VIDEO ? payload.videoUrl : "",
        vttSubtitleUrl: payload.type === ItemType.VIDEO ? payload.vttSubtitleUrl : "",
        autoTranscribe: payload.type === ItemType.VIDEO ? payload.autoTranscribe : false,
        inVideoQuizzes:
          payload.type === ItemType.VIDEO
            ? payload.inVideoQuizzes?.map((q) => ({
                timestampSeconds: q.timestampSeconds,
                question: q.question,
                options: q.options,
                correctOptionIndex: q.correctOptionIndex,
                explanation: q.explanation,
              }))
            : [],
        readingMarkdown: payload.type === ItemType.READING ? payload.readingMarkdown : "",
        starterCode: payload.type === ItemType.AUTO_GRADED_LAB ? payload.starterCode : "",
        testCasesJson: payload.type === ItemType.AUTO_GRADED_LAB ? payload.testCasesJson : "",
        language: payload.type === ItemType.AUTO_GRADED_LAB ? payload.language : "",
        rubricCriteriaJson: payload.type === ItemType.PEER_REVIEW ? payload.rubricCriteriaJson : "",
        quizMatrixId:
          payload.type === ItemType.PRACTICE_QUIZ || payload.type === ItemType.GRADED_QUIZ
            ? payload.quizBankId
            : "",
      });

      const createdItem = res.item;
      if (
        (payload.type === ItemType.PRACTICE_QUIZ || payload.type === ItemType.GRADED_QUIZ) &&
        payload.quizBankId &&
        createdItem
      ) {
        try {
          const assessmentClient = getRpcClient(AssessmentService);
          await assessmentClient.configureQuizMatrix({
            itemId: createdItem.id,
            bankId: payload.quizBankId,
            timeLimitMinutes: parseInt(String(payload.quizTimeLimit)) || 45,
            passingThresholdPercent: parseFloat(String(payload.quizPassingThreshold)) || 80,
            easyCount: parseInt(String(payload.quizEasyCount)) || 0,
            mediumCount: parseInt(String(payload.quizMediumCount)) || 0,
            hardCount: parseInt(String(payload.quizHardCount)) || 0,
            shuffleOptions: true,
            maxAttempts: parseInt(String(payload.quizMaxAttempts)) || 3,
            cooldownHours: parseInt(String(payload.quizCooldownHours)) || 8,
          });
        } catch (err) {
          console.error("Failed to configure quiz matrix on creation:", err);
        }
      }

      toast.success(`Đã thêm Học liệu "${payload.title}" vào bài học thành công!`);
      await fetchCourseDetail();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thêm Học liệu thất bại.";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (payload: UpdateItemPayload) => {
    if (!payload.id || !payload.title.trim()) return false;
    setSaving(true);
    try {
      const client = getRpcClient(CatalogService);
      await client.updateLearningItem({
        id: payload.id,
        courseId,
        title: payload.title,
        type: payload.type,
        estimatedMinutes: payload.estimatedMinutes,
        videoUrl: payload.type === ItemType.VIDEO ? payload.videoUrl : undefined,
        vttSubtitleUrl: payload.type === ItemType.VIDEO ? payload.vttSubtitleUrl : undefined,
        autoTranscribe: payload.type === ItemType.VIDEO ? payload.autoTranscribe : undefined,
        readingMarkdown: payload.type === ItemType.READING ? payload.readingMarkdown : undefined,
        inVideoQuizzes:
          payload.type === ItemType.VIDEO
            ? payload.inVideoQuizzes?.map((q) => ({
                timestampSeconds: q.timestampSeconds,
                question: q.question,
                options: q.options,
                correctOptionIndex: q.correctOptionIndex,
                explanation: q.explanation,
              }))
            : undefined,
        starterCode: payload.type === ItemType.AUTO_GRADED_LAB ? payload.starterCode : undefined,
        testCasesJson:
          payload.type === ItemType.AUTO_GRADED_LAB ? payload.testCasesJson : undefined,
        language: payload.type === ItemType.AUTO_GRADED_LAB ? payload.language : undefined,
        rubricCriteriaJson:
          payload.type === ItemType.PEER_REVIEW ? payload.rubricCriteriaJson : undefined,
        quizMatrixId:
          payload.type === ItemType.PRACTICE_QUIZ || payload.type === ItemType.GRADED_QUIZ
            ? payload.quizMatrixId || payload.quizBankId
            : undefined,
      });

      const bankIdToUse = payload.quizMatrixId || payload.quizBankId;
      if (
        (payload.type === ItemType.PRACTICE_QUIZ || payload.type === ItemType.GRADED_QUIZ) &&
        bankIdToUse
      ) {
        try {
          const assessmentClient = getRpcClient(AssessmentService);
          await assessmentClient.configureQuizMatrix({
            itemId: payload.id,
            bankId: bankIdToUse,
            timeLimitMinutes: parseInt(String(payload.quizTimeLimit)) || 45,
            passingThresholdPercent: parseFloat(String(payload.quizPassingThreshold)) || 80,
            easyCount: parseInt(String(payload.quizEasyCount)) || 0,
            mediumCount: parseInt(String(payload.quizMediumCount)) || 0,
            hardCount: parseInt(String(payload.quizHardCount)) || 0,
            shuffleOptions: true,
            maxAttempts: parseInt(String(payload.quizMaxAttempts)) || 3,
            cooldownHours: parseInt(String(payload.quizCooldownHours)) || 8,
          });
        } catch (err) {
          console.error("Failed to configure quiz matrix on update:", err);
        }
      }

      toast.success("Đã cập nhật nội dung Học liệu thành công!");
      await fetchCourseDetail();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cập nhật Học liệu thất bại.";
      toast.error(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = (itemId: string, itemTitle: string) => {
    setConfirmDeleteTarget({ type: "item", id: itemId, title: itemTitle });
  };

  const executeConfirmDelete = async () => {
    if (!confirmDeleteTarget) return;
    const { type, id, title } = confirmDeleteTarget;
    try {
      const client = getRpcClient(CatalogService);
      if (type === "week") {
        await client.deleteWeekModule({ id, courseId });
        toast.success(`Đã xóa Tuần học "${title}" thành công!`);
      } else if (type === "lesson") {
        await client.deleteLesson({ id, courseId });
        toast.success(`Đã xóa Bài học "${title}" thành công!`);
      } else if (type === "item") {
        await client.deleteLearningItem({ id, courseId });
        toast.success(`Đã xóa Học liệu "${title}" thành công!`);
      }
      await fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xóa thất bại.";
      toast.error(msg);
    } finally {
      setConfirmDeleteTarget(null);
    }
  };

  // Reorder Functions
  const handleReorderWeeks = async (fromIndex: number, toIndex: number) => {
    if (!course || !course.weekModules || fromIndex === toIndex) return;
    const weeks = [...course.weekModules];
    if (fromIndex < 0 || fromIndex >= weeks.length || toIndex < 0 || toIndex >= weeks.length)
      return;

    const [moved] = weeks.splice(fromIndex, 1);
    weeks.splice(toIndex, 0, moved);
    const updatedWeeks = weeks.map((w, idx) => ({ ...w, weekNumber: idx + 1 }));
    setCourse({ ...course, weekModules: updatedWeeks });

    try {
      const client = getRpcClient(CatalogService);
      await client.reorderWeekModules({
        courseId,
        orderedWeekModuleIds: weeks.map((w) => w.id),
      });
      toast.success("Đã cập nhật vị trí Tuần học thành công!");
    } catch (err: unknown) {
      console.error("Failed to save week order:", err);
      await fetchCourseDetail();
    }
  };

  const handleReorderLessons = async (weekId: string, fromIndex: number, toIndex: number) => {
    if (!course || !course.weekModules || fromIndex === toIndex) return;
    const week = course.weekModules.find((w) => w.id === weekId);
    if (!week || !week.lessons) return;

    const lessons = [...week.lessons];
    if (fromIndex < 0 || fromIndex >= lessons.length || toIndex < 0 || toIndex >= lessons.length)
      return;

    const [moved] = lessons.splice(fromIndex, 1);
    lessons.splice(toIndex, 0, moved);

    const updatedWeeks = course.weekModules.map((w) => (w.id === weekId ? { ...w, lessons } : w));
    setCourse({ ...course, weekModules: updatedWeeks });

    try {
      const client = getRpcClient(CatalogService);
      await client.reorderLessons({
        courseId,
        weekModuleId: weekId,
        orderedLessonIds: lessons.map((l) => l.id),
      });
      toast.success("Đã cập nhật thứ tự Bài học thành công!");
    } catch (err: unknown) {
      console.error("Failed to save lesson order:", err);
      await fetchCourseDetail();
    }
  };

  const handleReorderItems = async (lessonId: string, fromIndex: number, toIndex: number) => {
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

    if (
      fromIndex < 0 ||
      fromIndex >= targetItems.length ||
      toIndex < 0 ||
      toIndex >= targetItems.length
    )
      return;

    const [moved] = targetItems.splice(fromIndex, 1);
    targetItems.splice(toIndex, 0, moved);

    const updatedWeeks = course.weekModules.map((w) => {
      if (w.id !== targetWeekId) return w;
      return {
        ...w,
        lessons: w.lessons?.map((l) => (l.id === lessonId ? { ...l, items: targetItems } : l)),
      };
    });
    setCourse({ ...course, weekModules: updatedWeeks });

    try {
      const client = getRpcClient(CatalogService);
      await client.reorderLearningItems({
        courseId,
        lessonId,
        orderedItemIds: targetItems.map((i) => i.id),
      });
      toast.success("Đã cập nhật thứ tự Học liệu thành công!");
    } catch (err: unknown) {
      console.error("Failed to save item order:", err);
      await fetchCourseDetail();
    }
  };

  return {
    course,
    setCourse,
    loading,
    saving,
    setSaving,
    submittingLaunch,
    questionBanks,
    fetchCourseDetail,
    handleSubmitForLaunch,
    handleCreateWeek,
    handleUpdateWeek,
    handleDeleteWeek,
    handleCreateLesson,
    handleUpdateLesson,
    handleDeleteLesson,
    handleCreateItem,
    handleUpdateItem,
    handleDeleteItem,
    confirmDeleteTarget,
    setConfirmDeleteTarget,
    executeConfirmDelete,
    handleReorderWeeks,
    handleReorderLessons,
    handleReorderItems,
  };
}
