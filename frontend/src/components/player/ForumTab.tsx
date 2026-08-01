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
import { ForumReplyItem } from "@/components/forum/ForumReplyItem";
import { useAuth } from "@/components/providers/AuthProvider";

interface ForumTabProps {
  courseId: string;
  itemId: string;
}

function formatRoleName(role: string): string {
  if (!role) return "Learner";
  const r = role.toUpperCase();
  if (r.includes("LEARNER") || r.includes("STUDENT") || r === "1") return "Learner";
  if (r.includes("INSTRUCTOR") || r === "2") return "Instructor";
  if (r.includes("TA") || r.includes("TEACHING ASSISTANT") || r === "3")
    return "Teaching Assistant";
  if (r.includes("SUPER_ADMIN") || r.includes("ORG_ADMIN") || r.includes("ADMIN")) return "Admin";
  return role;
}

export function ForumTab({ courseId, itemId }: ForumTabProps) {
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

  // Reply Edit State
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [submittingEditReply, setSubmittingEditReply] = useState(false);

  const fetchThreadsRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;

    const doFetch = async () => {
      setLoading(true);
      try {
        const client = getRpcClient(ForumService);
        const res = await client.listThreads({
          courseId,
          itemId: itemId || "",
        });
        if (!cancelled) {
          setThreads(res.threads);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load forum tab threads:", err);
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
  }, [courseId, itemId]);

  const fetchThreads = useCallback(() => fetchThreadsRef.current(), []);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const client = getRpcClient(ForumService);
      await client.createThread({
        courseId,
        itemId: itemId || "",
        title: newTitle,
        content: newContent,
      });
      setNewTitle("");
      setNewContent("");
      fetchThreads();
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

  const handleDeleteThread = async (threadId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;
    try {
      const client = getRpcClient(ForumService);
      await client.deleteThread({ threadId });
      fetchThreads();
    } catch (err) {
      console.error("Error deleting thread:", err);
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

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phản hồi này không?")) return;
    try {
      const client = getRpcClient(ForumService);
      await client.deleteReply({ replyId });
      fetchThreads();
    } catch (err) {
      console.error("Error deleting reply:", err);
    }
  };

  const handleVote = async (postId: string, isUpvote: boolean) => {
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
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-xs text-muted-foreground flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span aria-live="polite">Đang tải bài thảo luận…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create New Quick Question Form */}
      <form
        onSubmit={handleCreateThread}
        className="bg-card border border-border rounded-xl p-3 space-y-2"
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Đặt câu hỏi thảo luận cho bài học này…"
          className="w-full bg-card border border-input rounded-lg p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {newTitle.trim() && (
          <div className="flex gap-2 items-center">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Chi tiết câu hỏi (nếu có)…"
              rows={2}
              className="flex-1 bg-card border border-input rounded-lg p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={submitting || !newTitle.trim()}
              className="px-3 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
            >
              <span aria-live="polite">{submitting ? "Đang gửi…" : "Đăng Thảo Luận"}</span>
            </button>
          </div>
        )}
      </form>

      {/* Threads List */}
      {threads.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          Chưa có câu hỏi thảo luận nào cho bài học này. Hãy gửi thắc mắc đầu tiên của bạn!
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => {
            const isThreadAuthor = Boolean(currentUserId && thread.authorUserId === currentUserId);
            const canDeleteThread = isThreadAuthor || isStaffOrAdmin;
            const isEditingThisThread = editingThreadId === thread.id;

            return (
              <div
                key={thread.id}
                className="bg-card border border-border rounded-xl p-3 text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {thread.isStaffPinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">
                          <svg
                            className="w-3 h-3 text-warning"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
                          </svg>
                          Staff Pinned
                        </span>
                      )}
                      <span className="font-semibold text-foreground">{thread.authorName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({formatRoleName(thread.authorRole)})
                      </span>
                      {thread.isEdited && (
                        <span className="text-[10px] text-warning font-medium italic">
                          {"(Đã chỉnh sửa)"}
                        </span>
                      )}
                      {isThreadAuthor && (
                        <button
                          onClick={() => startEditThread(thread)}
                          className="text-[10px] font-semibold text-muted-foreground hover:text-primary cursor-pointer ml-1"
                        >
                          {"Sửa"}
                        </button>
                      )}
                      {canDeleteThread && (
                        <button
                          onClick={() => handleDeleteThread(thread.id)}
                          className="text-[10px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer ml-1"
                        >
                          {"Xóa"}
                        </button>
                      )}
                    </div>

                    {isEditingThisThread ? (
                      <div className="space-y-2 my-1">
                        <input
                          type="text"
                          value={editThreadTitle}
                          onChange={(e) => setEditThreadTitle(e.target.value)}
                          className="w-full bg-card border border-input rounded px-2 py-1 text-xs font-bold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <textarea
                          value={editThreadContent}
                          onChange={(e) => setEditThreadContent(e.target.value)}
                          placeholder="Chi tiết câu hỏi (nếu có)…"
                          rows={2}
                          className="w-full bg-card border border-input rounded px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditingThreadId(null)}
                            className="px-2 py-1 border border-input text-muted-foreground rounded text-[11px]"
                          >
                            {"Hủy"}
                          </button>
                          <button
                            onClick={() => handleUpdateThread(thread.id)}
                            disabled={submittingEditThread || !editThreadTitle.trim()}
                            className="px-2 py-1 bg-primary text-primary-foreground rounded text-[11px] font-semibold hover:bg-primary-hover"
                          >
                            {"Lưu thay đổi"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <h4 className="font-bold text-foreground text-sm">{thread.title}</h4>
                    )}
                  </div>

                  <button
                    onClick={() => handleVote(thread.id, true)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                      thread.isUpvotedByMe
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-card border-border text-foreground hover:bg-muted"
                    }`}
                    title={thread.isUpvotedByMe ? "Đã Upvote (Bấm để Hủy)" : "Upvote"}
                  >
                    <svg
                      className={`w-3 h-3 ${thread.isUpvotedByMe ? "text-primary-foreground" : "text-primary"}`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 4l-8 8h5v8h6v-8h5z" />
                    </svg>
                    <span>{thread.upvoteCount}</span>
                  </button>
                </div>

                {/* Replies */}
                {thread.replies.length > 0 && (
                  <div className="pl-3 border-l-2 border-border space-y-2 pt-1">
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
                  <input
                    type="text"
                    value={replyInputs[thread.id] || ""}
                    onChange={(e) =>
                      setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))
                    }
                    placeholder="Trả lời…"
                    className="flex-1 bg-card border border-input rounded px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <button
                    onClick={() => handlePostReply(thread.id)}
                    disabled={!(replyInputs[thread.id] || "").trim()}
                    className="px-2.5 py-1 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded text-xs font-medium cursor-pointer"
                  >
                    Gửi
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
