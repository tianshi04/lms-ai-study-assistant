from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.modules.assessment.application.peer_review_usecase import PeerReviewUseCase
from src.modules.assessment.domain import (
    ESSAY_GRADING_MODE_INSTRUCTOR_ONLY,
    ESSAY_GRADING_MODE_PEER_REVIEW,
    PEER_ASSIGNMENT_STATUS_ASSIGNED,
    PEER_ASSIGNMENT_STATUS_COMPLETED,
    PeerAssignmentGradedDomainEvent,
    PeerAssignmentSubmission,
    PeerReview,
    PeerReviewAssignment,
    PeerReviewSubmittedDomainEvent,
    RubricCriteria,
)
from src.modules.assessment.infrastructure.repository import (
    SQLAlchemyAssessmentRepository,
)
from src.shared.infrastructure.event_bus import EventBus
from tests.unit.test_assessment import InMemoryAssessmentRepository


def _default_rubric() -> list[RubricCriteria]:
    return [
        RubricCriteria(
            "c1", "Chất lượng nội dung & Giải pháp", 10.0, 10.0, "Nội dung tốt"
        ),
        RubricCriteria(
            "c2", "Bố cục, Trình bày & Minh chứng", 10.0, 10.0, "Trình bày rõ"
        ),
        RubricCriteria("c3", "Tính ứng dụng & Đóng góp", 10.0, 10.0, "Ứng dụng cao"),
    ]


@pytest.mark.asyncio
async def test_audit_user_with_progress_row_blocked_from_peer_grading(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Audit user who triggered LearningProgressModel via GetProgress must still be blocked by verify_paid_access."""
    repo = InMemoryAssessmentRepository()
    item_id = "item-audit-block"
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-victim",
            user_id="victim-stu",
            item_id=item_id,
            submission_url="https://example.com/victim",
            text_content="Victim essay",
            created_at="2026-11-10T00:00:00+00:00",
        )
    )
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-audit-fake",
            user_id="audit-user",
            item_id=item_id,
            submission_url="https://example.com/audit",
            text_content="Audit essay",
            created_at="2026-11-10T01:00:00+00:00",
        )
    )

    class _SQLAlchemyMockRepo(InMemoryAssessmentRepository):
        """Class name contains SQLAlchemy so production AccessPolicyService path runs."""

    sql_like_repo = _SQLAlchemyMockRepo()
    sql_like_repo.peer_submissions = repo.peer_submissions
    sql_like_repo.learning_items_details = repo.learning_items_details

    mock_learning_repo = AsyncMock()
    # Simulates LearningProgressModel auto-created for Audit user when calling GetProgress
    mock_learning_repo.check_enrollment = AsyncMock(return_value=True)

    mock_session = AsyncMock()

    @asynccontextmanager
    async def _fake_scope():
        yield mock_session

    monkeypatch.setattr(
        "src.modules.assessment.application.peer_review_usecase.async_session_scope",
        _fake_scope,
    )

    usecase = PeerReviewUseCase(
        repository=sql_like_repo,
        learning_repo_factory=lambda _s: mock_learning_repo,
    )

    with patch(
        "src.shared.access_policy.AccessPolicyService.verify_paid_access",
        new=AsyncMock(
            return_value=(
                False,
                "Tài khoản đang ở chế độ Audit Mode (Miễn phí).",
            )
        ),
    ):
        with pytest.raises(PermissionError, match="Audit Mode"):
            await usecase.get_peer_reviews_to_grade("audit-user", item_id)

        now = datetime.now(UTC)
        assign = await sql_like_repo.create_or_get_peer_review_assignment(
            submission_id="sub-victim",
            reviewer_user_id="audit-user",
            item_id=item_id,
            assigned_at=now.isoformat(),
            expires_at=(now + timedelta(minutes=30)).isoformat(),
        )
        await sql_like_repo.claim_submission_lock("sub-victim", "audit-user")

        with pytest.raises(PermissionError, match="Audit Mode"):
            await usecase.submit_peer_review_grade(
                review_id=assign.id,
                reviewer_user_id="audit-user",
                graded_criteria=_default_rubric(),
            )


@pytest.mark.asyncio
async def test_instructor_only_mode_blocks_submit_peer_review_grade() -> None:
    """Calling submit_peer_review_grade on an INSTRUCTOR_ONLY item must be rejected and never publish grade."""
    repo = InMemoryAssessmentRepository()
    item_id = "item-inst-only-sec"
    repo.learning_items_details[item_id] = {
        "id": item_id,
        "title": "Final Exam Essay",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": ESSAY_GRADING_MODE_INSTRUCTOR_ONLY,
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    sub = PeerAssignmentSubmission(
        id="sub-inst-only-1",
        user_id="student-1",
        item_id=item_id,
        submission_url="https://example.com/essay",
        text_content="Essay",
        created_at="2026-11-10T00:00:00+00:00",
    )
    await repo.save_peer_submission(sub)
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-attacker-1",
            user_id="attacker-1",
            item_id=item_id,
            submission_url="https://example.com/a1",
            text_content="A1",
            created_at="2026-11-10T01:00:00+00:00",
        )
    )
    now = datetime.now(UTC)
    assign = await repo.create_or_get_peer_review_assignment(
        submission_id="sub-inst-only-1",
        reviewer_user_id="attacker-1",
        item_id=item_id,
        assigned_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=30)).isoformat(),
    )
    await repo.claim_submission_lock("sub-inst-only-1", "attacker-1")

    received_events: list[Any] = []

    async def _tracker(evt: Any) -> None:
        received_events.append(evt)

    EventBus.subscribe(PeerAssignmentGradedDomainEvent, _tracker)

    usecase = PeerReviewUseCase(repository=repo)
    with pytest.raises(PermissionError, match="Chỉ Giảng viên/Trợ giảng chấm"):
        await usecase.submit_peer_review_grade(
            review_id=assign.id,
            reviewer_user_id="attacker-1",
            graded_criteria=_default_rubric(),
        )

    saved_sub = await repo.get_peer_submission("sub-inst-only-1")
    assert saved_sub is not None
    assert saved_sub.status == "SUBMITTED"
    assert saved_sub.final_score is None
    assert await repo.get_peer_reviews_for_submission("sub-inst-only-1") == []
    assert not any(e.submission_id == "sub-inst-only-1" for e in received_events)


@pytest.mark.asyncio
async def test_predictable_and_unassigned_review_ids_rejected() -> None:
    """Forged rev-{submission_id}, raw submission_id, or another user's assignment token must fail."""
    repo = InMemoryAssessmentRepository()
    item_id = "item-opaque-sec"
    repo.learning_items_details[item_id] = {
        "id": item_id,
        "title": "Peer Essay",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": ESSAY_GRADING_MODE_PEER_REVIEW,
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-target",
            user_id="author-1",
            item_id=item_id,
            submission_url="https://example.com/target",
            text_content="Target",
            created_at="2026-11-10T00:00:00+00:00",
        )
    )
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-rev-a",
            user_id="reviewer-a",
            item_id=item_id,
            submission_url="https://example.com/a",
            text_content="A",
            created_at="2026-11-10T01:00:00+00:00",
        )
    )
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-rev-b",
            user_id="reviewer-b",
            item_id=item_id,
            submission_url="https://example.com/b",
            text_content="B",
            created_at="2026-11-10T02:00:00+00:00",
        )
    )

    usecase = PeerReviewUseCase(repository=repo)
    queue_a = await usecase.get_peer_reviews_to_grade("reviewer-a", item_id)
    assert len(queue_a) >= 1
    token_a = queue_a[0]["review_id"]
    assert token_a != "rev-sub-target"

    # 1. Forged rev-{submission_id} rejected
    with pytest.raises(PermissionError, match="Phiên chấm bài không hợp lệ"):
        await usecase.submit_peer_review_grade(
            review_id="rev-sub-target",
            reviewer_user_id="reviewer-b",
            graded_criteria=_default_rubric(),
        )

    # 2. Raw submission_id rejected
    with pytest.raises(PermissionError, match="Phiên chấm bài không hợp lệ"):
        await usecase.submit_peer_review_grade(
            review_id="sub-target",
            reviewer_user_id="reviewer-b",
            graded_criteria=_default_rubric(),
        )

    # 3. Stolen assignment token belonging to reviewer-a rejected for reviewer-b
    with pytest.raises(PermissionError, match="Phiên chấm bài không hợp lệ"):
        await usecase.submit_peer_review_grade(
            review_id=token_a,
            reviewer_user_id="reviewer-b",
            graded_criteria=_default_rubric(),
        )


