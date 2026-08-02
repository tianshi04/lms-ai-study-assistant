from typing import Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.identity.domain.entities import (
    User,
    UserRole,
    Organization,
    OrganizationMember,
    InstructorApplication,
    ApplicationStatus,
)
from src.modules.identity.infrastructure.models import (
    UserModel,
    OrganizationModel,
    OrganizationRoleModel,
    OrganizationMemberModel,
    InstructorApplicationModel,
)


class IdentityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: str) -> Optional[User]:
        stmt = select(UserModel).where(UserModel.id == user_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(UserModel).where(UserModel.email == email)
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

    async def get_organization_by_id(self, org_id: str) -> Optional[Organization]:
        stmt = select(OrganizationModel).where(OrganizationModel.id == org_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None
        return Organization(
            id=model.id,
            name=model.name,
            slug=model.slug,
            avatar_url=model.avatar_url,
            created_at=model.created_at,
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

    async def get_effective_permissions(
        self, user_id: str, org_id: str
    ) -> tuple[Optional[str], set[str]]:
        """Resolves member's role and calculates effective permission set across role hierarchy."""
        stmt = (
            select(OrganizationMemberModel, OrganizationRoleModel)
            .join(
                OrganizationRoleModel,
                OrganizationRoleModel.id == OrganizationMemberModel.role_id,
            )
            .where(
                OrganizationMemberModel.user_id == user_id,
                OrganizationMemberModel.organization_id == org_id,
                OrganizationMemberModel.status == "ACTIVE",
            )
        )
        result = await self._session.execute(stmt)
        row = result.first()
        if not row:
            return None, set()

        member, role = row
        role_name = role.name
        permissions = set(role.permissions or [])

        # Traverse parent role hierarchy if parent_role_id exists
        current_role = role
        visited_role_ids = {role.id}
        while (
            current_role.parent_role_id
            and current_role.parent_role_id not in visited_role_ids
        ):
            visited_role_ids.add(current_role.parent_role_id)
            parent_stmt = select(OrganizationRoleModel).where(
                OrganizationRoleModel.id == current_role.parent_role_id
            )
            parent_result = await self._session.execute(parent_stmt)
            parent_role = parent_result.scalar_one_or_none()
            if not parent_role:
                break
            permissions.update(parent_role.permissions or [])
            current_role = parent_role

        return role_name, permissions

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


class InstructorApplicationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, application_id: str) -> Optional[InstructorApplication]:
        stmt = select(InstructorApplicationModel).where(
            InstructorApplicationModel.id == application_id
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_latest_by_user_id(
        self, user_id: str
    ) -> Optional[InstructorApplication]:
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
