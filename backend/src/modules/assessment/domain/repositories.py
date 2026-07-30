from abc import ABC, abstractmethod
from typing import Optional
from src.modules.assessment.domain.entities import (
    GradeAppeal,
    HonorCodeAgreement,
    LabSubmission,
    PeerAssignmentSubmission,
    PeerReview,
    Question,
    QuestionBank,
    QuizCooldown,
    QuizMatrix,
    QuizSubmission,
)


class AssessmentRepositoryInterface(ABC):
    @abstractmethod
    async def save_honor_code(self, agreement: HonorCodeAgreement) -> None:
        pass

    @abstractmethod
    async def get_honor_code(
        self, user_id: str, item_id: str
    ) -> Optional[HonorCodeAgreement]:
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
    async def get_quiz_cooldown(
        self, user_id: str, item_id: str
    ) -> Optional[QuizCooldown]:
        pass

    @abstractmethod
    async def save_quiz_cooldown(self, cooldown: QuizCooldown) -> None:
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
    ) -> Optional[PeerAssignmentSubmission]:
        pass

    @abstractmethod
    async def get_user_peer_submission(
        self, user_id: str, item_id: str
    ) -> Optional[PeerAssignmentSubmission]:
        pass

    @abstractmethod
    async def get_peer_submissions_for_item(
        self, item_id: str, exclude_user_id: str = ""
    ) -> list[PeerAssignmentSubmission]:
        pass

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
    async def get_grade_appeal(self, submission_id: str) -> Optional[GradeAppeal]:
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
    ) -> Question:
        pass

    @abstractmethod
    async def delete_question(self, question_id: str) -> bool:
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
    async def get_quiz_matrix(self, item_id: str) -> Optional[QuizMatrix]:
        pass

    @abstractmethod
    async def get_questions_by_bank(self, bank_id: str) -> list[Question]:
        pass
