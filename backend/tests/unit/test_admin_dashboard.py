import ast
from pathlib import Path
from typing import Any, cast
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.gen.assessment.v1 import assessment_pb
from src.gen.catalog.v1 import catalog_pb
from src.gen.certificate.v1 import certificate_pb
from src.gen.identity.v1 import identity_pb
from src.gen.learning.v1 import learning_pb
from src.gen.payment.v1 import payment_pb
from src.modules.assessment.application import AssessmentUseCase
from src.modules.assessment.domain import (
    ADMIN_ASSESSMENT_ALERT_LIMIT,
    AdminAssessmentAlert,
    AdminAssessmentAlertKind,
)
from src.modules.assessment.presentation.assessment_handler import AssessmentHandler
from src.modules.catalog.application import AdminCatalogUseCase, CatalogUseCase
from src.modules.catalog.domain import (
    AdminCatalogStats,
    AdminCourseMetricsPage,
    AdminCourseQualityMetric,
    AdminCourseSummaryRow,
    AdminLowReviewAlert,
    CourseStatus,
)
from src.modules.catalog.presentation.catalog_handler import CatalogHandler
from src.modules.certificate.application import CertificateUseCase
from src.modules.certificate.domain import (
    AdminCertificatesPage,
    AdminCertificateStats,
    AdminCertificateSummary,
)
from src.modules.certificate.presentation.certificate_handler import CertificateHandler
from src.modules.identity.application import IdentityUseCase, UserProfileUseCase
from src.modules.identity.domain import AdminIdentityStats
from src.modules.identity.presentation.identity_handler import IdentityHandler
from src.modules.learning.application import LearningUseCase
from src.modules.learning.domain import AdminLearningStats
from src.modules.learning.presentation.learning_handler import LearningHandler
from src.modules.payment.application import PaymentUseCase
from src.modules.payment.domain import AdminPaymentStats
from src.modules.payment.presentation.payment_handler import PaymentHandler
from src.shared.auth import CurrentUser
from src.shared.domain import (
    ADMIN_PAGE_SIZE_DEFAULT,
    ADMIN_PAGE_SIZE_MAX,
    ADMIN_SEARCH_MAX_LENGTH,
    escape_like_pattern,
    normalize_admin_paging,
    normalize_admin_search,
)

MODULES_ROOT = Path(__file__).resolve().parents[2] / "src" / "modules"


def _admin() -> CurrentUser:
    return CurrentUser(id="admin_1", email="admin@example.com", role="USER_ROLE_ADMIN")


def _learner() -> CurrentUser:
    return CurrentUser(
        id="learner_1", email="learner@example.com", role="USER_ROLE_LEARNER"
    )


# ---------------------------------------------------------------------------
# Shared domain helpers
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw_page", "raw_size", "expected_page", "expected_size"),
    [
        (0, 0, 1, ADMIN_PAGE_SIZE_DEFAULT),
        (-3, -5, 1, ADMIN_PAGE_SIZE_DEFAULT),
        (2, 25, 2, 25),
        (4, ADMIN_PAGE_SIZE_MAX + 99, 4, ADMIN_PAGE_SIZE_MAX),
    ],
)
def test_normalize_admin_paging_clamps_inputs(
    raw_page: int, raw_size: int, expected_page: int, expected_size: int
) -> None:
    assert normalize_admin_paging(raw_page, raw_size) == (expected_page, expected_size)


def test_normalize_admin_search_trims_and_caps_length() -> None:
    assert normalize_admin_search("  python  ") == "python"
    long_term = "x" * (ADMIN_SEARCH_MAX_LENGTH + 40)
    assert normalize_admin_search(long_term) == "x" * ADMIN_SEARCH_MAX_LENGTH


def test_escape_like_pattern_escapes_wildcards_and_backslashes() -> None:
    assert escape_like_pattern(r"100%_a\b") == r"%100\%\_a\\b%"


# ---------------------------------------------------------------------------
# DDD Bounded Context Architecture Guardrails
# ---------------------------------------------------------------------------


