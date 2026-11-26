import asyncio
import logging
import time
from datetime import UTC, datetime

from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.request import RequestContext

from src.gen.notification.v1 import notification_pb as pb
from src.gen.notification.v1.notification_connect import NotificationService
from src.modules.notification.application import (
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
)
from src.shared.auth import require_current_user

ACTIVE_BANNERS_CACHE_TTL_SECONDS = 30.0
logger = logging.getLogger(__name__)


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


def _to_pb_severity(sev: AnnouncementSeverity) -> pb.AnnouncementSeverity:
    mapping = {
        AnnouncementSeverity.INFO: pb.AnnouncementSeverity.INFO,
        AnnouncementSeverity.WARNING: pb.AnnouncementSeverity.WARNING,
        AnnouncementSeverity.CRITICAL: pb.AnnouncementSeverity.CRITICAL,
    }
    return mapping.get(sev, pb.AnnouncementSeverity.INFO)


def _from_pb_severity(pb_sev: pb.AnnouncementSeverity) -> AnnouncementSeverity:
    mapping = {
        pb.AnnouncementSeverity.INFO: AnnouncementSeverity.INFO,
        pb.AnnouncementSeverity.WARNING: AnnouncementSeverity.WARNING,
        pb.AnnouncementSeverity.CRITICAL: AnnouncementSeverity.CRITICAL,
    }
    return mapping.get(pb_sev, AnnouncementSeverity.INFO)


def _to_pb_status(st: AnnouncementStatus) -> pb.AnnouncementStatus:
    mapping = {
        AnnouncementStatus.SCHEDULED: pb.AnnouncementStatus.SCHEDULED,
        AnnouncementStatus.SENDING: pb.AnnouncementStatus.SENDING,
        AnnouncementStatus.SENT: pb.AnnouncementStatus.SENT,
        AnnouncementStatus.CANCELLED: pb.AnnouncementStatus.CANCELLED,
    }
    return mapping.get(st, pb.AnnouncementStatus.UNSPECIFIED)


def _to_pb_announcement(item: SystemAnnouncement) -> pb.SystemAnnouncement:
    return pb.SystemAnnouncement(
        id=item.id,
        title=item.title,
        content=item.content,
        action_url=item.action_url,
        severity=_to_pb_severity(item.severity),
        status=_to_pb_status(item.status),
        starts_at=item.starts_at.isoformat() if item.starts_at else "",
        expires_at=item.expires_at.isoformat() if item.expires_at else "",
        also_notify_bell=item.also_notify_bell,
        is_critical=item.is_critical,
        created_by=item.created_by,
        sent_at=item.sent_at.isoformat() if item.sent_at else "",
        recipient_count=item.recipient_count,
        created_at=item.created_at.isoformat() if item.created_at else "",
    )


