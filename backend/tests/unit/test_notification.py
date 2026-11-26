from collections.abc import AsyncIterator, Sequence
from contextlib import asynccontextmanager
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.gen.notification.v1 import notification_pb as pb
from src.modules.notification.application import (
    AnnouncementRepos,
    AnnouncementUseCase,
    NotificationUseCase,
)
from src.modules.notification.domain import (
    AnnouncementSeverity,
    AnnouncementStatus,
    Notification,
    NotificationCategory,
    NotificationPreferences,
    SystemAnnouncement,
    SystemAnnouncementRepository,
)
from src.modules.notification.presentation.notification_handler import (
    NotificationHandler,
)
from src.shared.auth import CurrentUserContext, set_current_user


class _FakeUserDirectory:
    def __init__(self, user_ids: Sequence[str]) -> None:
        self._ids = sorted(user_ids)

    async def list_user_ids_after(self, after_id: str, limit: int) -> list[str]:
        filtered = [u for u in self._ids if u > after_id] if after_id else self._ids
        return list(filtered[:limit])


class _FakeAnnouncementRepo(SystemAnnouncementRepository):
    def __init__(self, opted_out: set[str]) -> None:
        self.items: dict[str, SystemAnnouncement] = {}
        self.bell_pairs: set[tuple[str, str]] = set()
        self.opted_out = opted_out

    async def create(self, announcement: SystemAnnouncement) -> SystemAnnouncement:
        self.items[announcement.id] = replace(announcement)
        return replace(announcement)

    async def get_by_id(self, announcement_id: str) -> SystemAnnouncement | None:
        a = self.items.get(announcement_id)
        return replace(a) if a else None

    async def save(self, announcement: SystemAnnouncement) -> SystemAnnouncement:
        self.items[announcement.id] = replace(announcement)
        return replace(announcement)

    async def list_paginated(
        self, page: int, page_size: int
    ) -> tuple[Sequence[SystemAnnouncement], int]:
        rows = sorted(
            self.items.values(),
            key=lambda x: x.created_at or datetime.min.replace(tzinfo=UTC),
            reverse=True,
        )
        start = (page - 1) * page_size
        return [replace(r) for r in rows[start : start + page_size]], len(rows)

    async def list_active(
        self, now: datetime, limit: int
    ) -> Sequence[SystemAnnouncement]:
        active = [
            replace(a)
            for a in self.items.values()
            if a.status in (AnnouncementStatus.SENDING, AnnouncementStatus.SENT)
            and a.starts_at <= now < a.expires_at
        ]
        active.sort(key=lambda x: x.starts_at, reverse=True)
        return active[:limit]

    async def claim_due_for_dispatch(self, now: datetime) -> SystemAnnouncement | None:
        due = [
            a
            for a in self.items.values()
            if a.status == AnnouncementStatus.SCHEDULED
            and a.starts_at <= now < a.expires_at
        ]
        if not due:
            return None
        due.sort(key=lambda x: x.starts_at)
        chosen = due[0]
        chosen.status = AnnouncementStatus.SENDING
        return replace(chosen)

    async def cancel_expired_scheduled(self, now: datetime) -> int:
        count = 0
        for a in self.items.values():
            if a.status == AnnouncementStatus.SCHEDULED and a.expires_at <= now:
                a.status = AnnouncementStatus.CANCELLED
                count += 1
        return count

    async def cancel_scheduled(self, announcement_id: str) -> SystemAnnouncement | None:
        a = self.items.get(announcement_id)
        if a is None or a.status != AnnouncementStatus.SCHEDULED:
            return None
        a.status = AnnouncementStatus.CANCELLED
        return replace(a)

    async def expire_active(
        self, announcement_id: str, now: datetime
    ) -> SystemAnnouncement | None:
        a = self.items.get(announcement_id)
        if (
            a is None
            or a.status not in (AnnouncementStatus.SENT, AnnouncementStatus.SENDING)
            or a.expires_at <= now
        ):
            return None
        a.expires_at = now
        return replace(a)

    async def list_sending(self) -> Sequence[SystemAnnouncement]:
        return [
            replace(a)
            for a in self.items.values()
            if a.status == AnnouncementStatus.SENDING
        ]

    async def filter_announcement_recipients(
        self, user_ids: Sequence[str], include_opted_out: bool
    ) -> list[str]:
        if include_opted_out:
            return list(user_ids)
        return [u for u in user_ids if u not in self.opted_out]

    async def insert_bell_notifications(
        self, announcement: SystemAnnouncement, recipient_ids: Sequence[str]
    ) -> int:
        inserted = 0
        for rid in recipient_ids:
            key = (announcement.id, rid)
            if key not in self.bell_pairs:
                self.bell_pairs.add(key)
                inserted += 1
        return inserted