def test_legacy_monolithic_admin_dashboard_files_are_removed() -> None:
    identity_dir = MODULES_ROOT / "identity"
    assert not (identity_dir / "domain" / "admin_dashboard.py").exists()
    assert not (identity_dir / "application" / "admin_dashboard_usecase.py").exists()
    assert not (
        identity_dir / "infrastructure" / "admin_dashboard_repository.py"
    ).exists()


@pytest.mark.parametrize(
    ("module_name", "rel_path"),
    [
        ("catalog", "application/admin_catalog_usecase.py"),
        ("assessment", "application/assessment_usecase.py"),
        ("assessment", "application/base_usecase.py"),
        ("identity", "application/user_profile_usecase.py"),
        ("payment", "application/payment_usecase.py"),
        ("certificate", "application/certificate_usecase.py"),
    ],
)
def test_admin_application_layers_do_not_import_other_module_infrastructure(
    module_name: str, rel_path: str
) -> None:
    tree = ast.parse((MODULES_ROOT / module_name / rel_path).read_text("utf-8"))
    for node in ast.walk(tree):
        imported_modules: list[str] = []
        if isinstance(node, ast.Import):
            imported_modules.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported_modules.append(node.module)

        for mod in imported_modules:
            if mod.startswith("src.modules.") and ".infrastructure" in mod:
                parts = mod.split(".")
                target_module = parts[2]
                # Note: payment_usecase has pre-existing _default_catalog_repo_factory;
                # enforce strict zero cross-module infra imports on admin_catalog_usecase,
                # assessment, identity, and certificate.
                if rel_path != "application/payment_usecase.py":
                    assert target_module == module_name, (
                        f"{module_name}/{rel_path} must not import {mod}"
                    )


@pytest.mark.parametrize(
    ("module_name", "method_names", "forbidden_prefixes"),
    [
        (
            "identity",
            {"get_admin_identity_stats", "get_user_names_by_ids"},
            {"Course", "Learning", "Payment", "Certificate", "Grade", "Peer"},
        ),
        (
            "catalog",
            {
                "list_scoped_course_ids",
                "get_admin_catalog_stats",
                "get_admin_review_trend",
                "list_admin_course_summaries",
                "acknowledge_low_review",
            },
            {"UserModel", "LearningProgress", "CoursePurchase", "Certificate"},
        ),
        (
            "learning",
            {
                "get_admin_enrollment_stats",
                "get_admin_enrollment_trend",
                "get_course_enrollment_counts",
            },
            {"CourseModel", "UserModel", "CoursePurchase", "Certificate"},
        ),
        (
            "payment",
            {
                "get_admin_payment_stats",
                "get_admin_payment_trend",
                "get_completed_revenue_by_course",
            },
            {"CourseModel", "UserModel", "LearningProgress", "Certificate"},
        ),
        (
            "certificate",
            {
                "get_admin_certificate_stats",
                "get_admin_certificate_trend",
                "list_admin_certificates",
            },
            {"CourseModel", "UserModel", "LearningProgress", "GradeAppeal"},
        ),
        (
            "assessment",
            {"list_admin_assessment_alerts"},
            {"UserModel", "CourseModel", "CertificateModel"},
        ),
    ],
)
def test_admin_repository_methods_only_touch_own_bounded_context_models(
    module_name: str, method_names: set[str], forbidden_prefixes: set[str]
) -> None:
    repo_path = MODULES_ROOT / module_name / "infrastructure" / "repository.py"
    tree = ast.parse(repo_path.read_text("utf-8"))
    found_methods: set[str] = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name in method_names:
            found_methods.add(node.name)
            for child in ast.walk(node):
                if isinstance(child, ast.Name):
                    for prefix in forbidden_prefixes:
                        assert not child.id.startswith(prefix), (
                            f"{module_name}.repository.{node.name} references cross-domain symbol {child.id}"
                        )

    assert found_methods == method_names