@pytest.mark.asyncio
async def test_reviewer_without_own_submission_and_invalid_lock_rejected() -> None:
    """Enforces BR_PEER_001 (must submit first) and active lock ownership on submit_peer_review_grade."""
    repo = InMemoryAssessmentRepository()
    item_id = "item-lock-sec"
    sub = PeerAssignmentSubmission(
        id="sub-author",
        user_id="author-1",
        item_id=item_id,
        submission_url="https://example.com/author",
        text_content="Author work",
        created_at="2026-11-10T00:00:00+00:00",
    )
    await repo.save_peer_submission(sub)

    now = datetime.now(UTC)
    assign_no_sub = await repo.create_or_get_peer_review_assignment(
        submission_id="sub-author",
        reviewer_user_id="no-sub-user",
        item_id=item_id,
        assigned_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=30)).isoformat(),
    )
    await repo.claim_submission_lock("sub-author", "no-sub-user")

    usecase = PeerReviewUseCase(repository=repo)
    # 1. Even with assignment & lock, missing own submission (BR_PEER_001) is blocked
    with pytest.raises(PermissionError, match="cần nộp bài cá nhân trước"):
        await usecase.submit_peer_review_grade(
            review_id=assign_no_sub.id,
            reviewer_user_id="no-sub-user",
            graded_criteria=_default_rubric(),
        )

    # 2. Reviewer has submitted, has active assignment, but lock is held by someone else
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-rev-real",
            user_id="rev-real",
            item_id=item_id,
            submission_url="https://example.com/rev",
            text_content="Rev work",
            created_at="2026-11-10T01:00:00+00:00",
        )
    )
    assign_real = await repo.create_or_get_peer_review_assignment(
        submission_id="sub-author",
        reviewer_user_id="rev-real",
        item_id=item_id,
        assigned_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=30)).isoformat(),
    )
    # Lock currently held by "no-sub-user"
    with pytest.raises(PermissionError, match="không giữ khóa chấm bài hợp lệ"):
        await usecase.submit_peer_review_grade(
            review_id=assign_real.id,
            reviewer_user_id="rev-real",
            graded_criteria=_default_rubric(),
        )

    # 3. Expired assignment rejected
    expired_assign = PeerReviewAssignment(
        id="rev-expired-token",
        submission_id="sub-author",
        reviewer_user_id="rev-real",
        item_id=item_id,
        assigned_at=(now - timedelta(hours=2)).isoformat(),
        expires_at=(now - timedelta(hours=1)).isoformat(),
        status=PEER_ASSIGNMENT_STATUS_ASSIGNED,
    )
    await repo.save_peer_review_assignment(expired_assign)
    with pytest.raises(PermissionError, match="đã hết hạn"):
        await usecase.submit_peer_review_grade(
            review_id="rev-expired-token",
            reviewer_user_id="rev-real",
            graded_criteria=_default_rubric(),
        )


@pytest.mark.asyncio
async def test_sqlalchemy_repository_peer_methods_flush_never_commit() -> None:
    """Verify SQLAlchemyAssessmentRepository peer methods use flush() so async_session_scope owns atomic commits."""
    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    scalar_none = MagicMock()
    scalar_none.scalar_one_or_none.return_value = None
    row_ok = MagicMock()
    row_ok.rowcount = 1
    mock_session.execute.side_effect = [
        scalar_none,  # save_peer_review SELECT
        row_ok,  # claim_submission_lock UPDATE
        row_ok,  # release_submission_lock UPDATE
        scalar_none,  # create_or_get_peer_review_assignment SELECT
    ]
    mock_session.get.return_value = None

    repo = SQLAlchemyAssessmentRepository(mock_session)
    now = datetime.now(UTC)

    await repo.save_peer_review(
        PeerReview(
            id="rev-123",
            submission_id="sub-1",
            reviewer_user_id="u-1",
            item_id="item-1",
            rubric_criteria=_default_rubric(),
            total_score=100.0,
            created_at=now.isoformat(),
        )
    )
    await repo.claim_submission_lock("sub-1", "u-1")
    await repo.release_submission_lock("sub-1", "u-1")
    await repo.create_or_get_peer_review_assignment(
        submission_id="sub-1",
        reviewer_user_id="u-1",
        item_id="item-1",
        assigned_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=30)).isoformat(),
    )

    assert mock_session.commit.await_count == 0
    assert mock_session.flush.await_count == 4


