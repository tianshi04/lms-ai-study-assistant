"""SQLAlchemy ORM models for Payment module."""

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.infrastructure.database import Base


class CoursePurchaseModel(Base):
    __tablename__ = "course_purchases"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
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
