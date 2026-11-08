from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, or_, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from uuid6 import uuid7

from src.modules.assessment.domain import (
    GRADING_LOCK_TIMEOUT_MINUTES,
    AssessmentRepositoryInterface,
    GradeAppeal,
    HonorCodeAgreement,
    LabSubmission,
    PeerAssignmentSubmission,
    PeerReview,
    Question,
    QuestionBank,
    QuestionOption,
    QuizActiveSession,
    QuizCooldown,
    QuizMatrix,
    QuizSubmission,
    QuizSubmissionAnswer,
    RubricCriteria,
)
from src.modules.assessment.infrastructure.models import (
    GradeAppealModel,
    HonorCodeModel,
    LabSubmissionModel,
    PeerAssignmentSubmissionModel,
    PeerReviewModel,
    QuestionBankModel,
    QuestionModel,
    QuestionOptionModel,
    QuizActiveSessionModel,
    QuizCooldownModel,
    QuizMatrixModel,
    QuizSubmissionAnswerModel,
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
    ) -> HonorCodeAgreement | None:
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

    async def get_quiz_submission_by_id(
        self, submission_id: str
    ) -> QuizSubmission | None:
        stmt = select(QuizSubmissionModel).where(
            QuizSubmissionModel.id == submission_id
        )
        res = await self.session.execute(stmt)
        m = res.scalar_one_or_none()
        if not m:
            return None
        return QuizSubmission(
            id=m.id,
            user_id=m.user_id,
            item_id=m.item_id,
            selected_option_indexes=m.selected_option_indexes,
            score_percent=m.score_percent,
            passed=m.passed,
            attempt_number=m.attempt_number,
            created_at=m.created_at,
        )

    async def save_quiz_submission_answers(
        self, answers: list[QuizSubmissionAnswer]
    ) -> None:
        if not answers:
            return
        for ans in answers:
            model = QuizSubmissionAnswerModel(
                id=ans.id,
                submission_id=ans.submission_id,
                question_id=ans.question_id,
                question_text=ans.question_text,
                question_type=ans.question_type,
                topic=ans.topic,
                options_json=ans.options_json,
                selected_option_indices=ans.selected_option_indices,
                is_correct=ans.is_correct,
                explanation=ans.explanation,
                order_index=ans.order_index,
            )
            self.session.add(model)
        await self.session.commit()

    async def get_quiz_submission_answers(
        self, submission_id: str
    ) -> list[QuizSubmissionAnswer]:
        stmt = (
            select(QuizSubmissionAnswerModel)
            .where(QuizSubmissionAnswerModel.submission_id == submission_id)
            .order_by(QuizSubmissionAnswerModel.order_index.asc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [
            QuizSubmissionAnswer(
                id=m.id,
                submission_id=m.submission_id,
                question_id=m.question_id,
                question_text=m.question_text,
                question_type=m.question_type,
                options_json=m.options_json,
                selected_option_indices=m.selected_option_indices,
                is_correct=m.is_correct,
                topic=m.topic,
                explanation=m.explanation,
                order_index=m.order_index,
            )
            for m in models
        ]

    async def get_quiz_submission_answers_for_user_item(
        self, user_id: str, item_id: str
    ) -> list[QuizSubmissionAnswer]:
        stmt = (
            select(QuizSubmissionAnswerModel)
            .join(
                QuizSubmissionModel,
                QuizSubmissionAnswerModel.submission_id == QuizSubmissionModel.id,
            )
            .where(
                QuizSubmissionModel.user_id == user_id,
                QuizSubmissionModel.item_id == item_id,
            )
            .order_by(
                QuizSubmissionModel.created_at.desc(),
                QuizSubmissionAnswerModel.order_index.asc(),
            )
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [
            QuizSubmissionAnswer(
                id=m.id,
                submission_id=m.submission_id,
                question_id=m.question_id,
                question_text=m.question_text,
                question_type=m.question_type,
                options_json=m.options_json,
                selected_option_indices=m.selected_option_indices,
                is_correct=m.is_correct,
                topic=m.topic,
                explanation=m.explanation,
                order_index=m.order_index,
            )
            for m in models
        ]

    async def get_quiz_cooldown(
        self, user_id: str, item_id: str
    ) -> QuizCooldown | None:
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
        stmt = pg_insert(QuizCooldownModel).values(
            id=cooldown.id,
            user_id=cooldown.user_id,
            item_id=cooldown.item_id,
            failed_attempts_count=cooldown.failed_attempts_count,
            last_attempt_at=cooldown.last_attempt_at,
            cooldown_until=cooldown.cooldown_until,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[QuizCooldownModel.id],
            set_={
                "failed_attempts_count": cooldown.failed_attempts_count,
                "last_attempt_at": cooldown.last_attempt_at,
                "cooldown_until": cooldown.cooldown_until,
            },
        )
        await self.session.execute(stmt)
        await self.session.commit()

    async def get_quiz_active_session(
        self, user_id: str, item_id: str
    ) -> QuizActiveSession | None:
        stmt = select(QuizActiveSessionModel).where(
            QuizActiveSessionModel.user_id == user_id,
            QuizActiveSessionModel.item_id == item_id,
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return QuizActiveSession(
            user_id=model.user_id,
            item_id=model.item_id,
            session_seed=model.session_seed,
            questions_json=model.questions_json,
            started_at=model.started_at,
            expires_at=model.expires_at,
        )

    async def save_quiz_active_session(self, session: QuizActiveSession) -> None:
        stmt = pg_insert(QuizActiveSessionModel).values(
            id=session.id,
            user_id=session.user_id,
            item_id=session.item_id,
            session_seed=session.session_seed,
            questions_json=session.questions_json,
            started_at=session.started_at,
            expires_at=session.expires_at,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[QuizActiveSessionModel.id],
            set_={
                "session_seed": session.session_seed,
                "questions_json": session.questions_json,
                "started_at": session.started_at,
                "expires_at": session.expires_at,
            },
        )
        await self.session.execute(stmt)
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

    @staticmethod
    def _to_peer_submission_entity(
        model: PeerAssignmentSubmissionModel,
    ) -> PeerAssignmentSubmission:
        return PeerAssignmentSubmission(
            id=model.id,
            user_id=model.user_id,
            item_id=model.item_id,
            submission_url=model.submission_url,
            text_content=model.text_content,
            created_at=model.created_at,
            final_score=model.final_score,
            graded_by_staff=model.graded_by_staff,
            attempt_number=model.attempt_number,
            staff_feedback=model.staff_feedback,
            graded_by_user_id=model.graded_by_user_id,
            grader_role=model.grader_role,
            grade_source=model.grade_source,
            locked_by_user_id=model.locked_by_user_id,
            locked_at=model.locked_at,
            rubric_scores_json=model.rubric_scores_json,
            is_draft=model.is_draft,
            published_at=model.published_at,
            status=model.status,
        )

    async def save_peer_submission(self, submission: PeerAssignmentSubmission) -> None:
        model = await self.session.get(PeerAssignmentSubmissionModel, submission.id)
        if not model:
            stmt = select(PeerAssignmentSubmissionModel).where(
                PeerAssignmentSubmissionModel.user_id == submission.user_id,
                PeerAssignmentSubmissionModel.item_id == submission.item_id,
            )
            res = await self.session.execute(stmt)
            model = res.scalar_one_or_none()

        if model:
            model.submission_url = submission.submission_url
            model.text_content = submission.text_content
            model.final_score = submission.final_score
            model.graded_by_staff = submission.graded_by_staff
            model.attempt_number = submission.attempt_number
            model.staff_feedback = submission.staff_feedback
            model.graded_by_user_id = submission.graded_by_user_id
            model.grader_role = submission.grader_role
            model.grade_source = submission.grade_source
            model.locked_by_user_id = submission.locked_by_user_id
            model.locked_at = submission.locked_at
            model.rubric_scores_json = submission.rubric_scores_json
            model.is_draft = submission.is_draft
            model.published_at = submission.published_at
            model.status = submission.status
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
                attempt_number=submission.attempt_number,
                staff_feedback=submission.staff_feedback,
                graded_by_user_id=submission.graded_by_user_id,
                grader_role=submission.grader_role,
                grade_source=submission.grade_source,
                locked_by_user_id=submission.locked_by_user_id,
                locked_at=submission.locked_at,
                rubric_scores_json=submission.rubric_scores_json,
                is_draft=submission.is_draft,
                published_at=submission.published_at,
                status=submission.status,
            )
            self.session.add(model)
        await self.session.commit()

    async def get_peer_submission(
        self, submission_id: str
    ) -> PeerAssignmentSubmission | None:
        model = await self.session.get(PeerAssignmentSubmissionModel, submission_id)
        if not model:
            return None
        return self._to_peer_submission_entity(model)

    async def get_user_peer_submission(
        self, user_id: str, item_id: str
    ) -> PeerAssignmentSubmission | None:
        stmt = select(PeerAssignmentSubmissionModel).where(
            PeerAssignmentSubmissionModel.user_id == user_id,
            PeerAssignmentSubmissionModel.item_id == item_id,
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return self._to_peer_submission_entity(model)

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
        return [self._to_peer_submission_entity(m) for m in models]

    async def claim_submission_lock(
        self,
        submission_id: str,
        user_id: str,
        timeout_minutes: int = GRADING_LOCK_TIMEOUT_MINUTES,
    ) -> bool:
        now = datetime.now(UTC)
        expired_threshold = (now - timedelta(minutes=timeout_minutes)).isoformat()
        stmt = (
            update(PeerAssignmentSubmissionModel)
            .where(
                PeerAssignmentSubmissionModel.id == submission_id,
                or_(
                    PeerAssignmentSubmissionModel.locked_by_user_id.is_(None),
                    PeerAssignmentSubmissionModel.locked_by_user_id == user_id,
                    PeerAssignmentSubmissionModel.locked_at < expired_threshold,
                ),
            )
            .values(
                locked_by_user_id=user_id,
                locked_at=now.isoformat(),
            )
        )
        res = await self.session.execute(stmt)
        await self.session.commit()
        return int(getattr(res, "rowcount", 0) or 0) > 0

    async def renew_submission_lock(
        self,
        submission_id: str,
        user_id: str,
        timeout_minutes: int = GRADING_LOCK_TIMEOUT_MINUTES,
    ) -> bool:
        now = datetime.now(UTC)
        expired_threshold = (now - timedelta(minutes=timeout_minutes)).isoformat()
        stmt = (
            update(PeerAssignmentSubmissionModel)
            .where(
                PeerAssignmentSubmissionModel.id == submission_id,
                PeerAssignmentSubmissionModel.locked_by_user_id == user_id,
                PeerAssignmentSubmissionModel.locked_at >= expired_threshold,
            )
            .values(
                locked_at=now.isoformat(),
            )
        )
        res = await self.session.execute(stmt)
        await self.session.commit()
        return int(getattr(res, "rowcount", 0) or 0) > 0

    async def release_submission_lock(
        self,
        submission_id: str,
        user_id: str | None = None,
    ) -> bool:
        where_conditions = [PeerAssignmentSubmissionModel.id == submission_id]
        if user_id:
            where_conditions.append(
                or_(
                    PeerAssignmentSubmissionModel.locked_by_user_id == user_id,
                    PeerAssignmentSubmissionModel.locked_by_user_id.is_(None),
                )
            )
        stmt = (
            update(PeerAssignmentSubmissionModel)
            .where(*where_conditions)
            .values(
                locked_by_user_id=None,
                locked_at=None,
            )
        )
        res = await self.session.execute(stmt)
        await self.session.commit()
        return int(getattr(res, "rowcount", 0) or 0) > 0

    async def publish_all_draft_grades(
        self,
        course_id: str,
        item_id: str | None = None,
    ) -> list[PeerAssignmentSubmission]:
        from src.modules.catalog.infrastructure.models import (
            LearningItemModel,
            LessonModel,
            WeekModuleModel,
        )

        now_iso = datetime.now(UTC).isoformat()
        if item_id:
            item_ids = [item_id]
        else:
            item_stmt = (
                select(LearningItemModel.id)
                .join(LessonModel, LessonModel.id == LearningItemModel.lesson_id)
                .join(WeekModuleModel, WeekModuleModel.id == LessonModel.week_module_id)
                .where(WeekModuleModel.course_id == course_id)
            )
            item_res = await self.session.execute(item_stmt)
            item_ids = [str(r[0]) for r in item_res.fetchall()]

        if not item_ids:
            return []

        select_stmt = select(PeerAssignmentSubmissionModel).where(
            PeerAssignmentSubmissionModel.item_id.in_(item_ids),
            PeerAssignmentSubmissionModel.is_draft.is_(True),
        )
        res = await self.session.execute(select_stmt)
        models = res.scalars().all()
        if not models:
            return []

        updated_submissions: list[PeerAssignmentSubmission] = []
        for m in models:
            m.is_draft = False
            m.published_at = now_iso
            m.status = "PUBLISHED"
            updated_submissions.append(self._to_peer_submission_entity(m))
        await self.session.commit()
        return updated_submissions

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

    async def get_grade_appeal(self, submission_id: str) -> GradeAppeal | None:
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

    async def create_question_bank(
        self, course_id: str, title: str, category: str, description: str
    ) -> QuestionBank:
        now_str = datetime.now(UTC).isoformat()
        bank_id = f"qbank-{uuid7().hex}"
        model = QuestionBankModel(
            id=bank_id,
            course_id=course_id,
            title=title,
            category=category or "PRACTICE",
            description=description or "",
            created_at=now_str,
        )
        self.session.add(model)
        await self.session.commit()
        return QuestionBank(
            id=bank_id,
            course_id=course_id,
            title=title,
            category=category,
            description=description,
            questions=[],
            created_at=now_str,
        )

    async def list_question_banks(self, course_id: str) -> list[QuestionBank]:
        stmt = (
            select(QuestionBankModel)
            .options(
                selectinload(QuestionBankModel.questions).selectinload(
                    QuestionModel.options
                )
            )
            .where(QuestionBankModel.course_id == course_id)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()

        banks = []
        for m in models:
            questions = [
                Question(
                    id=q.id,
                    bank_id=q.bank_id,
                    text=q.text,
                    question_type=q.question_type,
                    difficulty=q.difficulty,
                    explanation=q.explanation,
                    options=[
                        QuestionOption(
                            id=opt.id,
                            question_id=opt.question_id,
                            option_text=opt.option_text,
                            is_correct=opt.is_correct,
                            order_index=opt.order_index,
                        )
                        for opt in q.options
                    ],
                    created_at=q.created_at,
                )
                for q in m.questions
            ]
            banks.append(
                QuestionBank(
                    id=m.id,
                    course_id=m.course_id,
                    title=m.title,
                    category=m.category,
                    description=m.description,
                    questions=questions,
                    created_at=m.created_at,
                )
            )
        return banks

    async def add_question_to_bank(
        self,
        bank_id: str,
        text: str,
        question_type: str,
        difficulty: str,
        explanation: str,
        options_data: list[dict],
        topic: str = "Tổng quan",
    ) -> Question:
        now_str = datetime.now(UTC).isoformat()
        q_id = f"q-{uuid7().hex}"
        q_model = QuestionModel(
            id=q_id,
            bank_id=bank_id,
            text=text,
            question_type=question_type or "SINGLE_CHOICE",
            difficulty=difficulty or "EASY",
            explanation=explanation or "",
            topic=topic or "Tổng quan",
            created_at=now_str,
        )
        self.session.add(q_model)
        await self.session.flush()

        domain_options = []
        for idx, opt in enumerate(options_data):
            opt_id = f"opt-{uuid7().hex}"
            opt_model = QuestionOptionModel(
                id=opt_id,
                question_id=q_id,
                option_text=opt.get("option_text", ""),
                is_correct=bool(opt.get("is_correct", False)),
                order_index=idx,
            )
            self.session.add(opt_model)
            domain_options.append(
                QuestionOption(
                    id=opt_id,
                    question_id=q_id,
                    option_text=opt.get("option_text", ""),
                    is_correct=bool(opt.get("is_correct", False)),
                    order_index=idx,
                )
            )

        await self.session.commit()
        return Question(
            id=q_id,
            bank_id=bank_id,
            text=text,
            question_type=question_type,
            difficulty=difficulty,
            explanation=explanation,
            options=domain_options,
            created_at=now_str,
        )

    async def delete_question(self, question_id: str) -> bool:
        stmt = select(QuestionModel).where(QuestionModel.id == question_id)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return False
        await self.session.delete(model)
        await self.session.commit()
        return True

    async def update_question(
        self,
        question_id: str,
        text: str,
        question_type: str,
        difficulty: str,
        explanation: str,
        options_data: list[dict],
        topic: str = "Tổng quan",
    ) -> Question:
        stmt = (
            select(QuestionModel)
            .options(selectinload(QuestionModel.options))
            .where(QuestionModel.id == question_id)
        )
        res = await self.session.execute(stmt)
        q_model = res.scalar_one_or_none()
        if not q_model:
            raise ValueError(f"Question with ID {question_id} not found")

        q_model.text = text
        q_model.question_type = question_type
        q_model.difficulty = difficulty
        q_model.explanation = explanation
        q_model.topic = topic or "Tổng quan"

        q_model.options.clear()

        domain_options = []
        for idx, opt in enumerate(options_data):
            opt_id = f"opt-{uuid7().hex}"
            opt_model = QuestionOptionModel(
                id=opt_id,
                question_id=question_id,
                option_text=opt.get("option_text", ""),
                is_correct=bool(opt.get("is_correct", False)),
                order_index=idx,
            )
            q_model.options.append(opt_model)
            domain_options.append(
                QuestionOption(
                    id=opt_id,
                    question_id=question_id,
                    option_text=opt.get("option_text", ""),
                    is_correct=bool(opt.get("is_correct", False)),
                    order_index=idx,
                )
            )

        q_id = q_model.id
        bank_id = q_model.bank_id
        created_at = q_model.created_at or datetime.now(UTC).isoformat()

        await self.session.commit()
        return Question(
            id=q_id,
            bank_id=bank_id,
            text=text,
            question_type=question_type,
            difficulty=difficulty,
            explanation=explanation,
            options=domain_options,
            created_at=created_at,
        )

    async def configure_quiz_matrix(
        self,
        item_id: str,
        bank_id: str,
        time_limit_minutes: int,
        passing_threshold_percent: float,
        easy_count: int,
        medium_count: int,
        hard_count: int,
        shuffle_options: bool,
        max_attempts: int,
        cooldown_hours: int,
    ) -> QuizMatrix:
        stmt = select(QuizMatrixModel).where(QuizMatrixModel.item_id == item_id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            existing.bank_id = bank_id
            existing.time_limit_minutes = time_limit_minutes
            existing.passing_threshold_percent = passing_threshold_percent
            existing.easy_count = easy_count
            existing.medium_count = medium_count
            existing.hard_count = hard_count
            existing.shuffle_options = shuffle_options
            existing.max_attempts = max_attempts
            existing.cooldown_hours = cooldown_hours
        else:
            existing = QuizMatrixModel(
                item_id=item_id,
                bank_id=bank_id,
                time_limit_minutes=time_limit_minutes,
                passing_threshold_percent=passing_threshold_percent,
                easy_count=easy_count,
                medium_count=medium_count,
                hard_count=hard_count,
                shuffle_options=shuffle_options,
                max_attempts=max_attempts,
                cooldown_hours=cooldown_hours,
            )
            self.session.add(existing)

        await self.session.commit()
        return QuizMatrix(
            item_id=existing.item_id,
            bank_id=existing.bank_id,
            time_limit_minutes=existing.time_limit_minutes,
            passing_threshold_percent=existing.passing_threshold_percent,
            easy_count=existing.easy_count,
            medium_count=existing.medium_count,
            hard_count=existing.hard_count,
            shuffle_options=existing.shuffle_options,
            max_attempts=existing.max_attempts,
            cooldown_hours=existing.cooldown_hours,
        )

    async def get_quiz_matrix(self, item_id: str) -> QuizMatrix | None:
        stmt = select(QuizMatrixModel).where(QuizMatrixModel.item_id == item_id)
        res = await self.session.execute(stmt)
        m = res.scalar_one_or_none()
        if not m:
            return None
        return QuizMatrix(
            item_id=m.item_id,
            bank_id=m.bank_id,
            time_limit_minutes=m.time_limit_minutes,
            passing_threshold_percent=m.passing_threshold_percent,
            easy_count=m.easy_count,
            medium_count=m.medium_count,
            hard_count=m.hard_count,
            shuffle_options=m.shuffle_options,
            max_attempts=m.max_attempts,
            cooldown_hours=m.cooldown_hours,
        )

    async def get_item_type(self, item_id: str) -> str:
        stmt = text("SELECT type::text FROM learning_items WHERE id = :item_id")
        res = await self.session.execute(stmt, {"item_id": item_id})
        val = res.scalar_one_or_none()
        return str(val) if val else ""

    async def get_questions_by_bank(self, bank_id: str) -> list[Question]:
        stmt = (
            select(QuestionModel)
            .options(selectinload(QuestionModel.options))
            .where(QuestionModel.bank_id == bank_id)
            .order_by(QuestionModel.id)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()

        return [
            Question(
                id=q.id,
                bank_id=q.bank_id,
                text=q.text,
                question_type=q.question_type,
                difficulty=q.difficulty,
                explanation=q.explanation,
                topic=getattr(q, "topic", "Tổng quan") or "Tổng quan",
                options=[
                    QuestionOption(
                        id=opt.id,
                        question_id=opt.question_id,
                        option_text=opt.option_text,
                        is_correct=opt.is_correct,
                        order_index=opt.order_index,
                    )
                    for opt in q.options
                ],
                created_at=q.created_at,
            )
            for q in models
        ]

    async def get_any_questions(self, limit: int = 20) -> list[Question]:
        stmt = (
            select(QuestionModel)
            .options(selectinload(QuestionModel.options))
            .order_by(QuestionModel.id)
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()

        return [
            Question(
                id=q.id,
                bank_id=q.bank_id,
                text=q.text,
                question_type=q.question_type,
                difficulty=q.difficulty,
                explanation=q.explanation,
                topic=getattr(q, "topic", "Tổng quan") or "Tổng quan",
                options=[
                    QuestionOption(
                        id=opt.id,
                        question_id=opt.question_id,
                        option_text=opt.option_text,
                        is_correct=opt.is_correct,
                        order_index=opt.order_index,
                    )
                    for opt in q.options
                ],
                created_at=q.created_at,
            )
            for q in models
        ]

    async def get_course_id_by_item_id(self, item_id: str) -> str | None:
        from src.modules.catalog.infrastructure.models import (
            LearningItemModel,
            LessonModel,
            WeekModuleModel,
        )

        stmt = (
            select(WeekModuleModel.course_id)
            .join(
                LessonModel,
                LessonModel.week_module_id == WeekModuleModel.id,
            )
            .join(
                LearningItemModel,
                LearningItemModel.lesson_id == LessonModel.id,
            )
            .where(LearningItemModel.id == item_id)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_lab_test_cases_json(self, item_id: str) -> str | None:
        from src.modules.catalog.infrastructure.models import LearningItemModel

        stmt = select(LearningItemModel.test_cases_json).where(
            LearningItemModel.id == item_id
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_course_gradebook_data(
        self,
        course_id: str,
        search_query: str = "",
        status_filter: str = "",
        page_size: int = 50,
        page_token: str = "",
    ) -> dict[str, Any]:
        from src.modules.catalog.infrastructure.models import (
            CourseModel,
            LearningItemModel,
            LessonModel,
            WeekModuleModel,
        )
        from src.modules.identity.infrastructure.models import UserModel
        from src.modules.learning.infrastructure.models import LearningProgressModel

        # 1. Course title
        course_stmt = select(CourseModel).where(CourseModel.id == course_id)
        course_res = await self.session.execute(course_stmt)
        course = course_res.scalar_one_or_none()
        course_title = course.title if course else f"Khóa học #{course_id}"

        # 2. Query graded items
        items_stmt = (
            select(LearningItemModel)
            .join(LessonModel, LessonModel.id == LearningItemModel.lesson_id)
            .join(WeekModuleModel, WeekModuleModel.id == LessonModel.week_module_id)
            .where(WeekModuleModel.course_id == course_id)
            .order_by(
                WeekModuleModel.week_number.asc(),
                LessonModel.order_index.asc(),
                LearningItemModel.order_index.asc(),
            )
        )
        items_res = await self.session.execute(items_stmt)
        all_items = items_res.scalars().all()

        graded_types = {
            "GRADED_QUIZ",
            "ITEM_TYPE_GRADED_QUIZ",
            "4",
            "AUTO_GRADED_LAB",
            "CODING_LAB",
            "ITEM_TYPE_CODING_LAB",
            "5",
            "PEER_REVIEW",
            "PEER_ASSIGNMENT",
            "ITEM_TYPE_PEER_REVIEW",
            "6",
        }
        graded_items = [
            item
            for item in all_items
            if getattr(item, "is_graded", False)
            or (item.type and item.type.upper() in graded_types)
            or "GRADED" in (item.type or "").upper()
            or "PEER" in (item.type or "").upper()
            or "LAB" in (item.type or "").upper()
        ]

        graded_item_ids = [item.id for item in graded_items]
        draft_counts_by_item: dict[str, int] = {}
        if graded_item_ids:
            draft_stmt = (
                select(
                    PeerAssignmentSubmissionModel.item_id,
                    func.count(PeerAssignmentSubmissionModel.id),
                )
                .where(
                    PeerAssignmentSubmissionModel.item_id.in_(graded_item_ids),
                    PeerAssignmentSubmissionModel.is_draft.is_(True),
                )
                .group_by(PeerAssignmentSubmissionModel.item_id)
            )
            draft_res = await self.session.execute(draft_stmt)
            for item_id_val, count_val in draft_res.fetchall():
                draft_counts_by_item[str(item_id_val)] = int(count_val)

        num_graded = len(graded_items)
        default_weight = round(1.0 / num_graded, 4) if num_graded > 0 else 0.0

        columns: list[dict[str, Any]] = [
            {
                "item_id": item.id,
                "item_title": item.title,
                "item_type": item.type,
                "weight": default_weight,
                "max_score": 100.0,
                "draft_grades_count": draft_counts_by_item.get(item.id, 0),
            }
            for item in graded_items
        ]
        total_pending_drafts = sum(draft_counts_by_item.values())

        # 3. Query enrolled students
        progress_query = (
            select(LearningProgressModel, UserModel)
            .join(UserModel, UserModel.id == LearningProgressModel.user_id)
            .where(LearningProgressModel.course_id == course_id)
        )

        if search_query and search_query.strip():
            term = f"%{search_query.strip()}%"
            progress_query = progress_query.where(
                or_(
                    UserModel.full_name.ilike(term),
                    UserModel.email.ilike(term),
                )
            )

        total_count_res = await self.session.execute(
            select(func.count(LearningProgressModel.id)).where(
                LearningProgressModel.course_id == course_id
            )
        )
        total_students = total_count_res.scalar() or 0

        offset = int(page_token) if (page_token and page_token.isdigit()) else 0
        limit = max(1, min(page_size, 100))

        progress_query = (
            progress_query.order_by(LearningProgressModel.enrolled_at.desc())
            .offset(offset)
            .limit(limit)
        )
        rows_res = await self.session.execute(progress_query)
        student_progress_rows = rows_res.all()

        user_ids = [row[0].user_id for row in student_progress_rows]

        # 4. Batch query submissions
        quiz_scores: dict[tuple[str, str], float] = {}
        quiz_timestamps: dict[tuple[str, str], str] = {}
        lab_scores: dict[tuple[str, str], float] = {}
        lab_timestamps: dict[tuple[str, str], str] = {}
        peer_submissions_map: dict[tuple[str, str], Any] = {}

        if user_ids and graded_item_ids:
            quiz_stmt = select(QuizSubmissionModel).where(
                QuizSubmissionModel.item_id.in_(graded_item_ids),
                QuizSubmissionModel.user_id.in_(user_ids),
            )
            quiz_rows = (await self.session.execute(quiz_stmt)).scalars().all()
            for q in quiz_rows:
                key = (q.user_id, q.item_id)
                score = float(q.score_percent or 0.0)
                if key not in quiz_scores or score > quiz_scores[key]:
                    quiz_scores[key] = score
                    quiz_timestamps[key] = q.created_at or ""

            lab_stmt = select(LabSubmissionModel).where(
                LabSubmissionModel.item_id.in_(graded_item_ids),
                LabSubmissionModel.user_id.in_(user_ids),
            )
            lab_rows = (await self.session.execute(lab_stmt)).scalars().all()
            for lab in lab_rows:
                key = (lab.user_id, lab.item_id)
                score = float(lab.score_percent or 0.0)
                if key not in lab_scores or score > lab_scores[key]:
                    lab_scores[key] = score
                    lab_timestamps[key] = lab.created_at or ""

            peer_stmt = select(PeerAssignmentSubmissionModel).where(
                PeerAssignmentSubmissionModel.item_id.in_(graded_item_ids),
                PeerAssignmentSubmissionModel.user_id.in_(user_ids),
            )
            peer_rows = (await self.session.execute(peer_stmt)).scalars().all()
            for p_sub in peer_rows:
                key = (p_sub.user_id, p_sub.item_id)
                peer_submissions_map[key] = p_sub

        # 5. Build rows and cells
        rows: list[dict[str, Any]] = []
        for lp, user in student_progress_rows:
            cells: list[dict[str, Any]] = []
            total_weighted_grade = 0.0

            for col in columns:
                item_id_val = str(col["item_id"])
                item_weight = float(col["weight"])
                key: tuple[str, str] = (str(lp.user_id), item_id_val)

                score = 0.0
                is_passed = False
                provenance = "AUTO"
                is_draft = False
                graded_at = ""
                submission_id = ""

                if key in peer_submissions_map:
                    p_sub = peer_submissions_map[key]
                    submission_id = p_sub.id
                    score = float(p_sub.final_score or 0.0)
                    is_passed = score >= 80.0
                    is_draft = bool(p_sub.is_draft)
                    graded_at = p_sub.published_at or p_sub.created_at or ""
                    source = p_sub.grade_source or "PEER_REVIEW"
                    if "INSTRUCTOR" in source.upper():
                        provenance = "INSTRUCTOR"
                    elif "TA" in source.upper():
                        provenance = "TA"
                    else:
                        provenance = "PEER"
                elif key in quiz_scores:
                    score = quiz_scores[key]
                    is_passed = score >= 80.0
                    provenance = "AUTO"
                    is_draft = False
                    graded_at = quiz_timestamps.get(key, "")
                elif key in lab_scores:
                    score = lab_scores[key]
                    is_passed = score >= 80.0
                    provenance = "AUTO"
                    is_draft = False
                    graded_at = lab_timestamps.get(key, "")

                if not is_draft:
                    total_weighted_grade += item_weight * score

                cells.append(
                    {
                        "item_id": item_id_val,
                        "score": round(score, 2),
                        "is_passed": is_passed,
                        "provenance": provenance,
                        "is_draft": is_draft,
                        "graded_at": graded_at,
                        "submission_id": submission_id,
                    }
                )

            final_grade = round(total_weighted_grade, 2)
            is_completed = lp.overall_progress_percent >= 100.0 or final_grade >= 80.0
            enrollment_status = (
                "COMPLETED"
                if is_completed
                else ("IN_PROGRESS" if lp.overall_progress_percent > 0 else "ACTIVE")
            )

            if (
                status_filter
                and status_filter.upper() != "ALL"
                and enrollment_status.upper() != status_filter.upper()
            ):
                continue

            rows.append(
                {
                    "user_id": user.id,
                    "full_name": user.full_name or "Học viên",
                    "email": user.email,
                    "avatar_url": user.avatar_url or "",
                    "enrollment_status": enrollment_status,
                    "final_weighted_grade": final_grade,
                    "is_course_completed": is_completed,
                    "cells": cells,
                }
            )

        next_page_token = (
            str(offset + limit) if (offset + limit) < total_students else ""
        )

        return {
            "course_id": course_id,
            "course_title": course_title,
            "columns": columns,
            "rows": rows,
            "total_students": total_students,
            "next_page_token": next_page_token,
            "pending_draft_count": total_pending_drafts,
        }
