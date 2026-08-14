from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.gen.notification.v1 import notification_pb as pb
from src.modules.notification.application import (
    NotificationUseCase,
)
from src.modules.notification.domain import (
    Notification,
    NotificationCategory,
    NotificationPreferences,
)
from src.modules.notification.presentation.notification_handler import (
    NotificationHandler,
)
from src.shared.auth import CurrentUserContext, set_current_user


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
