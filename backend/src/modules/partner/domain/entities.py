from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from src.shared.domain.base import Entity


@dataclass
class Partner(Entity):
    id: str
    name: str
    slug: str
    description: str = ""
    logo_url: str = ""
    banner_url: str = ""
    website_url: str = ""
    allowed_domains: list[str] = field(default_factory=list)
    signature_image_url: str = ""
    signer_name: str = ""
    signer_title: str = ""
    public_key_pem: str = ""
    created_at: str = ""
    updated_at: str = ""
    historical_public_keys: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        super().__init__(id=self.id)
        if not self.name or not self.name.strip():
            raise ValueError("Tên đối tác không được để trống")
        if not self.slug or not self.slug.strip():
            raise ValueError("Slug đối tác không được để trống")
        now = datetime.now(timezone.utc).isoformat()
        if not self.created_at:
            self.created_at = now
        if not self.updated_at:
            self.updated_at = now

    def update_details(
        self,
        name: Optional[str] = None,
        slug: Optional[str] = None,
        description: Optional[str] = None,
        logo_url: Optional[str] = None,
        banner_url: Optional[str] = None,
        website_url: Optional[str] = None,
        allowed_domains: Optional[list[str]] = None,
        signature_image_url: Optional[str] = None,
        signer_name: Optional[str] = None,
        signer_title: Optional[str] = None,
        public_key_pem: Optional[str] = None,
        historical_public_keys: Optional[list[str]] = None,
    ) -> None:
        if name is not None:
            if not name.strip():
                raise ValueError("Tên đối tác không được để trống")
            self.name = name.strip()
        if slug is not None:
            if not slug.strip():
                raise ValueError("Slug đối tác không được để trống")
            self.slug = slug.strip()
        if description is not None:
            self.description = description
        if logo_url is not None:
            self.logo_url = logo_url
        if banner_url is not None:
            self.banner_url = banner_url
        if website_url is not None:
            self.website_url = website_url
        if allowed_domains is not None:
            self.allowed_domains = allowed_domains
        if signature_image_url is not None:
            self.signature_image_url = signature_image_url
        if signer_name is not None:
            self.signer_name = signer_name
        if signer_title is not None:
            self.signer_title = signer_title
        if public_key_pem is not None:
            self.public_key_pem = public_key_pem
        if historical_public_keys is not None:
            self.historical_public_keys = historical_public_keys

        self.updated_at = datetime.now(timezone.utc).isoformat()
