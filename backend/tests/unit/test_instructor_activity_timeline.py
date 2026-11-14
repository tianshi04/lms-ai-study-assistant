from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.modules.catalog.infrastructure.models import CourseModel
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.learning.infrastructure.models import (
    LearningProgressModel,
    PersonalNoteModel,
)


@pytest.mark.asyncio
async def test_get_instructor_activity_timeline_empty_courses():
    session = AsyncMock()
    repo = SQLAlchemyCatalogRepository(session)

    res = await repo.get_instructor_activity_timeline(
        course_ids=[],
        date_range="7d",
    )
    assert len(res.timeline) == 7
    for pt in res.timeline:
        assert pt.active_learners == 0
        assert pt.completed_items == 0
        assert pt.in_progress == 0
    assert len(res.heatmap) == 28
    for cell in res.heatmap:
        assert cell.count == 0
        assert cell.is_peak is False
    assert res.total_active_in_period == 0


@pytest.mark.asyncio
async def test_get_instructor_activity_timeline_with_data_and_peak():
    session = AsyncMock()
    repo = SQLAlchemyCatalogRepository(session)

    now = datetime.now(UTC)
    # Today at 20:00 (Evening / Tối)
    today_evening = datetime(now.year, now.month, now.day, 20, 0, 0, tzinfo=UTC)
    # Yesterday at 10:00 (Morning / Sáng)
    yesterday_morning = today_evening - timedelta(days=1, hours=10)

    p1 = LearningProgressModel(
        id="u1:c1",
        user_id="user-1",
        course_id="c1",
        overall_progress_percent=100.0,
        completed_item_ids=["item-1", "item-2"],
        enrolled_at=(now - timedelta(days=3)).isoformat(),
        last_accessed_at=today_evening.isoformat(),
        completed_at=today_evening.isoformat(),
    )
    p2 = LearningProgressModel(
        id="u2:c1",
        user_id="user-2",
        course_id="c1",
        overall_progress_percent=40.0,
        completed_item_ids=["item-1"],
        enrolled_at=(now - timedelta(days=2)).isoformat(),
        last_accessed_at=today_evening.isoformat(),
    )
    note1 = PersonalNoteModel(
        id="note-1",
        user_id="user-3",
        course_id="c1",
        item_id="item-1",
        highlighted_text="test",
        note_comment="test note",
        created_at=yesterday_morning.isoformat(),
        updated_at=yesterday_morning.isoformat(),
    )
    p3 = LearningProgressModel(
        id="u3:c1",
        user_id="user-3",
        course_id="c1",
        overall_progress_percent=20.0,
        completed_item_ids=[],
        enrolled_at=(now - timedelta(days=5)).isoformat(),
        last_accessed_at=yesterday_morning.isoformat(),
    )

    # Mock execute results
    async def mock_execute(stmt):
        m = MagicMock()
        text_stmt = str(stmt)
        if "learning_progresses" in text_stmt:
            m.scalars.return_value.all.return_value = [p1, p2, p3]
        elif "personal_notes" in text_stmt:
            m.scalars.return_value.all.return_value = [note1]
        elif "learning_item_progresses" in text_stmt:
            m.scalars.return_value.all.return_value = []
        else:
            m.scalars.return_value.all.return_value = []
        return m

    session.execute.side_effect = mock_execute

    res = await repo.get_instructor_activity_timeline(
        course_ids=["c1"],
        date_range="7d",
        learner_filter="all",
    )

    assert len(res.timeline) == 7
    # Total active across period should be 3 (user-1, user-2, user-3)
    assert res.total_active_in_period == 3

    # Heatmap should have 28 cells
    assert len(res.heatmap) == 28
    # Today evening has 2 active users (user-1 and user-2)
    # Check that at least one peak cell exists
    peak_cells = [c for c in res.heatmap if c.is_peak]
    assert len(peak_cells) >= 1
    assert peak_cells[0].count >= 2


@pytest.mark.asyncio
async def test_get_instructor_activity_timeline_date_ranges():
    session = AsyncMock()
    repo = SQLAlchemyCatalogRepository(session)

    async def mock_execute(stmt):
        m = MagicMock()
        m.scalars.return_value.all.return_value = []
        return m

    session.execute.side_effect = mock_execute

    for dr in ["today", "this_week", "last_week", "this_month", "last_month"]:
        res = await repo.get_instructor_activity_timeline(
            course_ids=["c1"],
            date_range=dr,
        )
        assert len(res.timeline) >= 7
        assert len(res.heatmap) == 28


@pytest.mark.asyncio
async def test_usecase_get_instructor_activity_timeline():
    from src.modules.catalog.application import CourseUseCase
    from src.shared.auth import CurrentUser

    repo_mock = AsyncMock()
    repo_mock.get_course_id_by_slug_or_id.return_value = "c1"
    repo_mock.get_course_detail.return_value = CourseModel(
        id="c1",
        title="Test Course",
        owner_id="inst-1",
    )
    repo_mock.get_instructor_activity_timeline.return_value = MagicMock(
        timeline=[],
        heatmap=[],
        total_active_in_period=0,
    )

    usecase = CourseUseCase(repo_factory=lambda _: repo_mock)
    user = CurrentUser(id="inst-1", email="inst@test.com", role="INSTRUCTOR")

    res = await usecase.get_instructor_activity_timeline(
        course_id="c1",
        date_range="7d",
        current_user=user,
    )
    assert res is not None
    repo_mock.get_instructor_activity_timeline.assert_called_once()
