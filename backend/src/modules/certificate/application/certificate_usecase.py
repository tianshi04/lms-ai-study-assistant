import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select

from src.modules.catalog.infrastructure.models import CourseModel
from src.modules.certificate.domain.entities import FinancialAidApplication, VerifiedCertificate
from src.modules.certificate.infrastructure.repository import CertificateRepository
from src.modules.identity.infrastructure.models import UserModel
from src.shared.infrastructure.database import async_session_scope


def count_words(text: str) -> int:
    return len(text.strip().split())


class CertificateUseCase:
    async def apply_financial_aid(
        self, user_id: str, course_id: str, essay_150_words: str
    ) -> tuple[Optional[FinancialAidApplication], str]:
        words = count_words(essay_150_words)
        if words < 150:
            return (
                None,
                f"Bài luận hỗ trợ tài chính chưa đủ độ dài tối thiểu (Hiện tại {words}/150 từ). Vui lòng chia sẻ chi tiết hơn về hoàn cảnh và mục tiêu học tập.",
            )

        async with async_session_scope() as session:
            repo = CertificateRepository(session)
            existing = await repo.get_financial_aid(user_id, course_id)
            if existing:
                return existing, ""

            app_id = f"faid_{uuid.uuid4().hex[:12]}"
            application = FinancialAidApplication(
                id=app_id,
                user_id=user_id,
                course_id=course_id,
                essay_150_words=essay_150_words,
                status="PENDING",
                review_deadline_days_left=14,
            )

            saved = await repo.save_financial_aid(application)
            return saved, ""

    async def get_financial_aid_status(
        self, user_id: str, course_id: str
    ) -> Optional[FinancialAidApplication]:
        async with async_session_scope() as session:
            repo = CertificateRepository(session)
            return await repo.get_financial_aid(user_id, course_id)

    async def get_verified_certificate(
        self, user_id: str, course_id: str
    ) -> Optional[VerifiedCertificate]:
        async with async_session_scope() as session:
            repo = CertificateRepository(session)
            cert = await repo.get_certificate(user_id, course_id)
            if cert:
                return cert

            # Fetch real user details
            user_stmt = select(UserModel).where(UserModel.id == user_id)
            user_res = await session.execute(user_stmt)
            user_model = user_res.scalar_one_or_none()
            learner_name = user_model.full_name if user_model else "Học viên Coursera"

            # Fetch real course details
            course_stmt = select(CourseModel).where(CourseModel.id == course_id)
            course_res = await session.execute(course_stmt)
            course_model = course_res.scalar_one_or_none()

            course_title = course_model.title if course_model else "Specialization Course"
            partner_name = course_model.partner_name if course_model and course_model.partner_name else "DeepLearning.AI"
            partner_logo_url = (
                course_model.partner_logo_url
                if course_model and course_model.partner_logo_url
                else "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg"
            )

            # Generate new certificate dynamically with REAL database metadata
            cert_id = f"CERT-{uuid.uuid4().hex[:10].upper()}"
            issue_date = datetime.now(timezone.utc).strftime("%d/%m/%Y")
            verification_url = f"/verify/{cert_id}"
            qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={cert_id}"

            open_badges = {
                "@context": "https://w3id.org/openbadges/v2",
                "type": "BadgeClass",
                "id": cert_id,
                "name": f"Verified Certificate: {course_title}",
                "description": f"Chứng chỉ xác thực hoàn thành khóa học {course_title}",
                "image": qr_code_url,
                "criteria": f"/courses/{course_id}",
                "issuer": {
                    "name": f"{partner_name} & Coursera Partner",
                    "url": "https://coursera.org",
                },
            }

            cert = VerifiedCertificate(
                certificate_id=cert_id,
                user_id=user_id,
                course_id=course_id,
                learner_name=learner_name,
                course_title=course_title,
                partner_name=partner_name,
                partner_logo_url=partner_logo_url,
                issue_date=issue_date,
                verification_url=verification_url,
                qr_code_url=qr_code_url,
                open_badges_json_ld=json.dumps(open_badges, ensure_ascii=False),
            )

            return await repo.save_certificate(cert)

    async def verify_certificate_public(
        self, certificate_id: str
    ) -> tuple[bool, Optional[VerifiedCertificate]]:
        async with async_session_scope() as session:
            repo = CertificateRepository(session)
            cert = await repo.get_certificate_by_id(certificate_id)
            if not cert:
                return False, None
            return True, cert
