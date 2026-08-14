import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from src.modules.notification.domain import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    Notification,
    NotificationCategory,
    NotificationPreferenceRepository,
    NotificationPreferences,
    NotificationRepository,
)
from src.modules.notification.infrastructure.repository import (
    PostgresNotificationPreferenceRepository,
    PostgresNotificationRepository,
)
from src.shared.infrastructure.database import async_session_scope


class NotificationUseCase:
    def __init__(
        self,
        notif_repo: NotificationRepository | None = None,
        pref_repo: NotificationPreferenceRepository | None = None,
    ) -> None:
        self._notif_repo = notif_repo
        self._pref_repo = pref_repo

    async def send_notification(
        self,
        recipient_id: str,
        category: NotificationCategory,
        title: str,
        content: str,
        action_url: str = "",
        actor_avatar_url: str = "",
    ) -> Notification:
        if not recipient_id:
            raise ValueError("recipient_id is required")
        if not title:
            raise ValueError("title is required")

        if self._notif_repo and self._pref_repo:
            return await self._send_notif(
                self._notif_repo,
                self._pref_repo,
                recipient_id,
                category,
                title,
                content,
                action_url,
                actor_avatar_url,
            )

        async with async_session_scope() as session:
            notif_repo = PostgresNotificationRepository(session)
            pref_repo = PostgresNotificationPreferenceRepository(session)
            return await self._send_notif(
                notif_repo,
                pref_repo,
                recipient_id,
                category,
                title,
                content,
                action_url,
                actor_avatar_url,
            )

    async def _send_notif(
        self,
        notif_repo: NotificationRepository,
        pref_repo: NotificationPreferenceRepository,
        recipient_id: str,
        category: NotificationCategory,
        title: str,
        content: str,
        action_url: str,
        actor_avatar_url: str,
    ) -> Notification:
        notif = Notification(
            id=f"notif_{uuid.uuid4().hex[:12]}",
            recipient_id=recipient_id,
            category=category,
            title=title,
            content=content,
            action_url=action_url,
            actor_avatar_url=actor_avatar_url,
            is_read=False,
            created_at=datetime.now(UTC),
        )
        return await notif_repo.create(notif)

    async def send_batch_notifications(
        self,
        recipient_ids: Sequence[str],
        category: NotificationCategory,
        title: str,
        content: str,
        action_url: str = "",
        actor_avatar_url: str = "",
    ) -> int:
        if not recipient_ids:
            return 0
        if self._notif_repo:
            return await self._send_batch(
                self._notif_repo,
                recipient_ids,
                category,
                title,
                content,
                action_url,
                actor_avatar_url,
            )

        async with async_session_scope() as session:
            notif_repo = PostgresNotificationRepository(session)
            return await self._send_batch(
                notif_repo,
                recipient_ids,
                category,
                title,
                content,
                action_url,
                actor_avatar_url,
            )

    async def _send_batch(
        self,
        notif_repo: NotificationRepository,
        recipient_ids: Sequence[str],
        category: NotificationCategory,
        title: str,
        content: str,
        action_url: str,
        actor_avatar_url: str,
    ) -> int:
        now = datetime.now(UTC)
        notifs = [
            Notification(
                id=f"notif_{uuid.uuid4().hex[:12]}",
                recipient_id=rid,
                category=category,
                title=title,
                content=content,
                action_url=action_url,
                actor_avatar_url=actor_avatar_url,
                is_read=False,
                created_at=now,
            )
            for rid in recipient_ids
        ]
        return await notif_repo.create_batch(notifs)

    async def list_notifications(
        self,
        recipient_id: str,
        category_filter: NotificationCategory | None = None,
        unread_only: bool = False,
        page_size: int = DEFAULT_PAGE_SIZE,
        page_token: str = "",
    ) -> tuple[Sequence[Notification], int, str]:
        if not recipient_id:
            raise ValueError("recipient_id is required")

        if self._notif_repo:
            return await self._list(
                self._notif_repo,
                recipient_id,
                category_filter,
                unread_only,
                page_size,
                page_token,
            )

        async with async_session_scope() as session:
            notif_repo = PostgresNotificationRepository(session)
            return await self._list(
                notif_repo,
                recipient_id,
                category_filter,
                unread_only,
                page_size,
                page_token,
            )

    async def _list(
        self,
        notif_repo: NotificationRepository,
        recipient_id: str,
        category_filter: NotificationCategory | None,
        unread_only: bool,
        page_size: int,
        page_token: str,
    ) -> tuple[Sequence[Notification], int, str]:
        limit = min(max(page_size, 1), MAX_PAGE_SIZE)
        offset = 0
        if page_token and page_token.startswith("offset_"):
            try:
                offset = int(page_token.replace("offset_", ""))
            except ValueError:
                offset = 0

        notifications = await notif_repo.list_by_recipient(
            recipient_id=recipient_id,
            category_filter=category_filter,
            unread_only=unread_only,
            limit=limit + 1,
            offset=offset,
        )

        has_next = len(notifications) > limit
        result_items = notifications[:limit]
        next_token = f"offset_{offset + limit}" if has_next else ""

        unread_count = await notif_repo.get_unread_count(recipient_id)
        return result_items, unread_count, next_token

    async def get_unread_count(self, recipient_id: str) -> int:
        if not recipient_id:
            raise ValueError("recipient_id is required")
        if self._notif_repo:
            return await self._notif_repo.get_unread_count(recipient_id)

        async with async_session_scope() as session:
            notif_repo = PostgresNotificationRepository(session)
            return await notif_repo.get_unread_count(recipient_id)

    async def mark_as_read(
        self,
        recipient_id: str,
        notification_ids: Sequence[str],
    ) -> int:
        if not recipient_id:
            raise ValueError("recipient_id is required")
        if not notification_ids:
            return 0

        if self._notif_repo:
            return await self._notif_repo.mark_as_read(recipient_id, notification_ids)

        async with async_session_scope() as session:
            notif_repo = PostgresNotificationRepository(session)
            return await notif_repo.mark_as_read(recipient_id, notification_ids)

    async def mark_all_as_read(
        self,
        recipient_id: str,
        category_filter: NotificationCategory | None = None,
    ) -> int:
        if not recipient_id:
            raise ValueError("recipient_id is required")
        if self._notif_repo:
            return await self._notif_repo.mark_all_as_read(
                recipient_id, category_filter
            )

        async with async_session_scope() as session:
            notif_repo = PostgresNotificationRepository(session)
            return await notif_repo.mark_all_as_read(recipient_id, category_filter)

    async def get_preferences(self, user_id: str) -> NotificationPreferences:
        if not user_id:
            raise ValueError("user_id is required")
        if self._pref_repo:
            prefs = await self._pref_repo.get_by_user_id(user_id)
            return prefs if prefs else NotificationPreferences(user_id=user_id)

        async with async_session_scope() as session:
            pref_repo = PostgresNotificationPreferenceRepository(session)
            prefs = await pref_repo.get_by_user_id(user_id)
            return prefs if prefs else NotificationPreferences(user_id=user_id)

    async def update_preferences(
        self,
        user_id: str,
        enable_in_app: bool,
        enable_email: bool,
        enable_academic_reminders: bool,
        enable_community_replies: bool,
        enable_announcements: bool,
    ) -> NotificationPreferences:
        if not user_id:
            raise ValueError("user_id is required")

        prefs = NotificationPreferences(
            user_id=user_id,
            enable_in_app=enable_in_app,
            enable_email=enable_email,
            enable_academic_reminders=enable_academic_reminders,
            enable_community_replies=enable_community_replies,
            enable_announcements=enable_announcements,
            updated_at=datetime.now(UTC),
        )

        if self._pref_repo:
            return await self._pref_repo.save(prefs)

        async with async_session_scope() as session:
            pref_repo = PostgresNotificationPreferenceRepository(session)
            return await pref_repo.save(prefs)
