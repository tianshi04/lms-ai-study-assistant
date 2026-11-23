from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any

from src.modules.assessment.domain.constants import (
    DEFAULT_PASSING_THRESHOLD_PERCENT,
    DEFAULT_QUIZ_EASY_COUNT,
    DEFAULT_QUIZ_HARD_COUNT,
    DEFAULT_QUIZ_MEDIUM_COUNT,
    DEFAULT_QUIZ_TIME_LIMIT_MINUTES,
    ELIGIBLE_REVIEW_DUTY_STATUSES,
    ESSAY_GRADING_MODE_INSTRUCTOR_ONLY,
    GRADING_LOCK_TIMEOUT_MINUTES,
    MAX_PEER_SUBMISSION_ATTEMPTS,
    MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN,
    PEER_ASSIGNMENT_STATUS_ASSIGNED,
    PEER_ASSIGNMENT_STATUS_COMPLETED,
    PEER_SUBMISSION_STATUS_PUBLISHED,
    PEER_SUBMISSION_STATUS_SUBMITTED,
    QUIZ_COOLDOWN_HOURS,
    QUIZ_DRAFT_DEFAULT_VERSION,
    QUIZ_DRAFT_KEEPALIVE_GRACE_SECONDS,
    REVIEW_DUTY_COMPLETED,
    REVIEW_DUTY_NOT_APPLICABLE,
    REVIEW_DUTY_PENDING,
    REVIEW_DUTY_WAIVED_EMPTY_POOL,
    TOPIC_MASTERY_THRESHOLD_MASTERED,
    TOPIC_MASTERY_THRESHOLD_NEEDS_PRACTICE,
)
from src.shared.domain.base import Entity, ValueObject


@dataclass(frozen=True)
class RubricCriteria(ValueObject):
    criteria_id: str
    title: str
    max_score: float
    score_given: float = 0.0
    feedback: str = ""
    description: str = ""


class HonorCodeAgreement(Entity):
    def __init__(
        self,
        user_id: str,
        item_id: str,
        is_agreed: bool = True,
        agreed_at: str | None = None,
    ) -> None:
        super().__init__(id=f"{user_id}:{item_id}")
        self.user_id = user_id
        self.item_id = item_id
        self.is_agreed = is_agreed
        self.agreed_at = agreed_at


class QuizSubmission(Entity):
    def __init__(
        self,
        id: str,
        user_id: str,
        item_id: str,
        selected_option_indexes: list[int],
        score_percent: float,
        passed: bool,
        attempt_number: int,
        created_at: str,
    ) -> None:
        super().__init__(id=id)
        self.user_id = user_id
        self.item_id = item_id
        self.selected_option_indexes = selected_option_indexes
        self.score_percent = score_percent
        self.passed = passed
        self.attempt_number = attempt_number
        self.created_at = created_at


class QuizSubmissionAnswer(Entity):
    def __init__(
        self,
        id: str,
        submission_id: str,
        question_id: str,
        question_text: str,
        question_type: str,
        options_json: list[dict[str, Any]],
        selected_option_indices: list[int],
        is_correct: bool,
        topic: str = "Tổng quan",
        explanation: str = "",
        order_index: int = 0,
    ) -> None:
        super().__init__(id=id)
        self.submission_id = submission_id
        self.question_id = question_id
        self.question_text = question_text
        self.question_type = question_type
        self.options_json = options_json
        self.selected_option_indices = selected_option_indices
        self.is_correct = is_correct
        self.topic = topic
        self.explanation = explanation
        self.order_index = order_index


