"""Repository implementation for Payment module using SQLAlchemy Async Engine."""

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.payment.domain import (
    CoursePurchase,
    IPaymentRepository,
    PaymentOrder,
    PaymentOrderStatus,
    PaymentTargetType,
    PaymentTransaction,
    PlanType,
    PurchaseStatus,
    SubscriptionStatus,
    UserSubscription,
    safe_enum_parse,
)
from src.modules.payment.infrastructure.models import (
    CoursePurchaseModel,
    PaymentOrderModel,
    PaymentTransactionModel,
    UserSubscriptionModel,
)

logger = logging.getLogger(__name__)


class PaymentRepository(IPaymentRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_purchase(self, purchase: CoursePurchase) -> CoursePurchase | None:
        model = CoursePurchaseModel(
            id=purchase.id,
            user_id=purchase.user_id,
            course_id=purchase.course_id,
            amount=purchase.amount,
            currency=purchase.currency,
            status=purchase.status.value
            if hasattr(purchase.status, "value")
            else str(purchase.status),
            payment_method=purchase.payment_method,
            created_at=purchase.created_at,
        )
        try:
            await self.session.merge(model)
            await self.session.flush()
            return purchase
        except IntegrityError:
            logger.warning(
                "[PaymentRepository] Duplicate purchase caught by DB Unique Constraint for user %s, course %s",
                purchase.user_id,
                purchase.course_id,
            )
            return None

    async def has_active_purchase(self, user_id: str, course_id: str) -> bool:
        stmt = select(CoursePurchaseModel).where(
            CoursePurchaseModel.user_id == user_id,
            CoursePurchaseModel.course_id == course_id,
            CoursePurchaseModel.status == PurchaseStatus.COMPLETED.value,
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none() is not None

    async def save_subscription(
        self, subscription: UserSubscription
    ) -> UserSubscription:
        model = UserSubscriptionModel(
            id=subscription.id,
            user_id=subscription.user_id,
            plan_type=subscription.plan_type.value
            if hasattr(subscription.plan_type, "value")
            else str(subscription.plan_type),
            status=subscription.status.value
            if hasattr(subscription.status, "value")
            else str(subscription.status),
            starts_at=subscription.starts_at,
            expires_at=subscription.expires_at,
            created_at=subscription.created_at,
        )
        await self.session.merge(model)
        await self.session.flush()
        return subscription

    async def get_active_subscription(self, user_id: str) -> UserSubscription | None:
        stmt = (
            select(UserSubscriptionModel)
            .where(
                UserSubscriptionModel.user_id == user_id,
                UserSubscriptionModel.status == SubscriptionStatus.ACTIVE.value,
            )
            .order_by(UserSubscriptionModel.expires_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        for model in models:
            sub = UserSubscription(
                id=model.id,
                user_id=model.user_id,
                plan_type=safe_enum_parse(
                    PlanType, model.plan_type, PlanType.UNSPECIFIED
                ),
                status=safe_enum_parse(
                    SubscriptionStatus, model.status, SubscriptionStatus.UNSPECIFIED
                ),
                starts_at=model.starts_at,
                expires_at=model.expires_at,
                created_at=model.created_at,
            )
            if sub.is_currently_active():
                return sub
        return None

    async def get_user_subscription(self, user_id: str) -> UserSubscription | None:
        stmt = (
            select(UserSubscriptionModel)
            .where(UserSubscriptionModel.user_id == user_id)
            .order_by(UserSubscriptionModel.expires_at.desc())
        )
        res = await self.session.execute(stmt)
        model = res.scalars().first()
        if not model:
            return None

        return UserSubscription(
            id=model.id,
            user_id=model.user_id,
            plan_type=safe_enum_parse(PlanType, model.plan_type, PlanType.UNSPECIFIED),
            status=safe_enum_parse(
                SubscriptionStatus, model.status, SubscriptionStatus.UNSPECIFIED
            ),
            starts_at=model.starts_at,
            expires_at=model.expires_at,
            created_at=model.created_at,
        )

    async def list_user_purchases(self, user_id: str) -> list[CoursePurchase]:
        stmt = select(CoursePurchaseModel).where(CoursePurchaseModel.user_id == user_id)
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [
            CoursePurchase(
                id=m.id,
                user_id=m.user_id,
                course_id=m.course_id,
                amount=m.amount,
                currency=m.currency,
                status=safe_enum_parse(
                    PurchaseStatus, m.status, PurchaseStatus.UNSPECIFIED
                ),
                payment_method=m.payment_method,
                created_at=m.created_at,
            )
            for m in models
        ]

    async def save_order(self, order: PaymentOrder) -> PaymentOrder:
        model = PaymentOrderModel(
            id=order.id,
            user_id=order.user_id,
            target_type=order.target_type.value
            if hasattr(order.target_type, "value")
            else str(order.target_type),
            target_id=order.target_id,
            plan_type=order.plan_type.value
            if hasattr(order.plan_type, "value")
            else str(order.plan_type),
            amount=order.amount,
            currency=order.currency,
            status=order.status.value
            if hasattr(order.status, "value")
            else str(order.status),
            vnp_txn_ref=order.vnp_txn_ref,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )
        await self.session.merge(model)
        await self.session.flush()
        return order

    async def get_order_by_txn_ref(self, vnp_txn_ref: str) -> PaymentOrder | None:
        stmt = select(PaymentOrderModel).where(
            PaymentOrderModel.vnp_txn_ref == vnp_txn_ref
        )
        res = await self.session.execute(stmt)
        m = res.scalar_one_or_none()
        if not m:
            return None
        return PaymentOrder(
            id=m.id,
            user_id=m.user_id,
            target_type=safe_enum_parse(
                PaymentTargetType, m.target_type, PaymentTargetType.UNSPECIFIED
            ),
            target_id=m.target_id,
            plan_type=safe_enum_parse(PlanType, m.plan_type, PlanType.UNSPECIFIED),
            amount=m.amount,
            currency=m.currency,
            status=safe_enum_parse(
                PaymentOrderStatus, m.status, PaymentOrderStatus.UNSPECIFIED
            ),
            vnp_txn_ref=m.vnp_txn_ref,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )

    async def get_order_by_txn_ref_for_update(
        self, vnp_txn_ref: str
    ) -> PaymentOrder | None:
        stmt = (
            select(PaymentOrderModel)
            .where(PaymentOrderModel.vnp_txn_ref == vnp_txn_ref)
            .with_for_update()
        )
        res = await self.session.execute(stmt)
        m = res.scalar_one_or_none()
        if not m:
            return None
        return PaymentOrder(
            id=m.id,
            user_id=m.user_id,
            target_type=safe_enum_parse(
                PaymentTargetType, m.target_type, PaymentTargetType.UNSPECIFIED
            ),
            target_id=m.target_id,
            plan_type=safe_enum_parse(PlanType, m.plan_type, PlanType.UNSPECIFIED),
            amount=m.amount,
            currency=m.currency,
            status=safe_enum_parse(
                PaymentOrderStatus, m.status, PaymentOrderStatus.UNSPECIFIED
            ),
            vnp_txn_ref=m.vnp_txn_ref,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )

    async def get_active_pending_order(
        self,
        user_id: str,
        target_type: PaymentTargetType,
        target_id: str,
        plan_type: PlanType = PlanType.UNSPECIFIED,
        reuse_ttl_minutes: int = 15,
    ) -> PaymentOrder | None:
        t_type = (
            target_type.value if hasattr(target_type, "value") else str(target_type)
        )
        p_type = plan_type.value if hasattr(plan_type, "value") else str(plan_type)

        stmt = (
            select(PaymentOrderModel)
            .where(
                PaymentOrderModel.user_id == user_id,
                PaymentOrderModel.target_type == t_type,
                PaymentOrderModel.target_id == target_id,
                PaymentOrderModel.plan_type == p_type,
                PaymentOrderModel.status == PaymentOrderStatus.PENDING.value,
            )
            .order_by(PaymentOrderModel.created_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        if not models:
            return None

        now_dt = datetime.now(UTC)
        cutoff_dt = now_dt - timedelta(minutes=reuse_ttl_minutes)

        for m in models:
            try:
                c_dt = datetime.fromisoformat(m.created_at)
                if c_dt >= cutoff_dt:
                    return PaymentOrder(
                        id=m.id,
                        user_id=m.user_id,
                        target_type=safe_enum_parse(
                            PaymentTargetType,
                            m.target_type,
                            PaymentTargetType.UNSPECIFIED,
                        ),
                        target_id=m.target_id,
                        plan_type=safe_enum_parse(
                            PlanType, m.plan_type, PlanType.UNSPECIFIED
                        ),
                        amount=m.amount,
                        currency=m.currency,
                        status=safe_enum_parse(
                            PaymentOrderStatus, m.status, PaymentOrderStatus.UNSPECIFIED
                        ),
                        vnp_txn_ref=m.vnp_txn_ref,
                        created_at=m.created_at,
                        updated_at=m.updated_at,
                    )
            except (ValueError, TypeError, KeyError, AttributeError):
                pass

        return None

    async def list_pending_orders_older_than(
        self, window_minutes: int = 15, limit: int = 50
    ) -> list[PaymentOrder]:
        now_dt = datetime.now(UTC)
        cutoff_dt = now_dt - timedelta(minutes=window_minutes)
        cutoff_str = cutoff_dt.isoformat()

        stmt = (
            select(PaymentOrderModel)
            .where(
                PaymentOrderModel.status == PaymentOrderStatus.PENDING.value,
                PaymentOrderModel.created_at <= cutoff_str,
            )
            .order_by(PaymentOrderModel.created_at.asc())
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [
            PaymentOrder(
                id=m.id,
                user_id=m.user_id,
                target_type=safe_enum_parse(
                    PaymentTargetType, m.target_type, PaymentTargetType.UNSPECIFIED
                ),
                target_id=m.target_id,
                plan_type=safe_enum_parse(PlanType, m.plan_type, PlanType.UNSPECIFIED),
                amount=m.amount,
                currency=m.currency,
                status=safe_enum_parse(
                    PaymentOrderStatus, m.status, PaymentOrderStatus.UNSPECIFIED
                ),
                vnp_txn_ref=m.vnp_txn_ref,
                created_at=m.created_at,
                updated_at=m.updated_at,
            )
            for m in models
        ]

    async def get_order_by_id(self, order_id: str) -> PaymentOrder | None:
        stmt = select(PaymentOrderModel).where(PaymentOrderModel.id == order_id)
        res = await self.session.execute(stmt)
        m = res.scalar_one_or_none()
        if not m:
            return None
        return PaymentOrder(
            id=m.id,
            user_id=m.user_id,
            target_type=safe_enum_parse(
                PaymentTargetType, m.target_type, PaymentTargetType.UNSPECIFIED
            ),
            target_id=m.target_id,
            plan_type=safe_enum_parse(PlanType, m.plan_type, PlanType.UNSPECIFIED),
            amount=m.amount,
            currency=m.currency,
            status=safe_enum_parse(
                PaymentOrderStatus, m.status, PaymentOrderStatus.UNSPECIFIED
            ),
            vnp_txn_ref=m.vnp_txn_ref,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )

    async def update_order_status(
        self, order_id: str, status: PaymentOrderStatus
    ) -> PaymentOrder | None:
        stmt = select(PaymentOrderModel).where(PaymentOrderModel.id == order_id)
        res = await self.session.execute(stmt)
        m = res.scalar_one_or_none()
        if not m:
            return None

        now_str = datetime.now(UTC).isoformat()
        m.status = status.value if hasattr(status, "value") else str(status)
        m.updated_at = now_str
        await self.session.flush()

        return PaymentOrder(
            id=m.id,
            user_id=m.user_id,
            target_type=safe_enum_parse(
                PaymentTargetType, m.target_type, PaymentTargetType.UNSPECIFIED
            ),
            target_id=m.target_id,
            plan_type=safe_enum_parse(PlanType, m.plan_type, PlanType.UNSPECIFIED),
            amount=m.amount,
            currency=m.currency,
            status=safe_enum_parse(
                PaymentOrderStatus, m.status, PaymentOrderStatus.UNSPECIFIED
            ),
            vnp_txn_ref=m.vnp_txn_ref,
            created_at=m.created_at,
            updated_at=now_str,
        )

    async def save_transaction(
        self, transaction: PaymentTransaction
    ) -> PaymentTransaction:
        model = PaymentTransactionModel(
            id=transaction.id,
            order_id=transaction.order_id,
            vnp_transaction_no=transaction.vnp_transaction_no,
            vnp_response_code=transaction.vnp_response_code,
            vnp_bank_code=transaction.vnp_bank_code,
            vnp_pay_date=transaction.vnp_pay_date,
            raw_payload=transaction.raw_payload,
            created_at=transaction.created_at,
        )
        await self.session.merge(model)
        await self.session.flush()
        return transaction

    async def list_user_orders(self, user_id: str) -> list[PaymentOrder]:
        stmt = (
            select(PaymentOrderModel)
            .where(PaymentOrderModel.user_id == user_id)
            .order_by(PaymentOrderModel.created_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [
            PaymentOrder(
                id=m.id,
                user_id=m.user_id,
                target_type=safe_enum_parse(
                    PaymentTargetType, m.target_type, PaymentTargetType.UNSPECIFIED
                ),
                target_id=m.target_id,
                plan_type=safe_enum_parse(PlanType, m.plan_type, PlanType.UNSPECIFIED),
                amount=m.amount,
                currency=m.currency,
                status=safe_enum_parse(
                    PaymentOrderStatus, m.status, PaymentOrderStatus.UNSPECIFIED
                ),
                vnp_txn_ref=m.vnp_txn_ref,
                created_at=m.created_at,
                updated_at=m.updated_at,
            )
            for m in models
        ]

    async def get_course_titles(self, course_ids: list[str]) -> dict[str, str]:
        if not course_ids:
            return {}
        from src.modules.catalog.infrastructure.models import CourseModel

        stmt = select(CourseModel.id, CourseModel.title).where(
            CourseModel.id.in_(course_ids)
        )
        res = await self.session.execute(stmt)
        rows = res.all()
        return {r[0]: r[1] for r in rows}