def test_notification_entity_mark_as_read():
    notif = Notification(
        id="notif_1",
        recipient_id="user_1",
        category=NotificationCategory.SYSTEM,
        title="Test Title",
        content="Test Content",
    )
    assert not notif.is_read
    assert notif.read_at is None

    now = datetime.now(UTC)
    notif.mark_as_read(now)
    assert notif.is_read
    assert notif.read_at == now


@pytest.mark.asyncio
async def test_notification_usecase_send_and_list():
    notif_repo = AsyncMock()
    pref_repo = AsyncMock()

    sample_notif = Notification(
        id="notif_1",
        recipient_id="user_1",
        category=NotificationCategory.ACADEMIC,
        title="Deadline Reminder",
        content="Quiz in 24h",
        action_url="/learn/c1",
        is_read=False,
    )
    notif_repo.create.return_value = sample_notif
    notif_repo.list_by_recipient.return_value = [sample_notif]
    notif_repo.get_unread_count.return_value = 1
    pref_repo.get_by_user_id.return_value = None

    use_case = NotificationUseCase(notif_repo=notif_repo, pref_repo=pref_repo)

    sent = await use_case.send_notification(
        recipient_id="user_1",
        category=NotificationCategory.ACADEMIC,
        title="Deadline Reminder",
        content="Quiz in 24h",
        action_url="/learn/c1",
    )
    assert sent.id == "notif_1"
    assert sent.title == "Deadline Reminder"

    items, unread_count, next_token = await use_case.list_notifications("user_1")
    assert len(items) == 1
    assert unread_count == 1
    assert next_token == ""


@pytest.mark.asyncio
async def test_notification_usecase_mark_read_and_preferences():
    notif_repo = AsyncMock()
    pref_repo = AsyncMock()

    notif_repo.mark_as_read.return_value = 1
    notif_repo.mark_all_as_read.return_value = 5

    saved_pref = NotificationPreferences(
        user_id="user_1",
        enable_in_app=True,
        enable_email=False,
    )
    pref_repo.get_by_user_id.return_value = saved_pref
    pref_repo.save.return_value = saved_pref

    use_case = NotificationUseCase(notif_repo=notif_repo, pref_repo=pref_repo)

    marked_count = await use_case.mark_as_read("user_1", ["notif_1"])
    assert marked_count == 1

    all_marked = await use_case.mark_all_as_read("user_1")
    assert all_marked == 5

    prefs = await use_case.get_preferences("user_1")
    assert prefs.enable_in_app is True
    assert prefs.enable_email is False

    updated = await use_case.update_preferences(
        user_id="user_1",
        enable_in_app=True,
        enable_email=True,
        enable_academic_reminders=True,
        enable_community_replies=True,
        enable_announcements=True,
    )
    assert updated.user_id == "user_1"


