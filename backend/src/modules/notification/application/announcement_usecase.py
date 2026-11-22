"""System-wide announcements created by admins (banner + optional bell fan-out)."""

import logging
from collections.abc import AsyncIterator, Callable, Sequence
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from uuid6 import uuid7

from src.modules.identity.domain import IUserDirectory
from src.modules.notification.domain import (
    ACTION_URL_MAX_LENGTH,
    ANNOUNCEMENT_BATCH_SIZE,
    ANNOUNCEMENT_MAX_ACTIVE_BANNERS,
    ANNOUNCEMENT_MIN_LEAD_SECONDS,
    CONTENT_MAX_LENGTH,
    MAX_PAGE_SIZE,
    TITLE_MAX_LENGTH,
    AnnouncementSeverity,
    AnnouncementStatus,
    SystemAnnouncement,
    SystemAnnouncementRepository,
)

logger = logging.getLogger(__name__)


@dataclass
class AnnouncementRepos:
    announcements: SystemAnnouncementRepository
    users: IUserDirectory


RepoScope = Callable[[], AbstractAsyncContextManager[AnnouncementRepos]]


@asynccontextmanager
async def default_repo_scope() -> AsyncIterator[AnnouncementRepos]:
    from src.modules.identity.infrastructure.repository import PostgresUserDirectory
    from src.modules.notification.infrastructure.repository import (
        PostgresSystemAnnouncementRepository,
    )
    from src.shared.infrastructure.database import async_session_scope

    async with async_session_scope() as session:
        yield AnnouncementRepos(
            announcements=PostgresSystemAnnouncementRepository(session),
            users=PostgresUserDirectory(session),
        )


def _require_admin(is_admin: bool) -> None:
    if not is_admin:
        raise PermissionError("Chỉ quản trị viên mới được thực hiện thao tác này")


def _validate_action_url(url: str) -> None:
    if not url:
        return
    if len(url) > ACTION_URL_MAX_LENGTH:
        raise ValueError(f"Liên kết tối đa {ACTION_URL_MAX_LENGTH} ký tự")
    is_relative = url.startswith("/") and not url.startswith("//")
    if not (is_relative or url.startswith("https://")):
        raise ValueError("Liên kết phải bắt đầu bằng '/' hoặc 'https://'")


