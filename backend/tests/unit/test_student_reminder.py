from unittest.mock import AsyncMock, patch

import pytest

from src.modules.catalog.application.course_review_usecase import CourseReviewUseCase
from src.modules.catalog.domain import Course, CourseStatus
from src.modules.catalog.domain.events import StudentReminderSentDomainEvent
from src.modules.notification.application.event_handlers import (
    handle_student_reminder_sent,
)
from src.modules.notification.domain import NotificationCategory
from src.shared.auth import CurrentUser


@pytest.fixture
def mock_repo():
    return AsyncMock()


@pytest.mark.asyncio
async def test_send_student_reminder_success(mock_repo):
    course = Course(
        id="course-123",
        title="Kinh tế học Vi mô Căn bản",
        slug="kinh-te-hoc-vi-mo",
        owner_id="inst-1",
        co_instructor_ids=[],
        status=CourseStatus.PUBLISHED,
    )
    mock_repo.get_course_detail.return_value = course
    mock_repo.get_course_id_by_slug_or_id.return_value = "course-123"
    mock_repo.get_enrolled_user_ids.return_value = ["student-1", "student-2"]

    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    instructor = CurrentUser(
        id="inst-1",
        email="instructor@coursera.ai",
        role="INSTRUCTOR",
    )

    with (
        patch(
            "src.modules.catalog.application.course_review_usecase.async_session_scope"
        ) as mock_scope,
        patch(
            "src.modules.catalog.application.course_review_usecase.EventBus"
        ) as mock_bus,
    ):
        mock_ctx = AsyncMock()
        mock_scope.return_value.__aenter__.return_value = mock_ctx
        mock_bus.publish = AsyncMock()

        count, sent_ids = await uc.send_student_reminder(
            course_id="course-123",
            student_ids=["student-1", "student-2"],
            title="Đôn đốc hoàn thành bài tập",
            content="Vui lòng hoàn thành bài học tuần này nhé!",
            current_user=instructor,
        )

        assert count == 2
        assert sent_ids == ["student-1", "student-2"]
        mock_bus.publish.assert_called_once()
        published_event = mock_bus.publish.call_args[0][0]
        assert isinstance(published_event, StudentReminderSentDomainEvent)
        assert published_event.course_id == "course-123"
        assert published_event.student_ids == ["student-1", "student-2"]
        assert published_event.title == "Đôn đốc hoàn thành bài tập"
        assert published_event.instructor_name == "instructor"


@pytest.mark.asyncio
async def test_send_student_reminder_deduplication(mock_repo):
    course = Course(
        id="course-123",
        title="Kinh tế học Vi mô Căn bản",
        slug="kinh-te-hoc-vi-mo",
        owner_id="inst-1",
        co_instructor_ids=[],
        status=CourseStatus.PUBLISHED,
    )
    mock_repo.get_course_detail.return_value = course
    mock_repo.get_course_id_by_slug_or_id.return_value = "course-123"
    mock_repo.get_enrolled_user_ids.return_value = ["student-1", "student-2"]

    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    instructor = CurrentUser(
        id="inst-1",
        email="instructor@coursera.ai",
        role="INSTRUCTOR",
    )

    with (
        patch(
            "src.modules.catalog.application.course_review_usecase.async_session_scope"
        ) as mock_scope,
        patch(
            "src.modules.catalog.application.course_review_usecase.EventBus"
        ) as mock_bus,
    ):
        mock_ctx = AsyncMock()
        mock_scope.return_value.__aenter__.return_value = mock_ctx
        mock_bus.publish = AsyncMock()

        # Duplicates in student_ids
        count, sent_ids = await uc.send_student_reminder(
            course_id="course-123",
            student_ids=["student-1", "student-1", "student-2", "student-2"],
            title="Đôn đốc",
            content="Nội dung",
            current_user=instructor,
        )

        assert count == 2
        assert sent_ids == ["student-1", "student-2"]


@pytest.mark.asyncio
async def test_send_student_reminder_batch_limit_exceeded(mock_repo):
    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    instructor = CurrentUser(
        id="inst-1", email="instructor@coursera.ai", role="INSTRUCTOR"
    )

    with pytest.raises(ValueError, match="vượt quá giới hạn cho phép"):
        await uc.send_student_reminder(
            course_id="course-123",
            student_ids=[f"student-{i}" for i in range(101)],
            title="Đôn đốc",
            content="Nội dung",
            current_user=instructor,
        )


