import logging
from collections.abc import Callable
from dataclasses import replace
from typing import Any

from src.modules.assessment.domain import (
    ADMIN_ASSESSMENT_ALERT_LIMIT,
    AdminAssessmentAlertsPage,
    AssessmentRepositoryInterface,
)
from src.modules.assessment.infrastructure.repository import (
    SQLAlchemyAssessmentRepository,
)
from src.modules.assessment.infrastructure.sandbox_service import (
    PythonCodeSandboxExecutor,
)
from src.modules.identity.domain import IIdentityRepository
from src.shared.auth import CurrentUser
from src.shared.domain import ADMIN_REQUIRED_MESSAGE
from src.shared.infrastructure.database import async_session_scope

from .base_usecase import BaseAssessmentUseCase
from .coding_lab_usecase import CodingLabUseCase
from .grade_appeal_usecase import GradeAppealUseCase
from .gradebook_usecase import CourseGradebookUseCase
from .peer_review_usecase import PeerReviewUseCase
from .quiz_usecase import QuizUseCase, _clean_explanation

logger = logging.getLogger(__name__)

__all__ = [
    "AssessmentUseCase",
    "BaseAssessmentUseCase",
    "CodingLabUseCase",
    "CourseGradebookUseCase",
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
    CourseGradebookUseCase,
):
    """Application Use Case coordinator and unified Facade for Assessment domain."""

    def __init__(
        self,
        repository: AssessmentRepositoryInterface | None = None,
        repo_factory: Callable[[Any], AssessmentRepositoryInterface] | None = None,
        sandbox_executor: PythonCodeSandboxExecutor | None = None,
        catalog_repo_factory: Callable[[Any], Any] | None = None,
        identity_repo_factory: Callable[[Any], IIdentityRepository] | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(
            repository=repository,
            repo_factory=repo_factory,
            sandbox_executor=sandbox_executor,
            catalog_repo_factory=catalog_repo_factory,
            identity_repo_factory=identity_repo_factory,
            **kwargs,
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

    async def list_admin_assessment_alerts(
        self, current_user: CurrentUser
    ) -> AdminAssessmentAlertsPage:
        if not current_user.is_admin:
            raise PermissionError(ADMIN_REQUIRED_MESSAGE)
        if self.identity_repo_factory is None:
            raise RuntimeError(
                "AssessmentUseCase requires identity_repo_factory to be configured at the composition root."
            )
        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            alerts, total_count = await repo.list_admin_assessment_alerts(
                ADMIN_ASSESSMENT_ALERT_LIMIT
            )
            if not alerts:
                return AdminAssessmentAlertsPage(alerts=(), total_count=total_count)
            identity_repo = self.identity_repo_factory(session)
            user_names = await identity_repo.get_user_names_by_ids(
                list({a.user_id for a in alerts if a.user_id})
            )
        enriched = tuple(
            replace(a, user_name=user_names.get(a.user_id, "")) for a in alerts
        )
        return AdminAssessmentAlertsPage(alerts=enriched, total_count=total_count)
