from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.catalog.domain.entities import ItemType
from src.modules.certificate.domain.constants import (
    DEFAULT_CERTIFICATE_PASSING_THRESHOLD_PERCENT,
)
from src.modules.certificate.domain.entities import (
    FinancialAidApplication,
    FinancialAidStatus,
    VerifiedCertificate,
)
from src.modules.certificate.domain.repositories import ICertificateRepository
from src.modules.certificate.infrastructure.models import (
    CertificateModel,
    FinancialAidModel,
)


class CertificateRepository(ICertificateRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_financial_aid(
        self, user_id: str, course_id: str
    ) -> Optional[FinancialAidApplication]:
        stmt = select(FinancialAidModel).where(
            FinancialAidModel.user_id == user_id,
        )
        if course_id:
            stmt = stmt.where(FinancialAidModel.course_id == course_id)
        result = await self._session.execute(stmt)
        model = result.scalars().first()
        if not model:
            return None
        return FinancialAidApplication(
            id=model.id,
            user_id=model.user_id,
            course_id=model.course_id,
            essay_150_words=model.essay_150_words,
            status=FinancialAidStatus(model.status),
            review_deadline_days_left=model.review_deadline_days_left,
        )

    async def list_financial_aids_by_user(
        self, user_id: str, course_id: str = ""
    ) -> list[FinancialAidApplication]:
        stmt = select(FinancialAidModel).where(FinancialAidModel.user_id == user_id)
        if course_id:
            stmt = stmt.where(FinancialAidModel.course_id == course_id)
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [
            FinancialAidApplication(
                id=m.id,
                user_id=m.user_id,
                course_id=m.course_id,
                essay_150_words=m.essay_150_words,
                status=FinancialAidStatus(m.status),
                review_deadline_days_left=m.review_deadline_days_left,
            )
            for m in models
        ]

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
                status=FinancialAidStatus(m.status),
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
            status=FinancialAidStatus(model.status),
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
            model.essay_150_words = app.essay_150_words
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
                signer_name=cert.signer_name,
                signer_title=cert.signer_title,
                signature_image_url=cert.signature_image_url,
            )
            self._session.add(model)
        else:
            model.is_revoked = cert.is_revoked
            model.revoked_reason = cert.revoked_reason
            model.signer_name = cert.signer_name
            model.signer_title = cert.signer_title
            model.signature_image_url = cert.signature_image_url

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
            signer_name=model.signer_name,
            signer_title=model.signer_title,
            signature_image_url=model.signature_image_url,
        )

    async def get_certificates_by_user(self, user_id: str) -> list[VerifiedCertificate]:
        """Returns all valid (non-revoked) certificates for a user."""
        stmt = select(CertificateModel).where(
            CertificateModel.user_id == user_id,
            CertificateModel.is_revoked.is_(False),
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [self._to_certificate_entity(m) for m in models]

    async def get_course_details_by_id_or_slug(
        self, course_id_or_slug: str
    ) -> tuple[str, str, str, str]:
        catalog_repo_factory = __import__(
            "src.modules.catalog.infrastructure.repository",
            fromlist=["SQLAlchemyCatalogRepository"],
        ).SQLAlchemyCatalogRepository
        catalog_repo = catalog_repo_factory(self._session)
        course = await catalog_repo.get_course_detail(course_id_or_slug)
        if not course:
            return (
                course_id_or_slug,
                "",
                "",
                "",
            )
        return (
            course.id,
            course.title,
            course.partner_name,
            course.partner_logo_url,
        )

    async def get_user_kyc_info(self, user_id: str) -> tuple[str, str, bool]:
        identity_repo_factory = __import__(
            "src.modules.identity.infrastructure.repository",
            fromlist=["IdentityRepository"],
        ).IdentityRepository
        identity_repo = identity_repo_factory(self._session)
        user_entity = await identity_repo.get_by_id(user_id)
        if not user_entity:
            return "", "", False
        return (
            user_entity.email,
            user_entity.full_name or user_entity.email or user_id,
            user_entity.is_identity_verified,
        )

    async def get_learning_progress_percent(
        self, user_id: str, course_id: str
    ) -> float:
        learning_repo_factory = __import__(
            "src.modules.learning.infrastructure.repository",
            fromlist=["SQLAlchemyLearningRepository"],
        ).SQLAlchemyLearningRepository
        learning_repo = learning_repo_factory(self._session)
        progress = await learning_repo.get_progress(user_id, course_id)
        return progress.overall_progress_percent if progress else 0.0

    async def check_graded_items_and_appeals_eligibility(
        self, user_id: str, course_id: str
    ) -> tuple[bool, str]:
        assessment_models = __import__(
            "src.modules.assessment.infrastructure.models",
            fromlist=[
                "GradeAppealModel",
                "LabSubmissionModel",
                "PeerAssignmentSubmissionModel",
                "QuizSubmissionModel",
                "QuizMatrixModel",
            ],
        )
        catalog_models = __import__(
            "src.modules.catalog.infrastructure.models",
            fromlist=["LearningItemModel", "LessonModel", "WeekModuleModel"],
        )

        graded_types = [
            ItemType.GRADED_QUIZ,
            ItemType.AUTO_GRADED_LAB,
            ItemType.PEER_REVIEW,
        ]
        req_stmt = (
            select(catalog_models.LearningItemModel)
            .join(
                catalog_models.LessonModel,
                catalog_models.LearningItemModel.lesson_id
                == catalog_models.LessonModel.id,
            )
            .join(
                catalog_models.WeekModuleModel,
                catalog_models.LessonModel.week_module_id
                == catalog_models.WeekModuleModel.id,
            )
            .where(catalog_models.WeekModuleModel.course_id == course_id)
            .where(catalog_models.LearningItemModel.type.in_(graded_types))
        )
        req_res = await self._session.execute(req_stmt)
        required_items = req_res.scalars().all()

        quiz_stmt = select(assessment_models.QuizSubmissionModel).where(
            assessment_models.QuizSubmissionModel.user_id == user_id
        )
        quiz_res = await self._session.execute(quiz_stmt)

        lab_stmt = select(assessment_models.LabSubmissionModel).where(
            assessment_models.LabSubmissionModel.user_id == user_id
        )
        lab_res = await self._session.execute(lab_stmt)

        peer_stmt = select(assessment_models.PeerAssignmentSubmissionModel).where(
            assessment_models.PeerAssignmentSubmissionModel.user_id == user_id
        )
        peer_res = await self._session.execute(peer_stmt)

        item_max_scores: dict[str, float] = {}
        for s in quiz_res.scalars().all():
            item_max_scores[s.item_id] = max(
                item_max_scores.get(s.item_id, 0.0),
                getattr(s, "score_percent", 0.0),
            )
        for s in lab_res.scalars().all():
            item_max_scores[s.item_id] = max(
                item_max_scores.get(s.item_id, 0.0),
                getattr(s, "score_percent", 0.0),
            )
        for s in peer_res.scalars().all():
            item_max_scores[s.item_id] = max(
                item_max_scores.get(s.item_id, 0.0),
                getattr(s, "final_score", 0.0) or 0.0,
            )

        # Fetch configured quiz matrices to obtain dynamically configured passing thresholds
        quiz_ids = [
            item.id for item in required_items if item.type == ItemType.GRADED_QUIZ
        ]
        quiz_thresholds = {}
        if quiz_ids:
            qm_stmt = select(assessment_models.QuizMatrixModel).where(
                assessment_models.QuizMatrixModel.item_id.in_(quiz_ids)
            )
            qm_res = await self._session.execute(qm_stmt)
            for qm in qm_res.scalars().all():
                quiz_thresholds[qm.item_id] = qm.passing_threshold_percent

        for req_item in required_items:
            max_score = item_max_scores.get(req_item.id)
            if max_score is None:
                return (
                    False,
                    f"Chưa đủ điều kiện nhận chứng chỉ: Bạn chưa hoàn thành bài tập bắt buộc '{req_item.title}'.",
                )

            # Determine threshold
            threshold = DEFAULT_CERTIFICATE_PASSING_THRESHOLD_PERCENT
            if req_item.type == ItemType.GRADED_QUIZ:
                threshold = quiz_thresholds.get(
                    req_item.id, DEFAULT_CERTIFICATE_PASSING_THRESHOLD_PERCENT
                )

            if max_score < threshold:
                return (
                    False,
                    f"Chưa đủ điều kiện nhận chứng chỉ: Bài tập '{req_item.title}' chưa đạt điểm tối thiểu >= {int(threshold)}% (Hiện tại {max_score}%).",
                )

        appeal_stmt = select(assessment_models.GradeAppealModel).where(
            assessment_models.GradeAppealModel.user_id == user_id,
            assessment_models.GradeAppealModel.status == "PENDING",
        )
        appeal_res = await self._session.execute(appeal_stmt)
        if appeal_res.scalar_one_or_none():
            return (
                False,
                "Chưa đủ điều kiện nhận chứng chỉ: Bạn đang có đơn khiếu nại/báo cáo bài chấm chéo chờ Trợ giảng thẩm định (Report Lock Rule).",
            )

        return True, ""

    async def get_specialization_details(
        self, specialization_id: str
    ) -> tuple[Optional[str], Optional[str], Optional[str], list[str]]:
        catalog_repo_factory = __import__(
            "src.modules.catalog.infrastructure.repository",
            fromlist=["SQLAlchemyCatalogRepository"],
        ).SQLAlchemyCatalogRepository
        catalog_repo = catalog_repo_factory(self._session)
        spec = await catalog_repo.get_specialization(specialization_id)
        if not spec:
            return None, None, None, []
        return (
            spec.title,
            spec.partner_name,
            spec.partner_logo_url or "",
            spec.course_ids or [],
        )

    async def get_course_signer_info(
        self, course_id_or_slug: str
    ) -> tuple[str, str, str]:
        catalog_repo_factory = __import__(
            "src.modules.catalog.infrastructure.repository",
            fromlist=["SQLAlchemyCatalogRepository"],
        ).SQLAlchemyCatalogRepository
        catalog_repo = catalog_repo_factory(self._session)
        course = await catalog_repo.get_course_detail(course_id_or_slug)

        partner_name = course.partner_name if (course and course.partner_name) else ""
        fallback_signer_name = partner_name
        fallback_signer_title = partner_name
        fallback_signature_url = (
            course.partner_logo_url if (course and course.partner_logo_url) else ""
        )

        if not course or not course.owner_id:
            return fallback_signer_name, fallback_signer_title, fallback_signature_url

        identity_repo_factory = __import__(
            "src.modules.identity.infrastructure.repository",
            fromlist=["IdentityRepository"],
        ).IdentityRepository
        identity_repo = identity_repo_factory(self._session)
        owner_user = await identity_repo.get_by_id(course.owner_id)

        if not owner_user:
            return fallback_signer_name, fallback_signer_title, fallback_signature_url

        signer_name = owner_user.full_name or fallback_signer_name
        signer_title = owner_user.title or fallback_signer_title
        signature_image_url = owner_user.signature_image_url or fallback_signature_url

        return signer_name, signer_title, signature_image_url

    async def is_financial_aid_enabled(self, course_id_or_slug: str) -> bool:
        catalog_repo_factory = __import__(
            "src.modules.catalog.infrastructure.repository",
            fromlist=["SQLAlchemyCatalogRepository"],
        ).SQLAlchemyCatalogRepository
        catalog_repo = catalog_repo_factory(self._session)
        course = await catalog_repo.get_course_detail(course_id_or_slug)
        if not course:
            return True
        return course.financial_aid_enabled
