"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  CheckCircle2,
  Megaphone,
  Clock,
  Pin,
  ThumbsUp,
  Search,
  GraduationCap,
  ClipboardCheck,
  AlertTriangle,
  Send,
  Sparkles,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { getRpcClient } from "@/lib/connect_client";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";
import { ForumService, type ForumThread } from "@/gen/forum/v1/forum_pb";
import { ThreadDetailModal } from "@/components/forum/ThreadDetailModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface InstructorCourseDiscussionsClientProps {
  courseId: string;
}

type DiscussionTriageFilter = "all" | "unanswered" | "answered" | "announcements" | "pinned";

export function InstructorCourseDiscussionsClient({
  courseId,
}: InstructorCourseDiscussionsClientProps) {
  const { userId, userName, userRole } = useAuth();
  const toast = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [triageFilter, setTriageFilter] = useState<DiscussionTriageFilter>("unanswered");

  // Thread detail modal state
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Quick reply input per thread (inline response)
  const [quickReplies, setQuickReplies] = useState<Record<string, string>>({});
  const [sendingReplyIds, setSendingReplyIds] = useState<Set<string>>(new Set());

  // Load course details & threads list
  const loadData = useCallback(async () => {
    try {
      const catalogClient = getRpcClient(CatalogService);
      const forumClient = getRpcClient(ForumService);

      const [courseRes, threadsRes] = await Promise.all([
        catalogClient.getCourseDetail({ idOrSlug: courseId }).catch(() => null),
        forumClient.listThreads({ courseId }).catch(() => ({ threads: [] })),
      ]);

      if (courseRes?.course) {
        setCourse(courseRes.course);
      }
      setThreads(threadsRes.threads || []);
    } catch (err: unknown) {
      console.error("Failed to load course discussions:", err);
      toast.error("Không thể tải danh sách thảo luận của khóa học.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    toast.success("Đã làm mới danh sách hỏi đáp!");
  };

  // Helper check xem thread đã có phản hồi chính thức của GV chưa
  const hasStaffAnswer = (thread: ForumThread) => {
    return thread.replies.some((r) => r.isStaffAnswer);
  };

  // Check xem thread có phải thông báo hoặc do Giảng viên / BQT đăng không
  const isAnnouncementOrStaffThread = useCallback(
    (thread: ForumThread) => {
      const titleLower = thread.title.trim().toLowerCase();
      if (
        titleLower.startsWith("[thông báo]") ||
        titleLower.startsWith("[thong bao]") ||
        titleLower.startsWith("[announcement]")
      ) {
        return true;
      }

      const r = (thread.authorRole || "").toUpperCase();
      if (
        r.includes("INSTRUCTOR") ||
        r.includes("GIẢNG VIÊN") ||
        r.includes("GIANG VIEN") ||
        r === "2" ||
        r.includes("TA") ||
        r.includes("TEACHING ASSISTANT") ||
        r.includes("TRỢ GIẢNG") ||
        r === "3" ||
        r.includes("ADMIN")
      ) {
        return true;
      }

      if (course && thread.authorUserId) {
        if (course.ownerId && thread.authorUserId === course.ownerId) return true;
        if (course.coInstructorIds && course.coInstructorIds.includes(thread.authorUserId))
          return true;
      }

      return false;
    },
    [course],
  );

  // Check quyền sở hữu/giảng dạy của Giảng viên đối với khóa học này
  const isCourseStaff = useMemo(() => {
    if (!course) return false;
    if (userRole === "USER_ROLE_ADMIN" || userRole === "3") return true;
    const isOwner = Boolean(userId && course.ownerId === userId);
    const isCoInstructor = Boolean(
      userId && course.coInstructorIds && course.coInstructorIds.includes(userId),
    );
    return isOwner || isCoInstructor;
  }, [course, userId, userRole]);

  // KPI counts: Tách bạch rõ câu hỏi học viên vs thông báo giảng viên
  const kpis = useMemo(() => {
    const total = threads.length;
    const unanswered = threads.filter(
      (t) => !isAnnouncementOrStaffThread(t) && !hasStaffAnswer(t),
    ).length;
    const answered = threads.filter(
      (t) => !isAnnouncementOrStaffThread(t) && hasStaffAnswer(t),
    ).length;
    const announcements = threads.filter((t) => isAnnouncementOrStaffThread(t)).length;
    const pinned = threads.filter(
      (t) => t.isStaffPinned || t.replies.some((r) => r.isStaffAnswer),
    ).length;

    return { total, unanswered, answered, announcements, pinned };
  }, [threads, isAnnouncementOrStaffThread]);

  // Danh sách threads sau lọc
  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      const isAnnouncement = isAnnouncementOrStaffThread(thread);

      // 1. Triage filter
      if (triageFilter === "unanswered") {
        if (isAnnouncement || hasStaffAnswer(thread)) return false;
      }
      if (triageFilter === "answered") {
        if (isAnnouncement || !hasStaffAnswer(thread)) return false;
      }
      if (triageFilter === "announcements") {
        if (!isAnnouncement) return false;
      }
      if (triageFilter === "pinned") {
        if (!thread.isStaffPinned && !thread.replies.some((r) => r.isStaffAnswer)) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = thread.title.toLowerCase().includes(q);
        const matchContent = thread.content.toLowerCase().includes(q);
        const matchAuthor = thread.authorName.toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchAuthor) return false;
      }

      return true;
    });
  }, [threads, triageFilter, searchQuery, isAnnouncementOrStaffThread]);

  // Selected thread object for modal
  const activeModalThread = useMemo(() => {
    if (!selectedThreadId) return null;
    return threads.find((t) => t.id === selectedThreadId) || null;
  }, [threads, selectedThreadId]);

  // Gửi câu trả lời nhanh từ Giảng viên
  const handleSendQuickReply = async (threadId: string) => {
    const content = quickReplies[threadId]?.trim();
    if (!content) {
      toast.error("Vui lòng nhập nội dung câu trả lời.");
      return;
    }

    setSendingReplyIds((prev) => new Set(prev).add(threadId));
    try {
      const client = getRpcClient(ForumService);
      const res = await client.postReply({
        threadId,
        content,
      });

      if (res.reply) {
        // Cập nhật local state với phản hồi mới
        setThreads((prev) =>
          prev.map((t) => {
            if (t.id === threadId) {
              return {
                ...t,
                replies: [...t.replies, res.reply!],
              };
            }
            return t;
          }),
        );
        // Clear input
        setQuickReplies((prev) => ({ ...prev, [threadId]: "" }));
        toast.success("Đã đăng phản hồi của Giảng viên thành công!");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể gửi phản hồi lúc này.");
    } finally {
      setSendingReplyIds((prev) => {
        const next = new Set(prev);
        next.delete(threadId);
        return next;
      });
    }
  };

  // Ghim câu trả lời của Giảng viên
  const handlePinAnswer = async (replyId: string) => {
    try {
      const client = getRpcClient(ForumService);
      await client.pinStaffAnswer({ replyId });
      toast.success("Đã ghim câu trả lời lên đầu chủ đề thảo luận!");
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Không thể ghim câu trả lời.");
    }
  };

  const handleTogglePinThread = async (thread: ForumThread) => {
    try {
      const client = getRpcClient(ForumService);
      await client.pinThread({
        threadId: thread.id,
        isPinned: !thread.isStaffPinned,
      });
      toast.success(
        thread.isStaffPinned
          ? "Đã bỏ ghim bài viết khỏi đầu chủ đề!"
          : "Đã ghim bài viết lên đầu chủ đề!",
      );
      await loadData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Không thể thay đổi trạng thái ghim bài viết.",
      );
    }
  };

  // Vote upvote
  const handleVote = async (postId: string, isUpvote: boolean) => {
    try {
      const client = getRpcClient(ForumService);
      await client.votePost({ postId, isUpvote });
      await loadData();
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">
            Đang tải bàn làm việc hỏi đáp...
          </p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
            <AlertTriangle aria-hidden="true" className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-foreground tracking-tight">
              Khóa học không tồn tại
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Không thể tìm thấy thông tin khóa học hoặc khóa học đã bị xóa.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/instructor/courses"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm transition-colors shadow-xs"
            >
              <span>Về danh sách Khóa học</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isCourseStaff) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-warning/10 text-warning flex items-center justify-center mx-auto border border-warning/20">
            <AlertTriangle aria-hidden="true" className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-foreground tracking-tight">
              Không có quyền quản lý khóa học này
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bàn làm việc Q&amp;A chỉ dành riêng cho Giảng viên phụ trách hoặc Trợ giảng được phân
              công của khóa học{" "}
              <span className="font-semibold text-foreground">{course.title}</span>.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Nếu bạn đang theo học khóa học này, bạn có thể tham gia thảo luận và trao đổi thắc mắc
              tại Diễn đàn học tập chung.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href={`/forum?courseId=${course.id}`}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-sm transition-colors shadow-xs"
            >
              <MessageSquare aria-hidden="true" className="w-4 h-4" />
              <span>Chuyển sang Diễn đàn học tập</span>
            </Link>
            <Link
              href="/instructor/courses"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm transition-colors"
            >
              <span>Về danh sách Khóa học của tôi</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumbs & Course Header Bar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Link
              href="/instructor/courses"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <span>Quản lý Khóa học</span>
            </Link>
            <span>/</span>
            <Link
              href={`/instructor/courses/${courseId}`}
              className="hover:text-primary transition-colors truncate max-w-[200px]"
            >
              {course?.title || "Khóa học"}
            </Link>
            <span>/</span>
            <span className="font-bold text-foreground">Hỏi đáp & Thảo luận</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-surface border border-outline-variant/60 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="primary" className="text-[11px] font-bold">
                  {course?.partnerName || "Coursera AI"}
                </Badge>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  Bàn làm việc Q&A Giảng viên
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Hỏi Đáp & Thảo Luận: {course?.title || "Khóa học"}
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Theo dõi thắc mắc của sinh viên, ưu tiên giải đáp các bài tập khó và ghim các câu
                trả lời mẫu mực.
              </p>
            </div>

            {/* Quick Action Links */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button
                type="button"
                variant="outlined"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-1.5 text-xs font-bold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                <span>{refreshing ? "Đang tải..." : "Làm mới"}</span>
              </Button>

              <Link
                href={`/instructor/courses/${courseId}/grading`}
                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-muted text-foreground border border-outline-variant text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-primary" />
                <span>Chấm bài</span>
              </Link>

              <Link
                href={`/instructor/courses/${courseId}/gradebook`}
                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-muted text-foreground border border-outline-variant text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
                <span>Sổ điểm</span>
              </Link>

              <Link
                href="/instructor/dashboard"
                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Bảng điều khiển</span>
              </Link>
            </div>
          </div>
        </div>

        {/* KPI Summary Ribbon (5 Cards: Tổng, Chưa trả lời, Đã trả lời, Thông báo GV, Đã ghim) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <button
            type="button"
            onClick={() => setTriageFilter("all")}
            className={`p-4 rounded-2xl border shadow-xs space-y-1 transition-all cursor-pointer text-left ${
              triageFilter === "all"
                ? "bg-muted/80 border-foreground/40 ring-2 ring-foreground/20"
                : "bg-surface border-outline-variant/60 hover:border-foreground/30"
            }`}
          >
            <span className="text-xs text-muted-foreground font-medium block">
              Tổng số thảo luận
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-foreground">{kpis.total}</span>
              <span className="text-[11px] text-muted-foreground">chủ đề</span>
            </div>
          </button>

          <button
            type="button"
            className={`p-4 rounded-2xl border shadow-xs space-y-1 transition-all cursor-pointer text-left ${
              triageFilter === "unanswered"
                ? "bg-warning/15 border-warning ring-2 ring-warning/30"
                : "bg-surface border-outline-variant/60 hover:border-warning/50"
            }`}
            onClick={() => setTriageFilter("unanswered")}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-warning block">Cần Giảng viên giải đáp</span>
              {kpis.unanswered > 0 && (
                <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-warning">{kpis.unanswered}</span>
              <span className="text-[11px] text-muted-foreground">học viên hỏi</span>
            </div>
          </button>

          <button
            type="button"
            className={`p-4 rounded-2xl border shadow-xs space-y-1 transition-all cursor-pointer text-left ${
              triageFilter === "answered"
                ? "bg-success/15 border-success ring-2 ring-success/30"
                : "bg-surface border-outline-variant/60 hover:border-success/50"
            }`}
            onClick={() => setTriageFilter("answered")}
          >
            <span className="text-xs font-bold text-success block">Đã có lời giải đáp</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-success">{kpis.answered}</span>
              <span className="text-[11px] text-muted-foreground">đã phản hồi</span>
            </div>
          </button>

          <button
            type="button"
            className={`p-4 rounded-2xl border shadow-xs space-y-1 transition-all cursor-pointer text-left ${
              triageFilter === "announcements"
                ? "bg-primary/15 border-primary ring-2 ring-primary/30"
                : "bg-surface border-outline-variant/60 hover:border-primary/50"
            }`}
            onClick={() => setTriageFilter("announcements")}
          >
            <div className="flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-primary block">Thông báo Giảng viên</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-primary">
                {kpis.announcements}
              </span>
              <span className="text-[11px] text-muted-foreground">thông báo</span>
            </div>
          </button>

          <button
            type="button"
            className={`p-4 rounded-2xl border shadow-xs space-y-1 transition-all cursor-pointer text-left ${
              triageFilter === "pinned"
                ? "bg-warning/20 border-warning ring-2 ring-warning/30"
                : "bg-surface border-outline-variant/60 hover:border-warning/50"
            }`}
            onClick={() => setTriageFilter("pinned")}
          >
            <span className="text-xs font-bold text-foreground block">Đã ghim lên đầu</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-foreground">{kpis.pinned}</span>
              <span className="text-[11px] text-muted-foreground">đã ghim</span>
            </div>
          </button>
        </div>

        {/* Triage Toolbar: Filter Tabs & Search */}
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-outline-variant/40 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setTriageFilter("unanswered")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                triageFilter === "unanswered"
                  ? "bg-warning text-warning-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cần giải đáp gấp ({kpis.unanswered})</span>
            </button>

            <button
              type="button"
              onClick={() => setTriageFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                triageFilter === "all"
                  ? "bg-surface text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Tất cả ({kpis.total})</span>
            </button>

            <button
              type="button"
              onClick={() => setTriageFilter("answered")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                triageFilter === "answered"
                  ? "bg-surface text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Đã giải đáp ({kpis.answered})</span>
            </button>

            <button
              type="button"
              onClick={() => setTriageFilter("announcements")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                triageFilter === "announcements"
                  ? "bg-surface text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 text-primary" />
              <span>Thông báo GV ({kpis.announcements})</span>
            </button>

            <button
              type="button"
              onClick={() => setTriageFilter("pinned")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                triageFilter === "pinned"
                  ? "bg-surface text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Pin className="w-3.5 h-3.5 text-primary" />
              <span>Đã ghim ({kpis.pinned})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm câu hỏi, học viên..."
              className="pl-8 text-xs py-1.5"
            />
          </div>
        </div>

        {/* Danh sách các chủ đề thảo luận */}
        <div className="space-y-4">
          {filteredThreads.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-surface border border-outline-variant/60 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Không tìm thấy câu hỏi thảo luận nào
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {triageFilter === "unanswered"
                  ? "Tuyệt vời! Hiện tại không có câu hỏi nào của sinh viên đang chờ Giảng viên giải đáp."
                  : "Không có chủ đề thảo luận phù hợp với bộ lọc hiện tại."}
              </p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isAnnouncement = isAnnouncementOrStaffThread(thread);
              const isAnswered = hasStaffAnswer(thread);
              const sending = sendingReplyIds.has(thread.id);
              const staffReplies = thread.replies.filter((r) => r.isStaffAnswer);

              return (
                <div
                  key={thread.id}
                  className={`p-5 rounded-3xl bg-surface border transition-all space-y-4 ${
                    isAnnouncement
                      ? "border-primary/40 hover:border-primary shadow-xs"
                      : !isAnswered
                        ? "border-warning/50 hover:border-warning shadow-xs"
                        : "border-outline-variant/60 hover:border-primary/40 shadow-xs"
                  }`}
                >
                  {/* Top Bar: Author, Badges, Time */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center font-mono">
                        {thread.authorName ? thread.authorName.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          {thread.authorName || "Học viên"}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {thread.createdAt || "Gần đây"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant={thread.isStaffPinned ? "filled" : "outlined"}
                        size="sm"
                        onClick={() => handleTogglePinThread(thread)}
                        className="h-6 px-2 text-[10px] gap-1 font-bold rounded-full"
                        title={thread.isStaffPinned ? "Bỏ ghim bài viết" : "Ghim bài viết lên đầu"}
                      >
                        <Pin
                          className={`w-2.5 h-2.5 ${thread.isStaffPinned ? "fill-current" : ""}`}
                        />
                        <span>{thread.isStaffPinned ? "Đã ghim" : "Ghim"}</span>
                      </Button>

                      {isAnnouncement ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/20 flex items-center gap-1">
                          <Megaphone className="w-3 h-3 text-primary" />
                          <span>Thông báo Giảng viên</span>
                        </span>
                      ) : !isAnswered ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-warning/15 text-warning border border-warning/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-warning" />
                          <span>Chưa có câu trả lời GV</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-success" />
                          <span>Đã giải đáp ({staffReplies.length} phản hồi)</span>
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-muted text-muted-foreground">
                        {thread.replies.length} phản hồi
                      </span>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-foreground">{thread.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {thread.content}
                    </p>
                  </div>

                  {/* Hiển thị câu trả lời chính thức của Giảng viên (nếu có) */}
                  {staffReplies.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-primary">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Phản hồi chính thức từ Giảng viên / TA:</span>
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {staffReplies[0].authorName}
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {staffReplies[0].content}
                      </p>
                    </div>
                  )}

                  {/* Bottom Action Row: Quick Staff Reply Box & Full Detail Modal Link */}
                  <div className="pt-3 border-t border-outline-variant/40 space-y-3">
                    {/* Quick Staff Reply Bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <Input
                        value={quickReplies[thread.id] || ""}
                        onChange={(e) =>
                          setQuickReplies((prev) => ({
                            ...prev,
                            [thread.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendQuickReply(thread.id);
                          }
                        }}
                        placeholder={`Trả lời nhanh với tư cách Giảng viên (${userName || "Giảng viên"})...`}
                        className="text-xs flex-1"
                        disabled={sending}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={sending || !(quickReplies[thread.id] || "").trim()}
                        onClick={() => handleSendQuickReply(thread.id)}
                        className="text-xs font-bold gap-1 px-3 py-1.5 shrink-0"
                      >
                        <Send className="w-3 h-3" />
                        <span>{sending ? "Đang gửi..." : "Trả lời"}</span>
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => handleVote(thread.id, true)}
                          className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer text-xs"
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{thread.upvoteCount} lượt hữu ích</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedThreadId(thread.id)}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Xem chi tiết toàn bộ thảo luận ({thread.replies.length})</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal chi tiết thảo luận đầy đủ */}
      {selectedThreadId && (
        <ThreadDetailModal
          isOpen={!!selectedThreadId}
          onClose={() => setSelectedThreadId(null)}
          thread={activeModalThread}
          currentUserId={userId || ""}
          isStaffOrAdmin={isCourseStaff}
          onVote={handleVote}
          onPostReply={async (threadId, content) => {
            const client = getRpcClient(ForumService);
            const res = await client.postReply({ threadId, content });
            if (res.reply) {
              await loadData();
              toast.success("Đã đăng phản hồi thảo luận!");
            }
          }}
          onPinStaffAnswer={handlePinAnswer}
          onTogglePinThread={(threadId) => {
            const t = threads.find((x) => x.id === threadId);
            if (t) handleTogglePinThread(t);
          }}
        />
      )}
    </div>
  );
}
