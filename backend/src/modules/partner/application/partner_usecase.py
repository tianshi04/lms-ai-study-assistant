import logging
from collections.abc import Callable
from typing import Any

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from uuid6 import uuid7

from src.modules.identity.domain import IOrganizationRepository, Organization
from src.modules.partner.domain import IPartnerRepository, Partner
from src.modules.partner.infrastructure.repository import SQLAlchemyPartnerRepository
from src.shared.auth import CurrentUser
from src.shared.infrastructure.database import async_session_scope
from src.shared.permissions import (
    OrgPermission,
    enforce_strict_organization_permission,
)

logger = logging.getLogger(__name__)


def _generate_ec_public_key_pem() -> str:
    priv = ec.generate_private_key(ec.SECP256R1())
    pub = priv.public_key()
    return pub.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")


class PartnerUseCase:
    def __init__(
        self,
        repo: IPartnerRepository | None = None,
        org_repo_factory: Callable[[Any], IOrganizationRepository] | None = None,
    ) -> None:
        self._repo = repo
        self._org_repo_factory = org_repo_factory

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
        partner_id = f"partner-{uuid7().hex}"

        async with async_session_scope() as session:
            repo = self._get_repo(session)

            existing_slug = await repo.get_by_slug(slug)
            if existing_slug:
                raise ValueError(f"Slug '{slug}' đã tồn tại trong hệ thống")

            if not public_key_pem:
                public_key_pem = _generate_ec_public_key_pem()

            normalized_domains = [
                d.strip().lstrip("@").lower()
                for d in (allowed_domains or [])
                if d and d.strip()
            ]

            partner = Partner(
                id=partner_id,
                name=name,
                slug=slug,
                description=description,
                logo_url=logo_url,
                banner_url=banner_url,
                website_url=website_url,
                allowed_domains=normalized_domains,
                signature_image_url=signature_image_url,
                signer_name=signer_name,
                signer_title=signer_title,
                public_key_pem=public_key_pem,
            )
            saved = await repo.create(partner)

            if self._org_repo_factory is not None:
                org_repo = self._org_repo_factory(session)
                existing_org = await org_repo.get_organization_by_id(partner_id) or (
                    await org_repo.get_organization_by_id(slug) if slug else None
                )
                if not existing_org:
                    await org_repo.save_organization(
                        Organization(
                            id=partner_id,
                            name=saved.name,
                            slug=saved.slug,
                            avatar_url=saved.logo_url,
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
        if not current_user or not current_user.id:
            raise PermissionError("Vui lòng đăng nhập để thực hiện thao tác này")

        clean_id = partner_id.strip() if partner_id else ""
        if not clean_id:
            raise ValueError("Thiếu mã đối tác.")

        async with async_session_scope() as session:
            repo = self._get_repo(session)
            partner = await repo.get_by_id(clean_id)
            if not partner:
                partner = await repo.get_by_slug(clean_id)
            if not partner:
                if not current_user.is_admin:
                    raise PermissionError(
                        "Tài khoản của bạn không có quyền cập nhật đối tác này"
                    )
                raise KeyError(f"Không tìm thấy đối tác với ID: {clean_id}")

            await enforce_strict_organization_permission(
                session,
                current_user,
                partner.id,
                required_permission=OrgPermission.MANAGE_MEMBERS,
            )

            if slug and slug != partner.slug:
                existing_slug = await repo.get_by_slug(slug)
                if existing_slug and existing_slug.id != partner.id:
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

            if self._org_repo_factory is not None:
                org_repo = self._org_repo_factory(session)
                existing_org = await org_repo.get_organization_by_id(updated.id)
                if existing_org:
                    existing_org.name = updated.name
                    existing_org.slug = updated.slug
                    existing_org.avatar_url = updated.logo_url
                    await org_repo.save_organization(existing_org)
                else:
                    await org_repo.save_organization(
                        Organization(
                            id=updated.id,
                            name=updated.name,
                            slug=updated.slug,
                            avatar_url=updated.logo_url,
                        )
                    )

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
        if not current_user or not current_user.id:
            raise PermissionError("Vui lòng đăng nhập để thực hiện thao tác này")

        new_pem = _generate_ec_public_key_pem()

        async with async_session_scope() as session:
            repo = self._get_repo(session)
            target_partner: Partner | None = None

            clean_id = partner_id.strip() if partner_id else ""
            if clean_id:
                target_partner = await repo.get_by_id(clean_id)
                if not target_partner:
                    target_partner = await repo.get_by_slug(clean_id)

            # Resolve via user's owned organizations if partner_id is omitted
            if not target_partner and self._org_repo_factory is not None:
                org_repo = self._org_repo_factory(session)
                org_details = await org_repo.list_user_organization_details(
                    current_user.id
                )
                for item in org_details:
                    role_val = str(item.get("role_in_org", "")).upper()
                    org_id_val = str(item.get("id", "")).strip()
                    org_slug_val = str(item.get("slug", "")).strip()
                    if "OWNER" in role_val and (org_id_val or org_slug_val):
                        if org_id_val:
                            target_partner = await repo.get_by_id(org_id_val)
                        if not target_partner and org_slug_val:
                            target_partner = await repo.get_by_slug(org_slug_val)
                        if target_partner:
                            break

            # Fallback auto-resolve from current user email domain
            if not target_partner and current_user.email:
                all_partners = await repo.list_all()
                for p in all_partners:
                    if p.matches_email_domain(current_user.email):
                        target_partner = p
                        break

            if not target_partner:
                if not current_user.is_admin:
                    raise PermissionError(
                        "Tài khoản của bạn không có quyền xoay khóa ký số cho đối tác này"
                    )
                user_email = current_user.email or ""
                raise KeyError(
                    f"Không tìm thấy đối tác tương ứng với ID/Slug '{clean_id}' hoặc Email '{user_email}'"
                )

            await enforce_strict_organization_permission(
                session,
                current_user,
                target_partner.id,
                required_permission=OrgPermission.MANAGE_MEMBERS,
            )

            target_partner.rotate_public_key(new_pem)
            await repo.update(target_partner)
            logger.info(
                "Rotated key pair for partner: %s (%s)",
                target_partner.name,
                target_partner.id,
            )
            return new_pem
