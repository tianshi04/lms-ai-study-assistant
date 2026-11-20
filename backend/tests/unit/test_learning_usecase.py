from unittest.mock import AsyncMock, patch

import pytest

from src.modules.catalog.domain import (
    Course,
    ItemType,
    LearningItem,
    Lesson,
    WeekModule,
)
from src.modules.learning.application import LearningUseCase
from src.modules.learning.domain import (
    LearningProgress,
    PersonalNote,
)


@pytest.fixture
def mock_repo():
    return AsyncMock()


@pytest.fixture
def use_case(mock_repo):
    return LearningUseCase(repo_factory=lambda session: mock_repo)


@pytest.fixture
def mock_session_scope():
    with patch(
        "src.modules.learning.application.learning_usecase.async_session_scope"
    ) as mock_scope:
        mock_session = AsyncMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__.return_value = mock_session
        mock_scope.return_value = mock_ctx
        yield mock_scope


@pytest.mark.asyncio
async def test_get_progress(use_case, mock_repo, mock_session_scope):
    expected = LearningProgress(
        user_id="u1",
        course_id="c1",
        overall_progress_percent=0.0,
        completed_item_ids=[],
        weekly_deadlines=[],
    )
    mock_repo.get_progress.return_value = expected

    result = await use_case.get_progress("u1", "c1")
    assert result == expected
    mock_repo.get_progress.assert_awaited_once_with("u1", "c1", None)


@pytest.mark.asyncio
async def test_reset_deadlines(use_case, mock_repo, mock_session_scope):
    expected = LearningProgress(
        user_id="u1",
        course_id="c1",
        overall_progress_percent=0.0,
        completed_item_ids=[],
        weekly_deadlines=[],
    )
    mock_repo.reset_deadlines.return_value = (True, expected)

    result = await use_case.reset_deadlines("u1", "c1")
    assert result == (True, expected)
    mock_repo.reset_deadlines.assert_awaited_once_with("u1", "c1")


@pytest.mark.asyncio
async def test_save_personal_note(use_case, mock_repo, mock_session_scope):
    expected = PersonalNote(
        id="n1",
        user_id="u1",
        course_id="c1",
        item_id="i1",
        highlighted_text="text",
        note_comment="comment",
        created_at="2026",
    )
    mock_repo.save_personal_note.return_value = expected

    result = await use_case.save_personal_note("u1", "c1", "i1", "text", "comment")
    assert result == expected
    mock_repo.save_personal_note.assert_awaited_once_with(
        "u1", "c1", "i1", "text", "comment", 0
    )


@pytest.mark.asyncio
async def test_list_personal_notes(use_case, mock_repo, mock_session_scope):
    expected = [
        PersonalNote(
            id="n1",
            user_id="u1",
            course_id="c1",
            item_id="i1",
            highlighted_text="text",
            note_comment="comment",
            created_at="2026",
        )
    ]
    mock_repo.list_personal_notes.return_value = expected

    result = await use_case.list_personal_notes("u1", "c1")
    assert result == expected
    mock_repo.list_personal_notes.assert_awaited_once_with("u1", "c1")


@pytest.mark.asyncio
async def test_delete_personal_note(use_case, mock_repo, mock_session_scope):
    mock_repo.delete_personal_note.return_value = True

    result = await use_case.delete_personal_note("note_1", "user_1")
    assert result is True
    mock_repo.delete_personal_note.assert_awaited_once_with("note_1", "user_1")


@pytest.mark.asyncio
async def test_mark_item_complete(mock_repo, mock_session_scope):
    mock_catalog_repo = AsyncMock()

    # Setup mock course
    item = LearningItem(id="i1", title="item 1", type=ItemType.VIDEO)
    lesson = Lesson(id="l1", title="lesson 1", items=[item])
    week = WeekModule(id="w1", week_number=1, title="week 1", lessons=[lesson])
    mock_course = Course(
        id="c1", title="course 1", slug="course-1", week_modules=[week]
    )
    mock_catalog_repo.get_course_detail = AsyncMock(return_value=mock_course)

    expected = LearningProgress(
        user_id="u1",
        course_id="c1",
        overall_progress_percent=100.0,
        completed_item_ids=["i1"],
        weekly_deadlines=[],
    )
    mock_repo.mark_item_complete.return_value = (True, expected)

    use_case = LearningUseCase(
        repo_factory=lambda session: mock_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
    )
    result = await use_case.mark_item_complete("u1", "course-1", "i1")
    assert result == (True, expected)
    mock_catalog_repo.get_course_detail.assert_awaited_once_with("course-1")
    mock_repo.mark_item_complete.assert_awaited_once_with(
        "u1", "c1", "i1", 1, {"i1"}, {1: {"i1"}}
    )


