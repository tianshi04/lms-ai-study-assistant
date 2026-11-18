import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from uuid6 import uuid7

from src.modules.identity.domain import (
    DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS,
    EnterpriseLicense,
    EnterpriseSeatAssignedDomainEvent,
    EnterpriseSeatSummary,
    OrganizationSeatHolder,
    OrganizationSeatHoldersPage,
    ScopeType,
)
from src.modules.identity.infrastructure import repository as repo_module
from src.modules.learning.domain import ILearningRepository
from src.shared.auth import CurrentUser
from src.shared.domain.constants import (
    normalize_admin_paging,
    normalize_admin_search,
)
from src.shared.infrastructure import database
from src.shared.infrastructure.event_bus import EventBus
from src.shared.permissions import (
    OrgPermission,
    enforce_strict_organization_permission,
)

logger = logging.getLogger(__name__)


def _to_seat_summary(lic: EnterpriseLicense) -> EnterpriseSeatSummary:
    return EnterpriseSeatSummary(
        id=lic.key,
        partner_name=lic.partner_name,
        seat_key=lic.key,
        total_seats=lic.total_seats,
        used_seats=lic.used_seats,
        is_active=lic.is_active,
        scope_type=lic.scope_type.value
        if hasattr(lic.scope_type, "value")
        else str(lic.scope_type),
        allowed_course_ids=tuple(sorted(lic.allowed_course_ids or ())),
        organization_id=lic.organization_id or "",
    )


