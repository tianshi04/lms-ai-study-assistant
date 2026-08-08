"use client";

import Link from "next/link";
import {
  AlertCircle,
  User,
  Check,
  Download,
  Upload,
  FileText,
  BarChart2,
  Megaphone,
  Plus,
  Users,
} from "lucide-react";
import { CourseStatus, type Course } from "@/gen/catalog/v1/catalog_pb";
import { Button } from "@/components/ui/Button";

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
  onOpenCollaboratorsModal?: () => void;
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
  onOpenCollaboratorsModal,
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
          <AlertCircle
            className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
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
          <p className="text-sm text-muted-foreground leading-relaxed min-w-0 line-clamp-2">
            {course.description}
          </p>
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-2 pt-1">
            <User className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <span>
              {"Giảng viên:"} {course.instructorNames.join(", ")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {(course.status === CourseStatus.DRAFT || course.status === CourseStatus.REJECTED) && (
            <Button
              type="button"
              onClick={onSubmitForLaunch}
              disabled={submittingLaunch}
              isLoading={submittingLaunch}
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>{"Gửi duyệt mở lớp"}</span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onExportScorm}
            disabled={saving}
            className="bg-warning/10 text-warning border-warning/20 text-xs font-bold hover:bg-warning/20"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>{"Xuất SCORM 1.2 ZIP"}</span>
          </Button>

          <label className="px-3.5 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>{scormImporting ? "Đang xử lý…" : "Import Gói SCORM"}</span>
            <input
              type="file"
              accept=".zip"
              aria-label="Import tệp Gói SCORM"
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
            <FileText className="w-4 h-4" aria-hidden="true" />
            <span>{"Ngân hàng Câu hỏi"}</span>
          </Link>

          <Link
            href={`/instructor/courses/${courseId}/analytics`}
            className="px-4 py-2.5 rounded-xl bg-success/10 text-success border border-success/20 text-xs font-bold hover:bg-success/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <BarChart2 className="w-4 h-4" aria-hidden="true" />
            <span>{"Thống kê lớp học"}</span>
          </Link>

          <Link
            href={`/instructor/courses/${courseId}/announcements`}
            className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <Megaphone className="w-4 h-4" aria-hidden="true" />
            <span>{"Đăng Thông báo"}</span>
          </Link>

          {onOpenCollaboratorsModal && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenCollaboratorsModal}
              className="bg-primary/10 text-primary border-primary/20 text-xs font-bold hover:bg-primary/20"
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              <span>{"Người hợp tác"}</span>
            </Button>
          )}

          {isInstructorOrAdmin && (
            <Button
              type="button"
              onClick={onAddWeek}
              className="w-full sm:w-auto font-bold text-sm shrink-0"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span>{"Thêm Tuần học"}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
