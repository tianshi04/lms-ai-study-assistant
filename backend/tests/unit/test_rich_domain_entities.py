"""Unit tests for Rich Domain Entities & Invariants (Khử Anemic Domain Model)."""

from datetime import UTC, datetime, timedelta

import pytest

from src.modules.assessment.domain import (
    GRADING_LOCK_TIMEOUT_MINUTES,
    MAX_APPEAL_WINDOW_DAYS,
    MAX_APPEALS_PER_SUBMISSION,
    MAX_PEER_SUBMISSION_ATTEMPTS,
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
        session_id="qsess-1",
        session_seed=12345,
        questions_json=[
            {
                "question_id": "q1",
                "question_type": "SINGLE_CHOICE",
                "options": ["A", "B", "C"],
            },
            {
                "question_id": "q2",
                "question_type": "MULTIPLE_CHOICE",
                "options": ["A", "B", "C", "D"],
            },
        ],
        started_at=now.isoformat(),
        expires_at=expires_at.isoformat(),
    )

    assert not session.is_expired(now)
    assert not session.is_expired(now + timedelta(minutes=44))
    assert session.is_expired(now + timedelta(minutes=45))
    assert session.is_expired(now + timedelta(minutes=50))
    assert not session.is_expired(
        now + timedelta(minutes=45, seconds=3), grace_seconds=5
    )
    assert session.is_expired(now + timedelta(minutes=45, seconds=6), grace_seconds=5)
    assert session.answered_count() == 0

    # Valid draft update normalizes out-of-range/duplicate options and enforces single choice
    ok1 = session.apply_draft_update(
        raw_answers=[[2, 0, 99, -1], [3, 1, 1, 9]],
        version=1,
        now=now + timedelta(minutes=5),
    )
    assert ok1 is True
    assert session.draft_answers == [[0], [1, 3]]
    assert session.answered_count() == 2
    assert session.draft_version == 1

    # Out-of-order lower version is ignored
    ok_stale = session.apply_draft_update(
        raw_answers=[[], []],
        version=0,
        now=now + timedelta(minutes=6),
    )
    assert ok_stale is False
    assert session.draft_answers == [[0], [1, 3]]
    assert session.draft_version == 1

    # Update past expiration + grace period is rejected
    ok_expired = session.apply_draft_update(
        raw_answers=[[1], [2]],
        version=2,
        now=expires_at + timedelta(seconds=10),
    )
    assert ok_expired is False
    assert session.draft_answers == [[0], [1, 3]]


