import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.assessment.domain.entities import (
    GradeAppeal,
    HonorCodeAgreement,
    LabSubmission,
    PeerAssignmentSubmission,
    PeerReview,
    Question,
    QuestionBank,
    QuestionOption,
    QuizCooldown,
    QuizMatrix,
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
    QuestionBankModel,
    QuestionModel,
    QuestionOptionModel,
    QuizCooldownModel,
    QuizMatrixModel,
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

    async def create_question_bank(
        self, course_id: str, title: str, category: str, description: str
    ) -> QuestionBank:
        now_str = datetime.now(timezone.utc).isoformat()
        bank_id = f"qbank-{uuid.uuid4().hex[:8]}"
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
    ) -> Question:
        now_str = datetime.now(timezone.utc).isoformat()
        q_id = f"q-{uuid.uuid4().hex[:8]}"
        q_model = QuestionModel(
            id=q_id,
            bank_id=bank_id,
            text=text,
            question_type=question_type or "SINGLE_CHOICE",
            difficulty=difficulty or "EASY",
            explanation=explanation or "",
            created_at=now_str,
        )
        self.session.add(q_model)
        await self.session.flush()

        domain_options = []
        for idx, opt in enumerate(options_data):
            opt_id = f"opt-{uuid.uuid4().hex[:8]}"
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

        q_model.options.clear()

        domain_options = []
        for idx, opt in enumerate(options_data):
            opt_id = f"opt-{uuid.uuid4().hex[:8]}"
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

        await self.session.commit()
        return Question(
            id=q_model.id,
            bank_id=q_model.bank_id,
            text=q_model.text,
            question_type=q_model.question_type,
            difficulty=q_model.difficulty,
            explanation=q_model.explanation,
            options=domain_options,
            created_at=q_model.created_at or datetime.now(timezone.utc).isoformat(),
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

    async def get_quiz_matrix(self, item_id: str) -> Optional[QuizMatrix]:
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

    async def get_questions_by_bank(self, bank_id: str) -> list[Question]:
        stmt = (
            select(QuestionModel)
            .options(selectinload(QuestionModel.options))
            .where(QuestionModel.bank_id == bank_id)
            .order_by(QuestionModel.id)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()

        questions = []
        for q in models:
            questions.append(
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
            )
        return questions
