from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from zoneinfo import ZoneInfo

import pytest

from src.modules.catalog.infrastructure.models import CourseModel
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.certificate.infrastructure.models import FinancialAidModel
from src.modules.identity.infrastructure.models import (
    EnterpriseLicenseModel,
    UserModel,
)
from src.modules.learning.infrastructure.models import (
    DailyCourseItemRecordModel,
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
    assert len(res.heatmap) == 35
    for cell in res.heatmap:
        assert cell.count == 0
        assert cell.is_peak is False
    assert res.total_active_in_period == 0


@pytest.mark.asyncio
async def test_get_instructor_activity_timeline_with_data_and_peak():
    session = AsyncMock()
    repo = SQLAlchemyCatalogRepository(session)

    vn_tz = ZoneInfo("Asia/Ho_Chi_Minh")
    now = datetime.now(vn_tz)
    # Today at 20:00 VN (Evening / Tối)
    today_evening = datetime(now.year, now.month, now.day, 20, 0, 0, tzinfo=vn_tz)
    # Yesterday at 10:00 VN (Morning / Sáng)
    yesterday_morning = today_evening - timedelta(days=1, hours=10)

    p1 = LearningProgressModel(
        id="u1:c1",
        user_id="user-1",
        course_id="c1",
        overall_progress_percent=100.0,
        completed_item_ids=["item-1", "item-2"],
        enrolled_at=(now - timedelta(days=3)).isoformat(),
        last_accessed_at=today_evening.astimezone(UTC).isoformat(),
        completed_at=today_evening.astimezone(UTC).isoformat(),
    )
    p2 = LearningProgressModel(
        id="u2:c1",
        user_id="user-2",
        course_id="c1",
        overall_progress_percent=40.0,
        completed_item_ids=["item-1"],
        enrolled_at=(now - timedelta(days=2)).isoformat(),
        last_accessed_at=today_evening.astimezone(UTC).isoformat(),
    )
    note1 = PersonalNoteModel(
        id="note-1",
        user_id="user-3",
        course_id="c1",
        item_id="item-1",
        highlighted_text="test",
        note_comment="test note",
        created_at=yesterday_morning.astimezone(UTC).isoformat(),
        updated_at=yesterday_morning.astimezone(UTC).isoformat(),
    )
    p3 = LearningProgressModel(
        id="u3:c1",
        user_id="user-3",
        course_id="c1",
        overall_progress_percent=20.0,
        completed_item_ids=[],
        enrolled_at=(now - timedelta(days=5)).isoformat(),
        last_accessed_at=yesterday_morning.astimezone(UTC).isoformat(),
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
    # Total completed items across timeline should be 2 (from p1's completed_at, never duplicated)
    assert sum(pt.completed_items for pt in res.timeline) == 2

    # Heatmap should have 35 cells
    assert len(res.heatmap) == 35
    # Today evening (20:00 VN) has 2 active users (user-1 and user-2) in Tối (18h-22h)
    day_labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
    today_vn_day = day_labels[today_evening.weekday()]
    peak_cells = [c for c in res.heatmap if c.is_peak]
    assert len(peak_cells) >= 1
    assert peak_cells[0].count >= 2
    assert any(
        c.day == today_vn_day and c.time_slot == "Tối (18h-22h)" and c.count == 2
        for c in peak_cells
    )


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
        assert len(res.heatmap) == 35


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


@pytest.mark.asyncio
async def test_get_instructor_activity_timeline_paid_segmented_filters():
    session = AsyncMock()
    repo = SQLAlchemyCatalogRepository(session)

    async def mock_execute(stmt):
        m = MagicMock()
        m.scalars.return_value.all.return_value = []
        return m

    session.execute.side_effect = mock_execute

    for flt in ["paid_in_progress", "paid_completed", "paid", "audit"]:
        res = await repo.get_instructor_activity_timeline(
            course_ids=["c1"],
            date_range="7d",
            learner_filter=flt,
        )
        assert len(res.timeline) == 7
        assert len(res.heatmap) == 35


@pytest.mark.asyncio
async def test_get_instructor_activity_timeline_vn_tz_and_no_completed_duplication():
    """Verify UTC->VN+7 heatmap mapping and that reviewing old items never multiplies completed_items."""
    session = AsyncMock()
    repo = SQLAlchemyCatalogRepository(session)

    vn_tz = ZoneInfo("Asia/Ho_Chi_Minh")
    now_vn = datetime.now(vn_tz)
    # Two days ago at 20:30 VN (which is 13:30 UTC - would be Chiều under UTC bug!)
    study_vn_evening = datetime(
        now_vn.year, now_vn.month, now_vn.day, 20, 30, 0, tzinfo=vn_tz
    ) - timedelta(days=2)
    # Ten days ago (outside 7d window)
    old_completion_utc = (now_vn - timedelta(days=10)).astimezone(UTC)

    p = LearningProgressModel(
        id="u1:c1",
        user_id="u1",
        course_id="c1",
        overall_progress_percent=80.0,
        completed_item_ids=[f"it-{i}" for i in range(8)],
        enrolled_at=(now_vn - timedelta(days=15)).astimezone(UTC).isoformat(),
        last_accessed_at=study_vn_evening.astimezone(UTC).isoformat(),
    )
    # Student reviewed across 4 distinct days in the last 7 days, all items originally completed 10 days ago
    notes = [
        PersonalNoteModel(
            id=f"n-{d}",
            user_id="u1",
            course_id="c1",
            item_id="it-0",
            highlighted_text="hi",
            note_comment="review",
            created_at=(study_vn_evening + timedelta(days=d % 2))
            .astimezone(UTC)
            .isoformat(),
            updated_at=(study_vn_evening + timedelta(days=d % 2))
            .astimezone(UTC)
            .isoformat(),
        )
        for d in range(4)
    ]
    old_dc = [
        DailyCourseItemRecordModel(
            user_id="u1",
            course_id="c1",
            study_date=old_completion_utc.date(),
            item_id=f"it-{i}",
            seconds_spent=300,
            last_studied_at=old_completion_utc.isoformat(),
        )
        for i in range(8)
    ]

    async def mock_execute(stmt):
        m = MagicMock()
        s = str(stmt)
        if "learning_progresses" in s:
            m.scalars.return_value.all.return_value = [p]
        elif "personal_notes" in s:
            m.scalars.return_value.all.return_value = notes
        elif "daily_course_item_records" in s:
            # First query is window-filtered (empty for old_dc), second is item-filtered (returns old_dc)
            if "daily_course_item_records.item_id IN" in s:
                m.scalars.return_value.all.return_value = old_dc
            else:
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

    # All 8 items were completed 10 days ago -> 0 completed items in 7d window (never 8 * 2 = 16 or 40)
    assert sum(pt.completed_items for pt in res.timeline) == 0

    day_labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
    expected_day = day_labels[study_vn_evening.weekday()]
    evening_cell = next(
        c
        for c in res.heatmap
        if c.day == expected_day and c.time_slot == "Tối (18h-22h)"
    )
    assert evening_cell.count == 1


@pytest.mark.asyncio
async def test_get_instructor_activity_timeline_paid_audit_strict_and_course_scoped():
    """Verify COMPLETED purchases, active subscriptions, active Enterprise scope, AUTO_APPROVED FA, and per-course isolation."""
    session = AsyncMock()
    repo = SQLAlchemyCatalogRepository(session)

    now_utc = datetime.now(UTC)
    recent_iso = now_utc.isoformat()

    # u_pending: only PENDING purchase -> must be AUDIT
    # u_expired_sub: expired subscription -> must be AUDIT
    # u_auto_fa: AUTO_APPROVED FA on c1 -> PAID on c1, AUDIT on c2
    # u_ent_c1: enterprise key scoped only to c1 -> PAID on c1, AUDIT on c2
    progresses = [
        LearningProgressModel(
            id="u_pending:c1",
            user_id="u_pending",
            course_id="c1",
            overall_progress_percent=20.0,
            last_accessed_at=recent_iso,
            enrolled_at=recent_iso,
        ),
        LearningProgressModel(
            id="u_expired_sub:c1",
            user_id="u_expired_sub",
            course_id="c1",
            overall_progress_percent=30.0,
            last_accessed_at=recent_iso,
            enrolled_at=recent_iso,
        ),
        LearningProgressModel(
            id="u_auto_fa:c2",
            user_id="u_auto_fa",
            course_id="c2",
            overall_progress_percent=40.0,
            last_accessed_at=recent_iso,
            enrolled_at=recent_iso,
        ),
        LearningProgressModel(
            id="u_ent_c1:c1",
            user_id="u_ent_c1",
            course_id="c1",
            overall_progress_percent=50.0,
            last_accessed_at=recent_iso,
            enrolled_at=recent_iso,
        ),
    ]

    async def mock_execute(stmt):
        m = MagicMock()
        s = str(stmt)
        if "learning_progresses" in s:
            m.scalars.return_value.all.return_value = progresses
        elif "course_purchases" in s:
            # SQL filters COMPLETED, so mock returns empty (PENDING excluded)
            m.scalars.return_value.all.return_value = []
        elif "user_subscriptions" in s:
            # SQL filters expires_at >= now, so expired excluded
            m.scalars.return_value.all.return_value = []
        elif "financial_aid_applications" in s:
            # u_auto_fa is approved for c1 only, NOT c2
            m.scalars.return_value.all.return_value = [
                FinancialAidModel(
                    id="fa-1",
                    user_id="u_auto_fa",
                    course_id="c1",
                    essay_150_words="word " * 150,
                    status="AUTO_APPROVED",
                )
            ]
        elif "FROM users" in s:
            m.scalars.return_value.all.return_value = [
                UserModel(
                    id="u_ent_c1",
                    email="ent@test.com",
                    full_name="Ent User",
                    enterprise_seat_key="ENT-C1-ONLY",
                )
            ]
        elif "enterprise_licenses" in s:
            m.scalars.return_value.all.return_value = [
                EnterpriseLicenseModel(
                    key="ENT-C1-ONLY",
                    partner_name="Partner",
                    is_active=True,
                    scope_type="SELECTED_COURSES",
                    allowed_course_ids=["c1"],
                )
            ]
        else:
            m.scalars.return_value.all.return_value = []
        return m

    session.execute.side_effect = mock_execute

    paid_res = await repo.get_instructor_activity_timeline(
        course_ids=["c1", "c2"],
        date_range="7d",
        learner_filter="paid",
    )
    # Only u_ent_c1 on c1 is PAID; u_auto_fa on c2 is NOT paid for c2!
    assert paid_res.total_active_in_period == 1

    audit_res = await repo.get_instructor_activity_timeline(
        course_ids=["c1", "c2"],
        date_range="7d",
        learner_filter="audit",
    )
    # u_pending, u_expired_sub, and u_auto_fa (for c2) are AUDIT
    assert audit_res.total_active_in_period == 3
