"use client";

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
        reply.isStaffAnswer
          ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
          : "bg-slate-50 dark:bg-slate-800/40"
      }`}
    >
      <div className="flex items-center justify-between text-[11px] mb-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            {reply.authorName}
            {reply.isStaffAnswer && (
              <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-300 font-extrabold">
                <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                (TA Staff)
              </span>
            )}
          </span>
          {reply.isEdited && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium italic">
              {"(Đã chỉnh sửa)"}
            </span>
          )}
          {isReplyAuthor && (
            <button
              onClick={() => onStartEdit(reply)}
              className="text-[10px] font-semibold text-slate-400 hover:text-blue-500 cursor-pointer ml-1"
            >
              {"Sửa"}
            </button>
          )}
          {canDeleteReply && (
            <button
              onClick={() => onDelete(reply.id)}
              className="text-[10px] font-semibold text-slate-400 hover:text-red-500 cursor-pointer ml-1"
            >
              {"Xóa"}
            </button>
          )}
        </div>

        <button
          onClick={() => onVote(reply.id, true)}
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all ${
            reply.isUpvotedByMe
              ? "bg-blue-600 border-blue-600 text-white"
              : "text-slate-500 border-slate-200 dark:border-slate-700"
          }`}
          title={reply.isUpvotedByMe ? "Đã Upvote (Bấm để Hủy)" : "Upvote"}
        >
          <svg
            className={`w-2.5 h-2.5 ${reply.isUpvotedByMe ? "text-white" : "text-blue-500"}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 4l-8 8h5v8h6v-8h5z" />
          </svg>
          <span>{reply.upvoteCount}</span>
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-1 mt-1">
          <textarea
            value={editReplyContent}
            onChange={(e) => onContentChange(e.target.value)}
            rows={2}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
          />
          <div className="flex justify-end gap-1">
            <button
              onClick={onCancelEdit}
              className="px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded text-[10px]"
            >
              {"Hủy"}
            </button>
            <button
              onClick={() => onSaveEdit(reply.id)}
              disabled={submittingEditReply || !editReplyContent.trim()}
              className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-semibold hover:bg-blue-500"
            >
              {"Lưu thay đổi"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-slate-700 dark:text-slate-300">{reply.content}</p>
      )}
    </div>
  );
}
