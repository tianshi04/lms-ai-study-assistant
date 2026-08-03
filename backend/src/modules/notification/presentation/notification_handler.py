from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.notification.v1 import notification_pb as pb
from src.gen.notification.v1.notification_connect import NotificationService
from src.modules.notification.application.use_cases import NotificationUseCase
from src.modules.notification.domain.constants import NotificationCategory
from src.modules.notification.domain.entities import (
    Notification,
    NotificationPreferences,
)
from src.shared.auth import require_current_user


def _to_pb_category(cat: NotificationCategory) -> pb.NotificationCategory:
    mapping = {
        NotificationCategory.SYSTEM: pb.NotificationCategory.SYSTEM,
        NotificationCategory.ACADEMIC: pb.NotificationCategory.ACADEMIC,
        NotificationCategory.COMMUNITY: pb.NotificationCategory.COMMUNITY,
        NotificationCategory.ANNOUNCEMENT: pb.NotificationCategory.ANNOUNCEMENT,
    }
    return mapping.get(cat, pb.NotificationCategory.UNSPECIFIED)


def _from_pb_category(pb_cat: pb.NotificationCategory) -> NotificationCategory:
    mapping = {
        pb.NotificationCategory.SYSTEM: NotificationCategory.SYSTEM,
        pb.NotificationCategory.ACADEMIC: NotificationCategory.ACADEMIC,
        pb.NotificationCategory.COMMUNITY: NotificationCategory.COMMUNITY,
        pb.NotificationCategory.ANNOUNCEMENT: NotificationCategory.ANNOUNCEMENT,
    }
    return mapping.get(pb_cat, NotificationCategory.UNSPECIFIED)


def _to_pb_item(item: Notification) -> pb.NotificationItem:
    return pb.NotificationItem(
        id=item.id,
        recipient_id=item.recipient_id,
        category=_to_pb_category(item.category),
        title=item.title,
        content=item.content,
        action_url=item.action_url,
        actor_avatar_url=item.actor_avatar_url,
        is_read=item.is_read,
        read_at=item.read_at.isoformat() if item.read_at else "",
        created_at=item.created_at.isoformat() if item.created_at else "",
    )


def _to_pb_preferences(prefs: NotificationPreferences) -> pb.NotificationPreferences:
    return pb.NotificationPreferences(
        enable_in_app=prefs.enable_in_app,
        enable_email=prefs.enable_email,
        enable_academic_reminders=prefs.enable_academic_reminders,
        enable_community_replies=prefs.enable_community_replies,
        enable_announcements=prefs.enable_announcements,
    )


class NotificationHandler(NotificationService):
    def __init__(self, use_case: NotificationUseCase) -> None:
        self._use_case = use_case

    async def list_notifications(
        self,
        request: pb.ListNotificationsRequest,
        ctx: RequestContext[pb.ListNotificationsRequest, pb.ListNotificationsResponse],
    ) -> pb.ListNotificationsResponse:
        current_user = require_current_user()
        category_filter = _from_pb_category(request.category_filter)

        try:
            items, unread_count, next_token = await self._use_case.list_notifications(
                recipient_id=current_user.id,
                category_filter=category_filter,
                unread_only=request.unread_only,
                page_size=request.page_size or 20,
                page_token=request.page_token,
            )
            return pb.ListNotificationsResponse(
                notifications=[_to_pb_item(i) for i in items],
                unread_count=unread_count,
                next_page_token=next_token,
            )
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Internal server error: {e}") from e

    async def get_unread_count(
        self,
        request: pb.GetUnreadCountRequest,
        ctx: RequestContext[pb.GetUnreadCountRequest, pb.GetUnreadCountResponse],
    ) -> pb.GetUnreadCountResponse:
        current_user = require_current_user()
        try:
            unread_count = await self._use_case.get_unread_count(current_user.id)
            return pb.GetUnreadCountResponse(unread_count=unread_count)
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Internal server error: {e}") from e

    async def mark_as_read(
        self,
        request: pb.MarkAsReadRequest,
        ctx: RequestContext[pb.MarkAsReadRequest, pb.MarkAsReadResponse],
    ) -> pb.MarkAsReadResponse:
        current_user = require_current_user()
        try:
            count = await self._use_case.mark_as_read(
                recipient_id=current_user.id,
                notification_ids=request.notification_ids,
            )
            return pb.MarkAsReadResponse(success=True, updated_count=count)
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Internal server error: {e}") from e

    async def mark_all_as_read(
        self,
        request: pb.MarkAllAsReadRequest,
        ctx: RequestContext[pb.MarkAllAsReadRequest, pb.MarkAllAsReadResponse],
    ) -> pb.MarkAllAsReadResponse:
        current_user = require_current_user()
        category_filter = _from_pb_category(request.category_filter)
        try:
            count = await self._use_case.mark_all_as_read(
                recipient_id=current_user.id,
                category_filter=category_filter,
            )
            return pb.MarkAllAsReadResponse(success=True, updated_count=count)
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Internal server error: {e}") from e

    async def get_notification_preferences(
        self,
        request: pb.GetNotificationPreferencesRequest,
        ctx: RequestContext[
            pb.GetNotificationPreferencesRequest, pb.GetNotificationPreferencesResponse
        ],
    ) -> pb.GetNotificationPreferencesResponse:
        current_user = require_current_user()
        try:
            prefs = await self._use_case.get_preferences(current_user.id)
            return pb.GetNotificationPreferencesResponse(
                preferences=_to_pb_preferences(prefs)
            )
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Internal server error: {e}") from e

    async def update_notification_preferences(
        self,
        request: pb.UpdateNotificationPreferencesRequest,
        ctx: RequestContext[
            pb.UpdateNotificationPreferencesRequest,
            pb.UpdateNotificationPreferencesResponse,
        ],
    ) -> pb.UpdateNotificationPreferencesResponse:
        current_user = require_current_user()
        p = request.preferences
        if p is None:
            raise ConnectError(Code.INVALID_ARGUMENT, "Preferences payload is required")

        try:
            updated = await self._use_case.update_preferences(
                user_id=current_user.id,
                enable_in_app=p.enable_in_app,
                enable_email=p.enable_email,
                enable_academic_reminders=p.enable_academic_reminders,
                enable_community_replies=p.enable_community_replies,
                enable_announcements=p.enable_announcements,
            )
            return pb.UpdateNotificationPreferencesResponse(
                preferences=_to_pb_preferences(updated)
            )
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Internal server error: {e}") from e
