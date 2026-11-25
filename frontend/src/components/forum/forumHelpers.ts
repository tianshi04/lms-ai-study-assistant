import { create } from "@bufbuild/protobuf";
import {
  ForumReplySchema,
  ForumThreadSchema,
  type ForumReply,
  type ForumThread,
} from "@/gen/forum/v1/forum_pb";

/** Return whether a thread has at least one official staff answer or is already marked solved. */
export function isThreadSolved(thread: ForumThread): boolean {
  return thread.isSolved || thread.replies.some((reply) => reply.isStaffAnswer);
}

/** Map raw protobuf or legacy author role values to localized Vietnamese role labels. */
export function formatForumRoleName(role: string): string {
  if (!role) return "Học viên";
  const normalized = role.toUpperCase();
  if (normalized.includes("LEARNER") || normalized.includes("STUDENT") || normalized === "1") {
    return "Học viên";
  }
  if (
    normalized === "TA" ||
    normalized === "USER_ROLE_TA" ||
    normalized.includes("TEACHING ASSISTANT")
  ) {
    return "Trợ giảng (TA)";
  }
  if (normalized.includes("INSTRUCTOR") || normalized === "2") {
    return "Giảng viên";
  }
  if (normalized.includes("ADMIN") || normalized === "3") {
    return "Quản trị viên";
  }
  return role;
}

/** Append a newly created reply into an open modal thread snapshot while updating solved state. */
export function applyReplyToThreadSnapshot(
  thread: ForumThread,
  postedReply: ForumReply,
): ForumThread {
  if (thread.replies.some((reply) => reply.id === postedReply.id)) {
    return thread;
  }
  return create(ForumThreadSchema, {
    ...thread,
    isSolved: thread.isSolved || postedReply.isStaffAnswer,
    replies: [...thread.replies, postedReply],
  });
}

/** Remove a deleted reply from a thread snapshot and recalculate solved state from remaining replies. */
export function removeReplyFromThreadSnapshot(thread: ForumThread, replyId: string): ForumThread {
  if (!thread.replies.some((reply) => reply.id === replyId)) {
    return thread;
  }
  const remainingReplies = thread.replies.filter((reply) => reply.id !== replyId);
  return create(ForumThreadSchema, {
    ...thread,
    replies: remainingReplies,
    isSolved: remainingReplies.some((reply) => reply.isStaffAnswer),
  });
}

/** Toggle a reply as official staff answer inside a thread snapshot and sync pinned + solved flags. */
export function pinReplyInThreadSnapshot(thread: ForumThread, replyId: string): ForumThread {
  const target = thread.replies.find((reply) => reply.id === replyId);
  if (!target) {
    return thread;
  }
  const nextPinned = !target.isStaffAnswer;
  const updatedReplies = thread.replies.map((reply) =>
    reply.id === replyId
      ? create(ForumReplySchema, { ...reply, isStaffAnswer: nextPinned })
      : reply,
  );
  const hasAnyPinned = updatedReplies.some((reply) => reply.isStaffAnswer);
  return create(ForumThreadSchema, {
    ...thread,
    isStaffPinned: nextPinned ? true : hasAnyPinned,
    isSolved: hasAnyPinned,
    replies: updatedReplies,
  });
}

/** Toggle optimistic upvote state and count on a matching thread or reply inside a thread. */
export function applyOptimisticVoteToThread(thread: ForumThread, postId: string): ForumThread {
  if (thread.id === postId) {
    const wasVoted = thread.isUpvotedByMe;
    return create(ForumThreadSchema, {
      ...thread,
      isUpvotedByMe: !wasVoted,
      upvoteCount: wasVoted ? Math.max(0, thread.upvoteCount - 1) : thread.upvoteCount + 1,
    });
  }
  if (!thread.replies.some((reply) => reply.id === postId)) {
    return thread;
  }
  return create(ForumThreadSchema, {
    ...thread,
    replies: thread.replies.map((reply) => {
      if (reply.id !== postId) return reply;
      const wasVoted = reply.isUpvotedByMe;
      return create(ForumReplySchema, {
        ...reply,
        isUpvotedByMe: !wasVoted,
        upvoteCount: wasVoted ? Math.max(0, reply.upvoteCount - 1) : reply.upvoteCount + 1,
      });
    }),
  });
}

/** Sync server-returned upvote count onto a matching thread or reply inside a thread. */
export function applyVoteCountToThread(
  thread: ForumThread,
  postId: string,
  updatedUpvoteCount: number,
): ForumThread {
  if (thread.id === postId) {
    return create(ForumThreadSchema, { ...thread, upvoteCount: updatedUpvoteCount });
  }
  if (!thread.replies.some((reply) => reply.id === postId)) {
    return thread;
  }
  return create(ForumThreadSchema, {
    ...thread,
    replies: thread.replies.map((reply) =>
      reply.id === postId
        ? create(ForumReplySchema, { ...reply, upvoteCount: updatedUpvoteCount })
        : reply,
    ),
  });
}