# ---------------------------------------------------------------------------
# Identity Bounded Context (GetAdminIdentityStats)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_identity_admin_stats_rejects_non_admin() -> None:
    repo = AsyncMock()
    uc = UserProfileUseCase(repo_factory=lambda _s: repo)

    with pytest.raises(PermissionError):
        await uc.get_admin_identity_stats(_learner())

    repo.get_admin_identity_stats.assert_not_called()


@pytest.mark.asyncio
async def test_identity_admin_stats_use_case_and_handler() -> None:
    expected = AdminIdentityStats(
        total_users=48,
        learner_count=38,
        instructor_count=6,
        admin_count=4,
        verified_user_count=7,
        pending_instructor_applications=2,
    )
    repo = AsyncMock()
    repo.get_admin_identity_stats.return_value = expected
    facade = IdentityUseCase(repo_factory=lambda _s: repo)

    with patch("src.shared.infrastructure.database.async_session_scope") as scope:
        scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        scope.return_value.__aexit__ = AsyncMock(return_value=False)
        stats = await facade.get_admin_identity_stats(_admin())

    assert stats == expected

    use_case_mock = AsyncMock()
    use_case_mock.get_admin_identity_stats.return_value = expected
    handler = IdentityHandler(use_case_mock)
    admin = _admin()

    with patch(
        "src.modules.identity.presentation.identity_handler.require_current_user",
        return_value=admin,
    ):
        res = await handler.get_admin_identity_stats(
            identity_pb.GetAdminIdentityStatsRequest(), MagicMock()
        )

    assert res.total_users == 48
    assert res.learner_count == 38
    assert res.verified_user_count == 7
    assert res.pending_instructor_applications == 2


@pytest.mark.asyncio
async def test_identity_handler_maps_permission_error() -> None:
    use_case_mock = AsyncMock()
    use_case_mock.get_admin_identity_stats.side_effect = PermissionError("denied")
    handler = IdentityHandler(use_case_mock)

    with (
        patch(
            "src.modules.identity.presentation.identity_handler.require_current_user",
            return_value=_learner(),
        ),
        pytest.raises(ConnectError) as exc_info,
    ):
        await handler.get_admin_identity_stats(
            identity_pb.GetAdminIdentityStatsRequest(), MagicMock()
        )

    assert exc_info.value.code == Code.PERMISSION_DENIED


# ---------------------------------------------------------------------------
# Catalog Bounded Context (GetAdminCatalogStats, ListAdminCourseMetrics, AcknowledgeLowReview)
# ---------------------------------------------------------------------------


def _sample_catalog_stats() -> AdminCatalogStats:
    return AdminCatalogStats(
        total_courses=8,
        published_courses=6,
        pending_review_courses=1,
        draft_courses=1,
        rejected_courses=0,
        category_count=8,
        total_reviews=11,
        average_rating=4.91,
        rating_distribution=(0, 1, 0, 1, 9),
        low_reviews=(
            AdminLowReviewAlert(
                review_id="r1",
                course_id="c1",
                course_title="Course 1",
                user_name="Learner",
                rating_stars=2,
                comment_text="cần cải thiện",
                created_at="2026-07-25T00:00:00Z",
            ),
        ),
        low_review_total=3,
    )


@pytest.mark.asyncio
async def test_catalog_admin_stats_rejects_non_admin() -> None:
    repo = AsyncMock()
    uc = AdminCatalogUseCase(repo_factory=lambda _s: repo)

    with pytest.raises(PermissionError):
        await uc.get_admin_catalog_stats(_learner())

    repo.get_admin_catalog_stats.assert_not_called()


@pytest.mark.asyncio
async def test_catalog_admin_stats_handler_maps_protobuf() -> None:
    use_case = AsyncMock()
    use_case.get_admin_catalog_stats.return_value = _sample_catalog_stats()
    handler = CatalogHandler(use_case)
    admin = _admin()

    with patch(
        "src.modules.catalog.presentation.catalog_handler.require_current_user",
        return_value=admin,
    ):
        res = await handler.get_admin_catalog_stats(
            catalog_pb.GetAdminCatalogStatsRequest(), MagicMock()
        )

    assert res.total_courses == 8
    assert res.published_courses == 6
    assert res.draft_courses == 1
    assert res.category_count == 8
    assert list(res.rating_distribution) == [0, 1, 0, 1, 9]
    assert res.low_reviews[0].review_id == "r1"
    assert res.low_review_total == 3


