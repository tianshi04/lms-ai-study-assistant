import logging

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
from src.modules.notification.application.use_cases import NotificationUseCase
from src.modules.notification.domain.constants import NotificationCategory
from src.shared.infrastructure.event_bus import EventBus

logger = logging.getLogger(__name__)


async def handle_quiz_submitted(event: QuizSubmittedDomainEvent) -> None:
    status_str = "ĐẠT (PASSED)" if event.passed else "CHƯA ĐẠT"
    action_url = (
        f"/learn/{event.course_id}?itemId={event.item_id}"
        if event.course_id and event.item_id
        else ""
    )
    notif_uc = NotificationUseCase()
    await notif_uc.send_notification(
        recipient_id=event.user_id,
        category=NotificationCategory.ACADEMIC,
        title=f"Kết quả bài kiểm tra: {event.score_percent}% - {status_str}",
        content=f"Bạn đã hoàn thành bài thi lần {event.attempt_number} với số điểm {event.score_percent}%.",
        action_url=action_url,
    )


async def handle_lab_submitted(event: LabSubmittedDomainEvent) -> None:
    status_str = "ĐẠT (PASSED)" if event.passed else "CHƯA ĐẠT"
    action_url = (
        f"/learn/{event.course_id}?itemId={event.item_id}"
        if event.course_id and event.item_id
        else ""
    )
    notif_uc = NotificationUseCase()
    await notif_uc.send_notification(
        recipient_id=event.user_id,
        category=NotificationCategory.ACADEMIC,
        title=f"Kết quả bài thực hành Lab: {status_str}",
        content=f"Bạn đã vượt qua {event.test_cases_passed}/{event.total_test_cases} test cases.",
        action_url=action_url,
    )


async def handle_peer_review_submitted(
    event: PeerReviewSubmittedDomainEvent,
) -> None:
    if not event.author_id:
        return
    notif_uc = NotificationUseCase()
    await notif_uc.send_notification(
        recipient_id=event.author_id,
        category=NotificationCategory.ACADEMIC,
        title="Bạn nhận được đánh giá đồng cấp mới",
        content=f"Một bạn học đã hoàn tất chấm bài nộp của bạn với điểm số {event.score}.",
        action_url="",
    )


async def handle_course_announcement_created(
    event: CourseAnnouncementCreatedDomainEvent,
) -> None:
    if not event.student_ids:
        return
    title_prefix = (
        f"Thông báo mới từ Giảng viên {event.author_name}"
        if event.author_name
        else f"Thông báo mới: {event.title}"
    )
    content_snippet = (
        f"{event.title}: {event.content[:100]}..."
        if len(event.content) > 100
        else f"{event.title}: {event.content}"
    )
    notif_uc = NotificationUseCase()
    await notif_uc.send_batch_notifications(
        recipient_ids=event.student_ids,
        category=NotificationCategory.ANNOUNCEMENT,
        title=title_prefix,
        content=content_snippet,
        action_url=f"/learn/{event.course_id}" if event.course_id else "",
    )


async def handle_financial_aid_reviewed(
    event: FinancialAidReviewedDomainEvent,
) -> None:
    is_approved = event.is_approved or (event.status.upper() == "APPROVED")
    status_str = "chấp thuận" if is_approved else "chưa được duyệt"
    notif_uc = NotificationUseCase()
    await notif_uc.send_notification(
        recipient_id=event.user_id,
        category=NotificationCategory.ACADEMIC,
        title=f"Đơn Hỗ trợ Tài chính đã được {status_str}",
        content=event.notes
        or "Đơn nộp học bổng cho khóa học của bạn đã được quản trị viên xem xét.",
        action_url=f"/learn/{event.course_id}" if event.course_id else "",
    )


async def handle_certificate_issued(event: CertificateIssuedDomainEvent) -> None:
    notif_uc = NotificationUseCase()
    course_title_text = f' "{event.course_title}"' if event.course_title else ""
    await notif_uc.send_notification(
        recipient_id=event.user_id,
        category=NotificationCategory.ACADEMIC,
        title="Chúc mừng! Chứng chỉ xác minh của bạn đã được cấp",
        content=f"Bạn đã hoàn thành 100% khóa học{course_title_text}. Bấm để xem và chia sẻ chứng chỉ.",
        action_url=f"/verify/{event.certificate_id}",
    )