def test_peer_assignment_submission_constants_and_locking():
    assert GRADING_LOCK_TIMEOUT_MINUTES == 30
    assert MAX_APPEAL_WINDOW_DAYS == 7
    assert MAX_APPEALS_PER_SUBMISSION == 1
    assert MAX_PEER_SUBMISSION_ATTEMPTS == 3

    now = datetime(2026, 8, 14, 12, 0, 0, tzinfo=UTC)
    sub = PeerAssignmentSubmission(
        id="sub-lock-1",
        user_id="student-1",
        item_id="item-lock-1",
        submission_url="https://example.com/repo",
        text_content="Submission",
        created_at=now.isoformat(),
    )

    # Defaults
    assert sub.attempt_number == 1
    assert sub.grade_source == "PEER_REVIEW"
    assert sub.status == "SUBMITTED"
    assert sub.rubric_scores_json == {}
    assert not sub.is_lock_active(now)
    assert sub.can_claim_lock("ta-1", now)

    # Claim lock
    sub.claim_lock("ta-1", now)
    assert sub.locked_by_user_id == "ta-1"
    assert sub.is_lock_active(now)
    assert sub.can_claim_lock("ta-1", now)
    assert not sub.can_claim_lock("ta-2", now)

    # Another TA claiming lock raises PermissionError
    with pytest.raises(PermissionError, match="đang được nhân sự khác chấm"):
        sub.claim_lock("ta-2", now)

    # Renew lock
    renew_time = now + timedelta(minutes=15)
    sub.renew_lock("ta-1", renew_time)
    assert sub.locked_at == renew_time.isoformat()

    # Another TA cannot renew or release lock
    with pytest.raises(PermissionError, match="Bạn không sở hữu khóa"):
        sub.renew_lock("ta-2", renew_time)
    with pytest.raises(PermissionError, match="Bạn không thể nhả khóa của người khác"):
        sub.release_lock("ta-2")

    # Lock expires after 30 minutes from last renewal
    expired_time = renew_time + timedelta(minutes=31)
    assert not sub.is_lock_active(expired_time)
    assert sub.can_claim_lock("ta-2", expired_time)

    # Release lock actively
    sub.release_lock("ta-1")
    assert sub.locked_by_user_id is None
    assert sub.locked_at is None

    # Staff grading
    sub.assign_grade(
        score=95.0,
        is_staff=True,
        graded_by_user_id="instructor-1",
        grader_role="INSTRUCTOR",
        grade_source="INSTRUCTOR",
        staff_feedback="Xuất sắc",
        rubric_scores_json={"criteria_1": 10},
    )
    assert sub.final_score == 95.0
    assert sub.graded_by_user_id == "instructor-1"
    assert sub.grader_role == "INSTRUCTOR"
    assert sub.grade_source == "INSTRUCTOR"
    assert sub.staff_feedback == "Xuất sắc"
    assert sub.status == "GRADED"


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

    # Thread is_solved domain lifecycle
    assert thread.is_solved is False
    thread.mark_solved()
    assert thread.is_solved is True
    thread.mark_unsolved()
    assert thread.is_solved is False

    solved_reply = ForumReplyEntity(
        id="rep-staff",
        thread_id="th-1",
        author_name="TA Nam",
        author_role="TA",
        content="Official answer",
        is_staff_answer=True,
        created_at=now_str,
    )
    thread.replies.append(solved_reply)
    thread.sync_solved_state()
    assert thread.is_solved is True

    auto_solved_thread = ForumThreadEntity(
        id="th-auto",
        course_id="c1",
        item_id="i1",
        title="Auto solved",
        content="Question",
        author_name="Alice",
        author_role="Learner",
        replies=[solved_reply],
    )
    assert auto_solved_thread.is_solved is True


def test_check_peer_submission_pass_eligibility():
    from src.modules.assessment.domain import (
        REVIEW_DUTY_COMPLETED,
        REVIEW_DUTY_NOT_APPLICABLE,
        REVIEW_DUTY_PENDING,
        REVIEW_DUTY_WAITING_POOL,
        REVIEW_DUTY_WAIVED_EMPTY_POOL,
        check_peer_submission_pass_eligibility,
    )

    # Unpublished submission must fail even with high score and completed duty
    ok, err = check_peer_submission_pass_eligibility(
        item_title="Essay 1",
        status="SUBMITTED",
        final_score=92.0,
        review_duty_status=REVIEW_DUTY_COMPLETED,
        has_pending_appeal=False,
    )
    assert ok is False
    assert "PUBLISHED" in err

    # Score below threshold must fail
    ok, err = check_peer_submission_pass_eligibility(
        item_title="Essay 1",
        status="PUBLISHED",
        final_score=75.0,
        review_duty_status=REVIEW_DUTY_COMPLETED,
        has_pending_appeal=False,
    )
    assert ok is False
    assert "80%" in err

    # Pending or waiting pool review duty must fail
    for duty in (REVIEW_DUTY_PENDING, REVIEW_DUTY_WAITING_POOL):
        ok, err = check_peer_submission_pass_eligibility(
            item_title="Essay 1",
            status="PUBLISHED",
            final_score=95.0,
            review_duty_status=duty,
            has_pending_appeal=False,
        )
        assert ok is False
        assert duty in err

    # Pending appeal must fail
    ok, err = check_peer_submission_pass_eligibility(
        item_title="Essay 1",
        status="PUBLISHED",
        final_score=95.0,
        review_duty_status=REVIEW_DUTY_COMPLETED,
        has_pending_appeal=True,
    )
    assert ok is False
    assert "khiếu nại" in err

    # Eligible duty statuses with PUBLISHED + >= 80 + no appeal must pass
    for duty in (
        REVIEW_DUTY_COMPLETED,
        REVIEW_DUTY_WAIVED_EMPTY_POOL,
        REVIEW_DUTY_NOT_APPLICABLE,
    ):
        ok, err = check_peer_submission_pass_eligibility(
            item_title="Essay 1",
            status="PUBLISHED",
            final_score=85.0,
            review_duty_status=duty,
            has_pending_appeal=False,
        )
        assert ok is True
        assert err == ""

    # Prior published attempt (previous_best_score >= 80) preserves pass eligibility while attempt 2 is SUBMITTED
    ok, err = check_peer_submission_pass_eligibility(
        item_title="Essay 1",
        status="SUBMITTED",
        final_score=None,
        review_duty_status=REVIEW_DUTY_COMPLETED,
        has_pending_appeal=False,
        previous_best_score=90.0,
    )
    assert ok is True
    assert err == ""

    # Prior published attempt below 80 still fails while attempt 2 is SUBMITTED
    ok, err = check_peer_submission_pass_eligibility(
        item_title="Essay 1",
        status="SUBMITTED",
        final_score=None,
        review_duty_status=REVIEW_DUTY_COMPLETED,
        has_pending_appeal=False,
        previous_best_score=65.0,
    )
    assert ok is False
    assert "80%" in err


