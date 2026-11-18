from collections.abc import Callable
from typing import Any

from src.modules.catalog.domain import (
    AdminCatalogStats,
    AdminCatalogTrendPoint,
    AdminCourseMetricsPage,
    AdminCourseQualityMetric,
    CourseStatus,
    ICatalogRepository,
    OrganizationCatalogStats,
)
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.identity.domain import IOrganizationRepository
from src.modules.learning.domain import ILearningRepository
from src.modules.payment.domain import IPaymentRepository
from src.shared.auth import CurrentUser
from src.shared.domain import (
    ADMIN_PAGE_SIZE_DEFAULT,
    ADMIN_REQUIRED_MESSAGE,
    build_trend_window,
    normalize_admin_paging,
    normalize_admin_search,
    normalize_trend_days,
)
from src.shared.infrastructure.database import async_session_scope
from src.shared.permissions import (
    OrgPermission,
    enforce_strict_organization_permission,
)


class AdminCatalogUseCase:
    """Super Admin & Organization catalog statistics, course quality metrics, and review triage."""

    def __init__(
        self,
        repo_factory: Callable[[Any], ICatalogRepository] | None = None,
        learning_repo_factory: Callable[[Any], ILearningRepository] | None = None,
        payment_repo_factory: Callable[[Any], IPaymentRepository] | None = None,
        org_repo_factory: Callable[[Any], IOrganizationRepository] | None = None,
    ) -> None:
        self.repo_factory = repo_factory or (
            lambda session: SQLAlchemyCatalogRepository(session)
        )
        self.learning_repo_factory = learning_repo_factory
        self.payment_repo_factory = payment_repo_factory
        self.org_repo_factory = org_repo_factory

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

    async def get_admin_catalog_trend(
        self, current_user: CurrentUser, days: int = 0
    ) -> list[AdminCatalogTrendPoint]:
        self._require_admin(current_user)
        window = build_trend_window(normalize_trend_days(days))
        async with async_session_scope() as session:
            repo = self.repo_factory(session)
            return await repo.get_admin_review_trend(window)

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

    async def _resolve_and_authorize_organization(
        self,
        session: Any,
        current_user: CurrentUser | None,
        organization_id: str,
    ) -> str:
        clean_org_id = (organization_id or "").strip()
        org = None
        if clean_org_id and self.org_repo_factory is not None:
            org = await self.org_repo_factory(session).get_organization_by_id(
                clean_org_id
            )
        target_org_id = org.id if org else clean_org_id
        await enforce_strict_organization_permission(
            session,
            current_user,
            target_org_id,
            required_permission=OrgPermission.VIEW_ANALYTICS,
        )
        if self.org_repo_factory is not None and not org:
            raise KeyError(f"Không tìm thấy tổ chức '{clean_org_id}'")
        return target_org_id

    async def get_organization_catalog_stats(
        self,
        current_user: CurrentUser | None,
        organization_id: str,
    ) -> OrganizationCatalogStats:
        async with async_session_scope() as session:
            target_org_id = await self._resolve_and_authorize_organization(
                session, current_user, organization_id
            )
            repo = self.repo_factory(session)
            return await repo.get_organization_catalog_stats(target_org_id)

    async def list_organization_course_metrics(
        self,
        current_user: CurrentUser | None,
        organization_id: str,
        page: int = 1,
        page_size: int = ADMIN_PAGE_SIZE_DEFAULT,
        search_query: str = "",
        status: CourseStatus | None = None,
    ) -> AdminCourseMetricsPage:
        if self.learning_repo_factory is None or self.payment_repo_factory is None:
            raise RuntimeError(
                "AdminCatalogUseCase requires learning_repo_factory and payment_repo_factory to be configured at the composition root."
            )
        effective_page, effective_page_size = normalize_admin_paging(page, page_size)
        normalized_search = normalize_admin_search(search_query)

        async with async_session_scope() as session:
            target_org_id = await self._resolve_and_authorize_organization(
                session, current_user, organization_id
            )
            repo = self.repo_factory(session)
            summaries = await repo.list_organization_course_summaries(
                target_org_id,
                normalized_search,
                status,
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