class QuizCooldown(Entity):
    def __init__(
        self,
        user_id: str,
        item_id: str,
        failed_attempts_count: int = 0,
        last_attempt_at: str | None = None,
        cooldown_until: str | None = None,
    ) -> None:
        super().__init__(id=f"{user_id}:{item_id}")
        self.user_id = user_id
        self.item_id = item_id
        self.failed_attempts_count = failed_attempts_count
        self.last_attempt_at = last_attempt_at
        self.cooldown_until = cooldown_until

    def is_in_cooldown(self, now: datetime) -> bool:
        if not self.cooldown_until:
            return False
        try:
            until_dt = datetime.fromisoformat(self.cooldown_until)
            if until_dt.tzinfo is None and now.tzinfo is not None:
                until_dt = until_dt.replace(tzinfo=UTC)
            elif until_dt.tzinfo is not None and now.tzinfo is None:
                until_dt = until_dt.replace(tzinfo=None)
            return now < until_dt
        except (ValueError, TypeError):
            return False

    def can_attempt(self, now: datetime) -> tuple[bool, str, int]:
        if self.is_in_cooldown(now) and self.cooldown_until:
            try:
                until_dt = datetime.fromisoformat(self.cooldown_until)
                if until_dt.tzinfo is None and now.tzinfo is not None:
                    until_dt = until_dt.replace(tzinfo=UTC)
                elif until_dt.tzinfo is not None and now.tzinfo is None:
                    until_dt = until_dt.replace(tzinfo=None)
                remaining_seconds = max(0, int((until_dt - now).total_seconds()))
                remaining_hours = (remaining_seconds + 3599) // 3600
                hours = remaining_seconds // 3600
                minutes = (remaining_seconds % 3600) // 60
                time_str = (
                    f"{hours} giờ {minutes} phút" if hours > 0 else f"{minutes} phút"
                )
                return (
                    False,
                    f"Bạn đã dùng hết số lượt làm bài. Vui lòng quay lại sau {time_str}.",
                    remaining_hours,
                )
            except (ValueError, TypeError):
                pass
        return True, "", 0

    def record_failure(
        self,
        now: datetime,
        cooldown_hours: int = QUIZ_COOLDOWN_HOURS,
        max_attempts: int = MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN,
    ) -> None:
        self.failed_attempts_count += 1
        self.last_attempt_at = now.isoformat()
        if self.failed_attempts_count >= max_attempts and not self.is_in_cooldown(now):
            self.cooldown_until = (now + timedelta(hours=cooldown_hours)).isoformat()

    def record_success(self) -> None:
        self.failed_attempts_count = 0
        self.cooldown_until = None


