import pytest
from unittest.mock import AsyncMock, patch
from src.modules.learning.application.learning_usecase import LearningUseCase
from src.modules.learning.domain.entities import LearningProgress, PersonalNote


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
    mock_repo.get_progress.assert_awaited_once_with("u1", "c1")


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
        "u1", "c1", "i1", "text", "comment"
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
async def test_mark_item_complete(use_case, mock_repo, mock_session_scope):
    expected = LearningProgress(
        user_id="u1",
        course_id="c1",
        overall_progress_percent=100.0,
        completed_item_ids=["i1"],
        weekly_deadlines=[],
    )
    mock_repo.mark_item_complete.return_value = (True, expected)

    result = await use_case.mark_item_complete("u1", "c1", "i1", 1)
    assert result == (True, expected)
    mock_repo.mark_item_complete.assert_awaited_once_with("u1", "c1", "i1", 1)