@pytest.mark.asyncio
async def test_catalog_list_admin_course_metrics_merges_sorts_and_paginates() -> None:
    catalog_repo = AsyncMock()
    learning_repo = AsyncMock()
    payment_repo = AsyncMock()

    catalog_repo.list_admin_course_summaries.return_value = [
        AdminCourseSummaryRow(
            course_id="c-low",
            title="Zeta Course",
            partner_name="Partner A",
            status=CourseStatus.PUBLISHED,
            average_rating=4.0,
            review_count=2,
        ),
        AdminCourseSummaryRow(
            course_id="c-top",
            title="Alpha Course",
            partner_name="Partner B",
            status=CourseStatus.DRAFT,
            average_rating=4.8,
            review_count=5,
        ),
        AdminCourseSummaryRow(
            course_id="c-tie",
            title="Beta Course",
            partner_name="Partner C",
            status=CourseStatus.PENDING_REVIEW,
            average_rating=0.0,
            review_count=0,
        ),
    ]
    payment_repo.get_completed_revenue_by_course.return_value = {
        "c-top": 2_000_000.0,
        "c-low": 500_000.0,
        "c-tie": 500_000.0,
    }
    learning_repo.get_course_enrollment_counts.return_value = {
        "c-top": (10, 4),
        "c-low": (3, 1),
        "c-tie": (8, 2),
    }

    facade = CatalogUseCase(
        repo_factory=lambda _s: catalog_repo,
        learning_repo_factory=lambda _s: learning_repo,
        payment_repo_factory=lambda _s: payment_repo,
    )

    with patch(
        "src.modules.catalog.application.admin_catalog_usecase.async_session_scope"
    ) as scope:
        scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        scope.return_value.__aexit__ = AsyncMock(return_value=False)
        page1 = await facade.list_admin_course_metrics(
            _admin(),
            page=0,
            page_size=2,
            search_query="  course  ",
            status=CourseStatus.PUBLISHED,
        )

    catalog_repo.list_admin_course_summaries.assert_awaited_once_with(
        "course", CourseStatus.PUBLISHED
    )
    assert page1.total_count == 3
    assert page1.page == 1
    assert page1.page_size == 2
    # Sorted by (-revenue, -enrolled_count, title): c-top (2M), then c-tie (500k, 8 enrolled)
    assert [c.course_id for c in page1.courses] == ["c-top", "c-tie"]
    assert page1.courses[0].enrolled_count == 10
    assert page1.courses[0].completed_count == 4
    assert page1.courses[0].revenue == 2_000_000.0


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("pb_status", "expected"),
    [
        (catalog_pb.CourseStatus.UNSPECIFIED, None),
        (catalog_pb.CourseStatus.DRAFT, CourseStatus.DRAFT),
        (catalog_pb.CourseStatus.PENDING_REVIEW, CourseStatus.PENDING_REVIEW),
        (catalog_pb.CourseStatus.PUBLISHED, CourseStatus.PUBLISHED),
        (catalog_pb.CourseStatus.REJECTED, CourseStatus.REJECTED),
    ],
)
async def test_catalog_handler_maps_course_status_filter(
    pb_status: catalog_pb.CourseStatus, expected: CourseStatus | None
) -> None:
    use_case = AsyncMock()
    use_case.list_admin_course_metrics.return_value = AdminCourseMetricsPage(
        courses=(
            AdminCourseQualityMetric(
                course_id="c1",
                title="Course 1",
                partner_name="Partner",
                status=CourseStatus.PUBLISHED,
                enrolled_count=10,
                completed_count=4,
                average_rating=4.2,
                review_count=3,
                revenue=900_000.0,
            ),
        ),
        total_count=1,
        page=1,
        page_size=10,
    )
    handler = CatalogHandler(use_case)
    admin = _admin()

    with patch(
        "src.modules.catalog.presentation.catalog_handler.require_current_user",
        return_value=admin,
    ):
        res = await handler.list_admin_course_metrics(
            catalog_pb.ListAdminCourseMetricsRequest(
                page=1, page_size=10, search_query="python", status=pb_status
            ),
            MagicMock(),
        )

    use_case.list_admin_course_metrics.assert_awaited_once_with(
        current_user=admin,
        page=1,
        page_size=10,
        search_query="python",
        status=expected,
    )
    assert res.courses[0].status == catalog_pb.CourseStatus.PUBLISHED


