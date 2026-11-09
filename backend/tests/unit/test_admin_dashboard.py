from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.gen.identity.v1 import identity_pb as pb
from src.modules.identity.application import AdminDashboardUseCase, IdentityUseCase
from src.modules.identity.domain import (
    ADMIN_DASHBOARD_PAGE_SIZE_DEFAULT,
    ADMIN_DASHBOARD_PAGE_SIZE_MAX,
    AdminAssessmentAlert,
    AdminAssessmentAlertKind,
    AdminCertificatesPage,
    AdminCertificateSummary,
    AdminCourseMetricsPage,
    AdminCourseQualityMetric,
    AdminDashboardStats,
    AdminLowReviewAlert,
    AdminOverviewMetrics,
)
from src.modules.identity.presentation.identity_handler import IdentityHandler
from src.shared.auth import CurrentUser


def _admin() -> CurrentUser:
    return CurrentUser(id="admin_1", email="admin@example.com", role="USER_ROLE_ADMIN")


def _learner() -> CurrentUser:
    return CurrentUser(
        id="learner_1", email="learner@example.com", role="USER_ROLE_LEARNER"
    )


def _sample_stats() -> AdminDashboardStats:
    return AdminDashboardStats(
        overview=AdminOverviewMetrics(
            total_users=10,
            learner_count=7,
            instructor_count=2,
            admin_count=1,
            verified_user_count=4,
            total_courses=3,
            published_courses=2,
            pending_review_courses=1,
            total_enrollments=20,
            completed_enrollments=5,
            total_reviews=6,
            average_rating=4.5,
            rating_distribution=[0, 1, 0, 2, 3],
            total_revenue=1_500_000.0,
            course_purchase_count=2,
            active_subscriptions=1,
            certificates_issued=3,
            certificates_revoked=1,
            approved_financial_aids=2,
            pending_instructor_applications=4,
            pending_financial_aids=5,
            partner_count=2,
            category_count=6,
        ),
        low_reviews=[
            AdminLowReviewAlert(
                review_id="r1",
                course_title="Course 1",
                user_name="Learner",
                rating_stars=1,
                comment_text="bad",
                created_at="2026-07-25T00:00:00Z",
            )
        ],
        assessment_alerts=[
            AdminAssessmentAlert(
                alert_id="a1",
                kind=AdminAssessmentAlertKind.REPORTED_PEER_REVIEW,
                submission_id="s1",
                user_id="u1",
                user_name="User One",
                reason="[REPORT_REVIEW:rev-1] spam",
                created_at="2026-07-25T00:00:00Z",
            ),
            AdminAssessmentAlert(
                alert_id="a2",
                kind=AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW,
                submission_id="s2",
                user_id="u2",
                total_score=12.5,
            ),
        ],
        low_review_total=35,
        assessment_alert_total=21,
    )


@pytest.mark.asyncio
async def test_use_case_rejects_non_admin():
    repo = AsyncMock()
    use_case = AdminDashboardUseCase(repo_factory=lambda _session: repo)

    with pytest.raises(PermissionError):
        await use_case.get_dashboard_stats(_learner())

    repo.get_dashboard_stats.assert_not_called()


@pytest.mark.asyncio
async def test_use_case_returns_stats_for_admin():
    expected = _sample_stats()
    repo = AsyncMock()
    repo.get_dashboard_stats.return_value = expected
    use_case = AdminDashboardUseCase(repo_factory=lambda _session: repo)

    with patch("src.shared.infrastructure.database.async_session_scope") as scope:
        scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        scope.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await use_case.get_dashboard_stats(_admin())

    assert result is expected


@pytest.mark.asyncio
async def test_identity_use_case_facade_delegates_to_admin_dashboard():
    facade = IdentityUseCase()
    facade.admin_dashboard = AsyncMock()
    facade.admin_dashboard.get_dashboard_stats.return_value = _sample_stats()
    admin = _admin()

    result = await facade.get_admin_dashboard_stats(current_user=admin)

    assert result.overview.total_users == 10
    facade.admin_dashboard.get_dashboard_stats.assert_awaited_once_with(admin)


