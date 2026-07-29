import hashlib
import inspect
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from src.modules.certificate.domain.constants import (
    DEFAULT_FINANCIAL_AID_REVIEW_DEADLINE_DAYS,
    MIN_FINANCIAL_AID_ESSAY_WORDS,
)
from src.modules.certificate.domain.entities import (
    FinancialAidApplication,
    FinancialAidStatus,
    VerifiedCertificate,
    count_words,
)
from src.modules.certificate.domain.repositories import ICertificateRepository
from src.modules.certificate.infrastructure.repository import CertificateRepository
from src.shared.infrastructure.database import async_session_scope

logger = logging.getLogger(__name__)


class CertificateUseCase:
    def __init__(self, repo: Optional[ICertificateRepository] = None) -> None:
        self._repo = repo

    def _get_repo(self, session: Any) -> ICertificateRepository:
        return self._repo if self._repo is not None else CertificateRepository(session)

    async def apply_financial_aid(
        self, user_id: str, course_id: str, essay_150_words: str
    ) -> tuple[Optional[FinancialAidApplication], str]:
        words = count_words(essay_150_words)
        if words < MIN_FINANCIAL_AID_ESSAY_WORDS:
            logger.warning(
                "User %s attempted to apply financial aid for course %s with short essay",
                user_id,
                course_id,
            )
            return (
                None,
                f"Bài luận hỗ trợ tài chính chưa đủ độ dài tối thiểu (Hiện tại {words}/{MIN_FINANCIAL_AID_ESSAY_WORDS} từ). Vui lòng chia sẻ chi tiết hơn về hoàn cảnh và mục tiêu học tập.",
            )

        async with async_session_scope() as session:
            repo = self._get_repo(session)

            # BR_FAID_003: Check if course has financial_aid_enabled
            if hasattr(repo, "is_financial_aid_enabled"):
                res = repo.is_financial_aid_enabled(course_id)
                is_enabled = await res if inspect.isawaitable(res) else bool(res)
                if not is_enabled:
                    logger.warning(
                        "User %s attempted to apply financial aid for course %s where aid is disabled",
                        user_id,
                        course_id,
                    )
                    return (
                        None,
                        "Khóa học này đã bị tắt tính năng Hỗ trợ Tài chính (BR_FAID_003). Vui lòng đăng ký trực tiếp hoặc nâng cấp Paid Mode.",
                    )

            existing = await repo.get_financial_aid(user_id, course_id)
            if existing:
                if existing.prevents_resubmission:
                    return existing, ""
                existing.resubmit(essay_150_words)
                saved = await repo.save_financial_aid(existing)
                logger.info(
                    "User %s resubmitted financial aid for course %s",
                    user_id,
                    course_id,
                )
                return saved, ""

            app_id = f"faid_{uuid.uuid4().hex[:12]}"
            application = FinancialAidApplication(
                id=app_id,
                user_id=user_id,
                course_id=course_id,
                essay_150_words=essay_150_words,
                status=FinancialAidStatus.PENDING,
                review_deadline_days_left=DEFAULT_FINANCIAL_AID_REVIEW_DEADLINE_DAYS,
            )

            saved = await repo.save_financial_aid(application)
            logger.info(
                "User %s applied financial aid for course %s", user_id, course_id
            )
            return saved, ""

    async def _check_auto_approve(
        self, app: Optional[FinancialAidApplication], repo: ICertificateRepository
    ) -> Optional[FinancialAidApplication]:
        if app and app.auto_approve_if_overdue():
            return await repo.save_financial_aid(app)
        return app

    async def get_financial_aid_status(
        self, user_id: str, course_id: str
    ) -> Optional[FinancialAidApplication]:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            app = await repo.get_financial_aid(user_id, course_id)
            return await self._check_auto_approve(app, repo)

    async def list_my_financial_aids(
        self, user_id: str
    ) -> list[FinancialAidApplication]:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            apps = await repo.list_financial_aids_by_user(user_id)
            checked_apps = []
            for a in apps:
                checked = await self._check_auto_approve(a, repo)
                if checked:
                    checked_apps.append(checked)
            return checked_apps

    async def list_financial_aid_applications(
        self, course_id: Optional[str] = None, status: Optional[str] = None
    ) -> list[FinancialAidApplication]:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            apps = await repo.list_financial_aids(course_id=course_id, status=status)
            checked_apps = []
            for a in apps:
                checked = await self._check_auto_approve(a, repo)
                if checked:
                    checked_apps.append(checked)
            return checked_apps

    async def review_financial_aid_application(
        self, application_id: str, is_approved: bool
    ) -> tuple[Optional[FinancialAidApplication], str]:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            app = await repo.get_financial_aid_by_id(application_id)
            if not app:
                return None, "Không tìm thấy đơn nộp Hỗ trợ tài chính"

            app.review(is_approved)
            updated_app = await repo.save_financial_aid(app)
            logger.info(
                "Financial aid %s was reviewed (Approved: %s)",
                application_id,
                is_approved,
            )
            return updated_app, ""

    async def get_verified_certificate(
        self, user_id: str, course_id: str
    ) -> tuple[Optional[VerifiedCertificate], str]:
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            (
                real_course_id,
                course_title,
                partner_name,
                partner_logo_url,
            ) = await repo.get_course_details_by_id_or_slug(course_id)

            cert = await repo.get_certificate(user_id, real_course_id)
            if cert:
                return cert, ""

            # BR_CERT_001: Check if user has reached 100% progress in course
            current_percent = await repo.get_learning_progress_percent(
                user_id, real_course_id
            )
            if current_percent < 100.0:
                logger.warning(
                    "User %s failed to get certificate for course %s: Progress %s < 100",
                    user_id,
                    real_course_id,
                    current_percent,
                )
                return (
                    None,
                    f"Chưa đủ điều kiện nhận chứng chỉ: Tiến độ khóa học phải đạt 100% (Hiện tại {current_percent}%).",
                )

            # BR_CERT_001 & BR_PEER_005: Check required graded items and pending appeals
            (
                is_eligible,
                err_msg,
            ) = await repo.check_graded_items_and_appeals_eligibility(
                user_id, real_course_id
            )
            if not is_eligible:
                logger.warning(
                    "User %s failed to get certificate for course %s: %s",
                    user_id,
                    real_course_id,
                    err_msg,
                )
                return None, err_msg

            # BR_CERT_003: Check user identity & KYC status
            email, full_name, is_identity_verified = await repo.get_user_kyc_info(
                user_id
            )
            if not is_identity_verified:
                logger.warning(
                    "User %s failed to get certificate for course %s: Identity not verified",
                    user_id,
                    real_course_id,
                )
                return (
                    None,
                    "Chưa đủ điều kiện nhận chứng chỉ: Bạn cần hoàn tất quy trình Xác minh Danh tính (KYC sinh trắc học/CCCD) trước khi phát hành chứng chỉ lần đầu (BR_CERT_003).",
                )

            learner_name = full_name or "Học viên Coursera"

            # Generate new certificate dynamically with REAL database metadata
            cert_id = f"CERT-{uuid.uuid4().hex[:10].upper()}"
            issue_date = datetime.now(timezone.utc).strftime("%d/%m/%Y")
            verification_url = f"/verify/{cert_id}"
            qr_code_url = f"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><rect width='150' height='150' fill='%23ffffff'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='%230056D2'>QR:{cert_id}</text></svg>"

            open_badges = {
                "@context": "https://w3id.org/openbadges/v2",
                "type": "Assertion",
                "id": f"https://coursera.org/verify/{cert_id}",
                "recipient": {
                    "type": "email",
                    "hashed": True,
                    "identity": f"sha256${hashlib.sha256(email.encode('utf-8')).hexdigest()}",
                },
                "issuedOn": datetime.now(timezone.utc).isoformat(),
                "badge": {
                    "type": "BadgeClass",
                    "id": f"https://coursera.org/courses/{course_id}",
                    "name": f"Verified Certificate: {course_title}",
                    "description": f"Chứng nhận xác thực hoàn thành khóa học {course_title}",
                    "image": qr_code_url,
                    "criteria": f"https://coursera.org/courses/{course_id}",
                    "issuer": {
                        "type": "Issuer",
                        "id": "https://coursera.org",
                        "name": f"{partner_name} & Coursera Partner",
                        "url": "https://coursera.org",
                        "email": "verify@coursera.org",
                    },
                },
                "verification": {"type": "hosted"},
            }

            (
                signer_name,
                signer_title,
                signature_image_url,
            ) = await repo.get_course_signer_info(real_course_id)

            cert = VerifiedCertificate(
                certificate_id=cert_id,
                user_id=user_id,
                course_id=real_course_id,
                learner_name=learner_name,
                course_title=course_title,
                partner_name=partner_name,
                partner_logo_url=partner_logo_url,
                issue_date=issue_date,
                verification_url=verification_url,
                qr_code_url=qr_code_url,
                open_badges_json_ld=open_badges,
                signer_name=signer_name,
                signer_title=signer_title,
                signature_image_url=signature_image_url,
            )

            saved_cert = await repo.save_certificate(cert)
            logger.info(
                "User %s received verified certificate %s for course %s",
                user_id,
                cert_id,
                real_course_id,
            )
            return saved_cert, ""

    async def revoke_certificate(
        self, certificate_id: str, reason: str = ""
    ) -> tuple[bool, str]:
        """Revokes a certificate by setting is_revoked=True (BR_CERT_004).
        Only Super Admin should call this endpoint.
        """
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            cert = await repo.get_certificate_by_id(certificate_id)
            if not cert:
                return False, f"Không tìm thấy chứng chỉ '{certificate_id}'."
            if cert.is_revoked:
                return False, "Chứng chỉ này đã bị thu hồi trước đó."
            cert.is_revoked = True
            cert.revoked_reason = reason or "Vi phạm quy chế liêm chính học thuật"
            await repo.save_certificate(cert)
            return True, f"Đã thu hồi chứng chỉ '{certificate_id}' thành công."

    async def verify_certificate_public(
        self, certificate_id: str
    ) -> tuple[bool, Optional[VerifiedCertificate], str]:
        """Public certificate verification endpoint (BR_CERT_002, BR_CERT_004).
        Returns (is_valid, certificate, status_message).
        """
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            cert = await repo.get_certificate_by_id(certificate_id)
            if not cert:
                return False, None, "Không tìm thấy chứng chỉ hợp lệ trên hệ thống."
            if cert.is_revoked:
                return (
                    False,
                    cert,
                    "Chứng chỉ này đã bị thu hồi do vi phạm quy chế liêm chính học thuật của nền tảng (Certificate Revoked).",
                )
            return True, cert, "Chứng chỉ hợp lệ và đã được xác minh thành công."

    async def issue_specialization_certificate(
        self, user_id: str, specialization_id: str
    ) -> tuple[Optional[VerifiedCertificate], str]:
        """Auto-issue a Specialization Verified Certificate when learner completes
        100% of all component courses in the specialization (BR_CERT_005).

        Returns (certificate, error_message). certificate is None on failure.
        """
        async with async_session_scope() as session:
            repo = self._get_repo(session)

            # 1. Load specialization details
            (
                spec_title,
                partner_name,
                partner_logo_url,
                course_ids,
            ) = await repo.get_specialization_details(specialization_id)
            if not spec_title:
                return None, f"Không tìm thấy Specialization '{specialization_id}'."

            if not course_ids:
                return None, "Specialization chưa có khóa học thành phần."

            # 2. Check that learner already has a valid individual cert for every course
            existing_certs = await repo.get_certificates_by_user(user_id)
            completed_course_ids = {c.course_id for c in existing_certs if c.course_id}
            missing = [cid for cid in course_ids if cid not in completed_course_ids]
            if missing:
                return (
                    None,
                    f"Học viên chưa hoàn thành {len(missing)}/{len(course_ids)} khóa học thành phần.",
                )

            # 3. Idempotency: return existing specialization cert if already issued
            existing_spec_cert = await repo.get_certificate(
                user_id, f"spec:{specialization_id}"
            )
            if existing_spec_cert:
                return existing_spec_cert, ""

            # 4. Load user info for cert metadata
            _, full_name, _ = await repo.get_user_kyc_info(user_id)
            learner_name = full_name or "Học viên"

            # 5. Build and save specialization certificate
            cert_id = f"CERT-SPEC-{uuid.uuid4().hex[:8].upper()}"
            issue_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            verification_url = f"/verify/{cert_id}"
            qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={cert_id}"

            open_badges = {
                "@context": "https://w3id.org/openbadges/v2",
                "type": "BadgeClass",
                "id": cert_id,
                "name": f"Specialization Certificate: {spec_title}",
                "description": f"Hoàn thành toàn bộ {len(course_ids)} khóa học trong chuỗi chuyên ngành.",
                "image": qr_code_url,
                "criteria": {"narrative": f"/specializations/{specialization_id}"},
                "issuer": {
                    "name": partner_name,
                    "url": partner_logo_url,
                },
            }

            (
                signer_name,
                signer_title,
                signature_image_url,
            ) = await repo.get_course_signer_info(specialization_id)

            spec_cert = VerifiedCertificate(
                certificate_id=cert_id,
                user_id=user_id,
                course_id=f"spec:{specialization_id}",
                learner_name=learner_name,
                course_title=spec_title or "Specialization",
                partner_name=partner_name or "Partner",
                partner_logo_url=partner_logo_url or "",
                issue_date=issue_date,
                verification_url=verification_url,
                qr_code_url=qr_code_url,
                open_badges_json_ld=open_badges,
                specialization_id=specialization_id,
                signer_name=signer_name,
                signer_title=signer_title,
                signature_image_url=signature_image_url,
            )
            saved = await repo.save_certificate(spec_cert)
            logger.info(
                "User %s received specialization certificate %s for spec %s",
                user_id,
                cert_id,
                specialization_id,
            )
            return saved, ""

    async def list_my_certificates(self, user_id: str) -> list[VerifiedCertificate]:
        """Lists all verified certificates for the given user."""
        async with async_session_scope() as session:
            repo = self._get_repo(session)
            return await repo.get_certificates_by_user(user_id)
