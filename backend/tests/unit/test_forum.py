import pytest

from src.modules.forum.application import ForumUseCase
from src.modules.forum.domain import ForumReplyEntity, ForumThreadEntity


class MockForumRepository:
    def __init__(self, session=None):
        self.threads: dict[str, ForumThreadEntity] = {}
        self.replies: dict[str, ForumReplyEntity] = {}

    async def list_threads(self, course_id="", item_id="", current_user_id=""):
        return list(self.threads.values())

    async def get_thread_by_id(self, thread_id: str):
        return self.threads.get(thread_id)

    async def get_reply_by_id(self, reply_id: str):
        return self.replies.get(reply_id)

    async def create_thread(self, thread: ForumThreadEntity):
        self.threads[thread.id] = thread
        return thread

    async def update_thread(
        self, thread_id: str, title: str, content: str, edited_at: str
    ):
        t = self.threads.get(thread_id)
        if not t:
            return None
        if title:
            t.title = title
        t.is_edited = True
        t.edited_at = edited_at
        return t

    async def delete_thread(self, thread_id: str):
        if thread_id in self.threads:
            del self.threads[thread_id]
            return True
        return False

    async def create_reply(self, reply: ForumReplyEntity):
        self.replies[reply.id] = reply
        return reply

    async def update_reply(self, reply_id: str, content: str, edited_at: str):
        r = self.replies.get(reply_id)
        if not r:
            return None
        if content:
            r.content = content
        r.is_edited = True
        r.edited_at = edited_at
        return r

    async def delete_reply(self, reply_id: str):
        if reply_id in self.replies:
            del self.replies[reply_id]
            return True
        return False

    async def vote_post(self, post_id: str, user_id: str = "", is_upvote: bool = True):
        return 1

    async def pin_staff_answer(self, reply_id: str, ta_user_id: str):
        return True


@pytest.mark.asyncio
async def test_forum_update_sets_is_edited():
    mock_repo = MockForumRepository()
    use_case = ForumUseCase(repo_factory=lambda session: mock_repo)

    # 1. Create thread
    thread = await use_case.create_thread(
        course_id="c1",
        item_id="i1",
        title="Original Title",
        content="Original Content",
        author_user_id="user_123",
        author_name="Alice",
    )
    assert thread.title == "Original Title"
    assert thread.is_edited is False
    assert thread.edited_at == ""

    # 2. Update thread as author -> should set is_edited to True and record edited_at timestamp
    updated = await use_case.update_thread(
        thread_id=thread.id,
        title="Updated Title",
        content="Updated Content",
        current_user_id="user_123",
        is_staff=False,
    )
    assert updated is not None
    assert updated.title == "Updated Title"
    assert updated.is_edited is True
    assert updated.edited_at != ""

    # 3. Post reply
    reply = await use_case.post_reply(
        thread_id=thread.id,
        content="Original Reply",
        author_user_id="user_123",
        author_name="Alice",
    )
    assert reply.is_edited is False

    # 4. Update reply as author -> should set is_edited to True
    updated_reply = await use_case.update_reply(
        reply_id=reply.id,
        content="Updated Reply Content",
        current_user_id="user_123",
        is_staff=False,
    )
    assert updated_reply is not None
    assert updated_reply.content == "Updated Reply Content"
    assert updated_reply.is_edited is True
    assert updated_reply.edited_at != ""


@pytest.mark.asyncio
async def test_forum_update_permission_denied_for_other_user():
    from connectrpc.errors import ConnectError

    mock_repo = MockForumRepository()
    use_case = ForumUseCase(repo_factory=lambda session: mock_repo)

    thread = await use_case.create_thread(
        course_id="c1",
        item_id="i1",
        title="Title",
        content="Content",
        author_user_id="user_owner",
    )

    # Updating as a different non-staff user should raise PermissionError
    with pytest.raises((PermissionError, ConnectError)):
        await use_case.update_thread(
            thread_id=thread.id,
            title="Hacked Title",
            content="Hacked Content",
            current_user_id="user_attacker",
            is_staff=False,
        )


@pytest.mark.asyncio
async def test_forum_repository_vote_post_integrity_error():
    from unittest.mock import AsyncMock, MagicMock

    from sqlalchemy.exc import IntegrityError

    from src.modules.forum.infrastructure.repository import ForumRepository

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_res_vote = MagicMock()
    mock_res_vote.scalar_one_or_none.return_value = None

    mock_res_count = MagicMock()
    mock_res_count.scalar_one_or_none.return_value = 5

    mock_session.execute.side_effect = [
        mock_res_vote,
        IntegrityError("INSERT STATEMENT", params={}, orig=Exception("duplicate key")),
        mock_res_count,
    ]

    repo = ForumRepository(mock_session)
    count = await repo.vote_post(post_id="thread-dl-01", user_id="user_learner_demo")
    assert count == 5
    mock_session.rollback.assert_awaited_once()
