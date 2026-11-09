from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.exc import IntegrityError

from src.modules.catalog.domain import Course
from src.modules.forum.application import ForumUseCase
from src.modules.forum.domain import ForumReplyEntity, ForumThreadEntity
from src.modules.forum.infrastructure.repository import ForumRepository
from src.shared.auth import CurrentUser


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
        if reply.thread_id in self.threads:
            self.threads[reply.thread_id].replies.append(reply)
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
        r = self.replies.get(reply_id)
        if r:
            r.is_staff_answer = True
        return True


class MockCatalogRepository:
    def __init__(self):
        self.courses: dict[str, Course] = {}

    async def get_course_detail(self, course_id: str):
        return self.courses.get(course_id)


class MockLearningRepository:
    def __init__(self):
        self.enrolled_pairs: set[tuple[str, str]] = set()

    async def check_enrollment(self, user_id: str, course_id: str) -> bool:
        return (user_id, course_id) in self.enrolled_pairs


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
    assert thread.replies[0].is_staff_answer is True

    # 2. Reply as course instructor
    reply = await use_case.post_reply(
        thread_id=thread.id,
        content="Here is extra material",
        author_user_id=prof_user.id,
        author_name="Andrew",
        user=prof_user,
    )
    assert reply.author_role == "Instructor"
    assert reply.is_staff_answer is True

    # 3. Pin staff answer -> allowed
    success = await use_case.pin_staff_answer(
        reply_id=reply.id, ta_user_id=prof_user.id, user=prof_user
    )
    assert success is True


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