class QuizActiveSession(Entity):
    def __init__(
        self,
        user_id: str,
        item_id: str,
        session_seed: int,
        questions_json: list[dict[str, Any]],
        started_at: str,
        expires_at: str,
        session_id: str = "",
        draft_answers: list[list[int]] | None = None,
        draft_updated_at: str = "",
        draft_version: int = QUIZ_DRAFT_DEFAULT_VERSION,
    ) -> None:
        super().__init__(id=f"{user_id}:{item_id}")
        self.user_id = user_id
        self.item_id = item_id
        self.session_id = session_id
        self.session_seed = session_seed
        self.questions_json = questions_json
        self.started_at = started_at
        self.expires_at = expires_at
        self.draft_answers = self.normalize_draft_answers(
            draft_answers or [], questions_json
        )
        self.draft_updated_at = draft_updated_at
        self.draft_version = max(0, int(draft_version))

    @staticmethod
    def normalize_draft_answers(
        raw_answers: list[list[int]] | None,
        questions: list[dict[str, Any]],
    ) -> list[list[int]]:
        if not questions:
            if not raw_answers:
                return []
            sanitized: list[list[int]] = []
            for entry in raw_answers:
                if not isinstance(entry, list):
                    sanitized.append([])
                    continue
                valid = sorted(
                    {
                        idx
                        for idx in entry
                        if isinstance(idx, int)
                        and not isinstance(idx, bool)
                        and idx >= 0
                    }
                )
                sanitized.append(valid)
            return sanitized

        normalized: list[list[int]] = []
        for q_idx, q in enumerate(questions):
            raw_entry = (
                raw_answers[q_idx]
                if (
                    raw_answers
                    and q_idx < len(raw_answers)
                    and isinstance(raw_answers[q_idx], list)
                )
                else []
            )
            options = q.get("options") if isinstance(q, dict) else None
            option_count = len(options) if isinstance(options, list) else 0

            valid_indices = sorted(
                {
                    idx
                    for idx in raw_entry
                    if isinstance(idx, int)
                    and not isinstance(idx, bool)
                    and idx >= 0
                    and (option_count == 0 or idx < option_count)
                }
            )
            q_type = (
                str(q.get("question_type", "SINGLE_CHOICE")).upper()
                if isinstance(q, dict)
                else "SINGLE_CHOICE"
            )
            if q_type != "MULTIPLE_CHOICE" and len(valid_indices) > 1:
                valid_indices = [valid_indices[0]]

            normalized.append(valid_indices)
        return normalized

    def answered_count(self) -> int:
        return sum(1 for ans in self.draft_answers if ans)

    def is_expired(self, now: datetime, grace_seconds: int = 0) -> bool:
        if not self.expires_at:
            return False
        try:
            expires_dt = datetime.fromisoformat(self.expires_at)
            if expires_dt.tzinfo is None and now.tzinfo is not None:
                expires_dt = expires_dt.replace(tzinfo=UTC)
            elif expires_dt.tzinfo is not None and now.tzinfo is None:
                expires_dt = expires_dt.replace(tzinfo=None)
            if grace_seconds > 0:
                expires_dt = expires_dt + timedelta(seconds=grace_seconds)
            return now >= expires_dt
        except (ValueError, TypeError):
            return False

    def apply_draft_update(
        self,
        raw_answers: list[list[int]],
        version: int,
        now: datetime,
        grace_seconds: int = QUIZ_DRAFT_KEEPALIVE_GRACE_SECONDS,
    ) -> bool:
        if self.is_expired(now, grace_seconds=grace_seconds):
            return False
        safe_version = max(0, int(version))
        if safe_version < self.draft_version:
            return False
        self.draft_answers = self.normalize_draft_answers(
            raw_answers, self.questions_json
        )
        self.draft_version = safe_version
        self.draft_updated_at = now.isoformat()
        return True


class LabSubmission(Entity):
    def __init__(
        self,
        id: str,
        user_id: str,
        item_id: str,
        source_code: str,
        language: str,
        score_percent: float,
        passed: bool,
        total_test_cases: int,
        passed_test_cases: int,
        test_logs: str,
        created_at: str,
    ) -> None:
        super().__init__(id=id)
        self.user_id = user_id
        self.item_id = item_id
        self.source_code = source_code
        self.language = language
        self.score_percent = score_percent
        self.passed = passed
        self.total_test_cases = total_test_cases
        self.passed_test_cases = passed_test_cases
        self.test_logs = test_logs
        self.created_at = created_at


