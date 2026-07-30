"""Unit tests for PaymentUseCase and payment access rules (BR_ACCESS_004)."""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from src.modules.payment.application.payment_usecase import PaymentUseCase
from src.modules.payment.domain.entities import (
    CoursePurchase,
    UserSubscription,
    PlanType,
    PurchaseStatus,
    SubscriptionStatus,
)
from src.modules.payment.domain.repositories import IPaymentRepository


class InMemoryPaymentRepository(IPaymentRepository):
    def __init__(self):
        self.purchases: list[CoursePurchase] = []
        self.subscriptions: list[UserSubscription] = []

    async def save_purchase(self, purchase: CoursePurchase) -> CoursePurchase:
        self.purchases.append(purchase)
        return purchase

    async def has_active_purchase(self, user_id: str, course_id: str) -> bool:
        return any(
            p.user_id == user_id
            and p.course_id == course_id
            and p.status == PurchaseStatus.COMPLETED
            for p in self.purchases
        )

    async def save_subscription(
        self, subscription: UserSubscription
    ) -> UserSubscription:
        self.subscriptions.append(subscription)
        return subscription

    async def get_active_subscription(self, user_id: str) -> UserSubscription | None:
        for sub in reversed(self.subscriptions):
            if sub.user_id == user_id and sub.is_currently_active():
                return sub
        return None

    async def list_user_purchases(self, user_id: str) -> list[CoursePurchase]:
        return [p for p in self.purchases if p.user_id == user_id]


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_purchase_course_success(mock_scope):
    mock_session = AsyncMock()
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    # Mock DB query result
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    success, msg, purchase = await use_case.purchase_course(
        user_id="user_123",
        course_id="course_python",
        payment_method="MOCK",
    )

    assert success is True
    assert purchase is not None
    assert purchase.user_id == "user_123"
    assert purchase.course_id == "course_python"
    assert purchase.status == PurchaseStatus.COMPLETED
    assert await repo.has_active_purchase("user_123", "course_python") is True


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_purchase_course_already_purchased(mock_scope):
    mock_session = AsyncMock()
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    # Mock DB query result
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    # First purchase
    await use_case.purchase_course("user_123", "course_python")

    # Second purchase attempt
    success, msg, purchase = await use_case.purchase_course("user_123", "course_python")
    assert success is True
    assert "đã mua và sở hữu" in msg
    assert purchase is None


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_subscribe_coursera_plus_monthly(mock_scope):
    mock_session = AsyncMock()
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    success, msg, sub = await use_case.subscribe_coursera_plus(
        user_id="user_456",
        plan_type=PlanType.MONTHLY,
    )

    assert success is True
    assert sub is not None
    assert sub.user_id == "user_456"
    assert sub.plan_type == PlanType.MONTHLY
    assert sub.status == SubscriptionStatus.ACTIVE
    assert sub.is_currently_active() is True

    active_sub = await repo.get_active_subscription("user_456")
    assert active_sub is not None
    assert active_sub.id == sub.id


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_subscribe_coursera_plus_yearly(mock_scope):
    mock_session = AsyncMock()
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    success, msg, sub = await use_case.subscribe_coursera_plus(
        user_id="user_789",
        plan_type=PlanType.YEARLY,
    )

    assert success is True
    assert sub is not None
    assert sub.plan_type == PlanType.YEARLY
    assert sub.is_currently_active() is True


@pytest.mark.asyncio
async def test_user_subscription_expired():
    past_exp = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    sub = UserSubscription(
        id="sub_old",
        user_id="user_old",
        plan_type=PlanType.MONTHLY,
        status=SubscriptionStatus.ACTIVE,
        starts_at=(datetime.now(timezone.utc) - timedelta(days=31)).isoformat(),
        expires_at=past_exp,
        created_at=(datetime.now(timezone.utc) - timedelta(days=31)).isoformat(),
    )

    assert sub.is_currently_active() is False
