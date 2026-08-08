"use client";

import { Check, ThumbsUp } from "lucide-react";
import { type ForumReply } from "@/gen/forum/v1/forum_pb";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";

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
              <Badge
                variant="warning"
                className="gap-0.5 text-warning font-extrabold text-[10px] py-0 px-1"
              >
                <Check aria-hidden="true" className="w-3 h-3 text-warning" />
                (TA Staff)
              </Badge>
            )}
          </span>
          {reply.isEdited && (
            <span className="text-[10px] text-warning font-medium italic">{"(Đã chỉnh sửa)"}</span>
          )}
          {isReplyAuthor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStartEdit(reply)}
              className="text-[10px] font-semibold text-muted-foreground hover:text-primary h-auto p-0.5 ml-1"
            >
              {"Sửa"}
            </Button>
          )}
          {canDeleteReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(reply.id)}
              className="text-[10px] font-semibold text-muted-foreground hover:text-destructive h-auto p-0.5 ml-1"
            >
              {"Xóa"}
            </Button>
          )}
        </div>

        <Button
          variant={reply.isUpvotedByMe ? "primary" : "outline"}
          size="sm"
          onClick={() => onVote(reply.id, true)}
          title={reply.isUpvotedByMe ? "Đã Upvote (Bấm để Hủy)" : "Upvote"}
          className="text-[10px] font-bold px-1.5 py-0.5 h-auto gap-1"
        >
          <ThumbsUp
            aria-hidden="true"
            className={`w-2.5 h-2.5 ${reply.isUpvotedByMe ? "text-primary-foreground" : "text-primary"}`}
          />
          <span>{reply.upvoteCount}</span>
        </Button>
      </div>

      {isEditing ? (
        <div className="space-y-1 mt-1">
          <Textarea
            value={editReplyContent}
            onChange={(e) => onContentChange(e.target.value)}
            rows={2}
            className="p-1.5 text-xs bg-card"
          />
          <div className="flex justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelEdit}
              className="px-2 py-0.5 text-[10px] h-auto"
            >
              {"Hủy"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSaveEdit(reply.id)}
              disabled={submittingEditReply || !editReplyContent.trim()}
              isLoading={submittingEditReply}
              className="px-2 py-0.5 text-[10px] font-semibold h-auto"
            >
              {"Lưu thay đổi"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-foreground">{reply.content}</p>
      )}
    </div>
  );
}
