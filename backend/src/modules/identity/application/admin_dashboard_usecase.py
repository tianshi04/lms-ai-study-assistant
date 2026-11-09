import logging
from collections.abc import Callable
from typing import Any

from src.modules.identity.domain import (
    ADMIN_DASHBOARD_PAGE_SIZE_DEFAULT,
    ADMIN_DASHBOARD_PAGE_SIZE_MAX,
    ADMIN_DASHBOARD_SEARCH_MAX_LENGTH,
    AdminCertificatesPage,
    AdminCourseMetricsPage,
    AdminDashboardStats,
    IAdminDashboardRepository,
)
from src.shared.auth import CurrentUser
from src.shared.infrastructure import database

logger = logging.getLogger(__name__)

_ADMIN_REQUIRED_MESSAGE = (
    "Yêu cầu quyền Quản trị viên (Admin) để xem thống kê hệ thống."
)


def _default_repo_factory(session: Any) -> IAdminDashboardRepository:
    from src.modules.identity.infrastructure.admin_dashboard_repository import (
        AdminDashboardRepository,
    )

    return AdminDashboardRepository(session)


def _normalize_paging(page: int, page_size: int) -> tuple[int, int]:
    """Clamp client-supplied paging arguments to safe values.

    A ``page`` below 1 falls back to the first page, an unset ``page_size`` falls
    back to the default, and ``page_size`` is capped at the maximum.
    """
    effective_page = max(page, 1)
    effective_page_size = (
        ADMIN_DASHBOARD_PAGE_SIZE_DEFAULT
        if page_size <= 0
        else min(page_size, ADMIN_DASHBOARD_PAGE_SIZE_MAX)
    )
    return effective_page, effective_page_size


def _normalize_search(search_query: str) -> str:
    """Trim a client-supplied search term and cap its length."""
    return search_query.strip()[:ADMIN_DASHBOARD_SEARCH_MAX_LENGTH]


class AdminDashboardUseCase:
    """Platform-wide statistics for the Super Admin dashboard."""

    def __init__(
        self, repo_factory: Callable[[Any], IAdminDashboardRepository] | None = None
    ) -> None:
        self.repo_factory = repo_factory or _default_repo_factory

    @staticmethod
    def _require_admin(current_user: CurrentUser) -> None:
        if not current_user.is_admin:
            raise PermissionError(_ADMIN_REQUIRED_MESSAGE)

    async def get_dashboard_stats(
        self, current_user: CurrentUser
    ) -> AdminDashboardStats:
        self._require_admin(current_user)
        async with database.async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.get_dashboard_stats()

    async def list_course_metrics(
        self,
        current_user: CurrentUser,
        page: int = 1,
        page_size: int = 0,
        search_query: str = "",
        status: str | None = None,
    ) -> AdminCourseMetricsPage:
        """Return one page of per-course metrics, highest revenue first.

        ``status`` is an optional course lifecycle status (``None`` means all).
        """
        self._require_admin(current_user)
        effective_page, effective_page_size = _normalize_paging(page, page_size)
        async with database.async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_course_metrics(
                effective_page,
                effective_page_size,
                _normalize_search(search_query),
                status,
            )

    async def list_certificates(
        self,
        current_user: CurrentUser,
        page: int = 1,
        page_size: int = 0,
        search_query: str = "",
        is_revoked: bool | None = None,
    ) -> AdminCertificatesPage:
        """Return one page of certificates (valid first, then revoked).

        ``is_revoked`` keeps only revoked (``True``) or valid (``False``)
        certificates; ``None`` returns both.
        """
        self._require_admin(current_user)
        effective_page, effective_page_size = _normalize_paging(page, page_size)
        async with database.async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.list_certificates(
                effective_page,
                effective_page_size,
                _normalize_search(search_query),
                is_revoked,
            )

    async def acknowledge_low_review(
        self, current_user: CurrentUser, review_id: str
    ) -> None:
        """Mark a low-rating review as looked at so it leaves the alert list.

        The review comes back to the list if its author edits it afterwards.
        """
        self._require_admin(current_user)
        clean_review_id = review_id.strip()
        if not clean_review_id:
            raise ValueError("Thiếu mã đánh giá cần xác nhận.")
        async with database.async_session_scope() as session:
            repo = self.repo_factory(session)
            found = await repo.acknowledge_low_review(clean_review_id, current_user.id)
        if not found:
            raise ValueError("Không tìm thấy đánh giá cần xác nhận.")
