"use client";

import { Check, ThumbsUp } from "lucide-react";
import { type ForumReply } from "@/gen/forum/v1/forum_pb";

interface ForumReplyItemProps {
  reply: ForumReply;
  currentUserId: string;
  isStaffOrAdmin: boolean;
  isEditing: boolean;
  editReplyContent: string;
  submittingEditReply: boolean;
  onStartEdit: (reply: ForumReply) => void;
  onCancelEdit: () => void;
  onSaveEdit: (replyId: string) => void;
  onDelete: (replyId: string) => void;
  onVote: (replyId: string, isUpvote: boolean) => void;
  onContentChange: (content: string) => void;
}

export function ForumReplyItem({
  reply,
  currentUserId,
  isStaffOrAdmin,
  isEditing,
  editReplyContent,
  submittingEditReply,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onVote,
  onContentChange,
}: ForumReplyItemProps) {
  const isReplyAuthor = Boolean(currentUserId && reply.authorUserId === currentUserId);
  const canDeleteReply = isReplyAuthor || isStaffOrAdmin;

  return (
    <div
      className={`p-2 rounded ${
        reply.isStaffAnswer ? "bg-warning/10 border border-warning/20" : "bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-between text-[11px] mb-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-semibold text-foreground flex items-center gap-1">
            {reply.authorName}
            {reply.isStaffAnswer && (
              <span className="inline-flex items-center gap-0.5 text-warning font-extrabold">
                <Check className="w-3 h-3 text-warning" />
                (TA Staff)
              </span>
            )}
          </span>
          {reply.isEdited && (
            <span className="text-[10px] text-warning font-medium italic">{"(Đã chỉnh sửa)"}</span>
          )}
          {isReplyAuthor && (
            <button
              onClick={() => onStartEdit(reply)}
              className="text-[10px] font-semibold text-muted-foreground hover:text-primary cursor-pointer ml-1"
            >
              {"Sửa"}
            </button>
          )}
          {canDeleteReply && (
            <button
              onClick={() => onDelete(reply.id)}
              className="text-[10px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer ml-1"
            >
              {"Xóa"}
            </button>
          )}
        </div>

        <button
          onClick={() => onVote(reply.id, true)}
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
            reply.isUpvotedByMe
              ? "bg-primary border-primary text-primary-foreground"
              : "text-muted-foreground border-border hover:bg-muted"
          }`}
          title={reply.isUpvotedByMe ? "Đã Upvote (Bấm để Hủy)" : "Upvote"}
        >
          <ThumbsUp
            className={`w-2.5 h-2.5 ${reply.isUpvotedByMe ? "text-primary-foreground" : "text-primary"}`}
          />
          <span>{reply.upvoteCount}</span>
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-1 mt-1">
          <textarea
            value={editReplyContent}
            onChange={(e) => onContentChange(e.target.value)}
            rows={2}
            className="w-full bg-card border border-input rounded p-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="flex justify-end gap-1">
            <button
              onClick={onCancelEdit}
              className="px-2 py-0.5 border border-input text-muted-foreground rounded text-[10px]"
            >
              {"Hủy"}
            </button>
            <button
              onClick={() => onSaveEdit(reply.id)}
              disabled={submittingEditReply || !editReplyContent.trim()}
              className="px-2 py-0.5 bg-primary text-primary-foreground rounded text-[10px] font-semibold hover:bg-primary-hover"
            >
              {"Lưu thay đổi"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-foreground">{reply.content}</p>
      )}
    </div>
  );
}
