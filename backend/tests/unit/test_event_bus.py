import uuid
from dataclasses import dataclass
from unittest.mock import AsyncMock, patch

import pytest

from src.modules.assessment.domain.events import (
    LabSubmittedDomainEvent,
    PeerReviewSubmittedDomainEvent,
    QuizSubmittedDomainEvent,
)
from src.modules.catalog.domain.events import CourseAnnouncementCreatedDomainEvent
from src.modules.certificate.domain.events import (
    CertificateIssuedDomainEvent,
    FinancialAidReviewedDomainEvent,
)
from src.modules.forum.domain.events import ForumReplyCreatedDomainEvent
from src.modules.identity.domain.events import (
    EnterpriseSeatAssignedDomainEvent,
    InstructorApplicationReviewedDomainEvent,
    InvitationSentDomainEvent,
    UserRegisteredDomainEvent,
)
from src.modules.notification.application.event_handlers import (
    handle_certificate_issued,
    handle_course_announcement_created,
    handle_enterprise_seat_assigned,
    handle_financial_aid_reviewed,
    handle_forum_reply_created,
    handle_instructor_application_reviewed,
    handle_invitation_sent,
    handle_lab_submitted,
    handle_peer_review_submitted,
    handle_quiz_submitted,
    handle_user_registered,
    register_notification_event_handlers,
)
from src.modules.notification.domain.constants import NotificationCategory
from src.shared.domain.events import DomainEvent
from src.shared.infrastructure.event_bus import EventBus


@dataclass
class CustomTestEvent(DomainEvent):
    message: str = ""


@dataclass
class AnotherTestEvent(DomainEvent):
    value: int = 0


@pytest.mark.asyncio
async def test_event_bus_subscribe_and_publish():
    EventBus.clear()
    handled_messages: list[str] = []

    async def async_handler(event: CustomTestEvent) -> None:
        handled_messages.append(f"async:{event.message}")

    def sync_handler(event: CustomTestEvent) -> None:
        handled_messages.append(f"sync:{event.message}")

    EventBus.subscribe(CustomTestEvent, async_handler)
    EventBus.subscribe(CustomTestEvent, sync_handler)

    test_event = CustomTestEvent(message="Hello DDD")
    assert test_event.event_id is not None
    assert uuid.UUID(test_event.event_id).version == 7
    assert test_event.occurred_at is not None

    await EventBus.publish(test_event)

    assert handled_messages == ["async:Hello DDD", "sync:Hello DDD"]


@pytest.mark.asyncio
async def test_event_bus_event_isolation():
    EventBus.clear()
    custom_calls: list[str] = []
    another_calls: list[int] = []

    async def on_custom(event: CustomTestEvent) -> None:
        custom_calls.append(event.message)

    async def on_another(event: AnotherTestEvent) -> None:
        another_calls.append(event.value)

    EventBus.subscribe(CustomTestEvent, on_custom)
    EventBus.subscribe(AnotherTestEvent, on_another)

    await EventBus.publish(CustomTestEvent(message="isolate"))
    assert custom_calls == ["isolate"]
    assert another_calls == []

    await EventBus.publish(AnotherTestEvent(value=42))
    assert custom_calls == ["isolate"]
    assert another_calls == [42]


@pytest.mark.asyncio
async def test_event_bus_error_isolation():
    EventBus.clear()
    successful_calls: list[str] = []

    async def faulty_handler(event: CustomTestEvent) -> None:
        raise RuntimeError("Something exploded in faulty handler")

    async def healthy_handler(event: CustomTestEvent) -> None:
        successful_calls.append(event.message)

    EventBus.subscribe(CustomTestEvent, faulty_handler)
    EventBus.subscribe(CustomTestEvent, healthy_handler)

    # Should not raise exception and should execute healthy handler
    await EventBus.publish(CustomTestEvent(message="resilient"))

    assert successful_calls == ["resilient"]