class PeerAssignmentSubmission(Entity):
    def __init__(
        self,
        id: str,
        user_id: str,
        item_id: str,
        submission_url: str,
        text_content: str,
        created_at: str,
        final_score: float | None = None,
        graded_by_staff: bool = False,
        attempt_number: int = 1,
        staff_feedback: str | None = None,
        graded_by_user_id: str | None = None,
        grader_role: str | None = None,
        grade_source: str = "PEER_REVIEW",
        locked_by_user_id: str | None = None,
        locked_at: str | None = None,
        lock_expires_at: str | None = None,
        rubric_scores_json: dict[str, Any] | None = None,
        published_at: str | None = None,
        status: str = "SUBMITTED",
        staff_evaluations_json: list[dict[str, Any]] | None = None,
        review_duty_status: str = "PENDING",
        review_duty_waived_reason: str | None = None,
        previous_best_score: float | None = None,
        previous_best_grade_source: str | None = None,
        previous_best_published_at: str | None = None,
    ) -> None:
        super().__init__(id=id)
        self.user_id = user_id
        self.item_id = item_id
        self.submission_url = submission_url
        self.text_content = text_content
        self.created_at = created_at
        self.final_score = final_score
        self.graded_by_staff = graded_by_staff
        self.attempt_number = attempt_number
        self.staff_feedback = staff_feedback
        self.graded_by_user_id = graded_by_user_id
        self.grader_role = grader_role
        self.grade_source = grade_source
        self.locked_by_user_id = locked_by_user_id
        self.locked_at = locked_at
        self.lock_expires_at = lock_expires_at
        self.rubric_scores_json = rubric_scores_json or {}
        self.published_at = published_at
        self.status = status
        self.staff_evaluations_json = staff_evaluations_json or []
        self.review_duty_status = review_duty_status
        self.review_duty_waived_reason = review_duty_waived_reason
        self.previous_best_score = previous_best_score
        self.previous_best_grade_source = previous_best_grade_source
        self.previous_best_published_at = previous_best_published_at

    def get_effective_published_grade(self) -> tuple[float | None, str, str]:
        """Returns (score, grade_source, published_at) using Highest Score Wins across published attempts."""
        return resolve_peer_effective_grade(
            status=self.status,
            final_score=self.final_score,
            grade_source=self.grade_source,
            published_at=self.published_at,
            previous_best_score=self.previous_best_score,
            previous_best_grade_source=self.previous_best_grade_source,
            previous_best_published_at=self.previous_best_published_at,
        )

    def prepare_resubmission(
        self,
        *,
        submission_url: str,
        text_content: str,
        now: datetime,
        essay_mode: str,
        max_attempts: int = MAX_PEER_SUBMISSION_ATTEMPTS,
    ) -> None:
        """Validates resubmission guards, snapshots prior published best score, resets current grading state, and preserves completed review duty."""
        if self.attempt_number >= max_attempts:
            raise ValueError(f"Bạn đã đạt giới hạn tối đa {max_attempts} lần nộp bài.")
        if self.is_lock_active(now):
            raise ValueError(
                "Bài nộp của bạn đang được Giảng viên/Trợ giảng hoặc bạn học khóa để chấm điểm. "
                "Vui lòng đợi phiên chấm hoàn tất trước khi nộp lại."
            )

        if (
            self.status == PEER_SUBMISSION_STATUS_PUBLISHED
            and self.final_score is not None
            and (
                self.previous_best_score is None
                or self.final_score >= self.previous_best_score
            )
        ):
            self.previous_best_score = self.final_score
            self.previous_best_grade_source = self.grade_source
            self.previous_best_published_at = self.published_at

        self.attempt_number += 1
        self.submission_url = submission_url
        self.text_content = text_content
        self.created_at = now.isoformat()
        self.status = PEER_SUBMISSION_STATUS_SUBMITTED
        self.final_score = None
        self.graded_by_staff = False
        self.graded_by_user_id = None
        self.grader_role = None
        self.grade_source = "PEER_REVIEW"
        self.published_at = None
        self.staff_feedback = None
        self.rubric_scores_json = {}
        self.locked_by_user_id = None
        self.locked_at = None
        self.lock_expires_at = None

        if essay_mode == ESSAY_GRADING_MODE_INSTRUCTOR_ONLY:
            self.review_duty_status = REVIEW_DUTY_NOT_APPLICABLE
        elif self.review_duty_status not in (
            REVIEW_DUTY_COMPLETED,
            REVIEW_DUTY_WAIVED_EMPTY_POOL,
        ):
            self.review_duty_status = REVIEW_DUTY_PENDING

    def assign_grade(
        self,
        score: float,
        is_staff: bool = False,
        graded_by_user_id: str | None = None,
        grader_role: str | None = None,
        grade_source: str = "PEER_REVIEW",
        staff_feedback: str | None = None,
        rubric_scores_json: dict[str, Any] | None = None,
        appeal_resolution_notes: str | None = None,
    ) -> None:
        import math

        if not math.isfinite(score) or score < 0.0 or score > 100.0:
            raise ValueError(
                "Điểm số phải là số thực hữu hạn nằm trong khoảng từ 0 đến 100."
            )
        self.final_score = round(score, 2)
        self.graded_by_staff = is_staff
        if graded_by_user_id is not None:
            self.graded_by_user_id = graded_by_user_id
        if grader_role is not None:
            self.grader_role = grader_role
        self.grade_source = grade_source
        if staff_feedback is not None:
            self.staff_feedback = staff_feedback
        if rubric_scores_json is not None:
            self.rubric_scores_json = rubric_scores_json
        self.status = "GRADED"

        if is_staff and graded_by_user_id:
            eval_entry = {
                "staff_id": graded_by_user_id,
                "grader_role": grader_role or "TA",
                "grade_source": grade_source,
                "score": round(score, 2),
                "feedback": staff_feedback or "",
                "rubric_scores_json": rubric_scores_json or {},
                "graded_at": datetime.now(UTC).isoformat(),
                "appeal_resolution_notes": appeal_resolution_notes or "",
            }
            self.staff_evaluations_json.append(eval_entry)

    def is_lock_active(
        self, now: datetime, timeout_minutes: int = GRADING_LOCK_TIMEOUT_MINUTES
    ) -> bool:
        if not self.locked_by_user_id or not self.locked_at:
            return False
        try:
            lock_dt = datetime.fromisoformat(self.locked_at)
            if lock_dt.tzinfo is None and now.tzinfo is not None:
                lock_dt = lock_dt.replace(tzinfo=UTC)
            elif lock_dt.tzinfo is not None and now.tzinfo is None:
                lock_dt = lock_dt.replace(tzinfo=None)
            if now >= lock_dt + timedelta(minutes=timeout_minutes):
                return False
        except (ValueError, TypeError):
            return False

        if self.lock_expires_at:
            try:
                exp_dt = datetime.fromisoformat(self.lock_expires_at)
                if exp_dt.tzinfo is None and now.tzinfo is not None:
                    exp_dt = exp_dt.replace(tzinfo=UTC)
                elif exp_dt.tzinfo is not None and now.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=None)
                if now >= exp_dt:
                    return False
            except (ValueError, TypeError):
                pass

        return True

    def can_claim_lock(
        self,
        user_id: str,
        now: datetime,
        timeout_minutes: int = GRADING_LOCK_TIMEOUT_MINUTES,
    ) -> bool:
        if not self.is_lock_active(now, timeout_minutes):
            return True
        return self.locked_by_user_id == user_id

    def claim_lock(
        self,
        user_id: str,
        now: datetime,
        timeout_minutes: int = GRADING_LOCK_TIMEOUT_MINUTES,
    ) -> None:
        if not self.can_claim_lock(user_id, now, timeout_minutes):
            raise PermissionError("Bài nộp đang được nhân sự khác chấm.")
        self.locked_by_user_id = user_id
        self.locked_at = now.isoformat()
        self.lock_expires_at = (now + timedelta(minutes=timeout_minutes)).isoformat()

    def renew_lock(
        self,
        user_id: str,
        now: datetime,
        extend_minutes: int = GRADING_LOCK_TIMEOUT_MINUTES,
    ) -> None:
        if self.locked_by_user_id != user_id:
            raise PermissionError("Bạn không sở hữu khóa chấm bài này.")
        self.locked_at = now.isoformat()
        self.lock_expires_at = (now + timedelta(minutes=extend_minutes)).isoformat()

    def release_lock(self, user_id: str) -> None:
        if self.locked_by_user_id and self.locked_by_user_id != user_id:
            raise PermissionError("Bạn không thể nhả khóa của người khác.")
        self.locked_by_user_id = None
        self.locked_at = None
        self.lock_expires_at = None


