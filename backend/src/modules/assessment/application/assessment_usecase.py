import logging
from collections.abc import Callable
from typing import Any

from src.modules.assessment.application.base_usecase import BaseAssessmentUseCase
from src.modules.assessment.application.coding_lab_usecase import CodingLabUseCase
from src.modules.assessment.application.grade_appeal_usecase import GradeAppealUseCase
from src.modules.assessment.application.peer_review_usecase import PeerReviewUseCase
from src.modules.assessment.application.quiz_usecase import (
    QuizUseCase,
    _clean_explanation,
)
from src.modules.assessment.domain.repositories import AssessmentRepositoryInterface
from src.modules.assessment.infrastructure.repository import (
    SQLAlchemyAssessmentRepository,
)
from src.modules.assessment.infrastructure.sandbox_service import (
    PythonCodeSandboxExecutor,
)

logger = logging.getLogger(__name__)

__all__ = [
    "AssessmentUseCase",
    "BaseAssessmentUseCase",
    "CodingLabUseCase",
    "GradeAppealUseCase",
    "PeerReviewUseCase",
    "QuizUseCase",
    "SQLAlchemyAssessmentRepository",
    "_clean_explanation",
]


class AssessmentUseCase(
    QuizUseCase,
    CodingLabUseCase,
    PeerReviewUseCase,
    GradeAppealUseCase,
):
    """Application Use Case coordinator and unified Facade for Assessment domain."""

    def __init__(
        self,
        repository: AssessmentRepositoryInterface | None = None,
        repo_factory: Callable[[Any], AssessmentRepositoryInterface] | None = None,
        sandbox_executor: PythonCodeSandboxExecutor | None = None,
    ) -> None:
        super().__init__(
            repository=repository,
            repo_factory=repo_factory,
            sandbox_executor=sandbox_executor,
        )

        # Composition sub-usecases for direct modular access
        self.quiz_uc = QuizUseCase(
            repository=self.repository,
            repo_factory=self.repo_factory,
            sandbox_executor=self.sandbox_executor,
        )
        self.coding_lab_uc = CodingLabUseCase(
            repository=self.repository,
            repo_factory=self.repo_factory,
            sandbox_executor=self.sandbox_executor,
        )
        self.peer_review_uc = PeerReviewUseCase(
            repository=self.repository,
            repo_factory=self.repo_factory,
            sandbox_executor=self.sandbox_executor,
        )
        self.grade_appeal_uc = GradeAppealUseCase(
            repository=self.repository,
            repo_factory=self.repo_factory,
            sandbox_executor=self.sandbox_executor,
        )
