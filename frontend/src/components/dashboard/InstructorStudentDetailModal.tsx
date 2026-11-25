"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button as BaseButton } from "@base-ui/react/button";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Send,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useInstructorStudentDossierQuery } from "@/lib/query_hooks";
import {
  buildActivityTimeline,
  computeTotalStudySeconds,
  DEEP_STUDY_MINUTES,
  evaluateStudentRisk,
  formatDuration,
  formatScoreNumber,
  mapEnrollmentTier,
  STREAK_MIN_MINUTES,
  type SmartTemplateType,
  type StudentDetailRecord,
} from "./student-dossier/dossier_helpers";
import { StudentNudgeDrawer } from "./student-dossier/StudentNudgeDrawer";

export type { StudentDetailRecord } from "./student-dossier/dossier_helpers";

interface InstructorStudentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentDetailRecord | null;
  students?: StudentDetailRecord[];
  onSelectStudent?: (student: StudentDetailRecord) => void;
  itemWeekMap?: Map<string, number>;
  courseTitle?: string;
  courseId?: string;
  nudgedStudentIds?: Set<string>;
  isNudged?: boolean;
  onSendReminder?: (studentId: string, customMessage: string) => void;
}

type AssessmentFilter = "ALL" | "NEEDS_ACTION" | "PASSED";

function mapAssessmentTypeLabel(itemType: string): string {
  switch (itemType) {
    case "GRADED_QUIZ":
    case "QUIZ":
      return "Quiz tính điểm";
    case "PRACTICE_QUIZ":
      return "Quiz luyện tập";
    case "PEER_REVIEW":
      return "Tiểu luận chấm chéo";
    case "CODING_LAB":
    case "CODING":
    case "LAB":
      return "Bài thực hành";
    default:
      return "Bài tập";
  }
}

