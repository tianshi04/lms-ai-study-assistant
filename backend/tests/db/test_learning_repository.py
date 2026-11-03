from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.modules.learning.domain import DeadlineStatus
from src.modules.learning.infrastructure.models import (
    LearningProgressModel,
    PersonalNoteModel,
    WeeklyDeadlineModel,
)
from src.modules.learning.infrastructure.repository import SQLAlchemyLearningRepository


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
def repository(mock_session):
    return SQLAlchemyLearningRepository(session=mock_session)


@pytest.mark.asyncio
async def test_get_progress_existing(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=50.0,
        completed_item_ids=["i1"],
        weekly_deadlines=[],
    )

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    progress = await repository.get_progress("u1", "c1")

    assert progress.user_id == "u1"
    assert progress.course_id == "c1"
    assert progress.overall_progress_percent == 50.0
    assert progress.completed_item_ids == ["i1"]
    mock_session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_progress_not_existing_pure_query(repository, mock_session):
    mock_res_none = MagicMock()
    mock_res_none.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res_none

    progress = await repository.get_progress("u2", "c2")

    assert progress.user_id == "u2"
    assert progress.course_id == "c2"
    assert progress.overall_progress_percent == 0.0
    assert progress.completed_item_ids == []
    assert len(progress.weekly_deadlines) == 0


@pytest.mark.asyncio
async def test_get_progress_not_existing_with_current_item(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u2:c2",
        user_id="u2",
        course_id="c2",
        overall_progress_percent=0.0,
        completed_item_ids=[],
        weekly_deadlines=[],
    )
    mock_res_none = MagicMock()
    mock_res_none.scalar_one_or_none.return_value = None

    mock_res_found = MagicMock()
    mock_res_found.scalar_one.return_value = mock_model

    mock_session.execute.side_effect = [mock_res_none, None, mock_res_found]

    progress = await repository.get_progress("u2", "c2", "item-1")

    assert progress.user_id == "u2"
    assert progress.course_id == "c2"
    assert progress.overall_progress_percent == 0.0
    assert progress.completed_item_ids == []
    assert len(progress.weekly_deadlines) == 2


