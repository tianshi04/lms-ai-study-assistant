from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.partner.domain.entities import Partner
from src.modules.partner.domain.repository import IPartnerRepository
from src.modules.partner.infrastructure.models import PartnerModel


class SQLAlchemyPartnerRepository(IPartnerRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _to_entity(self, model: PartnerModel) -> Partner:
        return Partner(
            id=model.id,
            name=model.name,
            slug=model.slug,
            description=model.description,
            logo_url=model.logo_url,
            banner_url=model.banner_url,
            website_url=model.website_url,
            allowed_domains=list(model.allowed_domains or []),
            signature_image_url=model.signature_image_url,
            signer_name=model.signer_name,
            signer_title=model.signer_title,
            public_key_pem=model.public_key_pem,
            created_at=model.created_at,
            updated_at=model.updated_at,
            historical_public_keys=list(model.historical_public_keys or []),
        )

    async def create(self, partner: Partner) -> Partner:
        model = PartnerModel(
            id=partner.id,
            name=partner.name,
            slug=partner.slug,
            description=partner.description,
            logo_url=partner.logo_url,
            banner_url=partner.banner_url,
            website_url=partner.website_url,
            allowed_domains=partner.allowed_domains,
            signature_image_url=partner.signature_image_url,
            signer_name=partner.signer_name,
            signer_title=partner.signer_title,
            public_key_pem=partner.public_key_pem,
            created_at=partner.created_at,
            updated_at=partner.updated_at,
            historical_public_keys=partner.historical_public_keys,
        )
        self.session.add(model)
        await self.session.flush()
        return partner

    async def update(self, partner: Partner) -> Partner:
        stmt = select(PartnerModel).where(PartnerModel.id == partner.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            raise KeyError(f"Không tìm thấy đối tác với ID: {partner.id}")

        model.name = partner.name
        model.slug = partner.slug
        model.description = partner.description
        model.logo_url = partner.logo_url
        model.banner_url = partner.banner_url
        model.website_url = partner.website_url
        model.allowed_domains = partner.allowed_domains
        model.signature_image_url = partner.signature_image_url
        model.signer_name = partner.signer_name
        model.signer_title = partner.signer_title
        model.public_key_pem = partner.public_key_pem
        model.updated_at = partner.updated_at
        model.historical_public_keys = partner.historical_public_keys
        await self.session.flush()
        return partner

    async def get_by_id(self, partner_id: str) -> Optional[Partner]:
        stmt = select(PartnerModel).where(PartnerModel.id == partner_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_slug(self, slug: str) -> Optional[Partner]:
        stmt = select(PartnerModel).where(PartnerModel.slug == slug)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_all(self) -> list[Partner]:
        stmt = select(PartnerModel).order_by(PartnerModel.created_at.desc())
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def delete(self, partner_id: str) -> bool:
        stmt = select(PartnerModel).where(PartnerModel.id == partner_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return False
        await self.session.delete(model)
        await self.session.flush()
        return True
