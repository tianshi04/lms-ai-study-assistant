import type {
  GetInstructorStudentDossierResponse,
  StudentDailyActivity,
} from "@/gen/catalog/v1/catalog_pb";

export const DAYS_PER_WINDOW = 30;
export const MS_PER_DAY = 86_400_000;
export const STREAK_MIN_MINUTES = 15;
export const DEEP_STUDY_MINUTES = 40;
export const MIN_COMPLETED_ITEMS_FOR_FAST_PACE_CHECK = 3;
export const FAST_PACE_MIN_ESTIMATED_RATIO = 0.25;
export const DEFAULT_ESTIMATED_ITEM_MINUTES = 10;

export interface StudentDetailRecord {
  userId: string;
  userName: string;
  userEmail: string;
  progressPercent: number;
  pace: "AHEAD" | "ON_TRACK" | "BEHIND";
  enrolledAt?: string;
  enrollmentType?: string;
  totalTimeSpentSeconds?: number;
  currentWeekNumber?: number;
  currentWeekTitle?: string;
  currentLessonTitle?: string;
  quizScore?: number;
  quizAttemptsCount?: number;
  isInCooldown?: boolean;
  cooldownUntil?: string;
  peerReviewDutyStatus?: string;
  isPeerReviewOverdue?: boolean;
  lastActiveTime?: string;
  isInactive?: boolean;
  isCompleted?: boolean;
  completedItemsCount?: number;
  totalCourseItems?: number;
  courseEstimatedMinutes?: number;
  dailyActivities?: StudentDailyActivity[];
  currentStreak?: number;
  longestStreak?: number;
  courseId?: string;
  courseTitle?: string;
}

export interface ActivityBucket {
  key: string;
  axisLabel: string;
  readoutLabel: string;
  totalMinutes: number;
  isStartDate: boolean;
  isNewYearBoundary: boolean;
  newYearYear?: string;
  isSubmittedOnly: boolean;
  submittedItems: { itemId: string; title: string; weekNumber?: number }[];
  items: { itemId?: string; title: string; mins: number }[];
}

export type SmartTemplateType =
  | "PEER_REVIEW"
  | "HELP_COOLDOWN"
  | "PACING"
  | "ENCOURAGE"
  | "CONGRATS";

export interface SmartTemplateItem {
  label: string;
  subject: string;
  body: string;
}

export interface StudentRiskEvaluation {
  isDone: boolean;
  isFastPace: boolean;
  isInactive: boolean;
  hasPeerReviewOverdue: boolean;
  hasPeerReviewPending: boolean;
  hasCooldown: boolean;
  isBehind: boolean;
  needsAttention: boolean;
  statusLabel: string;
  badgeVariant: "success" | "destructive" | "warning" | "secondary";
  dotClass: string;
  alertSeverity: "destructive" | "warning" | null;
  alertTitle: string;
  alertReasons: string[];
  primaryActionLabel: string;
  primaryActionTemplate: SmartTemplateType;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "0 phút";
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}p` : `${hours} giờ`;
}

export function formatScoreNumber(val: number): string {
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}

export function mapEnrollmentTier(type?: string): string {
  switch ((type || "").toUpperCase()) {
    case "ENTERPRISE":
      return "Doanh nghiệp";
    case "FINANCIAL_AID":
      return "Học bổng";
    case "PLUS":
      return "Gói Plus";
    case "PAID":
      return "Mua lẻ";
    case "AUDIT":
    default:
      return "Học thử";
  }
}

export function parseIsoDateUtc(raw?: string): Date | null {
  if (!raw || raw.length < 10) return null;
  const prefix = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prefix)) return null;
  const [y, m, d] = prefix.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function toIsoDateUtc(dt: Date): string {
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateVN(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatShortDateVN(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function formatDateTimeVN(raw?: string): string {
  if (!raw) return "Chưa có lượt nộp";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) {
    const parsed = parseIsoDateUtc(raw);
    return parsed ? formatDateVN(toIsoDateUtc(parsed)) : raw;
  }
  const datePart = dt.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = dt.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} lúc ${timePart}`;
}

