"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, CourseStatus, type Course } from "@/gen/catalog/v1/catalog_pb";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { ConfirmAlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { useAuth } from "@/components/providers/AuthProvider";
import { revalidateCoursesCache } from "@/app/actions/revalidate";
import {
  FileText,
  Plus,
  AlertTriangle,
  Pencil,
  BarChart2,
  Megaphone,
  Trash2,
  ArrowRight,
} from "lucide-react";

const emptySubscribe = () => () => {};

function getStatusBadge(status: CourseStatus) {
  switch (status) {
    case CourseStatus.DRAFT:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20">
          Bản nháp
        </span>
      );
    case CourseStatus.PENDING_REVIEW:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 animate-pulse">
          Chờ kiểm duyệt
        </span>
      );
    case CourseStatus.PUBLISHED:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
          Đã xuất bản
        </span>
      );
    case CourseStatus.REJECTED:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
          Từ chối
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
          Đã xuất bản
        </span>
      );
  }
}

export default function InstructorCoursesPage() {
  const { userRole, isInstructorOrAdmin } = useAuth();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [deletingCourseTarget, setDeletingCourseTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [partnerName, setPartnerName] = useState("DeepLearning.AI");
  const [partnerLogoUrl, setPartnerLogoUrl] = useState(
    "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
  );
  const [instructorNames, setInstructorNames] = useState("Andrew Ng, Giảng viên AI");
  const [financialAidEnabled, setFinancialAidEnabled] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.listInstructorCourses({ pageSize: 50 });
        if (!ignore) {
          setCourses(res.courses);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load instructor courses:", err);
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const refreshCourses = async () => {
    try {
      const client = getRpcClient(CatalogService);
      const res = await client.listInstructorCourses({ pageSize: 50 });
      setCourses(res.courses);
    } catch (err) {
      console.error("Failed to refresh instructor courses:", err);
    }
  };

  const handleOpenCreateModal = () => {
    if (!isInstructorOrAdmin) {
      toast.error(
        "Tài khoản Học viên (Learner) không có quyền tạo khóa học. Vui lòng đăng nhập tài khoản Giảng viên (Instructor).",
      );
      return;
    }
    setEditingCourseId(null);
    setTitle("");
    setSlug("");
    setDescription("");
    setPartnerName("DeepLearning.AI");
    setPartnerLogoUrl(
      "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
    );
    setInstructorNames("Andrew Ng, Giảng viên AI");
    setFinancialAidEnabled(true);
    setShowModal(true);
  };

  const handleOpenEditModal = (course: Course) => {
    if (!isInstructorOrAdmin) {
      toast.error("Tài khoản Học viên (Learner) không có quyền chỉnh sửa khóa học.");
      return;
    }
    setEditingCourseId(course.id);
    setTitle(course.title);
    setSlug(course.slug);
    setDescription(course.description);
    setPartnerName(course.partnerName);
    setPartnerLogoUrl(course.partnerLogoUrl);
    setInstructorNames(course.instructorNames.join(", "));
    setFinancialAidEnabled(course.financialAidEnabled);
    setShowModal(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInstructorOrAdmin) {
      toast.error(
        "Quyền truy cập bị từ chối. Chỉ tài khoản Giảng viên (Instructor) mới có quyền tạo hoặc chỉnh sửa khóa học.",
      );
      return;
    }

    if (!title.trim() || !description.trim()) return;

    setSaving(true);

    try {
      const client = getRpcClient(CatalogService);
      const instructors = instructorNames
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (editingCourseId) {
        // Edit Mode
        const res = await client.updateCourse({
          id: editingCourseId,
          title,
          description,
          partnerName,
          partnerLogoUrl,
          instructorNames: instructors,
          financialAidEnabled,
        });

        if (res.course) {
          toast.success(
            `${"Cập Nhật Khóa Học".replace("Cập Nhật ", "")} "${res.course.title}" ${"Tạo khóa học mới thành công!".split(" ").slice(-2).join(" ")}`,
          );
          await revalidateCoursesCache(res.course.id);
          setShowModal(false);
          await refreshCourses();
        }
      } else {
        // Create Mode
        const res = await client.createCourse({
          title,
          slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description,
          partnerName,
          partnerLogoUrl,
          instructorNames: instructors,
          financialAidEnabled,
        });

        if (res.course) {
          toast.success("Tạo khóa học mới thành công!");
          await revalidateCoursesCache(res.course.id);
          setShowModal(false);
          await refreshCourses();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thất bại khi lưu khóa học.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = (courseId: string, courseTitle: string) => {
    if (!isInstructorOrAdmin) {
      toast.error("Tài khoản Học viên (Learner) không có quyền xóa khóa học.");
      return;
    }
    setDeletingCourseTarget({ id: courseId, title: courseTitle });
  };

  const executeDeleteCourse = async () => {
    if (!deletingCourseTarget) return;
    try {
      const client = getRpcClient(CatalogService);
      await client.deleteCourse({ id: deletingCourseTarget.id });
      toast.success(`Đã xóa thành công khóa học "${deletingCourseTarget.title}".`);
      await refreshCourses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể xóa khóa học.";
      toast.error(msg);
    } finally {
      setDeletingCourseTarget(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 flex-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
            {"Instructor Portal"}
          </div>
          <h1 className="text-3xl font-extrabold text-foreground text-balance">
            {"Quản lý Khóa học Giảng dạy"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {
              "Soạn thảo, quản lý bài giảng, xem thống kê và đăng thông báo cho các khóa học trên nền tảng Coursera AI."
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/instructor/financial-aid"
            className="px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm transition-colors flex items-center gap-2"
          >
            <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
            <span>{"Duyệt Financial Aid"}</span>
          </Link>

          <Link
            href="/instructor/courses/new"
            className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            <span>{"Soạn Khóa Học Mới"}</span>
          </Link>
        </div>
      </div>

      {/* Role Warning Banner if user is Learner */}
      {isMounted && userRole && !isInstructorOrAdmin && (
        <div className="mb-6 p-4 rounded-2xl bg-warning/10 border border-warning/20 text-warning text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <span>
            <strong>{"Lưu ý Phân quyền:"}</strong>{" "}
            {
              "Bạn đang xem ở chế độ đọc với tài khoản Learner (Học viên). Chỉ tài khoản Instructor (Giảng viên) mới có quyền tạo và chỉnh sửa khóa học."
            }
          </span>
        </div>
      )}

      {/* Courses Table / Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          <span aria-live="polite">{"Đang tải danh sách khóa học…"}</span>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-3xl border border-border">
          <p className="text-muted-foreground mb-4">{"Chưa có khóa học nào được tạo."}</p>
          <Button onClick={handleOpenCreateModal}>{"Tạo khóa học đầu tiên"}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-card border border-border hover:border-primary/50 rounded-3xl p-6 transition-colors flex flex-col justify-between h-full"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {course.partnerName}
                  </span>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(course.status)}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        course.financialAidEnabled
                          ? "bg-success/10 text-success border border-success/20"
                          : "bg-muted text-muted-foreground border border-input"
                      }`}
                    >
                      {course.financialAidEnabled ? "FinAid: ON" : "FinAid: OFF"}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {course.weekModules.length} {"Tuần học"}
                    </span>
                  </div>
                </div>
                <Link href={`/instructor/courses/${course.id}`} className="block">
                  <h3 className="font-bold text-lg text-foreground mb-2 min-w-0 line-clamp-2 hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                </Link>
                <p className="text-xs text-muted-foreground min-w-0 line-clamp-3 mb-4 leading-relaxed">
                  {course.description}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <Link
                    href={`/instructor/courses/${course.id}`}
                    className="px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors flex items-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{"Biên soạn"}</span>
                  </Link>

                  <Link
                    href={`/instructor/courses/${course.id}/analytics`}
                    className="px-2.5 py-1 rounded-lg bg-success/10 text-success border border-success/20 text-xs font-semibold hover:bg-success/20 transition-colors flex items-center gap-1"
                  >
                    <BarChart2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{"Thống kê"}</span>
                  </Link>

                  <Link
                    href={`/instructor/courses/${course.id}/announcements`}
                    className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1"
                  >
                    <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{"Thông báo"}</span>
                  </Link>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditModal(course)}
                    className="bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{"Sửa thông tin"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCourse(course.id, course.title)}
                    className="bg-destructive/10 text-destructive border-destructive/20 text-xs font-semibold hover:bg-destructive/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{"Xóa"}</span>
                  </Button>

                  <Link
                    href={`/courses/${course.id}`}
                    className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 ml-auto"
                  >
                    <span>{"Xem bài giảng"}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Soạn / Chỉnh Sửa Khóa Học */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCourseId ? "Chỉnh Sửa Khóa Học" : "Soạn Thảo Khóa Học Mới"}
      >
        <form onSubmit={handleSaveCourse} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {"Tên Khóa Học *"}
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={"Ví dụ: Natural Language Processing with Transformers"}
              required
            />
          </div>

          {!editingCourseId && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {"Slug URL"}
              </label>
              <Input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={"course-nlp-transformers (Tự tạo nếu để trống)"}
                className="font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {"Mô Tả Nội Dung *"}
            </label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={"Tóm tắt tổng quan kiến thức và kỹ năng đạt được sau khóa học…"}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {"Đối Tác Phát Hành"}
              </label>
              <Input
                type="text"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {"Logo URL Đối Tác"}
              </label>
              <Input
                type="text"
                value={partnerLogoUrl}
                onChange={(e) => setPartnerLogoUrl(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <Input
            label="Giảng Viên (cách nhau bởi dấu phẩy)"
            type="text"
            value={instructorNames}
            onChange={(e) => setInstructorNames(e.target.value)}
          />

          <div className="p-3.5 rounded-2xl bg-muted border border-border">
            <Checkbox
              id="financialAidToggle"
              checked={financialAidEnabled}
              onCheckedChange={(checked) => setFinancialAidEnabled(Boolean(checked))}
              label="Cho phép xin Hỗ trợ Tài chính (Financial Aid available)"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              {"Hủy"}
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              <span aria-live="polite">
                {saving
                  ? "Đang lưu…"
                  : editingCourseId
                    ? "Cập Nhật Khóa Học"
                    : "Lưu & Đăng Khóa Học"}
              </span>
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmAlertDialog
        isOpen={Boolean(deletingCourseTarget)}
        onClose={() => setDeletingCourseTarget(null)}
        onConfirm={executeDeleteCourse}
        title="Xác nhận xóa khóa học"
        description={
          deletingCourseTarget
            ? `Bạn có chắc chắn muốn xóa khóa học "${deletingCourseTarget.title}"? Thao tác này không thể hoàn tác.`
            : ""
        }
        confirmText="Xóa khóa học"
        cancelText="Hủy"
        variant="danger"
      />
    </div>
  );
}
