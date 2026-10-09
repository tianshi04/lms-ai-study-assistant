"""Unit tests for Rich Domain Entities & Invariants (Khử Anemic Domain Model)."""

from datetime import UTC, datetime, timedelta

import pytest

from src.modules.assessment.domain import (
    GradeAppeal,
    PeerAssignmentSubmission,
    QuizActiveSession,
    QuizCooldown,
)
from src.modules.forum.domain import (
    ForumReplyEntity,
    ForumThreadEntity,
)
from src.modules.identity.domain import (
    ApplicationStatus,
    EnterpriseLicense,
    InstructorApplication,
    OrganizationMember,
    ScopeType,
)
from src.modules.learning.domain import (
    DeadlineStatus,
    LearningProgress,
    WeeklyDeadline,
)
from src.modules.payment.domain import (
    PaymentOrder,
    PaymentOrderStatus,
    PaymentTargetType,
    PlanType,
    Subscription,
    SubscriptionStatus,
    UserSubscription,
)

# ==========================================
# Module 1: Assessment Domain Entities Tests
# ==========================================


def test_quiz_cooldown_lifecycle():
    now = datetime(2026, 8, 14, 12, 0, 0, tzinfo=UTC)
    cd = QuizCooldown(user_id="u1", item_id="quiz_1")

    # Initial state
    assert not cd.is_in_cooldown(now)
    can_att, reason, hours_left = cd.can_attempt(now)
    assert can_att is True
    assert reason == ""
    assert hours_left == 0

    # 1st failure
    cd.record_failure(now)
    assert cd.failed_attempts_count == 1
    assert cd.last_attempt_at == now.isoformat()
    assert not cd.is_in_cooldown(now)

    # 2nd failure
    cd.record_failure(now)
    assert cd.failed_attempts_count == 2
    assert not cd.is_in_cooldown(now)

    # 3rd failure -> Cooldown activated (8h default)
    cd.record_failure(now, cooldown_hours=8, max_attempts=3)
    assert cd.failed_attempts_count == 3
    assert cd.is_in_cooldown(now)

    # Cooldown check
    can_att, reason, hours_left = cd.can_attempt(now)
    assert can_att is False
    assert "giãn cách" in reason or "quay lại sau" in reason
    assert hours_left == 8

    # Cooldown expires after 8h + 1s
    future = now + timedelta(hours=8, seconds=1)
    assert not cd.is_in_cooldown(future)
    can_att, _, _ = cd.can_attempt(future)
    assert can_att is True

    # Record success resets cooldown and failures
    cd.record_success()
    assert cd.failed_attempts_count == 0
    assert cd.cooldown_until is None
    assert not cd.is_in_cooldown(now)


def test_grade_appeal_approval_and_rejection():
    appeal = GradeAppeal(
        id="app-1",
        user_id="u1",
        submission_id="sub-1",
        appeal_reason="Need regrade",
    )
    assert appeal.status == "PENDING"

    # Approve
    appeal.approve(reviewer_id="staff-1", final_score=95.0)
    assert appeal.status == "APPROVED"

    # Reject with valid reason
    appeal2 = GradeAppeal(
        id="app-2",
        user_id="u2",
        submission_id="sub-2",
        appeal_reason="Invalid claim",
    )
    appeal2.reject(reviewer_id="staff-1", reason="Không đủ bằng chứng thỏa đáng.")
    assert appeal2.status == "REJECTED"

    # Reject with empty reason should raise ValueError
    appeal3 = GradeAppeal(
        id="app-3",
        user_id="u3",
        submission_id="sub-3",
        appeal_reason="Claim",
    )
    with pytest.raises(ValueError, match="Lý do từ chối không được để trống"):
        appeal3.reject(reviewer_id="staff-1", reason="   ")


def test_quiz_active_session_expiration():
    now = datetime(2026, 8, 14, 12, 0, 0, tzinfo=UTC)
    expires_at = now + timedelta(minutes=45)

    session = QuizActiveSession(
        user_id="u1",
        item_id="item_1",
        session_seed=12345,
        questions_json=[],
        started_at=now.isoformat(),
        expires_at=expires_at.isoformat(),
    )

    assert not session.is_expired(now)
    assert not session.is_expired(now + timedelta(minutes=44))
    assert session.is_expired(now + timedelta(minutes=45))
    assert session.is_expired(now + timedelta(minutes=50))


def test_peer_assignment_submission_grading():
    sub = PeerAssignmentSubmission(
        id="sub-1",
        user_id="u1",
        item_id="item-1",
        submission_url="https://github.com/example/repo",
        text_content="Content",
        created_at=datetime.now(UTC).isoformat(),
    )
    assert sub.final_score is None
    assert sub.graded_by_staff is False

    # Peer grading
    sub.assign_grade(85.456, is_staff=False)
    assert sub.final_score == 85.46
    assert sub.graded_by_staff is False

    # Staff override grading
    sub.assign_grade(92.0, is_staff=True)
    assert sub.final_score == 92.0
    assert sub.graded_by_staff is True

    # Invalid score range validation
    with pytest.raises(ValueError, match="khoảng từ 0 đến 100"):
        sub.assign_grade(-5.0)
    with pytest.raises(ValueError, match="khoảng từ 0 đến 100"):
        sub.assign_grade(105.0)