export function formatLastActiveLabel(isoString?: string, currentTimeMs?: number): string {
  if (!isoString) return "Chưa học";
  const date = new Date(isoString);
  const time = date.getTime();
  if (Number.isNaN(time)) return "Chưa học";
  const nowMs = currentTimeMs && currentTimeMs > 0 ? currentTimeMs : Date.now();
  const diffSeconds = Math.max(0, Math.floor((nowMs - time) / 1000));
  if (diffSeconds < 60) return "Vừa xong";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} phút trước`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} giờ trước`;
  const days = Math.floor(diffSeconds / 86400);
  if (days <= 7) return `${days} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

export function isInactiveOver7Days(isoString?: string, currentTimeMs?: number): boolean {
  if (!isoString) return true;
  const date = new Date(isoString);
  const time = date.getTime();
  if (Number.isNaN(time)) return true;
  const nowMs = currentTimeMs && currentTimeMs > 0 ? currentTimeMs : Date.now();
  return (nowMs - time) / MS_PER_DAY >= 7;
}

export function computeTotalStudySeconds(
  student: StudentDetailRecord | null,
  dossier?: GetInstructorStudentDossierResponse,
): number {
  if (dossier && dossier.dailyLogs.length > 0) {
    return dossier.dailyLogs.reduce((acc, log) => acc + log.totalSeconds, 0);
  }
  if (student?.totalTimeSpentSeconds && student.totalTimeSpentSeconds > 0) {
    return student.totalTimeSpentSeconds;
  }
  if (student?.dailyActivities && student.dailyActivities.length > 0) {
    return student.dailyActivities.reduce((acc, act) => acc + (act.totalSeconds || 0), 0);
  }
  return 0;
}

export function evaluateStudentRisk(
  student: StudentDetailRecord,
  dossier?: GetInstructorStudentDossierResponse,
): StudentRiskEvaluation {
  const isDone = Boolean(student.isCompleted || student.progressPercent >= 100);
  const totalCourseItems = student.totalCourseItems ?? 0;
  const completedCount =
    student.completedItemsCount ??
    (totalCourseItems > 0
      ? Math.round(((student.progressPercent || 0) / 100) * totalCourseItems)
      : 0);
  const totalStudySeconds = computeTotalStudySeconds(student, dossier);
  const expectedEstimatedSeconds =
    student.courseEstimatedMinutes && student.courseEstimatedMinutes > 0
      ? Math.round(((student.progressPercent || 0) / 100) * student.courseEstimatedMinutes * 60)
      : completedCount * DEFAULT_ESTIMATED_ITEM_MINUTES * 60;

  const isFastPace = dossier
    ? Boolean(dossier.isSuspiciousFastPace)
    : completedCount >= MIN_COMPLETED_ITEMS_FOR_FAST_PACE_CHECK &&
      expectedEstimatedSeconds > 0 &&
      totalStudySeconds < expectedEstimatedSeconds * FAST_PACE_MIN_ESTIMATED_RATIO;
  const isInactive =
    !isDone &&
    (Boolean(student.isInactive) ||
      student.lastActiveTime === "Chưa học" ||
      student.lastActiveTime === "Chưa ghi nhận");
  const hasPeerReviewOverdue = Boolean(student.isPeerReviewOverdue);
  const hasPeerReviewPending = student.peerReviewDutyStatus === "PENDING";
  const hasCooldown = Boolean(student.isInCooldown);
  const isBehind = !isDone && student.pace === "BEHIND";

  const alertReasons: string[] = [];
  if (hasPeerReviewOverdue) {
    alertReasons.push(
      "Quá hạn hoàn thành nghĩa vụ chấm chéo bài tập cùng lớp (điểm tiểu luận đang bị tạm giữ)",
    );
  } else if (hasPeerReviewPending) {
    alertReasons.push("Chưa hoàn thành nghĩa vụ chấm chéo bài tập cùng lớp");
  }
  if (hasCooldown) {
    alertReasons.push("Đang bị khóa Quiz tạm thời sau nhiều lần làm chưa đạt");
  }
  if (isFastPace) {
    alertReasons.push(
      `Ghi nhận ${formatDuration(totalStudySeconds)} xem bài dù đã hoàn thành ${student.progressPercent}% đề cương`,
    );
  }
  if (isInactive) {
    alertReasons.push("Vắng mặt trên 7 ngày hoặc chưa ghi nhận phiên học gần đây");
  }
  if (isBehind && alertReasons.length === 0) {
    alertReasons.push("Tiến độ học tập hiện chậm hơn lộ trình đề xuất của lớp");
  }

  const hasHighRisk = !isDone && (hasPeerReviewOverdue || hasCooldown || isBehind);
  const hasMediumRisk = !isDone && (isFastPace || isInactive || hasPeerReviewPending);
  const needsAttention = hasHighRisk || hasMediumRisk;

  let statusLabel = "Đúng tiến độ";
  let badgeVariant: StudentRiskEvaluation["badgeVariant"] = "secondary";
  let dotClass = "bg-primary";

  if (isDone) {
    statusLabel = "Đã tốt nghiệp";
    badgeVariant = "success";
    dotClass = "bg-success";
  } else if (hasHighRisk) {
    statusLabel = "Cần lưu ý";
    badgeVariant = "destructive";
    dotClass = "bg-destructive";
  } else if (hasMediumRisk) {
    statusLabel = "Cần lưu ý";
    badgeVariant = "warning";
    dotClass = "bg-warning";
  } else if (student.pace === "AHEAD") {
    statusLabel = "Vượt tiến độ";
    badgeVariant = "success";
    dotClass = "bg-success";
  }

  let primaryActionTemplate: SmartTemplateType = "ENCOURAGE";
  let primaryActionLabel = "Gửi thông báo";
  if (isDone) {
    primaryActionTemplate = "CONGRATS";
    primaryActionLabel = "Gửi lời chúc mừng";
  } else if (hasPeerReviewOverdue || hasPeerReviewPending) {
    primaryActionTemplate = "PEER_REVIEW";
    primaryActionLabel = "Đôn đốc chấm chéo";
  } else if (hasCooldown) {
    primaryActionTemplate = "HELP_COOLDOWN";
    primaryActionLabel = "Hỗ trợ ôn tập";
  } else if (isBehind || isInactive || isFastPace) {
    primaryActionTemplate = "PACING";
    primaryActionLabel = "Kiểm tra & Hỗ trợ";
  }

  let alertTitle = "";
  if (hasHighRisk) {
    if (hasPeerReviewOverdue && isFastPace) {
      alertTitle = "Cần can thiệp: Quá hạn chấm chéo & bất thường thời lượng học";
    } else if (hasPeerReviewOverdue) {
      alertTitle = "Cần can thiệp: Quá hạn nghĩa vụ chấm chéo";
    } else if (hasCooldown) {
      alertTitle = "Cần hỗ trợ: Khóa bài kiểm tra tạm thời";
    } else {
      alertTitle = "Cần đôn đốc: Học viên đang chậm tiến độ";
    }
  } else if (hasMediumRisk) {
    if (isFastPace) {
      alertTitle = "Lưu ý: Thời lượng học ít bất thường so với tiến độ";
    } else if (hasPeerReviewPending) {
      alertTitle = "Lưu ý: Chưa hoàn thành nghĩa vụ chấm chéo";
    } else {
      alertTitle = "Lưu ý: Chưa ghi nhận truy cập gần đây";
    }
  }

  return {
    isDone,
    isFastPace,
    isInactive,
    hasPeerReviewOverdue,
    hasPeerReviewPending,
    hasCooldown,
    isBehind,
    needsAttention,
    statusLabel,
    badgeVariant,
    dotClass,
    alertSeverity: hasHighRisk ? "destructive" : hasMediumRisk ? "warning" : null,
    alertTitle,
    alertReasons,
    primaryActionLabel,
    primaryActionTemplate,
  };
}

export function getSmartTemplates(
  courseTitle: string,
  student: StudentDetailRecord,
  focusItemTitle?: string,
): { templates: Record<SmartTemplateType, SmartTemplateItem>; defaultType: SmartTemplateType } {
  const risk = evaluateStudentRisk(student);
  const progressPct = Math.round(student.progressPercent ?? 0);
  const itemSuffix = focusItemTitle ? ` (${focusItemTitle})` : "";

  const templates: Record<SmartTemplateType, SmartTemplateItem> = {
    PEER_REVIEW: {
      label: "Đôn đốc hoàn thành chấm chéo",
      subject: student.isPeerReviewOverdue
        ? `[Quá hạn chấm chéo] Hoàn thành đánh giá bài tập môn ${courseTitle}`
        : `[Nhắc nhở chấm chéo] Hoàn thành đánh giá bài tập môn ${courseTitle}`,
      body: `Chào em ${student.userName},\n\nThầy/Cô nhận thấy em đã nộp bài tiểu luận${itemSuffix} nhưng chưa hoàn thành nghĩa vụ chấm chéo bài tập của bạn cùng lớp môn "${courseTitle}".\n\nViệc chấm chéo là điều kiện bắt buộc để hệ thống mở khóa điểm chính thức và xét cấp chứng chỉ. Em hãy truy cập mục Bài tập nộp để hoàn thành phần đánh giá sớm nhé!`,
    },
    HELP_COOLDOWN: {
      label: "Hỗ trợ & Giải đáp bài kiểm tra",
      subject: `[Hỗ trợ học tập] Giải đáp kiến thức môn ${courseTitle}`,
      body: `Chào em ${student.userName},\n\nThầy/Cô nhận thấy em đang gặp khó khăn ở bài kiểm tra${itemSuffix} môn "${courseTitle}" và hệ thống đang tạm khóa làm lại để em có thời gian ôn tập.\n\nNếu có phần kiến thức hay dạng câu hỏi nào chưa rõ, em đừng ngại nhắn lại để Thầy/Cô hỗ trợ trực tiếp nhé!`,
    },
    PACING: {
      label: "Đôn đốc tiến độ học tập",
      subject: `[Nhắc tiến độ] Bám sát lộ trình môn ${courseTitle}`,
      body: `Chào em ${student.userName},\n\nThầy/Cô gửi thông báo nhắc em về tiến độ học tập môn "${courseTitle}" (hiện đạt ${progressPct}% đề cương)${focusItemTitle ? `, đặc biệt là nội dung "${focusItemTitle}"` : ""}.\n\nEm hãy sắp xếp thời gian xem đầy đủ bài giảng và hoàn thành các bài kiểm tra còn lại để bám sát tiến độ lớp nhé!`,
    },
    ENCOURAGE: {
      label: "Khen ngợi & Khích lệ",
      subject: `[Khích lệ học tập] Duy trì nhịp độ tốt môn ${courseTitle}`,
      body: `Chào em ${student.userName},\n\nThầy/Cô rất vui khi thấy em đang duy trì nhịp độ học tập tích cực môn "${courseTitle}" (${progressPct}% đề cương).\n\nChúc em tiếp tục giữ vững tinh thần tự học này để hoàn thành xuất sắc khóa học nhé!`,
    },
    CONGRATS: {
      label: "Chúc mừng hoàn thành khóa học",
      subject: `[Chúc mừng] Hoàn thành xuất sắc môn ${courseTitle}`,
      body: `Chào em ${student.userName},\n\nChúc mừng em đã hoàn thành 100% chương trình môn "${courseTitle}"! Em hãy kiểm tra mục Chứng chỉ trong Hồ sơ học tập để xem và tải về Chứng chỉ hoàn thành của mình nhé.`,
    },
  };

  return {
    templates,
    defaultType: risk.primaryActionTemplate,
  };
}

export function buildActivityTimeline(params: {
  activeMode: "30d" | "all";
  windowOffset: number;
  todayUtc: Date;
  student: StudentDetailRecord | null;
  dossier?: GetInstructorStudentDossierResponse;
}): {
  buckets: ActivityBucket[];
  canGoPrev: boolean;
  canGoNext: boolean;
  summaryText: string;
  defaultSelectedIdx: number;
} {
  const { activeMode, windowOffset, todayUtc, student, dossier } = params;

  const dayMap = new Map<
    string,
    { totalSeconds: number; items: { itemId?: string; title: string; mins: number }[] }
  >();
  const submissionMap = new Map<string, { itemId: string; title: string; weekNumber?: number }[]>();

  if (dossier && dossier.dailyLogs.length > 0) {
    for (const log of dossier.dailyLogs) {
      dayMap.set(log.studyDate, {
        totalSeconds: log.totalSeconds,
        items: log.items.map((it) => ({
          itemId: it.itemId,
          title: it.itemTitle,
          mins: Math.max(1, Math.round(it.secondsSpent / 60)),
        })),
      });
    }
  } else if (student?.dailyActivities && student.dailyActivities.length > 0) {
    for (const act of student.dailyActivities) {
      if (act.totalSeconds > 0) {
        dayMap.set(act.studyDate, {
          totalSeconds: act.totalSeconds,
          items: [],
        });
      }
    }
  }

  if (dossier && dossier.assessments.length > 0) {
    for (const a of dossier.assessments) {
      if (a.isSubmitted && a.submittedAt) {
        const subDt = parseIsoDateUtc(a.submittedAt);
        if (subDt) {
          const iso = toIsoDateUtc(subDt);
          const list = submissionMap.get(iso) || [];
          list.push({
            itemId: a.itemId,
            title: a.itemTitle,
            weekNumber: a.weekNumber || undefined,
          });
          submissionMap.set(iso, list);
        }
      }
    }
  }

  const enrolledDt = parseIsoDateUtc(dossier?.enrolledAt || student?.enrolledAt);
  let earliestDt = enrolledDt || todayUtc;
  for (const dIso of [...dayMap.keys(), ...submissionMap.keys()]) {
    const parsed = parseIsoDateUtc(dIso);
    if (parsed && parsed < earliestDt) {
      earliestDt = parsed;
    }
  }
  earliestDt = new Date(
    Date.UTC(earliestDt.getUTCFullYear(), earliestDt.getUTCMonth(), earliestDt.getUTCDate()),
  );
  const startDateIso = toIsoDateUtc(earliestDt);

  const totalEnrolledDays = Math.max(
    1,
    Math.floor((todayUtc.getTime() - earliestDt.getTime()) / MS_PER_DAY) + 1,
  );

  const findDefaultIdx = (buckets: ActivityBucket[]) => {
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (buckets[i].totalMinutes > 0 || buckets[i].isSubmittedOnly) {
        return i;
      }
    }
    return Math.max(0, buckets.length - 1);
  };

  if (activeMode === "30d" || totalEnrolledDays <= 45) {
    let startDt: Date;
    let count: number;

    if (activeMode === "all" || totalEnrolledDays <= DAYS_PER_WINDOW) {
      startDt = earliestDt;
      count = totalEnrolledDays;
    } else {
      const endDt = new Date(todayUtc.getTime() - windowOffset * DAYS_PER_WINDOW * MS_PER_DAY);
      const rawStart = new Date(endDt.getTime() - (DAYS_PER_WINDOW - 1) * MS_PER_DAY);
      startDt = rawStart < earliestDt ? earliestDt : rawStart;
      count = Math.floor((endDt.getTime() - startDt.getTime()) / MS_PER_DAY) + 1;
    }

    const buckets: ActivityBucket[] = [];
    for (let i = 0; i < count; i++) {
      const cur = new Date(startDt.getTime() + i * MS_PER_DAY);
      const iso = toIsoDateUtc(cur);
      const entry = dayMap.get(iso);
      const mins =
        entry && entry.totalSeconds > 0 ? Math.max(1, Math.round(entry.totalSeconds / 60)) : 0;
      const submittedItems = submissionMap.get(iso) || [];
      const isJanFirst = i > 0 && cur.getUTCMonth() === 0 && cur.getUTCDate() === 1;

      buckets.push({
        key: iso,
        axisLabel: formatDateVN(iso),
        readoutLabel: formatDateVN(iso),
        totalMinutes: mins,
        isStartDate: iso === startDateIso,
        isNewYearBoundary: isJanFirst,
        newYearYear: isJanFirst ? String(cur.getUTCFullYear()) : undefined,
        isSubmittedOnly: mins === 0 && submittedItems.length > 0,
        submittedItems,
        items: entry ? entry.items : [],
      });
    }

    const studyDays = buckets.filter((b) => b.totalMinutes > 0).length;
    const amberDays = buckets.filter((b) => b.isSubmittedOnly).length;
    const suffix = amberDays > 0 ? ` · ${amberDays} ngày nộp bài (0 phút học)` : "";
    const summaryText =
      activeMode === "all" || totalEnrolledDays <= DAYS_PER_WINDOW
        ? `${studyDays}/${buckets.length} ngày có học từ ngày tham gia${suffix}`
        : `${studyDays}/${buckets.length} ngày có học${suffix}`;

    return {
      buckets,
      canGoPrev:
        activeMode === "30d" &&
        totalEnrolledDays > DAYS_PER_WINDOW &&
        startDt.getTime() > earliestDt.getTime(),
      canGoNext: activeMode === "30d" && totalEnrolledDays > DAYS_PER_WINDOW && windowOffset > 0,
      summaryText,
      defaultSelectedIdx: findDefaultIdx(buckets),
    };
  }

  // Gom tuần cho khóa học dài > 45 ngày ở chế độ Toàn khóa
  const buckets: ActivityBucket[] = [];
  let cursor = new Date(earliestDt.getTime());
  let prevYear = cursor.getUTCFullYear();

  while (cursor.getTime() <= todayUtc.getTime()) {
    const wkStart = new Date(cursor.getTime());
    const rawEnd = new Date(cursor.getTime() + 6 * MS_PER_DAY);
    const wkEnd = rawEnd.getTime() > todayUtc.getTime() ? todayUtc : rawEnd;

    let totalSeconds = 0;
    const lessonMinsMap = new Map<string, { itemId?: string; title: string; mins: number }>();
    const submittedItems: { itemId: string; title: string; weekNumber?: number }[] = [];
    let crossedYear: string | undefined;

    for (
      let d = new Date(wkStart.getTime());
      d.getTime() <= wkEnd.getTime();
      d = new Date(d.getTime() + MS_PER_DAY)
    ) {
      if (buckets.length > 0 && d.getUTCFullYear() !== prevYear) {
        crossedYear = String(d.getUTCFullYear());
        prevYear = d.getUTCFullYear();
      }
      const iso = toIsoDateUtc(d);
      const entry = dayMap.get(iso);
      if (entry) {
        totalSeconds += entry.totalSeconds;
        for (const it of entry.items) {
          const mapKey = it.itemId || it.title;
          const prev = lessonMinsMap.get(mapKey);
          lessonMinsMap.set(mapKey, {
            itemId: it.itemId,
            title: it.title,
            mins: (prev?.mins || 0) + it.mins,
          });
        }
      }
      const subs = submissionMap.get(iso);
      if (subs) {
        submittedItems.push(...subs);
      }
    }

    const startIso = toIsoDateUtc(wkStart);
    const endIso = toIsoDateUtc(wkEnd);
    const totalMins = totalSeconds > 0 ? Math.max(1, Math.round(totalSeconds / 60)) : 0;
    const items = Array.from(lessonMinsMap.values());

    buckets.push({
      key: `${startIso}_${endIso}`,
      axisLabel: formatDateVN(startIso),
      readoutLabel: `${formatShortDateVN(startIso)} – ${formatDateVN(endIso)}`,
      totalMinutes: totalMins,
      isStartDate: buckets.length === 0,
      isNewYearBoundary: Boolean(crossedYear),
      newYearYear: crossedYear,
      isSubmittedOnly: totalMins === 0 && submittedItems.length > 0,
      submittedItems,
      items,
    });

    cursor = new Date(wkEnd.getTime() + MS_PER_DAY);
  }

  const activeWeeks = buckets.filter((b) => b.totalMinutes > 0).length;
  const amberWeeks = buckets.filter((b) => b.isSubmittedOnly).length;
  const suffix = amberWeeks > 0 ? ` · ${amberWeeks} tuần nộp bài (0 phút học)` : "";

  return {
    buckets,
    canGoPrev: false,
    canGoNext: false,
    summaryText: `${activeWeeks}/${buckets.length} tuần có học${suffix}`,
    defaultSelectedIdx: findDefaultIdx(buckets),
  };
}