@pytest.mark.asyncio
async def test_split_transaction_rollback_and_post_commit_event_publishing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """If an error occurs during submit_peer_review_grade, session rolls back without commit or EventBus publish."""
    commit_count = 0
    rollback_count = 0

    @asynccontextmanager
    async def _tx_scope():
        nonlocal commit_count, rollback_count
        try:
            yield AsyncMock()
            commit_count += 1
        except Exception:
            rollback_count += 1
            raise

    monkeypatch.setattr(
        "src.modules.assessment.application.peer_review_usecase.async_session_scope",
        _tx_scope,
    )

    repo = InMemoryAssessmentRepository()
    item_id = "item-tx-test"
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-target-tx",
            user_id="author-tx",
            item_id=item_id,
            submission_url="https://example.com/tx",
            text_content="TX",
            created_at="2026-11-10T00:00:00+00:00",
        )
    )
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-rev-tx",
            user_id="rev-tx",
            item_id=item_id,
            submission_url="https://example.com/rev-tx",
            text_content="Rev TX",
            created_at="2026-11-10T01:00:00+00:00",
        )
    )

    now = datetime.now(UTC)
    assign = await repo.create_or_get_peer_review_assignment(
        submission_id="sub-target-tx",
        reviewer_user_id="rev-tx",
        item_id=item_id,
        assigned_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=30)).isoformat(),
    )
    await repo.claim_submission_lock("sub-target-tx", "rev-tx")

    # Simulate release_submission_lock returning False mid-flow -> must rollback and NOT save review
    repo.release_submission_lock = AsyncMock(return_value=False)  # type: ignore[method-assign]

    mock_learning_repo = AsyncMock()
    mock_learning_repo.check_enrollment = AsyncMock(return_value=True)
    usecase = PeerReviewUseCase(learning_repo_factory=lambda _s: mock_learning_repo)
    usecase._get_repo = AsyncMock(return_value=repo)  # type: ignore[method-assign]

    with pytest.raises(PermissionError, match="Không thể giải phóng khóa"):
        await usecase.submit_peer_review_grade(
            review_id=assign.id,
            reviewer_user_id="rev-tx",
            graded_criteria=_default_rubric(),
        )

    assert commit_count == 0
    assert rollback_count == 1
    assert await repo.get_peer_reviews_for_submission("sub-target-tx") == []
    assert assign.status == PEER_ASSIGNMENT_STATUS_ASSIGNED

    # Confirm valid flow marks assignment COMPLETED and commits once
    repo.release_submission_lock = AsyncMock(return_value=True)  # type: ignore[method-assign]
    ok, _ = await usecase.submit_peer_review_grade(
        review_id=assign.id,
        reviewer_user_id="rev-tx",
        graded_criteria=_default_rubric(),
    )
    assert ok is True
    assert commit_count == 1
    assert assign.status == PEER_ASSIGNMENT_STATUS_COMPLETED


@pytest.mark.asyncio
async def test_fourth_plus_peer_review_does_not_alter_score_and_only_notifies() -> None:
    """Once 3 reviews publish the grade, a 4th+ review only records feedback, updates reviewer quota, and notifies author."""
    repo = InMemoryAssessmentRepository()
    item_id = "item-fourth-review"
    repo.learning_items_details[item_id] = {
        "id": item_id,
        "title": "Essay 4th Review",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": ESSAY_GRADING_MODE_PEER_REVIEW,
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    usecase = PeerReviewUseCase(repository=repo)

    author_sub_id, _ = await usecase.submit_peer_assignment(
        "author-main", item_id, "https://example.com/author", "Author essay"
    )
    for idx in range(1, 5):
        await usecase.submit_peer_assignment(
            f"rev-{idx}",
            item_id,
            f"https://example.com/r{idx}",
            f"Reviewer {idx} essay",
        )

    graded_events: list[PeerAssignmentGradedDomainEvent] = []
    submitted_events: list[PeerReviewSubmittedDomainEvent] = []

    async def _on_graded(evt: PeerAssignmentGradedDomainEvent) -> None:
        graded_events.append(evt)

    async def _on_submitted(evt: PeerReviewSubmittedDomainEvent) -> None:
        submitted_events.append(evt)

    EventBus.subscribe(PeerAssignmentGradedDomainEvent, _on_graded)
    EventBus.subscribe(PeerReviewSubmittedDomainEvent, _on_submitted)

    def _score_rubric(val: float) -> list[RubricCriteria]:
        return [
            RubricCriteria(
                "c1", "Chất lượng nội dung & Giải pháp", 10.0, val, "Đạt yêu cầu"
            ),
            RubricCriteria(
                "c2", "Bố cục, Trình bày & Minh chứng", 10.0, val, "Trình bày ổn"
            ),
            RubricCriteria("c3", "Tính ứng dụng & Đóng góp", 10.0, val, "Khả thi tốt"),
        ]

    # First 3 reviews for author-main: 7.0 (70%), 8.0 (80%), 9.0 (90%) -> avg = 80.0%
    now = datetime.now(UTC)
    for idx, val in [(1, 7.0), (2, 8.0), (3, 9.0)]:
        uid = f"rev-{idx}"
        assign = await repo.create_or_get_peer_review_assignment(
            submission_id=author_sub_id,
            reviewer_user_id=uid,
            item_id=item_id,
            assigned_at=now.isoformat(),
            expires_at=(now + timedelta(minutes=30)).isoformat(),
        )
        await repo.claim_submission_lock(author_sub_id, uid)
        ok, _ = await usecase.submit_peer_review_grade(
            review_id=assign.id,
            reviewer_user_id=uid,
            graded_criteria=_score_rubric(val),
        )
        assert ok is True

    # Complete author-main's own review duty if needed? Wait: author-main hasn't reviewed 3 yet, so let's verify status & score:
    # Even if author-main's duty is still PENDING, status is PUBLISHED at 80.0% with published_at set!
    author_sub = await repo.get_peer_submission(author_sub_id)
    assert author_sub is not None
    assert author_sub.status == "PUBLISHED"
    assert author_sub.final_score == 80.0
    first_published_at = author_sub.published_at
    assert first_published_at is not None

    # Clear tracked events before 4th review
    graded_events.clear()
    submitted_events.clear()

    # 4th reviewer grades 100% (10.0) -> must NOT raise score to 85.0%, must NOT change published_at,
    # must NOT emit PeerAssignmentGradedDomainEvent for author, and MUST emit PeerReviewSubmittedDomainEvent!
    assign_4 = await repo.create_or_get_peer_review_assignment(
        submission_id=author_sub_id,
        reviewer_user_id="rev-4",
        item_id=item_id,
        assigned_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=30)).isoformat(),
    )
    await repo.claim_submission_lock(author_sub_id, "rev-4")
    ok4, _ = await usecase.submit_peer_review_grade(
        review_id=assign_4.id,
        reviewer_user_id="rev-4",
        graded_criteria=_score_rubric(10.0),
    )
    assert ok4 is True

    author_sub_after = await repo.get_peer_submission(author_sub_id)
    assert author_sub_after is not None
    assert author_sub_after.final_score == 80.0
    assert author_sub_after.published_at == first_published_at
    assert len(await repo.get_peer_reviews_for_submission(author_sub_id)) == 4
    assert not any(e.submission_id == author_sub_id for e in graded_events)
    assert any(
        e.submission_id == author_sub_id
        and e.author_id == "author-main"
        and e.reviewer_id == "rev-4"
        and e.score == 100.0
        for e in submitted_events
    )