@pytest.mark.asyncio
async def test_catalog_handler_rejects_unknown_course_status() -> None:
    use_case = AsyncMock()
    handler = CatalogHandler(use_case)

    with (
        patch(
            "src.modules.catalog.presentation.catalog_handler.require_current_user",
            return_value=_admin(),
        ),
        pytest.raises(ConnectError) as exc_info,
    ):
        await handler.list_admin_course_metrics(
            catalog_pb.ListAdminCourseMetricsRequest(status=cast("Any", 99)),
            MagicMock(),
        )

    assert exc_info.value.code == Code.INVALID_ARGUMENT
    use_case.list_admin_course_metrics.assert_not_called()


@pytest.mark.asyncio
async def test_acknowledge_low_review_validation_and_persistence() -> None:
    repo = AsyncMock()
    uc = AdminCatalogUseCase(repo_factory=lambda _s: repo)

    with pytest.raises(PermissionError):
        await uc.acknowledge_low_review(_learner(), "rev-1")

    for blank in ("", "   "):
        with pytest.raises(ValueError, match="mã đánh giá"):
            await uc.acknowledge_low_review(_admin(), blank)

    repo.acknowledge_low_review.return_value = True
    with patch(
        "src.modules.catalog.application.admin_catalog_usecase.async_session_scope"
    ) as scope:
        scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        scope.return_value.__aexit__ = AsyncMock(return_value=False)
        await uc.acknowledge_low_review(_admin(), "  rev-1  ")

    repo.acknowledge_low_review.assert_awaited_once_with("rev-1", "admin_1")

    repo.acknowledge_low_review.return_value = False
    with patch(
        "src.modules.catalog.application.admin_catalog_usecase.async_session_scope"
    ) as scope:
        scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        scope.return_value.__aexit__ = AsyncMock(return_value=False)
        with pytest.raises(ValueError, match="Không tìm thấy"):
            await uc.acknowledge_low_review(_admin(), "missing")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("error", "expected_code"),
    [
        (PermissionError("no admin"), Code.PERMISSION_DENIED),
        (ValueError("not found"), Code.INVALID_ARGUMENT),
    ],
)
async def test_catalog_handler_acknowledge_low_review_maps_errors(
    error: Exception, expected_code: Code
) -> None:
    use_case = AsyncMock()
    use_case.acknowledge_low_review.side_effect = error
    handler = CatalogHandler(use_case)

    with (
        patch(
            "src.modules.catalog.presentation.catalog_handler.require_current_user",
            return_value=_learner(),
        ),
        pytest.raises(ConnectError) as exc_info,
    ):
        await handler.acknowledge_low_review(
            catalog_pb.AcknowledgeLowReviewRequest(review_id="rev-1"), MagicMock()
        )

    assert exc_info.value.code == expected_code