@pytest.mark.asyncio
async def test_get_progress_with_current_item_id(
    use_case, mock_repo, mock_session_scope
):
    expected = LearningProgress(
        user_id="u1",
        course_id="c1",
        overall_progress_percent=0.0,
        completed_item_ids=[],
        weekly_deadlines=[],
        last_accessed_item_id="item-42",
        last_accessed_at="2026-11-03T20:00:00Z",
    )
    mock_repo.get_progress.return_value = expected

    result = await use_case.get_progress("u1", "c1", current_item_id="item-42")
    assert result == expected
    mock_repo.get_progress.assert_awaited_once_with("u1", "c1", "item-42")


@pytest.mark.asyncio
async def test_save_personal_note_with_timestamp(
    use_case, mock_repo, mock_session_scope
):
    expected = PersonalNote(
        id="n1",
        user_id="u1",
        course_id="c1",
        item_id="i1",
        highlighted_text="important insight",
        note_comment="remember this",
        created_at="2026-11-03T20:00:00Z",
        timestamp_seconds=125,
        updated_at="2026-11-03T20:00:00Z",
    )
    mock_repo.save_personal_note.return_value = expected

    result = await use_case.save_personal_note(
        "u1", "c1", "i1", "important insight", "remember this", timestamp_seconds=125
    )
    assert result == expected
    assert result.timestamp_seconds == 125
    mock_repo.save_personal_note.assert_awaited_once_with(
        "u1", "c1", "i1", "important insight", "remember this", 125
    )


@pytest.mark.asyncio
async def test_list_enrolled_courses_preserves_timestamps(
    use_case, mock_repo, mock_session_scope
):
    mock_catalog_repo = AsyncMock()
    mock_catalog_repo.get_course_detail = AsyncMock(
        return_value=Course(
            id="c1", title="Python 101", slug="python-101", partner_name="Google"
        )
    )
    progress = LearningProgress(
        user_id="u1",
        course_id="c1",
        overall_progress_percent=100.0,
        completed_item_ids=["i1"],
        last_accessed_at="2026-11-03T19:00:00Z",
        last_accessed_item_id="i1",
        enrolled_at="2026-11-01T10:00:00Z",
        completed_at="2026-11-03T19:00:00Z",
    )
    mock_repo.list_user_progresses = AsyncMock(return_value=[progress])

    use_case = LearningUseCase(
        repo_factory=lambda session: mock_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
    )
    summaries = await use_case.list_enrolled_courses("u1")
    assert len(summaries) == 1
    s = summaries[0]
    assert s.course_id == "c1"
    assert s.status == "COMPLETED"
    assert s.last_accessed_at == "2026-11-03T19:00:00Z"
    assert s.last_accessed_item_id == "i1"
    assert s.enrolled_at == "2026-11-01T10:00:00Z"
    assert s.completed_at == "2026-11-03T19:00:00Z"