@pytest.mark.asyncio
async def test_midnight_dynamic_quota_and_early_staff_rescue_require_cold_start_48h() -> (
    None
):
    """Dynamic quota shrinkage and WAIVED_EMPTY_POOL must wait for cold_start_hours (48h)."""
    repo = InMemoryAssessmentRepository()
    item_id = "item-cold-start-guard"
    repo.learning_items_details[item_id] = {
        "id": item_id,
        "title": "Cold Start Guard Essay",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": ESSAY_GRADING_MODE_PEER_REVIEW,
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    usecase = PeerReviewUseCase(repository=repo)

    # 1. Midnight 2-student class: Alice grades Bob (1/3) -> must stay WAITING_POOL, NOT COMPLETED
    _sub_alice_id, _ = await usecase.submit_peer_assignment(
        "alice-2am", item_id, "https://example.com/alice", "Alice"
    )
    await usecase.submit_peer_assignment(
        "bob-2am", item_id, "https://example.com/bob", "Bob"
    )
    q_alice = await usecase.get_peer_reviews_to_grade("alice-2am", item_id)
    assert len(q_alice) == 1
    await usecase.submit_peer_review_grade(
        review_id=q_alice[0]["review_id"],
        reviewer_user_id="alice-2am",
        graded_criteria=_default_rubric(),
    )
    alice_status_2am = await usecase.get_my_peer_submission_status("alice-2am", item_id)
    assert alice_status_2am["review_duty_status"] == "WAITING_POOL"
    assert alice_status_2am["target_reviews_required"] == 3

    # Morning arrives: Carol submits -> Alice flips back to PENDING and must finish grading!
    await usecase.submit_peer_assignment(
        "carol-8am", item_id, "https://example.com/carol", "Carol"
    )
    alice_status_8am = await usecase.get_my_peer_submission_status("alice-2am", item_id)
    assert alice_status_8am["review_duty_status"] == "PENDING"
    assert alice_status_8am["available_pool_count"] == 1

    # 2. Early staff rescue (< 48h) on solo submission must NOT grant WAIVED_EMPTY_POOL before 48h
    from src.shared.auth import CurrentUser

    item_early = "item-early-rescue"
    repo.learning_items_details[item_early] = {
        "id": item_early,
        "title": "Early Rescue",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": ESSAY_GRADING_MODE_PEER_REVIEW,
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    graded_events: list[PeerAssignmentGradedDomainEvent] = []

    async def _on_graded(evt: PeerAssignmentGradedDomainEvent) -> None:
        graded_events.append(evt)

    EventBus.subscribe(PeerAssignmentGradedDomainEvent, _on_graded)

    solo_sub_id, _ = await usecase.submit_peer_assignment(
        "solo-early", item_early, "https://example.com/solo", "Solo"
    )
    inst = CurrentUser(id="inst-early", role="INSTRUCTOR", full_name="Instructor")
    await usecase.submit_staff_grading(
        submission_id=solo_sub_id,
        staff_user_id="inst-early",
        graded_criteria=_default_rubric(),
        total_score=100.0,
        current_user=inst,
    )
    solo_early_status = await usecase.get_my_peer_submission_status(
        "solo-early", item_early
    )
    assert solo_early_status["is_graded"] is True
    assert solo_early_status["review_duty_status"] == "WAITING_POOL"
    assert not any(e.user_id == "solo-early" for e in graded_events)

    # After 48h elapses with empty pool -> status check unlocks WAIVED_EMPTY_POOL + fires completion event
    solo_sub = await repo.get_peer_submission(solo_sub_id)
    assert solo_sub is not None
    solo_sub.created_at = (datetime.now(UTC) - timedelta(hours=49)).isoformat()
    await repo.save_peer_submission(solo_sub)

    solo_after_48h = await usecase.get_my_peer_submission_status(
        "solo-early", item_early
    )
    assert solo_after_48h["review_duty_status"] == "WAIVED_EMPTY_POOL"
    assert any(e.user_id == "solo-early" for e in graded_events)


@pytest.mark.asyncio
async def test_staff_graded_fallback_pool_sorting_and_soft_lock_anti_dos_and_no_pingpong() -> (
    None
):
    """Unpublished sort before peer-published and staff-graded fallback; grading staff-graded item keeps staff score; polling does not extend lock."""
    repo = InMemoryAssessmentRepository()
    item_id = "item-pool-lock-guard"
    repo.learning_items_details[item_id] = {
        "id": item_id,
        "title": "Pool Lock Guard",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": ESSAY_GRADING_MODE_PEER_REVIEW,
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    usecase = PeerReviewUseCase(repository=repo)

    # 1. Staff-graded submission stays in pool as last-resort fallback AFTER ungraded & peer-published
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-staff-done",
            user_id="stu-staff-done",
            item_id=item_id,
            submission_url="https://example.com/done",
            text_content="Already staff graded",
            created_at=(datetime.now(UTC) - timedelta(hours=5)).isoformat(),
            final_score=90.0,
            graded_by_staff=True,
            grade_source="INSTRUCTOR",
            status="PUBLISHED",
            published_at=(datetime.now(UTC) - timedelta(hours=4)).isoformat(),
        )
    )
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-peer-open",
            user_id="stu-open",
            item_id=item_id,
            submission_url="https://example.com/open",
            text_content="Needs peer review",
            created_at=(datetime.now(UTC) - timedelta(hours=4)).isoformat(),
        )
    )
    await usecase.submit_peer_assignment(
        "stu-rev-1", item_id, "https://example.com/r1", "R1"
    )
    await usecase.submit_peer_assignment(
        "stu-rev-2", item_id, "https://example.com/r2", "R2"
    )

    # stu-rev-1 sees all 3 peer submissions (including staff-graded fallback) ordered unpublished first
    assert await repo.count_available_pool_submissions(item_id, "stu-rev-1") == 3

    # 2. Repeated get_peer_reviews_to_grade calls must NOT extend lock_expires_at (anti-DoS)
    q1 = await usecase.get_peer_reviews_to_grade("stu-rev-1", item_id)
    assert len(q1) == 3
    # First item must be sub-peer-open (unpublished, earliest), last item must be staff-graded
    assert q1[0]["submission_url"] == "https://example.com/open"
    assert q1[-1]["submission_url"] == "https://example.com/done"

    # Grading the staff-graded submission records review & duty without changing Instructor's 90.0 score
    ok_staff_fb, _ = await usecase.submit_peer_review_grade(
        review_id=q1[-1]["review_id"],
        reviewer_user_id="stu-rev-1",
        graded_criteria=[
            RubricCriteria(
                "c1",
                "Chất lượng nội dung & Giải pháp",
                10.0,
                5.0,
                "Góp ý tham khảo cho bài đã có điểm GV.",
            ),
            RubricCriteria(
                "c2", "Bố cục, Trình bày & Minh chứng", 10.0, 5.0, "Rõ ràng"
            ),
            RubricCriteria("c3", "Tính ứng dụng & Đóng góp", 10.0, 5.0, "Tốt"),
        ],
    )
    assert ok_staff_fb is True
    staff_sub_after = await repo.get_peer_submission("sub-staff-done")
    assert staff_sub_after is not None
    assert staff_sub_after.final_score == 90.0
    assert staff_sub_after.grade_source == "INSTRUCTOR"
    assert await repo.count_user_completed_reviews(item_id, "stu-rev-1") == 1

    # Re-fetch q_remaining to verify existing active lock is NOT extended on poll
    sub_open_locked = await repo.get_peer_submission("sub-peer-open")
    assert sub_open_locked is not None
    original_lock_exp = sub_open_locked.lock_expires_at
    assert original_lock_exp is not None
    assign_before = await repo.get_peer_review_assignment(
        q1[0]["review_id"], "stu-rev-1"
    )
    assert assign_before is not None

    # Backdate lock_expires_at by 10 mins (still active!) and poll again -> must NOT reset to +30 mins
    earlier_exp = (datetime.now(UTC) + timedelta(minutes=20)).isoformat()
    sub_open_locked.lock_expires_at = earlier_exp
    assign_before.expires_at = earlier_exp
    q2 = await usecase.get_peer_reviews_to_grade("stu-rev-1", item_id)
    assert q2[0]["review_id"] == q1[0]["review_id"]
    assert sub_open_locked.lock_expires_at == earlier_exp
    assert assign_before.expires_at == earlier_exp

    # 3. Ping-Pong guard: lock all eligible submissions for stu-rev-2 so none are unlocked right now
    stu_rev1_sub = await repo.get_user_peer_submission("stu-rev-1", item_id)
    assert stu_rev1_sub is not None
    await repo.claim_submission_lock(stu_rev1_sub.id, "stu-open")
    await repo.claim_submission_lock("sub-staff-done", "stu-open")
    q_rev2 = await usecase.get_peer_reviews_to_grade("stu-rev-2", item_id)
    assert q_rev2 == []
    rev2_sub = await repo.get_user_peer_submission("stu-rev-2", item_id)
    assert rev2_sub is not None
    assert rev2_sub.review_duty_status == "PENDING"  # NOT flipped to WAITING_POOL!

    # 4. INSTRUCTOR_ONLY mode returns available_pool_count == 0
    item_inst = "item-inst-pool-zero"
    repo.learning_items_details[item_inst] = {
        "id": item_inst,
        "title": "Inst Only",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": ESSAY_GRADING_MODE_INSTRUCTOR_ONLY,
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    await usecase.submit_peer_assignment(
        "stu-io-1", item_inst, "https://example.com/io1", "IO1"
    )
    await usecase.submit_peer_assignment(
        "stu-io-2", item_inst, "https://example.com/io2", "IO2"
    )
    io_status = await usecase.get_my_peer_submission_status("stu-io-1", item_inst)
    assert io_status["available_pool_count"] == 0
    assert io_status["target_reviews_required"] == 0


@pytest.mark.asyncio
async def test_access_guards_course_role_regrade_appeal_published_and_report_isolation() -> (
    None
):
    """Covers enrollment/paid/DRAFT guards, course-scoped regrade role, PUBLISHED appeal guard, and separate report table."""
    from src.modules.assessment.application.assessment_usecase import AssessmentUseCase
    from src.modules.catalog.domain import Course, CourseStatus
    from src.shared.auth import CurrentUser

    class _CourseMapRepo(InMemoryAssessmentRepository):
        def __init__(self) -> None:
            super().__init__()
            self.course_detail_map: dict[str, Course] = {}
            self.paid_access_checker: Any = None
            self.is_enrolled: Any = lambda _u, _c: True

    repo = _CourseMapRepo()
    item_id = "item-authz-check"
    repo.learning_items_details[item_id] = {
        "id": item_id,
        "title": "Authz Essay",
        "reading_markdown": "Secret prompt",
        "rubric_criteria_json": "",
        "essay_grading_mode": ESSAY_GRADING_MODE_PEER_REVIEW,
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    course = Course(
        id="course_test_1",
        title="Course Authz",
        slug="course-authz",
        owner_id="real_owner",
        co_instructor_ids=["co_inst"],
        ta_ids=["global_inst_but_ta_here"],
        status=CourseStatus.DRAFT,
    )
    repo.course_detail_map["course_test_1"] = course

    usecase = AssessmentUseCase(repository=repo)

    # 1. Learner cannot view DRAFT course prompt/rubric via get_my_peer_submission_status
    with pytest.raises(PermissionError, match="chưa được xuất bản"):
        await usecase.get_my_peer_submission_status("learner-1", item_id)

    # Course published -> unenrolled learner still blocked
    course.status = CourseStatus.PUBLISHED
    repo.is_enrolled = lambda u, c: u != "unenrolled-stu"
    with pytest.raises(PermissionError, match="đăng ký khóa học"):
        await usecase.get_my_peer_submission_status("unenrolled-stu", item_id)

    # Enrolled Audit user blocked from get_my_peer_submission_status & get_peer_reviews_to_grade
    repo.paid_access_checker = lambda u, c: (
        (False, "Audit Mode") if u == "audit-stu" else (True, "")
    )
    with pytest.raises(PermissionError, match="Audit Mode"):
        await usecase.get_my_peer_submission_status("audit-stu", item_id)

    # 2. SubmitGradeAppeal blocked before PUBLISHED, allowed after PUBLISHED, and ReportPeerReview works alongside Appeal
    sub_id, _ = await usecase.submit_peer_assignment(
        "stu-appeal-flow", item_id, "https://example.com/app", "Content"
    )
    with pytest.raises(ValueError, match="công bố điểm chính thức"):
        await usecase.submit_grade_appeal("stu-appeal-flow", sub_id, "Early jump")

    # Publish via Instructor
    real_owner = CurrentUser(id="real_owner", role="INSTRUCTOR", full_name="Owner")
    await usecase.submit_staff_grading(
        submission_id=sub_id,
        staff_user_id="real_owner",
        graded_criteria=_default_rubric(),
        total_score=100.0,
        provenance="INSTRUCTOR",
        current_user=real_owner,
    )

    # Add a PeerReview on this submission and check status returns review_id
    pr = PeerReview(
        id="rev-real-uuid7",
        submission_id=sub_id,
        reviewer_user_id="peer-rev",
        item_id=item_id,
        rubric_criteria=_default_rubric(),
        total_score=50.0,
        created_at=datetime.now(UTC).isoformat(),
        submission_attempt_number=1,
    )
    await repo.save_peer_review(pr)

    st_locked = await usecase.get_my_peer_submission_status("stu-appeal-flow", item_id)
    assert st_locked["is_graded"] is True
    assert st_locked["final_score"] == 0.0
    assert st_locked["peer_feedbacks"] == []

    # Complete review duty -> score, peer feedbacks, and appeal unlock
    sub_obj = await repo.get_peer_submission(sub_id)
    assert sub_obj is not None
    sub_obj.review_duty_status = "COMPLETED"
    await repo.save_peer_submission(sub_obj)

    st = await usecase.get_my_peer_submission_status("stu-appeal-flow", item_id)
    assert st["peer_feedbacks"][0]["review_id"] == "rev-real-uuid7"

    # Both submit_grade_appeal AND report_peer_review succeed on the same submission!
    ok_app, _ = await usecase.submit_grade_appeal(
        "stu-appeal-flow", sub_id, "Appeal reason"
    )
    assert ok_app is True
    ok_rep, _ = await usecase.report_peer_review(
        "stu-appeal-flow", "rev-real-uuid7", "Spam review"
    )
    assert ok_rep is True

    # 3. Course-scoped role in regrade_peer_submission_by_staff:
    # Global INSTRUCTOR who is only TA on this course CANNOT override INSTRUCTOR grade!
    global_inst_ta = CurrentUser(
        id="global_inst_but_ta_here", role="INSTRUCTOR", full_name="TA Only Here"
    )
    with pytest.raises(PermissionError, match="Trợ giảng không thể chấm đè"):
        await usecase.regrade_peer_submission_by_staff(
            submission_id=sub_id,
            staff_user_id="global_inst_but_ta_here",
            ta_score=99.0,
            current_user=global_inst_ta,
        )

    # Real co-instructor CAN override
    co_inst = CurrentUser(id="co_inst", role="INSTRUCTOR", full_name="Co-Inst")
    ok_regrade, _ = await usecase.regrade_peer_submission_by_staff(
        submission_id=sub_id,
        staff_user_id="co_inst",
        ta_score=88.0,
        current_user=co_inst,
    )
    assert ok_regrade is True
    updated_sub = await repo.get_peer_submission(sub_id)
    assert updated_sub is not None
    assert updated_sub.final_score == 88.0
    assert updated_sub.grader_role == "INSTRUCTOR"


@pytest.mark.asyncio
async def test_peer_submission_url_text_and_feedback_validation() -> None:
    """Rejects relative/malformed URLs, too-short text-only submissions, and empty/trivial peer review feedback."""
    repo = InMemoryAssessmentRepository()
    item_id = "item-input-validation"
    repo.learning_items_details[item_id] = {
        "id": item_id,
        "title": "Validated Essay",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": ESSAY_GRADING_MODE_PEER_REVIEW,
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    usecase = PeerReviewUseCase(repository=repo)

    for bad_url in (
        "/",
        "/relative/path",
        "//evil.com",
        "http://",
        "ftp://files.local/a",
    ):
        with pytest.raises(ValueError, match="http://"):
            await usecase.submit_peer_assignment("stu-val", item_id, bad_url, "")

    with pytest.raises(ValueError, match="ít nhất"):
        await usecase.submit_peer_assignment("stu-val", item_id, "", "abc")

    sub_id, _ = await usecase.submit_peer_assignment(
        "stu-val", item_id, "", "Đây là nội dung bài tự luận đầy đủ hợp lệ."
    )
    assert sub_id.startswith("peer-")

    await usecase.submit_peer_assignment(
        "rev-val", item_id, "https://example.com/work", ""
    )
    queue = await usecase.get_peer_reviews_to_grade("rev-val", item_id)
    assert len(queue) == 1
    review_id = queue[0]["review_id"]

    # Empty or trivial feedback rejected without consuming assignment/lock
    for bad_feedback in ("", "   ", "ok"):
        with pytest.raises(ValueError, match="nhận xét chi tiết"):
            await usecase.submit_peer_review_grade(
                review_id=review_id,
                reviewer_user_id="rev-val",
                graded_criteria=[
                    RubricCriteria(
                        "c1", "Chất lượng nội dung & Giải pháp", 10.0, 0.0, bad_feedback
                    ),
                    RubricCriteria(
                        "c2", "Bố cục, Trình bày & Minh chứng", 10.0, 0.0, ""
                    ),
                    RubricCriteria("c3", "Tính ứng dụng & Đóng góp", 10.0, 0.0, ""),
                ],
            )

    # Valid feedback succeeds using the same still-active assignment
    ok, _ = await usecase.submit_peer_review_grade(
        review_id=review_id,
        reviewer_user_id="rev-val",
        graded_criteria=[
            RubricCriteria(
                "c1",
                "Chất lượng nội dung & Giải pháp",
                10.0,
                8.0,
                "Giải pháp rõ ràng, cần bổ sung thêm dẫn chứng thực tế.",
            ),
            RubricCriteria("c2", "Bố cục, Trình bày & Minh chứng", 10.0, 8.0, ""),
            RubricCriteria("c3", "Tính ứng dụng & Đóng góp", 10.0, 8.0, ""),
        ],
    )
    assert ok is True


@pytest.mark.asyncio
async def test_outlier_reconciles_against_median_for_0_90_90() -> None:
    """First reviewer scoring 0% is retroactively flagged when 2nd & 3rd score 90%, while 90% reviewers are cleared."""
    repo = InMemoryAssessmentRepository()
    item_id = "item-outlier-median"
    repo.learning_items_details[item_id] = {
        "id": item_id,
        "title": "Median Outlier Essay",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": ESSAY_GRADING_MODE_PEER_REVIEW,
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    usecase = PeerReviewUseCase(repository=repo)

    author_sub_id, _ = await usecase.submit_peer_assignment(
        "author-med", item_id, "https://example.com/author-med", "Author submission"
    )
    for uid in ("r1", "r2", "r3"):
        await usecase.submit_peer_assignment(
            uid, item_id, f"https://example.com/{uid}", f"Work by {uid}"
        )

    def _rubric_with_score(score: float, note: str) -> list[RubricCriteria]:
        return [
            RubricCriteria("c1", "Chất lượng nội dung & Giải pháp", 10.0, score, note),
            RubricCriteria("c2", "Bố cục, Trình bày & Minh chứng", 10.0, score, note),
            RubricCriteria("c3", "Tính ứng dụng & Đóng góp", 10.0, score, note),
        ]

    now = datetime.now(UTC)

    # 1st reviewer scores 0% -> cannot be outlier alone
    a1 = await repo.create_or_get_peer_review_assignment(
        submission_id=author_sub_id,
        reviewer_user_id="r1",
        item_id=item_id,
        assigned_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=30)).isoformat(),
    )
    await repo.claim_submission_lock(author_sub_id, "r1")
    ok1, msg1 = await usecase.submit_peer_review_grade(
        a1.id, "r1", _rubric_with_score(0.0, "Bài làm chưa đạt yêu cầu nào.")
    )
    assert ok1 is True
    assert "Outlier" not in msg1

    # 2nd reviewer scores 90% -> 2-review divergence (>30%) flagged temporarily
    a2 = await repo.create_or_get_peer_review_assignment(
        submission_id=author_sub_id,
        reviewer_user_id="r2",
        item_id=item_id,
        assigned_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=30)).isoformat(),
    )
    await repo.claim_submission_lock(author_sub_id, "r2")
    ok2, msg2 = await usecase.submit_peer_review_grade(
        a2.id, "r2", _rubric_with_score(9.0, "Bài làm rất tốt và đầy đủ.")
    )
    assert ok2 is True
    assert "Outlier Flagged" in msg2

    # 3rd reviewer scores 90% -> median is 90%; r1 (0%) becomes outlier, r2 & r3 (90%) are NOT outliers
    a3 = await repo.create_or_get_peer_review_assignment(
        submission_id=author_sub_id,
        reviewer_user_id="r3",
        item_id=item_id,
        assigned_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=30)).isoformat(),
    )
    await repo.claim_submission_lock(author_sub_id, "r3")
    ok3, msg3 = await usecase.submit_peer_review_grade(
        a3.id, "r3", _rubric_with_score(9.0, "Lập luận sắc bén, trình bày sạch đẹp.")
    )
    assert ok3 is True
    assert "Outlier Flagged" not in msg3

    reviews = await repo.get_peer_reviews_for_submission(author_sub_id)
    by_reviewer = {r.reviewer_user_id: r for r in reviews}
    assert by_reviewer["r1"].is_outlier is True
    assert by_reviewer["r2"].is_outlier is False
    assert by_reviewer["r3"].is_outlier is False