# ==========================================
# Module 2: Learning Domain Entities Tests
# ==========================================


def test_learning_progress_mark_item_complete():
    lp = LearningProgress(user_id="u1", course_id="c1")
    assert lp.overall_progress_percent == 0.0
    assert lp.completed_item_ids == []

    # First item complete out of 4 total items (25.0%)
    is_new = lp.mark_item_complete("item_1", total_items_count=4)
    assert is_new is True
    assert lp.completed_item_ids == ["item_1"]
    assert lp.overall_progress_percent == 25.0

    # Duplicate item complete does not add or increase percent
    is_new2 = lp.mark_item_complete("item_1", total_items_count=4)
    assert is_new2 is False
    assert lp.completed_item_ids == ["item_1"]
    assert lp.overall_progress_percent == 25.0

    # Add remaining items
    lp.mark_item_complete("item_2", total_items_count=4)
    lp.mark_item_complete("item_3", total_items_count=4)
    lp.mark_item_complete("item_4", total_items_count=4)
    assert lp.overall_progress_percent == 100.0


def test_learning_progress_deadline_reset():
    now = datetime(2026, 8, 14, 12, 0, 0, tzinfo=UTC)
    lp = LearningProgress(user_id="u1", course_id="c1")

    # Initial state (never reset) allows reset
    assert lp.can_reset_deadlines(now) is True

    deadlines = [
        WeeklyDeadline(
            week_number=1,
            due_date="2026-08-21",
            status=DeadlineStatus.ON_TRACK,
        )
    ]
    lp.reset_deadlines(deadlines, now)
    assert lp.weekly_deadlines == deadlines
    assert lp.last_reset_at == now.isoformat()

    # Reset within 180 days cooldown must be rejected
    soon = now + timedelta(days=30)
    assert lp.can_reset_deadlines(soon) is False
    with pytest.raises(ValueError, match="180 ngày"):
        lp.reset_deadlines(deadlines, soon)

    # Reset after 180 days must be allowed
    after_180_days = now + timedelta(days=181)
    assert lp.can_reset_deadlines(after_180_days) is True
    new_deadlines = [
        WeeklyDeadline(
            week_number=1,
            due_date="2027-02-21",
            status=DeadlineStatus.ON_TRACK,
        )
    ]
    lp.reset_deadlines(new_deadlines, after_180_days)
    assert lp.weekly_deadlines == new_deadlines
    assert lp.last_reset_at == after_180_days.isoformat()


# ==========================================
# Module 3: Identity Domain Entities Tests
# ==========================================


def test_instructor_application_approval_and_rejection():
    app = InstructorApplication(
        id="app-1",
        user_id="u1",
        title="Dr.",
        bio="Bio",
        linkedin_url="https://linkedin.com",
        cv_url="https://cv.url",
        demo_video_url="https://video.url",
    )
    assert app.status == ApplicationStatus.PENDING_REVIEW

    now_str = "2026-08-14T12:00:00+00:00"
    app.approve(reviewed_at=now_str)
    assert app.status == ApplicationStatus.APPROVED
    assert app.reviewed_at == now_str
    assert app.rejection_reason == ""

    # Rejection
    app2 = InstructorApplication(
        id="app-2",
        user_id="u2",
        title="",
        bio="",
        linkedin_url="",
        cv_url="",
        demo_video_url="",
    )
    app2.reject(reason="Thiếu chứng chỉ sư phạm", reviewed_at=now_str)
    assert app2.status == ApplicationStatus.REJECTED
    assert app2.rejection_reason == "Thiếu chứng chỉ sư phạm"
    assert app2.reviewed_at == now_str

    # Rejection with empty reason raises ValueError
    with pytest.raises(ValueError, match="Lý do từ chối không được để trống"):
        app2.reject(reason="   ", reviewed_at=now_str)


def test_enterprise_license_seat_management():
    lic = EnterpriseLicense(
        key="ENT-KEY-1",
        partner_name="Tech Corp",
        total_seats=2,
        used_seats=0,
        is_active=True,
        scope_type=ScopeType.ALL_COURSES,
    )

    assert lic.can_assign_seat() is True

    # Assign 1st seat
    lic.assign_seat()
    assert lic.used_seats == 1
    assert lic.can_assign_seat() is True

    # Assign 2nd seat
    lic.assign_seat()
    assert lic.used_seats == 2
    assert lic.can_assign_seat() is False

    # Assign 3rd seat (exceeding limit) must raise ValueError
    with pytest.raises(ValueError, match="Đã hết số lượng suất học"):
        lic.assign_seat()

    # Revoke seat
    lic.revoke_seat()
    assert lic.used_seats == 1
    assert lic.can_assign_seat() is True

    # Revoke again to 0
    lic.revoke_seat()
    assert lic.used_seats == 0
    # Revoke when 0 should remain 0
    lic.revoke_seat()
    assert lic.used_seats == 0


