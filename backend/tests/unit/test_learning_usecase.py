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
    LearningItemProgress,
    LearningProgress,
    PersonalNote,
    normalize_video_position,
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


def test_normalize_video_position_rules():
    assert normalize_video_position(125, 600) == (125, 600)
    assert normalize_video_position(595, 600) == (0, 600)
    assert normalize_video_position(750, 600) == (0, 600)
    # Short clips (<= 15s) are not prematurely reset at duration - 5
    assert normalize_video_position(10, 12) == (10, 12)
    # Unknown duration preserves positive position up to MAX_VIDEO_POSITION_SECONDS
    assert normalize_video_position(245, 0) == (245, 0)
    assert normalize_video_position(100000, 0) == (86400, 0)

    with pytest.raises(ValueError, match="Vị trí video"):
        normalize_video_position(-1, 600)

    with pytest.raises(ValueError, match="Thời lượng video"):
        normalize_video_position(10, -5)


@pytest.mark.asyncio
async def test_get_progress_with_video_positions(
    use_case, mock_repo, mock_session_scope
):
    expected_progress = LearningProgress(
        user_id="u1",
        course_id="c1",
        overall_progress_percent=20.0,
        completed_item_ids=[],
        weekly_deadlines=[],
    )
    expected_positions = [
        LearningItemProgress(
            user_id="u1",
            item_id="vid-1",
            course_id="c1",
            last_position_seconds=142,
            video_duration_seconds=600,
            position_updated_at="2026-11-17T10:00:00Z",
        )
    ]
    mock_repo.get_progress.return_value = expected_progress
    mock_repo.list_course_video_positions.return_value = expected_positions

    progress, positions = await use_case.get_progress_with_video_positions(
        "u1", "c1", current_item_id="vid-1"
    )
    assert progress == expected_progress
    assert positions == expected_positions
    mock_repo.get_progress.assert_awaited_once_with("u1", "c1", "vid-1")
    mock_repo.list_course_video_positions.assert_awaited_once_with("u1", "c1")


@pytest.mark.asyncio
async def test_save_video_position_validation_and_success(
    mock_repo, mock_session_scope
):
    mock_catalog_repo = AsyncMock()
    use_case = LearningUseCase(
        repo_factory=lambda session: mock_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
    )

    # 1. Non-existent course or item
    mock_catalog_repo.resolve_course_video_item.return_value = None
    with pytest.raises(ValueError, match="không thuộc khóa học"):
        await use_case.save_video_position("u1", "slug-1", "vid-1", 45, 300)

    # 2. Non-video item rejected
    mock_catalog_repo.resolve_course_video_item.return_value = ("c1", False)
    with pytest.raises(ValueError, match="không phải học liệu video"):
        await use_case.save_video_position("u1", "slug-1", "reading-1", 45, 300)

    # 3. Unenrolled user rejected without auto-enrolling
    mock_catalog_repo.resolve_course_video_item.return_value = ("c1", True)
    mock_repo.is_enrolled.return_value = False
    with pytest.raises(PermissionError, match="chưa ghi danh"):
        await use_case.save_video_position("u1", "slug-1", "vid-1", 45, 300)
    mock_repo.get_progress.assert_not_called()

    # 4. Success with near-end reset normalization
    mock_repo.is_enrolled.return_value = True
    mock_repo.save_video_position.return_value = (0, "2026-11-17T10:00:00Z")
    saved_pos, updated_at = await use_case.save_video_position(
        "u1", "slug-1", "vid-1", 297, 300
    )
    assert saved_pos == 0
    assert updated_at == "2026-11-17T10:00:00Z"
    assert mock_repo.save_video_position.call_args[1]["course_id"] == "c1"
    assert mock_repo.save_video_position.call_args[1]["position_seconds"] == 0
    assert mock_repo.save_video_position.call_args[1]["duration_seconds"] == 300
