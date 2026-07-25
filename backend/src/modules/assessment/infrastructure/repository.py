from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.assessment.domain.entities import (
    GradeAppeal,
    HonorCodeAgreement,
    LabSubmission,
    PeerAssignmentSubmission,
    PeerReview,
    QuizCooldown,
    QuizSubmission,
    RubricCriteria,
)
from src.modules.assessment.domain.repositories import AssessmentRepositoryInterface
from src.modules.assessment.infrastructure.models import (
    GradeAppealModel,
    HonorCodeModel,
    LabSubmissionModel,
    PeerAssignmentSubmissionModel,
    PeerReviewModel,
    QuizCooldownModel,
    QuizSubmissionModel,
)


class SQLAlchemyAssessmentRepository(AssessmentRepositoryInterface):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save_honor_code(self, agreement: HonorCodeAgreement) -> None:
        model = await self.session.get(HonorCodeModel, agreement.id)
        if model:
            model.is_agreed = agreement.is_agreed
            if agreement.agreed_at:
                model.agreed_at = agreement.agreed_at
        else:
            model = HonorCodeModel(
                id=agreement.id,
                user_id=agreement.user_id,
                item_id=agreement.item_id,
                is_agreed=agreement.is_agreed,
                agreed_at=agreement.agreed_at or "",
            )
            self.session.add(model)
        await self.session.commit()

    async def get_honor_code(
        self, user_id: str, item_id: str
    ) -> Optional[HonorCodeAgreement]:
        stmt = select(HonorCodeModel).where(
            HonorCodeModel.user_id == user_id, HonorCodeModel.item_id == item_id
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return HonorCodeAgreement(
            user_id=model.user_id,
            item_id=model.item_id,
            is_agreed=model.is_agreed,
            agreed_at=model.agreed_at,
        )

    async def save_quiz_submission(self, submission: QuizSubmission) -> None:
        model = QuizSubmissionModel(
            id=submission.id,
            user_id=submission.user_id,
            item_id=submission.item_id,
            selected_option_indexes=submission.selected_option_indexes,
            score_percent=submission.score_percent,
            passed=submission.passed,
            attempt_number=submission.attempt_number,
            created_at=submission.created_at,
        )
        self.session.add(model)
        await self.session.commit()

    async def get_quiz_submissions(
        self, user_id: str, item_id: str
    ) -> list[QuizSubmission]:
        stmt = (
            select(QuizSubmissionModel)
            .where(
                QuizSubmissionModel.user_id == user_id,
                QuizSubmissionModel.item_id == item_id,
            )
            .order_by(QuizSubmissionModel.created_at.asc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [
            QuizSubmission(
                id=m.id,
                user_id=m.user_id,
                item_id=m.item_id,
                selected_option_indexes=m.selected_option_indexes,
                score_percent=m.score_percent,
                passed=m.passed,
                attempt_number=m.attempt_number,
                created_at=m.created_at,
            )
            for m in models
        ]

    async def get_quiz_cooldown(
        self, user_id: str, item_id: str
    ) -> Optional[QuizCooldown]:
        stmt = select(QuizCooldownModel).where(
            QuizCooldownModel.user_id == user_id, QuizCooldownModel.item_id == item_id
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return QuizCooldown(
            user_id=model.user_id,
            item_id=model.item_id,
            failed_attempts_count=model.failed_attempts_count,
            last_attempt_at=model.last_attempt_at,
            cooldown_until=model.cooldown_until,
        )

    async def save_quiz_cooldown(self, cooldown: QuizCooldown) -> None:
        model = await self.session.get(QuizCooldownModel, cooldown.id)
        if model:
            model.failed_attempts_count = cooldown.failed_attempts_count
            model.last_attempt_at = cooldown.last_attempt_at
            model.cooldown_until = cooldown.cooldown_until
        else:
            model = QuizCooldownModel(
                id=cooldown.id,
                user_id=cooldown.user_id,
                item_id=cooldown.item_id,
                failed_attempts_count=cooldown.failed_attempts_count,
                last_attempt_at=cooldown.last_attempt_at,
                cooldown_until=cooldown.cooldown_until,
            )
            self.session.add(model)
        await self.session.commit()

    async def save_lab_submission(self, submission: LabSubmission) -> None:
        model = LabSubmissionModel(
            id=submission.id,
            user_id=submission.user_id,
            item_id=submission.item_id,
            source_code=submission.source_code,
            language=submission.language,
            score_percent=submission.score_percent,
            passed=submission.passed,
            total_test_cases=submission.total_test_cases,
            passed_test_cases=submission.passed_test_cases,
            test_logs=submission.test_logs,
            created_at=submission.created_at,
        )
        self.session.add(model)
        await self.session.commit()

    async def get_lab_submissions(
        self, user_id: str, item_id: str
    ) -> list[LabSubmission]:
        stmt = (
            select(LabSubmissionModel)
            .where(
                LabSubmissionModel.user_id == user_id,
                LabSubmissionModel.item_id == item_id,
            )
            .order_by(LabSubmissionModel.created_at.asc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [
            LabSubmission(
                id=m.id,
                user_id=m.user_id,
                item_id=m.item_id,
                source_code=m.source_code,
                language=m.language,
                score_percent=m.score_percent,
                passed=m.passed,
                total_test_cases=m.total_test_cases,
                passed_test_cases=m.passed_test_cases,
                test_logs=m.test_logs,
                created_at=m.created_at,
            )
            for m in models
        ]

    async def save_peer_submission(self, submission: PeerAssignmentSubmission) -> None:
        model = await self.session.get(PeerAssignmentSubmissionModel, submission.id)
        if model:
            model.submission_url = submission.submission_url
            model.text_content = submission.text_content
            model.final_score = submission.final_score
            model.graded_by_staff = submission.graded_by_staff
        else:
            model = PeerAssignmentSubmissionModel(
                id=submission.id,
                user_id=submission.user_id,
                item_id=submission.item_id,
                submission_url=submission.submission_url,
                text_content=submission.text_content,
                created_at=submission.created_at,
                final_score=submission.final_score,
                graded_by_staff=submission.graded_by_staff,
            )
            self.session.add(model)
        await self.session.commit()

    async def get_peer_submission(
        self, submission_id: str
    ) -> Optional[PeerAssignmentSubmission]:
        model = await self.session.get(PeerAssignmentSubmissionModel, submission_id)
        if not model:
            return None
        return PeerAssignmentSubmission(
            id=model.id,
            user_id=model.user_id,
            item_id=model.item_id,
            submission_url=model.submission_url,
            text_content=model.text_content,
            created_at=model.created_at,
            final_score=model.final_score,
            graded_by_staff=model.graded_by_staff,
        )

    async def get_user_peer_submission(
        self, user_id: str, item_id: str
    ) -> Optional[PeerAssignmentSubmission]:
        stmt = select(PeerAssignmentSubmissionModel).where(
            PeerAssignmentSubmissionModel.user_id == user_id,
            PeerAssignmentSubmissionModel.item_id == item_id,
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return PeerAssignmentSubmission(
            id=model.id,
            user_id=model.user_id,
            item_id=model.item_id,
            submission_url=model.submission_url,
            text_content=model.text_content,
            created_at=model.created_at,
            final_score=model.final_score,
            graded_by_staff=model.graded_by_staff,
        )

    async def get_peer_submissions_for_item(
        self, item_id: str, exclude_user_id: str = ""
    ) -> list[PeerAssignmentSubmission]:
        stmt = select(PeerAssignmentSubmissionModel).where(
            PeerAssignmentSubmissionModel.item_id == item_id
        )
        if exclude_user_id:
            stmt = stmt.where(PeerAssignmentSubmissionModel.user_id != exclude_user_id)
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [
            PeerAssignmentSubmission(
                id=m.id,
                user_id=m.user_id,
                item_id=m.item_id,
                submission_url=m.submission_url,
                text_content=m.text_content,
                created_at=m.created_at,
                final_score=m.final_score,
                graded_by_staff=m.graded_by_staff,
            )
            for m in models
        ]

    async def save_peer_review(self, review: PeerReview) -> None:
        rubric_data = [
            {
                "criteria_id": c.criteria_id,
                "title": c.title,
                "max_score": c.max_score,
                "score_given": c.score_given,
                "feedback": c.feedback,
            }
            for c in review.rubric_criteria
        ]
        model = await self.session.get(PeerReviewModel, review.id)
        if model:
            model.rubric_criteria_json = {"items": rubric_data}
            model.total_score = review.total_score
            model.is_outlier = review.is_outlier
        else:
            model = PeerReviewModel(
                id=review.id,
                submission_id=review.submission_id,
                reviewer_user_id=review.reviewer_user_id,
                item_id=review.item_id,
                rubric_criteria_json={"items": rubric_data},
                total_score=review.total_score,
                is_outlier=review.is_outlier,
                created_at=review.created_at or "",
            )
            self.session.add(model)
        await self.session.commit()

    async def get_peer_reviews_by_reviewer(
        self, reviewer_user_id: str, item_id: str
    ) -> list[PeerReview]:
        stmt = select(PeerReviewModel).where(
            PeerReviewModel.reviewer_user_id == reviewer_user_id,
            PeerReviewModel.item_id == item_id,
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        reviews: list[PeerReview] = []
        for m in models:
            items = (
                m.rubric_criteria_json.get("items", [])
                if isinstance(m.rubric_criteria_json, dict)
                else []
            )
            criteria = [
                RubricCriteria(
                    criteria_id=c.get("criteria_id", ""),
                    title=c.get("title", ""),
                    max_score=c.get("max_score", 10.0),
                    score_given=c.get("score_given", 0.0),
                    feedback=c.get("feedback", ""),
                )
                for c in items
            ]
            reviews.append(
                PeerReview(
                    id=m.id,
                    submission_id=m.submission_id,
                    reviewer_user_id=m.reviewer_user_id,
                    item_id=m.item_id,
                    rubric_criteria=criteria,
                    total_score=m.total_score,
                    is_outlier=m.is_outlier,
                    created_at=m.created_at,
                )
            )
        return reviews

    async def get_peer_reviews_for_submission(
        self, submission_id: str
    ) -> list[PeerReview]:
        stmt = select(PeerReviewModel).where(
            PeerReviewModel.submission_id == submission_id
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        reviews: list[PeerReview] = []
        for m in models:
            items = (
                m.rubric_criteria_json.get("items", [])
                if isinstance(m.rubric_criteria_json, dict)
                else []
            )
            criteria = [
                RubricCriteria(
                    criteria_id=c.get("criteria_id", ""),
                    title=c.get("title", ""),
                    max_score=c.get("max_score", 10.0),
                    score_given=c.get("score_given", 0.0),
                    feedback=c.get("feedback", ""),
                )
                for c in items
            ]
            reviews.append(
                PeerReview(
                    id=m.id,
                    submission_id=m.submission_id,
                    reviewer_user_id=m.reviewer_user_id,
                    item_id=m.item_id,
                    rubric_criteria=criteria,
                    total_score=m.total_score,
                    is_outlier=m.is_outlier,
                    created_at=m.created_at,
                )
            )
        return reviews

    async def save_grade_appeal(self, appeal: GradeAppeal) -> None:
        model = await self.session.get(GradeAppealModel, appeal.id)
        if model:
            model.status = appeal.status
            model.appeal_reason = appeal.appeal_reason
        else:
            model = GradeAppealModel(
                id=appeal.id,
                user_id=appeal.user_id,
                submission_id=appeal.submission_id,
                appeal_reason=appeal.appeal_reason,
                status=appeal.status,
                created_at=appeal.created_at or "",
            )
            self.session.add(model)
        await self.session.commit()

    async def get_grade_appeal(self, submission_id: str) -> Optional[GradeAppeal]:
        stmt = select(GradeAppealModel).where(
            GradeAppealModel.submission_id == submission_id
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return GradeAppeal(
            id=model.id,
            user_id=model.user_id,
            submission_id=model.submission_id,
            appeal_reason=model.appeal_reason,
            status=model.status,
            created_at=model.created_at,
        )