@pytest.mark.asyncio
async def test_handler_maps_stats_to_protobuf():
    use_case = AsyncMock()
    use_case.get_admin_dashboard_stats.return_value = _sample_stats()
    handler = IdentityHandler(use_case)
    admin = _admin()

    with patch(
        "src.modules.identity.presentation.identity_handler.require_current_user",
        return_value=admin,
    ):
        res = await handler.get_admin_dashboard_stats(
            pb.GetAdminDashboardStatsRequest(), MagicMock()
        )

    use_case.get_admin_dashboard_stats.assert_awaited_once_with(current_user=admin)
    assert res.overview is not None
    assert res.overview.total_users == 10
    assert res.overview.pending_financial_aids == 5
    assert list(res.overview.rating_distribution) == [0, 1, 0, 2, 3]
    assert res.overview.total_revenue == 1_500_000.0
    assert res.low_reviews[0].rating_stars == 1
    assert (
        res.assessment_alerts[0].kind
        == pb.AdminAssessmentAlertKind.REPORTED_PEER_REVIEW
    )
    assert (
        res.assessment_alerts[1].kind == pb.AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW
    )
    assert res.assessment_alerts[1].total_score == 12.5
    assert res.low_review_total == 35
    assert res.assessment_alert_total == 21


@pytest.mark.asyncio
async def test_handler_maps_permission_error_to_permission_denied():
    use_case = AsyncMock()
    use_case.get_admin_dashboard_stats.side_effect = PermissionError("no admin")
    handler = IdentityHandler(use_case)

    with (
        patch(
            "src.modules.identity.presentation.identity_handler.require_current_user",
            return_value=_learner(),
        ),
        pytest.raises(ConnectError) as exc_info,
    ):
        await handler.get_admin_dashboard_stats(
            pb.GetAdminDashboardStatsRequest(), MagicMock()
        )

    assert exc_info.value.code == Code.PERMISSION_DENIED


def _sample_course_page() -> AdminCourseMetricsPage:
    return AdminCourseMetricsPage(
        courses=[
            AdminCourseQualityMetric(
                course_id="c1",
                title="Course 1",
                partner_name="Partner",
                status="PUBLISHED",
                enrolled_count=10,
                completed_count=4,
                average_rating=4.2,
                review_count=3,
                revenue=900_000.0,
            )
        ],
        total_count=25,
        page=2,
        page_size=10,
    )


@pytest.mark.asyncio
async def test_list_course_metrics_rejects_non_admin():
    repo = AsyncMock()
    use_case = AdminDashboardUseCase(repo_factory=lambda _session: repo)

    with pytest.raises(PermissionError):
        await use_case.list_course_metrics(_learner(), 1, 10)

    repo.list_course_metrics.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("page", "page_size", "expected_page", "expected_page_size"),
    [
        (3, 20, 3, 20),
        (0, 0, 1, ADMIN_DASHBOARD_PAGE_SIZE_DEFAULT),
        (-5, -1, 1, ADMIN_DASHBOARD_PAGE_SIZE_DEFAULT),
        (1, 10_000, 1, ADMIN_DASHBOARD_PAGE_SIZE_MAX),
    ],
)
async def test_list_course_metrics_normalizes_paging_arguments(
    page, page_size, expected_page, expected_page_size
):
    expected = _sample_course_page()
    repo = AsyncMock()
    repo.list_course_metrics.return_value = expected
    use_case = AdminDashboardUseCase(repo_factory=lambda _session: repo)

    with patch("src.shared.infrastructure.database.async_session_scope") as scope:
        scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        scope.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await use_case.list_course_metrics(_admin(), page, page_size)

    assert result is expected
    repo.list_course_metrics.assert_awaited_once_with(expected_page, expected_page_size)


@pytest.mark.asyncio
async def test_identity_use_case_facade_delegates_course_metrics():
    facade = IdentityUseCase()
    facade.admin_dashboard = AsyncMock()
    facade.admin_dashboard.list_course_metrics.return_value = _sample_course_page()
    admin = _admin()

    result = await facade.list_admin_course_metrics(
        current_user=admin, page=2, page_size=10
    )

    assert result.total_count == 25
    facade.admin_dashboard.list_course_metrics.assert_awaited_once_with(admin, 2, 10)


@pytest.mark.asyncio
async def test_handler_maps_course_metrics_page_to_protobuf():
    use_case = AsyncMock()
    use_case.list_admin_course_metrics.return_value = _sample_course_page()
    handler = IdentityHandler(use_case)
    admin = _admin()

    with patch(
        "src.modules.identity.presentation.identity_handler.require_current_user",
        return_value=admin,
    ):
        res = await handler.list_admin_course_metrics(
            pb.ListAdminCourseMetricsRequest(page=2, page_size=10), MagicMock()
        )

    use_case.list_admin_course_metrics.assert_awaited_once_with(
        current_user=admin, page=2, page_size=10
    )
    assert res.total_count == 25
    assert res.page == 2
    assert res.page_size == 10
    assert res.courses[0].course_id == "c1"
    assert res.courses[0].status == "PUBLISHED"
    assert res.courses[0].revenue == 900_000.0


