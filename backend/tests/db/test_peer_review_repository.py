"""Real-PostgreSQL integration tests for Peer Review soft-locks, pool filtering, and PeerReviewReportModel."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from src.modules.assessment.domain import (
    PEER_ASSIGNMENT_STATUS_ASSIGNED,
    REPORT_STATUS_PENDING_STAFF_REVIEW,
    REPORT_STATUS_RESOLVED,
    GradeAppeal,
    PeerAssignmentSubmission,
    PeerReview,
    PeerReviewReport,
    RubricCriteria,
)
from src.modules.assessment.infrastructure.repository import (
    SQLAlchemyAssessmentRepository,
)
from src.shared.infrastructure.database import async_session_scope


def _uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


@pytest.mark.asyncio
async def test_pg_eligible_pool_prioritizes_ungraded_then_reviews_then_staff_fallback() -> (
    None
):
    item_id = _uid("item-pg")
    now = datetime.now(UTC)

    async with async_session_scope() as session:
        repo = SQLAlchemyAssessmentRepository(session)

        # 1. Staff-graded submission remains in pool as last-resort fallback (sorted AFTER ungraded and peer-published)
        staff_sub_id = _uid("sub-staff")
        await repo.save_peer_submission(
            PeerAssignmentSubmission(
                id=staff_sub_id,
                user_id=_uid("stu-staff"),
                item_id=item_id,
                submission_url="https://example.com/staff",
                text_content="Staff done",
                created_at=(now - timedelta(hours=10)).isoformat(),
                final_score=90.0,
                graded_by_staff=True,
                status="PUBLISHED",
            )
        )

        # 2. Peer-published submission (older) vs unpublished submission (newer) -> unpublished -> peer published -> staff graded!
        pub_sub_id = _uid("sub-pub")
        unpub_sub_id = _uid("sub-unpub")
        reviewer_id = _uid("rev-pg")

        await repo.save_peer_submission(
            PeerAssignmentSubmission(
                id=pub_sub_id,
                user_id=_uid("stu-pub"),
                item_id=item_id,
                submission_url="https://example.com/pub",
                text_content="Already peer published",
                created_at=(now - timedelta(hours=8)).isoformat(),
                final_score=85.0,
                graded_by_staff=False,
                status="PUBLISHED",
            )
        )
        await repo.save_peer_submission(
            PeerAssignmentSubmission(
                id=unpub_sub_id,
                user_id=_uid("stu-unpub"),
                item_id=item_id,
                submission_url="https://example.com/unpub",
                text_content="Needs review",
                created_at=(now - timedelta(hours=2)).isoformat(),
                graded_by_staff=False,
                status="SUBMITTED",
            )
        )

        pool_count = await repo.count_available_pool_submissions(item_id, reviewer_id)
        assert pool_count == 3

        eligible = await repo.get_eligible_peer_submissions_to_review(
            item_id, reviewer_id, limit=5
        )
        assert [s.id for s in eligible] == [unpub_sub_id, pub_sub_id, staff_sub_id]

        # 3. Claim lock once -> succeeds; second claim with allow_extend_own=False -> rejected!
        claimed1 = await repo.claim_submission_lock(
            unpub_sub_id, reviewer_id, timeout_minutes=30, allow_extend_own=False
        )
        assert claimed1 is True

        claimed2 = await repo.claim_submission_lock(
            unpub_sub_id, reviewer_id, timeout_minutes=30, allow_extend_own=False
        )
        assert claimed2 is False

        # 4. Active assignment preserves original assigned_at & expires_at (no infinite renewal)
        orig_assigned = (now - timedelta(minutes=10)).isoformat()
        orig_expires = (now + timedelta(minutes=20)).isoformat()
        a1 = await repo.create_or_get_peer_review_assignment(
            submission_id=unpub_sub_id,
            reviewer_user_id=reviewer_id,
            item_id=item_id,
            assigned_at=orig_assigned,
            expires_at=orig_expires,
            submission_attempt_number=1,
        )
        assert a1.status == PEER_ASSIGNMENT_STATUS_ASSIGNED
        a2 = await repo.create_or_get_peer_review_assignment(
            submission_id=unpub_sub_id,
            reviewer_user_id=reviewer_id,
            item_id=item_id,
            assigned_at=now.isoformat(),
            expires_at=(now + timedelta(minutes=30)).isoformat(),
            submission_attempt_number=1,
        )
        assert a2.id == a1.id
        assert a2.assigned_at == orig_assigned
        assert datetime.fromisoformat(a2.expires_at) == datetime.fromisoformat(
            orig_expires
        )


@pytest.mark.asyncio
async def test_pg_peer_review_report_coexists_with_grade_appeal_and_resolves() -> None:
    item_id = _uid("item-rep")
    sub_id = _uid("sub-rep")
    author_id = _uid("stu-auth")
    rev1_id = _uid("rev-one")
    rev2_id = _uid("rev-two")
    now = datetime.now(UTC)

    async with async_session_scope() as session:
        repo = SQLAlchemyAssessmentRepository(session)
        await repo.save_peer_submission(
            PeerAssignmentSubmission(
                id=sub_id,
                user_id=author_id,
                item_id=item_id,
                submission_url="https://example.com/sub",
                text_content="Essay",
                created_at=now.isoformat(),
                final_score=65.0,
                status="PUBLISHED",
                published_at=now.isoformat(),
            )
        )
        pr1 = PeerReview(
            id=f"rev-{uuid.uuid4().hex}",
            submission_id=sub_id,
            reviewer_user_id=rev1_id,
            item_id=item_id,
            rubric_criteria=[RubricCriteria("c1", "Content", 10.0, 5.0)],
            total_score=50.0,
            created_at=now.isoformat(),
            submission_attempt_number=1,
        )
        pr2 = PeerReview(
            id=f"rev-{uuid.uuid4().hex}",
            submission_id=sub_id,
            reviewer_user_id=rev2_id,
            item_id=item_id,
            rubric_criteria=[RubricCriteria("c1", "Content", 10.0, 4.0)],
            total_score=40.0,
            created_at=now.isoformat(),
            submission_attempt_number=1,
        )
        await repo.save_peer_review(pr1)
        await repo.save_peer_review(pr2)

        # Save GradeAppeal AND two PeerReviewReports on the exact same submission -> zero UniqueConstraint collision!
        appeal = GradeAppeal(
            id=_uid("app"),
            user_id=author_id,
            submission_id=sub_id,
            appeal_reason="Unfair total score",
            status="PENDING",
            created_at=now.isoformat(),
        )
        await repo.save_grade_appeal(appeal)
        appeal.approve(reviewer_id=_uid("inst"), final_score=91.5)
        appeal.status = "RESOLVED"
        appeal.rejection_reason = "Verified and adjusted by instructor"
        await repo.save_grade_appeal(appeal)
        loaded_appeal = await repo.get_grade_appeal(sub_id)
        assert loaded_appeal is not None
        assert loaded_appeal.status == "RESOLVED"
        assert loaded_appeal.reviewer_id == appeal.reviewer_id
        assert loaded_appeal.final_score == 91.5
        assert loaded_appeal.rejection_reason == "Verified and adjusted by instructor"
        await repo.save_peer_review_report(
            PeerReviewReport(
                id=_uid("rep1"),
                peer_review_id=pr1.id,
                submission_id=sub_id,
                reporter_user_id=author_id,
                reason="Spam 1",
                status=REPORT_STATUS_PENDING_STAFF_REVIEW,
                created_at=now.isoformat(),
            )
        )
        await repo.save_peer_review_report(
            PeerReviewReport(
                id=_uid("rep2"),
                peer_review_id=pr2.id,
                submission_id=sub_id,
                reporter_user_id=author_id,
                reason="Spam 2",
                status=REPORT_STATUS_PENDING_STAFF_REVIEW,
                created_at=now.isoformat(),
            )
        )

        fetched_pr1 = await repo.get_peer_review_by_id(pr1.id)
        assert fetched_pr1 is not None
        assert fetched_pr1.submission_id == sub_id

        pending = await repo.get_pending_peer_review_reports_for_submission(sub_id)
        assert len(pending) == 2

        await repo.resolve_pending_peer_review_reports_for_submission(
            sub_id, reviewer_id=_uid("staff"), resolution_notes="Reviewed"
        )
        assert await repo.get_pending_peer_review_reports_for_submission(sub_id) == []
        rep1_after = await repo.get_peer_review_report_by_user_and_review(
            author_id, pr1.id
        )
        assert rep1_after is not None
        assert rep1_after.status == REPORT_STATUS_RESOLVED
