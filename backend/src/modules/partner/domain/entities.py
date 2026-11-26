from dataclasses import dataclass, field
from datetime import UTC, datetime

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
        now = datetime.now(UTC).isoformat()
        if not self.created_at:
            self.created_at = now
        if not self.updated_at:
            self.updated_at = now

    def update_details(
        self,
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
        historical_public_keys: list[str] | None = None,
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
            self.allowed_domains = [
                d.strip().lstrip("@").lower()
                for d in allowed_domains
                if d and d.strip()
            ]
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

        self.updated_at = datetime.now(UTC).isoformat()

    def rotate_public_key(self, new_public_key_pem: str, rotated_at: str = "") -> None:
        """Rotates the active OpenBadges/EdDSA/ECDSA public key and archives the previous key."""
        cleaned_pem = (new_public_key_pem or "").strip()
        if not cleaned_pem or "BEGIN PUBLIC KEY" not in cleaned_pem:
            raise ValueError("Khóa công khai (Public Key PEM) không hợp lệ")

        archived_keys = list(self.historical_public_keys or [])
        current_pem = (self.public_key_pem or "").strip()
        if (
            current_pem
            and current_pem != cleaned_pem
            and current_pem not in archived_keys
        ):
            archived_keys.append(current_pem)

        self.public_key_pem = new_public_key_pem
        self.historical_public_keys = archived_keys
        self.updated_at = rotated_at or datetime.now(UTC).isoformat()

    def matches_email_domain(self, email: str) -> bool:
        """Checks whether an email belongs to this partner's allowed domains (BR_PARTNER_001)."""
        if not email or "@" not in email or not self.allowed_domains:
            return False
        email_domain = email.rsplit("@", 1)[-1].strip().lower()
        if not email_domain:
            return False

        for raw_domain in self.allowed_domains:
            norm_domain = raw_domain.strip().lstrip("@").lstrip(".").lower()
            if not norm_domain:
                continue
            if email_domain == norm_domain or email_domain.endswith(f".{norm_domain}"):
                return True
        return False
