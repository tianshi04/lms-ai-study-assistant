"use client";

import Link from "next/link";
import { CourseStatus, type Course } from "@/gen/catalog/v1/catalog_pb";

interface CourseHeaderBannerProps {
  course: Course;
  courseId: string;
  submittingLaunch: boolean;
  saving: boolean;
  scormImporting: boolean;
  isInstructorOrAdmin: boolean;
  onSubmitForLaunch: () => void;
  onExportScorm: () => void;
  onImportScormFile: (file: File) => void;
  onAddWeek: () => void;
}

export function CourseHeaderBanner({
  course,
  courseId,
  submittingLaunch,
  saving,
  scormImporting,
  isInstructorOrAdmin,
  onSubmitForLaunch,
  onExportScorm,
  onImportScormFile,
  onAddWeek,
}: CourseHeaderBannerProps) {
  return (
    <div className="space-y-4">
      {/* Status Alert Banners */}
      {course.status === CourseStatus.PENDING_REVIEW && (
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
            <span>
              <strong>{"Khóa học đang chờ kiểm duyệt (PENDING_REVIEW):"}</strong>{" "}
              {
                "Hệ thống đang chuyển sang chế độ Chỉ đọc (Read-only). Các thao tác chỉnh sửa sẽ tạm thời bị khóa trong thời gian Reviewer đánh giá."
              }
            </span>
          </div>
        </div>
      )}

      {course.status === CourseStatus.REJECTED && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
          <svg
            className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="font-bold text-destructive">
              {"Khóa học bị từ chối phê duyệt (REJECTED)"}
            </h4>
            <p className="text-xs mt-1 text-destructive/80">
              {"Lý do góp ý từ Reviewer:"}{" "}
              <strong>{course.rejectionReason || "Cần bổ sung thêm thông tin học liệu."}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {
                "Vui lòng hoàn thiện học liệu theo yêu cầu và bấm 'Gửi Yêu Cầu Phê Duyệt' để nộp lại."
              }
            </p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {course.partnerName}
            </span>
            {course.status === CourseStatus.DRAFT && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20">
                {"Bản nháp (DRAFT)"}
              </span>
            )}
            {course.status === CourseStatus.PENDING_REVIEW && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 animate-pulse">
                {"Chờ kiểm duyệt (PENDING_REVIEW)"}
              </span>
            )}
            {course.status === CourseStatus.PUBLISHED && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
                {"Đã xuất bản (PUBLISHED)"}
              </span>
            )}
            {course.status === CourseStatus.REJECTED && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                {"Từ chối (REJECTED)"}
              </span>
            )}
            <span className="text-xs font-mono text-muted-foreground">ID: {course.id}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight text-balance">
            {course.title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {course.description}
          </p>
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-2 pt-1">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>
              {"Giảng viên:"} {course.instructorNames.join(", ")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {(course.status === CourseStatus.DRAFT || course.status === CourseStatus.REJECTED) && (
            <button
              type="button"
              onClick={onSubmitForLaunch}
              disabled={submittingLaunch}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span aria-live="polite">
                {submittingLaunch ? "Đang nộp…" : "Submit for Launch (Gửi duyệt)"}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onExportScorm}
            disabled={saving}
            className="px-3.5 py-2.5 rounded-xl bg-warning/10 text-warning border border-warning/20 text-xs font-bold hover:bg-warning/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>{"Xuất SCORM 1.2 ZIP"}</span>
          </button>

          <label className="px-3.5 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span>{scormImporting ? "Đang xử lý…" : "Import Gói SCORM"}</span>
            <input
              type="file"
              accept=".zip"
              className="hidden"
              disabled={scormImporting}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onImportScormFile(file);
                }
                e.target.value = "";
              }}
            />
          </label>

          <Link
            href={`/instructor/courses/${courseId}/question-bank`}
            className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <span>{"Ngân hàng Câu hỏi"}</span>
          </Link>

          <Link
            href={`/instructor/courses/${courseId}/analytics`}
            className="px-4 py-2.5 rounded-xl bg-success/10 text-success border border-success/20 text-xs font-bold hover:bg-success/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span>{"Thống kê lớp học"}</span>
          </Link>

          <Link
            href={`/instructor/courses/${courseId}/announcements`}
            className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
              />
            </svg>
            <span>{"Đăng Thông báo"}</span>
          </Link>

          {isInstructorOrAdmin && (
            <button
              onClick={onAddWeek}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>{"Thêm Tuần học"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
