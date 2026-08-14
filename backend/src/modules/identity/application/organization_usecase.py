import logging
from typing import Any

from src.modules.identity.infrastructure import repository as repo_module
from src.shared import permissions
from src.shared.auth import (
    CurrentUser,
)
from src.shared.infrastructure import database
from src.shared.permissions import (
    OrgPermission,
    OrgRole,
)

logger = logging.getLogger(__name__)


class OrganizationUseCase:
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

    async def add_organization_member(
        self,
        email: str,
        role_id: str,
        organization_id: str,
        current_user: CurrentUser | None = None,
    ) -> dict:
        async with database.async_session_scope() as session:
            identity_repo = repo_module.IdentityRepository(session)
            org_repo = repo_module.OrganizationRepository(session)
            target_org_id = await self._resolve_target_org_id(
                org_repo, current_user, organization_id
            )
            await self._verify_org_admin_permission(
                session, current_user, target_org_id
            )

            target_user = await identity_repo.get_by_email(email.strip())
            if not target_user:
                raise ValueError(f"Không tìm thấy người dùng với email '{email}'")

            target_role = (
                role_id.strip()
                if role_id and role_id.strip()
                else OrgRole.INSTRUCTOR.value
            )

            member = await org_repo.add_member(
                user_id=target_user.id,
                org_id=target_org_id,
                role_id=target_role,
                status="ACTIVE",
            )
            members = await org_repo.list_members_with_details(target_org_id)
            for m in members:
                if m["user_id"] == target_user.id:
                    return m
            return {
                "member_id": member.id,
                "user_id": target_user.id,
                "email": target_user.email,
                "full_name": target_user.full_name,
                "avatar_url": target_user.avatar_url or "",
                "role_id": member.role_id,
                "role_name": member.role_id,
                "status": member.status,
                "joined_at": member.joined_at or "",
            }

    async def list_organization_members(
        self, organization_id: str, current_user: CurrentUser | None = None
    ) -> list[dict]:
        async with database.async_session_scope() as session:
            org_repo = repo_module.OrganizationRepository(session)
            target_org_id = await self._resolve_target_org_id(
                org_repo, current_user, organization_id
            )
            if current_user and not current_user.is_admin:
                member = await org_repo.get_member(current_user.id, target_org_id)
                user_orgs = await org_repo.list_user_organizations(current_user.id)
                if not member and not user_orgs:
                    # Non-org member returning empty list cleanly for UI
                    return []
            return await org_repo.list_members_with_details(target_org_id)

    async def remove_organization_member(
        self,
        user_id: str,
        organization_id: str,
        current_user: CurrentUser | None = None,
    ) -> bool:
        if not current_user:
            raise PermissionError("Yêu cầu đăng nhập.")

        async with database.async_session_scope() as session:
            org_repo = repo_module.OrganizationRepository(session)
            target_org_id = await self._resolve_target_org_id(
                org_repo, current_user, organization_id
            )

            target_member = await org_repo.get_member(user_id, target_org_id)
            if not target_member:
                return True

            is_self = user_id == current_user.id
            target_role = (target_member.role_id or "").upper()

            if is_self:
                if "OWNER" in target_role and not current_user.is_admin:
                    raise PermissionError(
                        "Chủ sở hữu duy nhất không thể tự rời Tổ chức. Vui lòng chuyển nhượng quyền sở hữu trước."
                    )
            else:
                await self._verify_org_admin_permission(
                    session, current_user, target_org_id
                )
                if "OWNER" in target_role and not current_user.is_admin:
                    raise PermissionError(
                        "Không thể xóa tài khoản Chủ sở hữu (ORG_OWNER) khỏi Tổ chức."
                    )

            action_type = (
                "ORGANIZATION_AUDIT_ACTION_MEMBER_LEFT"
                if is_self
                else "ORGANIZATION_AUDIT_ACTION_MEMBER_KICKED"
            )
            details_text = (
                "Thành viên tự nguyện rời khỏi Tổ chức."
                if is_self
                else f"Loại khỏi Tổ chức bởi {current_user.full_name or current_user.email}."
            )

            res = await org_repo.remove_member(user_id=user_id, org_id=target_org_id)
            if res:
                await org_repo.create_audit_log(
                    org_id=target_org_id,
                    actor_id=current_user.id,
                    target_user_id=user_id,
                    action=action_type,
                    details=details_text,
                )
            return res

    async def list_organization_audit_logs(
        self, organization_id: str, current_user: CurrentUser
    ) -> list[dict]:
        async with database.async_session_scope() as session:
            org_repo = repo_module.OrganizationRepository(session)
            target_org_id = await self._resolve_target_org_id(
                org_repo, current_user, organization_id
            )
            await self._verify_org_admin_permission(
                session, current_user, target_org_id
            )
            return await org_repo.list_audit_logs(target_org_id)

    async def list_my_organizations(
        self, current_user: CurrentUser
    ) -> list[dict[str, Any]]:
        async with database.async_session_scope() as session:
            org_repo = repo_module.OrganizationRepository(session)
            return await org_repo.list_user_organization_details(current_user.id)
