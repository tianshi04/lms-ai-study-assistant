"""Unit tests for the admin dashboard daily trend RPCs (one per bounded context)."""

from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.gen.catalog.v1 import catalog_pb
from src.gen.certificate.v1 import certificate_pb
from src.gen.learning.v1 import learning_pb
from src.gen.payment.v1 import payment_pb
from src.modules.catalog.application import AdminCatalogUseCase
from src.modules.catalog.domain import AdminCatalogTrendPoint
from src.modules.catalog.presentation.catalog_handler import CatalogHandler
from src.modules.certificate.application import CertificateUseCase
from src.modules.certificate.domain import AdminCertificateTrendPoint
from src.modules.certificate.presentation.certificate_handler import CertificateHandler
from src.modules.learning.application import LearningUseCase
from src.modules.learning.domain import AdminLearningTrendPoint
from src.modules.learning.presentation.learning_handler import LearningHandler
from src.modules.payment.application import PaymentUseCase
from src.modules.payment.domain import AdminPaymentTrendPoint
from src.modules.payment.presentation.payment_handler import PaymentHandler
from src.shared.auth import CurrentUser
from src.shared.domain import (
    TREND_DAYS_DEFAULT,
    TREND_DAYS_MAX,
    build_trend_window,
    normalize_trend_days,
)


def _admin() -> CurrentUser:
    return CurrentUser(id="admin_1", email="admin@example.com", role="USER_ROLE_ADMIN")


def _learner() -> CurrentUser:
    return CurrentUser(
        id="learner_1", email="learner@example.com", role="USER_ROLE_LEARNER"
    )


def _patch_scope(path: str):
    scope = patch(path)
    mock_scope = scope.start()
    mock_scope.return_value.__aenter__ = AsyncMock(return_value=MagicMock())
    mock_scope.return_value.__aexit__ = AsyncMock(return_value=False)
    return scope


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (0, TREND_DAYS_DEFAULT),
        (-5, TREND_DAYS_DEFAULT),
        (7, 7),
        (90, 90),
        (TREND_DAYS_MAX + 500, TREND_DAYS_MAX),
    ],
)
def test_normalize_trend_days_clamps_inputs(raw: int, expected: int) -> None:
    assert normalize_trend_days(raw) == expected


def test_build_trend_window_is_contiguous_oldest_first_and_ends_today() -> None:
    window = build_trend_window(3, today=date(2026, 3, 1))
    assert window == ["2026-02-27", "2026-02-28", "2026-03-01"]


def test_build_trend_window_single_day() -> None:
    assert build_trend_window(1, today=date(2026, 11, 11)) == ["2026-11-11"]


# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_payment_trend_use_case_authorizes_clamps_and_delegates() -> None:
    repo = AsyncMock()
    repo.get_admin_payment_trend.return_value = [
        AdminPaymentTrendPoint(date="2026-11-11", revenue=1_190_000.0, purchase_count=1)
    ]
    uc = PaymentUseCase(repo=repo)

    with pytest.raises(PermissionError):
        await uc.get_admin_payment_trend(_learner(), 7)
    repo.get_admin_payment_trend.assert_not_called()

    scope = _patch_scope(
        "src.modules.payment.application.payment_usecase.async_session_scope"
    )
    try:
        points = await uc.get_admin_payment_trend(_admin(), TREND_DAYS_MAX + 1)
    finally:
        scope.stop()

    window = repo.get_admin_payment_trend.await_args.args[0]
    assert len(window) == TREND_DAYS_MAX
    assert points[0].revenue == 1_190_000.0


@pytest.mark.asyncio
async def test_payment_trend_handler_maps_points_and_permission_error() -> None:
    uc = AsyncMock()
    uc.get_admin_payment_trend.return_value = [
        AdminPaymentTrendPoint(date="2026-11-10", revenue=0.0, purchase_count=0),
        AdminPaymentTrendPoint(
            date="2026-11-11", revenue=2_500_000.0, purchase_count=2
        ),
    ]
    handler = PaymentHandler(uc)
    with patch(
        "src.modules.payment.presentation.payment_handler.require_current_user",
        return_value=_admin(),
    ):
        res = await handler.get_admin_payment_trend(
            payment_pb.GetAdminPaymentTrendRequest(days=2), MagicMock()
        )

    uc.get_admin_payment_trend.assert_awaited_once()
    assert uc.get_admin_payment_trend.await_args.args[1] == 2
    assert [p.date for p in res.points] == ["2026-11-10", "2026-11-11"]
    assert res.points[1].revenue == 2_500_000.0
    assert res.points[1].purchase_count == 2


