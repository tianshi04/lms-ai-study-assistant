from abc import ABC, abstractmethod
from collections.abc import Sequence

from src.modules.forum.domain.entities import ForumReplyEntity, ForumThreadEntity


class IForumRepository(ABC):
    @abstractmethod
    async def list_threads(
        self, course_id: str = "", item_id: str = "", current_user_id: str = ""
    ) -> Sequence[ForumThreadEntity]:
        """List forum threads matching course_id and optional item_id."""

    @abstractmethod
    async def get_thread_by_id(self, thread_id: str) -> ForumThreadEntity | None:
        """Get a thread by its ID including its replies."""

    @abstractmethod
    async def create_thread(self, thread: ForumThreadEntity) -> ForumThreadEntity:
        """Create a new thread."""

    @abstractmethod
    async def create_reply(self, reply: ForumReplyEntity) -> ForumReplyEntity:
        """Create a new reply for a thread."""

    @abstractmethod
    async def vote_post(
        self, post_id: str, user_id: str = "", is_upvote: bool = True
    ) -> int:
        """Vote on a thread or reply by post_id. Toggles vote per user and returns updated upvote count."""

    @abstractmethod
    async def pin_staff_answer(self, reply_id: str, ta_user_id: str) -> bool:
        """Pin a reply as staff answer."""

    @abstractmethod
    async def get_reply_by_id(self, reply_id: str) -> ForumReplyEntity | None:
        """Get a reply by its ID."""

    @abstractmethod
    async def update_thread(
        self, thread_id: str, title: str, content: str, edited_at: str
    ) -> ForumThreadEntity | None:
        """Update thread title/content and mark as edited."""

    @abstractmethod
    async def delete_thread(self, thread_id: str) -> bool:
        """Delete thread by ID."""

    @abstractmethod
    async def update_reply(
        self, reply_id: str, content: str, edited_at: str
    ) -> ForumReplyEntity | None:
        """Update reply content and mark as edited."""

    @abstractmethod
    async def delete_reply(self, reply_id: str) -> bool:
        """Delete reply by ID."""
