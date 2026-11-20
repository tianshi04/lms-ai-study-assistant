import json
import logging
import statistics
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlparse

from uuid6 import uuid7

from src.modules.assessment.domain import (
    DEFAULT_PASSING_THRESHOLD_PERCENT,
    ELIGIBLE_REVIEW_DUTY_STATUSES,
    ESSAY_GRADING_MODE_INSTRUCTOR_ONLY,
    ESSAY_GRADING_MODE_PEER_REVIEW,
    GRADING_LOCK_TIMEOUT_MINUTES,
    MAX_APPEAL_WINDOW_DAYS,
    MAX_PEER_SUBMISSION_ATTEMPTS,
    MIN_PEER_REVIEW_FEEDBACK_LENGTH,
    MIN_PEER_REVIEWS_FOR_OUTLIER_CONSENSUS,
    MIN_PEER_SUBMISSION_TEXT_LENGTH,
    OUTLIER_SCORE_DELTA_THRESHOLD,
    PEER_ASSIGNMENT_STATUS_ASSIGNED,
    PEER_REVIEW_COLD_START_HOURS,
    PEER_SUBMISSION_STATUS_GRADED,
    PEER_SUBMISSION_STATUS_PUBLISHED,
    PENDING_APPEAL_STATUSES,
    REPORT_STATUS_PENDING_STAFF_REVIEW,
    REQUIRED_PEER_REVIEWS_COUNT,
    REVIEW_DUTY_COMPLETED,
    REVIEW_DUTY_NOT_APPLICABLE,
    REVIEW_DUTY_PENDING,
    REVIEW_DUTY_WAITING_POOL,
    REVIEW_DUTY_WAIVED_EMPTY_POOL,
    PeerAssignmentGradedDomainEvent,
    PeerAssignmentSubmission,
    PeerReview,
    PeerReviewReport,
    PeerReviewSubmittedDomainEvent,
    RubricCriteria,
    normalize_grade_provenance,
)
from src.shared.access_policy import require_paid_access
from src.shared.auth import CurrentUser, CurrentUserContext
from src.shared.domain.events import DomainEvent
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.event_bus import EventBus
from src.shared.permissions import CoursePermission, enforce_course_ownership

from .base_usecase import BaseAssessmentUseCase

logger = logging.getLogger(__name__)


def _reconcile_peer_review_outliers(
    existing_reviews: list[PeerReview],
    new_review: PeerReview,
) -> list[PeerReview]:
    """Evaluates outlier flags across all reviews for an attempt using median consensus once >= 3 reviews exist.

    Returns existing reviews whose `is_outlier` status changed and must be re-persisted.
    """
    all_reviews = [*existing_reviews, new_review]
    if len(all_reviews) < 2:
        new_review.is_outlier = False
        return []

    changed: list[PeerReview] = []
    if len(all_reviews) < MIN_PEER_REVIEWS_FOR_OUTLIER_CONSENSUS:
        scores = [r.total_score for r in all_reviews]
        divergent = (max(scores) - min(scores)) > OUTLIER_SCORE_DELTA_THRESHOLD
        new_review.is_outlier = divergent
        for rev in existing_reviews:
            if rev.is_outlier != divergent:
                rev.is_outlier = divergent
                changed.append(rev)
        return changed

    median_score = statistics.median(r.total_score for r in all_reviews)
    new_review.is_outlier = (
        abs(new_review.total_score - median_score) > OUTLIER_SCORE_DELTA_THRESHOLD
    )
    for rev in existing_reviews:
        expected_outlier = (
            abs(rev.total_score - median_score) > OUTLIER_SCORE_DELTA_THRESHOLD
        )
        if rev.is_outlier != expected_outlier:
            rev.is_outlier = expected_outlier
            changed.append(rev)
    return changed


def _is_cold_start_elapsed(
    created_at_iso: str | None, cold_start_hours: int, now: datetime
) -> bool:
    """Returns True only once cold_start_hours have elapsed since submission creation."""
    if not created_at_iso:
        return False
    try:
        created_dt = datetime.fromisoformat(created_at_iso)
        if created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=UTC)
        return (now - created_dt) >= timedelta(hours=cold_start_hours)
    except (ValueError, TypeError):
        return False


def _parse_rubrics(raw_rubrics: Any) -> list[RubricCriteria]:
    """Parses raw rubric criteria from DB JSON (string, dict, or list) into list[RubricCriteria]."""
    if not raw_rubrics:
        return []

    data = raw_rubrics
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    if isinstance(data, dict):
        if "items" in data and isinstance(data["items"], list):
            data = data["items"]
        else:
            items_list = []
            for k, v in data.items():
                if isinstance(v, dict):
                    crit_id = str(v.get("criteria_id") or k)
                    title = str(v.get("title") or v.get("criterion") or k)
                    max_score = float(v.get("max_score", v.get("max_points", 10.0)))
                    description = str(v.get("description") or "")
                    items_list.append(
                        RubricCriteria(
                            criteria_id=crit_id,
                            title=title,
                            max_score=max_score,
                            description=description,
                        )
                    )
                elif isinstance(v, (int, float)):
                    items_list.append(
                        RubricCriteria(
                            criteria_id=str(k), title=str(k), max_score=float(v)
                        )
                    )
            return items_list

    if isinstance(data, list):
        result = []
        for idx, item in enumerate(data):
            if isinstance(item, dict):
                crit_id = str(
                    item.get("criteria_id") or item.get("id") or f"c{idx + 1}"
                )
                title = str(
                    item.get("title") or item.get("criterion") or f"Tiêu chí {idx + 1}"
                )
                max_score = float(
                    item.get("max_score") or item.get("max_points") or 10.0
                )
                description = str(item.get("description") or "")
                result.append(
                    RubricCriteria(
                        criteria_id=crit_id,
                        title=title,
                        max_score=max_score,
                        description=description,
                    )
                )
            elif isinstance(item, RubricCriteria):
                result.append(item)
        return result

    return []


