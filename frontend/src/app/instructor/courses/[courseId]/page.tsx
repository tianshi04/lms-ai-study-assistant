"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  CatalogService,
  ItemType,
  type WeekModule,
  type Lesson,
  type LearningItem,
} from "@/gen/catalog/v1/catalog_pb";
import { AssessmentService } from "@/gen/assessment/v1/assessment_pb";
import { getRpcClient } from "@/lib/connect_client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";

import { useCourseBuilder, type LearningItemPayload } from "./hooks/useCourseBuilder";
import { usePointerDragOrder } from "./hooks/usePointerDragOrder";
import { useScormActions } from "./hooks/useScormActions";

import { CourseHeaderBanner } from "./components/CourseHeaderBanner";
import { SyllabusTree } from "./components/SyllabusTree";
import { WeekFormModal } from "./components/modals/WeekFormModal";
import { LessonFormModal } from "./components/modals/LessonFormModal";
import { LearningItemFormModal } from "./components/modals/LearningItemFormModal";
import { ScormReviewModal } from "./components/modals/ScormReviewModal";
import { CourseCollaboratorsModal } from "@/components/course/CourseCollaboratorsModal";
import { ConfirmAlertDialog } from "@/components/ui/AlertDialog";

export default function InstructorCourseBuilderPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;

  const { isInstructorOrAdmin } = useAuth();
  const toast = useToast();

  // Custom Hooks
  const builder = useCourseBuilder(courseId);
  const scorm = useScormActions(courseId);

  // Modals Visibility & Active Form States
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState<string | null>(null); // weekModuleId
  const [showItemModal, setShowItemModal] = useState<string | null>(null); // lessonId
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false);

  const [editingWeek, setEditingWeek] = useState<WeekModule | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingItem, setEditingItem] = useState<(LearningItemPayload & { id: string }) | null>(
    null,
  );

  // 60FPS Drag Engine
  const dragEngine = usePointerDragOrder({
    isInstructorOrAdmin,
    onReorderWeeks: builder.handleReorderWeeks,
    onReorderLessons: builder.handleReorderLessons,
    onReorderItems: builder.handleReorderItems,
  });

  // Handler for Editing Item (loads quiz matrix if quiz type)
  const handleOpenEditItemModal = async (item: LearningItem) => {
    let qMatrix = null;
    if (item.type === ItemType.PRACTICE_QUIZ || item.type === ItemType.GRADED_QUIZ) {
      try {
        const assessmentClient = getRpcClient(AssessmentService);
        const matrixRes = await assessmentClient.getQuizMatrix({ itemId: item.id });
        qMatrix = matrixRes.matrix;
      } catch (err) {
        console.warn("Failed to load quiz matrix:", err);
      }
    }

    setEditingItem({
      id: item.id,
      lessonId: "",
      title: item.title,
      type: item.type,
      estimatedMinutes: item.estimatedMinutes,
      videoUrl: item.videoUrl || "",
      vttSubtitleUrl: item.vttSubtitleUrl || "",
      autoTranscribe: item.autoTranscribe || false,
      readingMarkdown: item.readingMarkdown || "",
      inVideoQuizzes: item.inVideoQuizzes
        ? item.inVideoQuizzes.map((q) => ({
            timestampSeconds: q.timestampSeconds,
            question: q.question,
            options: q.options ? Array.from(q.options) : [],
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation || "",
          }))
        : [],
      starterCode: item.starterCode || "",
      testCasesJson: item.testCasesJson || "",
      language: item.language || "",
      rubricCriteriaJson: item.rubricCriteriaJson || "",
      quizBankId: item.quizMatrixId || "",
      quizMatrixId: item.quizMatrixId || "",
      quizTimeLimit: qMatrix?.timeLimitMinutes ?? 45,
      quizPassingThreshold: qMatrix?.passingThresholdPercent ?? 80,
      quizEasyCount: qMatrix ? qMatrix.easyCount : 4,
      quizMediumCount: qMatrix ? qMatrix.mediumCount : 4,
      quizHardCount: qMatrix ? qMatrix.hardCount : 2,
      quizMaxAttempts: qMatrix?.maxAttempts ?? 3,
      quizCooldownHours: qMatrix?.cooldownHours ?? 8,
    });
  };

  const handleConfirmScormImport = async (scormKey: string, targetCourseId: string) => {
    try {
      const client = getRpcClient(CatalogService);
      await client.importCourseFromScorm({
        scormObjectKey: scormKey,
        courseId: targetCourseId,
      });
      toast.success("Đã import dữ liệu SCORM vào khóa học thành công!");
      scorm.setShowScormReviewModal(false);
      await builder.fetchCourseDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import SCORM thất bại.";
      toast.error(msg);
    }
  };

  if (builder.loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center py-24">
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span aria-live="polite" className="text-sm font-medium">
              {"Đang tải cấu trúc bài giảng khóa học…"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Breadcrumb & Return Nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/instructor/courses" className="hover:text-primary transition-colors">
              {"Giảng viên"}
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">{"Biên soạn bài học"}</span>
          </div>

          <Link
            href="/instructor/courses"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft aria-hidden="true" className="w-4 h-4" />
            <span>{"Danh sách Khóa học"}</span>
          </Link>
        </div>

        {/* Course Header Banner */}
        {builder.course && (
          <CourseHeaderBanner
            course={builder.course}
            courseId={courseId}
            submittingLaunch={builder.submittingLaunch}
            saving={builder.saving}
            scormImporting={scorm.scormImporting}
            isInstructorOrAdmin={isInstructorOrAdmin}
            onSubmitForLaunch={builder.handleSubmitForLaunch}
            onExportScorm={scorm.handleExportScorm}
            onImportScormFile={scorm.handleImportScormFile}
            onAddWeek={() => setShowWeekModal(true)}
            onOpenCollaboratorsModal={() => setShowCollaboratorsModal(true)}
          />
        )}

        {/* Syllabus Tree View */}
        <SyllabusTree
          course={builder.course}
          courseId={courseId}
          isInstructorOrAdmin={isInstructorOrAdmin}
          activeDraggingWeekId={dragEngine.activeDraggingWeekId}
          activeDraggingLessonId={dragEngine.activeDraggingLessonId}
          activeDraggingItemId={dragEngine.activeDraggingItemId}
          onWeekPointerDown={dragEngine.handleWeekPointerDown}
          onWeekPointerMove={dragEngine.handleWeekPointerMove}
          onWeekPointerUp={dragEngine.handleWeekPointerUp}
          onLessonPointerDown={dragEngine.handleLessonPointerDown}
          onLessonPointerMove={dragEngine.handleLessonPointerMove}
          onLessonPointerUp={dragEngine.handleLessonPointerUp}
          onItemPointerDown={dragEngine.handleItemPointerDown}
          onItemPointerMove={dragEngine.handleItemPointerMove}
          onItemPointerUp={dragEngine.handleItemPointerUp}
          onAddWeek={() => setShowWeekModal(true)}
          onEditWeek={(week) => setEditingWeek(week)}
          onDeleteWeek={builder.handleDeleteWeek}
          onAddLesson={(weekId) => setShowLessonModal(weekId)}
          onEditLesson={(lesson) => setEditingLesson(lesson)}
          onDeleteLesson={builder.handleDeleteLesson}
          onAddItem={(lessonId) => setShowItemModal(lessonId)}
          onEditItem={handleOpenEditItemModal}
          onDeleteItem={builder.handleDeleteItem}
        />
      </main>

      {/* Modal: Create Week Module */}
      <WeekFormModal
        isOpen={showWeekModal}
        onClose={() => setShowWeekModal(false)}
        onSubmit={(title, summary) => builder.handleCreateWeek(title, summary)}
        saving={builder.saving}
      />

      {/* Modal: Edit Week Module */}
      {editingWeek && (
        <WeekFormModal
          isOpen={Boolean(editingWeek)}
          onClose={() => setEditingWeek(null)}
          onSubmit={(title, summary) => builder.handleUpdateWeek(editingWeek.id, title, summary)}
          initialTitle={editingWeek.title}
          initialSummary={editingWeek.summary}
          isEdit
          saving={builder.saving}
        />
      )}

      {/* Modal: Create Lesson */}
      {showLessonModal && (
        <LessonFormModal
          isOpen={Boolean(showLessonModal)}
          onClose={() => setShowLessonModal(null)}
          onSubmit={(title, minutes) => builder.handleCreateLesson(showLessonModal, title, minutes)}
          saving={builder.saving}
        />
      )}

      {/* Modal: Edit Lesson */}
      {editingLesson && (
        <LessonFormModal
          isOpen={Boolean(editingLesson)}
          onClose={() => setEditingLesson(null)}
          onSubmit={(title, minutes) =>
            builder.handleUpdateLesson(editingLesson.id, title, minutes)
          }
          initialTitle={editingLesson.title}
          initialMinutes={editingLesson.estimatedMinutes}
          isEdit
          saving={builder.saving}
        />
      )}

      {/* Modal: Create Learning Item */}
      {showItemModal && (
        <LearningItemFormModal
          isOpen={Boolean(showItemModal)}
          onClose={() => setShowItemModal(null)}
          onSubmit={(payload) => builder.handleCreateItem({ ...payload, lessonId: showItemModal })}
          questionBanks={builder.questionBanks}
          saving={builder.saving}
        />
      )}

      {/* Modal: Edit Learning Item */}
      {editingItem && (
        <LearningItemFormModal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          onSubmit={(payload) => builder.handleUpdateItem({ ...payload, id: editingItem.id })}
          questionBanks={builder.questionBanks}
          initialData={editingItem}
          isEdit
          saving={builder.saving}
        />
      )}

      {/* Modal: SCORM Review */}
      <ScormReviewModal
        isOpen={scorm.showScormReviewModal}
        onClose={() => scorm.setShowScormReviewModal(false)}
        scormPreviewCourse={scorm.scormPreviewCourse}
        scormObjectKey={scorm.scormObjectKey}
        courseId={courseId}
        scormImporting={scorm.scormImporting}
        onConfirmImport={handleConfirmScormImport}
      />

      {/* Modal: Course Collaborators Management */}
      <CourseCollaboratorsModal
        isOpen={showCollaboratorsModal}
        onClose={() => setShowCollaboratorsModal(false)}
        courseId={courseId}
        courseTitle={builder.course?.title}
      />

      {/* Confirm Delete Alert Dialog */}
      <ConfirmAlertDialog
        isOpen={Boolean(builder.confirmDeleteTarget)}
        onClose={() => builder.setConfirmDeleteTarget(null)}
        onConfirm={builder.executeConfirmDelete}
        title={
          builder.confirmDeleteTarget?.type === "week"
            ? "Xác nhận xóa Tuần học"
            : builder.confirmDeleteTarget?.type === "lesson"
              ? "Xác nhận xóa Bài học"
              : "Xác nhận xóa Học liệu"
        }
        description={
          builder.confirmDeleteTarget
            ? `Bạn có chắc chắn muốn xóa "${builder.confirmDeleteTarget.title}"? Thao tác này không thể hoàn tác.`
            : ""
        }
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        isLoading={builder.saving}
      />
    </div>
  );
}
