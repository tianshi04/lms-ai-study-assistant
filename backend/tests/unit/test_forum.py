import pytest

from src.modules.forum.application import ForumUseCase
from src.modules.forum.domain import (
    FORUM_FILTER_SOLVED,
    FORUM_FILTER_UNSOLVED,
    MAX_FORUM_SEARCH_QUERY_LEN,
    ForumReplyEntity,
    ForumThreadEntity,
)


class MockForumRepository:
    def __init__(self, session=None):
        self.threads: dict[str, ForumThreadEntity] = {}
        self.replies: dict[str, ForumReplyEntity] = {}
        self.last_list_args: dict[str, str] = {}

    async def list_threads(
        self,
        course_id="",
        item_id="",
        current_user_id="",
        search_query="",
        resolution_filter="",
    ):
        self.last_list_args = {
            "course_id": course_id,
            "item_id": item_id,
            "current_user_id": current_user_id,
            "search_query": search_query,
            "resolution_filter": resolution_filter,
        }
        items = list(self.threads.values())
        if course_id and course_id.upper() != "ALL":
            items = [t for t in items if t.course_id == course_id]
        if item_id:
            items = [t for t in items if t.item_id == item_id]
        if resolution_filter == FORUM_FILTER_SOLVED:
            items = [t for t in items if t.is_solved]
        elif resolution_filter == FORUM_FILTER_UNSOLVED:
            items = [t for t in items if not t.is_solved]
        if search_query:
            tokens = search_query.lower().split()
            filtered = []
            for thread in items:
                haystack = " ".join(
                    [
                        thread.title.lower(),
                        thread.content.lower(),
                        thread.author_name.lower(),
                        *[r.content.lower() for r in thread.replies],
                    ]
                )
                if all(tok in haystack for tok in tokens):
                    filtered.append(thread)
            items = filtered
        return items

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
        thread = self.threads.get(reply.thread_id)
        if thread:
            thread.replies.append(reply)
            if reply.is_staff_answer:
                thread.mark_solved()
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
        reply = self.replies.pop(reply_id, None)
        if not reply:
            return False
        thread = self.threads.get(reply.thread_id)
        if thread:
            thread.replies = [r for r in thread.replies if r.id != reply_id]
            thread.sync_solved_state()
        return True

    async def vote_post(self, post_id: str, user_id: str = "", is_upvote: bool = True):
        return 1

    async def pin_staff_answer(self, reply_id: str, _ta_user_id: str = ""):
        reply = self.replies.get(reply_id)
        if not reply:
            return False
        reply.pin_as_staff_answer()
        thread = self.threads.get(reply.thread_id)
        if thread:
            thread.pin()
            thread.mark_solved()
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


@pytest.mark.asyncio
async def test_post_reply_solved_lifecycle_with_staff_roles():
    mock_repo = MockForumRepository()
    use_case = ForumUseCase(repo_factory=lambda _session: mock_repo)

    # Even if an instructor creates a thread with opening content, it starts unsolved
    thread = await use_case.create_thread(
        course_id="course-ai",
        item_id="item-1",
        title="Học Gradient Descent",
        content="Làm sao chỉnh alpha?",
        author_user_id="inst_1",
        author_name="Prof. Nam",
        author_role="USER_ROLE_INSTRUCTOR",
    )
    assert thread.is_solved is False

    # Learner reply leaves thread unsolved
    learner_reply = await use_case.post_reply(
        thread_id=thread.id,
        content="Mình cũng đang thắc mắc",
        author_user_id="learner_1",
        author_name="Trí",
        author_role="USER_ROLE_LEARNER",
    )
    assert learner_reply.is_staff_answer is False
    assert mock_repo.threads[thread.id].is_solved is False

    # Staff reply with USER_ROLE_INSTRUCTOR automatically marks solved
    staff_reply = await use_case.post_reply(
        thread_id=thread.id,
        content="Bạn thử learning rate 0.01 nhé",
        author_user_id="inst_1",
        author_name="Prof. Nam",
        author_role="USER_ROLE_INSTRUCTOR",
    )
    assert staff_reply.is_staff_answer is True
    assert mock_repo.threads[thread.id].is_solved is True

    # Deleting the only staff reply reverts solved back to False
    deleted = await use_case.delete_reply(
        reply_id=staff_reply.id,
        current_user_id="inst_1",
        is_staff=True,
    )
    assert deleted is True
    assert mock_repo.threads[thread.id].is_solved is False

    # Super Admin and TA roles also qualify as staff answers
    for role in ("USER_ROLE_SUPER_ADMIN", "USER_ROLE_ORG_ADMIN", "USER_ROLE_TA"):
        role_reply = await use_case.post_reply(
            thread_id=thread.id,
            content=f"Phản hồi từ {role}",
            author_user_id=f"user_{role.lower()}",
            author_name=role,
            author_role=role,
        )
        assert role_reply.is_staff_answer is True
        assert mock_repo.threads[thread.id].is_solved is True
        await use_case.delete_reply(
            reply_id=role_reply.id,
            current_user_id=f"user_{role.lower()}",
            is_staff=True,
        )
        assert mock_repo.threads[thread.id].is_solved is False


