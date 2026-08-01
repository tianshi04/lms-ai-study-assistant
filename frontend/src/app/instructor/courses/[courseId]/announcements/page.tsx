"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type CourseAnnouncement } from "@/gen/catalog/v1/catalog_pb";
import { useAuth } from "@/components/providers/AuthProvider";

export default function InstructorAnnouncementsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { isInstructorOrAdmin } = useAuth();
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;

  const [announcements, setAnnouncements] = useState<CourseAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.listCourseAnnouncements({ courseId });
        if (!ignore) {
          setAnnouncements(res.announcements);
        }
      } catch (err: unknown) {
        console.error("Failed to load announcements:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [courseId]);

  const refreshAnnouncements = async () => {
    try {
      const client = getRpcClient(CatalogService);
      const res = await client.listCourseAnnouncements({ courseId });
      setAnnouncements(res.announcements);
    } catch (err: unknown) {
      console.error("Failed to refresh announcements:", err);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const client = getRpcClient(CatalogService);
      const res = await client.createCourseAnnouncement({
        courseId,
        title,
        content,
      });

      if (res.announcement) {
        setTitle("");
        setContent("");
        setMessage({ type: "success", text: "Đã đăng thông báo khóa học thành công!" });
        await refreshAnnouncements();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng thông báo thất bại.";
      setMessage({ type: "error", text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/instructor/courses" className="hover:text-primary">
              Giảng viên
            </Link>
            <span>/</span>
            <Link href={`/instructor/courses/${courseId}`} className="hover:text-primary">
              Chi tiết khóa học
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Thông báo khóa học</span>
          </div>

          <Link
            href={`/instructor/courses/${courseId}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            Quay lại Biên soạn
          </Link>
        </div>

        {/* Page Header */}
        <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold uppercase mb-2">
              Course Announcements
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground text-balance">
              Thông báo Khóa học
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gửi thông tin cập nhật, nhắc nhở hạn nộp bài và các thông điệp quan trọng tới toàn bộ
              học viên.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-sm ${
              message.type === "success"
                ? "bg-success/10 text-success border border-success/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs font-bold underline">
              Đóng
            </button>
          </div>
        )}

        {/* Post Announcement Form */}
        {isInstructorOrAdmin && (
          <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tạo Thông báo Mới
            </h2>

            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Tiêu đề thông báo *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Cập nhật hạn nộp bài tập Tuần 2 & Lịch livestream hỏi đáp"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-muted text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Nội dung chi tiết *
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập chi tiết nội dung thông báo gửi tới học viên…"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-muted text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <span aria-live="polite">{submitting ? "Đang gửi…" : "Đăng Thông báo Ngay"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Announcements List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">
            Lịch sử Thông báo ({announcements.length})
          </h2>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span aria-live="polite">Đang tải danh sách thông báo…</span>
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-12 text-center bg-card rounded-3xl border border-border p-6 text-muted-foreground text-sm">
              Chưa có thông báo nào được đăng cho khóa học này.
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-extrabold text-base text-foreground">{ann.title}</h3>
                    <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">
                      {ann.createdAt
                        ? new Date(ann.createdAt).toLocaleDateString("vi-VN")
                        : "Gần đây"}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {ann.content}
                  </p>

                  <div className="pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                    <svg
                      className="w-4 h-4 text-primary"
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
                      Người đăng: <strong>{ann.authorName}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
