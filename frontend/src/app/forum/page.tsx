"use client";

import { useEffect, useState, useCallback } from "react";
import { create } from "@bufbuild/protobuf";
import { getRpcClient } from "@/lib/connect_client";
import { ForumService, ForumThreadSchema, ForumReplySchema, type ForumThread } from "@/gen/forum/v1/forum_pb";
import { CatalogService, type Course } from "@/gen/catalog/v1/catalog_pb";
import { Navbar } from "@/components/Navbar";

export default function ForumPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Thread Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [submittingThread, setSubmittingThread] = useState(false);

  // Reply Form State: threadId -> content
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({});

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
  const fetchThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = getRpcClient(ForumService);
      const res = await client.listThreads({
        courseId: selectedCourseId,
        itemId: "",
      });
      setThreads(res.threads);
      const initialExpanded: Record<string, boolean> = {};
      res.threads.forEach((t) => {
        initialExpanded[t.id] = true;
      });
      setExpandedThreads((prev) => ({ ...initialExpanded, ...prev }));
    } catch (err: unknown) {
      console.error("Failed to load forum threads:", err);
      const msg = err instanceof Error ? err.message : "Không thể tải danh sách bài thảo luận";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    let isMounted = true;
    const client = getRpcClient(ForumService);
    client.listThreads({
      courseId: selectedCourseId,
      itemId: "",
    }).then((res) => {
      if (isMounted) {
        setThreads(res.threads);
        const initialExpanded: Record<string, boolean> = {};
        res.threads.forEach((t) => {
          initialExpanded[t.id] = true;
        });
        setExpandedThreads((prev) => ({ ...initialExpanded, ...prev }));
        setLoading(false);
      }
    }).catch((err) => {
      if (isMounted) {
        console.error("Failed to load forum threads:", err);
        const msg = err instanceof Error ? err.message : "Không thể tải danh sách bài thảo luận";
        setError(msg);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  // Handle Create Thread
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmittingThread(true);
    try {
      const client = getRpcClient(ForumService);
      const currentUserId = typeof window !== "undefined" ? localStorage.getItem("user_id") || "user_learner_demo" : "user_learner_demo";
      
      await client.createThread({
        courseId: newCourseId || selectedCourseId || (courses[0]?.id ?? "course-python-ai"),
        itemId: "",
        title: newTitle,
        content: newContent,
        authorUserId: currentUserId,
      });

      setNewTitle("");
      setNewContent("");
      setShowCreateModal(false);
      fetchThreads();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Không thể đăng bài thảo luận");
    } finally {
      setSubmittingThread(false);
    }
  };

  // Handle Post Reply
  const handlePostReply = async (threadId: string) => {
    const content = replyInputs[threadId] || "";
    if (!content.trim()) return;

    setSubmittingReply((prev) => ({ ...prev, [threadId]: true }));
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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Không thể gửi câu trả lời");
    } finally {
      setSubmittingReply((prev) => ({ ...prev, [threadId]: false }));
    }
  };

  // Handle Upvote with Optimistic UI Update (Zero Flicker & Instant Response)
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
      console.error("Failed to vote post:", err);
      fetchThreads();
    }
  };

  // Handle Pin Staff Answer
  const handlePinStaffAnswer = async (replyId: string) => {
    try {
      const client = getRpcClient(ForumService);
      const currentUserId = typeof window !== "undefined" ? localStorage.getItem("user_id") || "user_ta_01" : "user_ta_01";
      await client.pinStaffAnswer({ replyId, taUserId: currentUserId });
      fetchThreads();
    } catch (err) {
      console.error("Failed to pin staff answer:", err);
    }
  };

  const toggleThreadExpand = (threadId: string) => {
    setExpandedThreads((prev) => ({ ...prev, [threadId]: !prev[threadId] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              Coursera Learning Forum
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Diễn Đàn Thảo Luận & Hỏi Đáp
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Trao đổi kiến thức, câu hỏi bài học cùng các bạn học viên và đội ngũ Trợ giảng.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tạo Thảo Luận Mới
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Lọc theo Khóa học:
            </span>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full md:w-80"
            >
              <option value="">-- Tất cả Khóa học --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500">
            Hiển thị <span className="font-bold text-slate-800 dark:text-slate-200">{threads.length}</span> chủ đề thảo luận
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-2/3 mb-4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-4" />
                <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-6 rounded-2xl text-center">
            <p className="font-semibold">{error}</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Chưa có chủ đề thảo luận nào.</p>
            <p className="text-xs text-slate-400 mt-1">Hãy là người đầu tiên đặt câu hỏi cho khóa học này!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {threads.map((thread) => {
              const isExpanded = expandedThreads[thread.id] ?? true;

              return (
                <div
                  key={thread.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-6 transition-all shadow-sm"
                >
                  {/* Thread Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {thread.isStaffPinned && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60 shadow-xs">
                            <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
                            </svg>
                            <span>Staff Pinned</span>
                          </span>
                        )}
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Đăng bởi <strong className="text-slate-700 dark:text-slate-300">{thread.authorName}</strong> ({thread.authorRole})
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs text-slate-400">
                          {new Date(thread.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>

                      <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                        {thread.title}
                      </h2>
                    </div>

                    {/* Upvote Button for Thread */}
                    <button
                      onClick={() => handleVote(thread.id, true)}
                      className={`group flex flex-col items-center justify-center px-3.5 py-2.5 rounded-xl border transition-all duration-200 min-w-[54px] select-none ${
                        thread.isUpvotedByMe
                          ? "bg-gradient-to-b from-blue-600 to-indigo-600 border-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/30"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400"
                      }`}
                      title={thread.isUpvotedByMe ? "Đã Upvote (Bấm để Hủy)" : "Upvote bài viết"}
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5 ${
                          thread.isUpvotedByMe ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                      <span className="text-xs font-extrabold mt-1 tracking-tight">{thread.upvoteCount}</span>
                    </button>
                  </div>

                  {/* Toggle Replies View */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4">
                    <button
                      onClick={() => toggleThreadExpand(thread.id)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>{isExpanded ? "Ẩn danh sách phản hồi" : `Xem (${thread.replies.length}) phản hồi`}</span>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Replies List */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-l-2 border-slate-200 dark:border-slate-800 pl-4 md:pl-6 pt-2">
                      {thread.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className={`p-4 rounded-xl text-sm transition-all ${
                            reply.isStaffAnswer
                              ? "bg-amber-500/5 border border-amber-500/20"
                              : "bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {reply.authorName}
                              </span>
                              {reply.isStaffAnswer && (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 px-3 py-1 rounded-full border border-amber-300/60 dark:border-amber-500/40 shadow-xs">
                                  <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Câu trả lời chính thức (TA)
                                </span>
                              )}
                              <span className="text-xs text-slate-400">({reply.authorRole})</span>
                              <span className="text-xs text-slate-400">
                                • {new Date(reply.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Pin Staff Answer Action for TA */}
                              {!reply.isStaffAnswer && (
                                <button
                                  onClick={() => handlePinStaffAnswer(reply.id)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 px-3 py-1 rounded-full transition-all"
                                  title="Đánh dấu câu trả lời chuẩn từ Giảng viên"
                                >
                                  <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
                                  </svg>
                                  Ghim câu trả lời
                                </button>
                              )}

                              {/* Upvote Reply Button */}
                              <button
                                onClick={() => handleVote(reply.id, true)}
                                className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 select-none ${
                                  reply.isUpvotedByMe
                                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
                                }`}
                                title={reply.isUpvotedByMe ? "Đã Upvote (Bấm để Hủy)" : "Upvote câu trả lời"}
                              >
                                <svg
                                  className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 ${
                                    reply.isUpvotedByMe ? "text-white" : "text-blue-500 dark:text-blue-400"
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                </svg>
                                <span className="font-bold">{reply.upvoteCount}</span>
                              </button>
                            </div>
                          </div>

                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {reply.content}
                          </p>
                        </div>
                      ))}

                      {/* Reply Input Form */}
                      <div className="pt-2">
                        <div className="flex gap-3 items-start">
                          <textarea
                            value={replyInputs[thread.id] || ""}
                            onChange={(e) =>
                              setReplyInputs((prev) => ({ ...prev, [thread.id]: e.target.value }))
                            }
                            placeholder="Nhập câu trả lời hoặc trao đổi thêm..."
                            rows={2}
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                          <button
                            onClick={() => handlePostReply(thread.id)}
                            disabled={submittingReply[thread.id] || !(replyInputs[thread.id] || "").trim()}
                            className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shrink-0"
                          >
                            {submittingReply[thread.id] ? "Đang gửi..." : "Gửi Phản Hồi"}
                          </button>
                        </div>
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
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Tạo Thảo Luận Mới
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Chọn Khóa Học
                </label>
                <select
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Tiêu Đề Thắc Mắc *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Làm thế nào để tính điểm Loss Function trong bài 1?"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nội Dung Chi Tiết (Tùy chọn)
                </label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Mô tả cụ thể câu hỏi hoặc đoạn code bạn đang gặp vướng mắc..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-all"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingThread || !newTitle.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-600/20"
                >
                  {submittingThread ? "Đang tạo..." : "Đăng Thảo Luận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
