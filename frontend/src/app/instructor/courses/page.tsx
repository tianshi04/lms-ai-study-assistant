"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";
import { Navbar } from "@/components/Navbar";

const emptySubscribe = () => () => {};

export default function InstructorCoursesPage() {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Read user_role safely for SSR & hydration
  const userRole = isMounted && typeof window !== "undefined" ? localStorage.getItem("user_role") : null;
  const isInstructorOrAdmin = userRole === "2" || userRole === "4" || userRole === "5";

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [partnerName, setPartnerName] = useState("DeepLearning.AI");
  const [partnerLogoUrl, setPartnerLogoUrl] = useState("https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg");
  const [instructorNames, setInstructorNames] = useState("Andrew Ng, Giảng viên AI");

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.listCourses({ pageSize: 50 });
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
      const res = await client.listCourses({ pageSize: 50 });
      setCourses(res.courses);
    } catch (err) {
      console.error("Failed to refresh instructor courses:", err);
    }
  };

  const handleOpenCreateModal = () => {
    if (!isInstructorOrAdmin) {
      setMessage("Tài khoản Học viên (Learner) không có quyền tạo khóa học. Vui lòng đăng nhập tài khoản Giảng viên (Instructor).");
      return;
    }
    setEditingCourseId(null);
    setTitle("");
    setSlug("");
    setDescription("");
    setPartnerName("DeepLearning.AI");
    setPartnerLogoUrl("https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg");
    setInstructorNames("Andrew Ng, Giảng viên AI");
    setShowModal(true);
  };

  const handleOpenEditModal = (course: Course) => {
    if (!isInstructorOrAdmin) {
      setMessage("Tài khoản Học viên (Learner) không có quyền chỉnh sửa khóa học.");
      return;
    }
    setEditingCourseId(course.id);
    setTitle(course.title);
    setSlug(course.slug);
    setDescription(course.description);
    setPartnerName(course.partnerName);
    setPartnerLogoUrl(course.partnerLogoUrl);
    setInstructorNames(course.instructorNames.join(", "));
    setShowModal(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInstructorOrAdmin) {
      setMessage("Quyền truy cập bị từ chối. Chỉ tài khoản Giảng viên (Instructor) mới có quyền tạo hoặc chỉnh sửa khóa học.");
      return;
    }

    if (!title.trim() || !description.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const client = getRpcClient(CatalogService);
      const instructors = instructorNames.split(",").map((s) => s.trim()).filter(Boolean);

      if (editingCourseId) {
        // Edit Mode
        const res = await client.updateCourse({
          courseId: editingCourseId,
          title,
          description,
          partnerName,
          partnerLogoUrl,
          instructorNames: instructors,
        });

        if (res.course) {
          setMessage(`Cập nhật thông tin khóa học "${res.course.title}" thành công!`);
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
        });

        if (res.course) {
          setMessage("Tạo khóa học mới thành công!");
          setShowModal(false);
          await refreshCourses();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Thất bại khi lưu khóa học.";
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Instructor Portal
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Quản lý Khóa học Giảng dạy
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Soạn thảo, quản lý bài giảng và tạo/chỉnh sửa các khóa học trên nền tảng Coursera AI.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Soạn Khóa Học Mới</span>
          </button>
        </div>

        {/* Role Warning Banner if user is Learner */}
        {isMounted && userRole && !isInstructorOrAdmin && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              <strong>Lưu ý Phân quyền:</strong> Bạn đang xem ở chế độ đọc với tài khoản <strong>Learner (Học viên)</strong>. Chỉ tài khoản <strong>Instructor (Giảng viên)</strong> mới có quyền tạo và chỉnh sửa khóa học.
            </span>
          </div>
        )}

        {/* Success / Error Message */}
        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between">
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-xs underline font-semibold">
              Đóng
            </button>
          </div>
        )}

        {/* Courses Table / Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span>Đang tải danh sách khóa học...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 mb-4">Chưa có khóa học nào được tạo.</p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
            >
              Tạo khóa học đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                      {course.partnerName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{course.weekModules.length} Tuần học</span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenEditModal(course)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Chỉnh sửa</span>
                  </button>

                  <Link
                    href={`/courses/${course.id}`}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Xem Chi Tiết →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Soạn / Chỉnh Sửa Khóa Học */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-xl w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingCourseId ? "Chỉnh Sửa Khóa Học" : "Soạn Thảo Khóa Học Mới"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Tên Khóa Học *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Natural Language Processing with Transformers"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {!editingCourseId && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Slug URL
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="course-nlp-transformers (Tự tạo nếu để trống)"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Mô Tả Nội Dung *
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tóm tắt tổng quan kiến thức và kỹ năng đạt được sau khóa học..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Đối Tác Phát Hành
                    </label>
                    <input
                      type="text"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Logo URL Đối Tác
                    </label>
                    <input
                      type="text"
                      value={partnerLogoUrl}
                      onChange={(e) => setPartnerLogoUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Giảng Viên (cách nhau bởi dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={instructorNames}
                    onChange={(e) => setInstructorNames(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {saving ? "Đang lưu..." : editingCourseId ? "Cập Nhật Khóa Học" : "Lưu & Đăng Khóa Học"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
