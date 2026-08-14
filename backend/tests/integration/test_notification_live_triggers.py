"""Integration Test verifying LIVE AUTOMATED EVENT TRIGGERS for Notifications.

Executes real business use cases and verifies that Notifications are automatically created in PostgreSQL.
"""

import uuid

import pytest

from src.modules.assessment.application.assessment_usecase import AssessmentUseCase
from src.modules.certificate.infrastructure.models import FinancialAidModel
from src.modules.forum.application.forum_usecase import ForumUseCase
from src.modules.identity.application.review_application_usecase import (
    ReviewInstructorApplicationUseCase,
)
from src.modules.identity.domain.entities import (
    ApplicationStatus,
    InstructorApplication,
    User,
    UserRole,
)
from src.modules.identity.infrastructure.repository import (
    IdentityRepository,
    InstructorApplicationRepository,
)
from src.modules.notification.application.notification_usecase import (
    NotificationUseCase,
)
from src.modules.notification.domain.constants import NotificationCategory
from src.shared.infrastructure.database import async_session_scope


@pytest.mark.asyncio
async def test_live_instructor_approval_trigger():
    """Verify that approving an instructor application automatically creates a SYSTEM notification."""
    test_user_id = f"user_test_appr_{uuid.uuid4().hex[:6]}"
    app_id = f"app_test_{uuid.uuid4().hex[:6]}"

    async with async_session_scope() as session:
        identity_repo = IdentityRepository(session)
        user = User(
            id=test_user_id,
            email=f"{test_user_id}@coursera.org",
            full_name="Test Applicant",
            role=UserRole.LEARNER,
        )
        await identity_repo.save(user)

        app_repo = InstructorApplicationRepository(session)
        app = InstructorApplication(
            id=app_id,
            user_id=test_user_id,
            title="Senior AI Engineer",
            bio="Teaching PyTorch and Deep Learning",
            linkedin_url="",
            cv_url="",
            demo_video_url="",
            status=ApplicationStatus.PENDING_REVIEW,
        )
        await app_repo.save(app)

    # Execute Approval Usecase
    async with async_session_scope() as session:
        app_repo = InstructorApplicationRepository(session)
        identity_repo = IdentityRepository(session)
        usecase = ReviewInstructorApplicationUseCase(app_repo, identity_repo)
        await usecase.execute(application_id=app_id, approve=True)

    # Verify Notification was created in PostgreSQL
    notif_uc = NotificationUseCase()
    notifs, unread_count, _ = await notif_uc.list_notifications(
        recipient_id=test_user_id
    )

    assert unread_count >= 1
    assert any(
        n.category == NotificationCategory.SYSTEM and "đã được phê duyệt" in n.title
        for n in notifs
    )


@pytest.mark.asyncio
async def test_live_forum_reply_trigger():
    """Verify that posting a forum reply automatically creates a COMMUNITY notification for thread author."""
    author_id = f"author_{uuid.uuid4().hex[:6]}"
    replier_id = f"replier_{uuid.uuid4().hex[:6]}"

    forum_uc = ForumUseCase()
    # 1. Author creates a thread
    thread = await forum_uc.create_thread(
        course_id="course_test_123",
        item_id="item_test_123",
        title="Thắc mắc về Thuật toán Gradient Descent",
        content="Cho mình hỏi làm sao chọn Learning Rate phù hợp?",
        author_user_id=author_id,
        author_name="Học viên A",
    )

    # 2. Replier posts a reply
    await forum_uc.post_reply(
        thread_id=thread.id,
        content="Bạn nên dùng Learning Rate 0.01 và kết hợp Adam Optimizer nhé!",
        author_user_id=replier_id,
        author_name="Giảng viên Andrew",
    )

    # 3. Verify Author receives COMMUNITY notification
    notif_uc = NotificationUseCase()
    notifs, unread_count, _ = await notif_uc.list_notifications(recipient_id=author_id)

    assert unread_count >= 1
    assert any(
        n.category == NotificationCategory.COMMUNITY
        and "đã phản hồi bài viết" in n.title
        for n in notifs
    )


@pytest.mark.asyncio
async def test_live_quiz_submission_trigger():
    """Verify that submitting a quiz automatically creates an ASSESSMENT notification for learner."""
    learner_id = f"learner_{uuid.uuid4().hex[:6]}"
    item_id = "item-ml-quiz-1"

    async with async_session_scope() as session:
        identity_repo = IdentityRepository(session)
        user = User(
            id=learner_id,
            email=f"{learner_id}@coursera.org",
            full_name="Quiz Test Learner",
            role=UserRole.LEARNER,
        )
        await identity_repo.save(user)

        # Grant approved financial aid so paid access check passes
        fa_model = FinancialAidModel(
            id=f"fa_{uuid.uuid4().hex[:8]}",
            user_id=learner_id,
            course_id="",
            essay_150_words="Valid essay text...",
            status="APPROVED",
            review_deadline_days_left=15,
        )
        session.add(fa_model)

    assessment_uc = AssessmentUseCase()
    # Agree honor code
    await assessment_uc.submit_honor_code(
        user_id=learner_id, item_id=item_id, is_agreed=True
    )

    # Submit graded quiz
    await assessment_uc.submit_graded_quiz(
        user_id=learner_id,
        item_id=item_id,
        question_answers=[[0], [0], [0], [0], [0]],
    )

    # Verify Learner receives ASSESSMENT notification
    notif_uc = NotificationUseCase()
    notifs, unread_count, _ = await notif_uc.list_notifications(recipient_id=learner_id)

    assert unread_count >= 1
    assert any(
        n.category == NotificationCategory.ACADEMIC
        and "Kết quả bài kiểm tra" in n.title
        for n in notifs
    )


@pytest.mark.asyncio
async def test_live_registration_trigger():
    """Verify that registering a new account automatically creates a welcome SYSTEM notification."""
    from src.modules.identity.application.identity_usecase import IdentityUseCase

    new_email = f"newuser_{uuid.uuid4().hex[:6]}@coursera.org"
    identity_uc = IdentityUseCase()
    user, err = await identity_uc.register(
        email=new_email,
        password="Password123!",
        full_name="New Registered Learner",
        role_str="LEARNER",
    )

    assert user is not None
    assert err == ""

    # Verify New User receives Welcome SYSTEM notification
    notif_uc = NotificationUseCase()
    notifs, unread_count, _ = await notif_uc.list_notifications(recipient_id=user.id)

    assert unread_count >= 1
    assert any(
        n.category == NotificationCategory.SYSTEM and "Chào mừng bạn" in n.title
        for n in notifs
    )
