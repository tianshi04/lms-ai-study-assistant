from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.gen.payment.v1 import payment_pb as pb
from src.modules.payment.domain import PaymentTargetType, PlanType
from src.modules.payment.presentation.payment_handler import PaymentHandler
from src.shared.auth import CurrentUser


@pytest.mark.asyncio
async def test_create_vn_pay_payment_url_handler():
    usecase_mock = AsyncMock()
    usecase_mock.create_vnpay_payment_url.return_value = (
        True,
        "Thành công",
        "https://sandbox.vnpayment.vn/payment",
        "order_123",
        "txn_456",
    )

    handler = PaymentHandler(usecase_mock)
    req = pb.CreateVNPayPaymentUrlRequest(
        target_type=pb.PaymentTargetType.COURSE,
        target_id="course_1",
        plan_type=pb.PlanType.UNSPECIFIED,
    )
    ctx_mock = MagicMock()

    user = CurrentUser(id="user_123", email="user@example.com")
    with patch(
        "src.modules.payment.presentation.payment_handler.require_current_user",
        return_value=user,
    ):
        res = await handler.create_vn_pay_payment_url(req, ctx_mock)

    assert res.success is True
    assert res.payment_url == "https://sandbox.vnpayment.vn/payment"
    assert res.order_id == "order_123"
    assert res.vnp_txn_ref == "txn_456"
    usecase_mock.create_vnpay_payment_url.assert_called_once_with(
        user_id="user_123",
        target_type=PaymentTargetType.COURSE,
        target_id="course_1",
        plan_type=PlanType.UNSPECIFIED,
        return_url="",
    )


@pytest.mark.asyncio
async def test_verify_vn_pay_payment_handler():
    usecase_mock = AsyncMock()
    usecase_mock.verify_vnpay_payment.return_value = (
        True,
        "Thanh toán thành công",
        "order_123",
        PaymentTargetType.COURSE,
        "course_1",
        PlanType.UNSPECIFIED,
        None,
        None,
    )

    handler = PaymentHandler(usecase_mock)
    req = pb.VerifyVNPayPaymentRequest(
        query_params={"vnp_ResponseCode": "00", "vnp_TxnRef": "txn_456"}
    )
    ctx_mock = MagicMock()

    user = CurrentUser(id="user_123", email="user@example.com")
    with patch(
        "src.modules.payment.presentation.payment_handler.require_current_user",
        return_value=user,
    ):
        res = await handler.verify_vn_pay_payment(req, ctx_mock)

    assert res.success is True
    assert res.order_id == "order_123"
    assert res.target_id == "course_1"
    usecase_mock.verify_vnpay_payment.assert_called_once_with(
        user_id="user_123",
        query_params={"vnp_ResponseCode": "00", "vnp_TxnRef": "txn_456"},
    )


@pytest.mark.asyncio
async def test_cancel_vn_pay_order_handler():
    usecase_mock = AsyncMock()
    usecase_mock.cancel_vnpay_order.return_value = (True, "Hủy đơn hàng thành công!")

    handler = PaymentHandler(usecase_mock)
    req = pb.CancelVNPayOrderRequest(
        vnp_txn_ref="VNP-123456",
        order_id="order_789",
    )
    ctx_mock = MagicMock()

    user = CurrentUser(id="user_123", email="user@example.com")
    with patch(
        "src.modules.payment.presentation.payment_handler.require_current_user",
        return_value=user,
    ):
        res = await handler.cancel_vn_pay_order(req, ctx_mock)

    assert res.success is True
    assert res.message == "Hủy đơn hàng thành công!"
    usecase_mock.cancel_vnpay_order.assert_called_once_with(
        user_id="user_123",
        vnp_txn_ref="VNP-123456",
        order_id="order_789",
    )


@pytest.mark.asyncio
async def test_get_user_payment_access_handler():
    usecase_mock = AsyncMock()
    usecase_mock.get_user_payment_access.return_value = (True, "Quyền truy cập hợp lệ.")

    handler = PaymentHandler(usecase_mock)
    req = pb.GetUserPaymentAccessRequest(course_id="course_999")
    ctx_mock = MagicMock()

    user = CurrentUser(id="user_123", email="user@example.com")
    with patch(
        "src.modules.payment.presentation.payment_handler.require_current_user",
        return_value=user,
    ):
        res = await handler.get_user_payment_access(req, ctx_mock)

    assert res.has_paid_access is True
    assert res.access_reason == "Quyền truy cập hợp lệ."
    usecase_mock.get_user_payment_access.assert_called_once_with(
        user_id="user_123",
        course_id="course_999",
    )
