"""Application Use Cases for Payment module."""

from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Optional
import uuid

from sqlalchemy import select

from sqlalchemy.exc import IntegrityError

from src.modules.catalog.infrastructure.models import CourseModel
from src.modules.payment.domain.constants import (
    DEFAULT_CURRENCY,
    DEFAULT_MONTHLY_PLAN_DAYS,
    DEFAULT_SINGLE_COURSE_PRICE_VND,
    DEFAULT_SYSTEM_SUBSCRIPTION_MONTHLY_PRICE_VND,
    DEFAULT_SYSTEM_SUBSCRIPTION_YEARLY_PRICE_VND,
    DEFAULT_YEARLY_PLAN_DAYS,
    PENDING_ORDER_REUSE_TTL_MINUTES,
)
from src.modules.payment.domain.entities import (
    CoursePurchase,
    PaymentOrder,
    PaymentOrderStatus,
    PaymentTargetType,
    PaymentTransaction,
    PlanType,
    PurchaseStatus,
    SubscriptionStatus,
    UserSubscription,
)
from src.modules.payment.domain.repositories import IPaymentRepository
from src.modules.payment.infrastructure.repository import PaymentRepository
from src.modules.payment.infrastructure.vnpay_service import VNPayService
from src.shared.infrastructure.database import async_session_scope

logger = logging.getLogger(__name__)


