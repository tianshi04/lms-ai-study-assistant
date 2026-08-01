"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { DirectionalTransition } from "@/components/transitions/DirectionalTransition";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, CourseStatus, type Course } from "@/gen/catalog/v1/catalog_pb";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { revalidateCoursesCache } from "@/app/actions/revalidate";

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

  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    if (!isInstructorOrAdmin) {
      toast.error("Tài khoản Học viên (Learner) không có quyền xóa khóa học.");
      return;
    }

    if (!confirm(`${"Xóa"} khóa học "${courseTitle}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    try {
      const client = getRpcClient(CatalogService);
      await client.deleteCourse({ id: courseId });
      toast.success(`Đã xóa thành công khóa học "${courseTitle}".`);
      await refreshCourses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể xóa khóa học.";
      toast.error(msg);
    }
  };

  return (
    <DirectionalTransition>
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
              className="px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm transition-all flex items-center gap-2"
            >
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>{"Duyệt Financial Aid"}</span>
            </Link>

            <Link
              href="/instructor/courses/new"
              className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>{"Soạn Khóa Học Mới"}</span>
            </Link>
          </div>
        </div>

        {/* Role Warning Banner if user is Learner */}
        {isMounted && userRole && !isInstructorOrAdmin && (
          <div className="mb-6 p-4 rounded-2xl bg-warning/10 border border-warning/20 text-warning text-sm flex items-center gap-3">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
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
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold cursor-pointer"
            >
              {"Tạo khóa học đầu tiên"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full"
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
                    <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-2 hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                  </Link>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-2 mb-4">
                    <Link
                      href={`/instructor/courses/${course.id}`}
                      className="px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-colors flex items-center gap-1"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span>{"Biên soạn"}</span>
                    </Link>

                    <Link
                      href={`/instructor/courses/${course.id}/analytics`}
                      className="px-2.5 py-1 rounded-lg bg-success/10 text-success border border-success/20 text-xs font-semibold hover:bg-success/20 transition-colors flex items-center gap-1"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <span>{"Thống kê"}</span>
                    </Link>

                    <Link
                      href={`/instructor/courses/${course.id}/announcements`}
                      className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                        />
                      </svg>
                      <span>{"Thông báo"}</span>
                    </Link>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(course)}
                      className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span>{"Sửa thông tin"}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>{"Xóa"}</span>
                    </button>

                    <Link
                      href={`/courses/${course.id}`}
                      className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 ml-auto"
                    >
                      <span>{"Xem bài giảng"}</span>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Soạn / Chỉnh Sửa Khóa Học */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-3xl p-8 max-w-xl w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">
                  {editingCourseId ? "Chỉnh Sửa Khóa Học" : "Soạn Thảo Khóa Học Mới"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {"Tên Khóa Học *"}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={"Ví dụ: Natural Language Processing with Transformers"}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                </div>

                {!editingCourseId && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {"Slug URL"}
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder={"course-nlp-transformers (Tự tạo nếu để trống)"}
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {"Mô Tả Nội Dung *"}
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={"Tóm tắt tổng quan kiến thức và kỹ năng đạt được sau khóa học…"}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {"Đối Tác Phát Hành"}
                    </label>
                    <input
                      type="text"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {"Logo URL Đối Tác"}
                    </label>
                    <input
                      type="text"
                      value={partnerLogoUrl}
                      onChange={(e) => setPartnerLogoUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    {"Giảng Viên (cách nhau bởi dấu phẩy)"}
                  </label>
                  <input
                    type="text"
                    value={instructorNames}
                    onChange={(e) => setInstructorNames(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted border border-border">
                  <input
                    type="checkbox"
                    id="financialAidToggle"
                    checked={financialAidEnabled}
                    onChange={(e) => setFinancialAidEnabled(e.target.checked)}
                    className="w-4 h-4 text-primary rounded focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  />
                  <label
                    htmlFor="financialAidToggle"
                    className="text-xs font-bold text-foreground cursor-pointer"
                  >
                    {"Cho phép xin Hỗ trợ Tài chính (Financial Aid available)"}
                  </label>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-input text-foreground text-sm font-semibold hover:bg-muted cursor-pointer"
                  >
                    {"Hủy"}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 cursor-pointer"
                  >
                    <span aria-live="polite">
                      {saving
                        ? "Đang lưu…"
                        : editingCourseId
                          ? "Cập Nhật Khóa Học"
                          : "Lưu & Đăng Khóa Học"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DirectionalTransition>
  );
}
