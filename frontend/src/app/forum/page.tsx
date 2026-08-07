"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Plus, Pin, ChevronUp, ChevronDown, Reply } from "lucide-react";
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
import { ConfirmAlertDialog } from "@/components/ui/AlertDialog";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ThreadDetailModal } from "@/components/forum/ThreadDetailModal";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";

function formatRoleName(role: string): string {
  if (!role) return "Học viên";
  const r = role.toUpperCase();
  if (r.includes("LEARNER") || r.includes("STUDENT") || r === "1") return "Học viên";
  if (r.includes("INSTRUCTOR") || r === "2") return "Giảng viên";
  if (r.includes("ADMIN") || r === "3") return "Quản trị viên";
  return role;
}

function ForumPageContent() {
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

  // Delete confirmations state
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [isDeletingReply, setIsDeletingReply] = useState(false);

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

  const searchParams = useSearchParams();
  const urlCourseId = searchParams?.get("courseId") || "";
  const urlThreadId = searchParams?.get("threadId") || "";

  const [selectedModalThreadId, setSelectedModalThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (urlCourseId && !selectedCourseId) {
      setSelectedCourseId(urlCourseId);
    }
  }, [urlCourseId, selectedCourseId]);

  useEffect(() => {
    if (urlThreadId && !loading && threads.length > 0) {
      setSelectedModalThreadId(urlThreadId);
      setExpandedThreads((prev) => ({ ...prev, [urlThreadId]: true }));
      const timer = setTimeout(() => {
        const el = document.getElementById(`thread-${urlThreadId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [urlThreadId, loading, threads]);

  const fetchThreads = useCallback(() => fetchThreadsRef.current(), []);

  // Handle Create Thread
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmittingThread(true);
    try {
      const client = getRpcClient(ForumService);
      const targetCourseId =
        newCourseId || selectedCourseId || (courses[0]?.id ?? "course-web-dev");

      await client.createThread({
        courseId: targetCourseId,
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
      if (selectedCourseId && selectedCourseId !== targetCourseId) {
        setSelectedCourseId("");
      } else {
        fetchThreads();
      }
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

  const handleDeleteThread = (threadId: string) => {
    setDeletingThreadId(threadId);
  };

  const executeDeleteThread = async () => {
    if (!deletingThreadId) return;
    setIsDeletingThread(true);
    try {
      const client = getRpcClient(ForumService);
      await client.deleteThread({ threadId: deletingThreadId });
      toast.success("Bài viết đã được xóa!");
      fetchThreads();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsDeletingThread(false);
      setDeletingThreadId(null);
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

  const handleDeleteReply = (replyId: string) => {
    setDeletingReplyId(replyId);
  };

  const executeDeleteReply = async () => {
    if (!deletingReplyId) return;
    setIsDeletingReply(true);
    try {
      const client = getRpcClient(ForumService);
      await client.deleteReply({ replyId: deletingReplyId });
      toast.success("Phản hồi đã được xóa!");
      fetchThreads();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsDeletingReply(false);
      setDeletingReplyId(null);
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
              <MessageSquare aria-hidden="true" className="w-3.5 h-3.5" />
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
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-primary/20 gap-2"
            >
              <Plus aria-hidden="true" className="w-4 h-4" />
              {"Tạo chủ đề thảo luận mới"}
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              {"Khóa học"}:
            </span>
            <Select
              value={selectedCourseId}
              onValueChange={(val) => {
                setSelectedCourseId((val as string) || "");
              }}
            >
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder="-- All Courses --">
                  {selectedCourseId
                    ? courses.find((c) => c.id === selectedCourseId)?.title || "-- All Courses --"
                    : "-- All Courses --"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{"-- All Courses --"}</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            Total <span className="font-bold text-foreground">{threads.length}</span> threads
          </div>
        </Card>

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
            <MessageSquare
              aria-hidden="true"
              className="w-12 h-12 text-muted-foreground mx-auto mb-3"
            />
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
              const isTargetThread = urlThreadId === thread.id;

              return (
                <Card
                  key={thread.id}
                  id={`thread-${thread.id}`}
                  className={`rounded-2xl p-6 transition-colors shadow-sm ${
                    isTargetThread
                      ? "border-primary ring-2 ring-primary/50 shadow-lg bg-primary/5"
                      : "hover:border-accent-hover"
                  }`}
                >
                  {/* Thread Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {isTargetThread && (
                          <Badge variant="verified" className="gap-1 px-3 py-1 shadow-xs font-bold">
                            <span>📌 Bài viết từ thông báo</span>
                          </Badge>
                        )}
                        {thread.isStaffPinned && (
                          <Badge variant="warning" className="gap-1.5 px-3 py-1 shadow-xs">
                            <Pin aria-hidden="true" className="w-3.5 h-3.5 text-warning shrink-0" />
                            <span>Staff Pinned</span>
                          </Badge>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditThreadModal(thread)}
                                className="text-xs text-muted-foreground hover:text-primary h-auto p-1"
                              >
                                {"Sửa"}
                              </Button>
                            )}
                            {canDeleteThread && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteThread(thread.id)}
                                className="text-xs text-muted-foreground hover:text-destructive h-auto p-1"
                              >
                                {"Xóa"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <h2
                        onClick={() => setSelectedModalThreadId(thread.id)}
                        className="text-xl font-bold text-foreground leading-snug hover:text-primary transition-colors cursor-pointer"
                        title="Bấm để mở rộng xem thảo luận riêng"
                      >
                        {thread.title}
                      </h2>
                    </div>

                    {/* Upvote Button */}
                    <Button
                      variant={thread.isUpvotedByMe ? "primary" : "outline"}
                      onClick={() => handleVote(thread.id, true)}
                      aria-label="Tăng điểm thảo luận"
                      className="group flex-col h-auto px-3.5 py-2.5 rounded-xl min-w-[54px]"
                    >
                      <ChevronUp
                        aria-hidden="true"
                        className={`w-4 h-4 transition-transform duration-m3-short-4 ease-m3-emphasized group-hover:-translate-y-0.5 ${
                          thread.isUpvotedByMe
                            ? "text-primary-foreground"
                            : "text-muted-foreground group-hover:text-primary"
                        }`}
                      />
                      <span className="text-xs font-extrabold mt-1 tracking-tight">
                        {thread.upvoteCount}
                      </span>
                    </Button>
                  </div>

                  {/* Toggle Replies View */}
                  <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleThreadExpand(thread.id)}
                      className="text-xs text-primary hover:underline gap-1 p-0 h-auto font-semibold"
                    >
                      <span>
                        {isExpanded
                          ? "Hide replies"
                          : `Show (${thread.replies.length}) ${"phản hồi"}`}
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </Button>
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
                            className={`p-4 rounded-xl text-sm transition-colors ${
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
                                  <Badge
                                    variant="warning"
                                    className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1"
                                  >
                                    Official Staff Answer
                                  </Badge>
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
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditReply(reply)}
                                    className="text-xs text-muted-foreground hover:text-primary h-auto p-1"
                                  >
                                    {"Sửa"}
                                  </Button>
                                )}
                                {canDeleteReply && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteReply(reply.id)}
                                    className="text-xs text-muted-foreground hover:text-destructive h-auto p-1"
                                  >
                                    {"Xóa"}
                                  </Button>
                                )}

                                {isStaffOrAdmin && !reply.isStaffAnswer && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePinStaffAnswer(reply.id)}
                                    className="text-xs text-warning bg-warning/10 hover:bg-warning/20 border-warning/30 px-3 py-1 rounded-full h-auto"
                                  >
                                    Pin Answer
                                  </Button>
                                )}

                                <Button
                                  variant={reply.isUpvotedByMe ? "primary" : "outline"}
                                  size="sm"
                                  onClick={() => handleVote(reply.id, true)}
                                  className="rounded-full text-xs gap-1 px-3 py-1 h-auto"
                                >
                                  <ChevronUp aria-hidden="true" className="w-3.5 h-3.5" />
                                  <span className="font-bold">{reply.upvoteCount}</span>
                                </Button>
                              </div>
                            </div>

                            {isEditingThisReply ? (
                              <div className="mt-2 space-y-2">
                                <Textarea
                                  value={editReplyContent}
                                  onChange={(e) => setEditReplyContent(e.target.value)}
                                  rows={3}
                                  className="bg-card p-3 text-sm"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingReplyId(null)}
                                    className="text-xs font-medium"
                                  >
                                    {"Hủy"}
                                  </Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleUpdateReply(reply.id)}
                                    disabled={submittingEditReply || !editReplyContent.trim()}
                                    isLoading={submittingEditReply}
                                    className="text-xs font-semibold"
                                  >
                                    {"Lưu thay đổi"}
                                  </Button>
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
                          <Button
                            variant="outline"
                            onClick={() =>
                              setActiveReplyBoxIds((prev) => ({ ...prev, [thread.id]: true }))
                            }
                            className="w-full justify-start text-xs font-medium text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl p-3 h-auto group border-input"
                          >
                            <Reply
                              aria-hidden="true"
                              className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-primary transition-colors"
                            />
                            <span>{"Nội dung thắc mắc hoặc thảo luận chi tiết…"}</span>
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <Textarea
                              autoFocus
                              value={replyInputs[thread.id] || ""}
                              onChange={(e) =>
                                setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))
                              }
                              placeholder={"Nội dung thắc mắc hoặc thảo luận chi tiết…"}
                              rows={3}
                              className="bg-card p-3 text-sm"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setActiveReplyBoxIds((prev) => ({ ...prev, [thread.id]: false }));
                                  setReplyInputs((prev) => ({ ...prev, [thread.id]: "" }));
                                }}
                                className="text-xs font-medium"
                              >
                                {"Hủy"}
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handlePostReply(thread.id)}
                                disabled={
                                  submittingReply[thread.id] ||
                                  !(replyInputs[thread.id] || "").trim()
                                }
                                isLoading={submittingReply[thread.id]}
                                className="text-xs font-semibold"
                              >
                                {"Đăng bài"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
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
            <Select
              value={newCourseId}
              onValueChange={(val) => {
                if (val) setNewCourseId(val as string);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn khóa học">
                  {courses.find((c) => c.id === newCourseId)?.title || newCourseId}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            label="Title *"
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={"Tiêu đề chủ đề…"}
            className="bg-muted text-sm p-3 rounded-xl"
          />

          <Textarea
            label="Content"
            rows={4}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={"Nội dung thắc mắc hoặc thảo luận chi tiết…"}
            className="bg-muted text-sm p-3 rounded-xl"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold"
            >
              {"Hủy"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submittingThread || !newTitle.trim()}
              isLoading={submittingThread}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-primary/20"
            >
              {"Đăng bài"}
            </Button>
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
          <Input
            label="Title *"
            type="text"
            required
            value={editThreadTitle}
            onChange={(e) => setEditThreadTitle(e.target.value)}
            className="bg-muted text-sm p-3 rounded-xl"
          />

          <Textarea
            label="Content"
            rows={4}
            value={editThreadContent}
            onChange={(e) => setEditThreadContent(e.target.value)}
            className="bg-muted text-sm p-3 rounded-xl"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingThread(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold"
            >
              {"Hủy"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submittingEditThread || !editThreadTitle.trim()}
              isLoading={submittingEditThread}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-primary/20"
            >
              {"Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Thread Detail Modal (Facebook Post Style) */}
      <ThreadDetailModal
        isOpen={Boolean(selectedModalThreadId)}
        onClose={() => setSelectedModalThreadId(null)}
        thread={threads.find((t) => t.id === selectedModalThreadId) || null}
        currentUserId={currentUserId}
        isStaffOrAdmin={isStaffOrAdmin}
        onVote={handleVote}
        onPostReply={async (threadId, content) => {
          const client = getRpcClient(ForumService);
          await client.postReply({ threadId, content });
          fetchThreads();
        }}
        onDeleteThread={handleDeleteThread}
        onDeleteReply={handleDeleteReply}
        onPinStaffAnswer={handlePinStaffAnswer}
        isNotificationTarget={urlThreadId === selectedModalThreadId}
      />

      {/* Confirm Dialog Delete Thread */}
      <ConfirmAlertDialog
        isOpen={Boolean(deletingThreadId)}
        onClose={() => setDeletingThreadId(null)}
        onConfirm={executeDeleteThread}
        title="Xác nhận xóa bài viết"
        description="Bạn có chắc chắn muốn xóa bài viết này không? Thao tác này không thể hoàn tác."
        confirmText="Xóa bài viết"
        cancelText="Hủy"
        variant="danger"
        isLoading={isDeletingThread}
      />

      {/* Confirm Dialog Delete Reply */}
      <ConfirmAlertDialog
        isOpen={Boolean(deletingReplyId)}
        onClose={() => setDeletingReplyId(null)}
        onConfirm={executeDeleteReply}
        title="Xác nhận xóa phản hồi"
        description="Bạn có chắc chắn muốn xóa phản hồi này không? Thao tác này không thể hoàn tác."
        confirmText="Xóa phản hồi"
        cancelText="Hủy"
        variant="danger"
        isLoading={isDeletingReply}
      />
    </>
  );
}

export default function ForumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span aria-live="polite">Đang tải diễn đàn…</span>
          </div>
        </div>
      }
    >
      <ForumPageContent />
    </Suspense>
  );
}
