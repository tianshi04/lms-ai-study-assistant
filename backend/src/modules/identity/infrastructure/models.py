from typing import Optional
from sqlalchemy import Boolean, Enum as SQLEnum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.identity.domain.entities import UserRole
from src.shared.infrastructure.database import Base


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, native_enum=False),
        nullable=False,
        default=UserRole.LEARNER,
    )
    avatar_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    enterprise_seat_key: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")


class EnterpriseLicenseModel(Base):
    __tablename__ = "enterprise_licenses"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    partner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_seats: Mapped[int] = mapped_column(Integer, nullable=False, default=500)
    used_seats: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
