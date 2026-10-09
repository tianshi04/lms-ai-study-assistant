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


class BaseAssessmentUseCase:
    """Base Use Case providing shared repository resolution, sandbox execution, and staff checks."""

    def __init__(
        self,
        repository: AssessmentRepositoryInterface | None = None,
        repo_factory: Callable[[Any], AssessmentRepositoryInterface] | None = None,
        sandbox_executor: PythonCodeSandboxExecutor | None = None,
    ) -> None:
        self.repository = repository
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyAssessmentRepository(session)
        )
        self.sandbox_executor = sandbox_executor or PythonCodeSandboxExecutor()

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