class PeerReview(Entity):
    def __init__(
        self,
        id: str,
        submission_id: str,
        reviewer_user_id: str,
        item_id: str,
        rubric_criteria: list[RubricCriteria],
        total_score: float,
        is_outlier: bool = False,
        created_at: str | None = None,
        submission_attempt_number: int = 1,
    ) -> None:
        super().__init__(id=id)
        self.submission_id = submission_id
        self.reviewer_user_id = reviewer_user_id
        self.item_id = item_id
        self.rubric_criteria = rubric_criteria
        self.total_score = total_score
        self.is_outlier = is_outlier
        self.created_at = created_at
        self.submission_attempt_number = submission_attempt_number


class PeerReviewAssignment(Entity):
    """Server-side opaque grading assignment token binding a reviewer to an assigned submission."""

    def __init__(
        self,
        id: str,
        submission_id: str,
        reviewer_user_id: str,
        item_id: str,
        assigned_at: str,
        expires_at: str,
        status: str = PEER_ASSIGNMENT_STATUS_ASSIGNED,
        submission_attempt_number: int = 1,
    ) -> None:
        super().__init__(id=id)
        self.submission_id = submission_id
        self.reviewer_user_id = reviewer_user_id
        self.item_id = item_id
        self.assigned_at = assigned_at
        self.expires_at = expires_at
        self.status = status
        self.submission_attempt_number = submission_attempt_number

    def is_active(self, now: datetime) -> bool:
        if self.status != PEER_ASSIGNMENT_STATUS_ASSIGNED:
            return False
        try:
            exp_dt = datetime.fromisoformat(self.expires_at)
            if exp_dt.tzinfo is None and now.tzinfo is not None:
                exp_dt = exp_dt.replace(tzinfo=UTC)
            elif exp_dt.tzinfo is not None and now.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=None)
            return now < exp_dt
        except (ValueError, TypeError):
            return False

    def mark_completed(self) -> None:
        self.status = PEER_ASSIGNMENT_STATUS_COMPLETED


