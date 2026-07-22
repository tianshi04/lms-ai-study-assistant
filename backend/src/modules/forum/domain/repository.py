from abc import ABC, abstractmethod
from typing import Sequence
from src.modules.forum.domain.entities import ForumReplyEntity, ForumThreadEntity


class IForumRepository(ABC):
    @abstractmethod
    async def list_threads(
        self, course_id: str = "", item_id: str = "", current_user_id: str = ""
    ) -> Sequence[ForumThreadEntity]:
        """List forum threads matching course_id and optional item_id."""
        pass

    @abstractmethod
    async def get_thread_by_id(self, thread_id: str) -> ForumThreadEntity | None:
        """Get a thread by its ID including its replies."""
        pass

    @abstractmethod
    async def create_thread(self, thread: ForumThreadEntity) -> ForumThreadEntity:
        """Create a new thread."""
        pass

    @abstractmethod
    async def create_reply(self, reply: ForumReplyEntity) -> ForumReplyEntity:
        """Create a new reply for a thread."""
        pass

    @abstractmethod
    async def vote_post(self, post_id: str, user_id: str = "", is_upvote: bool = True) -> int:
        """Vote on a thread or reply by post_id. Toggles vote per user and returns updated upvote count."""
        pass

    @abstractmethod
    async def pin_staff_answer(self, reply_id: str, ta_user_id: str) -> bool:
        """Pin a reply as staff answer."""
        pass
