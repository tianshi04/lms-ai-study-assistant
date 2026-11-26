from abc import ABC, abstractmethod
from collections.abc import Sequence
from datetime import datetime

from src.modules.notification.domain.constants import NotificationCategory
from src.modules.notification.domain.entities import (
    Notification,
    NotificationPreferences,
    SystemAnnouncement,
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


class SystemAnnouncementRepository(ABC):
    @abstractmethod
    async def create(self, announcement: SystemAnnouncement) -> SystemAnnouncement:
        pass

    @abstractmethod
    async def get_by_id(self, announcement_id: str) -> SystemAnnouncement | None:
        pass

    @abstractmethod
    async def save(self, announcement: SystemAnnouncement) -> SystemAnnouncement:
        pass

    @abstractmethod
    async def list_paginated(
        self, page: int, page_size: int
    ) -> tuple[Sequence[SystemAnnouncement], int]:
        pass

    @abstractmethod
    async def list_active(
        self, now: datetime, limit: int
    ) -> Sequence[SystemAnnouncement]:
        pass

    @abstractmethod
    async def claim_due_for_dispatch(self, now: datetime) -> SystemAnnouncement | None:
        """Atomically move one due, non-expired SCHEDULED row to SENDING."""

    @abstractmethod
    async def cancel_expired_scheduled(self, now: datetime) -> int:
        """Mark SCHEDULED rows whose expires_at <= now as CANCELLED."""

    @abstractmethod
    async def cancel_scheduled(self, announcement_id: str) -> SystemAnnouncement | None:
        """Atomically transition SCHEDULED -> CANCELLED. Returns None if not matched."""

    @abstractmethod
    async def expire_active(
        self, announcement_id: str, now: datetime
    ) -> SystemAnnouncement | None:
        """Atomically end banner display early (expires_at = now) for active SENT/SENDING rows."""

    @abstractmethod
    async def list_sending(self) -> Sequence[SystemAnnouncement]:
        """Rows left in SENDING (e.g. after a crash) to resume."""

    @abstractmethod
    async def filter_announcement_recipients(
        self, user_ids: Sequence[str], include_opted_out: bool
    ) -> list[str]:
        pass

    @abstractmethod
    async def insert_bell_notifications(
        self, announcement: SystemAnnouncement, recipient_ids: Sequence[str]
    ) -> int:
        """Insert idempotently; skip (announcement_id, recipient_id) duplicates."""
