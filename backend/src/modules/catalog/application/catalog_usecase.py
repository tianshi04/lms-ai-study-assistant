import logging
from collections.abc import Callable
from typing import Any

from src.modules.catalog.application.collaborator_usecase import (
    CourseCollaboratorUseCase,
    _default_identity_repo_factory,
)
from src.modules.catalog.application.course_review_usecase import (
    CourseReviewUseCase,
    _default_learning_repo_factory,
)
from src.modules.catalog.application.course_usecase import (
    CourseUseCase,
)
from src.modules.catalog.application.curriculum_usecase import (
    CurriculumUseCase,
)
from src.modules.catalog.application.scorm_usecase import (
    ScormUseCase,
)
from src.modules.catalog.domain.repository import ICatalogRepository
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.learning.domain.repository import ILearningRepository
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.s3_storage import get_s3_storage_service

logger = logging.getLogger(__name__)

__all__ = [
    "CatalogUseCase",
    "CourseCollaboratorUseCase",
    "CourseReviewUseCase",
    "CourseUseCase",
    "CurriculumUseCase",
    "SQLAlchemyCatalogRepository",
    "ScormUseCase",
    "_default_identity_repo_factory",
    "_default_learning_repo_factory",
    "async_session_scope",
    "get_s3_storage_service",
]


class CatalogUseCase(
    CourseUseCase,
    CurriculumUseCase,
    ScormUseCase,
    CourseReviewUseCase,
    CourseCollaboratorUseCase,
):
    """Application Use Case coordinator and unified Facade for Catalog domain."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ICatalogRepository] | None = None,
        learning_repo_factory: Callable[[Any], ILearningRepository] | None = None,
        identity_repo_factory: Callable[[Any], Any] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyCatalogRepository(session)
        )
        self.learning_repo_factory = (
            learning_repo_factory or _default_learning_repo_factory
        )
        self.identity_repo_factory = (
            identity_repo_factory or _default_identity_repo_factory
        )

        # Composition sub-usecases for modular access
        self.course_uc = CourseUseCase(repo_factory=self.repo_factory)
        self.curriculum_uc = CurriculumUseCase(repo_factory=self.repo_factory)
        self.scorm_uc = ScormUseCase(repo_factory=self.repo_factory)
        self.review_uc = CourseReviewUseCase(
            repo_factory=self.repo_factory,
            learning_repo_factory=self.learning_repo_factory,
        )
        self.collaborator_uc = CourseCollaboratorUseCase(
            repo_factory=self.repo_factory,
            identity_repo_factory=self.identity_repo_factory,
        )