def test_peer_submission_prepare_resubmission_and_effective_grade():
    from src.modules.assessment.domain import (
        ESSAY_GRADING_MODE_PEER_REVIEW,
        REVIEW_DUTY_COMPLETED,
        REVIEW_DUTY_PENDING,
        resolve_peer_effective_grade,
    )

    now = datetime(2026, 11, 17, 10, 0, 0, tzinfo=UTC)
    sub = PeerAssignmentSubmission(
        id="sub-ent-1",
        user_id="u1",
        item_id="item-1",
        submission_url="https://example.com/1",
        text_content="V1",
        created_at=now.isoformat(),
        final_score=88.0,
        graded_by_staff=True,
        graded_by_user_id="inst-1",
        grader_role="INSTRUCTOR",
        grade_source="INSTRUCTOR",
        published_at=now.isoformat(),
        status="PUBLISHED",
        review_duty_status=REVIEW_DUTY_COMPLETED,
    )

    # Active lock rejects prepare_resubmission
    sub.claim_lock("inst-2", now)
    with pytest.raises(ValueError, match="đang được"):
        sub.prepare_resubmission(
            submission_url="https://example.com/2",
            text_content="V2",
            now=now + timedelta(minutes=5),
            essay_mode=ESSAY_GRADING_MODE_PEER_REVIEW,
        )

    # Once lock expires, prepare_resubmission succeeds, snapshots 88.0, resets grading, preserves COMPLETED
    sub.prepare_resubmission(
        submission_url="https://example.com/2",
        text_content="V2",
        now=now + timedelta(minutes=35),
        essay_mode=ESSAY_GRADING_MODE_PEER_REVIEW,
    )
    assert sub.attempt_number == 2
    assert sub.status == "SUBMITTED"
    assert sub.final_score is None
    assert sub.graded_by_staff is False
    assert sub.locked_by_user_id is None
    assert sub.previous_best_score == 88.0
    assert sub.previous_best_grade_source == "INSTRUCTOR"
    assert sub.review_duty_status == REVIEW_DUTY_COMPLETED

    # Highest Score Wins across published attempts
    eff, src, _ = resolve_peer_effective_grade(
        status="PUBLISHED",
        final_score=72.0,
        grade_source="PEER_REVIEW",
        published_at=now.isoformat(),
        previous_best_score=sub.previous_best_score,
        previous_best_grade_source=sub.previous_best_grade_source,
        previous_best_published_at=sub.previous_best_published_at,
    )
    assert eff == 88.0
    assert src == "INSTRUCTOR"

    # PENDING duty stays PENDING on resubmit
    sub_pending = PeerAssignmentSubmission(
        id="sub-ent-2",
        user_id="u2",
        item_id="item-1",
        submission_url="https://example.com/1",
        text_content="V1",
        created_at=now.isoformat(),
        review_duty_status=REVIEW_DUTY_PENDING,
    )
    sub_pending.prepare_resubmission(
        submission_url="https://example.com/2",
        text_content="V2",
        now=now,
        essay_mode=ESSAY_GRADING_MODE_PEER_REVIEW,
    )
    assert sub_pending.review_duty_status == REVIEW_DUTY_PENDING