@pytest.mark.asyncio
async def test_send_student_reminder_empty_or_whitespace_content(mock_repo):
    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    instructor = CurrentUser(
        id="inst-1", email="instructor@coursera.ai", role="INSTRUCTOR"
    )

    with pytest.raises(ValueError, match="Tiêu đề thông báo không được để trống"):
        await uc.send_student_reminder(
            course_id="course-123",
            student_ids=["student-1"],
            title="   ",
            content="Nội dung",
            current_user=instructor,
        )

    with pytest.raises(ValueError, match="Nội dung thông báo không được để trống"):
        await uc.send_student_reminder(
            course_id="course-123",
            student_ids=["student-1"],
            title="Tiêu đề",
            content="   ",
            current_user=instructor,
        )


@pytest.mark.asyncio
async def test_send_student_reminder_empty_course_id(mock_repo):
    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    instructor = CurrentUser(
        id="inst-1",
        email="instructor@test.com",
        role="INSTRUCTOR",
    )

    with pytest.raises(ValueError, match="Mã khóa học không được để trống"):
        await uc.send_student_reminder(
            course_id="   ",
            student_ids=["student-1"],
            title="Nhắc nhở",
            content="Nội dung",
            current_user=instructor,
        )


@pytest.mark.asyncio
async def test_send_student_reminder_unauthenticated(mock_repo):
    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)

    with patch(
        "src.modules.catalog.application.course_review_usecase.async_session_scope"
    ) as mock_scope:
        mock_ctx = AsyncMock()
        mock_scope.return_value.__aenter__.return_value = mock_ctx

        with pytest.raises(
            PermissionError, match="Bạn không có quyền gửi thông báo nhắc nhở học viên"
        ):
            await uc.send_student_reminder(
                course_id="course-123",
                student_ids=["student-1"],
                title="Nhắc nhở",
                content="Nội dung",
                current_user=None,
            )


@pytest.mark.asyncio
async def test_send_student_reminder_empty_student_ids(mock_repo):
    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    instructor = CurrentUser(
        id="inst-1",
        email="instructor@test.com",
        role="INSTRUCTOR",
    )

    count, sent_ids = await uc.send_student_reminder(
        course_id="course-123",
        student_ids=[],
        title="Nhắc nhở",
        content="Nội dung",
        current_user=instructor,
    )
    assert count == 0
    assert sent_ids == []
    mock_repo.get_course_detail.assert_not_called()


@pytest.mark.asyncio
async def test_send_student_reminder_filters_non_enrolled_students(mock_repo):
    course = Course(
        id="course-123",
        title="Kinh tế học Vi mô Căn bản",
        slug="kinh-te-hoc-vi-mo",
        owner_id="inst-1",
        co_instructor_ids=[],
        status=CourseStatus.PUBLISHED,
    )
    mock_repo.get_course_detail.return_value = course
    mock_repo.get_course_id_by_slug_or_id.return_value = "course-123"
    # Only student-1 is actually enrolled in this course
    mock_repo.get_enrolled_user_ids.return_value = ["student-1"]

    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    instructor = CurrentUser(
        id="inst-1",
        email="instructor@coursera.ai",
        role="INSTRUCTOR",
    )

    with (
        patch(
            "src.modules.catalog.application.course_review_usecase.async_session_scope"
        ) as mock_scope,
        patch(
            "src.modules.catalog.application.course_review_usecase.EventBus"
        ) as mock_bus,
    ):
        mock_ctx = AsyncMock()
        mock_scope.return_value.__aenter__.return_value = mock_ctx
        mock_bus.publish = AsyncMock()

        # Attacker tries to include student-stranger from another course
        count, sent_ids = await uc.send_student_reminder(
            course_id="course-123",
            student_ids=["student-1", "student-stranger"],
            title="Đôn đốc",
            content="Nội dung",
            current_user=instructor,
        )

        assert count == 1
        assert sent_ids == ["student-1"]
        mock_bus.publish.assert_called_once()
        published_event = mock_bus.publish.call_args[0][0]
        assert published_event.student_ids == ["student-1"]


@pytest.mark.asyncio
async def test_send_student_reminder_all_non_enrolled(mock_repo):
    course = Course(
        id="course-123",
        title="Kinh tế học Vi mô Căn bản",
        slug="kinh-te-hoc-vi-mo",
        owner_id="inst-1",
        co_instructor_ids=[],
        status=CourseStatus.PUBLISHED,
    )
    mock_repo.get_course_detail.return_value = course
    mock_repo.get_course_id_by_slug_or_id.return_value = "course-123"
    # No enrolled students match
    mock_repo.get_enrolled_user_ids.return_value = ["other-student"]

    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    instructor = CurrentUser(
        id="inst-1",
        email="instructor@coursera.ai",
        role="INSTRUCTOR",
    )

    with (
        patch(
            "src.modules.catalog.application.course_review_usecase.async_session_scope"
        ) as mock_scope,
        patch(
            "src.modules.catalog.application.course_review_usecase.EventBus"
        ) as mock_bus,
    ):
        mock_ctx = AsyncMock()
        mock_scope.return_value.__aenter__.return_value = mock_ctx
        mock_bus.publish = AsyncMock()

        count, sent_ids = await uc.send_student_reminder(
            course_id="course-123",
            student_ids=["student-stranger"],
            title="Đôn đốc",
            content="Nội dung",
            current_user=instructor,
        )

        assert count == 0
        assert sent_ids == []
        mock_bus.publish.assert_not_called()


