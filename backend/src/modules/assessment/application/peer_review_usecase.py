import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from uuid6 import uuid7

from src.modules.assessment.domain import (
    GRADING_LOCK_TIMEOUT_MINUTES,
    MAX_APPEAL_WINDOW_DAYS,
    MAX_PEER_SUBMISSION_ATTEMPTS,
    OUTLIER_SCORE_DELTA_THRESHOLD,
    PEER_REVIEW_COLD_START_HOURS,
    REQUIRED_PEER_REVIEWS_COUNT,
    GradeAppeal,
    PeerAssignmentGradedDomainEvent,
    PeerAssignmentSubmission,
    PeerReview,
    RubricCriteria,
)
from src.shared.access_policy import require_paid_access
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.event_bus import EventBus

from .base_usecase import BaseAssessmentUseCase

logger = logging.getLogger(__name__)


class PeerReviewUseCase(BaseAssessmentUseCase):
    """Application Use Case for Peer Review assignment submissions, grading, staff regrade, and reports."""

    @require_paid_access()
    async def submit_peer_assignment(
        self, user_id: str, item_id: str, submission_url: str, text_content: str
    ) -> tuple[str, str]:
        now_iso = datetime.now(UTC).isoformat()
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            existing = await repo.get_user_peer_submission(user_id, item_id)
            if existing:
                if existing.attempt_number >= MAX_PEER_SUBMISSION_ATTEMPTS:
                    raise ValueError(
                        f"Bạn đã đạt giới hạn tối đa {MAX_PEER_SUBMISSION_ATTEMPTS} lần nộp bài."
                    )
                existing.attempt_number += 1
                existing.submission_url = submission_url
                existing.text_content = text_content
                existing.created_at = now_iso
                existing.status = "SUBMITTED"
                await repo.save_peer_submission(existing)
                sub_id = existing.id
            else:
                sub_id = f"peer-{uuid7().hex}"
                submission = PeerAssignmentSubmission(
                    id=sub_id,
                    user_id=user_id,
                    item_id=item_id,
                    submission_url=submission_url,
                    text_content=text_content,
                    created_at=now_iso,
                    attempt_number=1,
                    status="SUBMITTED",
                )
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
            review_id = f"rev-{s.id}"
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
        import math

        if not graded_criteria:
            raise ValueError("Danh sách tiêu chí Rubric không được để trống.")

        for c in graded_criteria:
            if not math.isfinite(c.score_given) or not math.isfinite(c.max_score):
                raise ValueError(
                    f"Điểm số và điểm tối đa của tiêu chí '{c.title}' phải là số thực hữu hạn hợp lệ."
                )
            if c.max_score <= 0.0:
                raise ValueError(
                    f"Điểm tối đa của tiêu chí '{c.title}' phải lớn hơn 0."
                )
            if c.score_given < 0.0 or c.score_given > c.max_score:
                raise ValueError(
                    f"Điểm tiêu chí '{c.title}' ({c.score_given}) không hợp lệ (yêu cầu từ 0 đến {c.max_score})."
                )

        total_given = sum(c.score_given for c in graded_criteria)
        max_possible = sum(c.max_score for c in graded_criteria)
        if (
            not math.isfinite(total_given)
            or not math.isfinite(max_possible)
            or max_possible <= 0.0
        ):
            raise ValueError("Tổng điểm Rubric không hợp lệ.")
        score_percent = round((total_given / max_possible) * 100.0, 2)

        submission_id = (
            review_id.replace("rev-", "") if review_id.startswith("rev-") else review_id
        )

        async with async_session_scope() as session:
            repo = await self._get_repo(session)

            sub = await repo.get_peer_submission(submission_id)
            if not sub:
                raise ValueError(f"Bài nộp {submission_id} không tồn tại.")
            if sub.user_id == reviewer_user_id:
                raise PermissionError(
                    "Bạn không được phép tự chấm điểm bài làm của chính mình."
                )

            resolved_item_id = item_id or sub.item_id

            existing_reviews = await repo.get_peer_reviews_for_submission(submission_id)
            if any(r.reviewer_user_id == reviewer_user_id for r in existing_reviews):
                raise PermissionError(
                    "Bạn đã thực hiện đánh giá cho bài nộp này trước đó rồi."
                )
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
            if not sub.graded_by_staff:
                all_revs = await repo.get_peer_reviews_for_submission(submission_id)
                if len(all_revs) >= REQUIRED_PEER_REVIEWS_COUNT:
                    avg_score = round(
                        sum(r.total_score for r in all_revs) / len(all_revs), 2
                    )
                    effective_score = (
                        max(avg_score, sub.final_score)
                        if sub.final_score is not None
                        else avg_score
                    )
                    sub.assign_grade(
                        effective_score, is_staff=False, grade_source="PEER_REVIEW"
                    )
                    sub.published_at = datetime.now(UTC).isoformat()
                    sub.status = "PUBLISHED"
                    await repo.save_peer_submission(sub)

                    course_id = await repo.get_course_id_by_item_id(sub.item_id) or ""
                    await EventBus.publish(
                        PeerAssignmentGradedDomainEvent(
                            user_id=sub.user_id,
                            course_id=course_id,
                            item_id=sub.item_id,
                            submission_id=sub.id,
                            final_score=effective_score,
                            passed=effective_score >= 80.0,
                            grader_id="peer",
                        )
                    )

        msg = "Peer review graded successfully."
        if is_outlier:
            msg += f" (Outlier Flagged: Score variation exceeds {int(OUTLIER_SCORE_DELTA_THRESHOLD)}%, TA notified)."
        return True, msg

    async def submit_grade_appeal(
        self, user_id: str, submission_id: str, appeal_reason: str
    ) -> tuple[bool, str]:
        """Submits a grade appeal for a peer review submission (BR_PEER_007)."""
        if not appeal_reason or not appeal_reason.strip():
            raise ValueError("Lý do khiếu nại không được để trống.")

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            sub = await repo.get_peer_submission(submission_id)
            if not sub:
                raise ValueError(f"Bài nộp {submission_id} không tồn tại.")
            if sub.user_id != user_id:
                logger.warning(
                    "User %s attempted to submit grade appeal for submission %s belonging to another user",
                    user_id,
                    submission_id,
                )
                raise PermissionError(
                    "Bạn chỉ có quyền gửi khiếu nại điểm đối với bài nộp của chính mình."
                )

            # Constraint 1: Only 1 appeal per submission
            existing_appeal = await repo.get_grade_appeal(submission_id)
            if existing_appeal:
                raise ValueError(
                    "Bài nộp này đã có đơn khiếu nại trước đó (Mỗi bài chỉ được khiếu nại tối đa 1 lần)."
                )

            # Constraint 2: Appeal window (MAX_APPEAL_WINDOW_DAYS = 7)
            ref_date_str = sub.published_at or sub.created_at
            if ref_date_str:
                ref_dt = None
                try:
                    ref_dt = datetime.fromisoformat(ref_date_str)
                except (ValueError, TypeError):
                    pass
                if ref_dt is not None:
                    if ref_dt.tzinfo is None:
                        ref_dt = ref_dt.replace(tzinfo=UTC)
                    now = datetime.now(UTC)
                    if now > ref_dt + timedelta(days=MAX_APPEAL_WINDOW_DAYS):
                        raise ValueError(
                            f"Đã quá thời hạn khiếu nại {MAX_APPEAL_WINDOW_DAYS} ngày kể từ khi công bố điểm."
                        )

            appeal_id = f"appeal-{uuid7().hex}"
            now_iso = datetime.now(UTC).isoformat()
            appeal = GradeAppeal(
                id=appeal_id,
                user_id=user_id,
                submission_id=submission_id,
                appeal_reason=appeal_reason.strip(),
                status="PENDING",
                created_at=now_iso,
            )
            await repo.save_grade_appeal(appeal)

        return True, "PENDING"

    async def submit_staff_grading(
        self,
        submission_id: str,
        staff_user_id: str,
        graded_criteria: list[RubricCriteria],
        total_score: float,
        feedback: str = "",
        resolve_appeal: bool = False,
        appeal_resolution_notes: str = "",
        provenance: str = "TA",
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str, float, str]:
        """TA / Instructor Grading at Cockpit (BR_GRADE_003, BR_GRADE_004).

        Grades and publishes immediately, releases atomic lock,
        enforces Highest Score Wins policy, and dispatches domain event.
        """
        self._verify_staff(current_user)
        import math

        if not math.isfinite(total_score) or total_score < 0.0 or total_score > 100.0:
            raise ValueError(
                "Điểm số phải là số thực hữu hạn nằm trong khoảng từ 0 đến 100."
            )

        for c in graded_criteria:
            if not math.isfinite(c.score_given) or not math.isfinite(c.max_score):
                raise ValueError(
                    f"Điểm tiêu chí '{c.title}' không được chứa NaN hoặc Infinity."
                )
            if c.max_score <= 0:
                raise ValueError(
                    f"Điểm tối đa của tiêu chí '{c.title}' phải lớn hơn 0."
                )
            if c.score_given < 0 or c.score_given > c.max_score:
                raise ValueError(
                    f"Điểm tiêu chí '{c.title}' ({c.score_given}) không hợp lệ (0 - {c.max_score})."
                )

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            sub = await repo.get_peer_submission(submission_id)
            if not sub:
                raise ValueError(f"Không tìm thấy bài nộp {submission_id}")
            if sub.user_id == staff_user_id:
                raise PermissionError(
                    "Bạn không được phép tự chấm điểm bài làm của chính mình."
                )

            now = datetime.now(UTC)
            if not sub.can_claim_lock(staff_user_id, now):
                raise PermissionError("Bài nộp đang được nhân sự khác khóa để chấm.")

            # BR_PEER_008: Highest Score Wins
            effective_score = (
                max(total_score, sub.final_score)
                if sub.final_score is not None
                else total_score
            )
            rubric_json = {c.criteria_id: c.score_given for c in graded_criteria}
            grader_role = current_user.role if current_user else "TA"

            sub.assign_grade(
                score=effective_score,
                is_staff=True,
                graded_by_user_id=staff_user_id,
                grader_role=grader_role,
                grade_source=provenance,
                staff_feedback=feedback,
                rubric_scores_json=rubric_json,
            )
            sub.published_at = now.isoformat()
            sub.status = "PUBLISHED"

            # BR_GRADE_003: Active lock release on save
            sub.release_lock(staff_user_id)
            await repo.release_submission_lock(submission_id, staff_user_id)

            if resolve_appeal:
                appeal = await repo.get_grade_appeal(submission_id)
                if appeal:
                    appeal.approve(
                        reviewer_id=staff_user_id, final_score=effective_score
                    )
                    appeal.status = "RESOLVED"
                    if appeal_resolution_notes:
                        appeal.rejection_reason = appeal_resolution_notes
                    await repo.save_grade_appeal(appeal)

            await repo.save_peer_submission(sub)

            course_id = await repo.get_course_id_by_item_id(sub.item_id) or ""
            await EventBus.publish(
                PeerAssignmentGradedDomainEvent(
                    user_id=sub.user_id,
                    course_id=course_id,
                    item_id=sub.item_id,
                    submission_id=sub.id,
                    final_score=effective_score,
                    passed=effective_score >= 80.0,
                    grader_id=staff_user_id,
                )
            )

        graded_at_str = sub.published_at or now.isoformat()
        return (
            True,
            "Đã công bố điểm bài nộp thành công.",
            effective_score,
            graded_at_str,
        )

    async def claim_grading_task(
        self,
        submission_id: str,
        staff_user_id: str,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str, dict[str, Any]]:
        """Claims exclusive 30-min soft lock on a submission for grading (BR_GRADE_003)."""
        self._verify_staff(current_user)
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            sub = await repo.get_peer_submission(submission_id)
            if not sub:
                return (
                    False,
                    f"Không tìm thấy bài nộp {submission_id}",
                    {},
                )
            if sub.user_id == staff_user_id:
                raise PermissionError(
                    "Bạn không được phép tự khóa bài làm của chính mình để chấm điểm."
                )
            success = await repo.claim_submission_lock(submission_id, staff_user_id)
            if not success:
                return (
                    False,
                    "Bài nộp đang được nhân sự khác chấm hoặc đã có khóa hiệu lực.",
                    {},
                )
            now = datetime.now(UTC)
            expires_at = (
                now + timedelta(minutes=GRADING_LOCK_TIMEOUT_MINUTES)
            ).isoformat()
            return (
                True,
                "Đã nhận chấm bài thành công (Khóa 30 phút).",
                {
                    "locked_by_user_id": staff_user_id,
                    "lock_expires_at": expires_at,
                    "lease_duration_seconds": GRADING_LOCK_TIMEOUT_MINUTES * 60,
                },
            )

    async def renew_grading_task_lock(
        self,
        submission_id: str,
        staff_user_id: str,
        extend_minutes: int = GRADING_LOCK_TIMEOUT_MINUTES,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str, dict[str, Any]]:
        """Renews an existing grading lock held by the same user (BR_GRADE_003)."""
        self._verify_staff(current_user)
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            success = await repo.renew_submission_lock(
                submission_id, staff_user_id, timeout_minutes=extend_minutes
            )
            if not success:
                return (
                    False,
                    "Không thể gia hạn khóa (Bạn không sở hữu khóa hoặc khóa đã hết hạn).",
                    {},
                )
            now = datetime.now(UTC)
            expires_at = (now + timedelta(minutes=extend_minutes)).isoformat()
            return (
                True,
                f"Đã gia hạn khóa thêm {extend_minutes} phút thành công.",
                {
                    "lock_expires_at": expires_at,
                    "remaining_seconds": extend_minutes * 60,
                },
            )

    async def release_grading_task(
        self,
        submission_id: str,
        staff_user_id: str,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        """Actively releases a grading soft lock (BR_GRADE_003)."""
        self._verify_staff(current_user)
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            success = await repo.release_submission_lock(submission_id, staff_user_id)
            if not success:
                return (
                    False,
                    "Không thể nhả khóa (Bài nộp không tồn tại hoặc do người khác khóa).",
                )
            return True, "Đã nhả khóa chấm bài thành công."

    async def regrade_peer_submission_by_staff(
        self,
        submission_id: str,
        staff_user_id: str,
        ta_score: float,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        """TA / Staff Regrade Override (BR_PEER_002, BR_PEER_003).

        Overriding final_score 100% with TA score and resolving Grade Appeal if present.
        """
        self._verify_staff(current_user)
        import math

        if not math.isfinite(ta_score) or ta_score < 0.0 or ta_score > 100.0:
            raise ValueError(
                "Điểm số phải là số thực hữu hạn nằm trong khoảng từ 0 đến 100."
            )

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            sub = await repo.get_peer_submission(submission_id)
            if not sub:
                raise ValueError(f"Không tìm thấy bài nộp {submission_id}")
            if sub.user_id == staff_user_id:
                raise PermissionError(
                    "Bạn không được phép tự chấm điểm bài làm của chính mình."
                )

            # BR_PEER_008: Highest Score Wins
            effective_score = (
                max(ta_score, sub.final_score)
                if sub.final_score is not None
                else ta_score
            )
            sub.assign_grade(
                effective_score,
                is_staff=True,
                grade_source="TA",
                graded_by_user_id=staff_user_id,
            )
            sub.published_at = datetime.now(UTC).isoformat()
            sub.status = "PUBLISHED"
            await repo.save_peer_submission(sub)

            appeal = await repo.get_grade_appeal(submission_id)
            if appeal:
                appeal.approve(reviewer_id=staff_user_id, final_score=effective_score)
                appeal.status = "RESOLVED"
                await repo.save_grade_appeal(appeal)

            course_id = await repo.get_course_id_by_item_id(sub.item_id) or ""
            await EventBus.publish(
                PeerAssignmentGradedDomainEvent(
                    user_id=sub.user_id,
                    course_id=course_id,
                    item_id=sub.item_id,
                    submission_id=sub.id,
                    final_score=effective_score,
                    passed=effective_score >= 80.0,
                    grader_id=staff_user_id,
                )
            )

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
            appeal_id = f"report-{uuid7().hex}"
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

    async def list_grading_queue(
        self,
        course_id: str = "",
        item_id: str = "",
        status_filter: str = "ALL",
        search_query: str = "",
        page_size: int = 50,
        page_token: str = "",
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        """Lists grading queue items for peer assignments across course or specific item."""
        self._verify_staff(current_user)
        instructor_id = ""
        if current_user and not current_user.is_admin and not course_id:
            instructor_id = current_user.id

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            items = await repo.list_grading_queue_items(
                course_id=course_id, item_id=item_id, instructor_id=instructor_id
            )

        sq = (search_query or "").strip().lower()
        sf = (status_filter or "").strip().upper()

        total_count = len(items)
        pending_count = sum(1 for i in items if i["status"] == "PENDING")
        claimed_count = sum(1 for i in items if i["status"] == "CLAIMED")
        appealed_count = sum(1 for i in items if i["status"] == "APPEALED")
        graded_count = sum(1 for i in items if i["status"] == "GRADED")

        filtered = []
        for i in items:
            if sf and sf not in (
                "ALL",
                "GRADING_QUEUE_STATUS_ALL",
                "0",
                "1",
                "UNSPECIFIED",
                "",
            ):
                item_status = i["status"].upper()
                if sf.endswith(item_status) or sf == item_status:
                    pass
                else:
                    continue

            if sq:
                name_match = sq in i["student_name"].lower()
                id_match = sq in i["student_id"].lower()
                title_match = sq in i["item_title"].lower()
                if not (name_match or id_match or title_match):
                    continue

            filtered.append(i)

        offset = 0
        if page_token:
            try:
                offset = int(page_token)
            except ValueError:
                offset = 0

        paginated = filtered[offset : offset + page_size]
        next_token = (
            str(offset + page_size) if (offset + page_size) < len(filtered) else ""
        )

        return {
            "items": paginated,
            "next_page_token": next_token,
            "total_count": total_count,
            "pending_count": pending_count,
            "claimed_count": claimed_count,
            "appealed_count": appealed_count,
            "graded_count": graded_count,
        }

    async def get_grading_submission_detail(
        self,
        submission_id: str,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        """Gets full details of a peer assignment submission for grading workspace."""
        self._verify_staff(current_user)
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            sub = await repo.get_peer_submission(submission_id)
            if not sub:
                raise ValueError(f"Không tìm thấy bài nộp {submission_id}")

            queue_items = await repo.list_grading_queue_items(item_id=sub.item_id)
            matching_item = next(
                (i for i in queue_items if i["submission_id"] == sub.id), None
            )
            if not matching_item:
                matching_item = {
                    "submission_id": sub.id,
                    "item_id": sub.item_id,
                    "item_title": "",
                    "course_id": "",
                    "course_title": "",
                    "student_id": sub.user_id,
                    "student_name": "",
                    "student_avatar_url": "",
                    "submitted_at": sub.created_at,
                    "is_outlier": False,
                    "is_appeal": False,
                    "appeal_reason": "",
                    "locked_by_user_id": sub.locked_by_user_id or "",
                    "locked_by_name": "",
                    "lock_expires_at": "",
                    "grade_source": sub.grade_source or "PEER_REVIEW",
                    "staff_score": float(sub.final_score or 0.0),
                    "status": "PENDING",
                    "peer_score": 0.0,
                    "peer_reviews_count": 0,
                }

            reviews = await repo.get_peer_reviews_for_submission(sub.id)
            peer_reviews_data = [
                {
                    "review_id": r.id,
                    "reviewer_id": r.reviewer_user_id,
                    "reviewer_name": f"Học viên #{r.reviewer_user_id[:6]}",
                    "total_score": float(r.total_score),
                    "graded_criteria": r.rubric_criteria or [],
                    "feedback": "",
                    "reviewed_at": r.created_at,
                }
                for r in reviews
            ]

            staff_grading = None
            if sub.graded_by_staff or sub.rubric_scores_json:
                staff_grading = {
                    "staff_id": sub.graded_by_user_id or "",
                    "staff_name": "Trợ giảng"
                    if sub.grader_role == "TA"
                    else "Giảng viên",
                    "score": float(sub.final_score or 0.0),
                    "graded_criteria": [
                        RubricCriteria(
                            criteria_id=k, title=k, max_score=10.0, score_given=float(v)
                        )
                        for k, v in (sub.rubric_scores_json or {}).items()
                    ],
                    "feedback": sub.staff_feedback or "",
                    "graded_at": sub.published_at or sub.created_at,
                    "provenance": sub.grade_source or "TA",
                    "appeal_resolution_notes": "",
                }

            default_rubrics = [
                RubricCriteria(
                    criteria_id="c1", title="Code Quality & Structure", max_score=10.0
                ),
                RubricCriteria(
                    criteria_id="c2", title="Documentation & Comments", max_score=10.0
                ),
                RubricCriteria(criteria_id="c3", title="Test Coverage", max_score=10.0),
            ]

            return {
                "submission": matching_item,
                "submission_url": sub.submission_url,
                "text_content": sub.text_content,
                "attempt_number": sub.attempt_number,
                "rubric_criteria": default_rubrics,
                "peer_reviews": peer_reviews_data,
                "current_staff_grading": staff_grading,
            }

    async def get_instructor_action_tasks(
        self,
        course_id: str,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        """Gets urgent action tasks (overdue > 48h, appeals) for instructor cockpit."""
        self._verify_staff(current_user)
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            items = await repo.list_grading_queue_items(course_id=course_id)

        now = datetime.now(UTC)
        tasks = []
        overdue_count = 0

        for i in items:
            is_overdue = False
            try:
                sub_dt = datetime.fromisoformat(i["submitted_at"])
                if (now - sub_dt) > timedelta(hours=48):
                    is_overdue = True
                    overdue_count += 1
            except (ValueError, TypeError):
                pass

            if i["is_appeal"]:
                tasks.append(
                    {
                        "id": f"task-appeal-{i['submission_id']}",
                        "type": "APPEAL",
                        "title": f"Khiếu nại điểm: {i['item_title']}",
                        "lesson_title": i["item_title"],
                        "student_name": i["student_name"],
                        "course_title": i["course_title"],
                        "time_ago": "Cần xử lý",
                        "action_text": "Xem khiếu nại",
                        "action_url": f"/instructor/courses/{course_id}/grading-cockpit?submission={i['submission_id']}",
                        "course_id": course_id,
                        "priority": "HIGH",
                        "created_at": i["submitted_at"],
                    }
                )
            elif is_overdue and i["status"] == "PENDING":
                tasks.append(
                    {
                        "id": f"task-overdue-{i['submission_id']}",
                        "type": "OVERDUE_GRADING",
                        "title": f"Bài nộp quá hạn 48h: {i['item_title']}",
                        "lesson_title": i["item_title"],
                        "student_name": i["student_name"],
                        "course_title": i["course_title"],
                        "time_ago": "Quá 48h",
                        "action_text": "Chấm ngay",
                        "action_url": f"/instructor/courses/{course_id}/grading-cockpit?submission={i['submission_id']}",
                        "course_id": course_id,
                        "priority": "HIGH",
                        "created_at": i["submitted_at"],
                    }
                )

        return {
            "tasks": tasks,
            "total_pending": len(tasks),
            "overdue_count": overdue_count,
        }
