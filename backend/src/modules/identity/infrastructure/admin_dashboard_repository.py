"""Read-only aggregate queries powering the Super Admin dashboard.

Cross-module reads happen here (infrastructure layer) so that application use
cases stay free of raw SQL.
"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.assessment.infrastructure.models import (
    GradeAppealModel,
    PeerAssignmentSubmissionModel,
    PeerReviewModel,
)
from src.modules.catalog.domain import CourseStatus
from src.modules.catalog.infrastructure.models import (
    CategoryModel,
    CourseModel,
    CourseReviewModel,
)
from src.modules.certificate.infrastructure.models import (
    CertificateModel,
    FinancialAidModel,
)
from src.modules.identity.domain import (
    ADMIN_DASHBOARD_ALERT_LIMIT,
    ADMIN_DASHBOARD_LOW_RATING_MAX_STARS,
    AdminAssessmentAlert,
    AdminAssessmentAlertKind,
    AdminCertificatesPage,
    AdminCertificateSummary,
    AdminCourseMetricsPage,
    AdminCourseQualityMetric,
    AdminDashboardStats,
    AdminLowReviewAlert,
    AdminOverviewMetrics,
    IAdminDashboardRepository,
    UserRole,
)
from src.modules.identity.infrastructure.models import (
    InstructorApplicationModel,
    LowReviewAcknowledgementModel,
    UserModel,
)
from src.modules.learning.infrastructure.models import LearningProgressModel
from src.modules.partner.infrastructure.models import PartnerModel
from src.modules.payment.infrastructure.models import (
    CoursePurchaseModel,
    PaymentOrderModel,
    UserSubscriptionModel,
)
from src.shared.auth import get_current_user
from src.shared.infrastructure.scopes import apply_organization_scope

_COMPLETED = "COMPLETED"
_ACTIVE = "ACTIVE"
_PENDING = "PENDING"
_PENDING_REVIEW = "PENDING_REVIEW"
_COMPLETION_PERCENT = 100.0
_SUBSCRIPTION_TARGET = "SYSTEM_SUBSCRIPTION"
_PENDING_APPEAL_STATUSES = (_PENDING, "PENDING_STAFF_REVIEW")
_REPORTED_REVIEW_PREFIX = "[REPORT_REVIEW:"
_APPROVED_AID_STATUSES = ("APPROVED", "AUTO_APPROVED")
_ISO_SECONDS_LENGTH = 19  # "YYYY-MM-DDTHH:MM:SS"


def _contains_pattern(term: str) -> str:
    """Build an ILIKE pattern that matches ``term`` literally (wildcards escaped)."""
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _scope_courses(stmt: Any) -> Any:
    """Push the caller's organization scope down to every statement touching courses."""
    return apply_organization_scope(stmt, CourseModel, get_current_user())


