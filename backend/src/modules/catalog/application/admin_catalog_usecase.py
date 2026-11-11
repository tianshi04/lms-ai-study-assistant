from collections.abc import Callable
from typing import Any

from src.modules.catalog.domain import (
    AdminCatalogStats,
    AdminCourseMetricsPage,
    AdminCourseQualityMetric,
    CourseStatus,
    ICatalogRepository,
)
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.learning.domain import ILearningRepository
from src.modules.payment.domain import IPaymentRepository
from src.shared.auth import CurrentUser
from src.shared.domain import (
    ADMIN_PAGE_SIZE_DEFAULT,
    ADMIN_REQUIRED_MESSAGE,
    normalize_admin_paging,
    normalize_admin_search,
)
from src.shared.infrastructure.database import async_session_scope


class AdminCatalogUseCase:
    """Super Admin catalog statistics, course quality metrics, and review triage."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ICatalogRepository] | None = None,
        learning_repo_factory: Callable[[Any], ILearningRepository] | None = None,
        payment_repo_factory: Callable[[Any], IPaymentRepository] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyCatalogRepository(session)
        )
        self.learning_repo_factory = learning_repo_factory
        self.payment_repo_factory = payment_repo_factory

    @staticmethod
    def _require_admin(current_user: CurrentUser) -> None:
        if not current_user.is_admin:
            raise PermissionError(ADMIN_REQUIRED_MESSAGE)

    async def get_admin_catalog_stats(
        self, current_user: CurrentUser
    ) -> AdminCatalogStats:
        self._require_admin(current_user)
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.get_admin_catalog_stats()

    async def list_admin_course_metrics(
        self,
        current_user: CurrentUser,
        page: int = 1,
        page_size: int = ADMIN_PAGE_SIZE_DEFAULT,
        search_query: str = "",
        status: CourseStatus | None = None,
    ) -> AdminCourseMetricsPage:
        self._require_admin(current_user)
        if self.learning_repo_factory is None or self.payment_repo_factory is None:
            raise RuntimeError(
                "AdminCatalogUseCase requires learning_repo_factory and payment_repo_factory to be configured at the composition root."
            )
        effective_page, effective_page_size = normalize_admin_paging(page, page_size)
        normalized_search = normalize_admin_search(search_query)

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            summaries = await repo.list_admin_course_summaries(
                normalized_search, status
            )
            if not summaries:
                return AdminCourseMetricsPage(
                    courses=(),
                    total_count=0,
                    page=effective_page,
                    page_size=effective_page_size,
                )
            course_ids = [s.course_id for s in summaries]
            revenues = await self.payment_repo_factory(
                session
            ).get_completed_revenue_by_course(course_ids)
            enrollments = await self.learning_repo_factory(
                session
            ).get_course_enrollment_counts(course_ids)

        metrics = [
            AdminCourseQualityMetric(
                course_id=s.course_id,
                title=s.title,
                partner_name=s.partner_name,
                status=s.status,
                enrolled_count=enrollments.get(s.course_id, (0, 0))[0],
                completed_count=enrollments.get(s.course_id, (0, 0))[1],
                average_rating=s.average_rating,
                review_count=s.review_count,
                revenue=revenues.get(s.course_id, 0.0),
            )
            for s in summaries
        ]
        metrics.sort(
            key=lambda m: (-m.revenue, -m.enrolled_count, m.title, m.course_id)
        )
        offset = (effective_page - 1) * effective_page_size
        page_slice = tuple(metrics[offset : offset + effective_page_size])
        return AdminCourseMetricsPage(
            courses=page_slice,
            total_count=len(metrics),
            page=effective_page,
            page_size=effective_page_size,
        )

    async def acknowledge_low_review(
        self, current_user: CurrentUser, review_id: str
    ) -> None:
        self._require_admin(current_user)
        cleaned_id = review_id.strip()
        if not cleaned_id:
            raise ValueError("Thiếu mã đánh giá cần xác nhận.")

        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            found = await repo.acknowledge_low_review(cleaned_id, current_user.id)
            if not found:
                raise ValueError("Không tìm thấy đánh giá cần xác nhận.")
