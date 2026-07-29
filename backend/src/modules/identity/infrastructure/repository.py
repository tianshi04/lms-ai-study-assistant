from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.identity.domain.entities import User, UserRole
from src.modules.identity.infrastructure.models import UserModel


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
