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
import { Dialog } from "@/components/ui/Dialog";

import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/components/providers/AuthProvider";
import { revalidateCoursesCache } from "@/app/actions/revalidate";
import { Eye } from "lucide-react";

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
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground border border-border text-xs font-semibold uppercase tracking-wider mb-2">
              {"Course Reviewer Portal"}
            </div>
            <h1 className="text-3xl font-extrabold text-foreground text-balance">
              {"Kiểm duyệt & Phê duyệt Phát hành Khóa học"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {
                "Màn hình đánh giá nội dung bài giảng, trải nghiệm chế độ Xem trước và đưa ra quyết định Phê duyệt (Approve) hoặc Từ chối (Reject)."
              }
            </p>
          </div>

          <Link
            href="/admin/dashboard"
            className="px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-semibold text-sm transition-colors"
          >
            {"Về Admin Dashboard"}
          </Link>
        </div>

        {/* Role Warning */}
        {isMounted && userRole && !isReviewer && (
          <div className="mb-6 p-4 rounded-2xl bg-warning/10 border border-warning/30 text-warning text-sm">
            <strong>{"Lưu ý Phân quyền:"}</strong>{" "}
            {
              "Bạn đang ở chế độ xem. Chỉ tài khoản Quản trị viên Tổ chức (Organization Admin) hoặc SUPER_ADMIN mới có quyền phê duyệt / từ chối phát hành khóa học."
            }
          </div>
        )}

        {/* Status Tabs */}
        <Tabs.Root
          value={activeTab}
          onValueChange={(val) => {
            if (val != null) {
              setActiveTab(Number(val) as CourseStatus);
            }
          }}
          className="mb-6"
        >
          <Tabs.List className="overflow-x-auto pb-1">
            <Tabs.Tab value={CourseStatus.PENDING_REVIEW}>
              {"Chờ kiểm duyệt (PENDING_REVIEW)"}
            </Tabs.Tab>
            <Tabs.Tab value={CourseStatus.PUBLISHED}>{"Đã xuất bản (PUBLISHED)"}</Tabs.Tab>
            <Tabs.Tab value={CourseStatus.DRAFT}>{"Bản nháp (DRAFT)"}</Tabs.Tab>
            <Tabs.Tab value={CourseStatus.REJECTED}>{"Từ chối (REJECTED)"}</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
            <span aria-live="polite">{"Đang tải danh sách khóa học…"}</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-border">
            <p className="text-muted-foreground text-sm">
              {"Không tìm thấy khóa học nào trong danh mục này."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-info/10 text-info border border-info/20">
                      {course.partnerName}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {course.weekModules.length} {"Tuần học"}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-xl text-foreground">{course.title}</h3>
                  <p className="text-xs text-muted-foreground min-w-0 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {"Giảng viên phụ trách:"}{" "}
                    <strong className="text-foreground">{course.instructorNames.join(", ")}</strong>
                  </p>
                  {course.rejectionReason && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                      <strong>{"Ghi chú từ chối trước đó:"}</strong> {course.rejectionReason}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                  <Link
                    href={`/courses/${course.id}`}
                    target="_blank"
                    className="px-3.5 py-2 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80 transition-colors flex items-center gap-1 border border-border"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    <span>{"Xem trước (Student Mode)"}</span>
                  </Link>

                  {activeTab === CourseStatus.PENDING_REVIEW && (
                    <>
                      <Button
                        size="sm"
                        variant="outlined"
                        className="bg-error/10 text-destructive border-destructive/30 hover:bg-destructive/20"
                        onClick={() => setRejectingCourseId(course.id)}
                        disabled={submitting}
                      >
                        {"Từ chối (Reject)"}
                      </Button>

                      <Button
                        size="sm"
                        variant="filled"
                        onClick={() => handleApprove(course.id, course.title)}
                        disabled={submitting}
                      >
                        {"Phê duyệt & Phát hành"}
                      </Button>
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
        <Dialog.Root
          open={!!rejectingCourseId}
          onOpenChange={(open) => {
            if (!open) setRejectingCourseId(null);
          }}
        >
          <Dialog.Content size="md">
            <Dialog.Header>
              <Dialog.Title>{"Từ chối Phê duyệt Khóa học"}</Dialog.Title>
            </Dialog.Header>
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                {
                  "Vui lòng nhập chi tiết lý do từ chối hoặc các góp ý chỉnh sửa để Giảng viên hoàn thiện bài giảng."
                }
              </p>
              <div>
                <label className="block text-xs font-bold mb-1 text-foreground">
                  {"Lý do từ chối / Feedback Log *"}
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  placeholder="Ví dụ: Bài giảng tuần 2 thiếu phụ đề VTT, bài kiểm tra graded quiz chưa được chọn ma trận…"
                />
              </div>
            </div>
            <Dialog.Footer className="mt-4">
              <Button
                type="button"
                variant="outlined"
                size="sm"
                onClick={() => setRejectingCourseId(null)}
              >
                {"Hủy"}
              </Button>
              <Button
                type="button"
                variant="filled"
                className="bg-error text-on-error hover:bg-destructive-hover active:bg-destructive-active"
                size="sm"
                onClick={handleConfirmReject}
                disabled={submitting || !rejectionReason.trim()}
              >
                <span aria-live="polite">{submitting ? "Đang xử lý…" : "Xác nhận Từ chối"}</span>
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </div>
  );
}
