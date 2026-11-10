import logging
from collections.abc import Callable, Sequence
from datetime import UTC, datetime
from typing import Any

from uuid6 import uuid7

from src.modules.catalog.domain import ICatalogRepository
from src.modules.forum.domain import (
    DEFAULT_FORUM_AUTHOR_ROLE,
    ForumReplyCreatedDomainEvent,
    ForumReplyEntity,
    ForumThreadEntity,
    IForumRepository,
)
from src.modules.forum.infrastructure.repository import ForumRepository
from src.modules.learning.domain import ILearningRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.event_bus import EventBus


def _default_catalog_repo_factory(session: Any) -> ICatalogRepository:
    from src.modules.catalog.infrastructure.repository import (
        SQLAlchemyCatalogRepository,
    )

    return SQLAlchemyCatalogRepository(session)


def _default_learning_repo_factory(session: Any) -> ILearningRepository:
    from src.modules.learning.infrastructure.repository import (
        SQLAlchemyLearningRepository,
    )

    return SQLAlchemyLearningRepository(session)


def utc_now_str() -> str:
    return datetime.now(UTC).isoformat()


logger = logging.getLogger(__name__)


class ForumUseCase:
    def __init__(
        self,
        repo_factory: Any = None,
        catalog_repo_factory: Callable[[Any], Any] | None = None,
        learning_repo_factory: Callable[[Any], Any] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or ForumRepository
        self.catalog_repo_factory = (
            catalog_repo_factory or _default_catalog_repo_factory
        )
        self.learning_repo_factory = (
            learning_repo_factory or _default_learning_repo_factory
        )

    def _get_repo(self, session) -> IForumRepository:
        return self.repo_factory(session)

    async def _resolve_course_role_and_enforce_enrollment(
        self,
        session: Any,
        course_id: str,
        user: CurrentUser | None,
        author_user_id: str = "",
        action_name: str = "tham gia thảo luận",
    ) -> tuple[str, bool]:
        """Resolves the user's role within the course context and verifies enrollment.

        Returns:
            (contextual_role: str, is_staff: bool)

        Rules:
        1. If user is Super Admin -> Role is 'Admin', is_staff = True.
        2. If user is course owner, co-instructor, or TA -> Role is 'Instructor' / 'TA', is_staff = True.
        3. Otherwise, the user is a Learner in this course (regardless of whether they have
           an Instructor role on other courses).
        4. If the user is a Learner, they MUST be enrolled in the course. If not enrolled,
           raises PermissionError.
        """
        if not course_id:
            is_staff_global = bool(
                user
                and (
                    getattr(user, "is_admin", False) or getattr(user, "is_staff", False)
                )
            )
            role = (
                "Admin"
                if (user and user.is_admin)
                else ("Instructor" if is_staff_global else DEFAULT_FORUM_AUTHOR_ROLE)
            )
            return role, is_staff_global

        catalog_repo: ICatalogRepository = self.catalog_repo_factory(session)
        course = await catalog_repo.get_course_detail(course_id)
        if not course:
            raise ValueError(f"Khóa học '{course_id}' không tồn tại.")

        # 1. Super Admin
        if user and getattr(user, "is_admin", False):
            return "Admin", True

        # 2. Course Staff (Owner, Co-instructor, TA)
        if user:
            owner_id = getattr(course, "owner_id", "")
            co_instructors = getattr(course, "co_instructor_ids", []) or []
            ta_ids = getattr(course, "ta_ids", []) or []

            if (owner_id and user.id == owner_id) or (user.id in co_instructors):
                return "Instructor", True
            if user.id in ta_ids:
                return "TA", True

        # 3. User is not staff in this course -> must be a Learner with active enrollment
        actual_user_id = (user.id if user else "") or author_user_id
        if not actual_user_id:
            raise PermissionError("Vui lòng đăng nhập để tham gia thảo luận.")

        learning_repo: ILearningRepository = self.learning_repo_factory(session)
        is_enrolled = await learning_repo.check_enrollment(actual_user_id, course.id)
        if not is_enrolled:
            raise PermissionError(
                f"Bạn cần đăng ký khóa học '{course.title}' để {action_name}."
            )

        return DEFAULT_FORUM_AUTHOR_ROLE, False

    async def list_threads(
        self,
        course_id: str = "",
        item_id: str = "",
        current_user_id: str = "",
        user: CurrentUser | None = None,
    ) -> Sequence[ForumThreadEntity]:
        normalized_course_id = (
            "" if not course_id or course_id.upper() == "ALL" else course_id
        )

        async with async_session_scope() as session:
            # 1. Super Admin bypasses scope filtering
            if user and getattr(user, "is_admin", False):
                repo = self._get_repo(session)
                return await repo.list_threads(
                    course_id=normalized_course_id,
                    item_id=item_id,
                    current_user_id=current_user_id or user.id,
                )

            # 2. For non-admin users, resolve their accessible courses
            actual_user_id = (user.id if user else "") or current_user_id
            accessible_course_ids: set[str] = set()

            if actual_user_id:
                learning_repo: ILearningRepository = self.learning_repo_factory(session)
                enrolled = await learning_repo.list_enrolled_courses(actual_user_id)
                accessible_course_ids.update(s.course_id for s in enrolled)

                # If instructor or staff, include their teaching courses
                if user and (
                    getattr(user, "is_staff", False)
                    or getattr(user, "role", "") == "USER_ROLE_INSTRUCTOR"
                ):
                    catalog_repo: ICatalogRepository = self.catalog_repo_factory(
                        session
                    )
                    teaching_courses, _ = await catalog_repo.list_instructor_courses(
                        instructor_id=actual_user_id, page_size=200
                    )
                    accessible_course_ids.update(c.id for c in teaching_courses)

            # If user explicitly requests a specific course
            if normalized_course_id:
                if normalized_course_id not in accessible_course_ids:
                    logger.info(
                        "User %s attempted to list threads for inaccessible course %s",
                        actual_user_id,
                        normalized_course_id,
                    )
                    return []
                repo = self._get_repo(session)
                return await repo.list_threads(
                    course_id=normalized_course_id,
                    item_id=item_id,
                    current_user_id=actual_user_id,
                )

            # If viewing all courses (feed), restrict strictly to accessible_course_ids
            if not accessible_course_ids:
                return []

            repo = self._get_repo(session)
            return await repo.list_threads(
                course_id="",
                item_id=item_id,
                current_user_id=actual_user_id,
                course_ids=list(accessible_course_ids),
            )

    async def create_thread(
        self,
        course_id: str,
        item_id: str,
        title: str,
        content: str,
        author_user_id: str = "",
        author_name: str = "Learner",
        user: CurrentUser | None = None,
    ) -> ForumThreadEntity:
        async with async_session_scope() as session:
            # Contextual role resolution & enrollment enforcement
            (
                contextual_role,
                is_staff,
            ) = await self._resolve_course_role_and_enforce_enrollment(
                session=session,
                course_id=course_id,
                user=user,
                author_user_id=author_user_id,
                action_name="tạo chủ đề thảo luận",
            )

            thread_id = str(uuid7())
            created_at = utc_now_str()

            thread_entity = ForumThreadEntity(
                id=thread_id,
                course_id=course_id,
                item_id=item_id,
                title=title,
                content=content,
                author_name=author_name,
                author_role=contextual_role,
                created_at=created_at,
                upvote_count=0,
                is_staff_pinned=False,
                replies=[],
                author_user_id=author_user_id,
            )

            repo = self._get_repo(session)
            created_thread = await repo.create_thread(thread_entity)
            logger.info(
                "User %s created forum thread %s in course %s (role: %s, staff: %s)",
                author_user_id,
                thread_id,
                course_id,
                contextual_role,
                is_staff,
            )

            # If there is content, post it as the opening reply
            if content.strip():
                reply_entity = ForumReplyEntity(
                    id=str(uuid7()),
                    thread_id=thread_id,
                    author_name=author_name,
                    author_role=contextual_role,
                    content=content,
                    is_staff_answer=is_staff,
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
        user: CurrentUser | None = None,
    ) -> ForumReplyEntity:
        reply_id = str(uuid7())
        created_at = utc_now_str()

        async with async_session_scope() as session:
            repo = self._get_repo(session)
            thread = await repo.get_thread_by_id(thread_id)
            if not thread:
                raise ValueError(f"Chủ đề thảo luận {thread_id} không tồn tại.")

            # Contextual role resolution & enrollment enforcement
            (
                contextual_role,
                is_staff,
            ) = await self._resolve_course_role_and_enforce_enrollment(
                session=session,
                course_id=thread.course_id,
                user=user,
                author_user_id=author_user_id,
                action_name="gửi phản hồi thảo luận",
            )

            reply_entity = ForumReplyEntity(
                id=reply_id,
                thread_id=thread_id,
                author_name=author_name,
                author_role=contextual_role,
                content=content,
                is_staff_answer=is_staff,
                upvote_count=0,
                created_at=created_at,
                author_user_id=author_user_id,
            )

            reply = await repo.create_reply(reply_entity)
            logger.info(
                "User %s posted reply %s to thread %s (role: %s, is_staff_answer: %s)",
                author_user_id,
                reply_id,
                thread_id,
                contextual_role,
                is_staff,
            )

            # Trigger domain event
            if thread and thread.author_user_id:
                await EventBus.publish(
                    ForumReplyCreatedDomainEvent(
                        thread_id=thread_id,
                        reply_id=reply.id,
                        author_id=author_user_id,
                        author_name=author_name,
                        thread_author_id=thread.author_user_id,
                        content=content,
                        course_id=thread.course_id,
                        item_id=thread.item_id or "",
                    )
                )

            return reply

    async def vote_post(
        self, post_id: str, user_id: str, is_upvote: bool = True
    ) -> int:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            return await repo.vote_post(post_id, user_id=user_id, is_upvote=is_upvote)

    async def pin_staff_answer(
        self, reply_id: str, ta_user_id: str, user: CurrentUser | None = None
    ) -> bool:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            reply = await repo.get_reply_by_id(reply_id)
            if not reply:
                raise ValueError("Bình luận không tồn tại.")
            thread = await repo.get_thread_by_id(reply.thread_id)
            if not thread:
                raise ValueError("Chủ đề không tồn tại.")

            if not user:
                raise PermissionError(
                    "Yêu cầu thông tin người dùng xác thực để ghim câu trả lời."
                )
            await self._verify_staff_course_moderation(session, thread.course_id, user)
            return await repo.pin_staff_answer(reply_id, ta_user_id)

    async def pin_thread(
        self, thread_id: str, is_pinned: bool, user: CurrentUser | None = None
    ) -> ForumThreadEntity:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            thread = await repo.get_thread_by_id(thread_id)
            if not thread:
                raise ValueError("Chủ đề không tồn tại.")

            if not user:
                raise PermissionError(
                    "Yêu cầu thông tin người dùng xác thực để ghim chủ đề."
                )
            await self._verify_staff_course_moderation(session, thread.course_id, user)
            updated = await repo.pin_thread(thread_id, is_pinned)
            if not updated:
                raise ValueError("Không thể cập nhật trạng thái ghim bài viết này.")
            return updated

    async def update_thread(
        self,
        thread_id: str,
        title: str,
        content: str,
        current_user_id: str,
    ) -> ForumThreadEntity | None:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            existing = await repo.get_thread_by_id(thread_id)
            if not existing:
                return None
            if (
                not existing.author_user_id
                or existing.author_user_id != current_user_id
            ):
                logger.warning(
                    "User %s attempted to update thread %s owned by %s",
                    current_user_id,
                    thread_id,
                    existing.author_user_id,
                )
                raise PermissionError(
                    "Chỉ tác giả mới có quyền chỉnh sửa bài viết này."
                )
            existing.edit(new_title=title, new_content=content, edited_at=utc_now_str())
            return await repo.update_thread(
                thread_id=thread_id,
                title=existing.title,
                content=existing.content,
                edited_at=existing.edited_at,
            )

    async def delete_thread(
        self,
        thread_id: str,
        current_user_id: str,
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
                if user:
                    await self._verify_staff_course_moderation(
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
    ) -> ForumReplyEntity | None:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            existing = await repo.get_reply_by_id(reply_id)
            if not existing:
                return None
            if existing.author_user_id and existing.author_user_id != current_user_id:
                raise PermissionError(
                    "Chỉ tác giả mới có quyền chỉnh sửa bình luận này."
                )
            existing.edit(new_content=content, edited_at=utc_now_str())
            return await repo.update_reply(
                reply_id=reply_id,
                content=existing.content,
                edited_at=existing.edited_at,
            )

    async def delete_reply(
        self,
        reply_id: str,
        current_user_id: str,
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
                if user:
                    thread = await repo.get_thread_by_id(existing.thread_id)
                    course_id = thread.course_id if thread else ""
                    await self._verify_staff_course_moderation(session, course_id, user)
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
        self, session, course_id: str, user: CurrentUser
    ) -> None:
        if getattr(user, "is_admin", False):
            return
        if not course_id:
            raise PermissionError(
                "Không thể xác thực quyền kiểm duyệt diễn đàn không rõ khóa học."
            )
        catalog_repo: ICatalogRepository = self.catalog_repo_factory(session)
        course = await catalog_repo.get_course_detail(course_id)
        if not course or not course.can_edit(user, allow_read_only_pending=True):
            raise PermissionError(
                "Bạn không có quyền kiểm duyệt diễn đàn khóa học này."
            )