@pytest.mark.asyncio
async def test_notification_handler_flow():
    usecase_mock = AsyncMock()
    sample_notif = Notification(
        id="notif_10",
        recipient_id="user_test",
        category=NotificationCategory.COMMUNITY,
        title="New Reply",
        content="User B replied to your question",
        is_read=False,
    )
    usecase_mock.list_notifications.return_value = ([sample_notif], 1, "")
    usecase_mock.get_unread_count.return_value = 1
    usecase_mock.mark_as_read.return_value = 1
    usecase_mock.mark_all_as_read.return_value = 3
    usecase_mock.get_preferences.return_value = NotificationPreferences(
        user_id="user_test"
    )
    usecase_mock.update_preferences.return_value = NotificationPreferences(
        user_id="user_test"
    )

    handler = NotificationHandler(usecase_mock)

    user_ctx = CurrentUserContext(
        id="user_test",
        email="test@example.com",
        role="LEARNER",
    )
    set_current_user(user_ctx)

    ctx_mock = MagicMock()

    list_req = pb.ListNotificationsRequest(page_size=10)
    list_res = await handler.list_notifications(list_req, ctx_mock)
    assert len(list_res.notifications) == 1
    assert list_res.notifications[0].id == "notif_10"
    assert list_res.unread_count == 1

    unread_res = await handler.get_unread_count(pb.GetUnreadCountRequest(), ctx_mock)
    assert unread_res.unread_count == 1

    mark_res = await handler.mark_as_read(
        pb.MarkAsReadRequest(notification_ids=["notif_10"]), ctx_mock
    )
    assert mark_res.success
    assert mark_res.updated_count == 1

    mark_all_res = await handler.mark_all_as_read(pb.MarkAllAsReadRequest(), ctx_mock)
    assert mark_all_res.success
    assert mark_all_res.updated_count == 3

    pref_res = await handler.get_notification_preferences(
        pb.GetNotificationPreferencesRequest(), ctx_mock
    )
    assert pref_res.preferences is not None
    assert pref_res.preferences.enable_in_app is True

    update_pref_res = await handler.update_notification_preferences(
        pb.UpdateNotificationPreferencesRequest(
            preferences=pb.NotificationPreferences(
                enable_in_app=True,
                enable_email=False,
                enable_academic_reminders=True,
                enable_community_replies=True,
                enable_announcements=True,
            )
        ),
        ctx_mock,
    )
    assert update_pref_res.preferences is not None
    assert update_pref_res.preferences.enable_in_app is True


