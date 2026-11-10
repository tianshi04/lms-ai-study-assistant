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

        count = await uc.send_student_reminder(
            course_id="course-123",
            student_ids=["student-1", "student-2"],
            title="Đôn đốc hoàn thành bài tập",
            content="Vui lòng hoàn thành bài học tuần này nhé!",
            current_user=instructor,
        )

        assert count == 2
        mock_bus.publish.assert_called_once()
        published_event = mock_bus.publish.call_args[0][0]
        assert isinstance(published_event, StudentReminderSentDomainEvent)
        assert published_event.course_id == "course-123"
        assert published_event.student_ids == ["student-1", "student-2"]
        assert published_event.title == "Đôn đốc hoàn thành bài tập"
        assert published_event.instructor_name == "instructor"


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