class EnterpriseLicenseUseCase:
    def __init__(
        self,
        learning_repo_factory: Callable[[Any], ILearningRepository] | None = None,
    ) -> None:
        self.learning_repo_factory = learning_repo_factory

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
        organization_id: str = "",
        current_user: CurrentUser | None = None,
    ) -> list[EnterpriseSeatSummary]:
        clean_org_id = (organization_id or "").strip()
        async with database.async_session_scope() as session:
            license_repo = repo_module.EnterpriseLicenseRepository(session)
            if clean_org_id:
                org_repo = repo_module.OrganizationRepository(session)
                org = await org_repo.get_organization_by_id(clean_org_id)
                target_org_id = org.id if org else clean_org_id
                await enforce_strict_organization_permission(
                    session,
                    current_user,
                    target_org_id,
                    required_permission=OrgPermission.VIEW_ANALYTICS,
                )
                licenses = await license_repo.list_licenses(
                    partner_name=partner_name, organization_id=target_org_id
                )
            else:
                self._verify_admin(current_user)
                licenses = await license_repo.list_licenses(partner_name=partner_name)

            return [_to_seat_summary(lic) for lic in licenses]

    async def create_enterprise_seat(
        self,
        partner_name: str,
        seat_key: str,
        scope_type: str = "ALL_COURSES",
        allowed_course_ids: list[str] | None = None,
        organization_id: str = "",
        total_seats: int = 0,
        current_user: CurrentUser | None = None,
    ) -> EnterpriseSeatSummary:
        self._verify_admin(current_user)
        async with database.async_session_scope() as session:
            clean_key = seat_key.strip() or f"KEY-{uuid7().hex[-8:].upper()}"
            clean_scope = (
                ScopeType(scope_type)
                if scope_type in ScopeType._value2member_map_
                else ScopeType.ALL_COURSES
            )
            clean_org_id = (organization_id or "").strip()
            resolved_org_id: str | None = None
            resolved_partner_name = (partner_name or "").strip()
            if clean_org_id:
                org_repo = repo_module.OrganizationRepository(session)
                org = await org_repo.get_organization_by_id(clean_org_id)
                if not org:
                    raise ValueError(f"Không tìm thấy tổ chức '{clean_org_id}'")
                resolved_org_id = org.id
                if not resolved_partner_name:
                    resolved_partner_name = org.name

            effective_total = (
                total_seats if total_seats > 0 else DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS
            )
            courses_list = allowed_course_ids or []
            license_repo = repo_module.EnterpriseLicenseRepository(session)
            lic = EnterpriseLicense(
                key=clean_key,
                partner_name=resolved_partner_name or "Doanh nghiệp Đối tác",
                total_seats=effective_total,
                used_seats=0,
                is_active=True,
                scope_type=clean_scope,
                allowed_course_ids=set(courses_list),
                organization_id=resolved_org_id,
            )
            created = await license_repo.create_license(lic)
            return _to_seat_summary(created)

    async def list_organization_seat_holders(
        self,
        organization_id: str,
        current_user: CurrentUser | None,
        page: int = 1,
        page_size: int = 10,
        search_query: str = "",
        revocable_only: bool = False,
    ) -> OrganizationSeatHoldersPage:
        eff_page, eff_page_size = normalize_admin_paging(page, page_size)
        clean_search = normalize_admin_search(search_query)
        clean_org_id = (organization_id or "").strip()

        async with database.async_session_scope() as session:
            org_repo = repo_module.OrganizationRepository(session)
            org = (
                await org_repo.get_organization_by_id(clean_org_id)
                if clean_org_id
                else None
            )
            target_org_id = org.id if org else clean_org_id

            await enforce_strict_organization_permission(
                session,
                current_user,
                target_org_id,
                required_permission=OrgPermission.VIEW_ANALYTICS,
            )
            if not org:
                raise KeyError(f"Không tìm thấy tổ chức '{clean_org_id}'")

            now = datetime.now(UTC)
            if revocable_only:
                raw_rows, _ = await org_repo.list_organization_seat_holder_users(
                    org.id,
                    page=None,
                    page_size=None,
                    search_query=clean_search,
                )
            else:
                (
                    raw_rows,
                    total_count,
                ) = await org_repo.list_organization_seat_holder_users(
                    org.id,
                    page=eff_page,
                    page_size=eff_page_size,
                    search_query=clean_search,
                )

            progress_map: dict[str, tuple[int, float]] = {}
            if raw_rows and self.learning_repo_factory is not None:
                learning_repo = self.learning_repo_factory(session)
                progress_map = await learning_repo.get_user_progress_summaries(
                    [r.user_id for r in raw_rows]
                )

            enriched: list[OrganizationSeatHolder] = []
            for r in raw_rows:
                enrolled_cnt, max_prog = progress_map.get(r.user_id, (0, 0.0))
                eligibility = EnterpriseLicense.evaluate_revocation_eligibility(
                    seat_assigned_at=r.seat_assigned_at,
                    max_progress_percent=max_prog,
                    now=now,
                )
                holder = OrganizationSeatHolder(
                    user_id=r.user_id,
                    full_name=r.full_name,
                    email=r.email,
                    avatar_url=r.avatar_url,
                    seat_key=r.seat_key,
                    seat_assigned_at=r.seat_assigned_at,
                    enrolled_courses_count=enrolled_cnt,
                    max_progress_percent=max_prog,
                    can_revoke=eligibility.can_revoke,
                    revoke_reason_hint=eligibility.reason,
                )
                if not revocable_only or holder.can_revoke:
                    enriched.append(holder)

            if revocable_only:
                total_count = len(enriched)
                start = (eff_page - 1) * eff_page_size
                enriched = enriched[start : start + eff_page_size]

            return OrganizationSeatHoldersPage(
                holders=tuple(enriched),
                total_count=total_count,
                page=eff_page,
                page_size=eff_page_size,
            )

    async def revoke_enterprise_seat(
        self,
        user_id: str,
        course_id: str = "",
        current_user: CurrentUser | None = None,
    ) -> tuple[bool, str]:
        """Revokes enterprise seat from user if BR_ACCESS_003 conditions are met."""
        async with database.async_session_scope() as session:
            repo = repo_module.IdentityRepository(session)
            license_repo = repo_module.EnterpriseLicenseRepository(session)
            org_repo = repo_module.OrganizationRepository(session)

            user = await repo.get_by_id(user_id)
            if not user or not user.enterprise_seat_key:
                if current_user is not None and not current_user.is_admin:
                    org_details = await org_repo.list_user_organization_details(
                        current_user.id
                    )
                    has_owner_org = any(
                        "OWNER" in str(d.get("role_in_org", "")).upper()
                        for d in org_details
                    )
                    if not has_owner_org:
                        raise PermissionError(
                            "Yêu cầu quyền Quản trị viên hoặc Chủ sở hữu Tổ chức để thu hồi suất học."
                        )
                return False, "Người dùng chưa được gán mã Enterprise Seat"

            license_entity = await license_repo.get_by_key(user.enterprise_seat_key)
            if current_user is not None and not current_user.is_admin:
                if not license_entity or not license_entity.organization_id:
                    raise PermissionError(
                        "Yêu cầu quyền Quản trị viên hệ thống đối với mã Seat không gắn Tổ chức."
                    )
                await enforce_strict_organization_permission(
                    session,
                    current_user,
                    license_entity.organization_id,
                    required_permission=OrgPermission.MANAGE_MEMBERS,
                )

            max_progress = 0.0
            if self.learning_repo_factory is not None:
                learning_repo = self.learning_repo_factory(session)
                if course_id:
                    progress = await learning_repo.get_progress(user_id, course_id)
                    max_progress = (
                        float(progress.overall_progress_percent) if progress else 0.0
                    )
                else:
                    summaries = await learning_repo.get_user_progress_summaries(
                        [user_id]
                    )
                    max_progress = summaries.get(user_id, (0, 0.0))[1]

            eligibility = EnterpriseLicense.evaluate_revocation_eligibility(
                seat_assigned_at=user.seat_assigned_at,
                max_progress_percent=max_progress,
                now=datetime.now(UTC),
            )
            if not eligibility.can_revoke:
                logger.warning(
                    "Cannot revoke seat %s from user %s: %s",
                    user.enterprise_seat_key,
                    user_id,
                    eligibility.reason,
                )
                return False, eligibility.reason

            seat_key = user.enterprise_seat_key
            user.enterprise_seat_key = None
            user.seat_assigned_at = None
            await repo.save(user)

            # BR_ACCESS_003: Atomic DB update for recycling enterprise seats
            if seat_key:
                await license_repo.decrement_enterprise_seat(seat_key)

            logger.info(
                "Successfully revoked enterprise seat %s from user %s",
                seat_key,
                user_id,
            )
            return True, f"Đã thu hồi suất học Enterprise Key '{seat_key}' thành công!"
