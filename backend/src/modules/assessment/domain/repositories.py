from abc import ABC, abstractmethod
from typing import Optional
from src.modules.assessment.domain.entities import (
    GradeAppeal,
    HonorCodeAgreement,
    LabSubmission,
    PeerAssignmentSubmission,
    PeerReview,
    QuizCooldown,
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
        self, item_id: str, exclude_user_id: str
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
