"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, CourseStatus, type Course } from "@/gen/catalog/v1/catalog_pb";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Progress } from "@/components/ui/Progress";
import { DropdownMenu } from "@/components/ui/Menu";
import { IconButton } from "@/components/ui/IconButton";
import { useAuth } from "@/components/providers/AuthProvider";
import { revalidateCoursesCache } from "@/app/actions/revalidate";
import { PageHeader } from "@/components/ui/LayoutPrimitives";
import {
  FileText,
  Plus,
  AlertTriangle,
  Pencil,
  BarChart2,
  Megaphone,
  Trash2,
  ArrowRight,
  MoreVertical,
  Clock,
  Award,
  ExternalLink,
  Settings,
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

  const handleDeleteCourse = (courseId: string, courseTitle: string, status?: CourseStatus) => {
    if (!isInstructorOrAdmin) {
      toast.error("Tài khoản Học viên (Learner) không có quyền xóa khóa học.");
      return;
    }
    if (status === CourseStatus.PUBLISHED) {
      toast.error(
        `Không thể xóa khóa học "${courseTitle}" vì khóa học đã được xuất bản (PUBLISHED). Vui lòng liên hệ Quản trị viên hệ thống để được hỗ trợ.`,
      );
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
      <PageHeader>
        <div>
          <PageHeader.Badge>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
              {"Instructor Portal"}
            </div>
          </PageHeader.Badge>
          <PageHeader.Title>{"Quản lý Khóa học Giảng dạy"}</PageHeader.Title>
          <PageHeader.Description>
            {
              "Soạn thảo, quản lý bài giảng, xem thống kê và đăng thông báo cho các khóa học trên nền tảng Coursera AI."
            }
          </PageHeader.Description>
        </div>

        <PageHeader.Actions>
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
        </PageHeader.Actions>
      </PageHeader>

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
          <Progress.Circular size="sm" className="mr-3" />
          <span aria-live="polite">{"Đang tải danh sách khóa học…"}</span>
        </div>
      ) : courses.length === 0 ? (
        <Surface variant="low" shape="2xl" className="text-center py-16">
          <p className="text-muted-foreground mb-4">{"Chưa có khóa học nào được tạo."}</p>
          <Button onClick={handleOpenCreateModal}>{"Tạo khóa học đầu tiên"}</Button>
        </Surface>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Surface
              key={course.id}
              variant="low"
              shape="2xl"
              className="p-5 flex flex-col justify-between h-full group hover:shadow-md transition-all border border-border/60 hover:border-primary/30"
            >
              <div>
                {/* Header: Partner Name + Status + Context Menu Dropdown */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 truncate">
                      {course.partnerName}
                    </span>
                    {getStatusBadge(course.status)}
                  </div>

                  {/* Options Menu (...) */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                      render={
                        <IconButton
                          variant="standard"
                          size="xs"
                          aria-label="Thao tác khóa học"
                          className="text-muted-foreground hover:text-foreground -mr-1"
                        >
                          <MoreVertical className="w-4 h-4" aria-hidden="true" />
                        </IconButton>
                      }
                    />
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item
                        render={<Link href={`/instructor/courses/${course.id}`} />}
                      >
                        <Pencil className="w-4 h-4 text-primary" aria-hidden="true" />
                        <span>Biên soạn bài giảng</span>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item onClick={() => handleOpenEditModal(course)}>
                        <Settings className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <span>Sửa thông tin khóa học</span>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item
                        render={<Link href={`/instructor/courses/${course.id}/analytics`} />}
                      >
                        <BarChart2 className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <span>Thống kê & Phân tích</span>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item
                        render={<Link href={`/instructor/courses/${course.id}/announcements`} />}
                      >
                        <Megaphone className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        <span>Thông báo khóa học</span>
                      </DropdownMenu.Item>

                      <DropdownMenu.Item
                        render={<Link href={`/courses/${course.id}`} target="_blank" />}
                      >
                        <ExternalLink
                          className="w-4 h-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span>Xem trang học viên</span>
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className="my-1 h-px bg-border/60" />

                      <DropdownMenu.Item
                        onClick={() => handleDeleteCourse(course.id, course.title, course.status)}
                        className="text-destructive hover:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                        <span>Xóa khóa học</span>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </div>

                {/* Course Title & Description */}
                <Link href={`/instructor/courses/${course.id}`} className="block group/title">
                  <h3 className="font-bold text-base sm:text-lg text-foreground mb-1.5 min-w-0 line-clamp-2 leading-snug group-hover/title:text-primary transition-colors">
                    {course.title}
                  </h3>
                </Link>
                <p className="text-xs text-muted-foreground min-w-0 line-clamp-2 mb-4 leading-relaxed">
                  {course.description || "Chưa có mô tả khóa học."}
                </p>

                {/* Metadata Row */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/40 mb-4">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/70" aria-hidden="true" />
                    <span>{course.weekModules.length} tuần học</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Award className="w-3.5 h-3.5 text-muted-foreground/70" aria-hidden="true" />
                    <span>
                      FinAid:{" "}
                      <strong
                        className={
                          course.financialAidEnabled
                            ? "text-success font-semibold"
                            : "text-muted-foreground"
                        }
                      >
                        {course.financialAidEnabled ? "Bật" : "Tắt"}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Primary CTA Button */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-end">
                <Button
                  variant="filled"
                  size="sm"
                  render={<Link href={`/instructor/courses/${course.id}`} />}
                  className="w-full sm:w-auto font-semibold gap-2 shadow-xs group-hover:shadow-sm"
                >
                  <span>Biên soạn bài giảng</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      )}

      {/* Modal Soạn / Chỉnh Sửa Khóa Học */}
      <Dialog.Root open={showModal} onOpenChange={(open) => setShowModal(open)}>
        <Dialog.Content size="lg">
          <Dialog.Header>
            <Dialog.Title>
              {editingCourseId ? "Chỉnh Sửa Khóa Học" : "Soạn Thảo Khóa Học Mới"}
            </Dialog.Title>
          </Dialog.Header>
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

            <Dialog.Footer className="pt-4 border-t border-border">
              <Button type="button" variant="text" onClick={() => setShowModal(false)}>
                {"Hủy"}
              </Button>
              <Button type="submit" variant="filled" disabled={saving}>
                <span aria-live="polite">
                  {saving
                    ? "Đang lưu…"
                    : editingCourseId
                      ? "Cập Nhật Khóa Học"
                      : "Lưu & Đăng Khóa Học"}
                </span>
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog
        open={Boolean(deletingCourseTarget)}
        onOpenChange={(open: boolean) => {
          if (!open) setDeletingCourseTarget(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Icon icon={<Trash2 className="w-6 h-6 text-error" aria-hidden="true" />} />
            <Dialog.Title>Xác nhận xóa khóa học</Dialog.Title>
            <Dialog.Description>
              {deletingCourseTarget
                ? `Bạn có chắc chắn muốn xóa khóa học "${deletingCourseTarget.title}"? Thao tác này không thể hoàn tác.`
                : ""}
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="text" onClick={() => setDeletingCourseTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="filled"
              className="bg-error text-on-error hover:bg-destructive-hover active:bg-destructive-active"
              onClick={executeDeleteCourse}
            >
              Xóa khóa học
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </div>
  );
}