class PaymentUseCase:
    def __init__(self, repo: Optional[IPaymentRepository] = None):
        self.repository = repo

    async def purchase_course(
        self, user_id: str, course_id: str, payment_method: str = "MOCK"
    ) -> tuple[bool, str, Optional[CoursePurchase]]:
        if not user_id:
            return False, "Yêu cầu đăng nhập để mua khóa học.", None
        if not course_id:
            return False, "Thiếu thông tin khóa học.", None

        async with async_session_scope() as session:
            repo = self.repository or PaymentRepository(session)
            already_purchased = await repo.has_active_purchase(user_id, course_id)
            if already_purchased:
                return (
                    True,
                    "Bạn đã mua và sở hữu khóa học này trước đó.",
                    None,
                )

            stmt = select(CourseModel).where(CourseModel.id == course_id)
            res = await session.execute(stmt)
            course = res.scalar_one_or_none()

            amount = (
                course.price
                if (course and hasattr(course, "price") and course.price > 0)
                else DEFAULT_SINGLE_COURSE_PRICE_VND
            )
            currency = (
                course.currency
                if (course and hasattr(course, "currency") and course.currency)
                else "VND"
            )

            purchase = CoursePurchase.create(
                user_id=user_id,
                course_id=course_id,
                amount=amount,
                currency=currency,
                payment_method=payment_method,
            )
            saved = await repo.save_purchase(purchase)
            logger.info(
                "User %s successfully purchased course %s for %s %s",
                user_id,
                course_id,
                amount,
                currency,
            )
            return True, "Thanh toán mua khóa học thành công!", saved

    async def subscribe_coursera_plus(
        self, user_id: str, plan_type: PlanType, payment_method: str = "MOCK"
    ) -> tuple[bool, str, Optional[UserSubscription]]:
        if not user_id:
            return False, "Yêu cầu đăng nhập để đăng ký gói thuê bao.", None

        days = (
            DEFAULT_YEARLY_PLAN_DAYS
            if plan_type == PlanType.YEARLY
            else DEFAULT_MONTHLY_PLAN_DAYS
        )
        amount = (
            DEFAULT_SYSTEM_SUBSCRIPTION_YEARLY_PRICE_VND
            if plan_type == PlanType.YEARLY
            else DEFAULT_SYSTEM_SUBSCRIPTION_MONTHLY_PRICE_VND
        )
        now_dt = datetime.now(timezone.utc)
        expires_dt = now_dt + timedelta(days=days)

        async with async_session_scope() as session:
            repo = self.repository or PaymentRepository(session)

            existing_sub = await repo.get_active_subscription(user_id)
            if not existing_sub:
                existing_sub = await repo.get_user_subscription(user_id)

            sub_id = existing_sub.id if existing_sub else str(uuid.uuid4())

            if existing_sub and existing_sub.is_currently_active():
                try:
                    cur_exp_str = str(existing_sub.expires_at).replace("Z", "+00:00")
                    cur_exp = datetime.fromisoformat(cur_exp_str)
                    if cur_exp.tzinfo is None:
                        cur_exp = cur_exp.replace(tzinfo=timezone.utc)
                    if cur_exp > now_dt:
                        expires_dt = cur_exp + timedelta(days=days)
                except Exception:
                    pass

            sub = UserSubscription(
                id=sub_id,
                user_id=user_id,
                plan_type=plan_type,
                status=SubscriptionStatus.ACTIVE,
                starts_at=now_dt.isoformat(),
                expires_at=expires_dt.isoformat(),
                created_at=existing_sub.created_at
                if existing_sub
                else now_dt.isoformat(),
            )
            saved = await repo.save_subscription(sub)

            # Record completed order for audit & transaction history
            now_str = now_dt.isoformat()
            vnp_txn_ref = f"SUB-{uuid.uuid4().hex[:12].upper()}"
            sub_order = PaymentOrder(
                id=str(uuid.uuid4()),
                user_id=user_id,
                target_type=PaymentTargetType.SYSTEM_SUBSCRIPTION,
                target_id="plus_yearly"
                if plan_type == PlanType.YEARLY
                else "plus_monthly",
                plan_type=plan_type,
                amount=amount,
                currency=DEFAULT_CURRENCY,
                status=PaymentOrderStatus.COMPLETED,
                vnp_txn_ref=vnp_txn_ref,
                created_at=now_str,
                updated_at=now_str,
            )
            await repo.save_order(sub_order)

            logger.info(
                "User %s successfully subscribed to Coursera Plus (%s) until %s",
                user_id,
                plan_type.value,
                expires_dt.isoformat(),
            )
            return (
                True,
                f"Kích hoạt thành công gói Coursera Plus ({plan_type.value})!",
                saved,
            )

    async def create_vnpay_payment_url(
        self,
        user_id: str,
        target_type: PaymentTargetType,
        target_id: str,
        plan_type: PlanType = PlanType.UNSPECIFIED,
        return_url: str = "",
        client_ip: str = "127.0.0.1",
    ) -> tuple[bool, str, str, str, str]:

        if not user_id:
            return False, "Yêu cầu đăng nhập để thanh toán.", "", "", ""
        if not target_id:
            return False, "Thiếu thông tin sản phẩm cần thanh toán.", "", "", ""

        async with async_session_scope() as session:
            repo = self.repository or PaymentRepository(session)

            amount = DEFAULT_SINGLE_COURSE_PRICE_VND
            order_info = "Thanh toan don hang LMS"

            if target_type == PaymentTargetType.COURSE:
                already_purchased = await repo.has_active_purchase(user_id, target_id)
                if already_purchased:
                    return False, "Bạn đã mua và sở hữu khóa học này.", "", "", ""
                stmt = select(CourseModel).where(CourseModel.id == target_id)
                res = await session.execute(stmt)
                course = res.scalar_one_or_none()
                if course and hasattr(course, "price") and course.price > 0:
                    amount = course.price
                else:
                    amount = DEFAULT_SINGLE_COURSE_PRICE_VND
                course_title = (
                    getattr(course, "title", target_id) if course else target_id
                )
                order_info = f"Thanh toan khoa hoc {course_title[:30]}"

            elif target_type == PaymentTargetType.SYSTEM_SUBSCRIPTION:
                amount = (
                    DEFAULT_SYSTEM_SUBSCRIPTION_YEARLY_PRICE_VND
                    if plan_type == PlanType.YEARLY
                    else DEFAULT_SYSTEM_SUBSCRIPTION_MONTHLY_PRICE_VND
                )
                order_info = f"Thanh toan Coursera Plus {plan_type.value}"
            else:
                return False, "Loại sản phẩm thanh toán không hợp lệ.", "", "", ""

            # Check for existing unexpired PENDING order for reuse
            existing_order = await repo.get_active_pending_order(
                user_id=user_id,
                target_type=target_type,
                target_id=target_id,
                plan_type=plan_type,
                reuse_ttl_minutes=PENDING_ORDER_REUSE_TTL_MINUTES,
            )
            if existing_order:
                payment_url = VNPayService.generate_payment_url(
                    vnp_txn_ref=existing_order.vnp_txn_ref,
                    amount=existing_order.amount,
                    order_info=order_info,
                    ip_addr=client_ip,
                    return_url=return_url,
                    created_at=existing_order.created_at,
                )
                logger.info(
                    "[VNPAY] Reused active pending order %s (TxnRef: %s) for user %s",
                    existing_order.id,
                    existing_order.vnp_txn_ref,
                    user_id,
                )
                return (
                    True,
                    "Tái sử dụng đơn hàng đang chờ thanh toán",
                    payment_url,
                    existing_order.id,
                    existing_order.vnp_txn_ref,
                )

            vnp_txn_ref = f"VNP-{uuid.uuid4().hex[:12].upper()}"
            now_str = datetime.now(timezone.utc).isoformat()
            order_id = str(uuid.uuid4())

            order = PaymentOrder(
                id=order_id,
                user_id=user_id,
                target_type=target_type,
                target_id=target_id,
                plan_type=plan_type,
                amount=amount,
                currency=DEFAULT_CURRENCY,
                status=PaymentOrderStatus.PENDING,
                vnp_txn_ref=vnp_txn_ref,
                created_at=now_str,
                updated_at=now_str,
            )
            await repo.save_order(order)

            payment_url = VNPayService.generate_payment_url(
                vnp_txn_ref=vnp_txn_ref,
                amount=amount,
                order_info=order_info,
                ip_addr=client_ip,
                return_url=return_url,
            )

            logger.info(
                "[VNPAY] Created pending order %s (TxnRef: %s) for user %s, amount %s VND",
                order_id,
                vnp_txn_ref,
                user_id,
                amount,
            )
            return (
                True,
                "Tạo URL thanh toán thành công",
                payment_url,
                order_id,
                vnp_txn_ref,
            )

    async def verify_vnpay_payment(
        self, user_id: str, query_params: dict[str, str]
    ) -> tuple[
        bool,
        str,
        str,
        PaymentTargetType,
        str,
        PlanType,
        Optional[CoursePurchase],
        Optional[UserSubscription],
    ]:
        valid_sig, sig_err = VNPayService.verify_response_signature(query_params)
        if not valid_sig:
            return (
                False,
                sig_err,
                "",
                PaymentTargetType.UNSPECIFIED,
                "",
                PlanType.UNSPECIFIED,
                None,
                None,
            )

        vnp_txn_ref = query_params.get("vnp_TxnRef", "")
        vnp_response_code = query_params.get("vnp_ResponseCode", "")
        vnp_transaction_no = query_params.get("vnp_TransactionNo", "")
        vnp_bank_code = query_params.get("vnp_BankCode", "")
        vnp_pay_date = query_params.get("vnp_PayDate", "")

        async with async_session_scope() as session:
            repo = self.repository or PaymentRepository(session)
            order = await repo.get_order_by_txn_ref_for_update(vnp_txn_ref)
            if not order:
                return (
                    False,
                    f"Không tìm thấy đơn hàng với mã đối soát {vnp_txn_ref}.",
                    "",
                    PaymentTargetType.UNSPECIFIED,
                    "",
                    PlanType.UNSPECIFIED,
                    None,
                    None,
                )

            # Check Amount Tampering
            vnp_amount_raw = query_params.get("vnp_Amount", "0")
            try:
                vnp_amount_val = float(vnp_amount_raw) / 100.0
            except ValueError:
                vnp_amount_val = 0.0

            if abs(vnp_amount_val - order.amount) > 0.01:
                logger.warning(
                    "[VNPAY] Amount tampering detected for TxnRef %s: received %s, expected %s",
                    vnp_txn_ref,
                    vnp_amount_val,
                    order.amount,
                )
                await repo.update_order_status(order.id, PaymentOrderStatus.FAILED)
                return (
                    False,
                    "Số tiền thanh toán không khớp với giá trị đơn hàng.",
                    order.id,
                    order.target_type,
                    order.target_id,
                    order.plan_type,
                    None,
                    None,
                )

            # Audit log transaction
            tx = PaymentTransaction(
                id=str(uuid.uuid4()),
                order_id=order.id,
                vnp_transaction_no=vnp_transaction_no,
                vnp_response_code=vnp_response_code,
                vnp_bank_code=vnp_bank_code,
                vnp_pay_date=vnp_pay_date,
                raw_payload=json.dumps(query_params, ensure_ascii=False),
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            await repo.save_transaction(tx)

            if vnp_response_code == "00":
                if order.status != PaymentOrderStatus.COMPLETED:
                    await repo.update_order_status(
                        order.id, PaymentOrderStatus.COMPLETED
                    )

                # Fulfill purchase / subscription access
                purchase_res, sub_res = await self._fulfill_access(
                    repo,
                    order.user_id,
                    order.target_type,
                    order.target_id,
                    order.plan_type,
                    order.amount,
                )

                logger.info(
                    "[VNPAY] Verified & completed order %s for TxnRef %s",
                    order.id,
                    vnp_txn_ref,
                )
                return (
                    True,
                    "Thanh toán VNPay thành công!",
                    order.id,
                    order.target_type,
                    order.target_id,
                    order.plan_type,
                    purchase_res,
                    sub_res,
                )
            else:
                await repo.update_order_status(order.id, PaymentOrderStatus.FAILED)
                logger.warning(
                    "[VNPAY] Payment failed for TxnRef %s with code %s",
                    vnp_txn_ref,
                    vnp_response_code,
                )
                return (
                    False,
                    f"Thanh toán thất bại hoặc đã bị hủy (Mã lỗi: {vnp_response_code}).",
                    order.id,
                    order.target_type,
                    order.target_id,
                    order.plan_type,
                    None,
                    None,
                )

    async def process_vnpay_ipn(self, query_params: dict[str, str]) -> dict[str, str]:
        """Server-to-Server IPN Callback handler for VNPay Webhook."""
        valid_sig, _ = VNPayService.verify_response_signature(query_params)
        if not valid_sig:
            return {"RspCode": "97", "Message": "Invalid Checksum"}

        vnp_txn_ref = query_params.get("vnp_TxnRef", "")
        vnp_response_code = query_params.get("vnp_ResponseCode", "")
        vnp_transaction_no = query_params.get("vnp_TransactionNo", "")
        vnp_bank_code = query_params.get("vnp_BankCode", "")
        vnp_pay_date = query_params.get("vnp_PayDate", "")

        async with async_session_scope() as session:
            repo = self.repository or PaymentRepository(session)
            order = await repo.get_order_by_txn_ref_for_update(vnp_txn_ref)
            if not order:
                return {"RspCode": "01", "Message": "Order not found"}

            if order.status == PaymentOrderStatus.COMPLETED:
                return {"RspCode": "02", "Message": "Order already confirmed"}

            # Check Amount Tampering
            vnp_amount_raw = query_params.get("vnp_Amount", "0")
            try:
                vnp_amount_val = float(vnp_amount_raw) / 100.0
            except ValueError:
                vnp_amount_val = 0.0

            if abs(vnp_amount_val - order.amount) > 0.01:
                logger.warning(
                    "[VNPAY IPN] Amount tampering detected for TxnRef %s", vnp_txn_ref
                )
                await repo.update_order_status(order.id, PaymentOrderStatus.FAILED)
                return {"RspCode": "04", "Message": "Invalid Amount"}

            tx = PaymentTransaction(
                id=str(uuid.uuid4()),
                order_id=order.id,
                vnp_transaction_no=vnp_transaction_no,
                vnp_response_code=vnp_response_code,
                vnp_bank_code=vnp_bank_code,
                vnp_pay_date=vnp_pay_date,
                raw_payload=json.dumps(query_params, ensure_ascii=False),
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            await repo.save_transaction(tx)

            if vnp_response_code == "00":
                await repo.update_order_status(order.id, PaymentOrderStatus.COMPLETED)
                await self._fulfill_access(
                    repo,
                    order.user_id,
                    order.target_type,
                    order.target_id,
                    order.plan_type,
                    order.amount,
                )
                logger.info(
                    "[VNPAY IPN] Order %s fulfilled successfully via IPN", order.id
                )
            else:
                await repo.update_order_status(order.id, PaymentOrderStatus.FAILED)
                logger.info("[VNPAY IPN] Order %s marked FAILED via IPN", order.id)

            return {"RspCode": "00", "Message": "Confirm Success"}

    async def _fulfill_access(
        self,
        repo: IPaymentRepository,
        user_id: str,
        target_type: PaymentTargetType,
        target_id: str,
        plan_type: PlanType,
        amount: float,
    ) -> tuple[
        Optional[CoursePurchase],
        Optional[UserSubscription],
    ]:
        now_dt = datetime.now(timezone.utc)
        now_str = now_dt.isoformat()

        if target_type == PaymentTargetType.COURSE:
            already = await repo.has_active_purchase(user_id, target_id)
            if not already:
                purchase = CoursePurchase(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    course_id=target_id,
                    amount=amount,
                    currency="VND",
                    status=PurchaseStatus.COMPLETED,
                    payment_method="VNPAY",
                    created_at=now_str,
                )
                try:
                    saved_p = await repo.save_purchase(purchase)
                    return saved_p, None
                except IntegrityError:
                    logger.warning(
                        "[VNPAY] Duplicate purchase caught by DB Unique Constraint for user %s, course %s",
                        user_id,
                        target_id,
                    )
                    return None, None
            return None, None

        elif target_type == PaymentTargetType.SYSTEM_SUBSCRIPTION:
            synced_sub = await self._sync_user_subscription(repo, user_id)
            return None, synced_sub

        return None, None

    async def _sync_user_subscription(
        self, repo: IPaymentRepository, user_id: str
    ) -> Optional[UserSubscription]:
        """Deterministically calculate and sync active UserSubscription from all COMPLETED SYSTEM_SUBSCRIPTION orders."""
        orders = await repo.list_user_orders(user_id)
        completed_sub_orders = [
            o
            for o in orders
            if o.status == PaymentOrderStatus.COMPLETED
            and o.target_type == PaymentTargetType.SYSTEM_SUBSCRIPTION
        ]
        if not completed_sub_orders:
            return None

        completed_sub_orders.sort(key=lambda x: x.created_at)

        now_dt = datetime.now(timezone.utc)
        current_exp_dt: Optional[datetime] = None
        first_start_str = completed_sub_orders[0].created_at
        latest_plan_type = completed_sub_orders[-1].plan_type

        for o in completed_sub_orders:
            days = (
                DEFAULT_YEARLY_PLAN_DAYS
                if o.plan_type == PlanType.YEARLY
                else DEFAULT_MONTHLY_PLAN_DAYS
            )
            try:
                order_dt = datetime.fromisoformat(o.created_at)
                if order_dt.tzinfo is None:
                    order_dt = order_dt.replace(tzinfo=timezone.utc)
            except Exception:
                order_dt = now_dt

            if current_exp_dt is None or current_exp_dt < order_dt:
                current_exp_dt = order_dt + timedelta(days=days)
            else:
                current_exp_dt = current_exp_dt + timedelta(days=days)

        if not current_exp_dt:
            return None

        is_active = current_exp_dt > now_dt
        sub_status = (
            SubscriptionStatus.ACTIVE if is_active else SubscriptionStatus.EXPIRED
        )

        existing_sub = await repo.get_active_subscription(user_id)
        if not existing_sub:
            existing_sub = await repo.get_user_subscription(user_id)
        sub_id = existing_sub.id if existing_sub else str(uuid.uuid4())

        sub = UserSubscription(
            id=sub_id,
            user_id=user_id,
            plan_type=latest_plan_type,
            status=sub_status,
            starts_at=first_start_str,
            expires_at=current_exp_dt.isoformat(),
            created_at=completed_sub_orders[0].created_at,
        )

        saved_s = await repo.save_subscription(sub)
        return saved_s if is_active else None

    async def list_user_purchases(
        self, user_id: str
    ) -> tuple[
        list[CoursePurchase],
        list[PaymentOrder],
        dict[str, str],
        Optional[UserSubscription],
    ]:
        async with async_session_scope() as session:
            repo = self.repository or PaymentRepository(session)
            orders = await repo.list_user_orders(user_id)

            now_dt = datetime.now(timezone.utc)
            reconciled_any = False

            for o in orders:
                if o.status == PaymentOrderStatus.PENDING:
                    try:
                        c_dt_str = str(o.created_at).replace("Z", "+00:00")
                        c_dt = datetime.fromisoformat(c_dt_str)
                        if c_dt.tzinfo is None:
                            c_dt = c_dt.replace(tzinfo=timezone.utc)
                        age_minutes = (now_dt - c_dt).total_seconds() / 60.0
                    except Exception:
                        age_minutes = 999.0

                    if age_minutes >= 0:
                        reconciled_any = True
                        try:
                            res = await VNPayService.query_dr_transaction(
                                vnp_txn_ref=o.vnp_txn_ref,
                                order_created_at_iso=o.created_at,
                            )
                            resp_code = res.get("vnp_ResponseCode", "")
                            txn_status = res.get("vnp_TransactionStatus", "")

                            if resp_code == "00" or txn_status == "00":
                                await repo.update_order_status(
                                    o.id, PaymentOrderStatus.COMPLETED
                                )
                                await self._fulfill_access(
                                    repo,
                                    o.user_id,
                                    o.target_type,
                                    o.target_id,
                                    o.plan_type,
                                    o.amount,
                                )
                                logger.info(
                                    "[LAZY RECONCILE] Auto-fulfilled order %s for user %s",
                                    o.id,
                                    user_id,
                                )
                            elif resp_code in ("01", "02", "24") or txn_status in (
                                "01",
                                "02",
                                "99",
                            ):
                                if age_minutes >= 15.0:
                                    await repo.update_order_status(
                                        o.id, PaymentOrderStatus.FAILED
                                    )
                            else:
                                if age_minutes >= 15.0:
                                    await repo.update_order_status(
                                        o.id, PaymentOrderStatus.EXPIRED
                                    )
                        except Exception as ex:
                            logger.warning(
                                "[LAZY RECONCILE] Error reconciling order %s: %s",
                                o.id,
                                ex,
                            )
                            if age_minutes >= 15.0:
                                await repo.update_order_status(
                                    o.id, PaymentOrderStatus.EXPIRED
                                )

            if reconciled_any:
                orders = await repo.list_user_orders(user_id)

            purchases = await repo.list_user_purchases(user_id)
            course_ids = [
                o.target_id for o in orders if o.target_type == PaymentTargetType.COURSE
            ]
            titles_map = await repo.get_course_titles(course_ids)

            active_sub = await repo.get_active_subscription(user_id)
            if not active_sub or not active_sub.is_currently_active():
                active_sub = await self._sync_user_subscription(repo, user_id)
            if active_sub and not active_sub.is_currently_active():
                active_sub = None

            return purchases, orders, titles_map, active_sub