@pytest.mark.asyncio
async def test_list_threads_normalizes_search_and_forwards_resolution_filter():
    mock_repo = MockForumRepository()
    use_case = ForumUseCase(repo_factory=lambda _session: mock_repo)

    oversized_query = "   " + ("a" * (MAX_FORUM_SEARCH_QUERY_LEN + 50)) + "   "
    await use_case.list_threads(
        course_id="course-1",
        search_query=oversized_query,
        resolution_filter=FORUM_FILTER_SOLVED,
    )

    assert len(mock_repo.last_list_args["search_query"]) == MAX_FORUM_SEARCH_QUERY_LEN
    assert mock_repo.last_list_args["resolution_filter"] == FORUM_FILTER_SOLVED


@pytest.mark.asyncio
async def test_forum_handler_maps_resolution_filter_and_is_solved(monkeypatch):
    from typing import cast
    from unittest.mock import MagicMock

    from connectrpc.request import RequestContext

    from src.gen.forum.v1 import forum_pb as pb
    from src.modules.forum.presentation.forum_handler import ForumHandler
    from src.shared.auth import CurrentUser

    mock_repo = MockForumRepository()
    mock_repo.threads["t1"] = ForumThreadEntity(
        id="t1",
        course_id="c1",
        item_id="i1",
        title="Solved thread",
        content="Solved body",
        author_name="Minh",
        author_role="USER_ROLE_LEARNER",
        is_solved=True,
    )
    mock_repo.threads["t2"] = ForumThreadEntity(
        id="t2",
        course_id="c1",
        item_id="i1",
        title="Unsolved thread",
        content="Pending body",
        author_name="Lan",
        author_role="USER_ROLE_LEARNER",
        is_solved=False,
    )

    use_case = ForumUseCase(repo_factory=lambda _session: mock_repo)
    handler = ForumHandler(use_case=use_case)
    monkeypatch.setattr(
        "src.modules.forum.presentation.forum_handler.require_current_user",
        lambda: CurrentUser(id="u1", email="u1@example.com", role="USER_ROLE_LEARNER"),
    )

    req_solved = pb.ListThreadsRequest(
        course_id="c1",
        search_query="Solved",
        resolution_filter=pb.ThreadResolutionFilter.SOLVED,
    )
    ctx_solved = cast(
        RequestContext[pb.ListThreadsRequest, pb.ListThreadsResponse], MagicMock()
    )
    res_solved = await handler.list_threads(req_solved, ctx_solved)
    assert [t.id for t in res_solved.threads] == ["t1"]
    assert res_solved.threads[0].is_solved is True

    req_unsolved = pb.ListThreadsRequest(
        course_id="c1",
        resolution_filter=pb.ThreadResolutionFilter.UNSOLVED,
    )
    ctx_unsolved = cast(
        RequestContext[pb.ListThreadsRequest, pb.ListThreadsResponse], MagicMock()
    )
    res_unsolved = await handler.list_threads(req_unsolved, ctx_unsolved)
    assert [t.id for t in res_unsolved.threads] == ["t2"]
    assert res_unsolved.threads[0].is_solved is False
