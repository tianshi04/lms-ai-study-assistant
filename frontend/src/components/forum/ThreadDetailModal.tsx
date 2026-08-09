"use client";

import { useState } from "react";
import Link from "next/link";
import { ThumbsUp, MessageSquare, Pin, ExternalLink } from "lucide-react";
import type { ForumThread, ForumReply } from "@/gen/forum/v1/forum_pb";
import { Dialog } from "@/components/ui/Dialog";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ForumReplyItem } from "./ForumReplyItem";

interface ThreadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: ForumThread | null;
  currentUserId: string;
  isStaffOrAdmin: boolean;
  onVote: (postId: string, isUpvote: boolean) => void;
  onPostReply: (threadId: string, content: string) => Promise<void>;
  onDeleteThread?: (threadId: string) => void;
  onDeleteReply?: (replyId: string) => void;
  onPinStaffAnswer?: (replyId: string) => void;
  isNotificationTarget?: boolean;
}

function formatRoleName(role: string): string {
  if (!role) return "Học viên";
  const r = role.toUpperCase();
  if (r.includes("LEARNER") || r.includes("STUDENT") || r === "1") return "Học viên";
  if (r.includes("INSTRUCTOR") || r === "2") return "Giảng viên";
  if (r.includes("TA") || r.includes("TEACHING ASSISTANT") || r === "3") return "Trợ giảng (TA)";
  if (r.includes("SUPER_ADMIN") || r.includes("ORG_ADMIN") || r.includes("ADMIN"))
    return "Quản trị viên";
  return role;
}