class AnnouncementUseCase:
    def __init__(
        self,
        repo_scope: RepoScope = default_repo_scope,
        batch_size: int = ANNOUNCEMENT_BATCH_SIZE,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._scope = repo_scope
        self._batch_size = batch_size
        self._now = clock

    # ---------- Admin commands ----------

    async def create(
        self,
        *,
        actor_id: str,
        actor_is_admin: bool,
        title: str,
        content: str,
        action_url: str,
        severity: AnnouncementSeverity,
        starts_at: datetime | None,
        expires_at: datetime | None,
        also_notify_bell: bool,
        is_critical: bool,
    ) -> SystemAnnouncement:
        _require_admin(actor_is_admin)
        title = title.strip()
        content = content.strip()
        action_url = action_url.strip()
        if not title:
            raise ValueError("Tiêu đề không được để trống")
        if len(title) > TITLE_MAX_LENGTH:
            raise ValueError(f"Tiêu đề tối đa {TITLE_MAX_LENGTH} ký tự")
        if len(content) > CONTENT_MAX_LENGTH:
            raise ValueError(f"Nội dung tối đa {CONTENT_MAX_LENGTH} ký tự")
        _validate_action_url(action_url)

        now = self._now()
        if starts_at is None:
            effective_start = now
        else:
            starts_at = starts_at.astimezone(UTC)
            if starts_at < now + timedelta(seconds=ANNOUNCEMENT_MIN_LEAD_SECONDS):
                raise ValueError(
                    "Thời gian hẹn phải sau thời điểm hiện tại ít nhất 1 phút"
                )
            effective_start = starts_at
        if expires_at is None:
            raise ValueError("Cần chọn thời điểm hết hạn hiển thị")
        expires_at = expires_at.astimezone(UTC)
        if expires_at <= effective_start:
            raise ValueError("Thời điểm hết hạn phải sau thời điểm bắt đầu")

        announcement = SystemAnnouncement(
            id=f"ann_{uuid7().hex}",
            title=title,
            content=content,
            action_url=action_url,
            severity=severity,
            # Always SCHEDULED: the dispatcher performs bell fan-out in the
            # background so the admin request never blocks on N users.
            status=AnnouncementStatus.SCHEDULED,
            starts_at=effective_start,
            expires_at=expires_at,
            also_notify_bell=also_notify_bell,
            is_critical=is_critical if also_notify_bell else False,
            created_by=actor_id,
            created_at=now,
        )
        async with self._scope() as repos:
            return await repos.announcements.create(announcement)

    async def cancel(
        self, *, actor_is_admin: bool, announcement_id: str
    ) -> SystemAnnouncement:
        _require_admin(actor_is_admin)
        async with self._scope() as repos:
            cancelled = await repos.announcements.cancel_scheduled(announcement_id)
            if cancelled is not None:
                return cancelled
            existing = await repos.announcements.get_by_id(announcement_id)
            if existing is None:
                raise LookupError("Không tìm thấy thông báo")
            existing.cancel()
            return existing  # pragma: no cover

    async def expire_early(
        self, *, actor_is_admin: bool, announcement_id: str
    ) -> SystemAnnouncement:
        _require_admin(actor_is_admin)
        now = self._now()
        async with self._scope() as repos:
            expired = await repos.announcements.expire_active(announcement_id, now)
            if expired is not None:
                return expired
            existing = await repos.announcements.get_by_id(announcement_id)
            if existing is None:
                raise LookupError("Không tìm thấy thông báo")
            raise ValueError("Thông báo không còn đang hiển thị hoặc chưa được phát")

    async def list_all(
        self, *, actor_is_admin: bool, page: int, page_size: int
    ) -> tuple[Sequence[SystemAnnouncement], int]:
        _require_admin(actor_is_admin)
        page = max(page, 1)
        page_size = min(max(page_size, 1), MAX_PAGE_SIZE)
        async with self._scope() as repos:
            return await repos.announcements.list_paginated(page, page_size)

    # ---------- Public query ----------

    async def list_active(self) -> Sequence[SystemAnnouncement]:
        async with self._scope() as repos:
            return await repos.announcements.list_active(
                self._now(), ANNOUNCEMENT_MAX_ACTIVE_BANNERS
            )

    # ---------- Background dispatch ----------

    async def dispatch_due(self) -> int:
        """Claim and dispatch every due announcement. Returns number dispatched."""
        async with self._scope() as repos:
            expired_count = await repos.announcements.cancel_expired_scheduled(
                self._now()
            )
            if expired_count:
                logger.info(
                    "Auto-cancelled %d expired scheduled announcement(s)", expired_count
                )
        dispatched = 0
        while True:
            async with self._scope() as repos:
                ann = await repos.announcements.claim_due_for_dispatch(self._now())
            if ann is None:
                return dispatched
            await self._fan_out(ann)
            dispatched += 1

    async def resume_interrupted(self) -> int:
        async with self._scope() as repos:
            pending = await repos.announcements.list_sending()
        for ann in pending:
            await self._fan_out(ann)
        return len(pending)

    async def _fan_out(self, ann: SystemAnnouncement) -> None:
        cursor = ann.last_user_id
        total = ann.recipient_count
        if ann.also_notify_bell:
            while True:
                # One transaction per batch; cursor persisted with the batch so a
                # crash resumes from the last committed batch.
                async with self._scope() as repos:
                    user_ids = await repos.users.list_user_ids_after(
                        cursor, self._batch_size
                    )
                    if not user_ids:
                        break
                    recipients = (
                        await repos.announcements.filter_announcement_recipients(
                            user_ids, include_opted_out=ann.is_critical
                        )
                    )
                    total += await repos.announcements.insert_bell_notifications(
                        ann, recipients
                    )
                    cursor = user_ids[-1]
                    current = await repos.announcements.get_by_id(ann.id)
                    if current is None:
                        return
                    current.last_user_id = cursor
                    current.recipient_count = total
                    await repos.announcements.save(current)

        async with self._scope() as repos:
            current = await repos.announcements.get_by_id(ann.id)
            if current is None:
                return
            current.status = AnnouncementStatus.SENT
            current.sent_at = self._now()
            current.recipient_count = total
            current.last_user_id = cursor
            await repos.announcements.save(current)
        logger.info("Announcement %s dispatched to %d users", ann.id, total)
