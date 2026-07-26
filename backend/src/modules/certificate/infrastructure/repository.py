from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.assessment.infrastructure.models import (
    GradeAppealModel,
    LabSubmissionModel,
    PeerAssignmentSubmissionModel,
    QuizSubmissionModel,
)
from src.modules.catalog.domain.entities import ItemType
from src.modules.catalog.infrastructure.models import (
    CourseModel,
    LearningItemModel,
    LessonModel,
    SpecializationModel,
    WeekModuleModel,
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
from src.modules.identity.infrastructure.models import UserModel
from src.modules.learning.infrastructure.models import LearningProgressModel


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
        stmt = select(CourseModel).where(
            (CourseModel.id == course_id_or_slug)
            | (CourseModel.slug == course_id_or_slug)
        )
        res = await self._session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return (
                course_id_or_slug,
                "Specialization Course",
                "DeepLearning.AI",
                "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
            )
        return (
            model.id,
            model.title,
            model.partner_name or "DeepLearning.AI",
            model.partner_logo_url
            or "https://upload.wikimedia.org/wikipedia/commons/e/e1/DeepLearning.AI_logo.svg",
        )

    async def get_user_kyc_info(self, user_id: str) -> tuple[str, str, bool]:
        stmt = select(UserModel).where(UserModel.id == user_id)
        res = await self._session.execute(stmt)
        user_model = res.scalar_one_or_none()
        if not user_model:
            return "learner@coursera.ai", "Học viên Coursera", False
        return (
            user_model.email or "learner@coursera.ai",
            user_model.full_name or "Học viên Coursera",
            getattr(user_model, "is_identity_verified", False),
        )

    async def get_learning_progress_percent(
        self, user_id: str, course_id: str
    ) -> float:
        progress_key = f"{user_id}:{course_id}"
        stmt = select(LearningProgressModel.overall_progress_percent).where(
            LearningProgressModel.id == progress_key
        )
        res = await self._session.execute(stmt)
        val = res.scalar_one_or_none()
        return float(val) if val is not None else 0.0

    async def check_graded_items_and_appeals_eligibility(
        self, user_id: str, course_id: str
    ) -> tuple[bool, str]:
        graded_types = [
            ItemType.GRADED_QUIZ,
            ItemType.AUTO_GRADED_LAB,
            ItemType.PEER_REVIEW,
        ]
        req_stmt = (
            select(LearningItemModel)
            .join(LessonModel, LearningItemModel.lesson_id == LessonModel.id)
            .join(WeekModuleModel, LessonModel.week_module_id == WeekModuleModel.id)
            .where(WeekModuleModel.course_id == course_id)
            .where(LearningItemModel.type.in_(graded_types))
        )
        req_res = await self._session.execute(req_stmt)
        required_items = req_res.scalars().all()

        quiz_stmt = select(QuizSubmissionModel).where(
            QuizSubmissionModel.user_id == user_id
        )
        quiz_res = await self._session.execute(quiz_stmt)

        lab_stmt = select(LabSubmissionModel).where(
            LabSubmissionModel.user_id == user_id
        )
        lab_res = await self._session.execute(lab_stmt)

        peer_stmt = select(PeerAssignmentSubmissionModel).where(
            PeerAssignmentSubmissionModel.user_id == user_id
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

        for req_item in required_items:
            max_score = item_max_scores.get(req_item.id)
            if max_score is None:
                return (
                    False,
                    f"Chưa đủ điều kiện nhận chứng chỉ: Bạn chưa hoàn thành bài tập bắt buộc '{req_item.title}'.",
                )
            if max_score < 80.0:
                return (
                    False,
                    f"Chưa đủ điều kiện nhận chứng chỉ: Bài tập '{req_item.title}' chưa đạt điểm tối thiểu >= 80% (Hiện tại {max_score}%).",
                )

        appeal_stmt = select(GradeAppealModel).where(
            GradeAppealModel.user_id == user_id,
            GradeAppealModel.status == "PENDING",
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
        stmt = select(SpecializationModel).where(
            SpecializationModel.id == specialization_id
        )
        res = await self._session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None, None, None, []
        return (
            model.title,
            model.partner_name or "Partner",
            model.partner_logo_url or "",
            model.course_ids or [],
        )
