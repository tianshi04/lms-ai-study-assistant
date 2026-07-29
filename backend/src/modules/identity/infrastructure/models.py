from typing import Optional
from sqlalchemy import ARRAY, Boolean, Enum as SQLEnum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.identity.domain.constants import (
    DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS,
)
from src.modules.identity.domain.entities import UserRole
from src.shared.infrastructure.database import Base


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, native_enum=False),
        nullable=False,
        default=UserRole.LEARNER,
    )
    avatar_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    enterprise_seat_key: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True
    )
    seat_assigned_at: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    is_identity_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    signature_image_url: Mapped[str] = mapped_column(
        String(512), nullable=False, default=""
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")


class EnterpriseLicenseModel(Base):
    __tablename__ = "enterprise_licenses"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    partner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_seats: Mapped[int] = mapped_column(
        Integer, nullable=False, default=DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS
    )
    used_seats: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    scope_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="ALL_COURSES", server_default="ALL_COURSES"
    )
    allowed_course_ids: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), nullable=False, default=list, server_default="{}"
    )
