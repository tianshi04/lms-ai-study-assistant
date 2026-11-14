"use client";

import { Check, ThumbsUp, Pin } from "lucide-react";
import type { ForumReply } from "@/gen/forum/v1/forum_pb";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

export interface ForumReplyItemProps {
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
  onPinStaffAnswer?: (replyId: string) => void;
}

function formatRole(role: string): { label: string; variant: "warning" | "primary" | "secondary" } {
  if (!role) return { label: "Học viên", variant: "secondary" };
  const r = role.toUpperCase();
  if (r.includes("INSTRUCTOR") || r === "2") return { label: "Giảng viên", variant: "warning" };
  if (r.includes("TA") || r.includes("TEACHING ASSISTANT") || r === "3") {
    return { label: "Trợ giảng (TA)", variant: "warning" };
  }
  if (r.includes("ADMIN") || r.includes("SUPER_ADMIN")) {
    return { label: "Quản trị viên", variant: "primary" };
  }
  return { label: "Học viên", variant: "secondary" };
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
  onPinStaffAnswer,
}: ForumReplyItemProps) {
  const isReplyAuthor = Boolean(currentUserId && reply.authorUserId === currentUserId);
  const canDeleteReply = isReplyAuthor || isStaffOrAdmin;
  const roleInfo = formatRole(reply.authorRole);

  const formattedDate = reply.createdAt
    ? new Date(reply.createdAt).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
        reply.isStaffAnswer
          ? "bg-warning/5 border-warning/30 shadow-xs"
          : "bg-card border-border/70 hover:border-border shadow-xs"
      }`}
    >
      {/* Official Answer Header Banner */}
      {reply.isStaffAnswer && (
        <div className="flex items-center gap-1.5 text-xs font-bold text-warning mb-2.5 bg-warning/10 px-2.5 py-1 rounded-lg w-fit border border-warning/20">
          <Check aria-hidden="true" className="w-3.5 h-3.5 text-warning" />
          <span>Câu trả lời chính thức từ Giảng viên / BQT</span>
        </div>
      )}

      {/* Top Header: Author Info on Left, Actions Toolbar on Right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={reply.authorName || "Thành viên"} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                {reply.authorName || "Thành viên LMS"}
              </span>
              <Badge variant={roleInfo.variant} className="text-[10px] py-0 px-1.5 font-semibold">
                {roleInfo.label}
              </Badge>
              {reply.isEdited && (
                <span className="text-[10px] text-warning font-medium italic">
                  {"(Đã chỉnh sửa)"}
                </span>
              )}
            </div>
            {formattedDate && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{formattedDate}</p>
            )}
          </div>
        </div>

        {/* Action Controls Toolbar: Clean, No Overlapping */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onPinStaffAnswer && isStaffOrAdmin && (
            <Button
              variant={reply.isStaffAnswer ? "filled" : "outlined"}
              size="sm"
              onClick={() => onPinStaffAnswer(reply.id)}
              className="text-xs h-7 px-2.5 gap-1 font-semibold rounded-lg"
              title={
                reply.isStaffAnswer
                  ? "Bỏ ghim câu trả lời"
                  : "Ghim làm câu trả lời chính thức của Giảng viên"
              }
            >
              <Pin
                aria-hidden="true"
                className={`w-3.5 h-3.5 ${reply.isStaffAnswer ? "fill-current" : ""}`}
              />
              <span>{reply.isStaffAnswer ? "Bỏ ghim" : "Ghim"}</span>
            </Button>
          )}

          {isReplyAuthor && (
            <Button
              variant="text"
              size="sm"
              onClick={() => onStartEdit(reply)}
              className="text-xs text-muted-foreground hover:text-primary h-7 px-2"
            >
              {"Sửa"}
            </Button>
          )}

          {canDeleteReply && (
            <Button
              variant="text"
              size="sm"
              onClick={() => onDelete(reply.id)}
              className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
            >
              {"Xóa"}
            </Button>
          )}

          <Button
            variant={reply.isUpvotedByMe ? "filled" : "outlined"}
            size="sm"
            onClick={() => onVote(reply.id, true)}
            title={reply.isUpvotedByMe ? "Đã Upvote (Bấm để Hủy)" : "Hữu ích"}
            aria-label="Upvote"
            className="h-7 px-2.5 gap-1.5 text-xs font-bold rounded-lg shadow-xs"
          >
            <ThumbsUp
              aria-hidden="true"
              className={`w-3 h-3 ${reply.isUpvotedByMe ? "text-primary-foreground" : "text-primary"}`}
            />
            <span>{reply.upvoteCount}</span>
          </Button>
        </div>
      </div>

      {/* Reply Body Content / Editing Form */}
      {isEditing ? (
        <div className="space-y-2 mt-3 pt-2 border-t border-border/60">
          <Textarea
            value={editReplyContent}
            onChange={(e) => onContentChange(e.target.value)}
            rows={3}
            className="p-2.5 text-xs bg-background rounded-xl"
            placeholder="Nhập nội dung chỉnh sửa..."
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outlined"
              size="sm"
              onClick={onCancelEdit}
              className="px-3 text-xs h-7 rounded-lg"
            >
              {"Hủy"}
            </Button>
            <Button
              variant="filled"
              size="sm"
              onClick={() => onSaveEdit(reply.id)}
              disabled={submittingEditReply || !editReplyContent.trim()}
              className="px-3 text-xs font-semibold h-7 rounded-lg"
            >
              {"Lưu thay đổi"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed mt-2.5 break-words">
          {reply.content}
        </p>
      )}
    </div>
  );
}