@pytest.mark.asyncio
async def test_mark_item_complete_rpc_blocks_peer_review_bypass(
    mock_repo, mock_session_scope
):
    from unittest.mock import patch

    from connectrpc.code import Code
    from connectrpc.errors import ConnectError

    from src.gen.learning.v1 import learning_pb as pb
    from src.modules.learning.presentation.learning_handler import LearningHandler

    mock_catalog_repo = AsyncMock()
    peer_item = LearningItem(
        id="item-peer-1", title="Final Essay", type=ItemType.PEER_REVIEW
    )
    lesson = Lesson(id="l1", title="lesson 1", items=[peer_item])
    week = WeekModule(id="w1", week_number=1, title="week 1", lessons=[lesson])
    mock_catalog_repo.get_course_detail = AsyncMock(
        return_value=Course(
            id="c1", title="course 1", slug="course-1", week_modules=[week]
        )
    )

    use_case = LearningUseCase(
        repo_factory=lambda session: mock_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
    )
    handler = LearningHandler(use_case=use_case)

    class MockUser:
        id = "lazy-student"

    with (
        patch(
            "src.modules.learning.presentation.learning_handler.require_current_user",
            return_value=MockUser(),
        ),
        pytest.raises(ConnectError) as exc_info,
    ):
        await handler.mark_item_complete(
            pb.MarkItemCompleteRequest(course_id="c1", item_id="item-peer-1"),
            AsyncMock(),
        )

    assert exc_info.value.code == Code.PERMISSION_DENIED
    mock_repo.mark_item_complete.assert_not_awaited()


@pytest.mark.asyncio
async def test_mark_item_complete_verifies_graded_item_eligibility(
    mock_repo, mock_session_scope
):
    mock_catalog_repo = AsyncMock()
    quiz_item = LearningItem(
        id="item-quiz-1", title="Graded Quiz 1", type=ItemType.GRADED_QUIZ
    )
    lab_item = LearningItem(
        id="item-lab-1", title="Coding Lab 1", type=ItemType.AUTO_GRADED_LAB
    )
    peer_item = LearningItem(
        id="item-peer-1", title="Peer Essay 1", type=ItemType.PEER_REVIEW
    )
    lesson = Lesson(id="l1", title="lesson 1", items=[quiz_item, lab_item, peer_item])
    week = WeekModule(id="w1", week_number=1, title="week 1", lessons=[lesson])
    mock_catalog_repo.get_course_detail = AsyncMock(
        return_value=Course(
            id="c1", title="course 1", slug="course-1", week_modules=[week]
        )
    )

    use_case = LearningUseCase(
        repo_factory=lambda session: mock_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
    )

    # 1. Ineligible quiz -> PermissionError
    mock_repo.check_graded_item_completion_eligibility = AsyncMock(
        return_value=(False, "Chưa đạt điểm quiz")
    )
    with pytest.raises(PermissionError, match="Chưa đạt điểm quiz"):
        await use_case.mark_item_complete(
            "u1", "c1", "item-quiz-1", from_learner_rpc=True
        )
    mock_repo.mark_item_complete.assert_not_awaited()

    # 2. Ineligible lab -> PermissionError
    mock_repo.check_graded_item_completion_eligibility = AsyncMock(
        return_value=(False, "Chưa vượt qua bài lab")
    )
    with pytest.raises(PermissionError, match="Chưa vượt qua bài lab"):
        await use_case.mark_item_complete(
            "u1", "c1", "item-lab-1", from_learner_rpc=True
        )
    mock_repo.mark_item_complete.assert_not_awaited()

    # 3. Internal call for PEER_REVIEW still checks eligibility -> PermissionError when PENDING
    mock_repo.check_graded_item_completion_eligibility = AsyncMock(
        return_value=(False, "Chưa hoàn thành nghĩa vụ chấm bài")
    )
    with pytest.raises(PermissionError, match="nghĩa vụ chấm bài"):
        await use_case.mark_item_complete("u1", "c1", "item-peer-1")
    mock_repo.mark_item_complete.assert_not_awaited()

    # 4. Eligible quiz/lab/internal peer review -> succeeds
    expected = LearningProgress(
        user_id="u1",
        course_id="c1",
        overall_progress_percent=100.0,
        completed_item_ids=["item-quiz-1"],
    )
    mock_repo.check_graded_item_completion_eligibility = AsyncMock(
        return_value=(True, "")
    )
    mock_repo.mark_item_complete = AsyncMock(return_value=(True, expected))

    ok, prog = await use_case.mark_item_complete(
        "u1", "c1", "item-quiz-1", from_learner_rpc=True
    )
    assert ok is True
    assert prog == expected
    ok_peer, _ = await use_case.mark_item_complete("u1", "c1", "item-peer-1")
    assert ok_peer is True
