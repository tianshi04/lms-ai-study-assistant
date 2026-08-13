from abc import ABC, abstractmethod
from collections.abc import Sequence

from src.modules.notification.domain.constants import NotificationCategory
from src.modules.notification.domain.entities import (
    Notification,
    NotificationPreferences,
)


class NotificationRepository(ABC):
    @abstractmethod
    async def create(self, notification: Notification) -> Notification:
        pass

    @abstractmethod
    async def create_batch(self, notifications: Sequence[Notification]) -> int:
        pass

    @abstractmethod
    async def get_by_id(self, notification_id: str) -> Notification | None:
        pass

    @abstractmethod
    async def list_by_recipient(
        self,
        recipient_id: str,
        category_filter: NotificationCategory | None = None,
        unread_only: bool = False,
        limit: int = 20,
        offset: int = 0,
    ) -> Sequence[Notification]:
        pass

    @abstractmethod
    async def get_unread_count(self, recipient_id: str) -> int:
        pass

    @abstractmethod
    async def mark_as_read(
        self, recipient_id: str, notification_ids: Sequence[str]
    ) -> int:
        pass

    @abstractmethod
    async def mark_all_as_read(
        self,
        recipient_id: str,
        category_filter: NotificationCategory | None = None,
    ) -> int:
        pass


class NotificationPreferenceRepository(ABC):
    @abstractmethod
    async def get_by_user_id(self, user_id: str) -> NotificationPreferences | None:
        pass

    @abstractmethod
    async def save(
        self, preferences: NotificationPreferences
    ) -> NotificationPreferences:
        pass