def test_organization_member_activation_deactivation():
    member = OrganizationMember(
        id="m-1",
        user_id="u-1",
        organization_id="org-1",
        role_id="ROLE_MEMBER",
        status="ACTIVE",
    )
    assert member.status == "ACTIVE"

    member.deactivate()
    assert member.status == "INACTIVE"

    member.activate()
    assert member.status == "ACTIVE"


# ==========================================
# Module 4: Payment Domain Entities Tests
# ==========================================


def test_payment_order_state_transitions():
    now_str = "2026-08-14T12:00:00+00:00"
    order = PaymentOrder(
        id="ord-1",
        user_id="u1",
        target_type=PaymentTargetType.COURSE,
        target_id="c1",
        plan_type=PlanType.UNSPECIFIED,
        amount=500000.0,
        currency="VND",
        status=PaymentOrderStatus.PENDING,
        vnp_txn_ref="TXN-12345",
        created_at=now_str,
        updated_at=now_str,
    )
    assert order.status == PaymentOrderStatus.PENDING

    # Mark failed
    order.mark_failed(error_message="User cancelled on payment gateway")
    assert order.status == PaymentOrderStatus.FAILED
    assert order.error_message == "User cancelled on payment gateway"

    # Mark completed
    paid_at = "2026-08-14T12:05:00+00:00"
    order.mark_completed(transaction_id="VNP-9999", paid_at=paid_at)
    assert order.status == PaymentOrderStatus.COMPLETED
    assert order.transaction_id == "VNP-9999"
    assert order.paid_at == paid_at
    assert order.updated_at == paid_at

    # Mark cancelled & expired
    order.mark_cancelled()
    assert order.status == PaymentOrderStatus.CANCELLED

    order.mark_expired()
    assert order.status == PaymentOrderStatus.EXPIRED


def test_user_subscription_cancellation():
    now_str = "2026-08-14T12:00:00+00:00"
    sub = UserSubscription(
        id="sub-1",
        user_id="u1",
        plan_type=PlanType.MONTHLY,
        status=SubscriptionStatus.ACTIVE,
        starts_at=now_str,
        expires_at="2026-09-14T12:00:00+00:00",
        created_at=now_str,
    )
    assert sub.status == SubscriptionStatus.ACTIVE

    sub.cancel(cancelled_at="2026-08-20T12:00:00+00:00")
    assert sub.status == SubscriptionStatus.CANCELLED
    assert sub.cancelled_at == "2026-08-20T12:00:00+00:00"

    # Subscription alias test
    assert Subscription is UserSubscription


# ==========================================
# Module 5: Forum Domain Entities Tests
# ==========================================


def test_forum_thread_and_reply_lifecycle():
    now_str = "2026-08-14T12:00:00+00:00"
    thread = ForumThreadEntity(
        id="th-1",
        course_id="c-1",
        item_id="it-1",
        title="Initial Question",
        content="Initial Content",
        author_name="Alice",
        author_role="LEARNER",
        created_at=now_str,
    )
    assert not thread.is_staff_pinned
    assert thread.upvote_count == 0
    assert not thread.is_edited

    # Pin & unpin
    thread.pin()
    assert thread.is_staff_pinned is True
    thread.unpin()
    assert thread.is_staff_pinned is False

    # Edit thread
    edited_at = "2026-08-14T12:10:00+00:00"
    thread.edit(
        new_title="Updated Question",
        new_content="Updated Content",
        edited_at=edited_at,
    )
    assert thread.title == "Updated Question"
    assert thread.content == "Updated Content"
    assert thread.is_edited is True
    assert thread.edited_at == edited_at

    # Edit validation
    with pytest.raises(ValueError, match="Tiêu đề"):
        thread.edit(new_title="", new_content="valid", edited_at=edited_at)
    with pytest.raises(ValueError, match="[Nn]ội dung"):
        thread.edit(new_title="valid", new_content=" ", edited_at=edited_at)

    # Upvotes
    thread.increment_upvote()
    assert thread.upvote_count == 1
    assert thread.is_upvoted_by_me is True
    thread.decrement_upvote()
    assert thread.upvote_count == 0
    assert thread.is_upvoted_by_me is False

    # Reply tests
    reply = ForumReplyEntity(
        id="rep-1",
        thread_id="th-1",
        author_name="Bob",
        author_role="INSTRUCTOR",
        content="Here is the answer",
        created_at=now_str,
    )
    assert not reply.is_staff_answer
    reply.pin_as_staff_answer()
    assert reply.is_staff_answer is True
    reply.unpin_staff_answer()
    assert reply.is_staff_answer is False

    reply.edit(new_content="Revised Answer", edited_at=edited_at)
    assert reply.content == "Revised Answer"
    assert reply.is_edited is True

    with pytest.raises(ValueError, match="Nội dung"):
        reply.edit(new_content="", edited_at=edited_at)
