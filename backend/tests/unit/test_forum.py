from contextlib import asynccontextmanager
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.exc import IntegrityError

from src.modules.catalog.domain import Course
from src.modules.forum.application import ForumUseCase
from src.modules.forum.domain import (
    FORUM_FILTER_SOLVED,
    FORUM_FILTER_UNSOLVED,
    MAX_FORUM_SEARCH_QUERY_LEN,
    ForumReplyEntity,
    ForumThreadEntity,
)
from src.modules.forum.infrastructure.repository import ForumRepository
from src.shared.auth import CurrentUser


class MockForumRepository:
    def __init__(self, session=None):
        self.threads: dict[str, ForumThreadEntity] = {}
        self.replies: dict[str, ForumReplyEntity] = {}
        self.last_list_args: dict[str, str] = {}

    async def list_threads(
        self,
        course_id: str = "",
        item_id: str = "",
        current_user_id: str = "",
        course_ids: list[str] | None = None,
        search_query: str = "",
        resolution_filter: str = "",
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
        elif course_ids is not None:
            items = [t for t in items if t.course_id in course_ids]
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

    async def get_post_course_id(self, post_id: str):
        if post_id in self.threads:
            return self.threads[post_id].course_id
        if post_id in self.replies:
            thread_id = self.replies[post_id].thread_id
            if thread_id in self.threads:
                return self.threads[thread_id].course_id
        return None

    async def pin_staff_answer(self, reply_id: str, _ta_user_id: str = ""):
        reply = self.replies.get(reply_id)
        if not reply:
            return False
        reply.is_staff_answer = not reply.is_staff_answer
        thread = self.threads.get(reply.thread_id)
        if thread:
            has_staff = any(r.is_staff_answer for r in thread.replies)
            thread.is_staff_pinned = True if reply.is_staff_answer else has_staff
            thread.sync_solved_state()
        return True

    async def pin_thread(self, thread_id: str, is_pinned: bool):
        t = self.threads.get(thread_id)
        if not t:
            return None
        t.is_staff_pinned = is_pinned
        return t


class MockCatalogRepository:
    def __init__(self):
        self.courses: dict[str, Course] = {}

    async def get_course_detail(self, course_id: str):
        if course_id in self.courses:
            return self.courses[course_id]
        for c in self.courses.values():
            if getattr(c, "slug", "") == course_id:
                return c
        return None

    async def list_instructor_courses(self, instructor_id: str, page_size: int = 200):
        matched = [
            c
            for c in self.courses.values()
            if c.owner_id == instructor_id
            or instructor_id in c.co_instructor_ids
            or instructor_id in getattr(c, "ta_ids", [])
        ]
        return matched, len(matched)


class MockLearningRepository:
    def __init__(self):
        self.enrolled_pairs: set[tuple[str, str]] = set()

    async def check_enrollment(self, user_id: str, course_id: str) -> bool:
        return (user_id, course_id) in self.enrolled_pairs

    async def list_enrolled_courses(self, user_id: str):
        class EnrolledCourse:
            def __init__(self, c_id: str):
                self.course_id = c_id

        return [
            EnrolledCourse(c_id)
            for (u_id, c_id) in self.enrolled_pairs
            if u_id == user_id
        ]


@pytest.mark.asyncio
async def test_forum_instructor_of_course_posts_as_instructor():
    """An instructor who owns the course posts with role='Instructor' and is_staff_answer=True."""
    mock_forum_repo = MockForumRepository()
    mock_catalog_repo = MockCatalogRepository()
    mock_learning_repo = MockLearningRepository()

    course = Course(
        id="course_1",
        title="Machine Learning",
        slug="machine-learning",
        owner_id="prof_andrew",
    )
    mock_catalog_repo.courses["course_1"] = course

    use_case = ForumUseCase(
        repo_factory=lambda session: mock_forum_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
        learning_repo_factory=lambda session: mock_learning_repo,
    )

    prof_user = CurrentUser(
        id="prof_andrew", role="USER_ROLE_INSTRUCTOR", email="andrew@ai.edu"
    )

    # 1. Create thread as course instructor
    thread = await use_case.create_thread(
        course_id="course_1",
        item_id="item_1",
        title="Welcome to ML",
        content="Happy learning!",
        author_user_id=prof_user.id,
        author_name="Andrew",
        user=prof_user,
    )
    assert thread.author_role == "Instructor"
    assert len(thread.replies) == 1
    assert thread.replies[0].is_staff_answer is False

    # 2. Reply as course instructor -> auto-marked as staff answer & solved
    reply = await use_case.post_reply(
        thread_id=thread.id,
        content="Here is extra material",
        author_user_id=prof_user.id,
        author_name="Andrew",
        user=prof_user,
    )
    assert reply.author_role == "Instructor"
    assert reply.is_staff_answer is True
    assert mock_forum_repo.threads[thread.id].is_solved is True

    # 3. Toggle unpin -> False, then re-pin -> True
    unpinned = await use_case.pin_staff_answer(
        reply_id=reply.id, ta_user_id=prof_user.id, user=prof_user
    )
    assert unpinned is True
    assert reply.is_staff_answer is False
    assert mock_forum_repo.threads[thread.id].is_solved is False

    repinned = await use_case.pin_staff_answer(
        reply_id=reply.id, ta_user_id=prof_user.id, user=prof_user
    )
    assert repinned is True
    assert reply.is_staff_answer is True
    assert mock_forum_repo.threads[thread.id].is_solved is True


@pytest.mark.asyncio
async def test_forum_instructor_of_another_course_posts_as_learner():
    """An instructor of Course B who takes Course A posts as 'Learner' and is_staff_answer=False."""
    mock_forum_repo = MockForumRepository()
    mock_catalog_repo = MockCatalogRepository()
    mock_learning_repo = MockLearningRepository()

    course_a = Course(
        id="course_a",
        title="Microeconomics",
        slug="microeconomics",
        owner_id="prof_econ",
    )
    mock_catalog_repo.courses["course_a"] = course_a

    # User is an instructor globally, but not for Course A
    visiting_prof = CurrentUser(
        id="prof_math", role="USER_ROLE_INSTRUCTOR", email="math@uni.edu"
    )

    use_case = ForumUseCase(
        repo_factory=lambda session: mock_forum_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
        learning_repo_factory=lambda session: mock_learning_repo,
    )

    # If visiting_prof has NOT enrolled in course_a, cannot post thread
    with pytest.raises(PermissionError) as exc_info:
        await use_case.create_thread(
            course_id="course_a",
            item_id="item_1",
            title="Question on demand curves",
            content="Can someone explain this?",
            author_user_id=visiting_prof.id,
            user=visiting_prof,
        )
    assert "Bạn cần đăng ký khóa học" in str(exc_info.value)

    # Now enroll visiting_prof in course_a
    mock_learning_repo.enrolled_pairs.add((visiting_prof.id, "course_a"))

    # Now thread creation succeeds, but with role="Learner"
    thread = await use_case.create_thread(
        course_id="course_a",
        item_id="item_1",
        title="Question on demand curves",
        content="Can someone explain this?",
        author_user_id=visiting_prof.id,
        user=visiting_prof,
    )
    assert thread.author_role == "Learner"
    # Opening reply is NOT staff answer
    assert len(thread.replies) == 1
    assert thread.replies[0].is_staff_answer is False

    # Reply is posted as "Learner" with is_staff_answer=False
    reply = await use_case.post_reply(
        thread_id=thread.id,
        content="I understand it now",
        author_user_id=visiting_prof.id,
        user=visiting_prof,
    )
    assert reply.author_role == "Learner"
    assert reply.is_staff_answer is False

    # Cannot pin staff answer on someone else's course
    with pytest.raises(PermissionError) as pin_exc:
        await use_case.pin_staff_answer(
            reply_id=reply.id, ta_user_id=visiting_prof.id, user=visiting_prof
        )
    assert "Bạn không có quyền kiểm duyệt diễn đàn khóa học này" in str(pin_exc.value)


@pytest.mark.asyncio
async def test_forum_update_sets_is_edited():
    mock_forum_repo = MockForumRepository()
    mock_catalog_repo = MockCatalogRepository()
    mock_learning_repo = MockLearningRepository()

    course = Course(id="c1", title="Math 101", slug="math-101", owner_id="prof_1")
    mock_catalog_repo.courses["c1"] = course
    mock_learning_repo.enrolled_pairs.add(("user_123", "c1"))

    use_case = ForumUseCase(
        repo_factory=lambda session: mock_forum_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
        learning_repo_factory=lambda session: mock_learning_repo,
    )

    user = CurrentUser(id="user_123", role="USER_ROLE_LEARNER", email="alice@test.com")

    # 1. Create thread
    thread = await use_case.create_thread(
        course_id="c1",
        item_id="i1",
        title="Original Title",
        content="Original Content",
        author_user_id="user_123",
        author_name="Alice",
        user=user,
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
        user=user,
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
    mock_forum_repo = MockForumRepository()
    mock_catalog_repo = MockCatalogRepository()
    mock_learning_repo = MockLearningRepository()

    course = Course(id="c1", title="Math 101", slug="math-101", owner_id="prof_1")
    mock_catalog_repo.courses["c1"] = course
    mock_learning_repo.enrolled_pairs.add(("user_owner", "c1"))

    use_case = ForumUseCase(
        repo_factory=lambda session: mock_forum_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
        learning_repo_factory=lambda session: mock_learning_repo,
    )

    owner_user = CurrentUser(
        id="user_owner", role="USER_ROLE_LEARNER", email="owner@test.com"
    )

    thread = await use_case.create_thread(
        course_id="c1",
        item_id="i1",
        title="Title",
        content="Content",
        author_user_id="user_owner",
        user=owner_user,
    )

    # Updating as a different non-staff user should raise PermissionError
    with pytest.raises(PermissionError):
        await use_case.update_thread(
            thread_id=thread.id,
            title="Hacked Title",
            content="Hacked Content",
            current_user_id="user_attacker",
        )


@pytest.mark.asyncio
async def test_forum_repository_vote_post_integrity_error():
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
async def test_list_threads_scoped_to_teaching_and_enrolled_courses():
    """Verify that users can only view threads from courses they teach or are enrolled in."""
    mock_forum_repo = MockForumRepository()
    mock_catalog_repo = MockCatalogRepository()
    mock_learning_repo = MockLearningRepository()

    # Course 1: Owned by Prof Tuan
    course_econ = Course(
        id="course_econ",
        title="Microeconomics",
        slug="microeconomics",
        owner_id="prof_tuan",
    )
    mock_catalog_repo.courses["course_econ"] = course_econ

    # Course 2: Owned by Prof Andrew
    course_ai = Course(
        id="course_ai",
        title="Deep Learning",
        slug="deep-learning",
        owner_id="prof_andrew",
    )
    mock_catalog_repo.courses["course_ai"] = course_ai

    # Create thread in each course
    thread_econ = ForumThreadEntity(
        id="t_econ",
        course_id="course_econ",
        item_id="i1",
        title="Econ Thread",
        content="Discussion on Econ",
        author_user_id="prof_tuan",
        author_name="Prof Tuan",
        author_role="Instructor",
    )
    thread_ai = ForumThreadEntity(
        id="t_ai",
        course_id="course_ai",
        item_id="i2",
        title="AI Thread",
        content="Discussion on AI",
        author_user_id="prof_andrew",
        author_name="Prof Andrew",
        author_role="Instructor",
    )
    mock_forum_repo.threads["t_econ"] = thread_econ
    mock_forum_repo.threads["t_ai"] = thread_ai

    use_case = ForumUseCase(
        repo_factory=lambda session: mock_forum_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
        learning_repo_factory=lambda session: mock_learning_repo,
    )

    tuan_user = CurrentUser(
        id="prof_tuan", role="USER_ROLE_INSTRUCTOR", email="tuan@uni.edu"
    )
    andrew_user = CurrentUser(
        id="prof_andrew", role="USER_ROLE_INSTRUCTOR", email="andrew@ai.edu"
    )
    alice_learner = CurrentUser(
        id="learner_alice", role="USER_ROLE_LEARNER", email="alice@test.com"
    )
    admin_user = CurrentUser(
        id="admin_01", role="USER_ROLE_ADMIN", email="admin@system.local"
    )

    # 1. Prof Tuan (teaches econ, enrolled in 0 courses):
    # Viewing all courses -> sees ONLY econ thread
    tuan_threads = await use_case.list_threads(course_id="", user=tuan_user)
    assert len(tuan_threads) == 1
    assert tuan_threads[0].id == "t_econ"

    # Prof Tuan tries to view course_ai explicitly -> denied (returns [])
    tuan_ai_threads = await use_case.list_threads(course_id="course_ai", user=tuan_user)
    assert len(tuan_ai_threads) == 0

    # Prof Andrew (teaches AI, enrolled in 0 courses) -> sees ONLY AI thread
    andrew_threads = await use_case.list_threads(course_id="", user=andrew_user)
    assert len(andrew_threads) == 1
    assert andrew_threads[0].id == "t_ai"

    # 2. Learner Alice enrolled ONLY in course_ai
    mock_learning_repo.enrolled_pairs.add(("learner_alice", "course_ai"))
    alice_threads = await use_case.list_threads(course_id="", user=alice_learner)
    assert len(alice_threads) == 1
    assert alice_threads[0].id == "t_ai"

    # Alice viewing course_econ explicitly -> denied (returns [])
    alice_econ_threads = await use_case.list_threads(
        course_id="course_econ", user=alice_learner
    )
    assert len(alice_econ_threads) == 0

    # 3. Super Admin -> views all threads across all courses
    admin_threads = await use_case.list_threads(course_id="", user=admin_user)
    assert len(admin_threads) == 2

    # 4. New user with no enrollments and no teaching courses -> returns []
    bob_user = CurrentUser(id="bob", role="USER_ROLE_LEARNER", email="bob@test.com")
    bob_threads = await use_case.list_threads(course_id="", user=bob_user)
    assert len(bob_threads) == 0


@pytest.mark.asyncio
async def test_pin_thread_permissions(monkeypatch):
    from contextlib import asynccontextmanager

    repo = MockForumRepository()
    mock_catalog = MockCatalogRepository()
    mock_learning = MockLearningRepository()

    course_ai = Course(id="c_ai", title="AI", slug="ai", owner_id="prof_andrew")
    mock_catalog.courses["c_ai"] = course_ai

    t = ForumThreadEntity(
        id="t1",
        course_id="c_ai",
        item_id="",
        title="Question",
        content="Details",
        author_name="Alice",
        author_role="Learner",
        author_user_id="learner_alice",
    )
    await repo.create_thread(t)

    use_case = ForumUseCase(
        repo_factory=lambda _: repo,
        catalog_repo_factory=lambda _: mock_catalog,
        learning_repo_factory=lambda _: mock_learning,
    )

    @asynccontextmanager
    async def mock_scope():
        yield None

    monkeypatch.setattr(
        "src.modules.forum.application.forum_usecase.async_session_scope",
        mock_scope,
    )

    andrew = CurrentUser(
        id="prof_andrew", role="USER_ROLE_INSTRUCTOR", email="a@ai.edu"
    )
    alice = CurrentUser(
        id="learner_alice", role="USER_ROLE_LEARNER", email="alice@test.com"
    )

    # Learner cannot pin thread -> PermissionError
    with pytest.raises(PermissionError):
        await use_case.pin_thread("t1", is_pinned=True, user=alice)

    # Instructor can pin thread
    updated = await use_case.pin_thread("t1", is_pinned=True, user=andrew)
    assert updated.is_staff_pinned is True

    # Instructor can unpin thread
    unpinned = await use_case.pin_thread("t1", is_pinned=False, user=andrew)
    assert unpinned.is_staff_pinned is False


@pytest.mark.asyncio
async def test_forum_pin_and_update_security_guards(monkeypatch):
    """Test that pin operations require authentication and empty author cannot be hijacked."""
    mock_forum = MockForumRepository()
    mock_forum.threads["t1"] = ForumThreadEntity(
        id="t1",
        course_id="course_ai",
        item_id="item_1",
        title="Edge Case Thread",
        content="Content",
        author_name="Anonymous",
        author_role="Learner",
        author_user_id="",  # Empty author edge case
        created_at=datetime.now(UTC).isoformat(),
    )
    mock_forum.replies["r1"] = ForumReplyEntity(
        id="r1",
        thread_id="t1",
        author_name="User 1",
        author_role="Learner",
        content="Reply",
        author_user_id="user_1",
        created_at=datetime.now(UTC).isoformat(),
    )

    use_case = ForumUseCase(
        repo_factory=lambda _: mock_forum,
        catalog_repo_factory=lambda _: MockCatalogRepository(),
        learning_repo_factory=lambda _: MockLearningRepository(),
    )

    @asynccontextmanager
    async def mock_scope():
        yield MagicMock()

    monkeypatch.setattr(
        "src.modules.forum.application.forum_usecase.async_session_scope",
        mock_scope,
    )

    # 1. pin_thread without user -> PermissionError
    with pytest.raises(PermissionError) as exc_pin:
        await use_case.pin_thread("t1", is_pinned=True, user=None)
    assert "Yêu cầu thông tin người dùng" in str(exc_pin.value)

    # 2. pin_staff_answer without user -> PermissionError
    with pytest.raises(PermissionError) as exc_ans:
        await use_case.pin_staff_answer("r1", ta_user_id="ta_1", user=None)
    assert "Yêu cầu thông tin người dùng" in str(exc_ans.value)

    # 3. update_thread on empty/mismatched author -> PermissionError
    with pytest.raises(PermissionError) as exc_up:
        await use_case.update_thread(
            thread_id="t1",
            title="Hacked Title",
            content="Hacked Content",
            current_user_id="random_attacker",
        )
    assert "Chỉ tác giả mới có quyền chỉnh sửa" in str(exc_up.value)

    # 4. update_reply on mismatched/empty author -> PermissionError
    with pytest.raises(PermissionError) as exc_up_rep:
        await use_case.update_reply(
            reply_id="r1",
            content="Hacked reply content",
            current_user_id="random_attacker",
        )
    assert "Chỉ tác giả mới có quyền chỉnh sửa" in str(exc_up_rep.value)


@pytest.mark.asyncio
async def test_to_thread_entity_prioritizes_pinned_replies():
    from unittest.mock import AsyncMock, MagicMock

    from src.modules.forum.infrastructure.repository import ForumRepository

    mock_session = AsyncMock()
    repo = ForumRepository(session=mock_session)

    # Reply 1: student reply created earlier (not pinned)
    r1 = MagicMock()
    r1.id = "r1"
    r1.thread_id = "th_1"
    r1.author_user_id = "u1"
    r1.author_name = "Student A"
    r1.author_role = "Learner"
    r1.content = "Earliest student comment"
    r1.created_at = "2026-07-25T10:00:00Z"
    r1.upvote_count = 10
    r1.is_staff_answer = False
    r1.is_edited = False
    r1.edited_at = ""

    # Reply 2: instructor reply created later (pinned)
    r2 = MagicMock()
    r2.id = "r2"
    r2.thread_id = "th_1"
    r2.author_user_id = "u2"
    r2.author_name = "Instructor B"
    r2.author_role = "Instructor"
    r2.content = "Pinned official instructor answer"
    r2.created_at = "2026-11-14T19:00:00Z"
    r2.upvote_count = 1
    r2.is_staff_answer = True
    r2.is_edited = False
    r2.edited_at = ""

    # Reply 3: another student reply created even later (not pinned)
    r3 = MagicMock()
    r3.id = "r3"
    r3.thread_id = "th_1"
    r3.author_user_id = "u3"
    r3.author_name = "Student C"
    r3.author_role = "Learner"
    r3.content = "Latest student comment"
    r3.created_at = "2026-11-14T20:00:00Z"
    r3.upvote_count = 0
    r3.is_staff_answer = False
    r3.is_edited = False
    r3.edited_at = ""

    thread_orm = MagicMock()
    thread_orm.id = "th_1"
    thread_orm.course_id = "c1"
    thread_orm.item_id = ""
    thread_orm.title = "Thread Title"
    thread_orm.content = "Thread Content"
    thread_orm.author_name = "Author"
    thread_orm.author_role = "Learner"
    thread_orm.author_user_id = "author_1"
    thread_orm.created_at = "2026-07-25T09:00:00Z"
    thread_orm.upvote_count = 5
    thread_orm.is_staff_pinned = False
    thread_orm.is_edited = False
    thread_orm.edited_at = ""
    thread_orm.replies = [r1, r2, r3]

    entity = repo._to_thread_entity(thread_orm)

    assert len(entity.replies) == 3
    # Pinned reply r2 MUST be first
    assert entity.replies[0].id == "r2"
    assert entity.replies[0].is_staff_answer is True
    # Followed by chronological unpinned replies
    assert entity.replies[1].id == "r1"
    assert entity.replies[2].id == "r3"


@pytest.mark.asyncio
async def test_vote_post_requires_enrollment_or_staff():
    mock_forum_repo = MockForumRepository()
    mock_catalog_repo = MockCatalogRepository()
    mock_learning_repo = MockLearningRepository()

    course = Course(
        id="c_vote_1",
        title="Python 101",
        slug="python-101",
        owner_id="prof_py",
    )
    mock_catalog_repo.courses["c_vote_1"] = course

    use_case = ForumUseCase(
        repo_factory=lambda session: mock_forum_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
        learning_repo_factory=lambda session: mock_learning_repo,
    )

    prof_user = CurrentUser(
        id="prof_py", role="USER_ROLE_INSTRUCTOR", email="py@edu.vn"
    )
    thread = await use_case.create_thread(
        course_id="c_vote_1",
        item_id="",
        title="Intro question",
        content="What is a variable?",
        author_user_id=prof_user.id,
        author_name="Prof Py",
        user=prof_user,
    )

    # 1. Unenrolled learner attempts to vote -> PermissionError
    learner_user = CurrentUser(
        id="learner_anon", role="USER_ROLE_LEARNER", email="anon@learner.vn"
    )
    with pytest.raises(PermissionError, match="Bạn cần đăng ký khóa học"):
        await use_case.vote_post(
            post_id=thread.id,
            user_id=learner_user.id,
            is_upvote=True,
            user=learner_user,
        )

    # 2. Enrolled learner votes -> OK
    mock_learning_repo.enrolled_pairs.add(("learner_anon", "c_vote_1"))
    votes = await use_case.vote_post(
        post_id=thread.id,
        user_id=learner_user.id,
        is_upvote=True,
        user=learner_user,
    )
    assert votes == 1


@pytest.mark.asyncio
async def test_create_thread_empty_course_id_rejected():
    mock_forum_repo = MockForumRepository()
    mock_catalog_repo = MockCatalogRepository()
    mock_learning_repo = MockLearningRepository()

    use_case = ForumUseCase(
        repo_factory=lambda session: mock_forum_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
        learning_repo_factory=lambda session: mock_learning_repo,
    )
    user = CurrentUser(id="user_1", role="USER_ROLE_LEARNER", email="u1@edu.vn")

    with pytest.raises(
        ValueError, match="Mã khóa học không được để trống khi thao tác diễn đàn."
    ):
        await use_case.create_thread(
            course_id="",
            item_id="",
            title="Question",
            content="Content",
            author_user_id=user.id,
            user=user,
        )


@pytest.mark.asyncio
async def test_course_ta_access_and_canonical_uuid():
    mock_forum_repo = MockForumRepository()
    mock_catalog_repo = MockCatalogRepository()
    mock_learning_repo = MockLearningRepository()

    course = Course(
        id="uuid_c_123",
        title="Database Systems",
        slug="database-systems",
        owner_id="prof_db",
        ta_ids=["ta_bob"],
    )
    mock_catalog_repo.courses["uuid_c_123"] = course

    use_case = ForumUseCase(
        repo_factory=lambda session: mock_forum_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
        learning_repo_factory=lambda session: mock_learning_repo,
    )

    ta_user = CurrentUser(id="ta_bob", role="USER_ROLE_LEARNER", email="bob@ta.vn")

    # TA creates thread using slug -> saved with canonical UUID id
    thread = await use_case.create_thread(
        course_id="database-systems",
        item_id="",
        title="TA Office Hours",
        content="Welcome to office hours",
        author_user_id=ta_user.id,
        author_name="Bob TA",
        user=ta_user,
    )
    assert thread.author_role == "TA"
    assert thread.course_id == "uuid_c_123"


@pytest.mark.asyncio
async def test_post_reply_solved_lifecycle_with_staff_roles():
    mock_repo = MockForumRepository()
    mock_catalog = MockCatalogRepository()
    mock_learning = MockLearningRepository()

    course = Course(
        id="course-ai",
        title="AI Foundations",
        slug="course-ai",
        owner_id="inst_1",
        ta_ids=["user_user_role_ta"],
    )
    mock_catalog.courses["course-ai"] = course
    mock_learning.enrolled_pairs.add(("learner_1", "course-ai"))

    use_case = ForumUseCase(
        repo_factory=lambda _session: mock_repo,
        catalog_repo_factory=lambda _session: mock_catalog,
        learning_repo_factory=lambda _session: mock_learning,
    )

    inst_user = CurrentUser(
        id="inst_1", role="USER_ROLE_INSTRUCTOR", email="nam@edu.vn"
    )
    learner_user = CurrentUser(
        id="learner_1", role="USER_ROLE_LEARNER", email="tri@edu.vn"
    )

    # Even if an instructor creates a thread with opening content, it starts unsolved
    thread = await use_case.create_thread(
        course_id="course-ai",
        item_id="item-1",
        title="Học Gradient Descent",
        content="Làm sao chỉnh alpha?",
        author_user_id="inst_1",
        author_name="Prof. Nam",
        user=inst_user,
    )
    assert thread.is_solved is False

    # Learner reply leaves thread unsolved
    learner_reply = await use_case.post_reply(
        thread_id=thread.id,
        content="Mình cũng đang thắc mắc",
        author_user_id="learner_1",
        author_name="Trí",
        user=learner_user,
    )
    assert learner_reply.is_staff_answer is False
    assert mock_repo.threads[thread.id].is_solved is False

    # Course instructor reply automatically marks solved
    staff_reply = await use_case.post_reply(
        thread_id=thread.id,
        content="Bạn thử learning rate 0.01 nhé",
        author_user_id="inst_1",
        author_name="Prof. Nam",
        user=inst_user,
    )
    assert staff_reply.is_staff_answer is True
    assert mock_repo.threads[thread.id].is_solved is True

    # Deleting the only staff reply reverts solved back to False
    deleted = await use_case.delete_reply(
        reply_id=staff_reply.id,
        current_user_id="inst_1",
        user=inst_user,
    )
    assert deleted is True
    assert mock_repo.threads[thread.id].is_solved is False

    # Super Admin and Course TA roles also qualify as staff answers
    for role in ("USER_ROLE_SUPER_ADMIN", "USER_ROLE_ADMIN", "USER_ROLE_TA"):
        staff_actor = CurrentUser(
            id=f"user_{role.lower()}",
            role=role,
            email=f"{role.lower()}@edu.vn",
        )
        role_reply = await use_case.post_reply(
            thread_id=thread.id,
            content=f"Phản hồi từ {role}",
            author_user_id=staff_actor.id,
            author_name=role,
            user=staff_actor,
        )
        assert role_reply.is_staff_answer is True
        assert mock_repo.threads[thread.id].is_solved is True
        await use_case.delete_reply(
            reply_id=role_reply.id,
            current_user_id=staff_actor.id,
            user=staff_actor,
        )
        assert mock_repo.threads[thread.id].is_solved is False


@pytest.mark.asyncio
async def test_list_threads_normalizes_search_and_forwards_resolution_filter():
    mock_repo = MockForumRepository()
    mock_catalog = MockCatalogRepository()
    mock_learning = MockLearningRepository()
    mock_catalog.courses["course-1"] = Course(
        id="course-1", title="Course 1", slug="course-1", owner_id="inst_1"
    )
    mock_learning.enrolled_pairs.add(("learner_1", "course-1"))

    use_case = ForumUseCase(
        repo_factory=lambda _session: mock_repo,
        catalog_repo_factory=lambda _session: mock_catalog,
        learning_repo_factory=lambda _session: mock_learning,
    )
    learner_user = CurrentUser(
        id="learner_1", role="USER_ROLE_LEARNER", email="l1@edu.vn"
    )

    oversized_query = "   " + ("a" * (MAX_FORUM_SEARCH_QUERY_LEN + 50)) + "   "
    await use_case.list_threads(
        course_id="course-1",
        user=learner_user,
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

    mock_repo = MockForumRepository()
    mock_catalog = MockCatalogRepository()
    mock_learning = MockLearningRepository()
    mock_catalog.courses["c1"] = Course(
        id="c1", title="Course C1", slug="c1", owner_id="inst_1"
    )
    mock_learning.enrolled_pairs.add(("u1", "c1"))

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

    use_case = ForumUseCase(
        repo_factory=lambda _session: mock_repo,
        catalog_repo_factory=lambda _session: mock_catalog,
        learning_repo_factory=lambda _session: mock_learning,
    )
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
