import logging
from collections.abc import Callable
from typing import Any

from src.modules.catalog.application.helpers import verify_catalog_course_ownership
from src.modules.catalog.domain import ICatalogRepository
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.learning.domain import ILearningRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope
from src.shared.infrastructure.s3_storage import get_s3_storage_service
from src.shared.permissions import CoursePermission

from .collaborator_usecase import (
    CourseCollaboratorUseCase,
    _default_identity_repo_factory,
)
from .course_review_usecase import (
    CourseReviewUseCase,
    _default_learning_repo_factory,
)
from .course_usecase import CourseUseCase
from .curriculum_usecase import CurriculumUseCase
from .scorm_usecase import ScormUseCase

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

    async def _verify_ownership(
        self,
        repo: ICatalogRepository,
        course_id: str,
        user: CurrentUser | None,
        action_name: str = "quản lý khóa học",
        allow_read_only_pending: bool = False,
        required_permission: CoursePermission | None = None,
        disallow_published_mutation: bool = False,
    ):
        return await verify_catalog_course_ownership(
            repo=repo,
            course_id=course_id,
            user=user,
            action_name=action_name,
            allow_read_only_pending=allow_read_only_pending,
            required_permission=required_permission,
            disallow_published_mutation=disallow_published_mutation,
        )

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