@pytest.mark.asyncio
async def test_event_bus_clear():
    EventBus.clear()
    calls: list[str] = []

    async def handler(event: CustomTestEvent) -> None:
        calls.append(event.message)

    EventBus.subscribe(CustomTestEvent, handler)
    EventBus.clear()

    await EventBus.publish(CustomTestEvent(message="lost"))
    assert calls == []


@pytest.mark.asyncio
@patch("src.modules.notification.application.event_handlers.NotificationUseCase")
async def test_handle_quiz_submitted(mock_uc_cls):
    mock_uc = mock_uc_cls.return_value
    mock_uc.send_notification = AsyncMock()

    event = QuizSubmittedDomainEvent(
        user_id="user_123",
        course_id="course_abc",
        item_id="item_xyz",
        score_percent=85.0,
        passed=True,
        attempt_number=2,
    )
    await handle_quiz_submitted(event)

    mock_uc.send_notification.assert_awaited_once_with(
        recipient_id="user_123",
        category=NotificationCategory.ACADEMIC,
        title="Kết quả bài kiểm tra: 85.0% - ĐẠT (PASSED)",
        content="Bạn đã hoàn thành bài thi lần 2 với số điểm 85.0%.",
        action_url="/learn/course_abc?itemId=item_xyz",
    )


@pytest.mark.asyncio
@patch("src.modules.notification.application.event_handlers.NotificationUseCase")
async def test_handle_lab_submitted(mock_uc_cls):
    mock_uc = mock_uc_cls.return_value
    mock_uc.send_notification = AsyncMock()

    event = LabSubmittedDomainEvent(
        user_id="user_456",
        course_id="course_lab",
        item_id="item_lab_1",
        passed=True,
        test_cases_passed=5,
        total_test_cases=5,
    )
    await handle_lab_submitted(event)

    mock_uc.send_notification.assert_awaited_once_with(
        recipient_id="user_456",
        category=NotificationCategory.ACADEMIC,
        title="Kết quả bài thực hành Lab: ĐẠT (PASSED)",
        content="Bạn đã vượt qua 5/5 test cases.",
        action_url="/learn/course_lab?itemId=item_lab_1",
    )


@pytest.mark.asyncio
@patch("src.modules.notification.application.event_handlers.NotificationUseCase")
async def test_handle_peer_review_submitted(mock_uc_cls):
    mock_uc = mock_uc_cls.return_value
    mock_uc.send_notification = AsyncMock()

    event = PeerReviewSubmittedDomainEvent(
        reviewer_id="reviewer_1",
        submission_id="sub_1",
        author_id="author_1",
        score=9.5,
    )
    await handle_peer_review_submitted(event)

    mock_uc.send_notification.assert_awaited_once_with(
        recipient_id="author_1",
        category=NotificationCategory.ACADEMIC,
        title="Bạn nhận được đánh giá đồng cấp mới",
        content="Một bạn học đã hoàn tất chấm bài nộp của bạn với điểm số 9.5.",
        action_url="",
    )


@pytest.mark.asyncio
@patch("src.modules.notification.application.event_handlers.NotificationUseCase")
async def test_handle_course_announcement_created(mock_uc_cls):
    mock_uc = mock_uc_cls.return_value
    mock_uc.send_batch_notifications = AsyncMock()

    event = CourseAnnouncementCreatedDomainEvent(
        course_id="course_ai",
        announcement_id="ann_1",
        title="Thông báo kiểm tra giữa kỳ",
        content="Nội dung bài thi giữa kỳ sẽ được cập nhật trên cổng học tập.",
        author_name="Thầy Andrew",
        student_ids=["student_1", "student_2"],
    )
    await handle_course_announcement_created(event)

    mock_uc.send_batch_notifications.assert_awaited_once_with(
        recipient_ids=["student_1", "student_2"],
        category=NotificationCategory.ANNOUNCEMENT,
        title="Thông báo mới từ Giảng viên Thầy Andrew",
        content="Thông báo kiểm tra giữa kỳ: Nội dung bài thi giữa kỳ sẽ được cập nhật trên cổng học tập.",
        action_url="/learn/course_ai",
    )