@pytest.mark.asyncio
async def test_item_type_existence_report_access_and_regrade_lock_guards() -> None:
    """Covers remaining HIGH #7/#8 guards: item validation, report access check, and regrade lock guard."""
    from src.modules.catalog.domain import Course, CourseStatus
    from src.shared.auth import CurrentUser

    class _StrictItemRepo(InMemoryAssessmentRepository):
        def __init__(self) -> None:
            super().__init__()
            self.course_detail_map: dict[str, Course] = {}
            self.paid_access_checker: Any = None
            self.is_enrolled: Any = lambda _u, _c: True

        async def get_learning_item_details(
            self, item_id: str
        ) -> dict[str, Any] | None:
            return self.learning_items_details.get(item_id)

    repo = _StrictItemRepo()
    repo.learning_items_details["video-item"] = {
        "id": "video-item",
        "title": "Video Lesson",
        "item_type": "VIDEO",
        "reading_markdown": "",
        "rubric_criteria_json": "",
    }
    repo.learning_items_details["peer-item"] = {
        "id": "peer-item",
        "title": "Peer Essay",
        "item_type": "PEER_REVIEW",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": ESSAY_GRADING_MODE_PEER_REVIEW,
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    repo.course_detail_map["course_test_1"] = Course(
        id="course_test_1",
        title="Course Strict",
        slug="course-strict",
        owner_id="owner-inst",
        ta_ids=["ta-1"],
        status=CourseStatus.PUBLISHED,
    )

    usecase = PeerReviewUseCase(repository=repo)

    # 1. Unknown or non-PEER_REVIEW item_id rejected
    with pytest.raises(ValueError, match="không tồn tại"):
        await usecase.submit_peer_assignment(
            "stu-1", "missing-item", "https://example.com/x", ""
        )
    with pytest.raises(ValueError, match="không phải Bài tập tự luận"):
        await usecase.submit_peer_assignment(
            "stu-1", "video-item", "https://example.com/x", ""
        )

    # 2. ReportPeerReview rejects Audit / expired Paid user
    sub_id, _ = await usecase.submit_peer_assignment(
        "stu-1", "peer-item", "https://example.com/sub1", ""
    )
    pr = PeerReview(
        id="rev-report-guard",
        submission_id=sub_id,
        reviewer_user_id="rev-2",
        item_id="peer-item",
        rubric_criteria=_default_rubric(),
        total_score=60.0,
        created_at=datetime.now(UTC).isoformat(),
        submission_attempt_number=1,
    )
    await repo.save_peer_review(pr)

    repo.paid_access_checker = lambda u, _c: (
        (False, "Audit Mode") if u == "stu-1" else (True, "")
    )
    with pytest.raises(PermissionError, match="Audit Mode"):
        await usecase.report_peer_review("stu-1", "rev-report-guard", "Unfair score")

    # 3. regrade_peer_submission_by_staff blocked when active lock held by another user, releases stale lock when expired
    await repo.claim_submission_lock(sub_id, "ta-1", timeout_minutes=30)
    owner = CurrentUser(id="owner-inst", role="INSTRUCTOR", full_name="Owner")
    with pytest.raises(PermissionError, match="khóa để chấm"):
        await usecase.regrade_peer_submission_by_staff(
            sub_id, "owner-inst", 92.0, current_user=owner
        )

    sub_locked = await repo.get_peer_submission(sub_id)
    assert sub_locked is not None
    sub_locked.lock_expires_at = (datetime.now(UTC) - timedelta(minutes=5)).isoformat()
    sub_locked.locked_at = (datetime.now(UTC) - timedelta(minutes=35)).isoformat()

    ok, _ = await usecase.regrade_peer_submission_by_staff(
        sub_id, "owner-inst", 92.0, current_user=owner
    )
    assert ok is True
    sub_after = await repo.get_peer_submission(sub_id)
    assert sub_after is not None
    assert sub_after.locked_by_user_id is None
    assert sub_after.final_score == 92.0


@pytest.mark.asyncio
async def test_grade_appeal_releases_learner_locks_and_staff_preemption(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify bugfix: When learner submits appeal, existing locks & assignments are cleared, and staff has preemption over learner lock."""
    from src.modules.assessment.application.grade_appeal_usecase import (
        GradeAppealUseCase,
    )
    from src.modules.assessment.domain import (
        PEER_ASSIGNMENT_STATUS_CANCELLED,
        PEER_SUBMISSION_STATUS_PUBLISHED,
    )
    from src.shared.auth import CurrentUser

    repo = InMemoryAssessmentRepository()
    sub_id = "sub-appealed-1"
    item_id = "item-essay-appeal"
    now = datetime.now(UTC)

    # Submission already published with score
    sub = PeerAssignmentSubmission(
        id=sub_id,
        user_id="learner-author",
        item_id=item_id,
        submission_url="https://github.com/solution",
        text_content="My report",
        status=PEER_SUBMISSION_STATUS_PUBLISHED,
        final_score=0.0,
        published_at=now.isoformat(),
        created_at=now.isoformat(),
        locked_by_user_id="learner-peer-reviewer",
        locked_at=now.isoformat(),
        lock_expires_at=(now + timedelta(minutes=30)).isoformat(),
    )
    await repo.save_peer_submission(sub)

    # In-flight peer review assignment held by another student
    assign = await repo.create_or_get_peer_review_assignment(
        submission_id=sub_id,
        reviewer_user_id="learner-peer-reviewer",
        item_id=item_id,
        assigned_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=30)).isoformat(),
    )

    # 1. Learner submits grade appeal
    @asynccontextmanager
    async def _fake_scope():
        yield AsyncMock()

    monkeypatch.setattr(
        "src.modules.assessment.application.grade_appeal_usecase.async_session_scope",
        _fake_scope,
    )
    monkeypatch.setattr(
        "src.modules.assessment.application.peer_review_usecase.async_session_scope",
        _fake_scope,
    )

    appeal_uc = GradeAppealUseCase(repo=repo)
    appeal_uc._get_repo = AsyncMock(return_value=repo)
    monkeypatch.setattr(
        appeal_uc,
        "_verify_learner_item_access",
        AsyncMock(return_value=None),
    )
    await appeal_uc.submit_grade_appeal(
        user_id="learner-author",
        submission_id=sub_id,
        appeal_reason="Điểm chấm không công bằng, cần phúc khảo.",
    )

    # Verify lock was released and assignment was cancelled
    sub_after_appeal = await repo.get_peer_submission(sub_id)
    assert sub_after_appeal is not None
    assert sub_after_appeal.locked_by_user_id is None
    assert (
        repo.peer_review_assignments[assign.id].status
        == PEER_ASSIGNMENT_STATUS_CANCELLED
    )

    # 2. Staff preemption: if learner somehow locked a submission, instructor can preempt immediately
    sub_after_appeal.claim_lock("another-learner", now)
    peer_uc = PeerReviewUseCase(repo=repo)
    peer_uc._get_repo = AsyncMock(return_value=repo)
    instructor = CurrentUser(
        id="user_instructor_lead", role="INSTRUCTOR", full_name="Giảng viên chính"
    )

    # Instructor claims task
    ok, _msg, info = await peer_uc.claim_grading_task(
        submission_id=sub_id,
        staff_user_id="user_instructor_lead",
        current_user=instructor,
    )
    assert ok is True
    assert info["locked_by_user_id"] == "user_instructor_lead"
