import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from src.modules.assessment.application.base_usecase import BaseAssessmentUseCase
from src.modules.assessment.domain.constants import (
    OUTLIER_SCORE_DELTA_THRESHOLD,
    PEER_REVIEW_COLD_START_HOURS,
    REQUIRED_PEER_REVIEWS_COUNT,
)
from src.modules.assessment.domain.entities import (
    GradeAppeal,
    PeerAssignmentSubmission,
    PeerReview,
    RubricCriteria,
)
from src.shared.access_policy import require_paid_access
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope

logger = logging.getLogger(__name__)


class PeerReviewUseCase(BaseAssessmentUseCase):
    """Application Use Case for Peer Review assignment submissions, grading, staff regrade, and reports."""

    @require_paid_access()
    async def submit_peer_assignment(
        self, user_id: str, item_id: str, submission_url: str, text_content: str
    ) -> tuple[str, str]:
        sub_id = f"peer-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(UTC).isoformat()
        submission = PeerAssignmentSubmission(
            id=sub_id,
            user_id=user_id,
            item_id=item_id,
            submission_url=submission_url,
            text_content=text_content,
            created_at=now_iso,
        )
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            await repo.save_peer_submission(submission)

        logger.info("User %s submitted peer assignment for item %s", user_id, item_id)
        return (
            sub_id,
            f"Assignment submitted successfully. Please complete {REQUIRED_PEER_REVIEWS_COUNT} peer reviews to view your score.",
        )

    async def get_peer_reviews_to_grade(
        self, user_id: str, item_id: str
    ) -> list[dict[str, Any]]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            submissions = await repo.get_peer_submissions_for_item(
                item_id, exclude_user_id=user_id
            )

        selected = submissions[:REQUIRED_PEER_REVIEWS_COUNT]
        result: list[dict[str, Any]] = []

        default_rubric = [
            RubricCriteria(
                criteria_id="c1", title="Code Quality & Structure", max_score=10.0
            ),
            RubricCriteria(
                criteria_id="c2", title="Documentation & Comments", max_score=10.0
            ),
            RubricCriteria(criteria_id="c3", title="Test Coverage", max_score=10.0),
        ]

        for s in selected:
            review_id = f"rev-{s.id[:6]}"
            result.append(
                {
                    "review_id": review_id,
                    "submission_url": s.submission_url,
                    "text_content": s.text_content,
                    "rubric_criteria": default_rubric,
                }
            )

        return result

    async def submit_peer_review_grade(
        self,
        review_id: str,
        reviewer_user_id: str,
        graded_criteria: list[RubricCriteria],
        item_id: str | None = None,
    ) -> tuple[bool, str]:
        total_given = sum(c.score_given for c in graded_criteria)
        max_possible = sum(c.max_score for c in graded_criteria) or 1.0
        score_percent = round((total_given / max_possible) * 100.0, 2)

        submission_id = (
            review_id.replace("rev-", "") if review_id.startswith("rev-") else review_id
        )

        async with async_session_scope() as session:
            repo = await self._get_repo(session)

            resolved_item_id = item_id
            if not resolved_item_id:
                sub = await repo.get_peer_submission(submission_id)
                if not sub:
                    raise ValueError(f"Bài nộp {submission_id} không tồn tại.")
                resolved_item_id = sub.item_id

            existing_reviews = await repo.get_peer_reviews_for_submission(submission_id)
            is_outlier = False
            if existing_reviews:
                prev_scores = [r.total_score for r in existing_reviews]
                all_scores = prev_scores + [score_percent]
                max_delta = max(all_scores) - min(all_scores)
                if max_delta > OUTLIER_SCORE_DELTA_THRESHOLD:
                    is_outlier = True

            now_iso = datetime.now(UTC).isoformat()
            review = PeerReview(
                id=review_id,
                submission_id=submission_id,
                reviewer_user_id=reviewer_user_id,
                item_id=resolved_item_id,
                rubric_criteria=graded_criteria,
                total_score=score_percent,
                is_outlier=is_outlier,
                created_at=now_iso,
            )
            await repo.save_peer_review(review)
            logger.info(
                "User %s submitted peer review %s for submission %s with score %s",
                reviewer_user_id,
                review_id,
                submission_id,
                score_percent,
            )

            # Update final_score on PeerAssignmentSubmission if not graded by staff
            sub = await repo.get_peer_submission(submission_id)
            if sub and not sub.graded_by_staff:
                all_revs = await repo.get_peer_reviews_for_submission(submission_id)
                if len(all_revs) >= REQUIRED_PEER_REVIEWS_COUNT:
                    avg_score = round(
                        sum(r.total_score for r in all_revs) / len(all_revs), 2
                    )
                    sub.assign_grade(avg_score, is_staff=False)
                    await repo.save_peer_submission(sub)

        msg = "Peer review graded successfully."
        if is_outlier:
            msg += f" (Outlier Flagged: Score variation exceeds {int(OUTLIER_SCORE_DELTA_THRESHOLD)}%, TA notified)."
        return True, msg

    async def regrade_peer_submission_by_staff(
        self,
        submission_id: str,
        staff_user_id: str,
        ta_score: float,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        self._verify_staff(current_user)
        """TA / Staff Regrade Override (BR_PEER_002, BR_PEER_003).
        Overriding final_score 100% with TA score and resolving Grade Appeal if present.
        """
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            sub = await repo.get_peer_submission(submission_id)
            if not sub:
                return False, "Không tìm thấy bài nộp dự án"

            sub.assign_grade(ta_score, is_staff=True)
            await repo.save_peer_submission(sub)

            appeal = await repo.get_grade_appeal(submission_id)
            if appeal:
                appeal.approve(reviewer_id=staff_user_id, final_score=ta_score)
                appeal.status = "RESOLVED"
                await repo.save_grade_appeal(appeal)

            return (
                True,
                f"Trợ giảng/Giảng viên đã chấm lại bài nộp thành công với điểm số {sub.final_score}% (TA Override).",
            )

    async def list_peer_submissions_needing_staff_regrade(
        self, item_id: str
    ) -> list[dict[str, Any]]:
        """Returns list of peer assignment submissions older than 48 hours (2 days) with fewer than 3 reviews and not yet graded by staff (BR_PEER_004 & BR_PEER_006)."""
        now = datetime.now(UTC)
        cold_start_threshold = now - timedelta(hours=PEER_REVIEW_COLD_START_HOURS)

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            submissions = await repo.get_peer_submissions_for_item(item_id)
            regrade_list = []
            for s in submissions:
                if s.graded_by_staff:
                    continue
                try:
                    sub_dt = datetime.fromisoformat(s.created_at)
                except (ValueError, TypeError):
                    sub_dt = now

                reviews = await repo.get_peer_reviews_for_submission(s.id)
                if (
                    len(reviews) < REQUIRED_PEER_REVIEWS_COUNT
                    and sub_dt <= cold_start_threshold
                ):
                    regrade_list.append(
                        {
                            "submission_id": s.id,
                            "user_id": s.user_id,
                            "item_id": s.item_id,
                            "submission_url": s.submission_url,
                            "text_content": s.text_content,
                            "review_count": len(reviews),
                            "created_at": s.created_at,
                            "needs_staff_regrade": True,
                        }
                    )
            return regrade_list

    async def report_peer_review(
        self, user_id: str, review_id: str, report_reason: str
    ) -> tuple[bool, str]:
        """Reports a malicious or spam peer review (BR_PEER_005)."""
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            submission_id = (
                review_id.replace("rev-", "")
                if review_id.startswith("rev-")
                else review_id
            )
            appeal_id = f"report-{uuid.uuid4().hex[:8]}"
            now_iso = datetime.now(UTC).isoformat()
            appeal = GradeAppeal(
                id=appeal_id,
                user_id=user_id,
                submission_id=submission_id,
                appeal_reason=f"[REPORT_REVIEW:{review_id}] {report_reason}",
                status="PENDING_STAFF_REVIEW",
                created_at=now_iso,
            )
            await repo.save_grade_appeal(appeal)
            return (
                True,
                "Đã gửi báo cáo lượt chấm chéo bất thường đến Trợ giảng (TA Review Queue). Bài nộp chuyển sang trạng thái PENDING_STAFF_REVIEW.",
            )