@pytest.mark.asyncio
async def test_system_announcement_business_rules():
    ann_repo = _FakeAnnouncementRepo(opted_out={"u2"})
    user_dir = _FakeUserDirectory(["u1", "u2", "u3"])

    @asynccontextmanager
    async def repo_scope() -> AsyncIterator[AnnouncementRepos]:
        yield AnnouncementRepos(announcements=ann_repo, users=user_dir)

    now = datetime(2026, 11, 18, 12, 0, tzinfo=UTC)
    uc = AnnouncementUseCase(repo_scope=repo_scope, batch_size=2, clock=lambda: now)

    # 1. Non-admin rejected
    with pytest.raises(PermissionError):
        await uc.create(
            actor_id="u1",
            actor_is_admin=False,
            title="Bảo trì",
            content="Hệ thống bảo trì",
            action_url="",
            severity=AnnouncementSeverity.WARNING,
            starts_at=None,
            expires_at=now + timedelta(hours=2),
            also_notify_bell=True,
            is_critical=False,
        )

    # 2. Invalid action_url (javascript:) rejected
    with pytest.raises(ValueError, match="Liên kết"):
        await uc.create(
            actor_id="admin1",
            actor_is_admin=True,
            title="Bảo trì",
            content="...",
            action_url="javascript:alert(1)",
            severity=AnnouncementSeverity.WARNING,
            starts_at=None,
            expires_at=now + timedelta(hours=2),
            also_notify_bell=False,
            is_critical=False,
        )

    # 3. Past starts_at rejected
    with pytest.raises(ValueError, match="1 phút"):
        await uc.create(
            actor_id="admin1",
            actor_is_admin=True,
            title="Bảo trì",
            content="...",
            action_url="/status",
            severity=AnnouncementSeverity.WARNING,
            starts_at=now - timedelta(minutes=5),
            expires_at=now + timedelta(hours=2),
            also_notify_bell=False,
            is_critical=False,
        )

    # 4. Immediate announcement respecting preferences (u2 skipped -> 2 recipients)
    ann1 = await uc.create(
        actor_id="admin1",
        actor_is_admin=True,
        title="Bảo trì định kỳ",
        content="Bảo trì từ 22:00 đến 23:00",
        action_url="/maintenance",
        severity=AnnouncementSeverity.WARNING,
        starts_at=None,
        expires_at=now + timedelta(hours=2),
        also_notify_bell=True,
        is_critical=False,
    )
    assert ann1.status == AnnouncementStatus.SCHEDULED
    # Not yet visible on active banners before dispatcher claims/sends it
    assert await uc.list_active() == []

    dispatched = await uc.dispatch_due()
    assert dispatched == 1
    assert await uc.dispatch_due() == 0

    items, total = await uc.list_all(actor_is_admin=True, page=1, page_size=10)
    assert total == 1
    assert items[0].status == AnnouncementStatus.SENT
    assert items[0].recipient_count == 2

    active = await uc.list_active()
    assert [a.id for a in active] == [ann1.id]

    with pytest.raises(ValueError, match="huỷ"):
        await uc.cancel(actor_is_admin=True, announcement_id=ann1.id)

    # 5. Critical announcement bypasses opt-out (all 3 users receive bell)
    ann2 = await uc.create(
        actor_id="admin1",
        actor_is_admin=True,
        title="Bảo trì khẩn cấp",
        content="Ngừng dịch vụ trong 15 phút",
        action_url="https://status.example.com",
        severity=AnnouncementSeverity.CRITICAL,
        starts_at=None,
        expires_at=now + timedelta(hours=1),
        also_notify_bell=True,
        is_critical=True,
    )
    await uc.dispatch_due()
    assert (ann2.id, "u2") in ann_repo.bell_pairs
    assert (ann1.id, "u2") not in ann_repo.bell_pairs

    # Duplicate insert for same (announcement_id, recipient_id) is ignored
    assert await ann_repo.insert_bell_notifications(ann2, ["u1", "u2", "u3"]) == 0

    # 6. Future scheduled announcement can be cancelled before starts_at
    ann3 = await uc.create(
        actor_id="admin1",
        actor_is_admin=True,
        title="Sắp bảo trì tuần sau",
        content="...",
        action_url="",
        severity=AnnouncementSeverity.INFO,
        starts_at=now + timedelta(hours=1),
        expires_at=now + timedelta(hours=3),
        also_notify_bell=True,
        is_critical=False,
    )
    cancelled = await uc.cancel(actor_is_admin=True, announcement_id=ann3.id)
    assert cancelled.status == AnnouncementStatus.CANCELLED

    # 7. Handler mapping check
    handler = NotificationHandler(use_case=AsyncMock(), announcement_use_case=uc)
    ctx_mock = MagicMock()
    set_current_user(CurrentUserContext(id="u1", role="LEARNER"))
    with pytest.raises(ConnectError) as exc_info:
        await handler.create_system_announcement(
            pb.CreateSystemAnnouncementRequest(
                title="T",
                content="C",
                expires_at=(now + timedelta(hours=1)).isoformat(),
            ),
            ctx_mock,
        )
    assert exc_info.value.code == Code.PERMISSION_DENIED

    set_current_user(CurrentUserContext(id="admin1", role="ADMIN"))
    with pytest.raises(ConnectError) as exc_info2:
        await handler.cancel_system_announcement(
            pb.CancelSystemAnnouncementRequest(id=ann1.id),
            ctx_mock,
        )
    assert exc_info2.value.code == Code.FAILED_PRECONDITION

    # 8. also_notify_bell=False forces is_critical=False
    ann_banner_only = await uc.create(
        actor_id="admin1",
        actor_is_admin=True,
        title="Banner only",
        content="No bell",
        action_url="",
        severity=AnnouncementSeverity.INFO,
        starts_at=now + timedelta(minutes=10),
        expires_at=now + timedelta(minutes=30),
        also_notify_bell=False,
        is_critical=True,
    )
    assert ann_banner_only.is_critical is False

    # 9. Early banner removal via ExpireSystemAnnouncement
    exp_res = await handler.expire_system_announcement(
        pb.ExpireSystemAnnouncementRequest(id=ann1.id),
        ctx_mock,
    )
    assert exp_res.announcement is not None
    assert exp_res.announcement.status == pb.AnnouncementStatus.SENT
    active_after_expire = await uc.list_active()
    assert ann1.id not in [a.id for a in active_after_expire]

    # Expiring an already-expired announcement fails with FAILED_PRECONDITION
    with pytest.raises(ConnectError) as exc_info3:
        await handler.expire_system_announcement(
            pb.ExpireSystemAnnouncementRequest(id=ann1.id),
            ctx_mock,
        )
    assert exc_info3.value.code == Code.FAILED_PRECONDITION

    # 10. Expired SCHEDULED announcements are auto-cancelled instead of dispatched
    late_uc = AnnouncementUseCase(
        repo_scope=repo_scope, batch_size=2, clock=lambda: now + timedelta(hours=5)
    )
    assert await late_uc.dispatch_due() == 0
    stale = await ann_repo.get_by_id(ann_banner_only.id)
    assert stale is not None
    assert stale.status == AnnouncementStatus.CANCELLED
