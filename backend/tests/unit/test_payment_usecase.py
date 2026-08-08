"""Unit tests for PaymentUseCase and payment access rules (BR_ACCESS_004)."""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from src.modules.payment.application.payment_usecase import PaymentUseCase
from src.modules.payment.domain.entities import (
    CoursePurchase,
    PaymentOrder,
    PaymentOrderStatus,
    PaymentTargetType,
    PaymentTransaction,
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
        self.orders: list[PaymentOrder] = []
        self.transactions: list[PaymentTransaction] = []

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
        for idx, sub in enumerate(self.subscriptions):
            if sub.id == subscription.id or sub.user_id == subscription.user_id:
                self.subscriptions[idx] = subscription
                return subscription
        self.subscriptions.append(subscription)
        return subscription

    async def get_active_subscription(self, user_id: str) -> UserSubscription | None:
        for sub in reversed(self.subscriptions):
            if sub.user_id == user_id and sub.is_currently_active():
                return sub
        return None

    async def get_user_subscription(self, user_id: str) -> UserSubscription | None:
        for sub in reversed(self.subscriptions):
            if sub.user_id == user_id:
                return sub
        return None

    async def list_user_purchases(self, user_id: str) -> list[CoursePurchase]:
        return [p for p in self.purchases if p.user_id == user_id]

    async def save_order(self, order: PaymentOrder) -> PaymentOrder:
        self.orders.append(order)
        return order
        return order

    async def get_order_by_txn_ref(self, vnp_txn_ref: str) -> PaymentOrder | None:
        for o in self.orders:
            if o.vnp_txn_ref == vnp_txn_ref:
                return o
        return None

    async def get_order_by_txn_ref_for_update(
        self, vnp_txn_ref: str
    ) -> PaymentOrder | None:
        return await self.get_order_by_txn_ref(vnp_txn_ref)

    async def get_active_pending_order(
        self,
        user_id: str,
        target_type: PaymentTargetType,
        target_id: str,
        plan_type: PlanType = PlanType.UNSPECIFIED,
        reuse_ttl_minutes: int = 15,
    ) -> PaymentOrder | None:
        now_dt = datetime.now(timezone.utc)
        cutoff_dt = now_dt - timedelta(minutes=reuse_ttl_minutes)

        for o in reversed(self.orders):
            if (
                o.user_id == user_id
                and o.target_type == target_type
                and o.target_id == target_id
                and o.plan_type == plan_type
                and o.status == PaymentOrderStatus.PENDING
            ):
                try:
                    c_dt = datetime.fromisoformat(o.created_at)
                    if c_dt >= cutoff_dt:
                        return o
                except Exception:
                    continue
        return None

    async def list_pending_orders_older_than(
        self, window_minutes: int = 15, limit: int = 50
    ) -> list[PaymentOrder]:
        now_dt = datetime.now(timezone.utc)
        cutoff_dt = now_dt - timedelta(minutes=window_minutes)

        res = []
        for o in self.orders:
            if o.status == PaymentOrderStatus.PENDING:
                try:
                    c_dt = datetime.fromisoformat(o.created_at)
                    if c_dt <= cutoff_dt:
                        res.append(o)
                except Exception:
                    continue
        return res[:limit]

    async def get_order_by_id(self, order_id: str) -> PaymentOrder | None:
        for o in self.orders:
            if o.id == order_id:
                return o
        return None

    async def update_order_status(
        self, order_id: str, status: PaymentOrderStatus
    ) -> PaymentOrder | None:
        for o in self.orders:
            if o.id == order_id:
                o.status = status
                o.updated_at = datetime.now(timezone.utc).isoformat()
                return o
        return None

    async def save_transaction(
        self, transaction: PaymentTransaction
    ) -> PaymentTransaction:
        self.transactions.append(transaction)
        return transaction

    async def list_user_orders(self, user_id: str) -> list[PaymentOrder]:
        return [o for o in reversed(self.orders) if o.user_id == user_id]

    async def get_course_titles(self, course_ids: list[str]) -> dict[str, str]:
        return {cid: f"Course {cid}" for cid in course_ids}


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_purchase_course_success(mock_scope):
    mock_session = AsyncMock()
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

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
async def test_create_vnpay_payment_url_success(mock_scope):
    mock_session = AsyncMock()
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    from src.modules.payment.domain.entities import PaymentTargetType

    success, msg, pay_url, order_id, txn_ref = await use_case.create_vnpay_payment_url(
        user_id="user_vnp_1",
        target_type=PaymentTargetType.COURSE,
        target_id="course_101",
    )

    assert success is True
    assert "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html" in pay_url
    assert "vnp_SecureHash=" in pay_url
    assert txn_ref.startswith("VNP-")
    assert len(repo.orders) == 1
    assert repo.orders[0].vnp_txn_ref == txn_ref
    assert repo.orders[0].status == PaymentOrderStatus.PENDING


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_verify_vnpay_payment_success(mock_scope):
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    from src.modules.payment.domain.entities import PaymentTargetType
    from src.modules.payment.infrastructure.vnpay_service import VNPayService

    success, msg, pay_url, order_id, txn_ref = await use_case.create_vnpay_payment_url(
        user_id="user_vnp_2",
        target_type=PaymentTargetType.COURSE,
        target_id="course_202",
    )

    # Build simulated valid query params from VNPay
    raw_params = {
        "vnp_Amount": "119000000",
        "vnp_BankCode": "NCB",
        "vnp_Command": "pay",
        "vnp_OrderInfo": "Thanh toan khoa hoc",
        "vnp_PayDate": "20260804160000",
        "vnp_ResponseCode": "00",
        "vnp_TmnCode": "2QX02MS1",
        "vnp_TransactionNo": "14500000",
        "vnp_TransactionStatus": "00",
        "vnp_TxnRef": txn_ref,
        "vnp_Version": "2.1.0",
    }

    # Calculate valid hash
    sorted_items = sorted(raw_params.items())
    import urllib.parse

    hash_data = "&".join(
        f"{urllib.parse.quote_plus(str(k))}={urllib.parse.quote_plus(str(v))}"
        for k, v in sorted_items
    )
    from src.shared.config import settings

    sec_hash = VNPayService.calculate_hmac_sha512(settings.VNPAY_HASH_SECRET, hash_data)
    raw_params["vnp_SecureHash"] = sec_hash

    (
        v_success,
        v_msg,
        v_order_id,
        v_type,
        v_target_id,
        v_plan_type,
        purchase,
        sub,
    ) = await use_case.verify_vnpay_payment(
        user_id="user_vnp_2",
        query_params=raw_params,
    )

    assert v_success is True
    assert v_order_id == order_id
    assert purchase is not None
    assert purchase.course_id == "course_202"
    assert repo.orders[0].status == PaymentOrderStatus.COMPLETED
    assert len(repo.transactions) == 1


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_process_vnpay_ipn_success(mock_scope):
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    from src.modules.payment.domain.entities import PaymentTargetType
    from src.modules.payment.infrastructure.vnpay_service import VNPayService

    _, _, _, _, txn_ref = await use_case.create_vnpay_payment_url(
        user_id="user_vnp_3",
        target_type=PaymentTargetType.SYSTEM_SUBSCRIPTION,
        target_id="COURSERA_PLUS",
        plan_type=PlanType.MONTHLY,
    )

    raw_params = {
        "vnp_Amount": "79000000",
        "vnp_BankCode": "NCB",
        "vnp_Command": "pay",
        "vnp_OrderInfo": "Thanh toan Coursera Plus",
        "vnp_PayDate": "20260804160000",
        "vnp_ResponseCode": "00",
        "vnp_TmnCode": "2QX02MS1",
        "vnp_TransactionNo": "14500001",
        "vnp_TransactionStatus": "00",
        "vnp_TxnRef": txn_ref,
        "vnp_Version": "2.1.0",
    }

    sorted_items = sorted(raw_params.items())
    import urllib.parse

    hash_data = "&".join(
        f"{urllib.parse.quote_plus(str(k))}={urllib.parse.quote_plus(str(v))}"
        for k, v in sorted_items
    )
    from src.shared.config import settings

    sec_hash = VNPayService.calculate_hmac_sha512(settings.VNPAY_HASH_SECRET, hash_data)
    raw_params["vnp_SecureHash"] = sec_hash

    ipn_res = await use_case.process_vnpay_ipn(raw_params)

    assert ipn_res == {"RspCode": "00", "Message": "Confirm Success"}
    assert repo.orders[0].status == PaymentOrderStatus.COMPLETED
    assert len(repo.subscriptions) == 1
    assert repo.subscriptions[0].plan_type == PlanType.MONTHLY


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


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_pending_order_reuse(mock_scope):
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    # First call: creates new order
    (
        success1,
        msg1,
        pay_url1,
        order_id1,
        txn_ref1,
    ) = await use_case.create_vnpay_payment_url(
        user_id="user_reuse",
        target_type=PaymentTargetType.COURSE,
        target_id="course_reuse_101",
    )
    assert success1 is True
    assert len(repo.orders) == 1

    # Second call within 15 mins: reuses existing order
    (
        success2,
        msg2,
        pay_url2,
        order_id2,
        txn_ref2,
    ) = await use_case.create_vnpay_payment_url(
        user_id="user_reuse",
        target_type=PaymentTargetType.COURSE,
        target_id="course_reuse_101",
    )
    assert success2 is True
    assert "Tái sử dụng" in msg2
    assert order_id2 == order_id1
    assert txn_ref2 == txn_ref1
    assert len(repo.orders) == 1


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_amount_tampering_detected(mock_scope):
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    _, _, _, _, txn_ref = await use_case.create_vnpay_payment_url(
        user_id="user_tamper",
        target_type=PaymentTargetType.COURSE,
        target_id="course_tamper_1",
    )

    # Build simulated tamper query params with small amount (1000 VND instead of 1190000 VND)
    raw_params = {
        "vnp_Amount": "100000",
        "vnp_BankCode": "NCB",
        "vnp_Command": "pay",
        "vnp_OrderInfo": "Thanh toan khoa hoc",
        "vnp_PayDate": "20260804160000",
        "vnp_ResponseCode": "00",
        "vnp_TmnCode": "2QX02MS1",
        "vnp_TransactionNo": "14500099",
        "vnp_TransactionStatus": "00",
        "vnp_TxnRef": txn_ref,
        "vnp_Version": "2.1.0",
    }

    from src.modules.payment.infrastructure.vnpay_service import VNPayService
    from src.shared.config import settings

    sorted_items = sorted(raw_params.items())
    import urllib.parse

    hash_data = "&".join(
        f"{urllib.parse.quote_plus(str(k))}={urllib.parse.quote_plus(str(v))}"
        for k, v in sorted_items
    )
    raw_params["vnp_SecureHash"] = VNPayService.calculate_hmac_sha512(
        settings.VNPAY_HASH_SECRET, hash_data
    )

    ipn_res = await use_case.process_vnpay_ipn(raw_params)
    assert ipn_res == {"RspCode": "04", "Message": "Invalid Amount"}
    assert repo.orders[0].status == PaymentOrderStatus.FAILED


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_list_user_purchases_returns_active_sub(mock_scope):
    mock_session = AsyncMock()
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    future_exp = (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()
    sub = UserSubscription(
        id="sub_active",
        user_id="user_sub_test",
        plan_type=PlanType.MONTHLY,
        status=SubscriptionStatus.ACTIVE,
        starts_at=datetime.now(timezone.utc).isoformat(),
        expires_at=future_exp,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    await repo.save_subscription(sub)

    purchases, orders, titles, active_sub = await use_case.list_user_purchases(
        "user_sub_test"
    )
    assert active_sub is not None
    assert active_sub.id == "sub_active"
    assert active_sub.is_currently_active() is True


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_list_user_purchases_auto_reconciles_missing_subscription(mock_scope):
    mock_session = AsyncMock()
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    now_iso = datetime.now(timezone.utc).isoformat()
    for i in range(4):
        o = PaymentOrder(
            id=f"order_sub_{i}",
            user_id="user_stacked_1",
            target_type=PaymentTargetType.SYSTEM_SUBSCRIPTION,
            target_id="plus_monthly",
            plan_type=PlanType.MONTHLY,
            amount=790000.0,
            currency="VND",
            status=PaymentOrderStatus.COMPLETED,
            vnp_txn_ref=f"VNP-SUB-{i}",
            created_at=now_iso,
            updated_at=now_iso,
        )
        await repo.save_order(o)

    # Verify no subscription exists prior to call
    assert await repo.get_active_subscription("user_stacked_1") is None

    purchases, orders, titles, active_sub = await use_case.list_user_purchases(
        "user_stacked_1"
    )

    assert active_sub is not None
    assert active_sub.user_id == "user_stacked_1"
    assert active_sub.is_currently_active() is True
    assert active_sub.plan_type == PlanType.MONTHLY

    # Verify accumulated duration (4 * 30 days = ~120 days from order creation)
    exp_dt = datetime.fromisoformat(active_sub.expires_at)
    now_dt = datetime.now(timezone.utc)
    diff_days = (exp_dt - now_dt).days
    assert 118 <= diff_days <= 121


@pytest.mark.asyncio
async def test_safe_enum_parse_handles_none_and_legacy_strings():
    from src.modules.payment.domain.entities import (
        safe_enum_parse,
        PlanType,
        SubscriptionStatus,
    )

    assert (
        safe_enum_parse(PlanType, "NONE", PlanType.UNSPECIFIED) == PlanType.UNSPECIFIED
    )
    assert safe_enum_parse(PlanType, None, PlanType.UNSPECIFIED) == PlanType.UNSPECIFIED
    assert (
        safe_enum_parse(PlanType, "PLAN_TYPE_MONTHLY", PlanType.UNSPECIFIED)
        == PlanType.MONTHLY
    )
    assert safe_enum_parse(PlanType, "YEARLY", PlanType.UNSPECIFIED) == PlanType.YEARLY
    assert (
        safe_enum_parse(
            SubscriptionStatus,
            "SUBSCRIPTION_STATUS_ACTIVE",
            SubscriptionStatus.UNSPECIFIED,
        )
        == SubscriptionStatus.ACTIVE
    )


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_subscribe_coursera_plus_creates_completed_order(mock_scope):
    mock_session = AsyncMock()
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    success, msg, sub = await use_case.subscribe_coursera_plus(
        user_id="user_direct_sub",
        plan_type=PlanType.MONTHLY,
        payment_method="MOCK_DIRECT",
    )

    assert success is True
    assert sub is not None
    assert sub.is_currently_active() is True
    assert len(repo.subscriptions) == 1
    assert len(repo.orders) == 1
    assert repo.orders[0].status == PaymentOrderStatus.COMPLETED
    assert repo.orders[0].target_type == PaymentTargetType.SYSTEM_SUBSCRIPTION


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_cancel_vnpay_order_success(mock_scope):
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    success, msg, pay_url, order_id, txn_ref = await use_case.create_vnpay_payment_url(
        user_id="user_cancel_1",
        target_type=PaymentTargetType.COURSE,
        target_id="course_to_cancel",
    )
    assert success is True
    assert repo.orders[0].status == PaymentOrderStatus.PENDING

    cancel_ok, cancel_msg = await use_case.cancel_vnpay_order(
        user_id="user_cancel_1",
        vnp_txn_ref=txn_ref,
    )
    assert cancel_ok is True
    assert "Hủy đơn hàng thành công" in cancel_msg
    assert repo.orders[0].status == PaymentOrderStatus.CANCELLED


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_cancel_vnpay_order_wrong_user(mock_scope):
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    success, msg, pay_url, order_id, txn_ref = await use_case.create_vnpay_payment_url(
        user_id="user_owner",
        target_type=PaymentTargetType.COURSE,
        target_id="course_ownership",
    )

    cancel_ok, cancel_msg = await use_case.cancel_vnpay_order(
        user_id="user_attacker",
        vnp_txn_ref=txn_ref,
    )
    assert cancel_ok is False
    assert "không thuộc về tài khoản" in cancel_msg
    assert repo.orders[0].status == PaymentOrderStatus.PENDING


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_verify_vnpay_payment_wrong_user_ownership(mock_scope):
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    _, _, _, _, txn_ref = await use_case.create_vnpay_payment_url(
        user_id="user_victim",
        target_type=PaymentTargetType.COURSE,
        target_id="course_sec",
    )

    raw_params = {
        "vnp_Amount": "119000000",
        "vnp_BankCode": "NCB",
        "vnp_Command": "pay",
        "vnp_OrderInfo": "Thanh toan khoa hoc",
        "vnp_PayDate": "20260804160000",
        "vnp_ResponseCode": "00",
        "vnp_TmnCode": "2QX02MS1",
        "vnp_TransactionNo": "14500000",
        "vnp_TransactionStatus": "00",
        "vnp_TxnRef": txn_ref,
        "vnp_Version": "2.1.0",
    }

    from src.modules.payment.infrastructure.vnpay_service import VNPayService
    from src.shared.config import settings

    sorted_items = sorted(raw_params.items())
    import urllib.parse

    hash_data = "&".join(
        f"{urllib.parse.quote_plus(str(k))}={urllib.parse.quote_plus(str(v))}"
        for k, v in sorted_items
    )
    raw_params["vnp_SecureHash"] = VNPayService.calculate_hmac_sha512(
        settings.VNPAY_HASH_SECRET, hash_data
    )

    (
        v_success,
        v_msg,
        _,
        _,
        _,
        _,
        _,
        _,
    ) = await use_case.verify_vnpay_payment(
        user_id="user_attacker",
        query_params=raw_params,
    )

    assert v_success is False
    assert "không thuộc về tài khoản" in v_msg


@pytest.mark.asyncio
@patch("src.modules.payment.application.payment_usecase.async_session_scope")
async def test_verify_vnpay_payment_code_24_cancelled(mock_scope):
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    repo = InMemoryPaymentRepository()
    use_case = PaymentUseCase(repo=repo)

    _, _, _, _, txn_ref = await use_case.create_vnpay_payment_url(
        user_id="user_cancel_portal",
        target_type=PaymentTargetType.COURSE,
        target_id="course_cancel_portal",
    )

    raw_params = {
        "vnp_Amount": "119000000",
        "vnp_BankCode": "NCB",
        "vnp_Command": "pay",
        "vnp_OrderInfo": "Thanh toan khoa hoc",
        "vnp_PayDate": "20260804160000",
        "vnp_ResponseCode": "24",
        "vnp_TmnCode": "2QX02MS1",
        "vnp_TransactionNo": "0",
        "vnp_TransactionStatus": "02",
        "vnp_TxnRef": txn_ref,
        "vnp_Version": "2.1.0",
    }

    from src.modules.payment.infrastructure.vnpay_service import VNPayService
    from src.shared.config import settings

    sorted_items = sorted(raw_params.items())
    import urllib.parse

    hash_data = "&".join(
        f"{urllib.parse.quote_plus(str(k))}={urllib.parse.quote_plus(str(v))}"
        for k, v in sorted_items
    )
    raw_params["vnp_SecureHash"] = VNPayService.calculate_hmac_sha512(
        settings.VNPAY_HASH_SECRET, hash_data
    )

    v_success, v_msg, _, _, _, _, _, _ = await use_case.verify_vnpay_payment(
        user_id="user_cancel_portal",
        query_params=raw_params,
    )

    assert v_success is False
    assert "hủy bởi người dùng" in v_msg
    assert repo.orders[0].status == PaymentOrderStatus.CANCELLED
