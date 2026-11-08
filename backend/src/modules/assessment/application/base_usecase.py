import logging
from collections.abc import Callable
from typing import Any

from src.modules.assessment.domain import AssessmentRepositoryInterface
from src.modules.assessment.infrastructure.repository import (
    SQLAlchemyAssessmentRepository,
)
from src.modules.assessment.infrastructure.sandbox_service import (
    PythonCodeSandboxExecutor,
)
from src.shared.auth import CurrentUser

logger = logging.getLogger(__name__)


def _default_catalog_repo_factory(session: Any) -> Any:
    from src.modules.catalog.infrastructure.repository import (
        SQLAlchemyCatalogRepository,
    )

    return SQLAlchemyCatalogRepository(session)


class BaseAssessmentUseCase:
    """Base Use Case providing shared repository resolution, sandbox execution, and staff checks."""

    def __init__(
        self,
        repository: AssessmentRepositoryInterface | None = None,
        repo_factory: Callable[[Any], AssessmentRepositoryInterface] | None = None,
        sandbox_executor: PythonCodeSandboxExecutor | None = None,
        catalog_repo_factory: Callable[[Any], Any] | None = None,
        **_kwargs: Any,
    ) -> None:
        self.repository = repository
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyAssessmentRepository(session)
        )
        self.sandbox_executor = sandbox_executor or PythonCodeSandboxExecutor()
        self.catalog_repo_factory = (
            catalog_repo_factory or _default_catalog_repo_factory
        )

    def _verify_staff(self, current_user: CurrentUser | None) -> None:
        if current_user is not None and not current_user.is_staff:
            raise PermissionError(
                "Chỉ Trợ giảng (TA) hoặc Giảng viên mới có quyền quản lý đánh giá."
            )

    async def _get_repo(self, session: Any) -> AssessmentRepositoryInterface:
        # If an explicit in-memory or mock repository was passed for unit testing, return it
        if self.repository is not None and not isinstance(
            self.repository, SQLAlchemyAssessmentRepository
        ):
            return self.repository
        # For production database operations, always instantiate a fresh repository bound to active session
        return self.repo_factory(session)

    async def get_course_for_item_or_submission(
        self,
        course_id: str = "",
        item_id: str = "",
        submission_id: str = "",
    ) -> Any:
        from src.shared.infrastructure.database import async_session_scope

        async with async_session_scope() as session:
            repo = await self._get_repo(session)
            catalog_repo = self.catalog_repo_factory(session)

            resolved_course_id = course_id
            if not resolved_course_id and submission_id:
                sub = await repo.get_peer_submission(submission_id)
                if not sub:
                    raise ValueError(f"Bài nộp {submission_id} không tồn tại.")
                resolved_course_id = (
                    await repo.get_course_id_by_item_id(sub.item_id) or ""
                )
            elif not resolved_course_id and item_id:
                resolved_course_id = await repo.get_course_id_by_item_id(item_id) or ""

            if not resolved_course_id:
                raise ValueError("Không tìm thấy thông tin khóa học liên quan.")

            course = await catalog_repo.get_course_detail(resolved_course_id)
            if not course:
                raise ValueError(f"Khóa học {resolved_course_id} không tồn tại.")
            return course
