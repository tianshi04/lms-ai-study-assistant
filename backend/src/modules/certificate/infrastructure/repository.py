from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.certificate.domain.entities import (
    FinancialAidApplication,
    VerifiedCertificate,
)
from src.modules.certificate.infrastructure.models import (
    CertificateModel,
    FinancialAidModel,
)


class CertificateRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_financial_aid(
        self, user_id: str, course_id: str
    ) -> Optional[FinancialAidApplication]:
        stmt = select(FinancialAidModel).where(
            FinancialAidModel.user_id == user_id,
            FinancialAidModel.course_id == course_id,
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None
        return FinancialAidApplication(
            id=model.id,
            user_id=model.user_id,
            course_id=model.course_id,
            essay_150_words=model.essay_150_words,
            status=model.status,
            review_deadline_days_left=model.review_deadline_days_left,
        )

    async def list_financial_aids(
        self, course_id: Optional[str] = None, status: Optional[str] = None
    ) -> list[FinancialAidApplication]:
        stmt = select(FinancialAidModel)
        if course_id:
            stmt = stmt.where(FinancialAidModel.course_id == course_id)
        if status:
            stmt = stmt.where(FinancialAidModel.status == status)
        stmt = stmt.order_by(FinancialAidModel.id.desc())

        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [
            FinancialAidApplication(
                id=m.id,
                user_id=m.user_id,
                course_id=m.course_id,
                essay_150_words=m.essay_150_words,
                status=m.status,
                review_deadline_days_left=m.review_deadline_days_left,
            )
            for m in models
        ]

    async def get_financial_aid_by_id(
        self, application_id: str
    ) -> Optional[FinancialAidApplication]:
        stmt = select(FinancialAidModel).where(FinancialAidModel.id == application_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None
        return FinancialAidApplication(
            id=model.id,
            user_id=model.user_id,
            course_id=model.course_id,
            essay_150_words=model.essay_150_words,
            status=model.status,
            review_deadline_days_left=model.review_deadline_days_left,
        )

    async def save_financial_aid(
        self, app: FinancialAidApplication
    ) -> FinancialAidApplication:
        stmt = select(FinancialAidModel).where(FinancialAidModel.id == app.id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            model = FinancialAidModel(
                id=app.id,
                user_id=app.user_id,
                course_id=app.course_id,
                essay_150_words=app.essay_150_words,
                status=app.status,
                review_deadline_days_left=app.review_deadline_days_left,
            )
            self._session.add(model)
        else:
            model.status = app.status
            model.review_deadline_days_left = app.review_deadline_days_left

        await self._session.flush()
        return app

    async def get_certificate(
        self, user_id: str, course_id: str
    ) -> Optional[VerifiedCertificate]:
        stmt = select(CertificateModel).where(
            CertificateModel.user_id == user_id,
            CertificateModel.course_id == course_id,
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_certificate_entity(model) if model else None

    async def get_certificate_by_id(
        self, certificate_id: str
    ) -> Optional[VerifiedCertificate]:
        stmt = select(CertificateModel).where(
            CertificateModel.certificate_id == certificate_id
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_certificate_entity(model) if model else None

    async def save_certificate(self, cert: VerifiedCertificate) -> VerifiedCertificate:
        stmt = select(CertificateModel).where(
            CertificateModel.certificate_id == cert.certificate_id
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            model = CertificateModel(
                certificate_id=cert.certificate_id,
                user_id=cert.user_id,
                course_id=cert.course_id or "",
                learner_name=cert.learner_name,
                course_title=cert.course_title,
                partner_name=cert.partner_name,
                partner_logo_url=cert.partner_logo_url,
                issue_date=cert.issue_date,
                verification_url=cert.verification_url,
                qr_code_url=cert.qr_code_url,
                open_badges_json_ld=cert.open_badges_json_ld,
                is_revoked=cert.is_revoked,
                revoked_reason=cert.revoked_reason,
                specialization_id=cert.specialization_id,
            )
            self._session.add(model)
        else:
            model.is_revoked = cert.is_revoked
            model.revoked_reason = cert.revoked_reason

        await self._session.flush()
        return cert

    def _to_certificate_entity(self, model: CertificateModel) -> VerifiedCertificate:
        return VerifiedCertificate(
            certificate_id=model.certificate_id,
            user_id=model.user_id,
            course_id=model.course_id,
            learner_name=model.learner_name,
            course_title=model.course_title,
            partner_name=model.partner_name,
            partner_logo_url=model.partner_logo_url,
            issue_date=model.issue_date,
            verification_url=model.verification_url,
            qr_code_url=model.qr_code_url,
            open_badges_json_ld=model.open_badges_json_ld,
            is_revoked=model.is_revoked,
            revoked_reason=model.revoked_reason,
            specialization_id=model.specialization_id,
        )

    async def get_certificates_by_user(self, user_id: str) -> list[VerifiedCertificate]:
        """Returns all certificates for a user (for specialization completion check)."""
        from sqlalchemy import select

        stmt = select(CertificateModel).where(
            CertificateModel.user_id == user_id,
            CertificateModel.specialization_id.is_(None),
            CertificateModel.is_revoked.is_(False),
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [self._to_certificate_entity(m) for m in models]
