"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { create } from "@bufbuild/protobuf";
import { getRpcClient } from "@/lib/connect_client";
import {
  ForumService,
  ForumThreadSchema,
  ForumReplySchema,
  type ForumThread,
  type ForumReply,
} from "@/gen/forum/v1/forum_pb";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/providers/AuthProvider";

function formatRoleName(role: string): string {
  if (!role) return "Learner";
  const r = role.toUpperCase();
  if (r.includes("LEARNER") || r.includes("STUDENT") || r === "1") return "Learner";
  if (r.includes("INSTRUCTOR") || r === "2") return "Instructor";
  if (r.includes("TA") || r.includes("TEACHING ASSISTANT") || r === "3")
    return "Teaching Assistant";
  if (r.includes("SUPER_ADMIN") || r.includes("ORG_ADMIN") || r === "ADMIN") return "Admin";
  return role;
}

export default function ForumPage() {
  const locale = "vi";
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { userId: authUserId, isStaff: isStaffOrAdmin } = useAuth();
  const currentUserId = authUserId || "";

  // New Thread Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [submittingThread, setSubmittingThread] = useState(false);

  // Thread Edit State
  const [editingThread, setEditingThread] = useState<ForumThread | null>(null);
  const [editThreadTitle, setEditThreadTitle] = useState("");
  const [editThreadContent, setEditThreadContent] = useState("");
  const [submittingEditThread, setSubmittingEditThread] = useState(false);

  // Reply Form State: threadId -> content
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({});
  const [activeReplyBoxIds, setActiveReplyBoxIds] = useState<Record<string, boolean>>({});

  // Reply Edit State
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [submittingEditReply, setSubmittingEditReply] = useState(false);

  // Active Expanded Thread IDs
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

  // Fetch Courses Catalog
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const client = getRpcClient(CatalogService);
        const res = await client.listCourses({});
        setCourses(res.courses);
        if (res.courses.length > 0 && !newCourseId) {
          setNewCourseId(res.courses[0].id);
        }
      } catch (err) {
        console.error("Error fetching courses catalog for forum:", err);
      }
    }
    fetchCatalog();
  }, [newCourseId]);

  // Fetch Forum Threads
  const fetchThreadsRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const client = getRpcClient(ForumService);
        const res = await client.listThreads({
          courseId: selectedCourseId,
          itemId: "",
        });
        if (!cancelled) {
          setThreads(res.threads);
          const initialExpanded: Record<string, boolean> = {};
          res.threads.forEach((th) => {
            initialExpanded[th.id] = true;
          });
          setExpandedThreads((prev) => ({ ...initialExpanded, ...prev }));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Failed to load forum threads:", err);
          const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
          setError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchThreadsRef.current = doFetch;
    doFetch();

    return () => {
      cancelled = true;
    };
  }, [selectedCourseId]);

  const fetchThreads = useCallback(() => fetchThreadsRef.current(), []);

  // Handle Create Thread
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmittingThread(true);
    try {
      const client = getRpcClient(ForumService);

      await client.createThread({
        courseId: newCourseId || selectedCourseId || (courses[0]?.id ?? "course-python-ai"),
        itemId: "",
        title: newTitle,
        content: newContent,
      });

      setNewTitle("");
      setNewContent("");
      setShowCreateModal(false);
      toast.success(
        locale === "vi" ? "Đã đăng chủ đề thảo luận mới!" : "New discussion thread created!",
      );
      fetchThreads();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmittingThread(false);
    }
  };

  // Handle Edit Thread
  const openEditThreadModal = (thread: ForumThread) => {
    setEditingThread(thread);
    setEditThreadTitle(thread.title);
    setEditThreadContent(thread.content);
  };

  const handleUpdateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThread || !editThreadTitle.trim()) return;

    setSubmittingEditThread(true);
    try {
      const client = getRpcClient(ForumService);
      await client.updateThread({
        threadId: editingThread.id,
        title: editThreadTitle,
        content: editThreadContent,
      });
      setEditingThread(null);
      toast.success("Bài viết đã được cập nhật!");
      fetchThreads();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmittingEditThread(false);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;
    try {
      const client = getRpcClient(ForumService);
      await client.deleteThread({ threadId });
      toast.success("Bài viết đã được xóa!");
      fetchThreads();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  // Handle Post Reply
  const handlePostReply = async (threadId: string) => {
    const content = replyInputs[threadId] || "";
    if (!content.trim()) return;

    setSubmittingReply((prev) => ({ ...prev, [threadId]: true }));
    try {
      const client = getRpcClient(ForumService);

      await client.postReply({
        threadId,
        content,
      });

      setReplyInputs((prev) => ({ ...prev, [threadId]: "" }));
      setActiveReplyBoxIds((prev) => ({ ...prev, [threadId]: false }));
      toast.success(locale === "vi" ? "Đã gửi câu phản hồi!" : "Reply posted successfully!");
      fetchThreads();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmittingReply((prev) => ({ ...prev, [threadId]: false }));
    }
  };

  // Handle Edit Reply
  const startEditReply = (reply: ForumReply) => {
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.content);
  };

  const handleUpdateReply = async (replyId: string) => {
    if (!editReplyContent.trim()) return;
    setSubmittingEditReply(true);
    try {
      const client = getRpcClient(ForumService);
      await client.updateReply({
        replyId,
        content: editReplyContent,
      });
      setEditingReplyId(null);
      toast.success("Phản hồi đã được cập nhật!");
      fetchThreads();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmittingEditReply(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phản hồi này không?")) return;
    try {
      const client = getRpcClient(ForumService);
      await client.deleteReply({ replyId });
      toast.success("Phản hồi đã được xóa!");
      fetchThreads();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  // Handle Upvote with Optimistic UI Update
  const handleVote = async (postId: string, isUpvote: boolean) => {
    setThreads((prevThreads) =>
      prevThreads.map((th) => {
        if (th.id === postId) {
          const wasVoted = th.isUpvotedByMe;
          const newCount = wasVoted ? Math.max(0, th.upvoteCount - 1) : th.upvoteCount + 1;
          return create(ForumThreadSchema, {
            ...th,
            isUpvotedByMe: !wasVoted,
            upvoteCount: newCount,
          });
        }
        const updatedReplies = th.replies.map((r) => {
          if (r.id === postId) {
            const wasVoted = r.isUpvotedByMe;
            const newCount = wasVoted ? Math.max(0, r.upvoteCount - 1) : r.upvoteCount + 1;
            return create(ForumReplySchema, {
              ...r,
              isUpvotedByMe: !wasVoted,
              upvoteCount: newCount,
            });
          }
          return r;
        });
        return create(ForumThreadSchema, { ...th, replies: updatedReplies });
      }),
    );

    try {
      const client = getRpcClient(ForumService);
      const res = await client.votePost({ postId, isUpvote });

      setThreads((prevThreads) =>
        prevThreads.map((th) => {
          if (th.id === postId) {
            return create(ForumThreadSchema, { ...th, upvoteCount: res.updatedUpvoteCount });
          }
          const updatedReplies = th.replies.map((r) => {
            if (r.id === postId) {
              return create(ForumReplySchema, { ...r, upvoteCount: res.updatedUpvoteCount });
            }
            return r;
          });
          return create(ForumThreadSchema, { ...th, replies: updatedReplies });
        }),
      );
    } catch (err) {
      console.error("Failed to vote post:", err);
      fetchThreads();
    }
  };

  const handlePinStaffAnswer = async (replyId: string) => {
    try {
      const client = getRpcClient(ForumService);
      await client.pinStaffAnswer({ replyId });
      fetchThreads();
    } catch (err) {
      console.error("Failed to pin staff answer:", err);
    }
  };

  const toggleThreadExpand = (threadId: string) => {
    setExpandedThreads((prev) => ({ ...prev, [threadId]: !prev[threadId] }));
  };

  return (
    <>
      <main className="max-w-6xl mx-auto px-6 py-10 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-border pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                />
              </svg>
              Coursera Learning Forum
            </div>
            <h1 className="text-3xl font-extrabold text-foreground text-balance">
              {"Diễn đàn Thảo luận Cộng đồng"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {"Nơi trao đổi thắc mắc, chia sẻ kinh nghiệm học tập cùng Giảng viên và Học viên."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm transition-all shadow-md shadow-primary/20 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {"Tạo chủ đề thảo luận mới"}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              {"Khóa học"}:
            </span>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-muted border border-input text-foreground rounded-xl text-sm px-3.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full md:w-80 cursor-pointer"
            >
              <option value="">-- All Courses --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-muted-foreground">
            Total <span className="font-bold text-foreground">{threads.length}</span> threads
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-muted rounded w-2/3 mb-4" />
                <div className="h-4 bg-muted rounded w-1/3 mb-4" />
                <div className="h-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl text-center">
            <p className="font-semibold">{error}</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border p-8">
            <svg
              className="w-12 h-12 text-muted-foreground mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-muted-foreground font-medium">
              {"Chưa có chủ đề thảo luận nào. Hãy là người đầu tiên đặt câu hỏi!"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {threads.map((thread) => {
              const isExpanded = expandedThreads[thread.id] ?? true;
              const isThreadAuthor = Boolean(
                currentUserId && thread.authorUserId === currentUserId,
              );
              const canDeleteThread = isThreadAuthor || isStaffOrAdmin;

              return (
                <div
                  key={thread.id}
                  className="bg-card border border-border hover:border-accent-hover rounded-2xl p-6 transition-all shadow-sm"
                >
                  {/* Thread Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {thread.isStaffPinned && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20 shadow-xs">
                            <svg
                              className="w-3.5 h-3.5 text-warning shrink-0"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
                            </svg>
                            <span>Staff Pinned</span>
                          </span>
                        )}
                        <span className="text-xs font-medium text-muted-foreground">
                          By{" "}
                          <strong className="text-foreground">
                            {thread.authorName || "Thành viên LMS"}
                          </strong>{" "}
                          ({formatRoleName(thread.authorRole)})
                        </span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(thread.createdAt).toLocaleString(
                            locale === "vi" ? "vi-VN" : "en-US",
                          )}
                        </span>
                        {thread.isEdited && (
                          <span className="text-xs text-warning font-medium italic">
                            {"(Đã chỉnh sửa)"}
                          </span>
                        )}

                        {(isThreadAuthor || canDeleteThread) && (
                          <div className="ml-auto flex items-center gap-2">
                            {isThreadAuthor && (
                              <button
                                onClick={() => openEditThreadModal(thread)}
                                className="text-xs font-semibold text-muted-foreground hover:text-primary cursor-pointer"
                              >
                                {"Sửa"}
                              </button>
                            )}
                            {canDeleteThread && (
                              <button
                                onClick={() => handleDeleteThread(thread.id)}
                                className="text-xs font-semibold text-muted-foreground hover:text-destructive cursor-pointer"
                              >
                                {"Xóa"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <h2 className="text-xl font-bold text-foreground leading-snug">
                        {thread.title}
                      </h2>
                    </div>

                    {/* Upvote Button */}
                    <button
                      onClick={() => handleVote(thread.id, true)}
                      className={`group flex flex-col items-center justify-center px-3.5 py-2.5 rounded-xl border transition-all duration-200 min-w-[54px] select-none cursor-pointer ${
                        thread.isUpvotedByMe
                          ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 ring-2 ring-ring"
                          : "bg-muted border-border text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5 ${
                          thread.isUpvotedByMe
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-primary"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 15.75l7.5-7.5 7.5 7.5"
                        />
                      </svg>
                      <span className="text-xs font-extrabold mt-1 tracking-tight">
                        {thread.upvoteCount}
                      </span>
                    </button>
                  </div>

                  {/* Toggle Replies View */}
                  <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                    <button
                      onClick={() => toggleThreadExpand(thread.id)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>
                        {isExpanded
                          ? "Hide replies"
                          : `Show (${thread.replies.length}) ${"phản hồi"}`}
                      </span>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Replies List */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-l-2 border-border pl-4 md:pl-6 pt-2">
                      {thread.replies.map((reply) => {
                        const isReplyAuthor = Boolean(
                          currentUserId && reply.authorUserId === currentUserId,
                        );
                        const canDeleteReply = isReplyAuthor || isStaffOrAdmin;
                        const isEditingThisReply = editingReplyId === reply.id;

                        return (
                          <div
                            key={reply.id}
                            className={`p-4 rounded-xl text-sm transition-all ${
                              reply.isStaffAnswer
                                ? "bg-warning/10 border border-warning/20"
                                : "bg-muted/50 border border-border"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">
                                  {reply.authorName || "Thành viên LMS"}
                                </span>
                                {reply.isStaffAnswer && (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-warning bg-warning/10 px-3 py-1 rounded-full border border-warning/30 shadow-xs">
                                    Official Staff Answer
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  ({formatRoleName(reply.authorRole)})
                                </span>
                                {reply.isEdited && (
                                  <span className="text-xs text-warning font-medium italic">
                                    {"(Đã chỉnh sửa)"}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {isReplyAuthor && (
                                  <button
                                    onClick={() => startEditReply(reply)}
                                    className="text-xs font-semibold text-muted-foreground hover:text-primary cursor-pointer"
                                  >
                                    {"Sửa"}
                                  </button>
                                )}
                                {canDeleteReply && (
                                  <button
                                    onClick={() => handleDeleteReply(reply.id)}
                                    className="text-xs font-semibold text-muted-foreground hover:text-destructive cursor-pointer"
                                  >
                                    {"Xóa"}
                                  </button>
                                )}

                                {isStaffOrAdmin && !reply.isStaffAnswer && (
                                  <button
                                    onClick={() => handlePinStaffAnswer(reply.id)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-warning bg-warning/10 hover:bg-warning/20 border border-warning/30 px-3 py-1 rounded-full transition-all cursor-pointer"
                                  >
                                    Pin Answer
                                  </button>
                                )}

                                <button
                                  onClick={() => handleVote(reply.id, true)}
                                  className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 select-none cursor-pointer ${
                                    reply.isUpvotedByMe
                                      ? "bg-primary border-primary text-primary-foreground shadow-md"
                                      : "bg-card border-border text-foreground hover:border-primary hover:text-primary hover:bg-primary/10"
                                  }`}
                                >
                                  <svg
                                    className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 ${
                                      reply.isUpvotedByMe
                                        ? "text-primary-foreground"
                                        : "text-primary"
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M4.5 15.75l7.5-7.5 7.5 7.5"
                                    />
                                  </svg>
                                  <span className="font-bold">{reply.upvoteCount}</span>
                                </button>
                              </div>
                            </div>

                            {isEditingThisReply ? (
                              <div className="mt-2 space-y-2">
                                <textarea
                                  value={editReplyContent}
                                  onChange={(e) => setEditReplyContent(e.target.value)}
                                  rows={3}
                                  className="w-full bg-card border border-input rounded-xl p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingReplyId(null)}
                                    className="px-3 py-1.5 border border-input text-muted-foreground hover:bg-muted rounded-lg text-xs font-medium cursor-pointer"
                                  >
                                    {"Hủy"}
                                  </button>
                                  <button
                                    onClick={() => handleUpdateReply(reply.id)}
                                    disabled={submittingEditReply || !editReplyContent.trim()}
                                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                                  >
                                    <span aria-live="polite">
                                      {submittingEditReply ? "…" : "Lưu thay đổi"}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-foreground leading-relaxed whitespace-pre-line">
                                {reply.content}
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {/* Reply Input Form */}
                      <div className="pt-2">
                        {!activeReplyBoxIds[thread.id] && !(replyInputs[thread.id] || "").trim() ? (
                          <button
                            onClick={() =>
                              setActiveReplyBoxIds((prev) => ({ ...prev, [thread.id]: true }))
                            }
                            className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 border border-input rounded-xl text-xs font-medium text-muted-foreground transition-all cursor-pointer text-left group"
                          >
                            <svg
                              className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                              />
                            </svg>
                            <span>{"Nội dung thắc mắc hoặc thảo luận chi tiết…"}</span>
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              autoFocus
                              value={replyInputs[thread.id] || ""}
                              onChange={(e) =>
                                setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))
                              }
                              placeholder={"Nội dung thắc mắc hoặc thảo luận chi tiết…"}
                              rows={3}
                              className="w-full bg-card border border-input rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setActiveReplyBoxIds((prev) => ({ ...prev, [thread.id]: false }));
                                  setReplyInputs((prev) => ({ ...prev, [thread.id]: "" }));
                                }}
                                className="px-3 py-1.5 border border-input text-muted-foreground hover:bg-muted rounded-lg text-xs font-medium cursor-pointer"
                              >
                                {"Hủy"}
                              </button>
                              <button
                                onClick={() => handlePostReply(thread.id)}
                                disabled={
                                  submittingReply[thread.id] ||
                                  !(replyInputs[thread.id] || "").trim()
                                }
                                className="px-4 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
                              >
                                <span aria-live="polite">
                                  {submittingReply[thread.id] ? "Đang gửi…" : "Đăng bài"}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Create New Thread */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={"Tạo chủ đề thảo luận mới"}
        size="lg"
      >
        <form onSubmit={handleCreateThread} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {"Khóa học"}
            </label>
            <select
              value={newCourseId}
              onChange={(e) => setNewCourseId(e.target.value)}
              className="w-full bg-muted border border-input text-foreground rounded-xl text-sm p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={"Tiêu đề chủ đề…"}
              className="w-full bg-muted border border-input text-foreground rounded-xl text-sm p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Content
            </label>
            <textarea
              rows={4}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={"Nội dung thắc mắc hoặc thảo luận chi tiết…"}
              className="w-full bg-muted border border-input text-foreground rounded-xl text-sm p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 border border-input text-foreground hover:bg-muted rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              {"Hủy"}
            </button>
            <button
              type="submit"
              disabled={submittingThread || !newTitle.trim()}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-xl text-xs font-semibold transition-all shadow-md shadow-primary/20 cursor-pointer"
            >
              <span aria-live="polite">{submittingThread ? "…" : "Đăng bài"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Thread */}
      <Modal
        isOpen={Boolean(editingThread)}
        onClose={() => setEditingThread(null)}
        title={"Chỉnh sửa bài viết"}
        size="lg"
      >
        <form onSubmit={handleUpdateThread} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={editThreadTitle}
              onChange={(e) => setEditThreadTitle(e.target.value)}
              className="w-full bg-muted border border-input text-foreground rounded-xl text-sm p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Content
            </label>
            <textarea
              rows={4}
              value={editThreadContent}
              onChange={(e) => setEditThreadContent(e.target.value)}
              className="w-full bg-muted border border-input text-foreground rounded-xl text-sm p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setEditingThread(null)}
              className="px-4 py-2.5 border border-input text-foreground hover:bg-muted rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              {"Hủy"}
            </button>
            <button
              type="submit"
              disabled={submittingEditThread || !editThreadTitle.trim()}
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-xl text-xs font-semibold transition-all shadow-md shadow-primary/20 cursor-pointer"
            >
              <span aria-live="polite">{submittingEditThread ? "…" : "Lưu thay đổi"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
