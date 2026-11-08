import logging
from collections.abc import Callable
from typing import Any

from src.modules.assessment.domain import AssessmentRepositoryInterface
from src.modules.catalog.domain import ICatalogRepository
from src.shared.auth import CurrentUser, CurrentUserContext
from src.shared.infrastructure.database import async_session_scope
from src.shared.permissions import CoursePermission, enforce_course_ownership

from .base_usecase import BaseAssessmentUseCase

logger = logging.getLogger(__name__)


def _default_catalog_repo_factory(session: Any) -> ICatalogRepository:
    from src.modules.catalog.infrastructure.repository import (
        SQLAlchemyCatalogRepository,
    )

    return SQLAlchemyCatalogRepository(session)


class CourseGradebookUseCase(BaseAssessmentUseCase):
    """Application Use Case for Course Gradebook matrix generation and grading governance (BR_GRADE_001, BR_GRADE_002, BR_GRADE_004)."""

    def __init__(
        self,
        repository: AssessmentRepositoryInterface | None = None,
        repo_factory: Callable[[Any], AssessmentRepositoryInterface] | None = None,
        sandbox_executor: Any | None = None,
        catalog_repo_factory: Callable[[Any], ICatalogRepository] | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(
            repository=repository,
            repo_factory=repo_factory,
            sandbox_executor=sandbox_executor,
            **kwargs,
        )
        self.catalog_repo_factory = (
            catalog_repo_factory or _default_catalog_repo_factory
        )

    async def get_course_gradebook(
        self,
        course_id: str,
        search_query: str = "",
        status_filter: str = "",
        page_size: int = 50,
        page_token: str = "",
        current_user: CurrentUser | None = None,
    ) -> dict[str, Any]:
        """Queries enrolled students and batch queries assessment results across Quiz, Lab,

        and Peer/Staff Assignments to construct the course gradebook matrix.
        Enforces CoursePermission.GRADE_ASSESSMENTS via ReBAC.
        """
        async with async_session_scope() as session:
            # 1. Verify ReBAC permissions
            if current_user is not None:
                catalog_repo = self.catalog_repo_factory(session)
                course = await catalog_repo.get_course_detail(course_id)
                if not course:
                    raise ValueError(f"Khóa học {course_id} không tồn tại.")
                user_ctx = CurrentUserContext(
                    id=current_user.id,
                    email=current_user.email,
                    role=current_user.role,
                )
                enforce_course_ownership(
                    course,
                    user_ctx,
                    required_permission=CoursePermission.GRADE_ASSESSMENTS,
                    action_name="truy cập Sổ điểm (Course Gradebook)",
                )

            # 2. Delegate batch data querying to repository
            repo = await self._get_repo(session)
            return await repo.get_course_gradebook_data(
                course_id=course_id,
                search_query=search_query,
                status_filter=status_filter,
                page_size=page_size,
                page_token=page_token,
            )
