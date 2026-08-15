import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from uuid6 import uuid7

from src.modules.catalog.domain import ICatalogRepository
from src.modules.identity.domain import (
    DEFAULT_INVITATION_EXPIRATION_DAYS,
    Invitation,
    InvitationSentDomainEvent,
    InvitationStatus,
    InvitationType,
    UserRole,
    hash_invitation_token,
)
from src.modules.identity.infrastructure import repository as repo_module
from src.shared import permissions
from src.shared.auth import (
    CurrentUser,
)
from src.shared.infrastructure import database
from src.shared.infrastructure.event_bus import EventBus
from src.shared.permissions import (
    OrgPermission,
    OrgRole,
)

logger = logging.getLogger(__name__)


def _default_catalog_repo_factory(session: Any) -> ICatalogRepository:
    from src.modules.catalog.infrastructure.repository import (
        SQLAlchemyCatalogRepository,
    )

    return SQLAlchemyCatalogRepository(session)


class InvitationUseCase:
    def __init__(
        self,
        catalog_repo_factory: Callable[[Any], ICatalogRepository] | None = None,
    ) -> None:
        self.catalog_repo_factory = (
            catalog_repo_factory or _default_catalog_repo_factory
        )

    async def _resolve_target_org_id(
        self,
        org_repo: Any,
        user: CurrentUser | None,
        organization_id: str,
    ) -> str:
        clean_org_id = (organization_id or "").strip()
        if clean_org_id:
            org = await org_repo.get_organization_by_id(clean_org_id)
            if org:
                return org.id
            return clean_org_id
        if user:
            user_orgs = await org_repo.list_user_organizations(user.id)
            if user_orgs:
                return user_orgs[0].id
        return ""

    async def _verify_org_admin_permission(
        self,
        session: Any,
        user: CurrentUser | None,
        organization_id: str,
    ) -> None:
        await permissions.enforce_organization_permission(
            session,
            user,
            organization_id,
            required_permission=OrgPermission.MANAGE_MEMBERS,
        )

    def _invitation_to_dict(self, inv: Invitation) -> dict:
        type_str = inv.type.value if hasattr(inv.type, "value") else str(inv.type)
        status_str = (
            inv.status.value if hasattr(inv.status, "value") else str(inv.status)
        )
        return {
            "id": inv.id,
            "type": type_str,
            "status": status_str,
            "inviter_id": inv.inviter_id,
            "inviter_name": inv.inviter_name,
            "inviter_email": inv.inviter_email,
            "invitee_email": inv.invitee_email,
            "invitee_id": inv.invitee_id or "",
            "target_id": inv.target_id,
            "target_name": inv.target_name,
            "role_id": inv.role_id,
            "token": "",
            "message": inv.message,
            "expires_at": inv.expires_at,
            "created_at": inv.created_at,
            "responded_at": inv.responded_at,
        }

    async def create_invitation(
        self,
        invitation_type: str,
        invitee_email: str,
        target_id: str,
        target_name: str = "",
        role_id: str = "",
        message: str = "",
        current_user: CurrentUser | None = None,
    ) -> dict:
        if not current_user:
            raise PermissionError("Yêu cầu đăng nhập để gửi lời mời.")

        invitee_email_clean = invitee_email.strip().lower()
        if not invitee_email_clean:
            raise ValueError("Email người nhận không được để trống.")

        async with database.async_session_scope() as session:
            inv_repo = repo_module.InvitationRepository(session)
            org_repo = repo_module.OrganizationRepository(session)
            user_repo = repo_module.IdentityRepository(session)

            inviter = await user_repo.get_by_id(current_user.id)
            inviter_id = current_user.id
            inviter_name = inviter.full_name if inviter else current_user.full_name
            inviter_email = inviter.email if inviter else current_user.email

            type_str = str(invitation_type).upper()
            if "ORGANIZATION" in type_str or type_str == "1":
                clean_role = (role_id or "INSTRUCTOR").upper().strip()
                valid_org_roles = [r.value for r in OrgRole]
                if clean_role not in valid_org_roles and clean_role != "ORG_OWNER":
                    raise ValueError(
                        f"Vai trò '{role_id}' không thuộc danh sách vai trò hợp lệ của Tổ chức ({', '.join(valid_org_roles)})."
                    )
                if clean_role in [OrgRole.OWNER.value, "ORG_OWNER"]:
                    raise PermissionError(
                        "Không thể gửi lời mời trực tiếp cho vai trò Chủ sở hữu Tổ chức (OWNER)."
                    )
                type_enum = InvitationType.ORGANIZATION_MEMBER
                target_org_id = await self._resolve_target_org_id(
                    org_repo, current_user, target_id
                )
                await self._verify_org_admin_permission(
                    session, current_user, target_org_id
                )
                if not target_name:
                    org = await org_repo.get_organization_by_id(target_org_id)
                    target_name = org.name if org else "Tổ chức"
                target_id = target_org_id
            elif "COURSE" in type_str or "CO_INSTRUCTOR" in type_str or type_str == "2":
                if role_id in ["COURSE_OWNER", "OWNER"]:
                    raise PermissionError(
                        "Không thể gửi lời mời cho vai trò Chủ sở hữu Khóa học."
                    )
                type_enum = InvitationType.COURSE_CO_INSTRUCTOR
                if not target_id:
                    raise ValueError("Thiếu ID khóa học (target_id).")

                cat_repo = self.catalog_repo_factory(session)
                course = await cat_repo.get_course_detail(target_id)
                if (
                    not course
                    or (
                        course.owner_id != current_user.id
                        and current_user.id
                        not in getattr(course, "co_instructor_ids", [])
                    )
                ) and current_user.role not in [
                    UserRole.ADMIN.value,
                    UserRole.ADMIN,
                    "ADMIN",
                ]:
                    raise PermissionError(
                        "Bạn không có quyền mời giảng viên cho khóa học này."
                    )
                if not target_name:
                    target_name = course.title if course else f"Khóa học {target_id}"
            elif "ENTERPRISE" in type_str or "SEAT" in type_str or type_str == "3":
                if current_user.role not in [
                    UserRole.ADMIN.value,
                    UserRole.ADMIN,
                    "ADMIN",
                ]:
                    raise PermissionError(
                        "Chỉ Quản trị viên mới có quyền gửi lời mời Suất học Doanh nghiệp."
                    )
                type_enum = InvitationType.ENTERPRISE_SEAT
                if not target_name:
                    target_name = "Suất học Doanh nghiệp"
            else:
                type_enum = InvitationType.ORGANIZATION_MEMBER

            invitee_user = await user_repo.get_by_email(invitee_email_clean)
            invitee_id = invitee_user.id if invitee_user else None

            # Check if user is already an active member of the organization
            if invitee_user and type_enum == InvitationType.ORGANIZATION_MEMBER:
                existing_member = await org_repo.get_member(invitee_user.id, target_id)
                if existing_member and existing_member.status == "ACTIVE":
                    raise ValueError(
                        f"Người dùng '{invitee_email_clean}' đã là thành viên của Tổ chức này."
                    )

            # Check if a PENDING invitation already exists for this email and target
            existing_invite = await inv_repo.find_pending_invitation(
                invitee_email_clean, target_id, type_enum.value
            )
            if existing_invite and isinstance(existing_invite, Invitation):
                raise ValueError(
                    f"Đã có một lời mời đang chờ phản hồi (PENDING) gửi tới '{invitee_email_clean}' cho Tổ chức này."
                )

            raw_token = f"inv_tok_{uuid7().hex}"
            token_hash = hash_invitation_token(raw_token)
            now_dt = datetime.now(UTC)
            expires_dt = now_dt + timedelta(days=DEFAULT_INVITATION_EXPIRATION_DAYS)

            inv = Invitation(
                id=f"inv_{uuid7().hex[:12]}",
                type=type_enum,
                status=InvitationStatus.PENDING,
                inviter_id=inviter_id,
                inviter_name=inviter_name,
                inviter_email=inviter_email,
                invitee_email=invitee_email_clean,
                invitee_id=invitee_id,
                target_id=target_id,
                target_name=target_name,
                role_id=role_id,
                token_hash=token_hash,
                message=message,
                expires_at=expires_dt.isoformat(),
                created_at=now_dt.isoformat(),
            )

            saved = await inv_repo.save(inv)

            if invitee_id:
                await EventBus.publish(
                    InvitationSentDomainEvent(
                        invitation_id=saved.id,
                        email=invitee_email_clean,
                        organization_id=target_id,
                        role=role_id,
                        invited_by=current_user.id if current_user else "",
                        invitee_id=invitee_id,
                        target_name=target_name,
                        inviter_name=inviter_name,
                        raw_token=raw_token,
                        actor_avatar_url=getattr(current_user, "avatar_url", "") or "",
                    )
                )

            res_dict = self._invitation_to_dict(saved)
            res_dict["token"] = raw_token
            return res_dict

    async def list_sent_invitations(
        self,
        invitation_type: str = "",
        target_id: str = "",
        current_user: CurrentUser | None = None,
    ) -> list[dict]:
        if not current_user:
            return []
        async with database.async_session_scope() as session:
            inv_repo = repo_module.InvitationRepository(session)
            org_repo = repo_module.OrganizationRepository(session)
            clean_target_id = (target_id or "").strip()
            if clean_target_id:
                resolved_id = await self._resolve_target_org_id(
                    org_repo, current_user, clean_target_id
                )
                clean_target_id = resolved_id or clean_target_id
            invs = await inv_repo.list_sent_invitations(
                inviter_id=current_user.id,
                inv_type=invitation_type,
                target_id=clean_target_id,
            )
            return [self._invitation_to_dict(i) for i in invs]

    async def list_my_invitations(
        self,
        status_filter: str = "",
        current_user: CurrentUser | None = None,
    ) -> list[dict]:
        if not current_user or not current_user.email:
            return []
        async with database.async_session_scope() as session:
            inv_repo = repo_module.InvitationRepository(session)
            invs = await inv_repo.list_my_invitations(
                email=current_user.email.lower(),
                user_id=current_user.id,
                status_filter=status_filter,
            )
            return [self._invitation_to_dict(i) for i in invs]

    async def get_invitation_by_token(self, token: str) -> dict:
        if not token:
            raise ValueError("Token không hợp lệ.")
        token_hash = hash_invitation_token(token)
        async with database.async_session_scope() as session:
            inv_repo = repo_module.InvitationRepository(session)
            inv = await inv_repo.get_by_token_hash(token_hash)
            if not inv:
                raise ValueError("Lời mời không tồn tại hoặc đã hết hạn.")

            if inv.status == InvitationStatus.PENDING and inv.expires_at:
                try:
                    exp_dt = datetime.fromisoformat(inv.expires_at)
                    if datetime.now(UTC) > exp_dt:
                        inv.status = InvitationStatus.EXPIRED
                        await inv_repo.save(inv)
                except Exception:  # noqa: BLE001, S110
                    pass

            return self._invitation_to_dict(inv)

    async def respond_to_invitation(
        self,
        invitation_id: str,
        action: str,
        token: str = "",
        current_user: CurrentUser | None = None,
    ) -> tuple[dict, bool, str]:
        if not current_user:
            raise PermissionError("Yêu cầu đăng nhập để phản hồi lời mời.")
        async with database.async_session_scope() as session:
            inv_repo = repo_module.InvitationRepository(session)
            inv: Invitation | None = None
            if invitation_id:
                inv = await inv_repo.get_by_id(invitation_id)
            if not inv and token:
                token_hash = hash_invitation_token(token)
                inv = await inv_repo.get_by_token_hash(token_hash)

            if not inv:
                return {}, False, "Lời mời không tồn tại."

            if inv.invitee_email.lower() != current_user.email.lower():
                return (
                    self._invitation_to_dict(inv),
                    False,
                    "Bạn không phải người nhận của lời mời này.",
                )

            if inv.status != InvitationStatus.PENDING:
                return (
                    self._invitation_to_dict(inv),
                    False,
                    f"Lời mời đã ở trạng thái {inv.status}.",
                )

            if inv.expires_at:
                try:
                    exp_dt = datetime.fromisoformat(inv.expires_at)
                    if datetime.now(UTC) > exp_dt:
                        inv.status = InvitationStatus.EXPIRED
                        await inv_repo.save(inv)
                        return (
                            self._invitation_to_dict(inv),
                            False,
                            "Lời mời đã hết hạn.",
                        )
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "Failed to parse invitation expiration date %s: %s",
                        inv.expires_at,
                        exc,
                    )

            now_str = datetime.now(UTC).isoformat()
            act_str = str(action).upper()

            if "DECLINE" in act_str:
                inv.status = InvitationStatus.DECLINED
                inv.responded_at = now_str
                saved = await inv_repo.save(inv)
                return self._invitation_to_dict(saved), True, "Đã từ chối lời mời."
            if "ACCEPT" in act_str:
                inv.status = InvitationStatus.ACCEPTED
                inv.responded_at = now_str
                inv.invitee_id = current_user.id
            else:
                return (
                    self._invitation_to_dict(inv),
                    False,
                    "Hành động phản hồi không hợp lệ.",
                )

            inv_type_str = (
                inv.type.value if hasattr(inv.type, "value") else str(inv.type)
            )

            if "ORGANIZATION" in inv_type_str:
                org_repo = repo_module.OrganizationRepository(session)
                await org_repo.add_member(
                    user_id=current_user.id,
                    org_id=inv.target_id,
                    role_id=inv.role_id or "MEMBER",
                    status="ACTIVE",
                )
                await org_repo.create_audit_log(
                    org_id=inv.target_id,
                    actor_id=inv.inviter_id or current_user.id,
                    target_user_id=current_user.id,
                    action="ORGANIZATION_AUDIT_ACTION_MEMBER_JOINED",
                    details=f"Gia nhập với vai trò {inv.role_id or 'MEMBER'} qua lời mời.",
                )
            elif "COURSE" in inv_type_str or "CO_INSTRUCTOR" in inv_type_str:
                cat_repo = self.catalog_repo_factory(session)
                await cat_repo.add_course_collaborator(
                    course_id=inv.target_id,
                    user_id=current_user.id,
                    role=inv.role_id or "co_instructor",
                )
                await cat_repo.create_audit_log(
                    course_id=inv.target_id,
                    actor_id=inv.inviter_id or current_user.id,
                    target_user_id=current_user.id,
                    action="COURSE_AUDIT_ACTION_COLLABORATOR_JOINED",
                    details=f"Gia nhập đội ngũ giảng dạy với vai trò {(inv.role_id or 'co_instructor').upper()} qua lời mời.",
                )
            elif "ENTERPRISE" in inv_type_str or "SEAT" in inv_type_str:
                lic_key = inv.target_id
                license_repo = repo_module.EnterpriseLicenseRepository(session)
                license_entity = await license_repo.get_by_key(lic_key)
                if not license_entity or not license_entity.is_active:
                    return (
                        self._invitation_to_dict(inv),
                        False,
                        "Mã Suất học Doanh nghiệp không tồn tại hoặc đã bị vô hiệu hóa.",
                    )
                if license_entity.used_seats >= license_entity.total_seats:
                    return (
                        self._invitation_to_dict(inv),
                        False,
                        "Mã Suất học Doanh nghiệp đã hết số lượng khả dụng.",
                    )

                user_repo = repo_module.IdentityRepository(session)
                user = await user_repo.get_by_id(current_user.id)
                if user and user.enterprise_seat_key != lic_key:
                    success = await license_repo.increment_enterprise_seat(lic_key)
                    if not success:
                        return (
                            self._invitation_to_dict(inv),
                            False,
                            "Mã Suất học Doanh nghiệp đã hết số lượng khả dụng.",
                        )
                    user.enterprise_seat_key = lic_key
                    user.seat_assigned_at = now_str
                    await user_repo.save(user)

            saved = await inv_repo.save(inv)
            return (
                self._invitation_to_dict(saved),
                True,
                "Đã chấp nhận lời mời thành công!",
            )

    async def cancel_invitation(
        self,
        invitation_id: str,
        current_user: CurrentUser | None = None,
    ) -> bool:
        if not current_user:
            raise PermissionError("Yêu cầu đăng nhập.")
        async with database.async_session_scope() as session:
            inv_repo = repo_module.InvitationRepository(session)
            inv = await inv_repo.get_by_id(invitation_id)
            if not inv:
                return False
            if inv.inviter_id != current_user.id and not current_user.is_admin:
                raise PermissionError(
                    "Chỉ người gửi lời mời hoặc Admin mới được phép hủy lời mời này."
                )
            inv.status = InvitationStatus.CANCELLED
            await inv_repo.save(inv)
            return True
