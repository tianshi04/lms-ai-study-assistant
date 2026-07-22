"use client";

import { useEffect, useState, useCallback } from "react";
import { create } from "@bufbuild/protobuf";
import { getRpcClient } from "@/lib/connect_client";
import { ForumService, ForumThreadSchema, ForumReplySchema, type ForumThread } from "@/gen/forum/v1/forum_pb";

interface ForumTabProps {
  courseId: string;
  itemId: string;
}

export function ForumTab({ courseId, itemId }: ForumTabProps) {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reply inputs: threadId -> content
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  const fetchThreads = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const client = getRpcClient(ForumService);
      const res = await client.listThreads({
        courseId,
        itemId: itemId || "",
      });
      setThreads(res.threads);
    } catch (err) {
      console.error("Failed to load forum tab threads:", err);
    } finally {
      setLoading(false);
    }
  }, [courseId, itemId]);

  useEffect(() => {
    let isMounted = true;
    if (!courseId) return;
    const client = getRpcClient(ForumService);
    client.listThreads({
      courseId,
      itemId: itemId || "",
    }).then((res) => {
      if (isMounted) {
        setThreads(res.threads);
        setLoading(false);
      }
    }).catch((err) => {
      if (isMounted) {
        console.error("Failed to load forum tab threads:", err);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [courseId, itemId]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const client = getRpcClient(ForumService);
      const currentUserId = typeof window !== "undefined" ? localStorage.getItem("user_id") || "user_learner_demo" : "user_learner_demo";
      await client.createThread({
        courseId,
        itemId: itemId || "",
        title: newTitle,
        content: newContent,
        authorUserId: currentUserId,
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

  const handlePostReply = async (threadId: string) => {
    const content = replyInputs[threadId] || "";
    if (!content.trim()) return;

    try {
      const client = getRpcClient(ForumService);
      const currentUserId = typeof window !== "undefined" ? localStorage.getItem("user_id") || "user_learner_demo" : "user_learner_demo";
      await client.postReply({
        threadId,
        content,
        authorUserId: currentUserId,
      });
      setReplyInputs((prev) => ({ ...prev, [threadId]: "" }));
      fetchThreads();
    } catch (err) {
      console.error("Error posting reply:", err);
    }
  };

  const handleVote = async (postId: string, isUpvote: boolean) => {
    // 1. Optimistically update local state immediately
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
      })
    );

    // 2. Call backend in background and sync exact count
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
        })
      );
    } catch (err) {
      console.error("Error voting:", err);
      fetchThreads();
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-xs text-slate-500 flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Đang tải bài thảo luận...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create New Quick Question Form */}
      <form onSubmit={handleCreateThread} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Đặt câu hỏi thảo luận cho bài học này..."
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {newTitle.trim() && (
          <div className="flex gap-2 items-center">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Chi tiết câu hỏi (nếu có)..."
              rows={2}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !newTitle.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shrink-0"
            >
              {submitting ? "Đang gửi..." : "Đăng Thảo Luận"}
            </button>
          </div>
        )}
      </form>

      {/* Threads List */}
      {threads.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400">
          Chưa có câu hỏi thảo luận nào cho bài học này. Hãy gửi thắc mắc đầu tiên của bạn!
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <div key={thread.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    {thread.isStaffPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">
                        <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
                        </svg>
                        Staff Pinned
                      </span>
                    )}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{thread.authorName}</span>
                    <span className="text-[10px] text-slate-400">({thread.authorRole})</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{thread.title}</h4>
                </div>

                <button
                  onClick={() => handleVote(thread.id, true)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                    thread.isUpvotedByMe
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                  title={thread.isUpvotedByMe ? "Đã Upvote (Bấm để Hủy)" : "Upvote"}
                >
                  <svg className={`w-3 h-3 ${thread.isUpvotedByMe ? "text-white" : "text-blue-500"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4l-8 8h5v8h6v-8h5z" />
                  </svg>
                  <span>{thread.upvoteCount}</span>
                </button>
              </div>

              {/* Replies */}
              {thread.replies.length > 0 && (
                <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-2 pt-1">
                  {thread.replies.map((reply) => (
                    <div key={reply.id} className={`p-2 rounded ${reply.isStaffAnswer ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20" : "bg-slate-50 dark:bg-slate-800/40"}`}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          {reply.authorName}
                          {reply.isStaffAnswer && (
                            <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-300 font-extrabold">
                              <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              (TA Staff)
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => handleVote(reply.id, true)}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                            reply.isUpvotedByMe
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "text-slate-500 border-slate-200 dark:border-slate-700"
                          }`}
                          title={reply.isUpvotedByMe ? "Đã Upvote (Bấm để Hủy)" : "Upvote"}
                        >
                          <svg className={`w-2.5 h-2.5 ${reply.isUpvotedByMe ? "text-white" : "text-blue-500"}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4l-8 8h5v8h6v-8h5z" />
                          </svg>
                          <span>{reply.upvoteCount}</span>
                        </button>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Reply Input */}
              <div className="flex gap-2 items-center pt-1">
                <input
                  type="text"
                  value={replyInputs[thread.id] || ""}
                  onChange={(e) => setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))}
                  placeholder="Trả lời..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 text-xs focus:outline-none"
                />
                <button
                  onClick={() => handlePostReply(thread.id)}
                  disabled={!(replyInputs[thread.id] || "").trim()}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-medium"
                >
                  Gửi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
