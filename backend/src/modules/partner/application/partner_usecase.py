import logging
import uuid
from collections.abc import Callable
from typing import Any

from src.modules.identity.domain.entities import Organization
from src.modules.partner.domain.entities import Partner
from src.modules.partner.domain.repositories import IPartnerRepository
from src.modules.partner.infrastructure.repository import SQLAlchemyPartnerRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope


def _default_org_repo_factory(session: Any) -> Any:
    from src.modules.identity.infrastructure.repository import (
        OrganizationRepository,
    )

    return OrganizationRepository(session)


logger = logging.getLogger(__name__)


class PartnerUseCase:
    def __init__(
        self,
        repo: IPartnerRepository | None = None,
        org_repo_factory: Callable[[Any], Any] | None = None,
    ) -> None:
        self._repo = repo
        self._org_repo_factory = org_repo_factory or _default_org_repo_factory

    def _get_repo(self, session: Any) -> IPartnerRepository:
        return (
            self._repo
            if self._repo is not None
            else SQLAlchemyPartnerRepository(session)
        )

    def _verify_admin(self, current_user: CurrentUser | None) -> None:
        if not current_user or not current_user.is_admin:
            raise PermissionError(
                "Yêu cầu quyền Quản trị viên (Admin) để thực hiện thao tác này"
            )

    async def create_partner(
        self,
        name: str,
        slug: str,
        description: str = "",
        logo_url: str = "",
        banner_url: str = "",
        website_url: str = "",
        allowed_domains: list[str] | None = None,
        signature_image_url: str = "",
        signer_name: str = "",
        signer_title: str = "",
        public_key_pem: str = "",
        current_user: CurrentUser | None = None,
    ) -> Partner:
        self._verify_admin(current_user)
        partner_id = f"partner-{uuid.uuid4().hex[:8]}"

        async with async_session_scope() as session:
            repo = self._get_repo(session)

            existing_slug = await repo.get_by_slug(slug)
            if existing_slug:
                raise ValueError(f"Slug '{slug}' đã tồn tại trong hệ thống")

            if not public_key_pem:
                from cryptography.hazmat.primitives import serialization
                from cryptography.hazmat.primitives.asymmetric import ec

                priv = ec.generate_private_key(ec.SECP256R1())
                pub = priv.public_key()
                public_key_pem = pub.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo,
                ).decode("utf-8")

            partner = Partner(
                id=partner_id,
                name=name,
                slug=slug,
                description=description,
                logo_url=logo_url,
                banner_url=banner_url,
                website_url=website_url,
                allowed_domains=allowed_domains or [],
                signature_image_url=signature_image_url,
                signer_name=signer_name,
                signer_title=signer_title,
                public_key_pem=public_key_pem,
            )
            saved = await repo.create(partner)

            org_repo = self._org_repo_factory(session)
            existing_org = await org_repo.get_organization_by_id(partner_id) or (
                await org_repo.get_organization_by_id(slug) if slug else None
            )
            if not existing_org:
                await org_repo.save_organization(
                    Organization(
                        id=partner_id,
                        name=name,
                        slug=slug,
                        avatar_url=logo_url,
                    )
                )

            logger.info(
                "Created new partner and organization: %s (%s)", saved.name, saved.id
            )
            return saved

    async def update_partner(
        self,
        partner_id: str,
        name: str | None = None,
        slug: str | None = None,
        description: str | None = None,
        logo_url: str | None = None,
        banner_url: str | None = None,
        website_url: str | None = None,
        allowed_domains: list[str] | None = None,
        signature_image_url: str | None = None,
        signer_name: str | None = None,
        signer_title: str | None = None,
        public_key_pem: str | None = None,
        current_user: CurrentUser | None = None,
    ) -> Partner:
        self._verify_admin(current_user)
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            partner = await repo.get_by_id(partner_id)
            if not partner:
                raise KeyError(f"Không tìm thấy đối tác với ID: {partner_id}")

            if slug and slug != partner.slug:
                existing_slug = await repo.get_by_slug(slug)
                if existing_slug and existing_slug.id != partner_id:
                    raise ValueError(f"Slug '{slug}' đã tồn tại trong hệ thống")

            partner.update_details(
                name=name,
                slug=slug,
                description=description,
                logo_url=logo_url,
                banner_url=banner_url,
                website_url=website_url,
                allowed_domains=allowed_domains,
                signature_image_url=signature_image_url,
                signer_name=signer_name,
                signer_title=signer_title,
                public_key_pem=public_key_pem,
            )
            updated = await repo.update(partner)
            logger.info("Updated partner: %s (%s)", updated.name, updated.id)
            return updated

    async def get_partner(self, partner_id: str) -> Partner:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            partner = await repo.get_by_id(partner_id)
            if not partner:
                partner = await repo.get_by_slug(partner_id)
            if not partner:
                raise KeyError(f"Không tìm thấy đối tác với ID/Slug: {partner_id}")
            return partner

    async def list_partners(self) -> list[Partner]:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            return await repo.list_all()

    async def delete_partner(
        self, partner_id: str, current_user: CurrentUser | None = None
    ) -> bool:
        self._verify_admin(current_user)
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            deleted = await repo.delete(partner_id)
            if not deleted:
                raise KeyError(f"Không tìm thấy đối tác với ID: {partner_id}")
            logger.info("Deleted partner: %s", partner_id)
            return True

    async def rotate_key_pair(
        self, partner_id: str = "", current_user: CurrentUser | None = None
    ) -> str:
        self._verify_admin(current_user)

        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec

        priv = ec.generate_private_key(ec.SECP256R1())
        pub = priv.public_key()
        new_pem = pub.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8")

        async with async_session_scope() as session:
            repo = self._get_repo(session)
            target_partner = None

            clean_id = partner_id.strip() if partner_id else ""
            if clean_id:
                target_partner = await repo.get_by_id(clean_id)
                if not target_partner:
                    target_partner = await repo.get_by_slug(clean_id)

            # Auto-resolve from current user email domain if partner_id is empty
            if not target_partner and current_user and current_user.email:
                user_domain = (
                    current_user.email.split("@")[-1].lower()
                    if "@" in current_user.email
                    else ""
                )
                if user_domain:
                    all_partners = await repo.list_all()
                    for p in all_partners:
                        domains = [d.lstrip("@").lower() for d in p.allowed_domains]
                        if user_domain in domains:
                            target_partner = p
                            break

            if not target_partner:
                user_email = current_user.email if current_user else ""
                raise KeyError(
                    f"Không tìm thấy đối tác tương ứng với ID/Slug '{clean_id}' hoặc Email '{user_email}'"
                )

            current_historical = list(target_partner.historical_public_keys or [])
            if (
                target_partner.public_key_pem
                and target_partner.public_key_pem not in current_historical
            ):
                current_historical.append(target_partner.public_key_pem)

            target_partner.update_details(
                public_key_pem=new_pem,
                historical_public_keys=current_historical,
            )
            await repo.update(target_partner)
            logger.info(
                "Rotated key pair for partner: %s (%s)",
                target_partner.name,
                target_partner.id,
            )
            return new_pem
