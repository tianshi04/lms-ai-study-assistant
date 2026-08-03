from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from src.modules.notification.domain.constants import NotificationCategory
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
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    def mark_as_read(self, now: Optional[datetime] = None) -> None:
        self.is_read = True
        self.read_at = now or datetime.now(timezone.utc)


@dataclass
class NotificationPreferences(ValueObject):
    user_id: str
    enable_in_app: bool = True
    enable_email: bool = True
    enable_academic_reminders: bool = True
    enable_community_replies: bool = True
    enable_announcements: bool = True
    updated_at: Optional[datetime] = None