@pytest.mark.asyncio
async def test_reset_deadlines_existing(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=0.0,
        completed_item_ids=[],
        weekly_deadlines=[
            WeeklyDeadlineModel(
                week_number=1, due_date="old", status=DeadlineStatus.OVERDUE
            )
        ],
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    success, progress = await repository.reset_deadlines("u1", "c1")

    assert success is True
    assert progress.user_id == "u1"
    assert len(progress.weekly_deadlines) == 1
    assert progress.weekly_deadlines[0].status == DeadlineStatus.ON_TRACK
    assert progress.weekly_deadlines[0].due_date != "old"
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_reset_deadlines_not_existing(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=0.0,
        completed_item_ids=[],
        weekly_deadlines=[
            WeeklyDeadlineModel(
                week_number=1, due_date="old", status=DeadlineStatus.OVERDUE
            )
        ],
    )

    with patch.object(repository, "get_progress", new_callable=AsyncMock) as mock_get:
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_result.scalar_one.return_value = mock_model

        mock_session.execute.side_effect = [mock_result, mock_result]

        success, progress = await repository.reset_deadlines("u1", "c1")
        mock_get.assert_awaited_once_with("u1", "c1")
        assert success is True
        mock_session.commit.assert_awaited_once()
        assert progress.weekly_deadlines[0].status == DeadlineStatus.ON_TRACK


@pytest.mark.asyncio
async def test_save_personal_note(repository, mock_session):
    note = await repository.save_personal_note("u1", "c1", "i1", "highlight", "comment")

    assert note.user_id == "u1"
    assert note.course_id == "c1"
    assert note.item_id == "i1"
    assert note.highlighted_text == "highlight"
    assert note.note_comment == "comment"
    assert note.id.startswith("note-")

    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_save_personal_note_generates_unique_ids_consecutively(
    repository, mock_session
):
    note1 = await repository.save_personal_note("u1", "c1", "i1", "first", "")
    note2 = await repository.save_personal_note("u1", "c1", "i1", "second", "")

    assert note1.id != note2.id
    assert len(note1.id) == len("note-") + 32
    assert len(note2.id) == len("note-") + 32


@pytest.mark.asyncio
async def test_list_personal_notes(repository, mock_session):
    mock_model = PersonalNoteModel(
        id="n1",
        user_id="u1",
        course_id="c1",
        item_id="i1",
        highlighted_text="t",
        note_comment="c",
        created_at="2026-01-01",
    )

    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [mock_model]
    mock_session.execute.return_value = mock_result

    notes = await repository.list_personal_notes("u1", "c1")
    assert len(notes) == 1
    assert notes[0].id == "n1"
    mock_session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_mark_item_complete_existing(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=0.0,
        completed_item_ids=["i1"],
        weekly_deadlines=[],
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    success, progress = await repository.mark_item_complete("u1", "c1", "i2", 2)
    assert success is True
    assert set(progress.completed_item_ids) == {"i1", "i2"}
    assert progress.overall_progress_percent == 100.0
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_mark_item_complete_not_existing(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=0.0,
        completed_item_ids=[],
        weekly_deadlines=[],
    )
    with patch.object(repository, "get_progress", new_callable=AsyncMock) as mock_get:
        mock_result_none = MagicMock()
        mock_result_none.scalar_one_or_none.return_value = None
        mock_result_none.scalar_one.return_value = mock_model

        mock_session.execute.side_effect = [mock_result_none, mock_result_none]

        success, progress = await repository.mark_item_complete("u1", "c1", "i1", 1)
        mock_get.assert_awaited_once_with("u1", "c1")
        assert success is True
        assert progress.completed_item_ids == ["i1"]
        assert progress.overall_progress_percent == 100.0
        mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_mark_item_complete_with_valid_item_ids(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=0.0,
        completed_item_ids=["i1"],
        weekly_deadlines=[],
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    success, progress = await repository.mark_item_complete(
        "u1", "c1", "invalid_i2", 2, valid_item_ids=["i1", "i3"]
    )
    assert success is True
    # i1 is valid and was completed. invalid_i2 is ignored because it's not in valid_item_ids.
    assert set(progress.completed_item_ids) == {"i1"}
    assert progress.overall_progress_percent == 50.0


@pytest.mark.asyncio
async def test_list_user_progresses(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=25.0,
        completed_item_ids=["i1"],
        weekly_deadlines=[],
    )
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [mock_model]
    mock_session.execute.return_value = mock_result

    res = await repository.list_user_progresses("u1")
    assert len(res) == 1
    assert res[0].course_id == "c1"
    assert res[0].overall_progress_percent == 25.0


@pytest.mark.asyncio
async def test_list_enrolled_courses(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=25.0,
        completed_item_ids=["i1"],
        weekly_deadlines=[],
    )
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = [mock_model]
    mock_session.execute.return_value = mock_result

    res = await repository.list_enrolled_courses("u1")
    assert len(res) == 1
    assert res[0].course_id == "c1"
    assert res[0].course_title == ""


@pytest.mark.asyncio
async def test_get_progress_no_week_modules(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=0.0,
        completed_item_ids=[],
        weekly_deadlines=[],
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_result.scalar_one.return_value = mock_model
    mock_session.execute.return_value = mock_result

    res = await repository.get_progress("u1", "c1")
    assert res.course_id == "c1"
    assert res.user_id == "u1"


@pytest.mark.asyncio
async def test_reset_deadlines_progress_not_found(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=25.0,
        completed_item_ids=["i1"],
        weekly_deadlines=[],
        last_reset_at=None,
    )
    with patch.object(repository, "get_progress", new_callable=AsyncMock) as _:
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_result.scalar_one.return_value = mock_model
        mock_session.execute.side_effect = [mock_result, mock_result]

        success, res = await repository.reset_deadlines("u1", "c1")
        assert success is True
        assert res.course_id == "c1"


@pytest.mark.asyncio
async def test_save_personal_note_with_timestamp_seconds(repository, mock_session):
    note = await repository.save_personal_note(
        "u1", "c1", "i1", "highlight text", "comment text", timestamp_seconds=120
    )
    assert note.timestamp_seconds == 120
    assert note.created_at != ""
    assert note.updated_at != ""
    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_progress_updates_last_accessed_item_id(repository, mock_session):
    mock_model = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=50.0,
        completed_item_ids=["i1"],
        weekly_deadlines=[],
        last_accessed_item_id="i1",
        last_accessed_at="2026-11-01T00:00:00Z",
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_model
    mock_session.execute.return_value = mock_result

    res = await repository.get_progress("u1", "c1", current_item_id="i2")
    assert mock_model.last_accessed_item_id == "i2"
    assert res.last_accessed_item_id == "i2"
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_record_learning_time_repository(repository, mock_session):
    from datetime import date

    from src.modules.learning.infrastructure.models import UserLearningStreakModel

    mock_item_res = MagicMock()
    mock_item_res.scalar_one.return_value = 60

    mock_daily_res = MagicMock()
    mock_daily_res.scalar_one.return_value = 60

    mock_streak_model = UserLearningStreakModel(
        user_id="u1",
        current_streak=1,
        longest_streak=1,
        last_active_date=date(2026, 11, 4),
        total_study_seconds=60,
    )
    mock_init_res = MagicMock()
    mock_streak_res = MagicMock()
    mock_streak_res.scalar_one.return_value = mock_streak_model

    mock_session.execute.side_effect = [
        mock_item_res,
        mock_daily_res,
        mock_init_res,
        mock_streak_res,
    ]

    (
        item_total,
        today_total,
        streak,
        is_extended,
    ) = await repository.record_learning_time(
        user_id="u1",
        course_id="c1",
        item_id="i1",
        delta_seconds=30,
        study_date=date(2026, 11, 4),
        now_iso="2026-11-04T10:00:00Z",
    )

    assert item_total == 60
    assert today_total == 60
    assert streak == 1
    assert is_extended is False
    mock_session.commit.assert_awaited()


@pytest.mark.asyncio
async def test_get_learning_streak_stats_repository(repository, mock_session):
    from datetime import date

    from src.modules.learning.infrastructure.models import (
        DailyLearningRecordModel,
        UserLearningStreakModel,
    )

    mock_streak_model = UserLearningStreakModel(
        user_id="u1",
        current_streak=3,
        longest_streak=5,
        last_active_date=date(2026, 11, 3),
        total_study_seconds=1800,
    )
    mock_res_streak = MagicMock()
    mock_res_streak.scalar_one_or_none.return_value = mock_streak_model

    today = date(2026, 11, 4)
    daily_rec = DailyLearningRecordModel(
        user_id="u1",
        study_date=today,
        total_seconds=400,
        is_streak_qualified=True,
    )
    mock_res_daily = MagicMock()
    mock_res_daily.scalars.return_value.all.return_value = [daily_rec]

    mock_session.execute.side_effect = [mock_res_streak, mock_res_daily]

    streak_entity, today_sec, recent_days = await repository.get_learning_streak_stats(
        user_id="u1", today=today
    )

    assert streak_entity.current_streak == 3
    assert streak_entity.longest_streak == 5
    assert today_sec == 400
    assert len(recent_days) == 7
    # 7th day is today
    assert recent_days[-1].date == today.isoformat()
    assert recent_days[-1].total_seconds == 400
    assert recent_days[-1].is_streak_qualified is True