class GradeAppeal(Entity):
    def __init__(
        self,
        id: str,
        user_id: str,
        submission_id: str,
        appeal_reason: str,
        status: str = "PENDING",
        created_at: str | None = None,
        reviewer_id: str | None = None,
        final_score: float | None = None,
        rejection_reason: str | None = None,
    ) -> None:
        super().__init__(id=id)
        self.user_id = user_id
        self.submission_id = submission_id
        self.appeal_reason = appeal_reason
        self.status = status
        self.created_at = created_at
        self.reviewer_id = reviewer_id
        self.final_score = final_score
        self.rejection_reason = rejection_reason

    def approve(self, reviewer_id: str = "", final_score: float = 0.0) -> None:
        self.status = "APPROVED"
        self.reviewer_id = reviewer_id
        self.final_score = final_score

    def reject(self, reviewer_id: str = "", reason: str = "") -> None:
        if not reason or not reason.strip():
            raise ValueError("Lý do từ chối không được để trống.")
        self.status = "REJECTED"
        self.reviewer_id = reviewer_id
        self.rejection_reason = reason.strip()


class PeerReviewReport(Entity):
    """Learner report against an unfair, abusive, or spam peer review."""

    def __init__(
        self,
        id: str,
        peer_review_id: str,
        submission_id: str,
        reporter_user_id: str,
        reason: str,
        status: str = "PENDING_STAFF_REVIEW",
        created_at: str | None = None,
        reviewer_id: str | None = None,
        resolution_notes: str | None = None,
    ) -> None:
        super().__init__(id=id)
        self.peer_review_id = peer_review_id
        self.submission_id = submission_id
        self.reporter_user_id = reporter_user_id
        self.reason = reason
        self.status = status
        self.created_at = created_at
        self.reviewer_id = reviewer_id
        self.resolution_notes = resolution_notes

    def resolve(self, reviewer_id: str, notes: str = "") -> None:
        self.status = "RESOLVED"
        self.reviewer_id = reviewer_id
        if notes:
            self.resolution_notes = notes.strip()