@pytest.mark.asyncio
async def test_handler_course_metrics_maps_permission_error():
    use_case = AsyncMock()
    use_case.list_admin_course_metrics.side_effect = PermissionError("no admin")
    handler = IdentityHandler(use_case)

    with (
        patch(
            "src.modules.identity.presentation.identity_handler.require_current_user",
            return_value=_learner(),
        ),
        pytest.raises(ConnectError) as exc_info,
    ):
        await handler.list_admin_course_metrics(
            pb.ListAdminCourseMetricsRequest(), MagicMock()
        )

    assert exc_info.value.code == Code.PERMISSION_DENIED


def _sample_certificate_page() -> AdminCertificatesPage:
    return AdminCertificatesPage(
        certificates=[
            AdminCertificateSummary(
                certificate_id="CERT-1",
                learner_name="User One",
                course_title="Course 1",
                partner_name="Partner",
                issue_date="22/07/2026",
                is_revoked=True,
                revoked_reason="cheating",
            )
        ],
        total_count=61,
        page=3,
        page_size=20,
    )


@pytest.mark.asyncio
async def test_list_certificates_rejects_non_admin():
    repo = AsyncMock()
    use_case = AdminDashboardUseCase(repo_factory=lambda _session: repo)

    with pytest.raises(PermissionError):
        await use_case.list_certificates(_learner(), 1, 10)

    repo.list_certificates.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("page", "page_size", "expected_page", "expected_page_size"),
    [
        (3, 20, 3, 20),
        (0, 0, 1, ADMIN_DASHBOARD_PAGE_SIZE_DEFAULT),
        (-2, -9, 1, ADMIN_DASHBOARD_PAGE_SIZE_DEFAULT),
        (2, 10_000, 2, ADMIN_DASHBOARD_PAGE_SIZE_MAX),
    ],
)
async def test_list_certificates_normalizes_paging_arguments(
    page, page_size, expected_page, expected_page_size
):
    expected = _sample_certificate_page()
    repo = AsyncMock()
    repo.list_certificates.return_value = expected
    use_case = AdminDashboardUseCase(repo_factory=lambda _session: repo)

    with patch("src.shared.infrastructure.database.async_session_scope") as scope:
        scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        scope.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await use_case.list_certificates(_admin(), page, page_size)

    assert result is expected
    repo.list_certificates.assert_awaited_once_with(expected_page, expected_page_size)


@pytest.mark.asyncio
async def test_identity_use_case_facade_delegates_certificates():
    facade = IdentityUseCase()
    facade.admin_dashboard = AsyncMock()
    facade.admin_dashboard.list_certificates.return_value = _sample_certificate_page()
    admin = _admin()

    result = await facade.list_admin_certificates(
        current_user=admin, page=3, page_size=20
    )

    assert result.total_count == 61
    facade.admin_dashboard.list_certificates.assert_awaited_once_with(admin, 3, 20)


@pytest.mark.asyncio
async def test_handler_maps_certificates_page_to_protobuf():
    use_case = AsyncMock()
    use_case.list_admin_certificates.return_value = _sample_certificate_page()
    handler = IdentityHandler(use_case)
    admin = _admin()

    with patch(
        "src.modules.identity.presentation.identity_handler.require_current_user",
        return_value=admin,
    ):
        res = await handler.list_admin_certificates(
            pb.ListAdminCertificatesRequest(page=3, page_size=20), MagicMock()
        )

    use_case.list_admin_certificates.assert_awaited_once_with(
        current_user=admin, page=3, page_size=20
    )
    assert res.total_count == 61
    assert res.page == 3
    assert res.page_size == 20
    assert res.certificates[0].certificate_id == "CERT-1"
    assert res.certificates[0].is_revoked is True
    assert res.certificates[0].revoked_reason == "cheating"


@pytest.mark.asyncio
async def test_handler_certificates_maps_permission_error():
    use_case = AsyncMock()
    use_case.list_admin_certificates.side_effect = PermissionError("no admin")
    handler = IdentityHandler(use_case)

    with (
        patch(
            "src.modules.identity.presentation.identity_handler.require_current_user",
            return_value=_learner(),
        ),
        pytest.raises(ConnectError) as exc_info,
    ):
        await handler.list_admin_certificates(
            pb.ListAdminCertificatesRequest(), MagicMock()
        )

    assert exc_info.value.code == Code.PERMISSION_DENIED