@pytest.mark.asyncio
async def test_send_student_reminder_ta_allowed(mock_repo):
    course = Course(
        id="course-123",
        title="Kinh tế học Vi mô Căn bản",
        slug="kinh-te-hoc-vi-mo",
        owner_id="inst-1",
        co_instructor_ids=[],
        ta_ids=["ta-user-1"],
        status=CourseStatus.PUBLISHED,
    )
    mock_repo.get_course_detail.return_value = course
    mock_repo.get_course_id_by_slug_or_id.return_value = "course-123"
    mock_repo.get_enrolled_user_ids.return_value = ["student-1"]

    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    ta_user = CurrentUser(
        id="ta-user-1",
        email="ta@coursera.ai",
        role="LEARNER",  # System role might be learner or staff, but in course is TA
    )

    with (
        patch(
            "src.modules.catalog.application.course_review_usecase.async_session_scope"
        ) as mock_scope,
        patch(
            "src.modules.catalog.application.course_review_usecase.EventBus"
        ) as mock_bus,
    ):
        mock_ctx = AsyncMock()
        mock_scope.return_value.__aenter__.return_value = mock_ctx
        mock_bus.publish = AsyncMock()

        count, sent_ids = await uc.send_student_reminder(
            course_id="course-123",
            student_ids=["student-1"],
            title="Nhắc nhở từ trợ giảng",
            content="Nhớ nộp bài nhé",
            current_user=ta_user,
        )
        assert count == 1
        assert sent_ids == ["student-1"]


@pytest.mark.asyncio
async def test_send_student_reminder_permission_denied(mock_repo):
    course = Course(
        id="course-123",
        title="Kinh tế học Vi mô Căn bản",
        slug="kinh-te-hoc-vi-mo",
        owner_id="inst-1",
        co_instructor_ids=["inst-co-1"],
        status=CourseStatus.PUBLISHED,
    )
    mock_repo.get_course_detail.return_value = course

    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    hacker = CurrentUser(
        id="hacker-999",
        email="hacker@test.com",
        role="INSTRUCTOR",
    )

    with patch(
        "src.modules.catalog.application.course_review_usecase.async_session_scope"
    ) as mock_scope:
        mock_ctx = AsyncMock()
        mock_scope.return_value.__aenter__.return_value = mock_ctx

        with pytest.raises(
            PermissionError, match="Bạn không có quyền gửi thông báo nhắc nhở học viên"
        ):
            await uc.send_student_reminder(
                course_id="course-123",
                student_ids=["student-1"],
                title="Spam",
                content="Spam",
                current_user=hacker,
            )


@pytest.mark.asyncio
async def test_send_student_reminder_course_not_found(mock_repo):
    mock_repo.get_course_detail.return_value = None

    uc = CourseReviewUseCase(repo_factory=lambda _: mock_repo)
    instructor = CurrentUser(
        id="inst-1",
        email="instructor@test.com",
        role="INSTRUCTOR",
    )

    with patch(
        "src.modules.catalog.application.course_review_usecase.async_session_scope"
    ) as mock_scope:
        mock_ctx = AsyncMock()
        mock_scope.return_value.__aenter__.return_value = mock_ctx

        with pytest.raises(ValueError, match="Khóa học không tồn tại"):
            await uc.send_student_reminder(
                course_id="nonexistent-course",
                student_ids=["student-1"],
                title="Spam",
                content="Spam",
                current_user=instructor,
            )


@pytest.mark.asyncio
async def test_handle_student_reminder_sent_event():
    event = StudentReminderSentDomainEvent(
        course_id="course-123",
        instructor_id="inst-1",
        instructor_name="Thầy Ba",
        student_ids=["student-1", "student-2"],
        title="Nhắc nhở nộp bài tập",
        content="Hãy vào học đúng hạn nhé",
    )

    with patch(
        "src.modules.notification.application.event_handlers.NotificationUseCase"
    ) as mock_notif_uc_cls:
        mock_uc_instance = AsyncMock()
        mock_notif_uc_cls.return_value = mock_uc_instance

        await handle_student_reminder_sent(event)

        mock_uc_instance.send_batch_notifications.assert_called_once_with(
            recipient_ids=["student-1", "student-2"],
            category=NotificationCategory.ACADEMIC,
            title="Nhắc nhở nộp bài tập",
            content="Hãy vào học đúng hạn nhé",
            action_url="/learn/course-123",
        )
