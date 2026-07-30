from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.forum.v1 import forum_pb as pb
from src.gen.forum.v1.forum_connect import ForumService
from src.modules.forum.application.forum_usecase import ForumUseCase
from src.modules.forum.domain.entities import ForumReplyEntity, ForumThreadEntity
from src.shared.auth import require_current_user


ROLE_MAP = {
    "USER_ROLE_LEARNER": "Learner",
    "USER_ROLE_INSTRUCTOR": "Instructor",
    "USER_ROLE_TA": "Teaching Assistant",
    "USER_ROLE_SUPER_ADMIN": "Super Admin",
    "USER_ROLE_PARTNER_ADMIN": "Partner Admin",
    "1": "Learner",
    "2": "Instructor",
    "3": "Teaching Assistant",
    "4": "Super Admin",
    "5": "Partner Admin",
}


def _format_author_role(role: str) -> str:
    if not role:
        return "Learner"
    return ROLE_MAP.get(role, role)


def _to_pb_reply(reply: ForumReplyEntity) -> pb.ForumReply:
    return pb.ForumReply(
        id=reply.id,
        thread_id=reply.thread_id,
        author_name=reply.author_name,
        author_role=_format_author_role(reply.author_role),
        content=reply.content,
        is_staff_answer=reply.is_staff_answer,
        upvote_count=reply.upvote_count,
        created_at=reply.created_at,
        is_upvoted_by_me=reply.is_upvoted_by_me,
        is_edited=reply.is_edited,
        edited_at=reply.edited_at,
        author_user_id=reply.author_user_id,
    )


def _to_pb_thread(thread: ForumThreadEntity) -> pb.ForumThread:
    return pb.ForumThread(
        id=thread.id,
        course_id=thread.course_id,
        item_id=thread.item_id,
        title=thread.title,
        content=thread.content,
        author_name=thread.author_name,
        author_role=_format_author_role(thread.author_role),
        created_at=thread.created_at,
        upvote_count=thread.upvote_count,
        is_staff_pinned=thread.is_staff_pinned,
        replies=[_to_pb_reply(r) for r in thread.replies],
        is_upvoted_by_me=thread.is_upvoted_by_me,
        is_edited=thread.is_edited,
        edited_at=thread.edited_at,
        author_user_id=thread.author_user_id,
    )