# ---------------------------------------------------------------------------
# Learning Bounded Context (GetAdminLearningStats)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_learning_admin_stats_use_case_and_handler() -> None:
    learning_repo = AsyncMock()
    catalog_repo = AsyncMock()
    catalog_repo.list_scoped_course_ids.return_value = ["c1", "c2"]
    learning_repo.get_admin_enrollment_stats.return_value = AdminLearningStats(
        total_enrollments=22, completed_enrollments=5
    )

    uc = LearningUseCase(
        repo_factory=lambda _s: learning_repo,
        catalog_repo_factory=lambda _s: catalog_repo,
    )
    with pytest.raises(PermissionError):
        await uc.get_admin_learning_stats(_learner())

    with patch(
        "src.modules.learning.application.learning_usecase.async_session_scope"
    ) as scope:
        scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        scope.return_value.__aexit__ = AsyncMock(return_value=False)
        stats = await uc.get_admin_learning_stats(_admin())

    learning_repo.get_admin_enrollment_stats.assert_awaited_once_with(["c1", "c2"])
    assert stats == AdminLearningStats(total_enrollments=22, completed_enrollments=5)

    uc_mock = AsyncMock()
    uc_mock.get_admin_learning_stats.return_value = stats
    handler = LearningHandler(uc_mock)
    with patch(
        "src.modules.learning.presentation.learning_handler.require_current_user",
        return_value=_admin(),
    ):
        res = await handler.get_admin_learning_stats(
            learning_pb.GetAdminLearningStatsRequest(), MagicMock()
        )

    assert res.total_enrollments == 22
    assert res.completed_enrollments == 5


# ---------------------------------------------------------------------------
# Payment Bounded Context (GetAdminPaymentStats)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_payment_admin_stats_use_case_and_handler() -> None:
    repo = AsyncMock()
    expected = AdminPaymentStats(
        total_revenue=19_150_000.0,
        course_purchase_count=6,
        active_subscriptions=1,
    )
    repo.get_admin_payment_stats.return_value = expected
    uc = PaymentUseCase(repo=repo)

    with pytest.raises(PermissionError):
        await uc.get_admin_payment_stats(_learner())

    with patch(
        "src.modules.payment.application.payment_usecase.async_session_scope"
    ) as scope:
        scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        scope.return_value.__aexit__ = AsyncMock(return_value=False)
        stats = await uc.get_admin_payment_stats(_admin())

    assert stats == expected

    uc_mock = AsyncMock()
    uc_mock.get_admin_payment_stats.return_value = expected
    handler = PaymentHandler(uc_mock)
    with patch(
        "src.modules.payment.presentation.payment_handler.require_current_user",
        return_value=_admin(),
    ):
        res = await handler.get_admin_payment_stats(
            payment_pb.GetAdminPaymentStatsRequest(), MagicMock()
        )

    assert res.total_revenue == 19_150_000.0
    assert res.course_purchase_count == 6
    assert res.active_subscriptions == 1


# ---------------------------------------------------------------------------
# Certificate Bounded Context (GetAdminCertificateStats, ListAdminCertificates)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_certificate_admin_stats_and_list_use_case() -> None:
    repo = AsyncMock()
    repo.get_admin_certificate_stats.return_value = AdminCertificateStats(
        certificates_issued=4,
        certificates_revoked=1,
        approved_financial_aids=2,
        pending_financial_aids=3,
    )
    repo.list_admin_certificates.return_value = AdminCertificatesPage(
        certificates=(
            AdminCertificateSummary(
                certificate_id="CERT-1",
                learner_name="Nguyen Van A",
                course_title="AI Basics",
                partner_name="DeepLearning.AI",
                issue_date="22/07/2026",
                is_revoked=False,
                revoked_reason="",
            ),
        ),
        total_count=1,
        page=1,
        page_size=10,
    )
    uc = CertificateUseCase(repo=repo)

    with pytest.raises(PermissionError):
        await uc.get_admin_certificate_stats(_learner())
    with pytest.raises(PermissionError):
        await uc.list_admin_certificates(_learner())

    with patch(
        "src.modules.certificate.application.certificate_usecase.async_session_scope"
    ) as scope:
        scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        scope.return_value.__aexit__ = AsyncMock(return_value=False)
        stats = await uc.get_admin_certificate_stats(_admin())
        certs_page = await uc.list_admin_certificates(
            _admin(), page=-1, page_size=500, search_query="  nguyen  ", is_revoked=True
        )

    assert stats.pending_financial_aids == 3
    repo.list_admin_certificates.assert_awaited_once_with(
        1, ADMIN_PAGE_SIZE_MAX, "nguyen", True
    )
    assert certs_page.total_count == 1


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("pb_status", "expected"),
    [
        (certificate_pb.AdminCertificateStatusFilter.UNSPECIFIED, None),
        (certificate_pb.AdminCertificateStatusFilter.VALID, False),
        (certificate_pb.AdminCertificateStatusFilter.REVOKED, True),
    ],
)
async def test_certificate_handler_maps_status_filter_and_rejects_unknown(
    pb_status: certificate_pb.AdminCertificateStatusFilter, expected: bool | None
) -> None:
    uc_mock = AsyncMock()
    uc_mock.list_admin_certificates.return_value = AdminCertificatesPage()
    handler = CertificateHandler(uc_mock)
    admin = _admin()

    with patch(
        "src.modules.certificate.presentation.certificate_handler.require_current_user",
        return_value=admin,
    ):
        await handler.list_admin_certificates(
            certificate_pb.ListAdminCertificatesRequest(
                page=1, page_size=10, search_query="cert", status=pb_status
            ),
            MagicMock(),
        )

    uc_mock.list_admin_certificates.assert_awaited_once_with(
        current_user=admin,
        page=1,
        page_size=10,
        search_query="cert",
        is_revoked=expected,
    )

    with (
        patch(
            "src.modules.certificate.presentation.certificate_handler.require_current_user",
            return_value=admin,
        ),
        pytest.raises(ConnectError) as exc_info,
    ):
        await handler.list_admin_certificates(
            certificate_pb.ListAdminCertificatesRequest(status=cast("Any", 99)),
            MagicMock(),
        )
    assert exc_info.value.code == Code.INVALID_ARGUMENT