@pytest.mark.asyncio
@patch("src.modules.notification.application.event_handlers.NotificationUseCase")
async def test_handle_financial_aid_reviewed(mock_uc_cls):
    mock_uc = mock_uc_cls.return_value
    mock_uc.send_notification = AsyncMock()

    event = FinancialAidReviewedDomainEvent(
        application_id="fa_1",
        user_id="user_aid",
        course_id="course_aid",
        is_approved=True,
        status="APPROVED",
        notes="Hồ sơ hợp lệ",
    )
    await handle_financial_aid_reviewed(event)

    mock_uc.send_notification.assert_awaited_once_with(
        recipient_id="user_aid",
        category=NotificationCategory.ACADEMIC,
        title="Đơn Hỗ trợ Tài chính đã được chấp thuận",
        content="Hồ sơ hợp lệ",
        action_url="/learn/course_aid",
    )


@pytest.mark.asyncio
@patch("src.modules.notification.application.event_handlers.NotificationUseCase")
async def test_handle_certificate_issued(mock_uc_cls):
    mock_uc = mock_uc_cls.return_value
    mock_uc.send_notification = AsyncMock()

    event = CertificateIssuedDomainEvent(
        certificate_id="cert_999",
        user_id="user_cert",
        course_id="course_cert",
        certificate_code="CODE-123",
        course_title="Deep Learning Specialization",
    )
    await handle_certificate_issued(event)

    mock_uc.send_notification.assert_awaited_once_with(
        recipient_id="user_cert",
        category=NotificationCategory.ACADEMIC,
        title="Chúc mừng! Chứng chỉ xác minh của bạn đã được cấp",
        content='Bạn đã hoàn thành 100% khóa học "Deep Learning Specialization". Bấm để xem và chia sẻ chứng chỉ.',
        action_url="/verify/cert_999",
    )


@pytest.mark.asyncio
@patch("src.modules.notification.application.event_handlers.NotificationUseCase")
async def test_handle_instructor_application_reviewed(mock_uc_cls):
    mock_uc = mock_uc_cls.return_value
    mock_uc.send_notification = AsyncMock()

    # Approved case
    appr_event = InstructorApplicationReviewedDomainEvent(
        application_id="app_1",
        user_id="user_inst",
        is_approved=True,
        status="APPROVED",
    )
    await handle_instructor_application_reviewed(appr_event)
    mock_uc.send_notification.assert_awaited_with(
        recipient_id="user_inst",
        category=NotificationCategory.SYSTEM,
        title="Đơn đăng ký Giảng viên đã được phê duyệt",
        content="Chúc mừng! Tài khoản của bạn đã được nâng cấp lên vai trò Giảng viên và gán vào Coursera Project Network.",
        action_url="/instructor/courses",
    )

    # Rejected case
    mock_uc.send_notification.reset_mock()
    rej_event = InstructorApplicationReviewedDomainEvent(
        application_id="app_2",
        user_id="user_inst",
        is_approved=False,
        status="REJECTED",
        reviewer_notes="Thiếu chứng chỉ sư phạm",
    )
    await handle_instructor_application_reviewed(rej_event)
    mock_uc.send_notification.assert_awaited_with(
        recipient_id="user_inst",
        category=NotificationCategory.SYSTEM,
        title="Đơn đăng ký Giảng viên chưa được chấp thuận",
        content="Lý do: Thiếu chứng chỉ sư phạm",
        action_url="/become-an-instructor",
    )


@pytest.mark.asyncio
@patch("src.modules.notification.application.event_handlers.NotificationUseCase")
async def test_handle_invitation_sent(mock_uc_cls):
    mock_uc = mock_uc_cls.return_value
    mock_uc.send_notification = AsyncMock()

    event = InvitationSentDomainEvent(
        invitation_id="inv_123",
        email="test@org.com",
        organization_id="org_abc",
        role="ADMIN",
        invited_by="admin_user",
        invitee_id="user_invitee",
        target_name="Coursera Lab",
        inviter_name="SuperAdmin",
        raw_token="token_xyz",
        actor_avatar_url="https://avatar.url/1.png",
    )
    await handle_invitation_sent(event)

    mock_uc.send_notification.assert_awaited_once_with(
        recipient_id="user_invitee",
        category=NotificationCategory.SYSTEM,
        title="Lời mời tham gia Coursera Lab",
        content="SuperAdmin đã mời bạn tham gia Coursera Lab với vai trò ADMIN.",
        action_url="/invitations/token_xyz",
        actor_avatar_url="https://avatar.url/1.png",
    )