export function InstructorStudentDetailModal({
  open,
  onOpenChange,
  student,
  students,
  onSelectStudent,
  itemWeekMap,
  courseTitle = "Khóa học",
  courseId,
  nudgedStudentIds,
  isNudged = false,
  onSendReminder,
}: InstructorStudentDetailModalProps) {
  const effectiveCourseId = student?.courseId || courseId;
  const effectiveCourseTitle = student?.courseTitle || courseTitle;
  const effectiveIsNudged = Boolean(isNudged || (student && nudgedStudentIds?.has(student.userId)));

  const { data: dossier, isLoading: isDossierLoading } = useInstructorStudentDossierQuery(
    open ? effectiveCourseId : undefined,
    open ? student?.userId : undefined,
  );

  const [todayUtc] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  });

  // Master sidebar state (left column)
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterFilter, setRosterFilter] = useState<"ALL" | "ATTENTION">("ALL");

  // Per-student scoped UI state (avoids synchronous setState inside useEffect)
  const stateScopeKey = `${effectiveCourseId || ""}:${student?.userId || ""}`;
  const [viewState, setViewState] = useState<{
    scope: string;
    mode: "30d" | "all";
    windowOffset: number;
    pinnedBucketIdx: number | null;
    assessmentFilter: AssessmentFilter;
  }>({
    scope: stateScopeKey,
    mode: "30d",
    windowOffset: 0,
    pinnedBucketIdx: null,
    assessmentFilter: "ALL",
  });

  // Slide-over Nudge Drawer state
  const [drawerState, setDrawerState] = useState<{
    open: boolean;
    sessionCounter: number;
    templateKey: SmartTemplateType;
    focusItemTitle?: string;
  }>({
    open: false,
    sessionCounter: 0,
    templateKey: "PACING",
  });

  const isSameScope = viewState.scope === stateScopeKey;
  const activeMode = isSameScope ? viewState.mode : "30d";
  const windowOffset = isSameScope ? viewState.windowOffset : 0;
  const pinnedBucketIdx = isSameScope ? viewState.pinnedBucketIdx : null;
  const assessmentFilter = isSameScope ? viewState.assessmentFilter : "ALL";

  const setMode = (mode: "30d" | "all") => {
    setViewState({
      scope: stateScopeKey,
      mode,
      windowOffset: 0,
      pinnedBucketIdx: null,
      assessmentFilter,
    });
  };

  const shiftWindow = (delta: number) => {
    setViewState((prev) => ({
      scope: stateScopeKey,
      mode: "30d",
      windowOffset: Math.max(0, (prev.scope === stateScopeKey ? prev.windowOffset : 0) + delta),
      pinnedBucketIdx: null,
      assessmentFilter: prev.scope === stateScopeKey ? prev.assessmentFilter : "ALL",
    }));
  };

  const setPinnedBucket = (idx: number) => {
    setViewState((prev) => ({
      scope: stateScopeKey,
      mode: prev.scope === stateScopeKey ? prev.mode : "30d",
      windowOffset: prev.scope === stateScopeKey ? prev.windowOffset : 0,
      pinnedBucketIdx: idx,
      assessmentFilter: prev.scope === stateScopeKey ? prev.assessmentFilter : "ALL",
    }));
  };

  const setAssessmentFilter = (nextFilter: AssessmentFilter) => {
    setViewState((prev) => ({
      scope: stateScopeKey,
      mode: prev.scope === stateScopeKey ? prev.mode : "30d",
      windowOffset: prev.scope === stateScopeKey ? prev.windowOffset : 0,
      pinnedBucketIdx: prev.scope === stateScopeKey ? prev.pinnedBucketIdx : null,
      assessmentFilter: nextFilter,
    }));
  };

  const openNudgeDrawer = (templateKey: SmartTemplateType, focusItemTitle?: string) => {
    setDrawerState((prev) => ({
      open: true,
      sessionCounter: prev.sessionCounter + 1,
      templateKey,
      focusItemTitle,
    }));
  };

  const closeNudgeDrawer = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const handleSelectRosterStudent = (nextStudent: StudentDetailRecord) => {
    closeNudgeDrawer();
    onSelectStudent?.(nextStudent);
  };

  // Evaluate roster risks for left sidebar
  const rosterItems = useMemo(() => {
    if (!students || students.length === 0) return [];
    return students.map((item) => ({
      student: item,
      risk: evaluateStudentRisk(item),
    }));
  }, [students]);

  const attentionCount = useMemo(
    () => rosterItems.filter((r) => r.risk.needsAttention).length,
    [rosterItems],
  );

  const filteredRoster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    return rosterItems.filter(({ student: s, risk }) => {
      if (rosterFilter === "ATTENTION" && !risk.needsAttention) return false;
      if (q && !s.userName.toLowerCase().includes(q) && !s.userEmail.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [rosterItems, rosterFilter, rosterSearch]);

  const activityData = useMemo(
    () =>
      buildActivityTimeline({
        activeMode,
        windowOffset,
        todayUtc,
        student,
        dossier,
      }),
    [activeMode, windowOffset, todayUtc, student, dossier],
  );

  const totalStudySeconds = useMemo(
    () => computeTotalStudySeconds(student, dossier),
    [dossier, student],
  );

  // Group assessments by week
  const groupedAssessments = useMemo(() => {
    const raw = dossier?.assessments || [];
    const filtered = raw.filter((a) => {
      if (assessmentFilter === "ALL") return true;
      const isPeerPending =
        a.itemType === "PEER_REVIEW" && a.isSubmitted && (!a.isPassed || a.score === 0);
      const needsAction = !a.isSubmitted || !a.isPassed || isPeerPending;
      return assessmentFilter === "NEEDS_ACTION" ? needsAction : !needsAction;
    });

    const map = new Map<number, typeof raw>();
    for (const item of filtered) {
      const wk = item.weekNumber || 1;
      const list = map.get(wk) || [];
      list.push(item);
      map.set(wk, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [dossier, assessmentFilter]);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (open && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [open, student?.userId]);

  if (!student) return null;

  const hasMasterSidebar = Boolean(students && students.length > 1 && onSelectStudent);
  const risk = evaluateStudentRisk(student, dossier);

  const totalCourseItems = student.totalCourseItems ?? 0;
  const completedCount =
    student.completedItemsCount ??
    (totalCourseItems > 0
      ? Math.round(((student.progressPercent || 0) / 100) * totalCourseItems)
      : 0);

  const currentStopWeekNumber =
    dossier?.lastAccessedWeekNumber ||
    dossier?.furthestWeekNumber ||
    student.currentWeekNumber ||
    1;
  const currentStopTitle =
    dossier?.lastAccessedItemTitle ||
    student.currentLessonTitle ||
    dossier?.furthestItemTitle ||
    student.currentWeekTitle ||
    `Tuần ${currentStopWeekNumber}`;

  const isAuditLearner = (student.enrollmentType || "AUDIT").toUpperCase() === "AUDIT";
  const tierLabel = mapEnrollmentTier(student.enrollmentType);
  const metaParts: string[] = [student.userEmail, tierLabel];
  if (student.currentStreak && student.currentStreak > 0) {
    metaParts.push(`Chuỗi ${student.currentStreak} ngày`);
  }

  const resolvedBucketIdx =
    pinnedBucketIdx !== null && pinnedBucketIdx < activityData.buckets.length
      ? pinnedBucketIdx
      : activityData.defaultSelectedIdx;
  const selectedBucket = activityData.buckets[resolvedBucketIdx];
  const firstBucket = activityData.buckets[0];
  const lastBucket = activityData.buckets[activityData.buckets.length - 1];
  const newYearBucket = activityData.buckets.find((b) => b.isNewYearBoundary);

  const totalAssessmentsCount = dossier?.assessments.length || 0;
  const submittedAssessmentsCount = dossier
    ? dossier.assessments.filter((a) => a.isSubmitted).length
    : 0;
  const pendingGradingCount = dossier
    ? dossier.assessments.filter(
        (a) => a.itemType === "PEER_REVIEW" && a.isSubmitted && (!a.isPassed || a.score === 0),
      ).length
    : 0;
  const showAssessmentFilters =
    totalAssessmentsCount > 5 && (!isAuditLearner || submittedAssessmentsCount > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeNudgeDrawer();
        onOpenChange(nextOpen);
      }}
    >
      <Dialog.Content
        size="2xl"
        showCloseButton={false}
        className={`p-0 overflow-hidden bg-surface text-foreground border border-border rounded-2xl shadow-2xl flex flex-row relative h-[86vh] max-h-[820px] ${
          hasMasterSidebar ? "max-w-6xl" : "max-w-4xl"
        }`}
      >
        {/* CỘT TRÁI: DANH SÁCH HỌC VIÊN (MASTER-DETAIL) */}
        {hasMasterSidebar && (
          <aside className="hidden lg:flex w-[272px] shrink-0 border-r border-border bg-muted/20 flex-col">
            <div className="p-3.5 border-b border-border bg-surface space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground">Danh sách lớp</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {filteredRoster.length} học viên
                </span>
              </div>

              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Tìm tên hoặc email..."
                  aria-label="Tìm học viên trong lớp"
                  className="h-8 pl-8 pr-2.5 text-xs bg-muted/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-1">
                <BaseButton
                  type="button"
                  onClick={() => setRosterFilter("ALL")}
                  className={`h-7 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    rosterFilter === "ALL"
                      ? "bg-primary/10 text-primary border border-primary/30 font-semibold"
                      : "text-muted-foreground hover:bg-muted border border-transparent"
                  }`}
                >
                  Tất cả ({students?.length || 0})
                </BaseButton>
                <BaseButton
                  type="button"
                  onClick={() => setRosterFilter("ATTENTION")}
                  className={`h-7 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    rosterFilter === "ATTENTION"
                      ? "bg-warning/15 text-warning border border-warning/30 font-semibold"
                      : "text-muted-foreground hover:bg-muted border border-transparent"
                  }`}
                >
                  Cần lưu ý ({attentionCount})
                </BaseButton>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {filteredRoster.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8 px-3">
                  Không có học viên phù hợp.
                </p>
              ) : (
                filteredRoster.map(({ student: item, risk: itemRisk }) => {
                  const isActive = item.userId === student.userId;
                  const wasNudged = Boolean(nudgedStudentIds?.has(item.userId));
                  return (
                    <BaseButton
                      key={item.userId}
                      type="button"
                      onClick={() => handleSelectRosterStudent(item)}
                      className={`w-full text-left rounded-xl px-2.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer border ${
                        isActive
                          ? "bg-surface border-border shadow-2xs"
                          : "bg-transparent border-transparent hover:bg-muted/60"
                      }`}
                    >
                      <Avatar name={item.userName} size="sm" className="shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {item.userName}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">
                            {item.progressPercent}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${itemRisk.dotClass}`}
                              aria-hidden="true"
                            />
                            <span className="truncate">{itemRisk.statusLabel}</span>
                          </span>
                          {wasNudged && (
                            <CheckCircle2
                              className="w-3 h-3 text-success shrink-0"
                              aria-label="Đã gửi thông báo gần đây"
                            />
                          )}
                        </div>
                      </div>
                    </BaseButton>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* CỘT PHẢI: KHÔNG GIAN ĐỌC HỒ SƠ CHI TIẾT (100% TẬP TRUNG QUAN SÁT) */}
        <div className="flex-1 min-w-0 flex flex-col bg-surface">
          {/* 1. Header sạch, trung thực, đầy đủ tên khóa học */}
          <Dialog.Header className="px-6 py-4 border-b border-border pb-4 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Avatar name={student.userName} size="md" className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <Dialog.Title className="text-base font-bold text-foreground flex items-center gap-2 flex-wrap">
                    <span>{student.userName}</span>
                    <Badge variant={risk.badgeVariant} size="sm">
                      {risk.statusLabel}
                    </Badge>
                    {effectiveIsNudged && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Đã gửi thông báo
                      </span>
                    )}
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                    {metaParts.join(" · ")}
                  </Dialog.Description>
                  <div className="text-xs text-muted-foreground font-medium leading-snug mt-1">
                    {effectiveCourseTitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="xs"
                  shape="square"
                  onClick={() => openNudgeDrawer(risk.primaryActionTemplate)}
                  className="text-xs font-semibold px-3"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  Gửi thông báo
                </Button>
                <IconButton
                  type="button"
                  variant="standard"
                  size="xs"
                  onClick={() => onOpenChange(false)}
                  aria-label="Đóng cửa sổ"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          </Dialog.Header>

          {/* Vùng cuộn dữ liệu tiến trình */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 pb-6">
            {/* 2. Dải cảnh báo hợp nhất (chỉ hiện khi có rủi ro / bất thường) */}
            {risk.alertSeverity && risk.alertReasons.length > 0 && (
              <div
                className={`mt-4 px-4 py-3 rounded-xl border flex items-start gap-2.5 ${
                  risk.alertSeverity === "destructive"
                    ? "bg-destructive/10 border-destructive/30"
                    : "bg-warning/10 border-warning/30"
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    risk.alertSeverity === "destructive" ? "text-destructive" : "text-warning"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div
                    className={`text-xs font-semibold ${
                      risk.alertSeverity === "destructive" ? "text-destructive" : "text-warning"
                    }`}
                  >
                    {risk.alertTitle}
                  </div>
                  <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                    {risk.alertReasons.join(" · ")}
                  </p>
                </div>
              </div>
            )}

            {/* 3. Dải 4 chỉ số phẳng (bỏ thẻ lồng thẻ, đường kẻ mảnh 1px) */}
            <div className="border-b border-border">
              <div className="py-4 grid grid-cols-2 sm:grid-cols-4 gap-y-4 sm:gap-y-0 sm:divide-x sm:divide-border/60">
                {/* Tiến độ */}
                <div className="sm:pr-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Tiến độ khóa học</div>
                    <div className="text-xl font-bold text-foreground tabular-nums mt-1">
                      {student.progressPercent}%
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground">
                      {totalCourseItems > 0
                        ? `${completedCount}/${totalCourseItems} bài hoàn thành`
                        : `${completedCount} bài hoàn thành`}
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full transition-all duration-300 ${
                          risk.isDone ? "bg-success" : "bg-primary"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, student.progressPercent))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Thời lượng học */}
                <div className="sm:px-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Thời lượng học</div>
                    <div
                      className={`text-xl font-bold tabular-nums mt-1 ${
                        risk.isFastPace ? "text-warning" : "text-foreground"
                      }`}
                    >
                      {formatDuration(totalStudySeconds)}
                    </div>
                  </div>
                  <div
                    className={`text-xs mt-2 leading-relaxed ${
                      risk.isFastPace ? "text-warning font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {risk.isFastPace
                      ? "Thấp hơn ngưỡng ước tính học liệu"
                      : "Ghi nhận từ video & bài đọc"}
                  </div>
                </div>

                {/* Điểm tổng kết */}
                <div className="sm:px-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Điểm tổng kết</div>
                    <div className="text-xl font-bold text-foreground tabular-nums mt-1">
                      {dossier && submittedAssessmentsCount > 0
                        ? `${dossier.finalWeightedGrade.toFixed(1)}%`
                        : student.quizScore !== undefined
                          ? `${formatScoreNumber(student.quizScore)}/10`
                          : "—"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {isAuditLearner && submittedAssessmentsCount === 0 && !student.quizAttemptsCount
                      ? "Khóa ở chế độ học thử"
                      : totalAssessmentsCount > 0
                        ? `${submittedAssessmentsCount}/${totalAssessmentsCount} bài tính điểm đã nộp${
                            pendingGradingCount > 0 ? ` · ${pendingGradingCount} chờ chấm` : ""
                          }`
                        : student.quizAttemptsCount
                          ? `${student.quizAttemptsCount} lượt nộp bài`
                          : "Chưa có lượt nộp"}
                  </div>
                </div>

                {/* Truy cập gần nhất */}
                <div className="sm:pl-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Truy cập gần nhất</div>
                    <div className="text-sm font-bold text-foreground mt-1.5">
                      {student.lastActiveTime || "Chưa ghi nhận"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Tuần {currentStopWeekNumber} · {risk.statusLabel}
                  </div>
                </div>
              </div>

              {/* Dòng ngang đầy đủ: vị trí bài học đang dừng lại (100% chiều rộng, không cắt chữ) */}
              <div className="pb-3.5 pt-1 text-xs flex items-baseline gap-1.5 leading-relaxed">
                <span className="text-muted-foreground shrink-0">Đang dừng ở:</span>
                <span className="font-semibold text-foreground">
                  Tuần {currentStopWeekNumber} · {currentStopTitle}
                </span>
              </div>
            </div>

            {/* 4. Biểu đồ Hoạt động học tập trực quan & giải mã ngày nộp bài 0 phút học */}
            <div className="py-5 border-b border-border space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-foreground">Hoạt động học tập</h3>
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/50 border border-border/60">
                    <BaseButton
                      type="button"
                      onClick={() => setMode("30d")}
                      className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                        activeMode === "30d"
                          ? "bg-surface text-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      30 ngày
                    </BaseButton>
                    <BaseButton
                      type="button"
                      onClick={() => setMode("all")}
                      className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                        activeMode === "all"
                          ? "bg-surface text-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Toàn khóa
                    </BaseButton>
                  </div>

                  {activeMode === "30d" && (activityData.canGoPrev || activityData.canGoNext) && (
                    <div className="inline-flex items-center">
                      <IconButton
                        type="button"
                        size="xs"
                        width="narrow"
                        variant="standard"
                        disabled={!activityData.canGoPrev}
                        onClick={() => shiftWindow(1)}
                        aria-label="Xem 30 ngày trước"
                        className="h-6 w-6"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        type="button"
                        size="xs"
                        width="narrow"
                        variant="standard"
                        disabled={!activityData.canGoNext}
                        onClick={() => shiftWindow(-1)}
                        aria-label="Xem 30 ngày tiếp theo"
                        className="h-6 w-6"
                      >
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </IconButton>
                    </div>
                  )}
                </div>

                <span className="text-xs text-muted-foreground tabular-nums">
                  {activityData.summaryText}
                </span>
              </div>

              {/* Dải cột hoạt động (chỉ click mới chọn, không đổi khi rê chuột) */}
              <div className="flex items-end gap-1.5 pt-2 w-full">
                {activityData.buckets.map((b, idx) => {
                  let barCls = "h-2.5 bg-outline-variant/60";
                  if (b.isSubmittedOnly) {
                    barCls = "h-6 bg-warning";
                  } else if (b.totalMinutes >= DEEP_STUDY_MINUTES) {
                    barCls = "h-9 bg-primary";
                  } else if (b.totalMinutes >= STREAK_MIN_MINUTES) {
                    barCls = "h-6 bg-primary/70";
                  } else if (b.totalMinutes > 0) {
                    barCls = "h-4 bg-primary/40";
                  }

                  const isSelected = idx === resolvedBucketIdx;
                  const yearBorder = b.isNewYearBoundary
                    ? "border-l-2 border-muted-foreground/60 pl-0.5"
                    : "";

                  return (
                    <BaseButton
                      key={b.key}
                      type="button"
                      aria-label={`${b.readoutLabel}: ${
                        b.isSubmittedOnly ? "Có nộp bài nhưng 0 phút học" : `${b.totalMinutes} phút`
                      }`}
                      onClick={() => setPinnedBucket(idx)}
                      style={{ flex: "1 1 0", maxWidth: "30px", minWidth: "8px" }}
                      className={`h-10 flex flex-col justify-end items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer group relative ${yearBorder}`}
                    >
                      <span
                        className={`w-full rounded-xs ${barCls} transition-opacity group-hover:opacity-80 ${
                          isSelected
                            ? "ring-2 ring-foreground ring-offset-2 ring-offset-surface"
                            : ""
                        }`}
                      />
                    </BaseButton>
                  );
                })}
              </div>

              {firstBucket && lastBucket && (
                <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                  <span>
                    {firstBucket.isStartDate
                      ? `${firstBucket.axisLabel} (Ngày tham gia)`
                      : firstBucket.axisLabel}
                  </span>
                  {newYearBucket?.newYearYear && <span>01/01/{newYearBucket.newYearYear}</span>}
                  <span>
                    {activityData.canGoNext
                      ? lastBucket.axisLabel
                      : `${lastBucket.axisLabel} (Hôm nay)`}
                  </span>
                </div>
              )}

              {/* Chú giải màu các mốc hoạt động */}
              <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[11px] text-muted-foreground pt-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-primary" aria-hidden="true" />
                  Học tích cực (≥ {DEEP_STUDY_MINUTES}p)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-primary/70" aria-hidden="true" />
                  Học ổn định ({STREAK_MIN_MINUTES}–{DEEP_STUDY_MINUTES - 1}p)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-primary/40" aria-hidden="true" />
                  Học ngắn (&lt; {STREAK_MIN_MINUTES}p)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-warning" aria-hidden="true" />
                  Chỉ nộp bài (0p học)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs bg-outline-variant/60"
                    aria-hidden="true"
                  />
                  Không hoạt động
                </span>
              </div>

              {/* Chi tiết hoạt động của ngày đang chọn (đặt dưới biểu đồ để không làm giật cột khi bấm chuyển ngày) */}
              {selectedBucket && (
                <div
                  className={`px-3.5 py-2.5 rounded-xl border text-xs space-y-1 ${
                    selectedBucket.isSubmittedOnly
                      ? "bg-warning/10 border-warning/30"
                      : "bg-muted/25 border-border/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-foreground tabular-nums">
                      {selectedBucket.readoutLabel}
                      {selectedBucket.isStartDate ? " (Ngày tham gia)" : ""}
                      {" · "}
                      {selectedBucket.isSubmittedOnly ? (
                        <span className="text-warning">Có nộp bài nhưng 0 phút xem bài/video</span>
                      ) : selectedBucket.totalMinutes > 0 ? (
                        <span className="text-primary">
                          Tổng {formatDuration(selectedBucket.totalMinutes * 60)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-normal">
                          Không ghi nhận hoạt động học tập
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Bấm vào cột để xem ngày khác
                    </span>
                  </div>

                  {(selectedBucket.items.length > 0 ||
                    selectedBucket.submittedItems.length > 0) && (
                    <div className="space-y-1 pt-0.5 text-foreground/85 leading-relaxed">
                      {selectedBucket.items.map((it, idx) => {
                        const wkNum = it.itemId ? itemWeekMap?.get(it.itemId) : undefined;
                        return (
                          <div key={`study-${idx}`} className="flex items-baseline gap-1.5">
                            <span className="text-success font-bold shrink-0">✓</span>
                            <span>
                              {wkNum ? (
                                <span className="font-semibold text-muted-foreground">
                                  Tuần {wkNum} ·{" "}
                                </span>
                              ) : null}
                              {it.title}{" "}
                              <span className="text-muted-foreground font-mono text-[11px]">
                                ({it.mins}p)
                              </span>
                            </span>
                          </div>
                        );
                      })}
                      {selectedBucket.submittedItems.map((sub, idx) => {
                        const wkNum = sub.weekNumber ?? itemWeekMap?.get(sub.itemId);
                        return (
                          <div key={`sub-${idx}`} className="flex items-baseline gap-1.5">
                            <span className="text-warning font-bold shrink-0">•</span>
                            <span>
                              {selectedBucket.isSubmittedOnly
                                ? "Nộp bài (0 phút xem bài): "
                                : "Đã nộp bài đánh giá: "}
                              {wkNum ? (
                                <span className="font-semibold text-muted-foreground">
                                  Tuần {wkNum} ·{" "}
                                </span>
                              ) : null}
                              {sub.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Bảng Bài kiểm tra & Đánh giá theo tuần (mở rộng chi tiết tại chỗ) */}
            <div className="pt-5 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xs font-bold text-foreground">
                    Bài kiểm tra &amp; Đánh giá theo tuần
                  </h3>
                  {showAssessmentFilters && (
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/50 border border-border/60">
                      {(
                        [
                          { key: "ALL", label: "Tất cả" },
                          { key: "NEEDS_ACTION", label: "Cần xử lý" },
                          { key: "PASSED", label: "Đạt" },
                        ] as { key: AssessmentFilter; label: string }[]
                      ).map((tab) => (
                        <BaseButton
                          key={tab.key}
                          type="button"
                          onClick={() => setAssessmentFilter(tab.key)}
                          className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                            assessmentFilter === tab.key
                              ? "bg-surface text-foreground font-semibold shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tab.label}
                        </BaseButton>
                      ))}
                    </div>
                  )}
                </div>

                {effectiveCourseId && (!isAuditLearner || submittedAssessmentsCount > 0) && (
                  <Link
                    href={`/instructor/courses/${effectiveCourseId}/gradebook?search=${encodeURIComponent(student.userEmail)}`}
                    className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                    Mở sổ điểm
                  </Link>
                )}
              </div>

              {isAuditLearner && (
                <p className="text-xs text-muted-foreground">
                  Tài khoản học thử chỉ xem nội dung mở, bị khóa quyền nộp bài kiểm tra tính điểm và
                  tiểu luận chấm chéo.
                </p>
              )}

              {isDossierLoading ? (
                <div className="space-y-2.5 py-2">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-4/5 rounded-lg" />
                </div>
              ) : groupedAssessments.length > 0 ? (
                <div className="space-y-4">
                  {groupedAssessments.map(([weekNumber, items]) => (
                    <div key={weekNumber}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pb-1.5 border-b border-border/60">
                        Tuần {weekNumber}
                      </div>
                      <div className="divide-y divide-border/50">
                        {items.map((a) => {
                          const isPeerHeld =
                            a.itemType === "PEER_REVIEW" &&
                            a.isSubmitted &&
                            (!a.isPassed || a.score === 0);
                          const isPendingDuty =
                            student.peerReviewDutyStatus === "PENDING" ||
                            a.statusNote.includes("Nợ") ||
                            a.statusNote.toLowerCase().includes("chấm chéo");

                          const subParts: string[] = [mapAssessmentTypeLabel(a.itemType)];
                          if (a.attemptsCount > 0) {
                            subParts.push(`${a.attemptsCount} lượt nộp`);
                          }

                          const isLockedForAudit =
                            isAuditLearner && !a.isSubmitted && a.itemType !== "PRACTICE_QUIZ";

                          let scoreNode: React.ReactNode;
                          if (isLockedForAudit) {
                            scoreNode = (
                              <span className="text-xs text-muted-foreground">Khóa (Học thử)</span>
                            );
                          } else if (!a.isSubmitted) {
                            scoreNode = (
                              <span className="text-xs text-muted-foreground tabular-nums">
                                Chưa nộp
                              </span>
                            );
                          } else if (isPeerHeld) {
                            scoreNode = (
                              <span className="text-xs font-semibold text-warning">
                                {isPendingDuty ? "Tạm giữ điểm · Nợ chấm bài" : "Đang chờ chấm"}
                              </span>
                            );
                          } else {
                            scoreNode = (
                              <span
                                className={`text-xs font-bold tabular-nums ${
                                  a.isPassed ? "text-success" : "text-destructive"
                                }`}
                              >
                                {formatScoreNumber(a.score)}/{formatScoreNumber(a.maxScore)}
                              </span>
                            );
                          }

                          return (
                            <div
                              key={a.itemId}
                              className={`py-2.5 flex items-start justify-between gap-4 ${
                                isLockedForAudit ? "opacity-60" : ""
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-foreground leading-relaxed">
                                  {a.itemTitle}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  {subParts.join(" · ")}
                                </div>
                              </div>
                              <div className="shrink-0 pt-0.5">{scoreNode}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  {totalAssessmentsCount > 0
                    ? "Không có bài đánh giá nào trong bộ lọc này."
                    : student.quizScore !== undefined
                      ? `Điểm Quiz tích lũy: ${student.quizScore}/10 (${student.quizAttemptsCount || 0} lượt nộp)`
                      : "Chưa có bài kiểm tra tính điểm nào được nộp."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* NUDGE DRAWER TRƯỢT BÊN PHẢI (TÁCH BIỆT KHỎI VÙNG ĐỌC DỮ LIỆU) */}
        <StudentNudgeDrawer
          key={`${stateScopeKey}:${drawerState.sessionCounter}`}
          open={drawerState.open}
          onClose={closeNudgeDrawer}
          student={student}
          courseId={effectiveCourseId}
          courseTitle={effectiveCourseTitle}
          initialTemplateKey={drawerState.templateKey}
          focusItemTitle={drawerState.focusItemTitle}
          onSent={onSendReminder}
        />
      </Dialog.Content>
    </Dialog>
  );
}
