from abc import ABC, abstractmethod
from typing import Any

from src.modules.assessment.domain.constants import GRADING_LOCK_TIMEOUT_MINUTES
from src.modules.assessment.domain.entities import (
    GradeAppeal,
    HonorCodeAgreement,
    LabSubmission,
    PeerAssignmentSubmission,
    PeerReview,
    Question,
    QuestionBank,
    QuizActiveSession,
    QuizCooldown,
    QuizMatrix,
    QuizSubmission,
    QuizSubmissionAnswer,
)


class AssessmentRepositoryInterface(ABC):
    @abstractmethod
    async def save_honor_code(self, agreement: HonorCodeAgreement) -> None:
        pass

    @abstractmethod
    async def get_honor_code(
        self, user_id: str, item_id: str
    ) -> HonorCodeAgreement | None:
        pass

    @abstractmethod
    async def save_quiz_submission(self, submission: QuizSubmission) -> None:
        pass

    @abstractmethod
    async def get_quiz_submissions(
        self, user_id: str, item_id: str
    ) -> list[QuizSubmission]:
        pass

    @abstractmethod
    async def get_quiz_submission_by_id(
        self, submission_id: str
    ) -> QuizSubmission | None:
        pass

    @abstractmethod
    async def save_quiz_submission_answers(
        self, answers: list[QuizSubmissionAnswer]
    ) -> None:
        pass

    @abstractmethod
    async def get_quiz_submission_answers(
        self, submission_id: str
    ) -> list[QuizSubmissionAnswer]:
        pass

    @abstractmethod
    async def get_quiz_submission_answers_for_user_item(
        self, user_id: str, item_id: str
    ) -> list[QuizSubmissionAnswer]:
        pass

    @abstractmethod
    async def get_quiz_cooldown(
        self, user_id: str, item_id: str
    ) -> QuizCooldown | None:
        pass

    @abstractmethod
    async def save_quiz_cooldown(self, cooldown: QuizCooldown) -> None:
        pass

    @abstractmethod
    async def get_quiz_active_session(
        self, user_id: str, item_id: str
    ) -> QuizActiveSession | None:
        pass

    @abstractmethod
    async def save_quiz_active_session(self, session: QuizActiveSession) -> None:
        pass

    @abstractmethod
    async def save_lab_submission(self, submission: LabSubmission) -> None:
        pass

    @abstractmethod
    async def get_lab_submissions(
        self, user_id: str, item_id: str
    ) -> list[LabSubmission]:
        pass

    @abstractmethod
    async def save_peer_submission(self, submission: PeerAssignmentSubmission) -> None:
        pass

    @abstractmethod
    async def get_peer_submission(
        self, submission_id: str
    ) -> PeerAssignmentSubmission | None:
        pass

    @abstractmethod
    async def get_user_peer_submission(
        self, user_id: str, item_id: str
    ) -> PeerAssignmentSubmission | None:
        pass

    @abstractmethod
    async def get_peer_submissions_for_item(
        self, item_id: str, exclude_user_id: str = ""
    ) -> list[PeerAssignmentSubmission]:
        pass

    @abstractmethod
    async def claim_submission_lock(
        self,
        submission_id: str,
        user_id: str,
        timeout_minutes: int = GRADING_LOCK_TIMEOUT_MINUTES,
    ) -> bool:
        """Atomically claims a soft lock on a submission if unlocked, already held by user, or expired."""

    @abstractmethod
    async def renew_submission_lock(
        self,
        submission_id: str,
        user_id: str,
        timeout_minutes: int = GRADING_LOCK_TIMEOUT_MINUTES,
    ) -> bool:
        """Renews an active soft lock held by user."""

    @abstractmethod
    async def release_submission_lock(
        self,
        submission_id: str,
        user_id: str | None = None,
    ) -> bool:
        """Releases the soft lock on a submission."""

    @abstractmethod
    async def save_peer_review(self, review: PeerReview) -> None:
        pass

    @abstractmethod
    async def get_peer_reviews_by_reviewer(
        self, reviewer_user_id: str, item_id: str
    ) -> list[PeerReview]:
        pass

    @abstractmethod
    async def get_peer_reviews_for_submission(
        self, submission_id: str
    ) -> list[PeerReview]:
        pass

    @abstractmethod
    async def save_grade_appeal(self, appeal: GradeAppeal) -> None:
        pass

    @abstractmethod
    async def get_grade_appeal(self, submission_id: str) -> GradeAppeal | None:
        pass

    @abstractmethod
    async def create_question_bank(
        self, course_id: str, title: str, category: str, description: str
    ) -> QuestionBank:
        pass

    @abstractmethod
    async def list_question_banks(self, course_id: str) -> list[QuestionBank]:
        pass

    @abstractmethod
    async def add_question_to_bank(
        self,
        bank_id: str,
        text: str,
        question_type: str,
        difficulty: str,
        explanation: str,
        options_data: list[dict],
        topic: str = "Tổng quan",
    ) -> Question:
        pass

    @abstractmethod
    async def delete_question(self, question_id: str) -> bool:
        pass

    @abstractmethod
    async def get_any_questions(self, limit: int = 20) -> list[Question]:
        pass

    @abstractmethod
    async def update_question(
        self,
        question_id: str,
        text: str,
        question_type: str,
        difficulty: str,
        explanation: str,
        options_data: list[dict],
        topic: str = "Tổng quan",
    ) -> Question:
        pass

    @abstractmethod
    async def configure_quiz_matrix(
        self,
        item_id: str,
        bank_id: str,
        time_limit_minutes: int,
        passing_threshold_percent: float,
        easy_count: int,
        medium_count: int,
        hard_count: int,
        shuffle_options: bool,
        max_attempts: int,
        cooldown_hours: int,
    ) -> QuizMatrix:
        pass

    @abstractmethod
    async def get_quiz_matrix(self, item_id: str) -> QuizMatrix | None:
        pass

    @abstractmethod
    async def get_item_type(self, item_id: str) -> str:
        pass

    @abstractmethod
    async def get_questions_by_bank(self, bank_id: str) -> list[Question]:
        pass

    @abstractmethod
    async def get_course_id_by_item_id(self, item_id: str) -> str | None:
        pass

    @abstractmethod
    async def get_course_id_by_bank_id(self, bank_id: str) -> str | None:
        pass

    @abstractmethod
    async def get_course_id_by_question_id(self, question_id: str) -> str | None:
        pass

    @abstractmethod
    async def get_lab_test_cases_json(self, item_id: str) -> str | None:
        pass

    @abstractmethod
    async def get_item_rubric_criteria_json(self, item_id: str) -> str | None:
        pass

    @abstractmethod
    async def list_grading_queue_items(
        self,
        course_id: str = "",
        item_id: str = "",
        instructor_id: str = "",
    ) -> list[dict[str, Any]]:
        """Lists grading queue items for peer assignments across course or specific item."""

    @abstractmethod
    async def get_course_gradebook_data(
        self,
        course_id: str,
        search_query: str = "",
        status_filter: str = "",
        page_size: int = 50,
        page_token: str = "",
    ) -> dict[str, Any]:
        """Queries enrolled students and batch queries assessment results across Quiz, Lab,
        and Peer/Staff Assignments to construct the course gradebook matrix.
        """