async def handle_instructor_application_reviewed(
    event: InstructorApplicationReviewedDomainEvent,
) -> None:
    is_approved = event.is_approved or (event.status.upper() == "APPROVED")
    notif_uc = NotificationUseCase()
    if is_approved:
        await notif_uc.send_notification(
            recipient_id=event.user_id,
            category=NotificationCategory.SYSTEM,
            title="Đơn đăng ký Giảng viên đã được phê duyệt",
            content="Chúc mừng! Tài khoản của bạn đã được nâng cấp lên vai trò Giảng viên và gán vào Coursera Project Network.",
            action_url="/instructor/courses",
        )
    else:
        reason = (
            event.reviewer_notes
            or "Hồ sơ chưa đáp ứng tiêu chuẩn thẩm định năng lực giảng dạy."
        )
        await notif_uc.send_notification(
            recipient_id=event.user_id,
            category=NotificationCategory.SYSTEM,
            title="Đơn đăng ký Giảng viên chưa được chấp thuận",
            content=f"Lý do: {reason}",
            action_url="/become-an-instructor",
        )


async def handle_invitation_sent(event: InvitationSentDomainEvent) -> None:
    if not event.invitee_id:
        return
    notif_uc = NotificationUseCase()
    role = event.role or "MEMBER"
    target = event.target_name or "không gian làm việc"
    inviter = event.inviter_name or "Quản trị viên"
    await notif_uc.send_notification(
        recipient_id=event.invitee_id,
        category=NotificationCategory.SYSTEM,
        title=f"Lời mời tham gia {target}",
        content=f"{inviter} đã mời bạn tham gia {target} với vai trò {role}.",
        action_url=f"/invitations/{event.raw_token}" if event.raw_token else "",
        actor_avatar_url=event.actor_avatar_url,
    )


async def handle_user_registered(event: UserRegisteredDomainEvent) -> None:
    notif_uc = NotificationUseCase()
    await notif_uc.send_notification(
        recipient_id=event.user_id,
        category=NotificationCategory.SYSTEM,
        title="Chào mừng bạn đến với Hệ thống Đào tạo LMS!",
        content="Tài khoản của bạn đã được đăng ký thành công. Hãy khám phá danh mục khóa học ngay!",
        action_url="",
    )


async def handle_enterprise_seat_assigned(
    event: EnterpriseSeatAssignedDomainEvent,
) -> None:
    notif_uc = NotificationUseCase()
    content = (
        f"Tài khoản của bạn đã được liên kết với suất học đối tác {event.partner_name}."
        if event.partner_name
        else "Tài khoản của bạn đã được kích hoạt suất học doanh nghiệp."
    )
    await notif_uc.send_notification(
        recipient_id=event.user_id,
        category=NotificationCategory.SYSTEM,
        title="Kích hoạt Suất học Doanh nghiệp thành công",
        content=content,
        action_url="/courses",
    )


async def handle_forum_reply_created(event: ForumReplyCreatedDomainEvent) -> None:
    recipient_id = event.thread_author_id
    if not recipient_id or recipient_id == event.author_id:
        return
    action_url = (
        f"/learn/{event.course_id}?itemId={event.item_id}&tab=forum&threadId={event.thread_id}"
        if event.item_id
        else f"/forum?courseId={event.course_id}&threadId={event.thread_id}"
    )
    author_name = event.author_name or "Một thành viên"
    content_snippet = (
        f'"{event.content[:100]}..."'
        if len(event.content) > 100
        else f'"{event.content}"'
    )
    notif_uc = NotificationUseCase()
    await notif_uc.send_notification(
        recipient_id=recipient_id,
        category=NotificationCategory.COMMUNITY,
        title=f"{author_name} đã phản hồi bài viết của bạn",
        content=content_snippet,
        action_url=action_url,
    )


def register_notification_event_handlers() -> None:
    """Register all notification domain event handlers into EventBus."""
    EventBus.subscribe(QuizSubmittedDomainEvent, handle_quiz_submitted)
    EventBus.subscribe(LabSubmittedDomainEvent, handle_lab_submitted)
    EventBus.subscribe(PeerReviewSubmittedDomainEvent, handle_peer_review_submitted)
    EventBus.subscribe(
        CourseAnnouncementCreatedDomainEvent, handle_course_announcement_created
    )
    EventBus.subscribe(FinancialAidReviewedDomainEvent, handle_financial_aid_reviewed)
    EventBus.subscribe(CertificateIssuedDomainEvent, handle_certificate_issued)
    EventBus.subscribe(
        InstructorApplicationReviewedDomainEvent,
        handle_instructor_application_reviewed,
    )
    EventBus.subscribe(InvitationSentDomainEvent, handle_invitation_sent)
    EventBus.subscribe(UserRegisteredDomainEvent, handle_user_registered)
    EventBus.subscribe(
        EnterpriseSeatAssignedDomainEvent, handle_enterprise_seat_assigned
    )
    EventBus.subscribe(ForumReplyCreatedDomainEvent, handle_forum_reply_created)
    logger.info("[NOTIFICATION] Registered all domain event handlers with EventBus.")
