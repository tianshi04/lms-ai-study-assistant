"""SQLAlchemy ORM models for Payment module."""

from sqlalchemy import Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.infrastructure.database import Base


class CoursePurchaseModel(Base):
    __tablename__ = "course_purchases"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "course_id", name="uq_course_purchases_user_course"
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(
        Numeric(12, 2, asdecimal=False), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="VND")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="COMPLETED")
    payment_method: Mapped[str] = mapped_column(
        String(32), nullable=False, default="MOCK"
    )
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class UserSubscriptionModel(Base):
    __tablename__ = "user_subscriptions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    plan_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="ACTIVE")
    starts_at: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class PaymentOrderModel(Base):
    __tablename__ = "payment_orders"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # COURSE, PARTNER_MEMBERSHIP, SYSTEM_SUBSCRIPTION
    target_id: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )  # course_id, partner_id, or COURSERA_PLUS
    plan_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="NONE"
    )  # NONE, MONTHLY, YEARLY
    amount: Mapped[float] = mapped_column(
        Numeric(12, 2, asdecimal=False), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="VND")
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="PENDING", index=True
    )  # PENDING, COMPLETED, FAILED, EXPIRED
    vnp_txn_ref: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
    updated_at: Mapped[str] = mapped_column(String(64), nullable=False)


class PaymentTransactionModel(Base):
    __tablename__ = "payment_transactions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    order_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    vnp_transaction_no: Mapped[str] = mapped_column(
        String(64), nullable=False, default="", index=True
    )
    vnp_response_code: Mapped[str] = mapped_column(
        String(16), nullable=False, default=""
    )
    vnp_bank_code: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    vnp_pay_date: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    raw_payload: Mapped[str] = mapped_column(String(2048), nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
