from dataclasses import dataclass
from typing import Optional
from src.modules.assessment.domain.constants import (
    DEFAULT_PASSING_THRESHOLD_PERCENT,
    DEFAULT_QUIZ_EASY_COUNT,
    DEFAULT_QUIZ_HARD_COUNT,
    DEFAULT_QUIZ_MEDIUM_COUNT,
    DEFAULT_QUIZ_TIME_LIMIT_MINUTES,
    MAX_QUIZ_ATTEMPTS_BEFORE_COOLDOWN,
    QUIZ_COOLDOWN_HOURS,
)
from src.shared.domain.base import Entity, ValueObject


@dataclass(frozen=True)
class RubricCriteria(ValueObject):
    criteria_id: str
    title: str
    max_score: float
    score_given: float = 0.0
    feedback: str = ""


class HonorCodeAgreement(Entity):
    def __init__(
        self,
        user_id: str,
        item_id: str,
        is_agreed: bool = True,
        agreed_at: Optional[str] = None,
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


class QuizCooldown(Entity):
    def __init__(
        self,
        user_id: str,
        item_id: str,
        failed_attempts_count: int = 0,
        last_attempt_at: Optional[str] = None,
        cooldown_until: Optional[str] = None,
    ) -> None:
        super().__init__(id=f"{user_id}:{item_id}")
        self.user_id = user_id
        self.item_id = item_id
        self.failed_attempts_count = failed_attempts_count
        self.last_attempt_at = last_attempt_at
        self.cooldown_until = cooldown_until


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
        final_score: Optional[float] = None,
        graded_by_staff: bool = False,
    ) -> None:
        super().__init__(id=id)
        self.user_id = user_id
        self.item_id = item_id
        self.submission_url = submission_url
        self.text_content = text_content
        self.created_at = created_at
        self.final_score = final_score
        self.graded_by_staff = graded_by_staff


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
        created_at: Optional[str] = None,
    ) -> None:
        super().__init__(id=id)
        self.submission_id = submission_id
        self.reviewer_user_id = reviewer_user_id
        self.item_id = item_id
        self.rubric_criteria = rubric_criteria
        self.total_score = total_score
        self.is_outlier = is_outlier
        self.created_at = created_at


class GradeAppeal(Entity):
    def __init__(
        self,
        id: str,
        user_id: str,
        submission_id: str,
        appeal_reason: str,
        status: str = "PENDING",
        created_at: Optional[str] = None,
    ) -> None:
        super().__init__(id=id)
        self.user_id = user_id
        self.submission_id = submission_id
        self.appeal_reason = appeal_reason
        self.status = status
        self.created_at = created_at


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
        options: Optional[list[QuestionOption]] = None,
        created_at: Optional[str] = None,
    ) -> None:
        super().__init__(id=id)
        self.bank_id = bank_id
        self.text = text
        self.question_type = question_type
        self.difficulty = difficulty
        self.explanation = explanation
        self.options = options or []
        self.created_at = created_at


class QuestionBank(Entity):
    def __init__(
        self,
        id: str,
        course_id: str,
        title: str,
        category: str = "PRACTICE",
        description: str = "",
        questions: Optional[list[Question]] = None,
        created_at: Optional[str] = None,
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
