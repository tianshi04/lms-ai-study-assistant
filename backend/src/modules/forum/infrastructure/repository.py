from typing import Sequence
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.forum.domain.entities import ForumReplyEntity, ForumThreadEntity
from src.modules.forum.domain.repository import IForumRepository
from src.modules.forum.infrastructure.models import (
    ForumReplyORM,
    ForumThreadORM,
    ForumVoteORM,
)


class ForumRepository(IForumRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _to_reply_entity(
        self, orm: ForumReplyORM, voted_post_ids: set[str] | None = None
    ) -> ForumReplyEntity:
        is_voted = (orm.id in voted_post_ids) if voted_post_ids else False
        return ForumReplyEntity(
            id=orm.id,
            thread_id=orm.thread_id,
            author_name=orm.author_name,
            author_role=orm.author_role,
            content=orm.content,
            is_staff_answer=orm.is_staff_answer,
            upvote_count=orm.upvote_count,
            created_at=orm.created_at,
            is_upvoted_by_me=is_voted,
            is_edited=orm.is_edited,
            edited_at=orm.edited_at,
            author_user_id=orm.author_user_id,
        )

    def _to_thread_entity(
        self, orm: ForumThreadORM, voted_post_ids: set[str] | None = None
    ) -> ForumThreadEntity:
        replies = [self._to_reply_entity(r, voted_post_ids) for r in orm.replies]
        is_voted = (orm.id in voted_post_ids) if voted_post_ids else False
        return ForumThreadEntity(
            id=orm.id,
            course_id=orm.course_id,
            item_id=orm.item_id,
            title=orm.title,
            content=orm.content,
            author_name=orm.author_name,
            author_role=orm.author_role,
            created_at=orm.created_at,
            upvote_count=orm.upvote_count,
            is_staff_pinned=orm.is_staff_pinned,
            replies=replies,
            is_upvoted_by_me=is_voted,
            is_edited=orm.is_edited,
            edited_at=orm.edited_at,
            author_user_id=orm.author_user_id,
        )

    async def list_threads(
        self, course_id: str = "", item_id: str = "", current_user_id: str = ""
    ) -> Sequence[ForumThreadEntity]:
        voted_post_ids: set[str] = set()
        if current_user_id:
            vote_stmt = select(ForumVoteORM.post_id).where(
                ForumVoteORM.user_id == current_user_id
            )
            v_res = await self.session.execute(vote_stmt)
            voted_post_ids = set(v_res.scalars().all())

        query = select(ForumThreadORM).options(selectinload(ForumThreadORM.replies))
        if course_id:
            query = query.where(ForumThreadORM.course_id == course_id)
        if item_id:
            query = query.where(ForumThreadORM.item_id == item_id)

        query = query.order_by(
            ForumThreadORM.is_staff_pinned.desc(),
            ForumThreadORM.created_at.desc(),
        )

        result = await self.session.execute(query)
        orms = result.scalars().all()
        return [self._to_thread_entity(orm, voted_post_ids) for orm in orms]

    async def get_thread_by_id(self, thread_id: str) -> ForumThreadEntity | None:
        query = (
            select(ForumThreadORM)
            .options(selectinload(ForumThreadORM.replies))
            .where(ForumThreadORM.id == thread_id)
        )
        result = await self.session.execute(query)
        orm = result.scalar_one_or_none()
        if not orm:
            return None
        return self._to_thread_entity(orm)

    async def get_reply_by_id(self, reply_id: str) -> ForumReplyEntity | None:
        query = select(ForumReplyORM).where(ForumReplyORM.id == reply_id)
        result = await self.session.execute(query)
        orm = result.scalar_one_or_none()
        if not orm:
            return None
        return self._to_reply_entity(orm)

    async def create_thread(self, thread: ForumThreadEntity) -> ForumThreadEntity:
        orm = ForumThreadORM(
            id=thread.id,
            course_id=thread.course_id,
            item_id=thread.item_id,
            title=thread.title,
            content=thread.content,
            author_name=thread.author_name,
            author_role=thread.author_role,
            author_user_id=thread.author_user_id,
            created_at=thread.created_at,
            upvote_count=thread.upvote_count,
            is_staff_pinned=thread.is_staff_pinned,
            is_edited=thread.is_edited,
            edited_at=thread.edited_at,
        )
        self.session.add(orm)
        await self.session.commit()

        # Reload with replies relationship
        reloaded = await self.get_thread_by_id(orm.id)
        return reloaded or self._to_thread_entity(orm)

    async def update_thread(
        self, thread_id: str, title: str, content: str, edited_at: str
    ) -> ForumThreadEntity | None:
        stmt = select(ForumThreadORM).where(ForumThreadORM.id == thread_id)
        res = await self.session.execute(stmt)
        orm = res.scalar_one_or_none()
        if not orm:
            return None
        if title:
            orm.title = title
        if content:
            orm.content = content
        orm.is_edited = True
        orm.edited_at = edited_at
        await self.session.commit()
        return await self.get_thread_by_id(thread_id)

    async def delete_thread(self, thread_id: str) -> bool:
        stmt = select(ForumThreadORM).where(ForumThreadORM.id == thread_id)
        res = await self.session.execute(stmt)
        orm = res.scalar_one_or_none()
        if not orm:
            return False
        await self.session.delete(orm)
        await self.session.commit()
        return True

    async def create_reply(self, reply: ForumReplyEntity) -> ForumReplyEntity:
        orm = ForumReplyORM(
            id=reply.id,
            thread_id=reply.thread_id,
            author_name=reply.author_name,
            author_role=reply.author_role,
            author_user_id=reply.author_user_id,
            content=reply.content,
            is_staff_answer=reply.is_staff_answer,
            upvote_count=reply.upvote_count,
            created_at=reply.created_at,
            is_edited=reply.is_edited,
            edited_at=reply.edited_at,
        )
        self.session.add(orm)
        await self.session.commit()

        return self._to_reply_entity(orm)

    async def update_reply(
        self, reply_id: str, content: str, edited_at: str
    ) -> ForumReplyEntity | None:
        stmt = select(ForumReplyORM).where(ForumReplyORM.id == reply_id)
        res = await self.session.execute(stmt)
        orm = res.scalar_one_or_none()
        if not orm:
            return None
        if content:
            orm.content = content
        orm.is_edited = True
        orm.edited_at = edited_at
        await self.session.commit()
        return self._to_reply_entity(orm)

    async def delete_reply(self, reply_id: str) -> bool:
        stmt = select(ForumReplyORM).where(ForumReplyORM.id == reply_id)
        res = await self.session.execute(stmt)
        orm = res.scalar_one_or_none()
        if not orm:
            return False
        await self.session.delete(orm)
        await self.session.commit()
        return True
        self.session.add(orm)
        await self.session.commit()

        return self._to_reply_entity(orm)

    async def _get_post_upvote_count(self, post_id: str) -> int:
        thread_stmt = select(ForumThreadORM.upvote_count).where(
            ForumThreadORM.id == post_id
        )
        res = await self.session.execute(thread_stmt)
        count = res.scalar_one_or_none()
        if count is not None:
            return count

        reply_stmt = select(ForumReplyORM.upvote_count).where(
            ForumReplyORM.id == post_id
        )
        res = await self.session.execute(reply_stmt)
        count = res.scalar_one_or_none()
        if count is not None:
            return count

        return 0

    async def vote_post(
        self, post_id: str, user_id: str = "", is_upvote: bool = True
    ) -> int:
        delta = 1
        if user_id:
            # Check if user has already voted on this post
            vote_stmt = select(ForumVoteORM).where(
                ForumVoteORM.user_id == user_id, ForumVoteORM.post_id == post_id
            )
            v_res = await self.session.execute(vote_stmt)
            existing_vote = v_res.scalar_one_or_none()

            if existing_vote:
                # Already voted -> Toggle off / Cancel vote
                await self.session.delete(existing_vote)
                delta = -1
            else:
                # First time voting -> Record vote
                new_vote = ForumVoteORM(user_id=user_id, post_id=post_id)
                self.session.add(new_vote)
                delta = 1
        else:
            delta = 1 if is_upvote else -1

        try:
            # Apply delta to thread or reply
            thread_stmt = select(ForumThreadORM).where(ForumThreadORM.id == post_id)
            res = await self.session.execute(thread_stmt)
            thread_orm = res.scalar_one_or_none()
            if thread_orm:
                new_count = max(0, thread_orm.upvote_count + delta)
                thread_orm.upvote_count = new_count
                await self.session.commit()
                return new_count

            reply_stmt = select(ForumReplyORM).where(ForumReplyORM.id == post_id)
            res = await self.session.execute(reply_stmt)
            reply_orm = res.scalar_one_or_none()
            if reply_orm:
                new_count = max(0, reply_orm.upvote_count + delta)
                reply_orm.upvote_count = new_count
                await self.session.commit()
                return new_count
        except IntegrityError:
            await self.session.rollback()
            return await self._get_post_upvote_count(post_id)

        return 0

    async def pin_staff_answer(self, reply_id: str, ta_user_id: str) -> bool:
        stmt = select(ForumReplyORM).where(ForumReplyORM.id == reply_id)
        res = await self.session.execute(stmt)
        reply_orm = res.scalar_one_or_none()
        if not reply_orm:
            return False

        reply_orm.is_staff_answer = True

        # Mark thread as staff pinned
        thread_stmt = select(ForumThreadORM).where(
            ForumThreadORM.id == reply_orm.thread_id
        )
        t_res = await self.session.execute(thread_stmt)
        thread_orm = t_res.scalar_one_or_none()
        if thread_orm:
            thread_orm.is_staff_pinned = True

        await self.session.commit()
        return True