class AdminDashboardRepository(IAdminDashboardRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_dashboard_stats(self) -> AdminDashboardStats:
        return AdminDashboardStats(
            overview=await self._get_overview(),
            low_reviews=await self._get_low_reviews(),
            low_review_total=await self._count_low_reviews(),
            assessment_alerts=await self._get_assessment_alerts(),
            assessment_alert_total=await self._count_assessment_alerts(),
        )

    async def _count(self, stmt: Any) -> int:
        result = await self._session.execute(stmt)
        return int(result.scalar_one() or 0)

    # ------------------------------------------------------------------
    # Overview (platform-wide KPIs)
    # ------------------------------------------------------------------

    async def _get_overview(self) -> AdminOverviewMetrics:
        metrics = AdminOverviewMetrics()
        await self._fill_user_metrics(metrics)
        await self._fill_course_metrics(metrics)
        await self._fill_learning_metrics(metrics)
        await self._fill_satisfaction_metrics(metrics)
        await self._fill_revenue_metrics(metrics)
        await self._fill_certificate_metrics(metrics)
        await self._fill_work_queue_metrics(metrics)
        await self._fill_catalog_metrics(metrics)
        return metrics

    async def _fill_user_metrics(self, metrics: AdminOverviewMetrics) -> None:
        role_rows = await self._session.execute(
            select(UserModel.role, func.count()).group_by(UserModel.role)
        )
        role_counts = dict(role_rows.all())
        metrics.learner_count = role_counts.get(UserRole.LEARNER, 0)
        metrics.instructor_count = role_counts.get(UserRole.INSTRUCTOR, 0)
        metrics.admin_count = role_counts.get(UserRole.ADMIN, 0)
        metrics.total_users = sum(role_counts.values())
        metrics.verified_user_count = await self._count(
            select(func.count())
            .select_from(UserModel)
            .where(UserModel.is_identity_verified.is_(True))
        )

    async def _fill_course_metrics(self, metrics: AdminOverviewMetrics) -> None:
        status_rows = await self._session.execute(
            _scope_courses(
                select(CourseModel.status, func.count()).group_by(CourseModel.status)
            )
        )
        status_counts = dict(status_rows.all())
        metrics.published_courses = status_counts.get(CourseStatus.PUBLISHED, 0)
        metrics.pending_review_courses = status_counts.get(
            CourseStatus.PENDING_REVIEW, 0
        )
        metrics.draft_courses = status_counts.get(CourseStatus.DRAFT, 0)
        metrics.rejected_courses = status_counts.get(CourseStatus.REJECTED, 0)
        metrics.total_courses = sum(status_counts.values())

    async def _fill_learning_metrics(self, metrics: AdminOverviewMetrics) -> None:
        # Join courses so enrollments of courses that no longer exist are ignored,
        # keeping this total equal to the sum of the per-course table.
        enrollment_row = (
            await self._session.execute(
                _scope_courses(
                    select(
                        func.count(LearningProgressModel.id),
                        func.count(LearningProgressModel.id).filter(
                            LearningProgressModel.overall_progress_percent
                            >= _COMPLETION_PERCENT
                        ),
                    )
                    .select_from(LearningProgressModel)
                    .join(
                        CourseModel, CourseModel.id == LearningProgressModel.course_id
                    )
                )
            )
        ).one()
        metrics.total_enrollments = int(enrollment_row[0] or 0)
        metrics.completed_enrollments = int(enrollment_row[1] or 0)

    async def _fill_satisfaction_metrics(self, metrics: AdminOverviewMetrics) -> None:
        review_row = (
            await self._session.execute(
                select(
                    func.count(CourseReviewModel.id),
                    func.avg(CourseReviewModel.rating_stars),
                )
            )
        ).one()
        metrics.total_reviews = int(review_row[0] or 0)
        metrics.average_rating = round(float(review_row[1] or 0.0), 2)
        distribution_rows = await self._session.execute(
            select(CourseReviewModel.rating_stars, func.count()).group_by(
                CourseReviewModel.rating_stars
            )
        )
        for stars, count in distribution_rows.all():
            if 1 <= stars <= len(metrics.rating_distribution):
                metrics.rating_distribution[stars - 1] = int(count)

    async def _fill_revenue_metrics(self, metrics: AdminOverviewMetrics) -> None:
        # Course purchases + subscription orders (course orders are already
        # represented by their fulfilled course purchase).
        purchase_row = (
            await self._session.execute(
                select(
                    func.coalesce(func.sum(CoursePurchaseModel.amount), 0.0),
                    func.count(CoursePurchaseModel.id),
                ).where(CoursePurchaseModel.status == _COMPLETED)
            )
        ).one()
        subscription_revenue = (
            await self._session.execute(
                select(func.coalesce(func.sum(PaymentOrderModel.amount), 0.0)).where(
                    PaymentOrderModel.status == _COMPLETED,
                    PaymentOrderModel.target_type == _SUBSCRIPTION_TARGET,
                )
            )
        ).scalar_one()
        metrics.total_revenue = float(purchase_row[0] or 0.0) + float(
            subscription_revenue or 0.0
        )
        metrics.course_purchase_count = int(purchase_row[1] or 0)
        now_prefix = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%S")
        metrics.active_subscriptions = await self._count(
            select(func.count())
            .select_from(UserSubscriptionModel)
            .where(
                UserSubscriptionModel.status == _ACTIVE,
                func.substr(UserSubscriptionModel.expires_at, 1, _ISO_SECONDS_LENGTH)
                >= now_prefix,
            )
        )

    async def _fill_certificate_metrics(self, metrics: AdminOverviewMetrics) -> None:
        metrics.certificates_issued = await self._count(
            select(func.count()).select_from(CertificateModel)
        )
        metrics.certificates_revoked = await self._count(
            select(func.count())
            .select_from(CertificateModel)
            .where(CertificateModel.is_revoked.is_(True))
        )
        metrics.approved_financial_aids = await self._count(
            select(func.count())
            .select_from(FinancialAidModel)
            .where(FinancialAidModel.status.in_(_APPROVED_AID_STATUSES))
        )

    async def _fill_work_queue_metrics(self, metrics: AdminOverviewMetrics) -> None:
        metrics.pending_instructor_applications = await self._count(
            select(func.count())
            .select_from(InstructorApplicationModel)
            .where(InstructorApplicationModel.status == _PENDING_REVIEW)
        )
        metrics.pending_financial_aids = await self._count(
            select(func.count())
            .select_from(FinancialAidModel)
            .where(FinancialAidModel.status == _PENDING)
        )

    async def _fill_catalog_metrics(self, metrics: AdminOverviewMetrics) -> None:
        metrics.partner_count = await self._count(
            select(func.count()).select_from(PartnerModel)
        )
        metrics.category_count = await self._count(
            select(func.count()).select_from(CategoryModel)
        )

    # ------------------------------------------------------------------
    # Per-course metrics (paginated)
    # ------------------------------------------------------------------

    async def list_course_metrics(
        self,
        page: int,
        page_size: int,
        search_query: str = "",
        status: str | None = None,
    ) -> AdminCourseMetricsPage:
        """Return one page of per-course metrics, highest revenue first.

        ``page`` is 1-based and the arguments are expected to be validated by the
        caller (see ``AdminDashboardUseCase``). ``search_query`` matches the course
        title or partner name; ``status`` is a ``CourseStatus`` value or ``None``.
        """
        filters: list[Any] = []
        if search_query:
            pattern = _contains_pattern(search_query)
            filters.append(
                or_(
                    CourseModel.title.ilike(pattern, escape="\\"),
                    CourseModel.partner_name.ilike(pattern, escape="\\"),
                )
            )
        if status is not None:
            filters.append(CourseModel.status == CourseStatus(status))

        enrollment_sq = (
            select(
                LearningProgressModel.course_id.label("course_id"),
                func.count(LearningProgressModel.id).label("enrolled"),
                func.count(LearningProgressModel.id)
                .filter(
                    LearningProgressModel.overall_progress_percent
                    >= _COMPLETION_PERCENT
                )
                .label("completed"),
            )
            .group_by(LearningProgressModel.course_id)
            .subquery()
        )
        revenue_sq = (
            select(
                CoursePurchaseModel.course_id.label("course_id"),
                func.sum(CoursePurchaseModel.amount).label("revenue"),
            )
            .where(CoursePurchaseModel.status == _COMPLETED)
            .group_by(CoursePurchaseModel.course_id)
            .subquery()
        )
        revenue_expr = func.coalesce(revenue_sq.c.revenue, 0.0)
        enrolled_expr = func.coalesce(enrollment_sq.c.enrolled, 0)
        stmt = _scope_courses(
            select(
                CourseModel.id,
                CourseModel.title,
                CourseModel.partner_name,
                CourseModel.status,
                CourseModel.average_rating,
                CourseModel.review_count,
                enrolled_expr,
                func.coalesce(enrollment_sq.c.completed, 0),
                revenue_expr,
            )
            .outerjoin(enrollment_sq, CourseModel.id == enrollment_sq.c.course_id)
            .outerjoin(revenue_sq, CourseModel.id == revenue_sq.c.course_id)
            .where(*filters)
            # CourseModel.id is the final tie-breaker so pages never overlap.
            .order_by(
                revenue_expr.desc(),
                enrolled_expr.desc(),
                CourseModel.title,
                CourseModel.id,
            )
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
        rows = (await self._session.execute(stmt)).all()
        total_count = await self._count(
            _scope_courses(
                select(func.count()).select_from(CourseModel).where(*filters)
            )
        )
        return AdminCourseMetricsPage(
            courses=[
                AdminCourseQualityMetric(
                    course_id=course_id,
                    title=title,
                    partner_name=partner_name,
                    status=status.value,
                    average_rating=float(average_rating or 0.0),
                    review_count=int(review_count or 0),
                    enrolled_count=int(enrolled or 0),
                    completed_count=int(completed or 0),
                    revenue=float(revenue or 0.0),
                )
                for (
                    course_id,
                    title,
                    partner_name,
                    status,
                    average_rating,
                    review_count,
                    enrolled,
                    completed,
                    revenue,
                ) in rows
            ],
            total_count=total_count,
            page=page,
            page_size=page_size,
        )

    # ------------------------------------------------------------------
    # Quality alerts (most recent N, plus true totals)
    # ------------------------------------------------------------------

    @staticmethod
    def _open_low_review_filters() -> tuple[Any, ...]:
        """Low-rating reviews an admin still has to look at.

        An acknowledged review stays hidden until its author edits it again (an edit
        refreshes ``created_at`` so it postdates ``acknowledged_at``).
        """
        return (
            CourseReviewModel.rating_stars <= ADMIN_DASHBOARD_LOW_RATING_MAX_STARS,
            or_(
                LowReviewAcknowledgementModel.review_id.is_(None),
                CourseReviewModel.created_at
                > LowReviewAcknowledgementModel.acknowledged_at,
            ),
        )

    @staticmethod
    def _pending_appeal_filter() -> Any:
        return GradeAppealModel.status.in_(_PENDING_APPEAL_STATUSES)

    @staticmethod
    def _unsettled_outlier_filters() -> tuple[Any, ...]:
        # Outliers stay flagged forever, so hide those already settled by staff.
        return (
            PeerReviewModel.is_outlier.is_(True),
            PeerAssignmentSubmissionModel.graded_by_staff.is_(False),
        )

    async def _get_low_reviews(self) -> list[AdminLowReviewAlert]:
        stmt = _scope_courses(
            select(CourseReviewModel, CourseModel.title)
            .join(CourseModel, CourseModel.id == CourseReviewModel.course_id)
            .outerjoin(
                LowReviewAcknowledgementModel,
                LowReviewAcknowledgementModel.review_id == CourseReviewModel.id,
            )
            .where(*self._open_low_review_filters())
            .order_by(CourseReviewModel.created_at.desc())
            .limit(ADMIN_DASHBOARD_ALERT_LIMIT)
        )
        rows = (await self._session.execute(stmt)).all()
        return [
            AdminLowReviewAlert(
                review_id=review.id,
                course_id=review.course_id,
                course_title=course_title,
                user_name=review.user_name,
                rating_stars=review.rating_stars,
                comment_text=review.comment_text,
                created_at=review.created_at,
            )
            for review, course_title in rows
        ]

    async def _count_low_reviews(self) -> int:
        return await self._count(
            _scope_courses(
                select(func.count())
                .select_from(CourseReviewModel)
                .join(CourseModel, CourseModel.id == CourseReviewModel.course_id)
                .outerjoin(
                    LowReviewAcknowledgementModel,
                    LowReviewAcknowledgementModel.review_id == CourseReviewModel.id,
                )
                .where(*self._open_low_review_filters())
            )
        )

    async def acknowledge_low_review(self, review_id: str, admin_id: str) -> bool:
        """Mark a review as looked at. Returns ``False`` when the review is unknown.

        Idempotent: acknowledging again only refreshes who did it and when.
        """
        exists = await self._count(
            _scope_courses(
                select(func.count())
                .select_from(CourseReviewModel)
                .join(CourseModel, CourseModel.id == CourseReviewModel.course_id)
                .where(CourseReviewModel.id == review_id)
            )
        )
        if not exists:
            return False
        acknowledged_at = datetime.now(UTC).isoformat()
        await self._session.execute(
            pg_insert(LowReviewAcknowledgementModel)
            .values(
                review_id=review_id,
                acknowledged_by=admin_id,
                acknowledged_at=acknowledged_at,
            )
            .on_conflict_do_update(
                index_elements=[LowReviewAcknowledgementModel.review_id],
                set_={"acknowledged_by": admin_id, "acknowledged_at": acknowledged_at},
            )
        )
        return True

    async def _get_assessment_alerts(self) -> list[AdminAssessmentAlert]:
        appeal_stmt = (
            select(GradeAppealModel)
            .where(self._pending_appeal_filter())
            .order_by(GradeAppealModel.created_at.desc())
            .limit(ADMIN_DASHBOARD_ALERT_LIMIT)
        )
        appeals = (await self._session.execute(appeal_stmt)).scalars().all()

        outlier_stmt = (
            select(PeerReviewModel)
            .join(
                PeerAssignmentSubmissionModel,
                PeerAssignmentSubmissionModel.id == PeerReviewModel.submission_id,
            )
            .where(*self._unsettled_outlier_filters())
            .order_by(PeerReviewModel.created_at.desc())
            .limit(ADMIN_DASHBOARD_ALERT_LIMIT)
        )
        outliers = (await self._session.execute(outlier_stmt)).scalars().all()

        alerts: list[AdminAssessmentAlert] = []
        for appeal in appeals:
            is_report = appeal.appeal_reason.startswith(_REPORTED_REVIEW_PREFIX)
            alerts.append(
                AdminAssessmentAlert(
                    alert_id=appeal.id,
                    kind=(
                        AdminAssessmentAlertKind.REPORTED_PEER_REVIEW
                        if is_report
                        else AdminAssessmentAlertKind.GRADE_APPEAL
                    ),
                    submission_id=appeal.submission_id,
                    user_id=appeal.user_id,
                    reason=appeal.appeal_reason,
                    created_at=appeal.created_at,
                )
            )
        alerts.extend(
            AdminAssessmentAlert(
                alert_id=review.id,
                kind=AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW,
                submission_id=review.submission_id,
                user_id=review.reviewer_user_id,
                total_score=float(review.total_score),
                created_at=review.created_at,
            )
            for review in outliers
        )
        alerts.sort(key=lambda a: a.created_at, reverse=True)
        alerts = alerts[:ADMIN_DASHBOARD_ALERT_LIMIT]

        await self._resolve_user_names(alerts)
        return alerts

    async def _count_assessment_alerts(self) -> int:
        appeal_total = await self._count(
            select(func.count())
            .select_from(GradeAppealModel)
            .where(self._pending_appeal_filter())
        )
        outlier_total = await self._count(
            select(func.count())
            .select_from(PeerReviewModel)
            .join(
                PeerAssignmentSubmissionModel,
                PeerAssignmentSubmissionModel.id == PeerReviewModel.submission_id,
            )
            .where(*self._unsettled_outlier_filters())
        )
        return appeal_total + outlier_total

    async def _resolve_user_names(self, alerts: list[AdminAssessmentAlert]) -> None:
        user_ids = {alert.user_id for alert in alerts if alert.user_id}
        if not user_ids:
            return
        rows = await self._session.execute(
            select(UserModel.id, UserModel.full_name).where(UserModel.id.in_(user_ids))
        )
        names = dict(rows.all())
        for alert in alerts:
            alert.user_name = names.get(alert.user_id, "")

    # ------------------------------------------------------------------
    # Certificates (paginated)
    # ------------------------------------------------------------------

    async def list_certificates(
        self,
        page: int,
        page_size: int,
        search_query: str = "",
        is_revoked: bool | None = None,
    ) -> AdminCertificatesPage:
        """Return one page of certificates: valid ones first, then revoked.

        ``page`` is 1-based and the arguments are expected to be validated by the
        caller (see ``AdminDashboardUseCase``). ``search_query`` matches the
        certificate id, learner name or course title; ``is_revoked`` keeps only
        revoked (``True``) or valid (``False``) certificates. Certificates have no
        reliable sortable issue timestamp (``issue_date`` is free text), so
        ``certificate_id`` gives a stable order.
        """
        filters: list[Any] = []
        if search_query:
            pattern = _contains_pattern(search_query)
            filters.append(
                or_(
                    CertificateModel.certificate_id.ilike(pattern, escape="\\"),
                    CertificateModel.learner_name.ilike(pattern, escape="\\"),
                    CertificateModel.course_title.ilike(pattern, escape="\\"),
                )
            )
        if is_revoked is not None:
            filters.append(CertificateModel.is_revoked.is_(is_revoked))

        stmt = (
            select(CertificateModel)
            .where(*filters)
            .order_by(CertificateModel.is_revoked, CertificateModel.certificate_id)
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
        certificates = (await self._session.execute(stmt)).scalars().all()
        total_count = await self._count(
            select(func.count()).select_from(CertificateModel).where(*filters)
        )
        return AdminCertificatesPage(
            certificates=[
                AdminCertificateSummary(
                    certificate_id=cert.certificate_id,
                    learner_name=cert.learner_name,
                    course_title=cert.course_title,
                    partner_name=cert.partner_name,
                    issue_date=cert.issue_date,
                    is_revoked=cert.is_revoked,
                    revoked_reason=cert.revoked_reason,
                )
                for cert in certificates
            ],
            total_count=total_count,
            page=page,
            page_size=page_size,
        )
