from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.notification.domain import (
    ACTION_URL_MAX_LENGTH,
    TITLE_MAX_LENGTH,
)
from src.shared.infrastructure.database import Base


class NotificationModel(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint(
            "announcement_id",
            "recipient_id",
            name="uq_notifications_announcement_recipient",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    recipient_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(TITLE_MAX_LENGTH), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    action_url: Mapped[str] = mapped_column(
        String(ACTION_URL_MAX_LENGTH), nullable=False, default=""
    )
    actor_avatar_url: Mapped[str] = mapped_column(
        String(500), nullable=False, default=""
    )
    announcement_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )


class UserNotificationPreferenceModel(Base):
    __tablename__ = "user_notification_preferences"

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    enable_in_app: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    enable_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    enable_academic_reminders: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    enable_community_replies: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    enable_announcements: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class SystemAnnouncementModel(Base):
    __tablename__ = "system_announcements"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(TITLE_MAX_LENGTH), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    action_url: Mapped[str] = mapped_column(
        String(ACTION_URL_MAX_LENGTH), nullable=False, default=""
    )
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="INFO")
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    also_notify_bell: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    is_critical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    recipient_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_user_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
