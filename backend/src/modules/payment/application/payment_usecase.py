"""Application Use Cases for Payment module."""

from datetime import datetime, timedelta, timezone
import logging
from typing import Optional
import uuid

from sqlalchemy import select

from src.modules.catalog.infrastructure.models import CourseModel
from src.modules.payment.domain.constants import (
    DEFAULT_MONTHLY_PLAN_DAYS,
    DEFAULT_SINGLE_COURSE_PRICE_VND,
    DEFAULT_YEARLY_PLAN_DAYS,
)
from src.modules.payment.domain.entities import (
    CoursePurchase,
    PlanType,
    SubscriptionStatus,
    UserSubscription,
)
from src.modules.payment.domain.repositories import IPaymentRepository
from src.modules.payment.infrastructure.repository import PaymentRepository
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

            # Query course price directly from DB
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
        now_dt = datetime.now(timezone.utc)
        expires_dt = now_dt + timedelta(days=days)

        async with async_session_scope() as session:
            repo = self.repository or PaymentRepository(session)

            existing_sub = await repo.get_active_subscription(user_id)
            if existing_sub and existing_sub.is_currently_active():
                # Extend existing active subscription
                try:
                    cur_exp = datetime.fromisoformat(existing_sub.expires_at)
                    if cur_exp > now_dt:
                        expires_dt = cur_exp + timedelta(days=days)
                except Exception:
                    pass

            sub = UserSubscription(
                id=str(uuid.uuid4()),
                user_id=user_id,
                plan_type=plan_type,
                status=SubscriptionStatus.ACTIVE,
                starts_at=now_dt.isoformat(),
                expires_at=expires_dt.isoformat(),
                created_at=now_dt.isoformat(),
            )
            saved = await repo.save_subscription(sub)
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

    async def list_user_purchases(self, user_id: str) -> list[CoursePurchase]:
        async with async_session_scope() as session:
            repo = self.repository or PaymentRepository(session)
            return await repo.list_user_purchases(user_id)
