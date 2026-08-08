import logging
import uuid
from datetime import datetime, timezone
from typing import Sequence

from src.modules.forum.domain.constants import DEFAULT_FORUM_AUTHOR_ROLE
from src.modules.forum.domain.entities import ForumReplyEntity, ForumThreadEntity
from src.modules.forum.domain.repository import IForumRepository
from src.modules.forum.infrastructure.repository import ForumRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope


def utc_now_str() -> str:
    return datetime.now(timezone.utc).isoformat()


logger = logging.getLogger(__name__)


class ForumUseCase:
    def __init__(self, repo_factory=None) -> None:
        self.repo_factory = repo_factory or ForumRepository

    def _get_repo(self, session) -> IForumRepository:
        return self.repo_factory(session)

    async def list_threads(
        self, course_id: str = "", item_id: str = "", current_user_id: str = ""
    ) -> Sequence[ForumThreadEntity]:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            return await repo.list_threads(
                course_id=course_id, item_id=item_id, current_user_id=current_user_id
            )

    async def create_thread(
        self,
        course_id: str,
        item_id: str,
        title: str,
        content: str,
        author_user_id: str = "",
        author_name: str = "Learner",
        author_role: str = DEFAULT_FORUM_AUTHOR_ROLE,
    ) -> ForumThreadEntity:
        thread_id = str(uuid.uuid4())
        created_at = utc_now_str()

        thread_entity = ForumThreadEntity(
            id=thread_id,
            course_id=course_id,
            item_id=item_id,
            title=title,
            content=content,
            author_name=author_name,
            author_role=author_role,
            created_at=created_at,
            upvote_count=0,
            is_staff_pinned=False,
            replies=[],
            author_user_id=author_user_id,
        )

        async with async_session_scope() as session:
            repo = self._get_repo(session)
            created_thread = await repo.create_thread(thread_entity)
            logger.info(
                "User %s created forum thread %s in course %s",
                author_user_id,
                thread_id,
                course_id,
            )

            # If there is content, post it as the opening reply
            if content.strip():
                reply_entity = ForumReplyEntity(
                    id=str(uuid.uuid4()),
                    thread_id=thread_id,
                    author_name=author_name,
                    author_role=author_role,
                    content=content,
                    is_staff_answer=False,
                    upvote_count=0,
                    created_at=created_at,
                    author_user_id=author_user_id,
                )
                await repo.create_reply(reply_entity)
                # Re-fetch thread to include the reply
                reloaded = await repo.get_thread_by_id(thread_id)
                if reloaded:
                    return reloaded

            return created_thread

    async def post_reply(
        self,
        thread_id: str,
        content: str,
        author_user_id: str,
        author_name: str = "Learner",
        author_role: str = DEFAULT_FORUM_AUTHOR_ROLE,
    ) -> ForumReplyEntity:
        reply_id = str(uuid.uuid4())
        created_at = utc_now_str()

        # Determine if author is Staff/TA
        is_staff = author_role.upper() in (
            "INSTRUCTOR",
            "TEACHER",
            "TA",
            "STAFF",
            "ADMIN",
        )

        reply_entity = ForumReplyEntity(
            id=reply_id,
            thread_id=thread_id,
            author_name=author_name,
            author_role=author_role,
            content=content,
            is_staff_answer=is_staff,
            upvote_count=0,
            created_at=created_at,
            author_user_id=author_user_id,
        )

        async with async_session_scope() as session:
            repo = self._get_repo(session)
            reply = await repo.create_reply(reply_entity)
            logger.info(
                "User %s posted reply %s to thread %s",
                author_user_id,
                reply_id,
                thread_id,
            )

            # Trigger COMMUNITY notification to thread author
            try:
                thread = await repo.get_thread_by_id(thread_id)
                if thread and thread.author_user_id:
                    recipient_id = thread.author_user_id
                    if recipient_id != author_user_id:
                        from src.modules.notification.application.use_cases import (
                            NotificationUseCase,
                        )
                        from src.modules.notification.domain.constants import (
                            NotificationCategory,
                        )

                        action_url = (
                            f"/learn/{thread.course_id}?itemId={thread.item_id}&tab=forum&threadId={thread_id}"
                            if thread.item_id
                            else f"/forum?courseId={thread.course_id}&threadId={thread_id}"
                        )
                        notif_uc = NotificationUseCase()
                        await notif_uc.send_notification(
                            recipient_id=recipient_id,
                            category=NotificationCategory.COMMUNITY,
                            title=f"{author_name} đã phản hồi bài viết của bạn",
                            content=f'"{content[:100]}..."',
                            action_url=action_url,
                        )
            except Exception as e:
                logger.warning("Failed to send forum reply notification: %s", e)

            return reply

    async def vote_post(
        self, post_id: str, user_id: str = "", is_upvote: bool = True
    ) -> int:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            return await repo.vote_post(post_id, user_id=user_id, is_upvote=is_upvote)

    async def pin_staff_answer(
        self, reply_id: str, ta_user_id: str, user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            if user:
                reply = await repo.get_reply_by_id(reply_id)
                if reply:
                    thread = await repo.get_thread_by_id(reply.thread_id)
                    if thread:
                        await _verify_staff_course_moderation(
                            session, thread.course_id, user
                        )
            return await repo.pin_staff_answer(reply_id, ta_user_id)

    async def update_thread(
        self,
        thread_id: str,
        title: str,
        content: str,
        current_user_id: str,
        is_staff: bool = False,
    ) -> ForumThreadEntity | None:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            existing = await repo.get_thread_by_id(thread_id)
            if not existing:
                return None
            if existing.author_user_id and existing.author_user_id != current_user_id:
                logger.warning(
                    "User %s attempted to update thread %s owned by %s",
                    current_user_id,
                    thread_id,
                    existing.author_user_id,
                )
                raise PermissionError(
                    "Chỉ tác giả mới có quyền chỉnh sửa bài viết này."
                )
            return await repo.update_thread(
                thread_id=thread_id,
                title=title,
                content=content,
                edited_at=utc_now_str(),
            )

    async def delete_thread(
        self,
        thread_id: str,
        current_user_id: str,
        is_staff: bool = False,
        user: CurrentUser | None = None,
    ) -> bool:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            existing = await repo.get_thread_by_id(thread_id)
            if not existing:
                return False
            is_author = (
                existing.author_user_id and existing.author_user_id == current_user_id
            )
            if not is_author:
                if is_staff and user:
                    await _verify_staff_course_moderation(
                        session, existing.course_id, user
                    )
                else:
                    logger.warning(
                        "User %s attempted to delete thread %s owned by %s",
                        current_user_id,
                        thread_id,
                        existing.author_user_id,
                    )
                    raise PermissionError("Bạn không có quyền xóa bài viết này.")
            return await repo.delete_thread(thread_id)

    async def update_reply(
        self,
        reply_id: str,
        content: str,
        current_user_id: str,
        is_staff: bool = False,
    ) -> ForumReplyEntity | None:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            existing = await repo.get_reply_by_id(reply_id)
            if not existing:
                return None
            if existing.author_user_id and existing.author_user_id != current_user_id:
                logger.warning(
                    "User %s attempted to update reply %s owned by %s",
                    current_user_id,
                    reply_id,
                    existing.author_user_id,
                )
                raise PermissionError(
                    "Chỉ tác giả mới có quyền chỉnh sửa bình luận này."
                )
            return await repo.update_reply(
                reply_id=reply_id, content=content, edited_at=utc_now_str()
            )

    async def delete_reply(
        self,
        reply_id: str,
        current_user_id: str,
        is_staff: bool = False,
        user: CurrentUser | None = None,
    ) -> bool:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            existing = await repo.get_reply_by_id(reply_id)
            if not existing:
                return False
            is_author = (
                existing.author_user_id and existing.author_user_id == current_user_id
            )
            if not is_author:
                if is_staff and user:
                    thread = await repo.get_thread_by_id(existing.thread_id)
                    course_id = thread.course_id if thread else ""
                    await _verify_staff_course_moderation(session, course_id, user)
                else:
                    logger.warning(
                        "User %s attempted to delete reply %s owned by %s",
                        current_user_id,
                        reply_id,
                        existing.author_user_id,
                    )
                    raise PermissionError("Bạn không có quyền xóa bình luận này.")
            return await repo.delete_reply(reply_id)


async def _verify_staff_course_moderation(
    session, course_id: str, user: CurrentUser
) -> None:
    if not user:
        return
    if user.is_admin:
        return
    if course_id:
        from src.modules.catalog.domain.repository import ICatalogRepository
        from src.modules.catalog.infrastructure.repository import (
            SQLAlchemyCatalogRepository,
        )

        catalog_repo: ICatalogRepository = SQLAlchemyCatalogRepository(session)
        course = await catalog_repo.get_course_detail(course_id)
        if course:
            if not course.can_edit(user, allow_read_only_pending=True):
                raise PermissionError(
                    "Bạn không có quyền kiểm duyệt diễn đàn khóa học này."
                )
