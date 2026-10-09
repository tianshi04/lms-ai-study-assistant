from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.notification.domain import (
    Notification,
    NotificationCategory,
    NotificationPreferenceRepository,
    NotificationPreferences,
    NotificationRepository,
)
from src.modules.notification.infrastructure.models import (
    NotificationModel,
    UserNotificationPreferenceModel,
)


class PostgresNotificationRepository(NotificationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, model: NotificationModel) -> Notification:
        category_enum = NotificationCategory.UNSPECIFIED
        try:
            category_enum = NotificationCategory(model.category)
        except ValueError:
            pass

        return Notification(
            id=model.id,
            recipient_id=model.recipient_id,
            category=category_enum,
            title=model.title,
            content=model.content,
            action_url=model.action_url,
            actor_avatar_url=model.actor_avatar_url,
            is_read=model.is_read,
            read_at=model.read_at,
            created_at=model.created_at,
        )

    async def create(self, notification: Notification) -> Notification:
        model = NotificationModel(
            id=notification.id,
            recipient_id=notification.recipient_id,
            category=notification.category.value,
            title=notification.title,
            content=notification.content,
            action_url=notification.action_url,
            actor_avatar_url=notification.actor_avatar_url,
            is_read=notification.is_read,
            read_at=notification.read_at,
            created_at=notification.created_at or datetime.now(UTC),
        )
        self._session.add(model)
        await self._session.flush()
        return self._to_domain(model)

    async def create_batch(self, notifications: Sequence[Notification]) -> int:
        if not notifications:
            return 0
        now = datetime.now(UTC)
        models = [
            NotificationModel(
                id=n.id,
                recipient_id=n.recipient_id,
                category=n.category.value,
                title=n.title,
                content=n.content,
                action_url=n.action_url,
                actor_avatar_url=n.actor_avatar_url,
                is_read=n.is_read,
                read_at=n.read_at,
                created_at=n.created_at or now,
            )
            for n in notifications
        ]
        self._session.add_all(models)
        await self._session.flush()
        return len(models)

    async def get_by_id(self, notification_id: str) -> Notification | None:
        stmt = select(NotificationModel).where(NotificationModel.id == notification_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def list_by_recipient(
        self,
        recipient_id: str,
        category_filter: NotificationCategory | None = None,
        unread_only: bool = False,
        limit: int = 20,
        offset: int = 0,
    ) -> Sequence[Notification]:
        stmt = select(NotificationModel).where(
            NotificationModel.recipient_id == recipient_id
        )
        if category_filter and category_filter != NotificationCategory.UNSPECIFIED:
            stmt = stmt.where(NotificationModel.category == category_filter.value)
        if unread_only:
            stmt = stmt.where(NotificationModel.is_read.is_(False))

        stmt = (
            stmt.order_by(NotificationModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [self._to_domain(m) for m in models]

    async def get_unread_count(self, recipient_id: str) -> int:
        stmt = (
            select(func.count())
            .select_from(NotificationModel)
            .where(
                NotificationModel.recipient_id == recipient_id,
                NotificationModel.is_read.is_(False),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one() or 0

    async def mark_as_read(
        self, recipient_id: str, notification_ids: Sequence[str]
    ) -> int:
        if not notification_ids:
            return 0
        now = datetime.now(UTC)
        stmt = (
            update(NotificationModel)
            .where(
                NotificationModel.recipient_id == recipient_id,
                NotificationModel.id.in_(notification_ids),
                NotificationModel.is_read.is_(False),
            )
            .values(is_read=True, read_at=now)
        )
        result = await self._session.execute(stmt)
        return int(getattr(result, "rowcount", 0))

    async def mark_all_as_read(
        self,
        recipient_id: str,
        category_filter: NotificationCategory | None = None,
    ) -> int:
        now = datetime.now(UTC)
        stmt = (
            update(NotificationModel)
            .where(
                NotificationModel.recipient_id == recipient_id,
                NotificationModel.is_read.is_(False),
            )
            .values(is_read=True, read_at=now)
        )
        if category_filter and category_filter != NotificationCategory.UNSPECIFIED:
            stmt = stmt.where(NotificationModel.category == category_filter.value)

        result = await self._session.execute(stmt)
        return int(getattr(result, "rowcount", 0))


class PostgresNotificationPreferenceRepository(NotificationPreferenceRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(
        self, model: UserNotificationPreferenceModel
    ) -> NotificationPreferences:
        return NotificationPreferences(
            user_id=model.user_id,
            enable_in_app=model.enable_in_app,
            enable_email=model.enable_email,
            enable_academic_reminders=model.enable_academic_reminders,
            enable_community_replies=model.enable_community_replies,
            enable_announcements=model.enable_announcements,
            updated_at=model.updated_at,
        )

    async def get_by_user_id(self, user_id: str) -> NotificationPreferences | None:
        stmt = select(UserNotificationPreferenceModel).where(
            UserNotificationPreferenceModel.user_id == user_id
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def save(
        self, preferences: NotificationPreferences
    ) -> NotificationPreferences:
        stmt = select(UserNotificationPreferenceModel).where(
            UserNotificationPreferenceModel.user_id == preferences.user_id
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        now = datetime.now(UTC)

        if model is None:
            model = UserNotificationPreferenceModel(
                user_id=preferences.user_id,
                enable_in_app=preferences.enable_in_app,
                enable_email=preferences.enable_email,
                enable_academic_reminders=preferences.enable_academic_reminders,
                enable_community_replies=preferences.enable_community_replies,
                enable_announcements=preferences.enable_announcements,
                updated_at=now,
            )
            self._session.add(model)
        else:
            model.enable_in_app = preferences.enable_in_app
            model.enable_email = preferences.enable_email
            model.enable_academic_reminders = preferences.enable_academic_reminders
            model.enable_community_replies = preferences.enable_community_replies
            model.enable_announcements = preferences.enable_announcements
            model.updated_at = now

        await self._session.flush()
        return self._to_domain(model)
