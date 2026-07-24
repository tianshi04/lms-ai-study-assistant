from typing import Optional

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.infrastructure.database import Base


class FinancialAidModel(Base):
    __tablename__ = "financial_aid_applications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    essay_150_words: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    review_deadline_days_left: Mapped[int] = mapped_column(
        Integer, nullable=False, default=15
    )


class CertificateModel(Base):
    __tablename__ = "verified_certificates"

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
    open_badges_json_ld: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    revoked_reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    specialization_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