def _parse_iso_datetime(value: str, field_name: str) -> datetime | None:
    val = (value or "").strip()
    if not val:
        return None
    try:
        dt = datetime.fromisoformat(val)
    except ValueError as e:
        raise ValueError(f"Định dạng thời gian '{field_name}' không hợp lệ") from e
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


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
    def __init__(
        self,
        use_case: NotificationUseCase,
        announcement_use_case: AnnouncementUseCase | None = None,
    ) -> None:
        self._use_case = use_case
        self._announcement_use_case = announcement_use_case or AnnouncementUseCase()
        self._active_cache: (
            tuple[float, list[tuple[datetime, pb.SystemAnnouncement]]] | None
        ) = None
        self._bg_tasks: set[asyncio.Task[int]] = set()

    def _invalidate_active_cache(self) -> None:
        self._active_cache = None

    def _on_dispatch_done(self, task: asyncio.Task[int]) -> None:
        self._bg_tasks.discard(task)
        if task.cancelled():
            return
        exc = task.exception()
        if exc is not None:
            logger.error("Background announcement dispatch failed: %s", exc)

    def _schedule_background_dispatch(self) -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return
        task = loop.create_task(self._announcement_use_case.dispatch_due())
        self._bg_tasks.add(task)
        task.add_done_callback(self._on_dispatch_done)

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

    async def create_system_announcement(
        self,
        request: pb.CreateSystemAnnouncementRequest,
        ctx: RequestContext[
            pb.CreateSystemAnnouncementRequest, pb.CreateSystemAnnouncementResponse
        ],
    ) -> pb.CreateSystemAnnouncementResponse:
        current_user = require_current_user()
        try:
            starts_at = _parse_iso_datetime(request.starts_at, "starts_at")
            expires_at = _parse_iso_datetime(request.expires_at, "expires_at")
            ann = await self._announcement_use_case.create(
                actor_id=current_user.id,
                actor_is_admin=current_user.is_admin,
                title=request.title,
                content=request.content,
                action_url=request.action_url,
                severity=_from_pb_severity(request.severity),
                starts_at=starts_at,
                expires_at=expires_at,
                also_notify_bell=request.also_notify_bell,
                is_critical=request.is_critical,
            )
            self._invalidate_active_cache()
            if starts_at is None:
                self._schedule_background_dispatch()
            return pb.CreateSystemAnnouncementResponse(
                announcement=_to_pb_announcement(ann)
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Internal server error: {e}") from e

    async def list_system_announcements(
        self,
        request: pb.ListSystemAnnouncementsRequest,
        ctx: RequestContext[
            pb.ListSystemAnnouncementsRequest, pb.ListSystemAnnouncementsResponse
        ],
    ) -> pb.ListSystemAnnouncementsResponse:
        current_user = require_current_user()
        try:
            items, total = await self._announcement_use_case.list_all(
                actor_is_admin=current_user.is_admin,
                page=request.page or 1,
                page_size=request.page_size or 20,
            )
            return pb.ListSystemAnnouncementsResponse(
                announcements=[_to_pb_announcement(a) for a in items],
                total=total,
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.INVALID_ARGUMENT, str(e)) from e
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Internal server error: {e}") from e

    async def cancel_system_announcement(
        self,
        request: pb.CancelSystemAnnouncementRequest,
        ctx: RequestContext[
            pb.CancelSystemAnnouncementRequest, pb.CancelSystemAnnouncementResponse
        ],
    ) -> pb.CancelSystemAnnouncementResponse:
        current_user = require_current_user()
        try:
            ann = await self._announcement_use_case.cancel(
                actor_is_admin=current_user.is_admin,
                announcement_id=request.id,
            )
            self._invalidate_active_cache()
            return pb.CancelSystemAnnouncementResponse(
                announcement=_to_pb_announcement(ann)
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except LookupError as e:
            raise ConnectError(Code.NOT_FOUND, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.FAILED_PRECONDITION, str(e)) from e
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Internal server error: {e}") from e

    async def expire_system_announcement(
        self,
        request: pb.ExpireSystemAnnouncementRequest,
        ctx: RequestContext[
            pb.ExpireSystemAnnouncementRequest, pb.ExpireSystemAnnouncementResponse
        ],
    ) -> pb.ExpireSystemAnnouncementResponse:
        current_user = require_current_user()
        try:
            ann = await self._announcement_use_case.expire_early(
                actor_is_admin=current_user.is_admin,
                announcement_id=request.id,
            )
            self._invalidate_active_cache()
            return pb.ExpireSystemAnnouncementResponse(
                announcement=_to_pb_announcement(ann)
            )
        except PermissionError as e:
            raise ConnectError(Code.PERMISSION_DENIED, str(e)) from e
        except LookupError as e:
            raise ConnectError(Code.NOT_FOUND, str(e)) from e
        except ValueError as e:
            raise ConnectError(Code.FAILED_PRECONDITION, str(e)) from e
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Internal server error: {e}") from e

    async def get_active_announcements(
        self,
        request: pb.GetActiveAnnouncementsRequest,
        ctx: RequestContext[
            pb.GetActiveAnnouncementsRequest, pb.GetActiveAnnouncementsResponse
        ],
    ) -> pb.GetActiveAnnouncementsResponse:
        now_mono = time.monotonic()
        if (
            self._active_cache is not None
            and now_mono - self._active_cache[0] < ACTIVE_BANNERS_CACHE_TTL_SECONDS
        ):
            now_utc = datetime.now(UTC)
            still_active = [
                item for exp, item in self._active_cache[1] if exp > now_utc
            ]
            return pb.GetActiveAnnouncementsResponse(announcements=still_active)
        try:
            items = await self._announcement_use_case.list_active()
            cached = [(a.expires_at, _to_pb_announcement(a)) for a in items]
            self._active_cache = (now_mono, cached)
            return pb.GetActiveAnnouncementsResponse(
                announcements=[item for _, item in cached]
            )
        except Exception as e:
            raise ConnectError(Code.INTERNAL, f"Internal server error: {e}") from e
