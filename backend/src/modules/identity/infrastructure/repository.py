from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.identity.domain.entities import (
    User,
    UserRole,
    SystemRole,
    Organization,
)
from src.modules.identity.infrastructure.models import (
    UserModel,
    OrganizationModel,
    OrganizationRoleModel,
    OrganizationMemberModel,
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
                system_role=user.system_role,
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
            model.system_role = user.system_role
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
        raw_sys_role = getattr(model, "system_role", None)
        system_role = (
            SystemRole(raw_sys_role)
            if raw_sys_role and raw_sys_role in SystemRole.__members__.values()
            else SystemRole.USER
        )
        return User(
            id=model.id,
            email=model.email,
            full_name=model.full_name,
            role=UserRole(model.role),
            system_role=system_role,
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