@dataclass(frozen=True)
class QuestionOption(ValueObject):
    id: str
    question_id: str
    option_text: str
    is_correct: bool = False
    order_index: int = 0


class Question(Entity):
    def __init__(
        self,
        id: str,
        bank_id: str,
        text: str,
        question_type: str = "SINGLE_CHOICE",
        difficulty: str = "EASY",
        explanation: str = "",
        options: list[QuestionOption] | None = None,
        created_at: str | None = None,
        topic: str = "Tổng quan",
    ) -> None:
        super().__init__(id=id)
        self.bank_id = bank_id
        self.text = text
        self.question_type = question_type
        self.difficulty = difficulty
        self.explanation = explanation
        self.options = options or []
        self.created_at = created_at
        self.topic = topic


class QuestionBank(Entity):
    def __init__(
        self,
        id: str,
        course_id: str,
        title: str,
        category: str = "PRACTICE",
        description: str = "",
        questions: list[Question] | None = None,
        created_at: str | None = None,
    ) -> None:
        super().__init__(id=id)
        self.course_id = course_id
        self.title = title
        self.category = category
        self.description = description
        self.questions = questions or []
        self.created_at = created_at


@dataclass(frozen=True)
class QuizMatrix(ValueObject):
    item_id: str
    bank_id: str
    time_limit_minutes: int = DEFAULT_QUIZ_TIME_LIMIT_MINUTES
    passing_threshold_percent: float = DEFAULT_PASSING_THRESHOLD_PERCENT
    easy_count: int = DEFAULT_QUIZ_EASY_COUNT
    medium_count: int = DEFAULT_QUIZ_MEDIUM_COUNT
    hard_count: int = DEFAULT_QUIZ_HARD_COUNT
    shuffle_options: bool = True
    max_attempts: int = MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN
    cooldown_hours: int = QUIZ_COOLDOWN_HOURS


@dataclass(frozen=True)
class TopicMastery(ValueObject):
    topic: str
    total_questions: int
    correct_questions: int
    mastery_percent: float
    mastery_level: int  # 1: MASTERED, 2: NEEDS_PRACTICE, 3: WEAK_GAP
    recommendation: str


def calculate_topic_mastery(
    answers: list[QuizSubmissionAnswer],
) -> list[TopicMastery]:
    if not answers:
        return []
    topic_map: dict[str, list[QuizSubmissionAnswer]] = {}
    for ans in answers:
        t = ans.topic or "Tổng quan"
        topic_map.setdefault(t, []).append(ans)

    result: list[TopicMastery] = []
    for t_name, t_answers in sorted(topic_map.items()):
        total = len(t_answers)
        correct = sum(1 for a in t_answers if a.is_correct)
        percent = round((correct / total) * 100.0, 1) if total > 0 else 0.0

        if percent >= TOPIC_MASTERY_THRESHOLD_MASTERED:
            level = 1  # MASTERED
            rec = "Bạn đã nắm vững kiến thức chủ đề này."
        elif percent >= TOPIC_MASTERY_THRESHOLD_NEEDS_PRACTICE:
            level = 2  # NEEDS_PRACTICE
            rec = "Độ chính xác chưa đạt mức tối ưu, hãy xem lại ví dụ và bài giảng tương ứng."
        else:
            level = 3  # WEAK_GAP
            rec = "Lỗ hổng kiến thức trọng tâm! Cần dành thời gian ôn lại lý thuyết trước khi thi lại."

        result.append(
            TopicMastery(
                topic=t_name,
                total_questions=total,
                correct_questions=correct,
                mastery_percent=percent,
                mastery_level=level,
                recommendation=rec,
            )
        )
    return result