class ForumHandler(ForumService):
    def __init__(self, use_case: ForumUseCase) -> None:
        self.use_case = use_case

    async def list_threads(
        self,
        request: pb.ListThreadsRequest,
        ctx: RequestContext[pb.ListThreadsRequest, pb.ListThreadsResponse],
    ) -> pb.ListThreadsResponse:
        current_user = require_current_user()
        threads = await self.use_case.list_threads(
            course_id=request.course_id,
            item_id=request.item_id,
            current_user_id=current_user.id,
        )
        return pb.ListThreadsResponse(threads=[_to_pb_thread(t) for t in threads])

    async def create_thread(
        self,
        request: pb.CreateThreadRequest,
        ctx: RequestContext[pb.CreateThreadRequest, pb.CreateThreadResponse],
    ) -> pb.CreateThreadResponse:
        if not request.title.strip():
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Tiêu đề thảo luận không được để trống"
            )

        current_user = require_current_user()
        author_name = (
            current_user.email.split("@")[0] if current_user.email else current_user.id
        )

        thread = await self.use_case.create_thread(
            course_id=request.course_id,
            item_id=request.item_id,
            title=request.title,
            content=request.content,
            author_user_id=current_user.id,
            author_name=author_name,
            author_role=_format_author_role(current_user.role),
        )
        return pb.CreateThreadResponse(thread=_to_pb_thread(thread))

    async def post_reply(
        self,
        request: pb.PostReplyRequest,
        ctx: RequestContext[pb.PostReplyRequest, pb.PostReplyResponse],
    ) -> pb.PostReplyResponse:
        if not request.content.strip():
            raise ConnectError(
                Code.INVALID_ARGUMENT, "Nội dung phản hồi không được để trống"
            )

        current_user = require_current_user()
        author_name = (
            current_user.email.split("@")[0] if current_user.email else current_user.id
        )

        reply = await self.use_case.post_reply(
            thread_id=request.thread_id,
            content=request.content,
            author_user_id=current_user.id,
            author_name=author_name,
            author_role=_format_author_role(current_user.role),
        )
        return pb.PostReplyResponse(reply=_to_pb_reply(reply))

    async def vote_post(
        self,
        request: pb.VotePostRequest,
        ctx: RequestContext[pb.VotePostRequest, pb.VotePostResponse],
    ) -> pb.VotePostResponse:
        current_user = require_current_user()

        new_count = await self.use_case.vote_post(
            post_id=request.post_id,
            user_id=current_user.id,
            is_upvote=request.is_upvote,
        )
        return pb.VotePostResponse(updated_upvote_count=new_count)

    async def pin_staff_answer(
        self,
        request: pb.PinStaffAnswerRequest,
        ctx: RequestContext[pb.PinStaffAnswerRequest, pb.PinStaffAnswerResponse],
    ) -> pb.PinStaffAnswerResponse:
        current_user = require_current_user()
        role = current_user.role

        normalized_role = str(role).lower()
        is_staff = any(
            r in normalized_role
            for r in ("ta", "teaching assistant", "instructor", "staff", "admin")
        ) or role in (
            "USER_ROLE_INSTRUCTOR",
            "USER_ROLE_SUPER_ADMIN",
            "USER_ROLE_PARTNER_ADMIN",
        )

        if not is_staff:
            raise ConnectError(
                Code.PERMISSION_DENIED,
                "Chỉ Trợ giảng (TA) hoặc Giảng viên mới có quyền ghim câu trả lời chính thức.",
            )

        success = await self.use_case.pin_staff_answer(
            reply_id=request.reply_id, ta_user_id=current_user.id, user=current_user
        )
        return pb.PinStaffAnswerResponse(success=success)

    async def update_thread(
        self,
        request: pb.UpdateThreadRequest,
        ctx: RequestContext[pb.UpdateThreadRequest, pb.UpdateThreadResponse],
    ) -> pb.UpdateThreadResponse:
        current_user = require_current_user()
        role = current_user.role.lower()
        is_staff = any(
            r in role
            for r in ("ta", "teaching assistant", "instructor", "staff", "admin")
        )
        try:
            thread = await self.use_case.update_thread(
                thread_id=request.thread_id,
                title=request.title,
                content=request.content,
                current_user_id=current_user.id,
                is_staff=is_staff,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        if not thread:
            raise ConnectError(
                Code.NOT_FOUND, f"Bài viết {request.thread_id} không tồn tại."
            )
        return pb.UpdateThreadResponse(thread=_to_pb_thread(thread))

    async def delete_thread(
        self,
        request: pb.DeleteThreadRequest,
        ctx: RequestContext[pb.DeleteThreadRequest, pb.DeleteThreadResponse],
    ) -> pb.DeleteThreadResponse:
        current_user = require_current_user()
        role = current_user.role.lower()
        is_staff = any(
            r in role
            for r in ("ta", "teaching assistant", "instructor", "staff", "admin")
        )
        try:
            success = await self.use_case.delete_thread(
                thread_id=request.thread_id,
                current_user_id=current_user.id,
                is_staff=is_staff,
                user=current_user,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        return pb.DeleteThreadResponse(success=success)

    async def update_reply(
        self,
        request: pb.UpdateReplyRequest,
        ctx: RequestContext[pb.UpdateReplyRequest, pb.UpdateReplyResponse],
    ) -> pb.UpdateReplyResponse:
        current_user = require_current_user()
        role = current_user.role.lower()
        is_staff = any(
            r in role
            for r in ("ta", "teaching assistant", "instructor", "staff", "admin")
        )
        try:
            reply = await self.use_case.update_reply(
                reply_id=request.reply_id,
                content=request.content,
                current_user_id=current_user.id,
                is_staff=is_staff,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        if not reply:
            raise ConnectError(
                Code.NOT_FOUND, f"Bình luận {request.reply_id} không tồn tại."
            )
        return pb.UpdateReplyResponse(reply=_to_pb_reply(reply))

    async def delete_reply(
        self,
        request: pb.DeleteReplyRequest,
        ctx: RequestContext[pb.DeleteReplyRequest, pb.DeleteReplyResponse],
    ) -> pb.DeleteReplyResponse:
        current_user = require_current_user()
        role = current_user.role.lower()
        is_staff = any(
            r in role
            for r in ("ta", "teaching assistant", "instructor", "staff", "admin")
        )
        try:
            success = await self.use_case.delete_reply(
                reply_id=request.reply_id,
                current_user_id=current_user.id,
                is_staff=is_staff,
                user=current_user,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e))
        return pb.DeleteReplyResponse(success=success)
