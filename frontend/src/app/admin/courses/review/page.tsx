"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import {
  CatalogService,
  CourseStatus,
  CourseReviewAction,
  type Course,
} from "@/gen/catalog/v1/catalog_pb";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/components/providers/AuthProvider";
import { revalidateCoursesCache } from "@/app/actions/revalidate";

const emptySubscribe = () => () => {};

export default function CourseReviewerPortalPage() {
  const { userRole, isInstructorOrAdmin: isReviewer } = useAuth();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CourseStatus>(CourseStatus.PENDING_REVIEW);

  // Modal State for Rejecting
  const [rejectingCourseId, setRejectingCourseId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();

  const fetchCourses = async (status: CourseStatus) => {
    try {
      setLoading(true);
      const client = getRpcClient(CatalogService);
      const res = await client.listInstructorCourses({
        pageSize: 50,
        statusFilter: status,
      });
      setCourses(res.courses);
    } catch (err) {
      console.error("Failed to load courses for review:", err);
      toast.error("Không thể tải danh sách kiểm duyệt khóa học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        const client = getRpcClient(CatalogService);
        const res = await client.listInstructorCourses({
          pageSize: 50,
          statusFilter: activeTab,
        });
        if (!ignore) {
          setCourses(res.courses);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load courses for review:", err);
        if (!ignore) {
          toast.error("Không thể tải danh sách kiểm duyệt khóa học.");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [activeTab, toast]);

  const handleApprove = async (courseId: string, title: string) => {
    try {
      setSubmitting(true);
      const client = getRpcClient(CatalogService);
      await client.reviewCourse({
        courseId,
        action: CourseReviewAction.APPROVE,
      });
      toast.success(`Đã phê duyệt và xuất bản khóa học "${title}" thành công!`);
      await revalidateCoursesCache(courseId);
      await fetchCourses(activeTab);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Phê duyệt khóa học thất bại.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingCourseId || !rejectionReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }
    try {
      setSubmitting(true);
      const client = getRpcClient(CatalogService);
      await client.reviewCourse({
        courseId: rejectingCourseId,
        action: CourseReviewAction.REJECT,
        rejectionReason: rejectionReason.trim(),
      });
      toast.success("Đã từ chối và phản hồi yêu cầu hoàn thiện lại khóa học.");
      await revalidateCoursesCache(rejectingCourseId);
      setRejectingCourseId(null);
      setRejectionReason("");
      await fetchCourses(activeTab);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Từ chối khóa học thất bại.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
              {"Course Reviewer Portal"}
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white text-balance">
              {"Kiểm duyệt & Phê duyệt Phát hành Khóa học"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {
                "Màn hình đánh giá nội dung bài giảng, trải nghiệm chế độ Xem trước và đưa ra quyết định Phê duyệt (Approve) hoặc Từ chối (Reject)."
              }
            </p>
          </div>

          <Link
            href="/admin/dashboard"
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all"
          >
            {"Về Admin Dashboard"}
          </Link>
        </div>

        {/* Role Warning */}
        {isMounted && userRole && !isReviewer && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm">
            <strong>{"Lưu ý Phân quyền:"}</strong>{" "}
            {
              "Bạn đang ở chế độ xem. Chỉ tài khoản Quản trị viên Tổ chức (Organization Admin) hoặc SUPER_ADMIN mới có quyền phê duyệt / từ chối phát hành khóa học."
            }
          </div>
        )}

        {/* Status Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-6 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab(CourseStatus.PENDING_REVIEW)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === CourseStatus.PENDING_REVIEW
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
            }`}
          >
            {"Chờ kiểm duyệt (PENDING_REVIEW)"}
          </button>
          <button
            onClick={() => setActiveTab(CourseStatus.PUBLISHED)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === CourseStatus.PUBLISHED
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
            }`}
          >
            {"Đã xuất bản (PUBLISHED)"}
          </button>
          <button
            onClick={() => setActiveTab(CourseStatus.DRAFT)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === CourseStatus.DRAFT
                ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
            }`}
          >
            {"Bản nháp (DRAFT)"}
          </button>
          <button
            onClick={() => setActiveTab(CourseStatus.REJECTED)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === CourseStatus.REJECTED
                ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
            }`}
          >
            {"Từ chối (REJECTED)"}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span aria-live="polite">{"Đang tải danh sách khóa học…"}</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 text-sm">
              {"Không tìm thấy khóa học nào trong danh mục này."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                      {course.partnerName}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {course.weekModules.length} {"Tuần học"}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                  <p className="text-xs font-medium text-slate-400">
                    {"Giảng viên phụ trách:"}{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {course.instructorNames.join(", ")}
                    </strong>
                  </p>
                  {course.rejectionReason && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300">
                      <strong>{"Ghi chú từ chối trước đó:"}</strong> {course.rejectionReason}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                  <Link
                    href={`/courses/${course.id}`}
                    target="_blank"
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <span>{"Xem trước (Student Mode)"}</span>
                  </Link>

                  {activeTab === CourseStatus.PENDING_REVIEW && (
                    <>
                      <button
                        onClick={() => setRejectingCourseId(course.id)}
                        disabled={submitting}
                        className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {"Từ chối (Reject)"}
                      </button>

                      <button
                        onClick={() => handleApprove(course.id, course.title)}
                        disabled={submitting}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {"Phê duyệt & Phát hành"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {rejectingCourseId && (
        <Modal
          isOpen={!!rejectingCourseId}
          onClose={() => setRejectingCourseId(null)}
          title="Từ chối Phê duyệt Khóa học"
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">
              {
                "Vui lòng nhập chi tiết lý do từ chối hoặc các góp ý chỉnh sửa để Giảng viên hoàn thiện bài giảng."
              }
            </p>
            <div>
              <label className="block text-xs font-bold mb-1">
                {"Lý do từ chối / Feedback Log *"}
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder="Ví dụ: Bài giảng tuần 2 thiếu phụ đề VTT, bài kiểm tra graded quiz chưa được chọn ma trận…"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingCourseId(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold"
              >
                {"Hủy"}
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={submitting || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
              >
                <span aria-live="polite">{submitting ? "Đang xử lý…" : "Xác nhận Từ chối"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
