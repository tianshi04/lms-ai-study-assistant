import uuid
from datetime import datetime, timezone
from typing import Sequence

from src.modules.forum.domain.entities import ForumReplyEntity, ForumThreadEntity
from src.modules.forum.domain.repository import IForumRepository
from src.modules.forum.infrastructure.repository import ForumRepository
from src.shared.infrastructure.database import async_session_scope


def utc_now_str() -> str:
    return datetime.now(timezone.utc).isoformat()


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
        author_user_id: str,
        author_name: str = "Learner",
        author_role: str = "Student",
    ) -> ForumThreadEntity:
        thread_id = str(uuid.uuid4())
        created_at = utc_now_str()

        # If initial content is provided, create a first reply or set up thread
        thread_entity = ForumThreadEntity(
            id=thread_id,
            course_id=course_id,
            item_id=item_id,
            title=title,
            author_name=author_name,
            author_role=author_role,
            created_at=created_at,
            upvote_count=0,
            is_staff_pinned=False,
            replies=[],
        )

        async with async_session_scope() as session:
            repo = self._get_repo(session)
            created_thread = await repo.create_thread(thread_entity)

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
        author_role: str = "Student",
    ) -> ForumReplyEntity:
        reply_id = str(uuid.uuid4())
        created_at = utc_now_str()

        # Determine if author is Staff/TA
        is_staff = author_role.lower() in ("ta", "teaching assistant", "instructor", "staff")

        reply_entity = ForumReplyEntity(
            id=reply_id,
            thread_id=thread_id,
            author_name=author_name,
            author_role=author_role,
            content=content,
            is_staff_answer=is_staff,
            upvote_count=0,
            created_at=created_at,
        )

        async with async_session_scope() as session:
            repo = self._get_repo(session)
            return await repo.create_reply(reply_entity)

    async def vote_post(self, post_id: str, user_id: str = "", is_upvote: bool = True) -> int:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            return await repo.vote_post(post_id, user_id=user_id, is_upvote=is_upvote)

    async def pin_staff_answer(self, reply_id: str, ta_user_id: str) -> bool:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            return await repo.pin_staff_answer(reply_id, ta_user_id)