export function ThreadDetailModal({
  isOpen,
  onClose,
  thread,
  currentUserId,
  isStaffOrAdmin,
  onVote,
  onPostReply,
  onDeleteThread,
  onDeleteReply,
  onPinStaffAnswer,
  isNotificationTarget = false,
}: ThreadDetailModalProps) {
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Reply editing state inside modal
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");

  if (!thread) return null;

  const isThreadAuthor = Boolean(currentUserId && thread.authorUserId === currentUserId);
  const canDeleteThread = Boolean(onDeleteThread && (isThreadAuthor || isStaffOrAdmin));

  const handleSendReply = async () => {
    if (!replyContent.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      await onPostReply(thread.id, replyContent.trim());
      setReplyContent("");
    } catch (err) {
      console.error("Failed to post reply in modal:", err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const startEditReply = (reply: ForumReply) => {
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.content);
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content size="xl" className="p-6 max-h-[90vh] flex flex-col">
        <Dialog.Header>
          <Dialog.Icon
            icon={<MessageSquare className="w-6 h-6 text-primary" aria-hidden="true" />}
          />
          <Dialog.Title>{"Chi tiết bài thảo luận"}</Dialog.Title>
          <Dialog.Description>{"Xem thông tin câu hỏi và toàn bộ thảo luận"}</Dialog.Description>
        </Dialog.Header>
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 max-h-[60vh] pt-2">
          {/* Header Badges & Deep Link Navigation */}
          <div className="space-y-3 pb-4 border-b border-border">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {isNotificationTarget && (
                  <Badge variant="primary" className="gap-1 px-3 py-1 shadow-xs font-bold text-xs">
                    <span>📌 Bài viết từ thông báo</span>
                  </Badge>
                )}
                {thread.isStaffPinned && (
                  <Badge
                    variant="warning"
                    className="gap-1.5 px-3 py-1 shadow-xs text-xs font-bold"
                  >
                    <Pin aria-hidden="true" className="w-3.5 h-3.5 text-warning shrink-0" />
                    <span>Giảng viên đã ghim</span>
                  </Badge>
                )}
              </div>

              {/* 2-Way Deep Link Button to Classroom */}
              {thread.courseId && (
                <Link
                  href={`/learn/${thread.courseId}?tab=forum&threadId=${thread.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover hover:underline transition-colors bg-primary/10 px-3 py-1 rounded-lg border border-primary/20"
                >
                  <span>Mở trong phòng học</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <Avatar name={thread.authorName || "Thành viên LMS"} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-foreground text-sm">
                      {thread.authorName || "Thành viên LMS"}
                    </h4>
                    <Badge variant="outlined" className="text-[10px] py-0 px-1.5 font-semibold">
                      {formatRoleName(thread.authorRole)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(thread.createdAt).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Main Thread Actions */}
              <div className="flex items-center gap-2">
                {canDeleteThread && onDeleteThread && (
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => onDeleteThread(thread.id)}
                    className="text-xs text-muted-foreground hover:text-destructive h-auto p-1.5"
                  >
                    Xóa
                  </Button>
                )}
                <Button
                  variant={thread.isUpvotedByMe ? "filled" : "outlined"}
                  size="sm"
                  onClick={() => onVote(thread.id, true)}
                  className="gap-1.5 font-bold shadow-xs"
                >
                  <ThumbsUp
                    aria-hidden="true"
                    className={`w-4 h-4 ${thread.isUpvotedByMe ? "text-primary-foreground" : "text-primary"}`}
                  />
                  <span>{thread.upvoteCount} Hữu ích</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Thread Main Content (Facebook Post Style) */}
          <div className="space-y-3">
            <h2 className="text-xl font-extrabold text-foreground tracking-tight leading-snug">
              {thread.title}
            </h2>
            {thread.content && (
              <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed p-4 bg-muted/30 rounded-2xl border border-border/60">
                {thread.content}
              </div>
            )}
          </div>

          {/* Action bar info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 font-semibold">
              <MessageSquare aria-hidden="true" className="w-4 h-4 text-primary" />
              <span>{thread.replies.length} Phản hồi</span>
            </div>
            {isThreadAuthor && (
              <span className="text-xs text-primary font-medium">Tác giả bài viết</span>
            )}
          </div>

          {/* Thread Replies List */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Tất cả phản hồi ({thread.replies.length})
            </h3>

            {thread.replies.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                Chưa có phản hồi nào. Hãy là người đầu tiên trao đổi ý kiến!
              </div>
            ) : (
              <div className="space-y-3">
                {thread.replies.map((reply) => (
                  <div key={reply.id} className="relative">
                    {onPinStaffAnswer && isStaffOrAdmin && !reply.isStaffAnswer && (
                      <Button
                        variant="text"
                        size="sm"
                        onClick={() => onPinStaffAnswer(reply.id)}
                        className="absolute right-2 top-2 text-[10px] text-muted-foreground hover:text-warning"
                        title="Ghim làm câu trả lời chính thức"
                      >
                        <Pin aria-hidden="true" className="w-3 h-3" />
                        <span>Ghim</span>
                      </Button>
                    )}
                    <ForumReplyItem
                      reply={reply}
                      currentUserId={currentUserId}
                      isStaffOrAdmin={isStaffOrAdmin}
                      isEditing={editingReplyId === reply.id}
                      editReplyContent={editReplyContent}
                      submittingEditReply={false}
                      onStartEdit={startEditReply}
                      onCancelEdit={() => setEditingReplyId(null)}
                      onSaveEdit={() => {}}
                      onDelete={onDeleteReply ? onDeleteReply : () => {}}
                      onVote={onVote}
                      onContentChange={setEditReplyContent}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Comment Box (Facebook Comment Style) */}
        <Dialog.Footer className="pt-4 mt-2 border-t border-border flex items-start gap-3">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Viết câu trả lời hoặc thảo luận của bạn…"
            rows={2}
            className="flex-1 bg-card text-xs rounded-xl"
          />
          <Button
            variant="filled"
            onClick={handleSendReply}
            disabled={!replyContent.trim() || submittingReply || submittingReply}
            className="shrink-0 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-primary/20"
          >
            {"Đăng phản hồi"}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
