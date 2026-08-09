"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Pin, ChevronUp } from "lucide-react";
import { create } from "@bufbuild/protobuf";
import { getRpcClient } from "@/lib/connect_client";
import {
  ForumService,
  ForumThreadSchema,
  ForumReplySchema,
  type ForumThread,
  type ForumReply,
} from "@/gen/forum/v1/forum_pb";
import { ForumReplyItem } from "@/components/forum/ForumReplyItem";
import { ThreadDetailModal } from "@/components/forum/ThreadDetailModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { Dialog } from "@/components/ui/Dialog";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";

interface ForumTabProps {
  courseId: string;
  itemId: string;
  targetThreadId?: string;
}

function formatRoleName(role: string): string {
  if (!role) return "Học viên";
  const r = role.toUpperCase();
  if (r.includes("LEARNER") || r.includes("STUDENT") || r === "1") return "Học viên";
  if (r.includes("INSTRUCTOR") || r === "2") return "Giảng viên";
  if (r.includes("ADMIN") || r === "3") return "Quản trị viên";
  return role;
}

export function ForumTab({ courseId, itemId, targetThreadId }: ForumTabProps) {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { userId: authUserId, isStaff: isStaffOrAdmin } = useAuth();
  const currentUserId = authUserId || "";

  // Thread Edit State
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editThreadTitle, setEditThreadTitle] = useState("");
  const [editThreadContent, setEditThreadContent] = useState("");
  const [submittingEditThread, setSubmittingEditThread] = useState(false);

  // Reply inputs: threadId -> content
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  // In-flight voting requests state
  const [votingPostIds, setVotingPostIds] = useState<Set<string>>(new Set());

  // Reply Edit State
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [submittingEditReply, setSubmittingEditReply] = useState(false);

  // Delete Confirm Modal State
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [isDeletingThread, setIsDeletingThread] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [isDeletingReply, setIsDeletingReply] = useState(false);

  // Selected Modal Thread for Facebook Post Style View
  const [selectedModalThreadId, setSelectedModalThreadId] = useState<string | null>(null);

  const autoOpenedRef = useRef(false);

  const fetchThreads = useCallback(async () => {
    try {
      const client = getRpcClient(ForumService);
      const res = await client.listThreads({ courseId, itemId });
      setThreads(res.threads);
    } catch (err) {
      console.error("Error fetching forum threads:", err);
    } finally {
      setLoading(false);
    }
  }, [courseId, itemId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Auto-scroll or auto-open target thread from notification URL
  useEffect(() => {
    if (targetThreadId && threads.length > 0 && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      const targetThreadExists = threads.some((t) => t.id === targetThreadId);
      if (targetThreadExists) {
        setSelectedModalThreadId(targetThreadId);
      }
    }
  }, [targetThreadId, threads]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || submitting) return;

    setSubmitting(true);
    try {
      const client = getRpcClient(ForumService);
      await client.createThread({
        courseId,
        itemId,
        title: newTitle.trim(),
        content: newContent.trim(),
      });
      setNewTitle("");
      setNewContent("");
      await fetchThreads();
    } catch (err) {
      console.error("Error creating thread:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditThread = (thread: ForumThread) => {
    setEditingThreadId(thread.id);
    setEditThreadTitle(thread.title);
    setEditThreadContent(thread.content);
  };

  const handleUpdateThread = async (threadId: string) => {
    if (!editThreadTitle.trim()) return;
    setSubmittingEditThread(true);
    try {
      const client = getRpcClient(ForumService);
      await client.updateThread({
        threadId,
        title: editThreadTitle,
        content: editThreadContent,
      });
      setEditingThreadId(null);
      fetchThreads();
    } catch (err) {
      console.error("Error updating thread:", err);
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
      fetchThreads();
    } catch (err) {
      console.error("Error deleting thread:", err);
    } finally {
      setIsDeletingThread(false);
      setDeletingThreadId(null);
    }
  };

  const handlePostReply = async (threadId: string) => {
    const content = replyInputs[threadId] || "";
    if (!content.trim()) return;

    try {
      const client = getRpcClient(ForumService);
      await client.postReply({
        threadId,
        content,
      });
      setReplyInputs((prev) => ({ ...prev, [threadId]: "" }));
      fetchThreads();
    } catch (err) {
      console.error("Error posting reply:", err);
    }
  };

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
      fetchThreads();
    } catch (err) {
      console.error("Error updating reply:", err);
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
      fetchThreads();
    } catch (err) {
      console.error("Error deleting reply:", err);
    } finally {
      setIsDeletingReply(false);
      setDeletingReplyId(null);
    }
  };

  const handleVote = async (postId: string, isUpvote: boolean) => {
    if (votingPostIds.has(postId)) return;
    setVotingPostIds((prev) => new Set(prev).add(postId));

    setThreads((prevThreads) =>
      prevThreads.map((t) => {
        if (t.id === postId) {
          const wasVoted = t.isUpvotedByMe;
          const newCount = wasVoted ? Math.max(0, t.upvoteCount - 1) : t.upvoteCount + 1;
          return create(ForumThreadSchema, {
            ...t,
            isUpvotedByMe: !wasVoted,
            upvoteCount: newCount,
          });
        }
        const updatedReplies = t.replies.map((r) => {
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
        return create(ForumThreadSchema, { ...t, replies: updatedReplies });
      }),
    );

    try {
      const client = getRpcClient(ForumService);
      const res = await client.votePost({ postId, isUpvote });

      setThreads((prevThreads) =>
        prevThreads.map((t) => {
          if (t.id === postId) {
            return create(ForumThreadSchema, { ...t, upvoteCount: res.updatedUpvoteCount });
          }
          const updatedReplies = t.replies.map((r) => {
            if (r.id === postId) {
              return create(ForumReplySchema, { ...r, upvoteCount: res.updatedUpvoteCount });
            }
            return r;
          });
          return create(ForumThreadSchema, { ...t, replies: updatedReplies });
        }),
      );
    } catch (err) {
      console.error("Error voting:", err);
      fetchThreads();
    } finally {
      setVotingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Progress.Circular size="sm" ariaLabel="Đang tải bài thảo luận" />
        <span aria-live="polite">Đang tải bài thảo luận…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create New Quick Question Form */}
      <form
        onSubmit={handleCreateThread}
        className="bg-surface-container-low border border-outline-variant rounded-2xl p-3.5 space-y-2.5 shadow-xs"
      >
        <Input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Đặt câu hỏi thảo luận cho bài học này…"
        />
        {newTitle.trim() && (
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Chi tiết câu hỏi (nếu có)…"
              rows={2}
              className="flex-1 min-h-[60px]"
            />
            <Button type="submit" disabled={submitting || !newTitle.trim() || submitting} size="sm">
              Đăng Thảo Luận
            </Button>
          </div>
        )}
      </form>

      {/* Threads List */}
      {threads.length === 0 ? (
        <div className="text-center py-6 text-xs text-on-surface-variant bg-surface-container-low border border-outline-variant p-6 rounded-2xl">
          Chưa có câu hỏi thảo luận nào cho bài học này. Hãy gửi thắc mắc đầu tiên của bạn!
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => {
            const isThreadAuthor = Boolean(currentUserId && thread.authorUserId === currentUserId);
            const canDeleteThread = isThreadAuthor || isStaffOrAdmin;
            const isEditingThisThread = editingThreadId === thread.id;
            const isTarget = targetThreadId === thread.id;

            return (
              <div
                key={thread.id}
                id={`thread-${thread.id}`}
                className={`bg-surface-container-low border ${
                  isTarget
                    ? "border-primary ring-2 ring-primary/50 shadow-md bg-primary-container/20"
                    : "border-outline-variant"
                } rounded-2xl p-4 text-xs space-y-2.5 transition-colors duration-m3-medium-2 ease-m3-emphasized shadow-xs`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {isTarget && (
                        <Badge variant="primary" className="text-[10px]">
                          📌 Thảo luận từ thông báo
                        </Badge>
                      )}
                      {thread.isStaffPinned && (
                        <Badge variant="warning" className="gap-1 text-[10px]">
                          <Pin aria-hidden="true" className="w-3 h-3 text-warning" />
                          Staff Pinned
                        </Badge>
                      )}
                      <span className="font-bold text-on-surface">{thread.authorName}</span>
                      <span className="text-[10px] text-on-surface-variant">
                        ({formatRoleName(thread.authorRole)})
                      </span>
                      {thread.isEdited && (
                        <span className="text-[10px] text-warning font-medium italic">
                          {"(Đã chỉnh sửa)"}
                        </span>
                      )}
                      {isThreadAuthor && (
                        <Button
                          type="button"
                          variant="text"
                          size="sm"
                          onClick={() => startEditThread(thread)}
                          className="text-[10px] font-bold text-on-surface-variant hover:text-primary h-auto p-0.5"
                        >
                          {"Sửa"}
                        </Button>
                      )}
                      {canDeleteThread && (
                        <Button
                          type="button"
                          variant="text"
                          size="sm"
                          onClick={() => handleDeleteThread(thread.id)}
                          className="text-[10px] font-bold text-on-surface-variant hover:text-destructive h-auto p-0.5"
                        >
                          {"Xóa"}
                        </Button>
                      )}
                    </div>

                    {isEditingThisThread ? (
                      <div className="space-y-2 my-1">
                        <Input
                          value={editThreadTitle}
                          onChange={(e) => setEditThreadTitle(e.target.value)}
                          aria-label="Tiêu đề câu hỏi"
                          className="font-bold text-xs"
                        />
                        <Textarea
                          value={editThreadContent}
                          onChange={(e) => setEditThreadContent(e.target.value)}
                          placeholder="Chi tiết câu hỏi (nếu có)…"
                          aria-label="Chi tiết câu hỏi"
                          rows={2}
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outlined"
                            size="sm"
                            type="button"
                            onClick={() => setEditingThreadId(null)}
                          >
                            {"Hủy"}
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => handleUpdateThread(thread.id)}
                            disabled={
                              submittingEditThread ||
                              !editThreadTitle.trim() ||
                              submittingEditThread
                            }
                          >
                            {"Lưu thay đổi"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="text"
                        onClick={() => setSelectedModalThreadId(thread.id)}
                        className="text-left w-full justify-start h-auto p-0 group/title hover:bg-transparent shadow-none"
                        title="Bấm để mở rộng bài viết"
                      >
                        <h4 className="font-bold text-on-surface text-sm group-hover/title:text-primary transition-colors text-left">
                          {thread.title}
                        </h4>
                      </Button>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => handleVote(thread.id, true)}
                    className={`rounded-full text-xs font-bold ${
                      thread.isUpvotedByMe
                        ? "bg-primary-container border-primary/30 text-on-primary-container"
                        : "bg-surface-container-lowest border-outline-variant text-on-surface hover:bg-surface-container-high"
                    }`}
                    title={thread.isUpvotedByMe ? "Đã Upvote (Bấm để Hủy)" : "Upvote"}
                    aria-label={thread.isUpvotedByMe ? "Hủy Upvote" : "Upvote"}
                  >
                    <ChevronUp
                      aria-hidden="true"
                      className={`w-4 h-4 ${thread.isUpvotedByMe ? "text-primary font-extrabold" : ""}`}
                    />
                    <span>{thread.upvoteCount}</span>
                  </Button>
                </div>

                {/* Replies */}
                {thread.replies.length > 0 && (
                  <div className="pl-3 border-l-2 border-outline-variant space-y-2 pt-1">
                    {thread.replies.map((reply) => (
                      <ForumReplyItem
                        key={reply.id}
                        reply={reply}
                        currentUserId={currentUserId}
                        isStaffOrAdmin={isStaffOrAdmin}
                        isEditing={editingReplyId === reply.id}
                        editReplyContent={editReplyContent}
                        submittingEditReply={submittingEditReply}
                        onStartEdit={startEditReply}
                        onCancelEdit={() => setEditingReplyId(null)}
                        onSaveEdit={handleUpdateReply}
                        onDelete={handleDeleteReply}
                        onVote={handleVote}
                        onContentChange={setEditReplyContent}
                      />
                    ))}
                  </div>
                )}

                {/* Inline Reply Input */}
                <div className="flex gap-2 items-center pt-1">
                  <Input
                    value={replyInputs[thread.id] || ""}
                    onChange={(e) =>
                      setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))
                    }
                    placeholder="Trả lời…"
                    aria-label="Nhập nội dung trả lời"
                    spellCheck={false}
                    className="flex-1 rounded-full text-xs"
                  />
                  <Button
                    type="button"
                    onClick={() => handlePostReply(thread.id)}
                    disabled={!(replyInputs[thread.id] || "").trim()}
                    className="rounded-full text-xs font-bold px-3.5"
                  >
                    Gửi
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
        isNotificationTarget={targetThreadId === selectedModalThreadId}
      />

      <Dialog.Root
        open={Boolean(deletingThreadId)}
        onOpenChange={(open) => {
          if (!open) setDeletingThreadId(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Icon
              className="bg-destructive/10 text-destructive"
              icon={<Trash2 className="w-6 h-6 text-destructive" aria-hidden="true" />}
            />
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

      <Dialog.Root
        open={Boolean(deletingReplyId)}
        onOpenChange={(open) => {
          if (!open) setDeletingReplyId(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Icon
              className="bg-destructive/10 text-destructive"
              icon={<Trash2 className="w-6 h-6 text-destructive" aria-hidden="true" />}
            />
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
    </div>
  );
}