# ---------------------------------------------------------------------------
# Learning
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_learning_trend_use_case_scopes_courses_and_authorizes() -> None:
    learning_repo = AsyncMock()
    catalog_repo = AsyncMock()
    catalog_repo.list_scoped_course_ids.return_value = ["c1", "c2"]
    learning_repo.get_admin_enrollment_trend.return_value = [
        AdminLearningTrendPoint(date="2026-11-11", enrollments=3, completions=1)
    ]
    uc = LearningUseCase(
        repo_factory=lambda _s: learning_repo,
        catalog_repo_factory=lambda _s: catalog_repo,
    )

    with pytest.raises(PermissionError):
        await uc.get_admin_learning_trend(_learner(), 30)
    learning_repo.get_admin_enrollment_trend.assert_not_called()

    scope = _patch_scope(
        "src.modules.learning.application.learning_usecase.async_session_scope"
    )
    try:
        points = await uc.get_admin_learning_trend(_admin(), 14)
    finally:
        scope.stop()

    args = learning_repo.get_admin_enrollment_trend.await_args.args
    assert args[0] == ["c1", "c2"]
    assert len(args[1]) == 14
    assert points[0].enrollments == 3


@pytest.mark.asyncio
async def test_learning_trend_handler_maps_points() -> None:
    uc = AsyncMock()
    uc.get_admin_learning_trend.return_value = [
        AdminLearningTrendPoint(date="2026-11-11", enrollments=4, completions=2)
    ]
    handler = LearningHandler(uc)
    with patch(
        "src.modules.learning.presentation.learning_handler.require_current_user",
        return_value=_admin(),
    ):
        res = await handler.get_admin_learning_trend(
            learning_pb.GetAdminLearningTrendRequest(days=30), MagicMock()
        )

    assert res.points[0].enrollments == 4
    assert res.points[0].completions == 2


# ---------------------------------------------------------------------------
# Certificate
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_certificate_trend_use_case_and_handler() -> None:
    repo = AsyncMock()
    repo.get_admin_certificate_trend.return_value = [
        AdminCertificateTrendPoint(date="2026-11-11", issued=5)
    ]
    uc = CertificateUseCase(repo=repo)

    with pytest.raises(PermissionError):
        await uc.get_admin_certificate_trend(_learner(), 30)
    repo.get_admin_certificate_trend.assert_not_called()

    scope = _patch_scope(
        "src.modules.certificate.application.certificate_usecase.async_session_scope"
    )
    try:
        points = await uc.get_admin_certificate_trend(_admin(), 0)
    finally:
        scope.stop()

    assert (
        len(repo.get_admin_certificate_trend.await_args.args[0]) == TREND_DAYS_DEFAULT
    )
    assert points[0].issued == 5

    uc_mock = AsyncMock()
    uc_mock.get_admin_certificate_trend.return_value = points
    handler = CertificateHandler(uc_mock)
    with patch(
        "src.modules.certificate.presentation.certificate_handler.require_current_user",
        return_value=_admin(),
    ):
        res = await handler.get_admin_certificate_trend(
            certificate_pb.GetAdminCertificateTrendRequest(days=30), MagicMock()
        )
    assert res.points[0].issued == 5


# ---------------------------------------------------------------------------
# Catalog (CSAT)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_catalog_trend_use_case_and_handler() -> None:
    repo = AsyncMock()
    repo.get_admin_review_trend.return_value = [
        AdminCatalogTrendPoint(date="2026-11-11", review_count=3, average_rating=4.67)
    ]
    uc = AdminCatalogUseCase(repo_factory=lambda _s: repo)

    with pytest.raises(PermissionError):
        await uc.get_admin_catalog_trend(_learner(), 30)
    repo.get_admin_review_trend.assert_not_called()

    scope = _patch_scope(
        "src.modules.catalog.application.admin_catalog_usecase.async_session_scope"
    )
    try:
        points = await uc.get_admin_catalog_trend(_admin(), 7)
    finally:
        scope.stop()

    assert len(repo.get_admin_review_trend.await_args.args[0]) == 7

    uc_mock = AsyncMock()
    uc_mock.get_admin_catalog_trend.return_value = points
    handler = CatalogHandler(uc_mock)
    with patch(
        "src.modules.catalog.presentation.catalog_handler.require_current_user",
        return_value=_admin(),
    ):
        res = await handler.get_admin_catalog_trend(
            catalog_pb.GetAdminCatalogTrendRequest(days=7), MagicMock()
        )
    assert res.points[0].review_count == 3
    assert res.points[0].average_rating == pytest.approx(4.67)