class AdminAssessmentAlertKind(StrEnum):
    GRADE_APPEAL = "GRADE_APPEAL"
    REPORTED_PEER_REVIEW = "REPORTED_PEER_REVIEW"
    OUTLIER_PEER_REVIEW = "OUTLIER_PEER_REVIEW"


@dataclass(frozen=True)
class AdminAssessmentAlert(ValueObject):
    """Unresolved grade appeal, reported peer review, or ungraded outlier review."""

    alert_id: str
    kind: AdminAssessmentAlertKind
    submission_id: str
    user_id: str
    user_name: str = ""
    reason: str = ""
    total_score: float = 0.0
    created_at: str = ""


@dataclass(frozen=True)
class AdminAssessmentAlertsPage(ValueObject):
    """Recent unresolved assessment quality alerts plus true un-truncated total."""

    alerts: tuple[AdminAssessmentAlert, ...] = ()
    total_count: int = 0


def resolve_peer_effective_grade(
    *,
    status: str | None,
    final_score: float | None,
    grade_source: str | None = None,
    published_at: str | None = None,
    previous_best_score: float | None = None,
    previous_best_grade_source: str | None = None,
    previous_best_published_at: str | None = None,
) -> tuple[float | None, str, str]:
    """Resolves the official published grade under Highest Score Wins across attempts."""
    if status == PEER_SUBMISSION_STATUS_PUBLISHED and final_score is not None:
        if previous_best_score is not None and previous_best_score > final_score:
            return (
                float(previous_best_score),
                previous_best_grade_source or "PEER_REVIEW",
                previous_best_published_at or "",
            )
        return (
            float(final_score),
            grade_source or "PEER_REVIEW",
            published_at or "",
        )
    if previous_best_score is not None:
        return (
            float(previous_best_score),
            previous_best_grade_source or "PEER_REVIEW",
            previous_best_published_at or "",
        )
    return None, "", ""


def normalize_grade_provenance(raw_source: str | None) -> str:
    """Normalizes internal grade_source string into UI provenance (INSTRUCTOR, TA, PEER)."""
    if not raw_source:
        return ""
    upper = raw_source.upper()
    if "INSTRUCTOR" in upper:
        return "INSTRUCTOR"
    if upper == "TA" or upper.endswith("_TA"):
        return "TA"
    return "PEER"


def check_peer_submission_pass_eligibility(
    *,
    item_title: str,
    status: str | None,
    final_score: float | None,
    review_duty_status: str | None,
    has_pending_appeal: bool,
    passing_threshold: float = DEFAULT_PASSING_THRESHOLD_PERCENT,
    previous_best_score: float | None = None,
) -> tuple[bool, str]:
    """Verify whether a peer-review submission satisfies publish, score, duty, and appeal rules."""
    effective_score, _, _ = resolve_peer_effective_grade(
        status=status,
        final_score=final_score,
        previous_best_score=previous_best_score,
    )
    if effective_score is None:
        return (
            False,
            f"Bài tập tự luận '{item_title}' chưa được công bố điểm chính thức (PUBLISHED).",
        )
    if effective_score < passing_threshold:
        return (
            False,
            f"Bài tập '{item_title}' chưa đạt điểm tối thiểu >= {int(passing_threshold)}% (Hiện tại {effective_score}%).",
        )
    if review_duty_status not in ELIGIBLE_REVIEW_DUTY_STATUSES:
        return (
            False,
            f"Bạn chưa hoàn thành nghĩa vụ chấm bài bạn học cho bài tập '{item_title}' (Trạng thái: {review_duty_status}).",
        )
    if has_pending_appeal:
        return (
            False,
            "Bạn đang có đơn khiếu nại/báo cáo bài chấm chéo chờ Trợ giảng thẩm định (Report Lock Rule).",
        )
    return True, ""
