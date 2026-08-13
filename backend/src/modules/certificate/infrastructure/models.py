from typing import Any

from sqlalchemy import JSON, Boolean, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.certificate.domain.constants import (
    DEFAULT_FINANCIAL_AID_REVIEW_DEADLINE_DAYS,
)
from src.shared.infrastructure.database import Base


class FinancialAidModel(Base):
    __tablename__ = "financial_aid_applications"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_financial_aid_user_course"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    essay_150_words: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    review_deadline_days_left: Mapped[int] = mapped_column(
        Integer, nullable=False, default=DEFAULT_FINANCIAL_AID_REVIEW_DEADLINE_DAYS
    )


class CertificateModel(Base):
    __tablename__ = "verified_certificates"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_certificate_user_course"),
    )

    certificate_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    learner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    course_title: Mapped[str] = mapped_column(String(255), nullable=False)
    partner_name: Mapped[str] = mapped_column(String(128), nullable=False)
    partner_logo_url: Mapped[str] = mapped_column(
        String(512), nullable=False, default=""
    )
    issue_date: Mapped[str] = mapped_column(String(64), nullable=False)
    verification_url: Mapped[str] = mapped_column(String(512), nullable=False)
    qr_code_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    open_badges_json_ld: Mapped[dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict
    )
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    revoked_reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    specialization_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    signer_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    signer_title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    signature_image_url: Mapped[str] = mapped_column(
        String(512), nullable=False, default=""
    )
