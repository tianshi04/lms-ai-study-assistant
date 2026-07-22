from dataclasses import dataclass
from src.shared.domain.base import Entity


@dataclass
class ForumReplyEntity(Entity):
    def __init__(
        self,
        id: str,
        thread_id: str,
        author_name: str,
        author_role: str,
        content: str,
        is_staff_answer: bool = False,
        upvote_count: int = 0,
        created_at: str = "",
        is_upvoted_by_me: bool = False,
    ) -> None:
        super().__init__(id=id)
        self.thread_id = thread_id
        self.author_name = author_name
        self.author_role = author_role
        self.content = content
        self.is_staff_answer = is_staff_answer
        self.upvote_count = upvote_count
        self.created_at = created_at
        self.is_upvoted_by_me = is_upvoted_by_me


@dataclass
class ForumThreadEntity(Entity):
    def __init__(
        self,
        id: str,
        course_id: str,
        item_id: str,
        title: str,
        author_name: str,
        author_role: str,
        created_at: str = "",
        upvote_count: int = 0,
        is_staff_pinned: bool = False,
        replies: list[ForumReplyEntity] | None = None,
        is_upvoted_by_me: bool = False,
    ) -> None:
        super().__init__(id=id)
        self.course_id = course_id
        self.item_id = item_id
        self.title = title
        self.author_name = author_name
        self.author_role = author_role
        self.created_at = created_at
        self.upvote_count = upvote_count
        self.is_staff_pinned = is_staff_pinned
        self.replies = replies or []
        self.is_upvoted_by_me = is_upvoted_by_me
