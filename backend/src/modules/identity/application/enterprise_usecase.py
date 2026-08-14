import logging
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from src.modules.identity.domain.constants import (
    DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS,
    ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS,
    ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT,
)
from src.modules.identity.domain.entities import (
    EnterpriseLicense,
    ScopeType,
)
from src.modules.identity.domain.events import (
    EnterpriseSeatAssignedDomainEvent,
)
from src.modules.identity.infrastructure import repository as repo_module
from src.modules.learning.domain.repositories import ILearningRepository
from src.shared.auth import (
    CurrentUser,
)
from src.shared.infrastructure import database
from src.shared.infrastructure.event_bus import EventBus

logger = logging.getLogger(__name__)


def _default_learning_repo_factory(session: Any) -> ILearningRepository:
    from src.modules.learning.infrastructure.repository import (
        SQLAlchemyLearningRepository,
    )

    return SQLAlchemyLearningRepository(session)


class EnterpriseLicenseUseCase:
    def __init__(
        self,
        learning_repo_factory: Callable[[Any], ILearningRepository] | None = None,
    ) -> None:
        self.learning_repo_factory = (
            learning_repo_factory or _default_learning_repo_factory
        )

    def _verify_admin(self, current_user: CurrentUser | None) -> None:
        if current_user is not None and not current_user.is_admin:
            raise PermissionError(
                "Yêu cầu quyền Quản trị viên (Admin) để thực hiện thao tác này."
            )

    async def assign_enterprise_seat(
        self,
        user_id: str,
        enterprise_seat_key: str,
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        if current_user and user_id != current_user.id and not current_user.is_admin:
            raise PermissionError(
                "Bạn không có quyền gán suất Enterprise Seat cho người dùng khác."
            )
        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            user = await repo.get_by_id(user_id)
            if not user:
                return False, "Không tìm thấy người dùng"

            clean_key = enterprise_seat_key.strip()

            if user.enterprise_seat_key == clean_key:
                logger.warning(
                    "User %s attempted to assign already assigned seat %s",
                    user_id,
                    clean_key,
                )
                return True, "Bạn đã được kích hoạt suất học từ đối tác này trước đó!"

            if user.enterprise_seat_key and user.enterprise_seat_key != clean_key:
                return (
                    False,
                    "Bạn đã có suất học Enterprise khác đang kích hoạt. Vui lòng liên hệ Admin để đổi mã.",
                )

            license_repo = repo_module.EnterpriseLicenseRepository(session)
            license_entity = await license_repo.get_by_key(clean_key)

            if not license_entity or not license_entity.is_active:
                logger.warning(
                    "Enterprise seat assignment failed for user %s: Key %s is invalid or inactive",
                    user_id,
                    clean_key,
                )
                return (
                    False,
                    f"Mã Enterprise Key '{clean_key}' không tồn tại hoặc đã bị vô hiệu hóa.",
                )

            if not license_entity.can_assign_seat():
                logger.warning(
                    "Enterprise seat assignment failed for user %s: Key %s exhausted",
                    user_id,
                    clean_key,
                )
                return (
                    False,
                    f"Mã Enterprise Key '{clean_key}' đã hết suất kích hoạt ({license_entity.used_seats}/{license_entity.total_seats} seats).",
                )

            # BR_ACCESS_002: Atomic DB update for activating enterprise seat with concurrency check
            success = await license_repo.increment_enterprise_seat(clean_key)
            if not success:
                logger.warning(
                    "Race condition detected during seat assignment for user %s: Key %s exhausted",
                    user_id,
                    clean_key,
                )
                return (
                    False,
                    f"Mã Enterprise Key '{clean_key}' đã hết suất kích hoạt.",
                )

            user.enterprise_seat_key = clean_key
            user.seat_assigned_at = datetime.now(UTC).isoformat()
            await repo.save(user)
            logger.info(
                "User %s successfully assigned enterprise seat %s", user_id, clean_key
            )

            # Trigger domain event
            await EventBus.publish(
                EnterpriseSeatAssignedDomainEvent(
                    user_id=user_id,
                    partner_name=license_entity.partner_name,
                    seat_key=clean_key,
                )
            )

            return (
                True,
                f"Kích hoạt thành công suất học từ đối tác {license_entity.partner_name}!",
            )

    async def list_enterprise_seats(
        self,
        partner_name: str = "",
        current_user: CurrentUser | None = None,
    ) -> list[dict]:
        self._verify_admin(current_user)
        async with database.async_session_scope() as session:
            license_repo = repo_module.EnterpriseLicenseRepository(session)
            licenses = await license_repo.list_licenses(partner_name)

            result = []
            for lic in licenses:
                result.append(
                    {
                        "id": lic.key,
                        "partner_name": lic.partner_name,
                        "seat_key": lic.key,
                        "assigned_user_id": f"{lic.used_seats}/{lic.total_seats} seats",
                        "assigned_user_email": "Hoạt động"
                        if lic.is_active
                        else "Vô hiệu",
                        "status": "ACTIVE" if lic.is_active else "INACTIVE",
                        "created_at": datetime.now(UTC).isoformat(),
                        "scope_type": lic.scope_type.value
                        if hasattr(lic.scope_type, "value")
                        else str(lic.scope_type),
                        "allowed_course_ids": list(lic.allowed_course_ids)
                        if lic.allowed_course_ids
                        else [],
                    }
                )
            return result

    async def create_enterprise_seat(
        self,
        partner_name: str,
        seat_key: str,
        scope_type: str = "ALL_COURSES",
        allowed_course_ids: list[str] | None = None,
        current_user: CurrentUser | None = None,
    ) -> dict:
        self._verify_admin(current_user)
        async with database.async_session_scope() as session:
            clean_key = seat_key.strip() or f"KEY-{uuid.uuid4().hex[:8].upper()}"
            clean_scope = (
                ScopeType(scope_type)
                if scope_type in ScopeType._value2member_map_
                else ScopeType.ALL_COURSES
            )
            courses_list = allowed_course_ids or []
            license_repo = repo_module.EnterpriseLicenseRepository(session)
            lic = EnterpriseLicense(
                key=clean_key,
                partner_name=partner_name or "Doanh nghiệp Đối tác",
                total_seats=DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS,
                used_seats=0,
                is_active=True,
                scope_type=clean_scope,
                allowed_course_ids=set(courses_list),
            )
            created = await license_repo.create_license(lic)
            return {
                "id": clean_key,
                "partner_name": partner_name,
                "seat_key": clean_key,
                "assigned_user_id": f"0/{DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS} seats",
                "assigned_user_email": "Hoạt động",
                "status": "ACTIVE",
                "created_at": datetime.now(UTC).isoformat(),
                "scope_type": created.scope_type.value
                if hasattr(created.scope_type, "value")
                else str(created.scope_type),
                "allowed_course_ids": list(created.allowed_course_ids)
                if created.allowed_course_ids
                else [],
            }

    async def revoke_enterprise_seat(
        self,
        user_id: str,
        course_id: str = "",
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        self._verify_admin(current_user)
        """Revokes enterprise seat from user if BR_ACCESS_003 conditions are met.

        Conditions (BR_ACCESS_003):
          - User must have been assigned a seat.
          - If seat was assigned <= 30 days ago, progress must be < 20%.
          - If seat was assigned > 30 days ago, revocation is allowed unconditionally.
        """
        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            user = await repo.get_by_id(user_id)
            if not user or not user.enterprise_seat_key:
                return False, "Người dùng chưa được gán mã Enterprise Seat"

            # BR_ACCESS_003: enforce 30-day + <20% progress guard
            now = datetime.now(UTC)
            if user.seat_assigned_at:
                try:
                    assigned_dt = datetime.fromisoformat(user.seat_assigned_at)
                    within_grace_period = (now - assigned_dt) <= timedelta(
                        days=ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS
                    )
                except (ValueError, TypeError):
                    within_grace_period = False
            else:
                within_grace_period = False

            if within_grace_period and course_id:
                learning_repo = self.learning_repo_factory(session)
                progress = await learning_repo.get_progress(user_id, course_id)
                if (
                    progress
                    and progress.overall_progress_percent
                    >= ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT
                ):
                    logger.warning(
                        "Cannot revoke seat %s from user %s: Progress %s >= %s",
                        user.enterprise_seat_key,
                        user_id,
                        progress.overall_progress_percent,
                        ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT,
                    )
                    return (
                        False,
                        f"Không thể thu hồi: Học viên đã đạt {progress.overall_progress_percent}% tiến độ (>= {int(ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT)}% trong {ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS} ngày đầu).",
                    )

            seat_key = user.enterprise_seat_key
            user.enterprise_seat_key = None
            user.seat_assigned_at = None
            await repo.save(user)

            # BR_ACCESS_003: Atomic DB update for recycling enterprise seats
            if seat_key:
                license_repo = repo_module.EnterpriseLicenseRepository(session)
                await license_repo.decrement_enterprise_seat(seat_key)

            logger.info(
                "Successfully revoked enterprise seat %s from user %s",
                seat_key,
                user_id,
            )
            return True, f"Đã thu hồi suất học Enterprise Key '{seat_key}' thành công!"