# ---------------------------------------------------------------------------
# Assessment Bounded Context (ListAdminAssessmentAlerts)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_assessment_admin_alerts_enriches_user_names_and_maps_handler() -> None:
    assessment_repo = AsyncMock()
    identity_repo = AsyncMock()
    assessment_repo.list_admin_assessment_alerts.return_value = (
        [
            AdminAssessmentAlert(
                alert_id="a1",
                kind=AdminAssessmentAlertKind.REPORTED_PEER_REVIEW,
                submission_id="s1",
                user_id="u1",
                reason="[REPORT_REVIEW:rev-1] spam",
                created_at="2026-07-25T00:00:00Z",
            ),
            AdminAssessmentAlert(
                alert_id="a2",
                kind=AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW,
                submission_id="s2",
                user_id="u2",
                total_score=12.5,
                created_at="2026-07-24T00:00:00Z",
            ),
        ],
        21,
    )
    identity_repo.get_user_names_by_ids.return_value = {
        "u1": "User One",
        "u2": "Reviewer Two",
    }

    uc = AssessmentUseCase(
        repo_factory=lambda _s: assessment_repo,
        identity_repo_factory=lambda _s: identity_repo,
    )
    with pytest.raises(PermissionError):
        await uc.list_admin_assessment_alerts(_learner())

    with patch(
        "src.modules.assessment.application.assessment_usecase.async_session_scope"
    ) as scope:
        scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
        scope.return_value.__aexit__ = AsyncMock(return_value=False)
        page = await uc.list_admin_assessment_alerts(_admin())

    assessment_repo.list_admin_assessment_alerts.assert_awaited_once_with(
        ADMIN_ASSESSMENT_ALERT_LIMIT
    )
    assert page.total_count == 21
    assert page.alerts[0].user_name == "User One"
    assert page.alerts[1].user_name == "Reviewer Two"

    uc_mock = AsyncMock()
    uc_mock.list_admin_assessment_alerts.return_value = page
    handler = AssessmentHandler(uc_mock)
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=_admin(),
    ):
        res = await handler.list_admin_assessment_alerts(
            assessment_pb.ListAdminAssessmentAlertsRequest(), MagicMock()
        )

    assert res.total_count == 21
    assert (
        res.alerts[0].kind
        == assessment_pb.AdminAssessmentAlertKind.REPORTED_PEER_REVIEW
    )
    assert res.alerts[0].user_name == "User One"
    assert (
        res.alerts[1].kind == assessment_pb.AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW
    )
    assert res.alerts[1].total_score == 12.5