@pytest.mark.asyncio
@patch("src.modules.notification.application.event_handlers.NotificationUseCase")
async def test_handle_user_registered(mock_uc_cls):
    mock_uc = mock_uc_cls.return_value
    mock_uc.send_notification = AsyncMock()

    event = UserRegisteredDomainEvent(
        user_id="new_user_1",
        email="learner@lms.com",
        full_name="Learner One",
    )
    await handle_user_registered(event)

    mock_uc.send_notification.assert_awaited_once_with(
        recipient_id="new_user_1",
        category=NotificationCategory.SYSTEM,
        title="Chào mừng bạn đến với Hệ thống Đào tạo LMS!",
        content="Tài khoản của bạn đã được đăng ký thành công. Hãy khám phá danh mục khóa học ngay!",
        action_url="",
    )


@pytest.mark.asyncio
@patch("src.modules.notification.application.event_handlers.NotificationUseCase")
async def test_handle_enterprise_seat_assigned(mock_uc_cls):
    mock_uc = mock_uc_cls.return_value
    mock_uc.send_notification = AsyncMock()

    event = EnterpriseSeatAssignedDomainEvent(
        user_id="corp_user_1",
        partner_name="Google Cloud",
        seat_key="KEY-ABCD",
    )
    await handle_enterprise_seat_assigned(event)

    mock_uc.send_notification.assert_awaited_once_with(
        recipient_id="corp_user_1",
        category=NotificationCategory.SYSTEM,
        title="Kích hoạt Suất học Doanh nghiệp thành công",
        content="Tài khoản của bạn đã được liên kết với suất học đối tác Google Cloud.",
        action_url="/courses",
    )


@pytest.mark.asyncio
@patch("src.modules.notification.application.event_handlers.NotificationUseCase")
async def test_handle_forum_reply_created(mock_uc_cls):
    mock_uc = mock_uc_cls.return_value
    mock_uc.send_notification = AsyncMock()

    event = ForumReplyCreatedDomainEvent(
        thread_id="th_123",
        reply_id="rep_456",
        author_id="user_replier",
        author_name="John Doe",
        thread_author_id="user_original_poster",
        content="Đây là câu trả lời chi tiết cho câu hỏi của bạn.",
        course_id="course_react",
        item_id="item_hook",
    )
    await handle_forum_reply_created(event)

    mock_uc.send_notification.assert_awaited_once_with(
        recipient_id="user_original_poster",
        category=NotificationCategory.COMMUNITY,
        title="John Doe đã phản hồi bài viết của bạn",
        content='"Đây là câu trả lời chi tiết cho câu hỏi của bạn."',
        action_url="/learn/course_react?itemId=item_hook&tab=forum&threadId=th_123",
    )


def test_register_notification_event_handlers():
    EventBus.clear()
    register_notification_event_handlers()

    assert QuizSubmittedDomainEvent in EventBus._subscribers
    assert LabSubmittedDomainEvent in EventBus._subscribers
    assert PeerReviewSubmittedDomainEvent in EventBus._subscribers
    assert CourseAnnouncementCreatedDomainEvent in EventBus._subscribers
    assert FinancialAidReviewedDomainEvent in EventBus._subscribers
    assert CertificateIssuedDomainEvent in EventBus._subscribers
    assert InstructorApplicationReviewedDomainEvent in EventBus._subscribers
    assert InvitationSentDomainEvent in EventBus._subscribers
    assert UserRegisteredDomainEvent in EventBus._subscribers
    assert EnterpriseSeatAssignedDomainEvent in EventBus._subscribers
    assert ForumReplyCreatedDomainEvent in EventBus._subscribers
