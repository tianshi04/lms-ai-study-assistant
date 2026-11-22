from dataclasses import dataclass
from datetime import UTC, datetime

from src.modules.notification.domain.constants import (
    AnnouncementSeverity,
    AnnouncementStatus,
    NotificationCategory,
)
from src.shared.domain.base import Entity, ValueObject


@dataclass
class Notification(Entity):
    id: str
    recipient_id: str
    category: NotificationCategory
    title: str
    content: str
    action_url: str = ""
    actor_avatar_url: str = ""
    is_read: bool = False
    read_at: datetime | None = None
    created_at: datetime | None = None

    def mark_as_read(self, now: datetime | None = None) -> None:
        self.is_read = True
        self.read_at = now or datetime.now(UTC)


@dataclass
class NotificationPreferences(ValueObject):
    user_id: str
    enable_in_app: bool = True
    enable_email: bool = True
    enable_academic_reminders: bool = True
    enable_community_replies: bool = True
    enable_announcements: bool = True
    updated_at: datetime | None = None


@dataclass
class SystemAnnouncement(Entity):
    id: str
    title: str
    content: str
    action_url: str
    severity: AnnouncementSeverity
    status: AnnouncementStatus
    starts_at: datetime
    expires_at: datetime
    also_notify_bell: bool
    is_critical: bool
    created_by: str
    sent_at: datetime | None = None
    recipient_count: int = 0
    last_user_id: str = ""
    created_at: datetime | None = None

    def cancel(self) -> None:
        if self.status != AnnouncementStatus.SCHEDULED:
            raise ValueError("Chỉ có thể huỷ thông báo đang ở trạng thái đã lên lịch")
        self.status = AnnouncementStatus.CANCELLED
