from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from uuid6 import uuid7

from src.modules.notification.domain import (
    AnnouncementSeverity,
    AnnouncementStatus,
    Notification,
    NotificationCategory,
    NotificationPreferenceRepository,
    NotificationPreferences,
    NotificationRepository,
    SystemAnnouncement,
    SystemAnnouncementRepository,
)
from src.modules.notification.infrastructure.models import (
    NotificationModel,
    SystemAnnouncementModel,
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


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def _aware_opt(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return _aware(dt)


class PostgresSystemAnnouncementRepository(SystemAnnouncementRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, m: SystemAnnouncementModel) -> SystemAnnouncement:
        return SystemAnnouncement(
            id=m.id,
            title=m.title,
            content=m.content,
            action_url=m.action_url,
            severity=AnnouncementSeverity(m.severity),
            status=AnnouncementStatus(m.status),
            starts_at=_aware(m.starts_at),
            expires_at=_aware(m.expires_at),
            also_notify_bell=m.also_notify_bell,
            is_critical=m.is_critical,
            created_by=m.created_by,
            sent_at=_aware_opt(m.sent_at),
            recipient_count=m.recipient_count,
            last_user_id=m.last_user_id,
            created_at=_aware_opt(m.created_at),
        )

    def _apply(self, m: SystemAnnouncementModel, a: SystemAnnouncement) -> None:
        m.title = a.title
        m.content = a.content
        m.action_url = a.action_url
        m.severity = a.severity.value
        m.status = a.status.value
        m.starts_at = a.starts_at
        m.expires_at = a.expires_at
        m.also_notify_bell = a.also_notify_bell
        m.is_critical = a.is_critical
        m.created_by = a.created_by
        m.sent_at = a.sent_at
        m.recipient_count = a.recipient_count
        m.last_user_id = a.last_user_id

    async def create(self, announcement: SystemAnnouncement) -> SystemAnnouncement:
        m = SystemAnnouncementModel(id=announcement.id)
        self._apply(m, announcement)
        if announcement.created_at:
            m.created_at = announcement.created_at
        self._session.add(m)
        await self._session.flush()
        await self._session.refresh(m)
        return self._to_domain(m)

    async def get_by_id(self, announcement_id: str) -> SystemAnnouncement | None:
        m = await self._session.get(SystemAnnouncementModel, announcement_id)
        return self._to_domain(m) if m else None

    async def save(self, announcement: SystemAnnouncement) -> SystemAnnouncement:
        m = await self._session.get(SystemAnnouncementModel, announcement.id)
        if m is None:
            raise LookupError("Không tìm thấy thông báo")
        self._apply(m, announcement)
        await self._session.flush()
        return self._to_domain(m)

    async def list_paginated(
        self, page: int, page_size: int
    ) -> tuple[Sequence[SystemAnnouncement], int]:
        total = (
            await self._session.execute(select(func.count(SystemAnnouncementModel.id)))
        ).scalar_one()
        stmt = (
            select(SystemAnnouncementModel)
            .order_by(SystemAnnouncementModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await self._session.execute(stmt)).scalars().all()
        return [self._to_domain(r) for r in rows], int(total)

    async def list_active(
        self, now: datetime, limit: int
    ) -> Sequence[SystemAnnouncement]:
        stmt = (
            select(SystemAnnouncementModel)
            .where(
                SystemAnnouncementModel.status.in_(
                    [AnnouncementStatus.SENDING.value, AnnouncementStatus.SENT.value]
                ),
                SystemAnnouncementModel.starts_at <= now,
                SystemAnnouncementModel.expires_at > now,
            )
            .order_by(SystemAnnouncementModel.starts_at.desc())
            .limit(limit)
        )
        rows = (await self._session.execute(stmt)).scalars().all()
        return [self._to_domain(r) for r in rows]

    async def claim_due_for_dispatch(self, now: datetime) -> SystemAnnouncement | None:
        candidate = (
            await self._session.execute(
                select(SystemAnnouncementModel.id)
                .where(
                    SystemAnnouncementModel.status
                    == AnnouncementStatus.SCHEDULED.value,
                    SystemAnnouncementModel.starts_at <= now,
                    SystemAnnouncementModel.expires_at > now,
                )
                .order_by(SystemAnnouncementModel.starts_at)
                .limit(1)
            )
        ).scalar_one_or_none()
        if candidate is None:
            return None
        # Compare-and-set: only one worker wins the SCHEDULED -> SENDING transition.
        result = await self._session.execute(
            update(SystemAnnouncementModel)
            .where(
                SystemAnnouncementModel.id == candidate,
                SystemAnnouncementModel.status == AnnouncementStatus.SCHEDULED.value,
                SystemAnnouncementModel.expires_at > now,
            )
            .values(status=AnnouncementStatus.SENDING.value)
        )
        await self._session.flush()
        if getattr(result, "rowcount", 0) != 1:
            return None
        return await self.get_by_id(candidate)

    async def cancel_expired_scheduled(self, now: datetime) -> int:
        result = await self._session.execute(
            update(SystemAnnouncementModel)
            .where(
                SystemAnnouncementModel.status == AnnouncementStatus.SCHEDULED.value,
                SystemAnnouncementModel.expires_at <= now,
            )
            .values(status=AnnouncementStatus.CANCELLED.value)
        )
        await self._session.flush()
        return int(getattr(result, "rowcount", 0) or 0)

    async def cancel_scheduled(self, announcement_id: str) -> SystemAnnouncement | None:
        result = await self._session.execute(
            update(SystemAnnouncementModel)
            .where(
                SystemAnnouncementModel.id == announcement_id,
                SystemAnnouncementModel.status == AnnouncementStatus.SCHEDULED.value,
            )
            .values(status=AnnouncementStatus.CANCELLED.value)
        )
        await self._session.flush()
        if getattr(result, "rowcount", 0) != 1:
            return None
        self._session.expire_all()
        return await self.get_by_id(announcement_id)

    async def expire_active(
        self, announcement_id: str, now: datetime
    ) -> SystemAnnouncement | None:
        result = await self._session.execute(
            update(SystemAnnouncementModel)
            .where(
                SystemAnnouncementModel.id == announcement_id,
                SystemAnnouncementModel.status.in_(
                    [AnnouncementStatus.SENT.value, AnnouncementStatus.SENDING.value]
                ),
                SystemAnnouncementModel.expires_at > now,
            )
            .values(expires_at=now)
        )
        await self._session.flush()
        if getattr(result, "rowcount", 0) != 1:
            return None
        self._session.expire_all()
        return await self.get_by_id(announcement_id)

    async def list_sending(self) -> Sequence[SystemAnnouncement]:
        rows = (
            (
                await self._session.execute(
                    select(SystemAnnouncementModel).where(
                        SystemAnnouncementModel.status
                        == AnnouncementStatus.SENDING.value
                    )
                )
            )
            .scalars()
            .all()
        )
        return [self._to_domain(r) for r in rows]

    async def filter_announcement_recipients(
        self, user_ids: Sequence[str], include_opted_out: bool
    ) -> list[str]:
        if include_opted_out or not user_ids:
            return list(user_ids)
        opted_out = set(
            (
                await self._session.execute(
                    select(UserNotificationPreferenceModel.user_id).where(
                        UserNotificationPreferenceModel.user_id.in_(list(user_ids)),
                        or_(
                            UserNotificationPreferenceModel.enable_announcements.is_(
                                False
                            ),
                            UserNotificationPreferenceModel.enable_in_app.is_(False),
                        ),
                    )
                )
            )
            .scalars()
            .all()
        )
        return [uid for uid in user_ids if uid not in opted_out]

    async def insert_bell_notifications(
        self, announcement: SystemAnnouncement, recipient_ids: Sequence[str]
    ) -> int:
        if not recipient_ids:
            return 0
        now = datetime.now(UTC)
        rows = [
            {
                "id": f"notif_{uuid7().hex}",
                "recipient_id": rid,
                "category": NotificationCategory.SYSTEM.value,
                "title": announcement.title,
                "content": announcement.content,
                "action_url": announcement.action_url,
                "actor_avatar_url": "",
                "announcement_id": announcement.id,
                "is_read": False,
                "created_at": now,
            }
            for rid in recipient_ids
        ]
        conn = await self._session.connection()
        if conn.dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import insert as dialect_insert
        else:
            from sqlalchemy.dialects.sqlite import insert as dialect_insert
        stmt = (
            dialect_insert(NotificationModel)
            .values(rows)
            .on_conflict_do_nothing(index_elements=["announcement_id", "recipient_id"])
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return int(getattr(result, "rowcount", 0) or 0)