class PeerReviewUseCase(BaseAssessmentUseCase):
    """Application Use Case for Peer Review assignment submissions, grading, staff regrade, and reports."""

    @staticmethod
    def _validate_peer_review_item(
        item_info: dict[str, Any] | None, item_id: str
    ) -> dict[str, Any]:
        """Ensures the target learning item exists and is a PEER_REVIEW assignment when item_type is known."""
        if not item_info:
            raise ValueError(f"Học liệu {item_id} không tồn tại.")
        item_type = str(item_info.get("item_type") or "").upper()
        if item_type and item_type not in ("ITEM_TYPE_PEER_REVIEW", "PEER_REVIEW"):
            raise ValueError("Học liệu này không phải Bài tập tự luận.")
        return item_info

    @require_paid_access()
    async def submit_peer_assignment(
        self,
        user_id: str,
        item_id: str,
        submission_url: str,
        text_content: str,
        current_user: CurrentUser | None = None,
    ) -> tuple[str, str]:
        cleaned_url = (submission_url or "").strip()
        cleaned_text = (text_content or "").strip()
        if not cleaned_url and not cleaned_text:
            raise ValueError(
                "Vui lòng cung cấp liên kết bài làm hoặc nội dung bài tự luận."
            )
        if cleaned_url:
            lower_url = cleaned_url.lower()
            if lower_url.startswith(("javascript:", "data:", "vbscript:")):
                raise ValueError(
                    "Liên kết nộp bài không an toàn hoặc chứa giao thức bị cấm (javascript:/data:)."
                )
            parsed_url = urlparse(cleaned_url)
            if (
                parsed_url.scheme.lower() not in ("http", "https")
                or not parsed_url.netloc
            ):
                raise ValueError(
                    "Liên kết nộp bài phải là URL đầy đủ bắt đầu bằng http:// hoặc https://."
                )
        elif len(cleaned_text) < MIN_PEER_SUBMISSION_TEXT_LENGTH:
            raise ValueError(
                f"Nội dung bài tự luận phải có ít nhất {MIN_PEER_SUBMISSION_TEXT_LENGTH} ký tự khi không đính kèm liên kết."
            )

        now = datetime.now(UTC)
        now_iso = now.isoformat()
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            item_info = self._validate_peer_review_item(
                await repo.get_learning_item_details(item_id), item_id
            )
            await self._verify_learner_item_access(
                session,
                repo,
                user_id,
                item_id,
                require_paid=True,
                require_enrolled=True,
                current_user=current_user,
            )
            essay_mode = str(
                item_info.get("essay_grading_mode") or ESSAY_GRADING_MODE_PEER_REVIEW
            )
            req_reviews = int(
                item_info.get("required_peer_reviews") or REQUIRED_PEER_REVIEWS_COUNT
            )
            item_max_attempts = int(
                item_info.get("essay_max_attempts") or MAX_PEER_SUBMISSION_ATTEMPTS
            )
            initial_duty = (
                REVIEW_DUTY_NOT_APPLICABLE
                if essay_mode == ESSAY_GRADING_MODE_INSTRUCTOR_ONLY
                else REVIEW_DUTY_PENDING
            )

            existing = await repo.get_user_peer_submission(user_id, item_id)
            if existing:
                existing_appeal = await repo.get_grade_appeal(existing.id)
                pending_reports = (
                    await repo.get_pending_peer_review_reports_for_submission(
                        existing.id
                    )
                )
                if (
                    existing_appeal
                    and existing_appeal.status in PENDING_APPEAL_STATUSES
                ) or pending_reports:
                    raise ValueError(
                        "Bài nộp đang có đơn khiếu nại hoặc báo cáo chờ Trợ giảng thẩm định. "
                        "Không thể nộp lại lúc này."
                    )
                existing.prepare_resubmission(
                    submission_url=cleaned_url,
                    text_content=cleaned_text,
                    now=now,
                    essay_mode=essay_mode,
                    max_attempts=item_max_attempts,
                )
                await repo.save_peer_submission(existing)
                sub_id = existing.id
            else:
                sub_id = f"peer-{uuid7().hex}"
                submission = PeerAssignmentSubmission(
                    id=sub_id,
                    user_id=user_id,
                    item_id=item_id,
                    submission_url=cleaned_url,
                    text_content=cleaned_text,
                    created_at=now_iso,
                    attempt_number=1,
                    status="SUBMITTED",
                    review_duty_status=initial_duty,
                )
                await repo.save_peer_submission(submission)

        logger.info("User %s submitted peer assignment for item %s", user_id, item_id)
        if essay_mode == ESSAY_GRADING_MODE_INSTRUCTOR_ONLY:
            msg = "Nộp bài tự luận thành công. Bài làm đã được chuyển cho Giảng viên/Trợ giảng chấm điểm."
        else:
            msg = f"Nộp bài tự luận thành công. Vui lòng chấm điểm {req_reviews} bài cho bạn học để hoàn tất bài tập."
        return (sub_id, msg)

    def _parse_rubric_criteria(self, raw_rubrics: Any) -> list[RubricCriteria]:
        parsed = _parse_rubrics(raw_rubrics)
        if parsed:
            return parsed

        return [
            RubricCriteria(
                criteria_id="c1",
                title="Chất lượng nội dung & Giải pháp",
                max_score=10.0,
                description="Mức độ hoàn thiện, tính chính xác và logic của giải pháp nộp.",
            ),
            RubricCriteria(
                criteria_id="c2",
                title="Bố cục, Trình bày & Minh chứng",
                max_score=10.0,
                description="Cấu trúc rõ ràng, diễn đạt mạch lạc, kèm đầy đủ tài liệu/minh chứng.",
            ),
            RubricCriteria(
                criteria_id="c3",
                title="Tính ứng dụng & Đóng góp",
                max_score=10.0,
                description="Khả năng áp dụng vào thực tiễn hoặc mức độ sáng tạo.",
            ),
        ]

    async def _evaluate_review_duty_for_release(
        self,
        repo: Any,
        sub: PeerAssignmentSubmission,
        essay_mode: str,
        req_reviews: int,
        cold_start_hours: int = PEER_REVIEW_COLD_START_HOURS,
        now: datetime | None = None,
    ) -> bool:
        """Evaluates review duty status on grade publish; returns True if completion event should fire."""
        if essay_mode == ESSAY_GRADING_MODE_INSTRUCTOR_ONLY:
            sub.review_duty_status = REVIEW_DUTY_NOT_APPLICABLE
            return True

        if sub.review_duty_status in (
            REVIEW_DUTY_COMPLETED,
            REVIEW_DUTY_WAIVED_EMPTY_POOL,
        ):
            return True

        current_now = now or datetime.now(UTC)
        completed = await repo.count_user_completed_reviews(sub.item_id, sub.user_id)
        if completed >= req_reviews:
            sub.review_duty_status = REVIEW_DUTY_COMPLETED
            return True

        available = await repo.count_available_pool_submissions(
            sub.item_id, sub.user_id
        )
        cold_elapsed = _is_cold_start_elapsed(
            sub.created_at, cold_start_hours, current_now
        )
        if cold_elapsed:
            target = min(req_reviews, completed + available)
            if completed >= target > 0:
                sub.review_duty_status = REVIEW_DUTY_COMPLETED
                return True
            if available == 0:
                sub.review_duty_status = REVIEW_DUTY_WAIVED_EMPTY_POOL
                sub.review_duty_waived_reason = (
                    f"Không còn bài làm nào khác trong kho bài sau {cold_start_hours} giờ chờ. "
                    "Hệ thống tự động giải thoát điều kiện chấm cho bạn."
                )
                return True

        sub.review_duty_status = (
            REVIEW_DUTY_WAITING_POOL if available == 0 else REVIEW_DUTY_PENDING
        )
        return False

    async def get_peer_reviews_to_grade(
        self,
        user_id: str,
        item_id: str,
        current_user: CurrentUser | None = None,
    ) -> list[dict[str, Any]]:
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            item_info = self._validate_peer_review_item(
                await repo.get_learning_item_details(item_id), item_id
            )
            await self._verify_learner_item_access(
                session,
                repo,
                user_id,
                item_id,
                require_paid=True,
                require_enrolled=True,
                current_user=current_user,
            )
            essay_mode = str(
                item_info.get("essay_grading_mode") or ESSAY_GRADING_MODE_PEER_REVIEW
            )
            if essay_mode == ESSAY_GRADING_MODE_INSTRUCTOR_ONLY:
                return []

            user_sub = await repo.get_user_peer_submission(user_id, item_id)
            if not user_sub:
                raise ValueError(
                    "Bạn cần nộp bài trước khi nhận bài chấm chéo cho bạn học."
                )

            req_reviews = (
                int(
                    item_info.get("required_peer_reviews")
                    or REQUIRED_PEER_REVIEWS_COUNT
                )
                if item_info
                else REQUIRED_PEER_REVIEWS_COUNT
            )
            completed_reviews = await repo.count_user_completed_reviews(
                item_id, user_id
            )
            needed_reviews = max(0, req_reviews - completed_reviews)
            if needed_reviews == 0:
                return []

            rubric_json_str = (
                item_info.get("rubric_criteria_json")
                if item_info
                else await repo.get_item_rubric_criteria_json(item_id)
            )
            rubric_criteria = self._parse_rubric_criteria(rubric_json_str)

            # Query least-reviewed first submissions with buffer to handle concurrent lock contention
            fetch_limit = max(needed_reviews * 3, needed_reviews + 4)
            eligible = await repo.get_eligible_peer_submissions_to_review(
                item_id, user_id, limit=fetch_limit
            )

            result: list[dict[str, Any]] = []
            now = datetime.now(UTC)
            assigned_at_iso = now.isoformat()
            expires_at_iso = (
                now + timedelta(minutes=GRADING_LOCK_TIMEOUT_MINUTES)
            ).isoformat()
            for s in eligible:
                if len(result) >= needed_reviews:
                    break
                is_already_held_by_me = (
                    s.locked_by_user_id == user_id and s.is_lock_active(now)
                )
                if is_already_held_by_me:
                    # Preserve original lock expiration — never allow infinite lock extension on poll
                    held_assigned_at = s.locked_at or assigned_at_iso
                    held_expires_at = s.lock_expires_at or expires_at_iso
                    assignment = await repo.create_or_get_peer_review_assignment(
                        submission_id=s.id,
                        reviewer_user_id=user_id,
                        item_id=item_id,
                        assigned_at=held_assigned_at,
                        expires_at=held_expires_at,
                        submission_attempt_number=s.attempt_number,
                    )
                else:
                    claimed = await repo.claim_submission_lock(
                        s.id,
                        user_id,
                        timeout_minutes=GRADING_LOCK_TIMEOUT_MINUTES,
                        allow_extend_own=False,
                    )
                    if not claimed:
                        continue
                    assignment = await repo.create_or_get_peer_review_assignment(
                        submission_id=s.id,
                        reviewer_user_id=user_id,
                        item_id=item_id,
                        assigned_at=assigned_at_iso,
                        expires_at=expires_at_iso,
                        submission_attempt_number=s.attempt_number,
                    )
                result.append(
                    {
                        "review_id": assignment.id,
                        "submission_url": s.submission_url,
                        "text_content": s.text_content,
                        "rubric_criteria": rubric_criteria,
                    }
                )

            if not result:
                total_available = await repo.count_available_pool_submissions(
                    item_id, user_id
                )
                # Only enter WAITING_POOL when pool is genuinely empty, not when items are temporarily locked
                if (
                    total_available == 0
                    and user_sub.review_duty_status == REVIEW_DUTY_PENDING
                ):
                    user_sub.review_duty_status = REVIEW_DUTY_WAITING_POOL
                    await repo.save_peer_submission(user_sub)

        return result

    async def submit_peer_review_grade(
        self,
        review_id: str,
        reviewer_user_id: str,
        graded_criteria: list[RubricCriteria],
        item_id: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        import math

        if not graded_criteria:
            raise ValueError("Danh sách tiêu chí không được để trống.")
        if not review_id or not review_id.strip():
            raise ValueError("Mã phiên chấm bài không hợp lệ.")

        pending_events: list[DomainEvent] = []
        is_outlier = False

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            now = datetime.now(UTC)

            assignment = await repo.get_peer_review_assignment(
                review_id, reviewer_user_id
            )
            if not assignment:
                raise PermissionError(
                    "Phiên chấm bài không hợp lệ hoặc không được phân bổ cho bạn."
                )
            if assignment.status != PEER_ASSIGNMENT_STATUS_ASSIGNED:
                raise PermissionError(
                    "Phiên chấm bài này đã hoàn tất hoặc không còn hiệu lực."
                )
            if not assignment.is_active(now):
                raise PermissionError(
                    "Phiên chấm bài đã hết hạn. Vui lòng tải lại hàng chờ chấm bài."
                )

            submission_id = assignment.submission_id
            sub = await repo.get_peer_submission_for_update(submission_id)
            if not sub:
                raise ValueError(f"Bài nộp {submission_id} không tồn tại.")
            if assignment.submission_attempt_number != sub.attempt_number:
                raise PermissionError(
                    "Phiên chấm bài không khớp với lần nộp hiện tại của học viên. Vui lòng tải lại hàng chờ chấm bài."
                )
            if sub.user_id == reviewer_user_id:
                raise PermissionError(
                    "Bạn không được phép tự chấm điểm bài làm của chính mình."
                )
            if item_id and item_id != sub.item_id:
                raise ValueError("Mã học liệu không khớp với bài nộp.")

            # Enforce Paid Mode & Course Enrollment before any further checks or writes
            course_id = await self._verify_learner_item_access(
                session,
                repo,
                reviewer_user_id,
                sub.item_id,
                require_paid=True,
                require_enrolled=True,
                current_user=current_user,
            )

            resolved_item_id = sub.item_id
            item_info = await repo.get_learning_item_details(resolved_item_id)
            essay_mode = (
                str(
                    item_info.get("essay_grading_mode")
                    or ESSAY_GRADING_MODE_PEER_REVIEW
                )
                if item_info
                else ESSAY_GRADING_MODE_PEER_REVIEW
            )
            if essay_mode == ESSAY_GRADING_MODE_INSTRUCTOR_ONLY:
                raise PermissionError(
                    "Bài tập này ở chế độ Chỉ Giảng viên/Trợ giảng chấm, không áp dụng chấm chéo."
                )

            # BR_PEER_001: Reviewer must have submitted their own assignment first
            reviewer_sub = await repo.get_user_peer_submission(
                reviewer_user_id, resolved_item_id
            )
            if not reviewer_sub:
                raise PermissionError(
                    "Bạn cần nộp bài cá nhân trước khi thực hiện chấm chéo cho bạn học."
                )

            # Enforce active grading lock held by this reviewer
            if sub.locked_by_user_id != reviewer_user_id or not sub.is_lock_active(now):
                raise PermissionError(
                    "Bạn không giữ khóa chấm bài hợp lệ hoặc khóa đã hết hạn cho bài nộp này."
                )

            raw_rubrics = (
                item_info.get("rubric_criteria_json")
                if item_info and item_info.get("rubric_criteria_json")
                else await repo.get_item_rubric_criteria_json(resolved_item_id)
            )
            db_rubrics = self._parse_rubric_criteria(raw_rubrics)
            db_rubric_map = {r.criteria_id: r for r in db_rubrics} if db_rubrics else {}

            final_criteria: list[RubricCriteria] = []
            for c in graded_criteria:
                if not math.isfinite(c.score_given) or not math.isfinite(c.max_score):
                    raise ValueError(
                        f"Điểm số và điểm tối đa của tiêu chí '{c.title}' phải là số thực hữu hạn hợp lệ."
                    )
                if c.max_score <= 0.0:
                    raise ValueError(
                        f"Điểm tối đa của tiêu chí '{c.title}' phải lớn hơn 0."
                    )
                db_crit = db_rubric_map.get(c.criteria_id)
                if db_crit:
                    authoritative_max_score = db_crit.max_score
                    authoritative_title = db_crit.title
                    authoritative_desc = getattr(db_crit, "description", "")
                elif not raw_rubrics:
                    authoritative_max_score = c.max_score
                    authoritative_title = c.title
                    authoritative_desc = getattr(c, "description", "")
                else:
                    raise ValueError(
                        f"Tiêu chí '{c.criteria_id}' không tồn tại trong cấu hình bài tập."
                    )

                if not math.isfinite(c.score_given) or not math.isfinite(
                    authoritative_max_score
                ):
                    raise ValueError(
                        f"Điểm số và điểm tối đa của tiêu chí '{authoritative_title}' phải là số thực hữu hạn hợp lệ."
                    )
                if authoritative_max_score <= 0.0:
                    raise ValueError(
                        f"Điểm tối đa của tiêu chí '{authoritative_title}' phải lớn hơn 0."
                    )
                if c.score_given < 0.0 or c.score_given > authoritative_max_score:
                    raise ValueError(
                        f"Điểm tiêu chí '{authoritative_title}' ({c.score_given}) không hợp lệ (yêu cầu từ 0 đến {authoritative_max_score})."
                    )

                final_criteria.append(
                    RubricCriteria(
                        criteria_id=c.criteria_id,
                        title=authoritative_title,
                        max_score=authoritative_max_score,
                        score_given=c.score_given,
                        feedback=(c.feedback or "").strip(),
                        description=authoritative_desc,
                    )
                )

            combined_feedback = " ".join(
                c.feedback for c in final_criteria if c.feedback
            )
            if len(combined_feedback) < MIN_PEER_REVIEW_FEEDBACK_LENGTH:
                raise ValueError(
                    f"Vui lòng nhập nhận xét chi tiết cho bạn học (tối thiểu {MIN_PEER_REVIEW_FEEDBACK_LENGTH} ký tự)."
                )

            total_given = sum(c.score_given for c in final_criteria)
            max_possible = sum(c.max_score for c in final_criteria)
            if (
                not math.isfinite(total_given)
                or not math.isfinite(max_possible)
                or max_possible <= 0.0
            ):
                raise ValueError("Tổng điểm các tiêu chí không hợp lệ.")
            score_percent = round((total_given / max_possible) * 100.0, 2)

            existing_reviews = await repo.get_peer_reviews_for_submission(
                submission_id, attempt_number=sub.attempt_number
            )
            if any(r.reviewer_user_id == reviewer_user_id for r in existing_reviews):
                raise PermissionError(
                    "Bạn đã thực hiện đánh giá cho bài nộp này trước đó rồi."
                )
            is_already_finalized = (
                sub.graded_by_staff
                or sub.status
                in (PEER_SUBMISSION_STATUS_PUBLISHED, PEER_SUBMISSION_STATUS_GRADED)
                or sub.final_score is not None
            )

            # Release lock BEFORE persisting review within the single atomic transaction
            released = await repo.release_submission_lock(
                submission_id, reviewer_user_id
            )
            if not released:
                raise PermissionError("Không thể giải phóng khóa chấm bài hợp lệ.")
            sub.release_lock(reviewer_user_id)

            assignment.mark_completed()
            await repo.save_peer_review_assignment(assignment)

            now_iso = now.isoformat()
            persisted_review_id = f"rev-{uuid7().hex}"
            review = PeerReview(
                id=persisted_review_id,
                submission_id=submission_id,
                reviewer_user_id=reviewer_user_id,
                item_id=resolved_item_id,
                rubric_criteria=final_criteria,
                total_score=score_percent,
                is_outlier=False,
                created_at=now_iso,
                submission_attempt_number=sub.attempt_number,
            )
            changed_existing_reviews: list[PeerReview] = []
            if existing_reviews and not is_already_finalized:
                changed_existing_reviews = _reconcile_peer_review_outliers(
                    existing_reviews, review
                )
            is_outlier = review.is_outlier

            await repo.save_peer_review(review)
            for updated_rev in changed_existing_reviews:
                await repo.save_peer_review(updated_rev)
            logger.info(
                "User %s submitted peer review %s (assignment %s) for submission %s with score %s",
                reviewer_user_id,
                persisted_review_id,
                review_id,
                submission_id,
                score_percent,
            )

            req_reviews = (
                int(
                    item_info.get("required_peer_reviews")
                    or REQUIRED_PEER_REVIEWS_COUNT
                )
                if item_info
                else REQUIRED_PEER_REVIEWS_COUNT
            )
            cold_hours = (
                int(item_info.get("cold_start_hours") or PEER_REVIEW_COLD_START_HOURS)
                if item_info
                else PEER_REVIEW_COLD_START_HOURS
            )

            published_now = False
            if not is_already_finalized:
                all_revs = await repo.get_peer_reviews_for_submission(
                    submission_id, attempt_number=sub.attempt_number
                )
                if len(all_revs) >= req_reviews:
                    avg_score = round(
                        sum(r.total_score for r in all_revs) / len(all_revs), 2
                    )
                    effective_score = avg_score
                    sub.assign_grade(
                        effective_score, is_staff=False, grade_source="PEER_REVIEW"
                    )
                    if not sub.published_at:
                        sub.published_at = now_iso
                    sub.status = PEER_SUBMISSION_STATUS_PUBLISHED

                    publish_sub_event = await self._evaluate_review_duty_for_release(
                        repo,
                        sub,
                        essay_mode,
                        req_reviews,
                        cold_start_hours=cold_hours,
                        now=now,
                    )
                    await repo.save_peer_submission(sub)

                    if publish_sub_event:
                        published_now = True
                        eff_grade, _, _ = sub.get_effective_published_grade()
                        event_score = (
                            eff_grade if eff_grade is not None else effective_score
                        )
                        pending_events.append(
                            PeerAssignmentGradedDomainEvent(
                                user_id=sub.user_id,
                                course_id=course_id,
                                item_id=sub.item_id,
                                submission_id=sub.id,
                                final_score=event_score,
                                passed=event_score >= DEFAULT_PASSING_THRESHOLD_PERCENT,
                                grader_id="peer",
                            )
                        )

            if not published_now:
                # 1st/2nd reviews, pending duty release, or 4th+ reference reviews: notify author only
                pending_events.append(
                    PeerReviewSubmittedDomainEvent(
                        reviewer_id=reviewer_user_id,
                        submission_id=sub.id,
                        author_id=sub.user_id,
                        score=score_percent,
                        course_id=course_id,
                        item_id=sub.item_id,
                    )
                )

            # Check reviewer's own review duty
            rev_sub = await repo.get_user_peer_submission(
                reviewer_user_id, resolved_item_id
            )
            if rev_sub and rev_sub.review_duty_status not in (
                REVIEW_DUTY_COMPLETED,
                REVIEW_DUTY_WAIVED_EMPTY_POOL,
                REVIEW_DUTY_NOT_APPLICABLE,
            ):
                rev_completed = await repo.count_user_completed_reviews(
                    resolved_item_id, reviewer_user_id
                )
                rev_available = await repo.count_available_pool_submissions(
                    resolved_item_id, reviewer_user_id
                )
                rev_cold_elapsed = _is_cold_start_elapsed(
                    rev_sub.created_at, cold_hours, now
                )
                rev_target = (
                    min(req_reviews, rev_completed + rev_available)
                    if rev_cold_elapsed
                    else req_reviews
                )
                if rev_completed >= rev_target > 0:
                    rev_sub.review_duty_status = REVIEW_DUTY_COMPLETED
                    rev_eff_score, _, _ = rev_sub.get_effective_published_grade()
                    if rev_eff_score is not None:
                        pending_events.append(
                            PeerAssignmentGradedDomainEvent(
                                user_id=rev_sub.user_id,
                                course_id=course_id,
                                item_id=rev_sub.item_id,
                                submission_id=rev_sub.id,
                                final_score=rev_eff_score,
                                passed=rev_eff_score
                                >= DEFAULT_PASSING_THRESHOLD_PERCENT,
                                grader_id=rev_sub.graded_by_user_id or "peer",
                            )
                        )
                    await repo.save_peer_submission(rev_sub)
                elif (
                    rev_available == 0
                    and rev_sub.review_duty_status != REVIEW_DUTY_WAITING_POOL
                ):
                    rev_sub.review_duty_status = REVIEW_DUTY_WAITING_POOL
                    await repo.save_peer_submission(rev_sub)

        for evt in pending_events:
            await EventBus.publish(evt)

        msg = "Peer review graded successfully."
        if is_outlier:
            msg += f" (Outlier Flagged: Score variation exceeds {int(OUTLIER_SCORE_DELTA_THRESHOLD)}%, TA notified)."
        return True, msg

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

        if graded_criteria:
            max_possible = sum(c.max_score for c in graded_criteria)
            total_given = sum(c.score_given for c in graded_criteria)
            if max_possible > 0:
                expected_score = round((total_given / max_possible) * 100.0, 2)
                if total_score <= 0.0:
                    total_score = expected_score
                elif abs(total_score - expected_score) > 1.0:
                    raise ValueError(
                        f"Điểm tổng ({total_score}) không nhất quán với tổng điểm các tiêu chí ({expected_score}%)."
                    )

        if not math.isfinite(total_score) or total_score < 0.0 or total_score > 100.0:
            raise ValueError(
                "Điểm số phải là số thực hữu hạn nằm trong khoảng từ 0 đến 100."
            )

        staff_event: PeerAssignmentGradedDomainEvent | None = None
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

            # BR_GRADE_002: Hierarchy Check (AUTO <= PEER < TA < INSTRUCTOR)
            # Teaching Assistant cannot override grade locked by an Instructor
            if sub.grade_source == "INSTRUCTOR" and provenance == "TA":
                raise PermissionError(
                    "Trợ giảng không thể chấm đè lên điểm đã do Giảng viên chốt."
                )

            # BR_GRADE_002: Master Override & Authoritative Staff Grade
            # When an Instructor or authorized Staff grades, their latest score is the authoritative final score.
            effective_score = total_score
            rubric_json = {c.criteria_id: c.score_given for c in graded_criteria}
            if provenance in ("INSTRUCTOR", "GRADING_PROVENANCE_INSTRUCTOR"):
                grader_role = "INSTRUCTOR"
            elif provenance in ("TA", "GRADING_PROVENANCE_TA"):
                grader_role = "TA"
            elif current_user and current_user.is_instructor:
                grader_role = "INSTRUCTOR"
            else:
                grader_role = "TA"

            sub.assign_grade(
                score=effective_score,
                is_staff=True,
                graded_by_user_id=staff_user_id,
                grader_role=grader_role,
                grade_source=grader_role,
                staff_feedback=feedback,
                rubric_scores_json=rubric_json,
                appeal_resolution_notes=appeal_resolution_notes,
            )
            sub.published_at = now.isoformat()
            sub.status = "PUBLISHED"

            # BR_GRADE_003: Active lock release on save (safely clears own or expired lock)
            if sub.locked_by_user_id:
                sub.claim_lock(staff_user_id, now)
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
            await repo.resolve_pending_peer_review_reports_for_submission(
                submission_id, staff_user_id, appeal_resolution_notes
            )

            item_info = await repo.get_learning_item_details(sub.item_id)
            essay_mode = (
                str(
                    item_info.get("essay_grading_mode")
                    or ESSAY_GRADING_MODE_PEER_REVIEW
                )
                if item_info
                else ESSAY_GRADING_MODE_PEER_REVIEW
            )
            req_reviews = (
                int(
                    item_info.get("required_peer_reviews")
                    or REQUIRED_PEER_REVIEWS_COUNT
                )
                if item_info
                else REQUIRED_PEER_REVIEWS_COUNT
            )
            cold_hours = (
                int(item_info.get("cold_start_hours") or PEER_REVIEW_COLD_START_HOURS)
                if item_info
                else PEER_REVIEW_COLD_START_HOURS
            )

            publish_completion_event = await self._evaluate_review_duty_for_release(
                repo,
                sub,
                essay_mode,
                req_reviews,
                cold_start_hours=cold_hours,
                now=now,
            )
            await repo.save_peer_submission(sub)

            if publish_completion_event:
                course_id = await repo.get_course_id_by_item_id(sub.item_id) or ""
                eff_grade, _, _ = sub.get_effective_published_grade()
                event_score = eff_grade if eff_grade is not None else effective_score
                staff_event = PeerAssignmentGradedDomainEvent(
                    user_id=sub.user_id,
                    course_id=course_id,
                    item_id=sub.item_id,
                    submission_id=sub.id,
                    final_score=event_score,
                    passed=event_score >= DEFAULT_PASSING_THRESHOLD_PERCENT,
                    grader_id=staff_user_id,
                )

        if staff_event is not None:
            await EventBus.publish(staff_event)

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
            sub = await repo.get_peer_submission(submission_id)
            if not sub:
                return False, f"Không tìm thấy bài nộp {submission_id}", {}
            if sub.user_id == staff_user_id:
                raise PermissionError(
                    "Bạn không được phép tự khóa bài làm của chính mình để chấm điểm."
                )
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

        regrade_event: PeerAssignmentGradedDomainEvent | None = None
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            sub = await repo.get_peer_submission(submission_id)
            if not sub:
                raise ValueError(f"Không tìm thấy bài nộp {submission_id}")
            if sub.user_id == staff_user_id:
                raise PermissionError(
                    "Bạn không được phép tự chấm điểm bài làm của chính mình."
                )

            course_id, course = await self._resolve_course_for_item(
                session, repo, sub.item_id
            )
            if current_user is not None and course is not None:
                enforce_course_ownership(
                    course=course,
                    user=CurrentUserContext(
                        id=current_user.id,
                        role=current_user.role,
                        email=current_user.email,
                    ),
                    required_permission=CoursePermission.GRADE_ASSESSMENTS,
                    action_name="chấm đè điểm bài nộp",
                )
                owner_id = getattr(course, "owner_id", "")
                co_instructors = getattr(course, "co_instructor_ids", []) or []
                is_course_instructor = bool(
                    current_user.is_admin
                    or current_user.id == owner_id
                    or current_user.id in co_instructors
                )
            else:
                is_course_instructor = bool(
                    current_user
                    and (current_user.is_admin or current_user.is_instructor)
                )

            # BR_GRADE_002: Hierarchy Check (AUTO <= PEER < TA < INSTRUCTOR)
            if sub.grade_source == "INSTRUCTOR" and not is_course_instructor:
                raise PermissionError(
                    "Trợ giảng không thể chấm đè lên điểm đã do Giảng viên chốt."
                )

            now = datetime.now(UTC)
            if not sub.can_claim_lock(staff_user_id, now):
                raise PermissionError("Bài nộp đang được nhân sự khác khóa để chấm.")

            # BR_GRADE_002: Master Override & Authoritative Staff Grade
            grader_role = "INSTRUCTOR" if is_course_instructor else "TA"
            effective_score = ta_score
            sub.assign_grade(
                effective_score,
                is_staff=True,
                grade_source=grader_role,
                grader_role=grader_role,
                graded_by_user_id=staff_user_id,
            )
            sub.published_at = now.isoformat()
            sub.status = "PUBLISHED"

            if sub.locked_by_user_id:
                sub.claim_lock(staff_user_id, now)
                sub.release_lock(staff_user_id)
                await repo.release_submission_lock(submission_id, staff_user_id)

            item_info = await repo.get_learning_item_details(sub.item_id)
            essay_mode = (
                str(
                    item_info.get("essay_grading_mode")
                    or ESSAY_GRADING_MODE_PEER_REVIEW
                )
                if item_info
                else ESSAY_GRADING_MODE_PEER_REVIEW
            )
            req_reviews = (
                int(
                    item_info.get("required_peer_reviews")
                    or REQUIRED_PEER_REVIEWS_COUNT
                )
                if item_info
                else REQUIRED_PEER_REVIEWS_COUNT
            )
            cold_hours = (
                int(item_info.get("cold_start_hours") or PEER_REVIEW_COLD_START_HOURS)
                if item_info
                else PEER_REVIEW_COLD_START_HOURS
            )
            publish_completion_event = await self._evaluate_review_duty_for_release(
                repo,
                sub,
                essay_mode,
                req_reviews,
                cold_start_hours=cold_hours,
                now=now,
            )
            await repo.save_peer_submission(sub)

            appeal = await repo.get_grade_appeal(submission_id)
            if appeal:
                appeal.approve(reviewer_id=staff_user_id, final_score=effective_score)
                appeal.status = "RESOLVED"
                await repo.save_grade_appeal(appeal)
            await repo.resolve_pending_peer_review_reports_for_submission(
                submission_id, staff_user_id
            )

            if publish_completion_event:
                eff_grade, _, _ = sub.get_effective_published_grade()
                event_score = eff_grade if eff_grade is not None else effective_score
                regrade_event = PeerAssignmentGradedDomainEvent(
                    user_id=sub.user_id,
                    course_id=course_id,
                    item_id=sub.item_id,
                    submission_id=sub.id,
                    final_score=event_score,
                    passed=event_score >= DEFAULT_PASSING_THRESHOLD_PERCENT,
                    grader_id=staff_user_id,
                )

        if regrade_event is not None:
            await EventBus.publish(regrade_event)

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

                reviews = await repo.get_peer_reviews_for_submission(
                    s.id, attempt_number=s.attempt_number
                )
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
        self,
        user_id: str,
        review_id: str,
        report_reason: str,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        """Reports a malicious or spam peer review (BR_PEER_005)."""
        if not report_reason or not report_reason.strip():
            raise ValueError("Lý do báo cáo không được để trống.")
        if not review_id or not review_id.strip():
            raise ValueError("Mã lượt đánh giá không hợp lệ.")

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            review = await repo.get_peer_review_by_id(review_id.strip())
            if not review:
                raise ValueError(f"Không tìm thấy lượt đánh giá {review_id}")

            sub = await repo.get_peer_submission(review.submission_id)
            if not sub:
                raise ValueError(f"Không tìm thấy bài nộp {review.submission_id}")
            if sub.user_id != user_id:
                raise PermissionError(
                    "Chỉ chủ sở hữu bài nộp mới có quyền gửi báo cáo đánh giá bài làm của mình."
                )
            await self._verify_learner_item_access(
                session,
                repo,
                user_id,
                sub.item_id,
                require_paid=True,
                require_enrolled=True,
                current_user=current_user,
            )
            if review.submission_attempt_number != sub.attempt_number:
                raise ValueError(
                    "Chỉ có thể báo cáo lượt đánh giá thuộc lần nộp hiện tại của bài tập."
                )

            existing_report = await repo.get_peer_review_report_by_user_and_review(
                user_id, review.id
            )
            if existing_report:
                raise ValueError(
                    "Bạn đã gửi báo cáo cho lượt đánh giá này trước đó rồi."
                )

            report = PeerReviewReport(
                id=f"report-{uuid7().hex}",
                peer_review_id=review.id,
                submission_id=sub.id,
                reporter_user_id=user_id,
                reason=report_reason.strip(),
                status=REPORT_STATUS_PENDING_STAFF_REVIEW,
                created_at=datetime.now(UTC).isoformat(),
            )
            await repo.save_peer_review_report(report)
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
        if not course_id:
            raise ValueError(
                "Yêu cầu chỉ định mã khóa học (course_id) để tải hàng chờ chấm bài."
            )

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            items = await repo.list_grading_queue_items(
                course_id=course_id, item_id=item_id
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
                    "grade_source": (
                        sub.grade_source if sub.final_score is not None else None
                    ),
                    "staff_score": (
                        float(sub.final_score)
                        if sub.final_score is not None and sub.graded_by_staff
                        else 0.0
                    ),
                    "status": (
                        "GRADED"
                        if (
                            sub.status == PEER_SUBMISSION_STATUS_PUBLISHED
                            and sub.final_score is not None
                        )
                        else "PENDING"
                    ),
                    "peer_score": 0.0,
                    "peer_reviews_count": 0,
                }

            reviews = await repo.get_peer_reviews_for_submission(
                sub.id, attempt_number=sub.attempt_number
            )

            # Query user names and avatars for all peer reviewers and staff evaluators
            reviewer_uids: set[str] = {
                r.reviewer_user_id for r in reviews if r.reviewer_user_id
            }
            staff_uids: set[str] = {
                str(e.get("staff_id"))
                for e in (sub.staff_evaluations_json or [])
                if e.get("staff_id")
            }
            if sub.graded_by_user_id:
                staff_uids.add(sub.graded_by_user_id)
            if sub.locked_by_user_id:
                staff_uids.add(sub.locked_by_user_id)

            all_target_uids: list[str] = [u for u in (reviewer_uids | staff_uids) if u]
            user_info_map = await repo.get_user_display_profiles(all_target_uids)

            raw_rubrics = await repo.get_item_rubric_criteria_json(sub.item_id)
            prompt = await repo.get_item_reading_markdown(sub.item_id)
            rubric_criteria = self._parse_rubric_criteria(raw_rubrics)
            rubric_map = {r.criteria_id: r for r in rubric_criteria}

            peer_reviews_data = []
            for r in reviews:
                u_info = user_info_map.get(r.reviewer_user_id, {})
                fb_text = getattr(r, "feedback", "") or ""
                enriched_criteria = []
                for c in r.rubric_criteria or []:
                    db_crit = rubric_map.get(c.criteria_id)
                    title = (db_crit.title if db_crit else c.title) or c.criteria_id
                    max_score = (db_crit.max_score if db_crit else c.max_score) or 10.0
                    enriched_criteria.append(
                        RubricCriteria(
                            criteria_id=c.criteria_id,
                            title=title,
                            max_score=max_score,
                            score_given=float(c.score_given),
                            feedback=getattr(c, "feedback", "") or "",
                            description=getattr(c, "description", "")
                            or (db_crit.description if db_crit else ""),
                        )
                    )
                peer_reviews_data.append(
                    {
                        "review_id": r.id,
                        "reviewer_id": r.reviewer_user_id,
                        "reviewer_name": u_info.get("name")
                        or f"Học viên #{r.reviewer_user_id[:6]}",
                        "reviewer_avatar_url": u_info.get("avatar_url", ""),
                        "total_score": float(r.total_score),
                        "graded_criteria": enriched_criteria,
                        "feedback": fb_text,
                        "reviewed_at": r.created_at,
                    }
                )

            staff_gradings_data: list[dict[str, Any]] = []
            if sub.staff_evaluations_json:
                for ev in sub.staff_evaluations_json:
                    s_id = ev.get("staff_id") or ""
                    s_info = user_info_map.get(s_id, {})
                    ev_rubric = ev.get("rubric_scores_json", {})
                    ev_criteria = []
                    for k, v in ev_rubric.items():
                        db_crit = rubric_map.get(k)
                        title = db_crit.title if db_crit else k
                        max_score = db_crit.max_score if db_crit else 10.0
                        desc = getattr(db_crit, "description", "") if db_crit else ""
                        ev_criteria.append(
                            RubricCriteria(
                                criteria_id=k,
                                title=title,
                                max_score=max_score,
                                score_given=float(v),
                                description=desc,
                            )
                        )
                    s_role = str(ev.get("grader_role") or "").upper()
                    s_source = str(ev.get("grade_source") or "").upper()
                    is_ta_eval = s_role == "TA" or s_source == "TA"
                    is_inst = not is_ta_eval and (
                        "INSTRUCTOR" in s_role
                        or "INSTRUCTOR" in s_source
                        or "INSTRUCTOR" in str(s_info.get("role") or "").upper()
                    )
                    ev_score = ev.get("score")
                    staff_score_val = float(ev_score) if ev_score is not None else 0.0
                    staff_gradings_data.append(
                        {
                            "staff_id": s_id,
                            "staff_name": s_info.get("name")
                            or ("Giảng viên" if is_inst else "Trợ giảng"),
                            "staff_avatar_url": s_info.get("avatar_url", ""),
                            "score": staff_score_val,
                            "graded_criteria": ev_criteria,
                            "feedback": ev.get("feedback") or "",
                            "graded_at": ev.get("graded_at")
                            or sub.published_at
                            or sub.created_at,
                            "provenance": "INSTRUCTOR" if is_inst else "TA",
                            "appeal_resolution_notes": ev.get("appeal_resolution_notes")
                            or "",
                        }
                    )
            elif sub.graded_by_staff and sub.graded_by_user_id:
                s_id = sub.graded_by_user_id or ""
                s_info = user_info_map.get(s_id, {})
                legacy_criteria = []
                for k, v in (sub.rubric_scores_json or {}).items():
                    db_crit = rubric_map.get(k)
                    title = db_crit.title if db_crit else k
                    max_score = db_crit.max_score if db_crit else 10.0
                    desc = getattr(db_crit, "description", "") if db_crit else ""
                    legacy_criteria.append(
                        RubricCriteria(
                            criteria_id=k,
                            title=title,
                            max_score=max_score,
                            score_given=float(v),
                            description=desc,
                        )
                    )
                sub_role = str(sub.grader_role or "").upper()
                sub_source = str(sub.grade_source or "").upper()
                is_ta_eval = sub_role == "TA" or sub_source == "TA"
                is_inst = not is_ta_eval and (
                    "INSTRUCTOR" in sub_role
                    or "INSTRUCTOR" in sub_source
                    or "INSTRUCTOR" in str(s_info.get("role") or "").upper()
                )
                sub_score_val = (
                    float(sub.final_score) if sub.final_score is not None else 0.0
                )
                staff_gradings_data.append(
                    {
                        "staff_id": s_id,
                        "staff_name": s_info.get("name")
                        or ("Giảng viên" if is_inst else "Trợ giảng"),
                        "staff_avatar_url": s_info.get("avatar_url", ""),
                        "score": sub_score_val,
                        "graded_criteria": legacy_criteria,
                        "feedback": sub.staff_feedback or "",
                        "graded_at": sub.published_at or sub.created_at,
                        "provenance": "INSTRUCTOR" if is_inst else "TA",
                        "appeal_resolution_notes": "",
                    }
                )

            # Sort evaluations with newest on top (reverse chronological order)
            staff_gradings_data.sort(
                key=lambda x: str(x.get("graded_at") or ""), reverse=True
            )

            current_staff_grading = (
                staff_gradings_data[0] if staff_gradings_data else None
            )

            return {
                "submission": matching_item,
                "submission_url": sub.submission_url,
                "text_content": sub.text_content,
                "attempt_number": sub.attempt_number,
                "rubric_criteria": rubric_criteria,
                "peer_reviews": peer_reviews_data,
                "current_staff_grading": current_staff_grading,
                "staff_gradings": staff_gradings_data,
                "assignment_prompt": prompt,
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
            essay_mode = i.get("essay_grading_mode") or ESSAY_GRADING_MODE_PEER_REVIEW
            cold_hours = int(i.get("cold_start_hours") or PEER_REVIEW_COLD_START_HOURS)
            is_overdue = False
            try:
                sub_dt = datetime.fromisoformat(i["submitted_at"])
                if sub_dt.tzinfo is None:
                    sub_dt = sub_dt.replace(tzinfo=UTC)
                if (now - sub_dt) > timedelta(hours=cold_hours):
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
                        "action_url": f"/instructor/courses/{course_id}/grading?submissionId={i['submission_id']}",
                        "course_id": course_id,
                        "priority": "HIGH",
                        "created_at": i["submitted_at"],
                    }
                )
            elif (
                essay_mode == ESSAY_GRADING_MODE_INSTRUCTOR_ONLY
                and i["status"] == "PENDING"
            ):
                tasks.append(
                    {
                        "id": f"task-direct-{i['submission_id']}",
                        "type": "DIRECT_GRADING",
                        "title": f"Chờ Giảng viên chấm: {i['item_title']}",
                        "lesson_title": i["item_title"],
                        "student_name": i["student_name"],
                        "course_title": i["course_title"],
                        "time_ago": "Cần chấm ngay",
                        "action_text": "Chấm ngay",
                        "action_url": f"/instructor/courses/{course_id}/grading?submissionId={i['submission_id']}",
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
                        "title": f"Bài nộp quá hạn {cold_hours}h: {i['item_title']}",
                        "lesson_title": i["item_title"],
                        "student_name": i["student_name"],
                        "course_title": i["course_title"],
                        "time_ago": f"Quá {cold_hours}h",
                        "action_text": "Chấm ngay",
                        "action_url": f"/instructor/courses/{course_id}/grading?submissionId={i['submission_id']}",
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

    async def get_my_peer_submission_status(
        self,
        user_id: str,
        item_id: str,
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        """Gets comprehensive status of the learner's own essay/peer submission (BR_PEER_001 - BR_PEER_010)."""
        pending_events: list[DomainEvent] = []
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            item_info = self._validate_peer_review_item(
                await repo.get_learning_item_details(item_id), item_id
            )
            course_id = await self._verify_learner_item_access(
                session,
                repo,
                user_id,
                item_id,
                require_paid=True,
                require_enrolled=True,
                current_user=current_user,
            )

            sub = await repo.get_user_peer_submission(user_id, item_id)
            raw_rubrics = item_info.get("rubric_criteria_json")
            rubric_criteria = self._parse_rubric_criteria(raw_rubrics)

            essay_mode = (
                item_info.get("essay_grading_mode") or ESSAY_GRADING_MODE_PEER_REVIEW
            )
            req_reviews = int(
                item_info.get("required_peer_reviews") or REQUIRED_PEER_REVIEWS_COUNT
            )
            cold_hours = int(
                item_info.get("cold_start_hours") or PEER_REVIEW_COLD_START_HOURS
            )

            if not sub:
                return {
                    "has_submission": False,
                    "submission_id": "",
                    "status": "",
                    "submission_url": "",
                    "text_content": "",
                    "created_at": "",
                    "attempt_number": 0,
                    "is_graded": False,
                    "final_score": 0.0,
                    "grade_source": "",
                    "staff_feedback": "",
                    "rubric_criteria": rubric_criteria,
                    "peer_feedbacks": [],
                    "essay_grading_mode": essay_mode,
                    "review_duty_status": (
                        REVIEW_DUTY_NOT_APPLICABLE
                        if essay_mode == ESSAY_GRADING_MODE_INSTRUCTOR_ONLY
                        else REVIEW_DUTY_PENDING
                    ),
                    "review_duty_waived_reason": "",
                    "reviews_completed_by_user": 0,
                    "target_reviews_required": (
                        req_reviews
                        if essay_mode == ESSAY_GRADING_MODE_PEER_REVIEW
                        else 0
                    ),
                    "available_pool_count": 0,
                    "can_appeal": False,
                    "appeal_status": "",
                    "assignment_title": item_info.get("title", ""),
                    "assignment_instructions": item_info.get("reading_markdown", ""),
                    "best_published_score": 0.0,
                    "best_grade_source": "",
                    "max_attempts": int(
                        item_info.get("essay_max_attempts")
                        or MAX_PEER_SUBMISSION_ATTEMPTS
                    ),
                }

            now = datetime.now(UTC)
            duty_status = sub.review_duty_status or REVIEW_DUTY_PENDING
            waived_reason = sub.review_duty_waived_reason or ""

            if essay_mode == ESSAY_GRADING_MODE_INSTRUCTOR_ONLY:
                completed_reviews = 0
                available_pool = 0
                target_required = 0
                duty_status = REVIEW_DUTY_NOT_APPLICABLE
            else:
                completed_reviews = await repo.count_user_completed_reviews(
                    item_id, user_id
                )
                available_pool = await repo.count_available_pool_submissions(
                    item_id, user_id
                )
                cold_elapsed = _is_cold_start_elapsed(sub.created_at, cold_hours, now)
                target_required = (
                    min(req_reviews, completed_reviews + available_pool)
                    if cold_elapsed
                    else req_reviews
                )

                duty_released_now = False
                if duty_status in (REVIEW_DUTY_PENDING, REVIEW_DUTY_WAITING_POOL):
                    if completed_reviews >= target_required > 0:
                        duty_status = REVIEW_DUTY_COMPLETED
                        sub.review_duty_status = REVIEW_DUTY_COMPLETED
                        await repo.save_peer_submission(sub)
                        duty_released_now = True
                    elif available_pool == 0:
                        if (
                            cold_elapsed
                            and sub.final_score is not None
                            and (
                                sub.graded_by_staff
                                or sub.status == PEER_SUBMISSION_STATUS_PUBLISHED
                            )
                        ):
                            duty_status = REVIEW_DUTY_WAIVED_EMPTY_POOL
                            waived_reason = (
                                f"Không còn bài làm nào khác trong kho bài sau {cold_hours} giờ chờ. "
                                "Hệ thống tự động giải thoát điều kiện chấm cho bạn."
                            )
                            sub.review_duty_status = duty_status
                            sub.review_duty_waived_reason = waived_reason
                            await repo.save_peer_submission(sub)
                            duty_released_now = True
                        elif duty_status != REVIEW_DUTY_WAITING_POOL:
                            duty_status = REVIEW_DUTY_WAITING_POOL
                            sub.review_duty_status = REVIEW_DUTY_WAITING_POOL
                            await repo.save_peer_submission(sub)
                    elif available_pool > 0 and duty_status == REVIEW_DUTY_WAITING_POOL:
                        duty_status = REVIEW_DUTY_PENDING
                        sub.review_duty_status = REVIEW_DUTY_PENDING
                        await repo.save_peer_submission(sub)

                if (
                    duty_released_now
                    and sub.status == PEER_SUBMISSION_STATUS_PUBLISHED
                    and sub.final_score is not None
                ):
                    eff_score, _, _ = sub.get_effective_published_grade()
                    ev_score = (
                        eff_score if eff_score is not None else float(sub.final_score)
                    )
                    pending_events.append(
                        PeerAssignmentGradedDomainEvent(
                            user_id=sub.user_id,
                            course_id=course_id,
                            item_id=sub.item_id,
                            submission_id=sub.id,
                            final_score=ev_score,
                            passed=ev_score >= DEFAULT_PASSING_THRESHOLD_PERCENT,
                            grader_id=sub.graded_by_user_id or "peer",
                        )
                    )

            score_locked_by_duty = (
                essay_mode == ESSAY_GRADING_MODE_PEER_REVIEW
                and duty_status not in ELIGIBLE_REVIEW_DUTY_STATUSES
            )
            peer_feedbacks = []
            if not score_locked_by_duty:
                raw_peer_reviews = await repo.get_peer_reviews_for_submission(
                    sub.id, attempt_number=sub.attempt_number
                )
                for idx, pr in enumerate(raw_peer_reviews, start=1):
                    p_rubrics = (
                        pr.rubric_criteria if hasattr(pr, "rubric_criteria") else []
                    )
                    peer_feedbacks.append(
                        {
                            "review_id": pr.id,
                            "feedback_label": f"Bạn học #{idx}",
                            "total_score": pr.total_score,
                            "graded_criteria": p_rubrics,
                            "submitted_at": getattr(pr, "created_at", "") or "",
                        }
                    )

            appeal = await repo.get_grade_appeal(sub.id)
            appeal_status = appeal.status if appeal else ""
            is_graded = (
                sub.final_score is not None
                and sub.status == PEER_SUBMISSION_STATUS_PUBLISHED
            )

            if score_locked_by_duty:
                can_appeal = False
                visible_staff_feedback = ""
                best_published_score = 0.0
                best_grade_source = ""
                final_score = 0.0
                grade_source = ""
            else:
                can_appeal = False
                if (
                    sub.status == PEER_SUBMISSION_STATUS_PUBLISHED
                    and sub.final_score is not None
                    and not appeal
                ):
                    if sub.published_at:
                        try:
                            pub_dt = datetime.fromisoformat(sub.published_at)
                            if pub_dt.tzinfo is None:
                                pub_dt = pub_dt.replace(tzinfo=UTC)
                            can_appeal = now <= pub_dt + timedelta(
                                days=MAX_APPEAL_WINDOW_DAYS
                            )
                        except (ValueError, TypeError):
                            can_appeal = True
                    else:
                        can_appeal = True

                visible_staff_feedback = sub.staff_feedback or ""
                eff_best_score, eff_best_source, _ = sub.get_effective_published_grade()
                best_published_score = float(eff_best_score or 0.0)
                best_grade_source = normalize_grade_provenance(eff_best_source)

                if is_graded:
                    final_score = best_published_score
                    grade_source = best_grade_source
                else:
                    final_score = 0.0
                    grade_source = ""

        for evt in pending_events:
            await EventBus.publish(evt)

        return {
            "has_submission": True,
            "submission_id": sub.id,
            "status": sub.status,
            "submission_url": sub.submission_url,
            "text_content": sub.text_content,
            "created_at": sub.created_at,
            "attempt_number": sub.attempt_number,
            "is_graded": is_graded,
            "final_score": final_score,
            "grade_source": grade_source,
            "staff_feedback": visible_staff_feedback,
            "rubric_criteria": rubric_criteria,
            "peer_feedbacks": peer_feedbacks,
            "essay_grading_mode": essay_mode,
            "review_duty_status": duty_status,
            "review_duty_waived_reason": waived_reason,
            "reviews_completed_by_user": completed_reviews,
            "target_reviews_required": (
                target_required if essay_mode == ESSAY_GRADING_MODE_PEER_REVIEW else 0
            ),
            "available_pool_count": available_pool,
            "can_appeal": can_appeal,
            "appeal_status": appeal_status,
            "assignment_title": item_info.get("title", ""),
            "assignment_instructions": item_info.get("reading_markdown", ""),
            "best_published_score": best_published_score,
            "best_grade_source": best_grade_source,
            "max_attempts": int(
                item_info.get("essay_max_attempts") or MAX_PEER_SUBMISSION_ATTEMPTS
            ),
        }
