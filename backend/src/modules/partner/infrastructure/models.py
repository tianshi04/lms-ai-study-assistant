from sqlalchemy import ARRAY, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.partner.domain import (
    MAX_PARTNER_NAME_LENGTH,
    MAX_PARTNER_SLUG_LENGTH,
)
from src.shared.infrastructure.database import Base


class PartnerModel(Base):
    __tablename__ = "partners"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(MAX_PARTNER_NAME_LENGTH), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(MAX_PARTNER_SLUG_LENGTH), nullable=False, unique=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    logo_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    banner_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    website_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    allowed_domains: Mapped[list[str]] = mapped_column(
        ARRAY(String(255)), nullable=False, default=list
    )
    signature_image_url: Mapped[str] = mapped_column(
        String(512), nullable=False, default=""
    )
    signer_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    signer_title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    public_key_pem: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
    updated_at: Mapped[str] = mapped_column(String(64), nullable=False)
    historical_public_keys: Mapped[list[str]] = mapped_column(
        ARRAY(String(255)), nullable=False, default=list
    )
