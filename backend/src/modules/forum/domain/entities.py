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
        is_edited: bool = False,
        edited_at: str = "",
        author_user_id: str = "",
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
        self.is_edited = is_edited
        self.edited_at = edited_at
        self.author_user_id = author_user_id

    def pin_as_staff_answer(self) -> None:
        self.is_staff_answer = True

    def unpin_staff_answer(self) -> None:
        self.is_staff_answer = False

    def edit(self, new_content: str, edited_at: str) -> None:
        if not new_content or not new_content.strip():
            raise ValueError("Nội dung phản hồi không được để trống.")
        self.content = new_content.strip()
        self.is_edited = True
        self.edited_at = edited_at

    def increment_upvote(self) -> None:
        self.upvote_count += 1
        self.is_upvoted_by_me = True

    def decrement_upvote(self) -> None:
        self.upvote_count = max(0, self.upvote_count - 1)
        self.is_upvoted_by_me = False


@dataclass
class ForumThreadEntity(Entity):
    def __init__(
        self,
        id: str,
        course_id: str,
        item_id: str,
        title: str,
        content: str,
        author_name: str,
        author_role: str,
        created_at: str = "",
        upvote_count: int = 0,
        is_staff_pinned: bool = False,
        replies: list[ForumReplyEntity] | None = None,
        is_upvoted_by_me: bool = False,
        is_edited: bool = False,
        edited_at: str = "",
        author_user_id: str = "",
    ) -> None:
        super().__init__(id=id)
        self.course_id = course_id
        self.item_id = item_id
        self.title = title
        self.content = content
        self.author_name = author_name
        self.author_role = author_role
        self.created_at = created_at
        self.upvote_count = upvote_count
        self.is_staff_pinned = is_staff_pinned
        self.replies = replies or []
        self.is_upvoted_by_me = is_upvoted_by_me
        self.is_edited = is_edited
        self.edited_at = edited_at
        self.author_user_id = author_user_id

    def pin(self) -> None:
        self.is_staff_pinned = True

    def unpin(self) -> None:
        self.is_staff_pinned = False

    def edit(self, new_title: str, new_content: str, edited_at: str) -> None:
        if not new_title or not new_title.strip():
            raise ValueError("Tiêu đề bài viết không được để trống.")
        if not new_content or not new_content.strip():
            raise ValueError("Nội dung bài viết không được để trống.")
        self.title = new_title.strip()
        self.content = new_content.strip()
        self.is_edited = True
        self.edited_at = edited_at

    def increment_upvote(self) -> None:
        self.upvote_count += 1
        self.is_upvoted_by_me = True

    def decrement_upvote(self) -> None:
        self.upvote_count = max(0, self.upvote_count - 1)
        self.is_upvoted_by_me = False
