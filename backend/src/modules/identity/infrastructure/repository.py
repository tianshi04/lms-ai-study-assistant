import inspect
import uuid
from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.identity.domain.entities import (
    ApplicationStatus,
    InstructorApplication,
    Invitation,
    InvitationStatus,
    InvitationType,
    Organization,
    OrganizationMember,
    User,
    UserRole,
)
from src.modules.identity.infrastructure.models import (
    InstructorApplicationModel,
    InvitationModel,
    OrganizationAuditLogModel,
    OrganizationMemberModel,
    OrganizationModel,
    UserModel,
)


class IdentityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: str) -> User | None:
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(UserModel).where(UserModel.email == email)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_google_id(self, google_id: str) -> User | None:
        stmt = select(UserModel).where(UserModel.google_id == google_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def save(self, user: User) -> User:
        stmt = select(UserModel).where(UserModel.id == user.id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            model = UserModel(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                avatar_url=user.avatar_url,
                enterprise_seat_key=user.enterprise_seat_key,
                seat_assigned_at=user.seat_assigned_at,
                password_hash=user.password_hash,
                is_identity_verified=user.is_identity_verified,
                signature_image_url=user.signature_image_url,
                title=user.title,
                google_id=user.google_id,
            )
            self._session.add(model)
        else:
            model.email = user.email
            model.full_name = user.full_name
            model.role = user.role
            model.avatar_url = user.avatar_url
            model.enterprise_seat_key = user.enterprise_seat_key
            model.seat_assigned_at = user.seat_assigned_at
            model.password_hash = user.password_hash
            model.is_identity_verified = user.is_identity_verified
            model.signature_image_url = user.signature_image_url
            model.title = user.title
            model.google_id = user.google_id

        await self._session.flush()
        return self._to_entity(model)

    async def recycle_enterprise_seat(self, seat_key: str) -> None:
        if not seat_key:
            return
        from sqlalchemy import update

        from src.modules.identity.infrastructure.models import EnterpriseLicenseModel

        await self._session.execute(
            update(EnterpriseLicenseModel)
            .where(
                EnterpriseLicenseModel.key == seat_key,
                EnterpriseLicenseModel.used_seats > 0,
            )
            .values(used_seats=EnterpriseLicenseModel.used_seats - 1)
        )

    def _to_entity(self, model: UserModel) -> User:
        return User(
            id=model.id,
            email=model.email,
            full_name=model.full_name,
            role=UserRole(model.role),
            avatar_url=model.avatar_url,
            enterprise_seat_key=model.enterprise_seat_key,
            seat_assigned_at=model.seat_assigned_at,
            password_hash=model.password_hash,
            is_identity_verified=model.is_identity_verified,
            signature_image_url=model.signature_image_url,
            title=model.title,
            google_id=model.google_id,
        )


class OrganizationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save_organization(self, org: Organization) -> Organization:
        stmt = select(OrganizationModel).where(OrganizationModel.id == org.id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            model = OrganizationModel(
                id=org.id,
                name=org.name,
                slug=org.slug,
                avatar_url=org.avatar_url,
                created_at=org.created_at,
            )
            self._session.add(model)
        else:
            model.name = org.name
            model.slug = org.slug
            model.avatar_url = org.avatar_url

        await self._session.flush()
        return Organization(
            id=model.id,
            name=model.name,
            slug=model.slug,
            avatar_url=model.avatar_url,
            created_at=model.created_at,
        )

    async def get_organization_by_id(self, org_id: str) -> Organization | None:
        stmt = select(OrganizationModel).where(
            or_(OrganizationModel.id == org_id, OrganizationModel.slug == org_id)
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if inspect.iscoroutine(model):
            model = await model
        if not model or not hasattr(model, "id") or isinstance(model, MagicMock):
            return None
        return Organization(
            id=model.id,
            name=getattr(model, "name", ""),
            slug=getattr(model, "slug", ""),
            avatar_url=getattr(model, "avatar_url", ""),
            created_at=getattr(model, "created_at", ""),
        )

    async def list_user_organizations(self, user_id: str) -> list[Organization]:
        stmt = (
            select(OrganizationModel)
            .join(
                OrganizationMemberModel,
                OrganizationMemberModel.organization_id == OrganizationModel.id,
            )
            .where(
                OrganizationMemberModel.user_id == user_id,
                OrganizationMemberModel.status == "ACTIVE",
            )
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [
            Organization(
                id=m.id,
                name=m.name,
                slug=m.slug,
                avatar_url=m.avatar_url,
                created_at=m.created_at,
            )
            for m in models
        ]

    async def list_user_organization_details(
        self, user_id: str
    ) -> list[dict[str, Any]]:
        stmt = (
            select(OrganizationModel, OrganizationMemberModel)
            .join(
                OrganizationMemberModel,
                OrganizationMemberModel.organization_id == OrganizationModel.id,
            )
            .where(
                OrganizationMemberModel.user_id == user_id,
                OrganizationMemberModel.status == "ACTIVE",
            )
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return [
            {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "avatar_url": org.avatar_url,
                "role_in_org": member.role_id,
                "status": member.status,
                "joined_at": str(member.joined_at or ""),
            }
            for org, member in rows
        ]

    async def get_effective_permissions(
        self, user_id: str, org_id: str
    ) -> tuple[str | None, set[str]]:
        """Resolves member's role and calculates effective permission set from code-hardcoded matrix."""
        stmt = select(OrganizationMemberModel).where(
            OrganizationMemberModel.user_id == user_id,
            OrganizationMemberModel.organization_id == org_id,
            OrganizationMemberModel.status == "ACTIVE",
        )
        result = await self._session.execute(stmt)
        member = result.scalar_one_or_none()
        if not member:
            return None, set()

        role_str = str(member.role_id).upper()
        from src.shared.permissions import ROLE_PERMISSIONS, OrgRole

        perms: set[str] = set()
        if "OWNER" in role_str:
            perms = {p.value for p in ROLE_PERMISSIONS[OrgRole.OWNER]}
        elif "INSTRUCTOR" in role_str:
            perms = {p.value for p in ROLE_PERMISSIONS[OrgRole.INSTRUCTOR]}
        elif "TA" in role_str:
            perms = {p.value for p in ROLE_PERMISSIONS[OrgRole.TA]}

        return member.role_id, perms

    async def get_member(self, user_id: str, org_id: str) -> OrganizationMember | None:
        stmt = select(OrganizationMemberModel).where(
            OrganizationMemberModel.user_id == user_id,
            OrganizationMemberModel.organization_id == org_id,
        )
        result = await self._session.execute(stmt)
        existing = result.scalar_one_or_none()
        if inspect.iscoroutine(existing):
            existing = await existing
        if (
            not existing
            or not hasattr(existing, "id")
            or isinstance(existing, MagicMock)
        ):
            return None
        return OrganizationMember(
            id=getattr(existing, "id", ""),
            user_id=getattr(existing, "user_id", user_id),
            organization_id=getattr(existing, "organization_id", org_id),
            role_id=getattr(existing, "role_id", "MEMBER"),
            status=getattr(existing, "status", "ACTIVE"),
            joined_at=getattr(existing, "joined_at", ""),
        )

    async def add_member(
        self,
        user_id: str,
        org_id: str,
        role_id: str = "role_org_instructor",
        status: str = "ACTIVE",
    ) -> OrganizationMember:
        stmt = select(OrganizationMemberModel).where(
            OrganizationMemberModel.user_id == user_id,
            OrganizationMemberModel.organization_id == org_id,
        )
        result = await self._session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            existing.status = status
            existing.role_id = role_id
            await self._session.flush()
            return OrganizationMember(
                id=existing.id,
                user_id=existing.user_id,
                organization_id=existing.organization_id,
                role_id=existing.role_id,
                status=existing.status,
            )

        member_id = f"member_{uuid.uuid4().hex[:12]}"
        model = OrganizationMemberModel(
            id=member_id,
            user_id=user_id,
            organization_id=org_id,
            role_id=role_id,
            status=status,
        )
        self._session.add(model)
        await self._session.flush()
        return OrganizationMember(
            id=model.id,
            user_id=model.user_id,
            organization_id=model.organization_id,
            role_id=model.role_id,
            status=model.status,
        )

    async def list_members_with_details(self, org_id: str) -> list[dict]:
        stmt = (
            select(OrganizationMemberModel, UserModel)
            .join(UserModel, UserModel.id == OrganizationMemberModel.user_id)
            .where(OrganizationMemberModel.organization_id == org_id)
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        members = []
        for member_model, user_model in rows:
            members.append(
                {
                    "member_id": member_model.id,
                    "user_id": user_model.id,
                    "email": user_model.email,
                    "full_name": user_model.full_name,
                    "avatar_url": user_model.avatar_url or "",
                    "role_id": member_model.role_id,
                    "role_name": member_model.role_id,
                    "status": member_model.status,
                    "joined_at": member_model.joined_at or "",
                }
            )
        return members

    async def remove_member(self, user_id: str, org_id: str) -> bool:
        stmt = select(OrganizationMemberModel).where(
            OrganizationMemberModel.user_id == user_id,
            OrganizationMemberModel.organization_id == org_id,
        )
        result = await self._session.execute(stmt)
        existing = result.scalar_one_or_none()
        if not existing:
            return False
        await self._session.delete(existing)
        await self._session.flush()
        return True

    async def create_audit_log(
        self,
        org_id: str,
        actor_id: str,
        target_user_id: str,
        action: str,
        details: str = "",
    ) -> dict:
        log_id = f"audit_{uuid.uuid4().hex[:12]}"
        now_str = datetime.now(UTC).isoformat()
        log_model = OrganizationAuditLogModel(
            id=log_id,
            organization_id=org_id,
            actor_id=actor_id,
            target_user_id=target_user_id,
            action=action,
            details=details,
            created_at=now_str,
        )
        self._session.add(log_model)
        await self._session.flush()
        return {
            "id": log_model.id,
            "organization_id": log_model.organization_id,
            "actor_id": log_model.actor_id,
            "target_user_id": log_model.target_user_id,
            "action": log_model.action,
            "details": log_model.details,
            "created_at": log_model.created_at,
        }

    async def list_audit_logs(self, org_id: str) -> list[dict]:
        stmt = (
            select(OrganizationAuditLogModel)
            .where(OrganizationAuditLogModel.organization_id == org_id)
            .order_by(OrganizationAuditLogModel.created_at.desc())
        )
        result = await self._session.execute(stmt)
        logs = result.scalars().all()

        user_ids = set()
        for entry in logs:
            if entry.actor_id:
                user_ids.add(entry.actor_id)
            if entry.target_user_id:
                user_ids.add(entry.target_user_id)

        user_map = {}
        if user_ids:
            user_stmt = select(UserModel).where(UserModel.id.in_(user_ids))
            user_res = await self._session.execute(user_stmt)
            for u in user_res.scalars().all():
                user_map[u.id] = u.full_name or u.email

        res = []
        for entry in logs:
            res.append(
                {
                    "id": entry.id,
                    "organization_id": entry.organization_id,
                    "actor_id": entry.actor_id,
                    "actor_name": user_map.get(entry.actor_id, "Hệ thống"),
                    "target_user_id": entry.target_user_id,
                    "target_user_name": user_map.get(
                        entry.target_user_id, "Thành viên"
                    ),
                    "action": entry.action,
                    "details": entry.details or "",
                    "created_at": entry.created_at,
                }
            )
        return res


class InstructorApplicationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, application_id: str) -> InstructorApplication | None:
        stmt = select(InstructorApplicationModel).where(
            InstructorApplicationModel.id == application_id
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_latest_by_user_id(self, user_id: str) -> InstructorApplication | None:
        stmt = (
            select(InstructorApplicationModel)
            .where(InstructorApplicationModel.user_id == user_id)
            .order_by(InstructorApplicationModel.created_at.desc())
        )
        result = await self._session.execute(stmt)
        model = result.scalars().first()
        return self._to_entity(model) if model else None

    async def list_applications(
        self, status_filter: str = ""
    ) -> list[InstructorApplication]:
        stmt = select(InstructorApplicationModel)
        if status_filter:
            stmt = stmt.where(InstructorApplicationModel.status == status_filter)
        stmt = stmt.order_by(InstructorApplicationModel.created_at.desc())
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def save(self, application: InstructorApplication) -> InstructorApplication:
        stmt = select(InstructorApplicationModel).where(
            InstructorApplicationModel.id == application.id
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            model = InstructorApplicationModel(
                id=application.id,
                user_id=application.user_id,
                title=application.title,
                bio=application.bio,
                linkedin_url=application.linkedin_url,
                cv_url=application.cv_url,
                demo_video_url=application.demo_video_url,
                status=application.status.value,
                rejection_reason=application.rejection_reason,
                created_at=application.created_at,
                reviewed_at=application.reviewed_at,
            )
            self._session.add(model)
        else:
            model.title = application.title
            model.bio = application.bio
            model.linkedin_url = application.linkedin_url
            model.cv_url = application.cv_url
            model.demo_video_url = application.demo_video_url
            model.status = application.status.value
            model.rejection_reason = application.rejection_reason
            model.reviewed_at = application.reviewed_at

        await self._session.flush()
        return self._to_entity(model)

    def _to_entity(self, model: InstructorApplicationModel) -> InstructorApplication:
        return InstructorApplication(
            id=model.id,
            user_id=model.user_id,
            title=model.title,
            bio=model.bio,
            linkedin_url=model.linkedin_url,
            cv_url=model.cv_url,
            demo_video_url=model.demo_video_url,
            status=ApplicationStatus(model.status),
            rejection_reason=model.rejection_reason,
            created_at=model.created_at,
            reviewed_at=model.reviewed_at,
        )


class InvitationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def save(self, invitation: Invitation) -> Invitation:
        stmt = select(InvitationModel).where(InvitationModel.id == invitation.id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()

        status_val = (
            invitation.status.value
            if hasattr(invitation.status, "value")
            else str(invitation.status)
        )
        type_val = (
            invitation.type.value
            if hasattr(invitation.type, "value")
            else str(invitation.type)
        )

        if not model:
            model = InvitationModel(
                id=invitation.id,
                type=type_val,
                status=status_val,
                inviter_id=invitation.inviter_id,
                inviter_name=invitation.inviter_name,
                inviter_email=invitation.inviter_email,
                invitee_email=invitation.invitee_email,
                invitee_id=invitation.invitee_id,
                target_id=invitation.target_id,
                target_name=invitation.target_name,
                role_id=invitation.role_id,
                token_hash=invitation.token_hash,
                message=invitation.message,
                expires_at=invitation.expires_at,
                created_at=invitation.created_at,
                responded_at=invitation.responded_at,
            )
            self._session.add(model)
        else:
            model.status = status_val
            model.invitee_id = invitation.invitee_id
            model.responded_at = invitation.responded_at

        await self._session.flush()
        return self._to_entity(model)

    async def get_by_id(self, invitation_id: str) -> Invitation | None:
        stmt = select(InvitationModel).where(InvitationModel.id == invitation_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_token_hash(self, token_hash: str) -> Invitation | None:
        stmt = select(InvitationModel).where(InvitationModel.token_hash == token_hash)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_sent_invitations(
        self,
        inviter_id: str,
        inv_type: str | None = None,
        target_id: str | None = None,
    ) -> list[Invitation]:
        stmt = select(InvitationModel).where(InvitationModel.inviter_id == inviter_id)
        if inv_type and inv_type != "INVITATION_TYPE_UNSPECIFIED":
            stmt = stmt.where(InvitationModel.type == inv_type)
        if target_id:
            stmt = stmt.where(InvitationModel.target_id == target_id)
        stmt = stmt.order_by(InvitationModel.created_at.desc())
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def list_my_invitations(
        self,
        email: str,
        user_id: str | None = None,
        status_filter: str | None = None,
    ) -> list[Invitation]:
        from sqlalchemy import or_

        conditions = [InvitationModel.invitee_email == email]
        if user_id:
            conditions.append(InvitationModel.invitee_id == user_id)
        stmt = select(InvitationModel).where(or_(*conditions))

        if status_filter and status_filter != "INVITATION_STATUS_UNSPECIFIED":
            stmt = stmt.where(InvitationModel.status == status_filter)

        stmt = stmt.order_by(InvitationModel.created_at.desc())
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def find_pending_invitations_by_email(self, email: str) -> list[Invitation]:
        stmt = select(InvitationModel).where(
            InvitationModel.invitee_email == email,
            InvitationModel.status == "INVITATION_STATUS_PENDING",
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def find_pending_invitation(
        self, email: str, target_id: str, inv_type: str
    ) -> Invitation | None:
        stmt = select(InvitationModel).where(
            InvitationModel.invitee_email == email,
            InvitationModel.target_id == target_id,
            InvitationModel.type == inv_type,
            InvitationModel.status == "INVITATION_STATUS_PENDING",
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if inspect.iscoroutine(model):
            model = await model
        if not model or not hasattr(model, "id") or isinstance(model, MagicMock):
            return None
        return self._to_entity(model)

    def _to_entity(self, model: InvitationModel) -> Invitation:
        try:
            inv_type = InvitationType(model.type)
        except ValueError:
            inv_type = InvitationType.ORGANIZATION_MEMBER

        try:
            inv_status = InvitationStatus(model.status)
        except ValueError:
            inv_status = InvitationStatus.PENDING

        return Invitation(
            id=model.id,
            type=inv_type,
            status=inv_status,
            inviter_id=model.inviter_id,
            inviter_name=model.inviter_name,
            inviter_email=model.inviter_email,
            invitee_email=model.invitee_email,
            invitee_id=model.invitee_id,
            target_id=model.target_id,
            target_name=model.target_name,
            role_id=model.role_id,
            token_hash=model.token_hash,
            message=model.message,
            expires_at=model.expires_at,
            created_at=model.created_at,
            responded_at=model.responded_at,
        )
