from datetime import date, timedelta
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
from src.modules.learning.application.learning_usecase import _resolve_study_date
from src.modules.learning.domain import (
    DailyStudyRecord,
    LearningProgress,
    UserLearningStreak,
)


def test_user_learning_streak_entity():
    today = date(2026, 11, 4)
    yesterday = date(2026, 11, 3)

    # 1. New streak
    streak = UserLearningStreak(user_id="u1")
    assert streak.get_effective_streak(today) == 0

    # 2. Advance streak on day 1
    advanced = streak.advance_streak(yesterday, "2026-11-03T10:00:00Z")
    assert advanced is True
    assert streak.current_streak == 1
    assert streak.longest_streak == 1
    assert streak.last_active_date == yesterday

    # 3. Same day advance -> False, no change
    advanced_same_day = streak.advance_streak(yesterday, "2026-11-03T15:00:00Z")
    assert advanced_same_day is False
    assert streak.current_streak == 1

    # 4. Effective streak on next day (still active)
    assert streak.get_effective_streak(today) == 1

    # 5. Consecutive day advance -> current_streak = 2, longest = 2
    advanced_consecutive = streak.advance_streak(today, "2026-11-04T08:00:00Z")
    assert advanced_consecutive is True
    assert streak.current_streak == 2
    assert streak.longest_streak == 2
    assert streak.last_active_date == today

    # 6. Missed day check (gap of 2 days: streak resets to 1 on advance)
    future_day = date(2026, 11, 7)
    assert streak.get_effective_streak(future_day) == 0

    advanced_after_gap = streak.advance_streak(future_day, "2026-11-07T12:00:00Z")
    assert advanced_after_gap is True
    assert streak.current_streak == 1
    assert streak.longest_streak == 2


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


@pytest.fixture
def mock_rate_limiter():
    with patch(
        "src.modules.learning.application.learning_usecase.check_learning_heartbeat_rate_limit",
        new_callable=AsyncMock,
        return_value=True,
    ) as mock_limit:
        yield mock_limit


@pytest.fixture
def sample_course():
    item = LearningItem(
        id="item-1",
        title="Intro Video",
        type=ItemType.VIDEO,
        estimated_minutes=5,
    )
    lesson = Lesson(id="l1", title="Lesson 1", items=[item])
    module = WeekModule(id="m1", title="Week 1", week_number=1, lessons=[lesson])
    return Course(
        id="course-1",
        title="Test Course",
        slug="test-course",
        week_modules=[module],
    )


@pytest.mark.asyncio
async def test_record_learning_time_validation(
    mock_session_scope, mock_rate_limiter, sample_course
):
    mock_repo = AsyncMock()
    mock_catalog_repo = AsyncMock()
    mock_catalog_repo.get_course_detail.return_value = sample_course

    # Enrolled user progress
    mock_repo.get_progress.return_value = LearningProgress(
        user_id="u1",
        course_id="course-1",
        enrolled_at="2026-11-03T10:00:00Z",
    )

    use_case = LearningUseCase(
        repo_factory=lambda s: mock_repo,
        catalog_repo_factory=lambda s: mock_catalog_repo,
    )

    # 1. Delta < MIN (0) -> Ignored early
    res = await use_case.record_learning_time(
        user_id="u1", course_id="course-1", item_id="item-1", delta_seconds=0
    )
    assert res == (0, 0, 0, False)
    mock_repo.record_learning_time.assert_not_called()

    # 2. Invalid course -> ValueError
    mock_catalog_repo.get_course_detail.return_value = None
    with pytest.raises(ValueError, match="không tồn tại"):
        await use_case.record_learning_time(
            user_id="u1", course_id="non-existent", item_id="item-1", delta_seconds=30
        )

    # 3. Invalid item -> ValueError
    mock_catalog_repo.get_course_detail.return_value = sample_course
    with pytest.raises(ValueError, match="không thuộc khóa học"):
        await use_case.record_learning_time(
            user_id="u1", course_id="course-1", item_id="invalid-item", delta_seconds=30
        )

    # 4. Non-enrolled user -> PermissionError
    mock_repo.get_progress.return_value = LearningProgress(
        user_id="u_unregistered",
        course_id="course-1",
        enrolled_at="",  # Not enrolled
    )
    with pytest.raises(PermissionError, match="chưa ghi danh"):
        await use_case.record_learning_time(
            user_id="u_unregistered",
            course_id="course-1",
            item_id="item-1",
            delta_seconds=30,
        )

    # 5. Valid enrolled user and clamped delta
    mock_repo.get_progress.return_value = LearningProgress(
        user_id="u1",
        course_id="course-1",
        enrolled_at="2026-11-03T10:00:00Z",
    )
    mock_repo.record_learning_time.return_value = (300, 300, 1, True)
    res_valid = await use_case.record_learning_time(
        user_id="u1",
        course_id="course-1",
        item_id="item-1",
        delta_seconds=200,  # exceeds 120s limit -> clamped to 120
        client_timezone="Asia/Ho_Chi_Minh",
    )
    assert res_valid == (300, 300, 1, True)
    args = mock_repo.record_learning_time.call_args[1]
    assert args["delta_seconds"] == 120
    assert args["user_id"] == "u1"
    assert args["item_id"] == "item-1"

    # 6. Rate limited ping -> Throttled
    mock_rate_limiter.return_value = False
    res_throttled = await use_case.record_learning_time(
        user_id="u1",
        course_id="course-1",
        item_id="item-1",
        delta_seconds=30,
    )
    assert res_throttled == (0, 0, 0, False)


@pytest.mark.asyncio
async def test_get_learning_streak(mock_session_scope):
    mock_repo = AsyncMock()
    today = _resolve_study_date("Asia/Ho_Chi_Minh")
    yesterday = today - timedelta(days=1)

    streak = UserLearningStreak(
        user_id="u1",
        current_streak=5,
        longest_streak=10,
        last_active_date=yesterday,
        total_study_seconds=3600,
    )
    recent_days = [
        DailyStudyRecord(
            date=yesterday.isoformat(), total_seconds=300, is_streak_qualified=True
        )
    ]
    mock_repo.get_learning_streak_stats.return_value = (streak, 0, recent_days)

    use_case = LearningUseCase(repo_factory=lambda s: mock_repo)
    result = await use_case.get_learning_streak(
        user_id="u1", client_timezone="Asia/Ho_Chi_Minh"
    )

    effective_streak, longest, today_sec, total_sec, last_act, days = result
    assert effective_streak == 5
    assert longest == 10
    assert today_sec == 0
    assert total_sec == 3600
    assert last_act == yesterday.isoformat()
    assert len(days) == 1
