"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Plus,
  ChevronUp,
  ChevronDown,
  Reply,
  AlertTriangle,
  BookOpen,
  Pin,
} from "lucide-react";
import { create } from "@bufbuild/protobuf";
import { getRpcClient } from "@/lib/connect_client";
import {
  ForumService,
  ForumThreadSchema,
  ForumReplySchema,
  type ForumThread,
  type ForumReply,
} from "@/gen/forum/v1/forum_pb";
import { CatalogService } from "@/gen/catalog/v1/catalog_pb";
import { LearningService } from "@/gen/learning/v1/learning_pb";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Surface } from "@/components/ui/Surface";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { ThreadDetailModal } from "@/components/forum/ThreadDetailModal";
import { Select } from "@/components/ui/Select";

interface ForumCourseItem {
  id: string;
  title: string;
}

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
  const [courses, setCourses] = useState<ForumCourseItem[]>([]);
  const [teachingCourseIds, setTeachingCourseIds] = useState<Set<string>>(new Set());
  const [selectedCourseId, setSelectedCourseId] = useState<string>("ALL");
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { userId: authUserId, isStaff: isStaffOrAdmin, isSuperAdmin, isAuthenticated } = useAuth();
  const currentUserId = authUserId || "";

  const isCourseModerator = useCallback(
    (courseId: string) => {
      if (isSuperAdmin) return true;
      if (!courseId) return false;
      return teachingCourseIds.has(courseId);
    },
    [isSuperAdmin, teachingCourseIds],
  );

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

  // In-flight voting requests state
  const [votingPostIds, setVotingPostIds] = useState<Set<string>>(new Set());

  // Delete confirmations state
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [isDeletingReply, setIsDeletingReply] = useState(false);

  // Fetch Accessible Courses (Enrolled for learners, Teaching for instructors, All for Super Admins)
  useEffect(() => {
    let cancelled = false;

    async function fetchAccessibleCourses() {
      try {
        const catalogClient = getRpcClient(CatalogService);
        const teachingSet = new Set<string>();
        const combinedMap = new Map<string, ForumCourseItem>();

        if (isSuperAdmin) {
          const res = await catalogClient.listCourses({});
          res.courses.forEach((c) => {
            combinedMap.set(c.id, { id: c.id, title: c.title });
          });
        } else {
          // 1. Fetch Enrolled Courses
          if (isAuthenticated || authUserId) {
            try {
              const learningClient = getRpcClient(LearningService);
              const enrolledRes = await learningClient.listMyEnrolledCourses({});
              enrolledRes.courses.forEach((c) => {
                combinedMap.set(c.courseId, { id: c.courseId, title: c.courseTitle });
              });
            } catch (err) {
              console.error("Error fetching enrolled courses for forum:", err);
            }
          }

          // 2. Fetch Teaching Courses if Instructor or Staff
          if (isStaffOrAdmin) {
            try {
              const teachingRes = await catalogClient.listInstructorCourses({ pageSize: 100 });
              teachingRes.courses.forEach((c) => {
                teachingSet.add(c.id);
                combinedMap.set(c.id, { id: c.id, title: c.title });
              });
            } catch (err) {
              console.error("Error fetching instructor courses for forum:", err);
            }
          }
        }

        if (!cancelled) {
          const accessibleCourses = Array.from(combinedMap.values());
          setCourses(accessibleCourses);
          setTeachingCourseIds(teachingSet);
          if (accessibleCourses.length > 0) {
            setNewCourseId((prev) =>
              prev && combinedMap.has(prev) ? prev : accessibleCourses[0].id,
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching accessible courses for forum:", err);
        }
      }
    }

    fetchAccessibleCourses();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authUserId, isSuperAdmin, isStaffOrAdmin]);

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
          courseId: selectedCourseId === "ALL" ? "" : selectedCourseId,
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
    if (urlCourseId && urlCourseId !== "ALL") {
      setSelectedCourseId(urlCourseId);
    }
  }, [urlCourseId]);

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
        newCourseId ||
        (selectedCourseId !== "ALL" ? selectedCourseId : "") ||
        (courses[0]?.id ?? "course-web-dev");

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
      if (selectedCourseId !== "ALL" && selectedCourseId !== targetCourseId) {
        setSelectedCourseId("ALL");
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
    if (votingPostIds.has(postId)) return;
    setVotingPostIds((prev) => new Set(prev).add(postId));

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
    } finally {
      setVotingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handlePinStaffAnswer = async (replyId: string) => {
    try {
      const client = getRpcClient(ForumService);
      await client.pinStaffAnswer({ replyId });
      toast.success("Đã cập nhật trạng thái ghim câu trả lời!");
      fetchThreads();
    } catch (err: unknown) {
      console.error("Failed to pin staff answer:", err);
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
          ? "Đã bỏ ghim bài viết khỏi đầu diễn đàn!"
          : "Đã ghim bài viết lên đầu diễn đàn!",
      );
      fetchThreads();
    } catch (err: unknown) {
      console.error("Failed to pin/unpin thread:", err);
      toast.error(
        err instanceof Error ? err.message : "Không thể thay đổi trạng thái ghim bài viết.",
      );
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
              variant="filled"
              onClick={() => {
                if (courses.length === 0) {
                  toast.error(
                    "Bạn cần đăng ký hoặc phụ trách ít nhất một khóa học để tạo chủ đề thảo luận.",
                  );
                  return;
                }
                setShowCreateModal(true);
              }}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-primary/20 gap-2"
            >
              <Plus aria-hidden="true" className="w-4 h-4" />
              {"Tạo chủ đề thảo luận mới"}
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Surface
          variant="container"
          shape="2xl"
          className="p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              {"Khóa học"}:
            </span>
            <Select
              value={selectedCourseId}
              onValueChange={(val) => {
                if (val) setSelectedCourseId(val as string);
              }}
            >
              <Select.Trigger className="w-full sm:w-[280px] text-xs font-semibold">
                <Select.Value placeholder="Tất cả khóa học">
                  {(() => {
                    if (!selectedCourseId || selectedCourseId === "ALL") return "Tất cả khóa học";
                    const c = courses.find((course) => course.id === selectedCourseId);
                    return c ? c.title : "Tất cả khóa học";
                  })()}
                </Select.Value>
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="ALL">{"Tất cả khóa học"}</Select.Item>
                {courses.map((c) => (
                  <Select.Item key={c.id} value={c.id}>
                    {c.title}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            Total <span className="font-bold text-foreground">{threads.length}</span> threads
          </div>
        </Surface>

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
        ) : courses.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border p-8 space-y-4">
            <BookOpen aria-hidden="true" className="w-12 h-12 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground">
              {"Bạn chưa tham gia khóa học nào"}
            </h3>
            <p className="text-muted-foreground font-medium max-w-md mx-auto text-sm">
              {
                "Diễn đàn thảo luận được phân chia theo từng khóa học để đảm bảo tính tập trung và quyền riêng tư lớp học. Vui lòng đăng ký tham gia khóa học để bắt đầu trao đổi cùng Giảng viên."
              }
            </p>
            <div>
              <Link href="/catalog">
                <Button variant="filled" size="md">
                  {"Khám phá khóa học"}
                </Button>
              </Link>
            </div>
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
              const canDeleteThread = isThreadAuthor || isCourseModerator(thread.courseId);
              const isTargetThread = urlThreadId === thread.id;

              return (
                <Surface
                  variant="low"
                  shape="2xl"
                  key={thread.id}
                  id={`thread-${thread.id}`}
                  className={`p-6 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_240px] ${
                    isTargetThread
                      ? "border-primary ring-2 ring-primary/50 bg-primary/5"
                      : "hover:border-accent-hover"
                  }`}
                >
                  {/* Thread Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {isTargetThread && <Badge variant="primary">📌 TB</Badge>}
                        {thread.isStaffPinned && <Badge variant="warning">GHIM</Badge>}
                        {(() => {
                          const courseObj = courses.find((c) => c.id === thread.courseId);
                          const courseTitle = courseObj?.title || thread.courseId;
                          if (!courseTitle) return null;
                          return (
                            <Badge
                              variant="secondary"
                              className="text-[11px] font-semibold cursor-pointer hover:opacity-85 transition-opacity"
                              onClick={() => setSelectedCourseId(thread.courseId)}
                              title={`Lọc chỉ xem khóa học: ${courseTitle}`}
                            >
                              📚 {courseTitle}
                            </Badge>
                          );
                        })()}
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

                        <div className="ml-auto flex items-center gap-2">
                          {isCourseModerator(thread.courseId) && (
                            <Button
                              variant="text"
                              size="sm"
                              onClick={() => handleTogglePinThread(thread)}
                              className="text-xs text-muted-foreground hover:text-warning h-auto p-1 gap-1"
                              title={
                                thread.isStaffPinned
                                  ? "Bỏ ghim bài viết này"
                                  : "Ghim bài viết lên đầu diễn đàn"
                              }
                            >
                              <Pin
                                className={`w-3.5 h-3.5 ${
                                  thread.isStaffPinned ? "fill-warning text-warning" : ""
                                }`}
                              />
                              <span>{thread.isStaffPinned ? "Bỏ ghim" : "Ghim"}</span>
                            </Button>
                          )}
                          {isThreadAuthor && (
                            <Button
                              variant="text"
                              size="sm"
                              onClick={() => openEditThreadModal(thread)}
                              className="text-xs text-muted-foreground hover:text-primary h-auto p-1"
                            >
                              {"Sửa"}
                            </Button>
                          )}
                          {canDeleteThread && (
                            <Button
                              variant="text"
                              size="sm"
                              onClick={() => handleDeleteThread(thread.id)}
                              className="text-xs text-muted-foreground hover:text-destructive h-auto p-1"
                            >
                              {"Xóa"}
                            </Button>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="text"
                        onClick={() => setSelectedModalThreadId(thread.id)}
                        className="text-left w-full justify-start h-auto p-0 cursor-pointer group/title hover:bg-transparent shadow-none"
                        title="Bấm để mở rộng xem thảo luận riêng"
                      >
                        <h2 className="text-xl font-bold text-foreground leading-snug group-hover/title:text-primary transition-colors text-left">
                          {thread.title}
                        </h2>
                      </Button>
                    </div>

                    {/* Upvote Button */}
                    <Button
                      variant={thread.isUpvotedByMe ? "filled" : "outlined"}
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
                      variant="text"
                      size="sm"
                      onClick={() => toggleThreadExpand(thread.id)}
                      className="text-xs text-primary hover:underline gap-1 p-0 h-auto font-semibold"
                    >
                      <span>
                        {isExpanded
                          ? "Ẩn phản hồi"
                          : `Xem tất cả (${thread.replies.length}) phản hồi`}
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
                        const canDeleteReply = isReplyAuthor || isCourseModerator(thread.courseId);
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
                                {reply.isStaffAnswer && <Badge variant="warning">BQT</Badge>}
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
                                    variant="text"
                                    size="sm"
                                    onClick={() => startEditReply(reply)}
                                    className="text-xs text-muted-foreground hover:text-primary h-auto p-1"
                                  >
                                    {"Sửa"}
                                  </Button>
                                )}
                                {canDeleteReply && (
                                  <Button
                                    variant="text"
                                    size="sm"
                                    onClick={() => handleDeleteReply(reply.id)}
                                    className="text-xs text-muted-foreground hover:text-destructive h-auto p-1"
                                  >
                                    {"Xóa"}
                                  </Button>
                                )}

                                {isCourseModerator(thread.courseId) && !reply.isStaffAnswer && (
                                  <Button
                                    variant="outlined"
                                    size="sm"
                                    onClick={() => handlePinStaffAnswer(reply.id)}
                                    className="text-xs text-warning bg-warning/10 hover:bg-warning/20 border-warning/30 px-3 py-1 rounded-full h-auto"
                                  >
                                    {"Ghim câu trả lời"}
                                  </Button>
                                )}

                                <Button
                                  variant={reply.isUpvotedByMe ? "filled" : "outlined"}
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
                                    variant="text"
                                    size="sm"
                                    onClick={() => setEditingReplyId(null)}
                                    className="text-xs font-medium"
                                  >
                                    {"Hủy"}
                                  </Button>
                                  <Button
                                    variant="filled"
                                    size="sm"
                                    onClick={() => handleUpdateReply(reply.id)}
                                    disabled={
                                      submittingEditReply ||
                                      !editReplyContent.trim() ||
                                      submittingEditReply
                                    }
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
                            variant="outlined"
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
                                variant="text"
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
                                variant="filled"
                                size="sm"
                                onClick={() => handlePostReply(thread.id)}
                                disabled={
                                  submittingReply[thread.id] ||
                                  !(replyInputs[thread.id] || "").trim() ||
                                  submittingReply[thread.id]
                                }
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
                </Surface>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Create New Thread */}
      <Dialog.Root open={showCreateModal} onOpenChange={(open) => setShowCreateModal(open)}>
        <Dialog.Content size="lg">
          <Dialog.Header>
            <Dialog.Title>{"Tạo chủ đề thảo luận mới"}</Dialog.Title>
          </Dialog.Header>
          <form onSubmit={handleCreateThread} className="space-y-4 pt-2">
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
                <Select.Trigger className="w-full">
                  <Select.Value placeholder="Chọn khóa học">
                    {courses.find((c) => c.id === newCourseId)?.title || newCourseId}
                  </Select.Value>
                </Select.Trigger>
                <Select.Content>
                  {courses.map((c) => (
                    <Select.Item key={c.id} value={c.id}>
                      {c.title}
                    </Select.Item>
                  ))}
                </Select.Content>
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

            <Dialog.Footer className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="text"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold"
              >
                {"Hủy"}
              </Button>
              <Button
                type="submit"
                variant="filled"
                disabled={submittingThread || !newTitle.trim() || submittingThread}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-primary/20"
              >
                {"Đăng bài"}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {/* Modal Edit Thread */}
      <Dialog.Root
        open={Boolean(editingThread)}
        onOpenChange={(open) => {
          if (!open) setEditingThread(null);
        }}
      >
        <Dialog.Content size="lg">
          <Dialog.Header>
            <Dialog.Title>{"Chỉnh sửa bài viết"}</Dialog.Title>
          </Dialog.Header>
          <form onSubmit={handleUpdateThread} className="space-y-4 pt-2">
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

            <Dialog.Footer className="pt-4 border-t border-border">
              <Button
                type="button"
                variant="text"
                onClick={() => setEditingThread(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold"
              >
                {"Hủy"}
              </Button>
              <Button
                type="submit"
                variant="filled"
                disabled={submittingEditThread || !editThreadTitle.trim() || submittingEditThread}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-primary/20"
              >
                {"Lưu thay đổi"}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Root>

      {/* Thread Detail Modal (Facebook Post Style) */}
      <ThreadDetailModal
        isOpen={Boolean(selectedModalThreadId)}
        onClose={() => setSelectedModalThreadId(null)}
        thread={threads.find((t) => t.id === selectedModalThreadId) || null}
        currentUserId={currentUserId}
        isStaffOrAdmin={Boolean(
          selectedModalThreadId &&
          isCourseModerator(threads.find((t) => t.id === selectedModalThreadId)?.courseId || ""),
        )}
        onVote={handleVote}
        onPostReply={async (threadId, content) => {
          const client = getRpcClient(ForumService);
          await client.postReply({ threadId, content });
          fetchThreads();
        }}
        onDeleteThread={handleDeleteThread}
        onDeleteReply={handleDeleteReply}
        onPinStaffAnswer={handlePinStaffAnswer}
        onTogglePinThread={(threadId) => {
          const t = threads.find((x) => x.id === threadId);
          if (t) handleTogglePinThread(t);
        }}
        isNotificationTarget={urlThreadId === selectedModalThreadId}
      />

      {/* Confirm Dialog Delete Thread */}
      <Dialog.Root
        open={Boolean(deletingThreadId)}
        onOpenChange={(open) => {
          if (!open) setDeletingThreadId(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Icon
            icon={<AlertTriangle className="w-6 h-6 text-error" aria-hidden="true" />}
            className="bg-error/10 text-error"
          />
          <Dialog.Header>
            <Dialog.Title>Xác nhận xóa bài viết</Dialog.Title>
            <Dialog.Description>
              Bạn có chắc chắn muốn xóa bài viết này không? Thao tác này không thể hoàn tác.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="text" onClick={() => setDeletingThreadId(null)}>
              Hủy
            </Button>
            <Button
              variant="filled"
              className="bg-error text-on-error hover:bg-destructive-hover active:bg-destructive-active"
              onClick={executeDeleteThread}
              disabled={isDeletingThread}
            >
              Xóa bài viết
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>

      {/* Confirm Dialog Delete Reply */}
      <Dialog.Root
        open={Boolean(deletingReplyId)}
        onOpenChange={(open) => {
          if (!open) setDeletingReplyId(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Icon
            icon={<AlertTriangle className="w-6 h-6 text-error" aria-hidden="true" />}
            className="bg-error/10 text-error"
          />
          <Dialog.Header>
            <Dialog.Title>Xác nhận xóa phản hồi</Dialog.Title>
            <Dialog.Description>
              Bạn có chắc chắn muốn xóa phản hồi này không? Thao tác này không thể hoàn tác.
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="text" onClick={() => setDeletingReplyId(null)}>
              Hủy
            </Button>
            <Button
              variant="filled"
              className="bg-error text-on-error hover:bg-destructive-hover active:bg-destructive-active"
              onClick={executeDeleteReply}
              disabled={isDeletingReply}
            >
              Xóa phản hồi
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}

export default function ForumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
          <div className="flex items-center gap-3">
            <Progress.Circular size="sm" />
            <span aria-live="polite">Đang tải diễn đàn…</span>
          </div>
        </div>
      }
    >
      <ForumPageContent />
    </Suspense>
  );
}
