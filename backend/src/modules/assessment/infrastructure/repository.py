from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import and_, case, func, or_, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from uuid6 import uuid7

from src.modules.assessment.domain import (
    ADMIN_ASSESSMENT_ALERT_LIMIT,
    DEFAULT_PASSING_THRESHOLD_PERCENT,
    GRADING_LOCK_TIMEOUT_MINUTES,
    PEER_ASSIGNMENT_STATUS_ASSIGNED,
    PEER_SUBMISSION_STATUS_PUBLISHED,
    PENDING_APPEAL_STATUSES,
    REPORT_STATUS_RESOLVED,
    REQUIRED_PEER_REVIEWS_COUNT,
    AdminAssessmentAlert,
    AdminAssessmentAlertKind,
    AssessmentRepositoryInterface,
    GradeAppeal,
    HonorCodeAgreement,
    LabSubmission,
    PeerAssignmentSubmission,
    PeerReview,
    PeerReviewAssignment,
    PeerReviewReport,
    Question,
    QuestionBank,
    QuestionOption,
    QuizActiveSession,
    QuizCooldown,
    QuizMatrix,
    QuizSubmission,
    QuizSubmissionAnswer,
    RubricCriteria,
    normalize_grade_provenance,
    resolve_peer_effective_grade,
)
from src.modules.assessment.infrastructure.models import (
    GradeAppealModel,
    HonorCodeModel,
    LabSubmissionModel,
    PeerAssignmentSubmissionModel,
    PeerReviewAssignmentModel,
    PeerReviewModel,
    PeerReviewReportModel,
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
        exp_at = (
            model.lock_expires_at.isoformat()
            if model.lock_expires_at is not None
            else None
        )
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
            lock_expires_at=exp_at,
            rubric_scores_json=model.rubric_scores_json,
            published_at=model.published_at,
            status=model.status,
            staff_evaluations_json=list(model.staff_evaluations_json or []),
            review_duty_status=getattr(model, "review_duty_status", "PENDING")
            or "PENDING",
            review_duty_waived_reason=getattr(model, "review_duty_waived_reason", None),
            previous_best_score=getattr(model, "previous_best_score", None),
            previous_best_grade_source=getattr(
                model, "previous_best_grade_source", None
            ),
            previous_best_published_at=getattr(
                model, "previous_best_published_at", None
            ),
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

        exp_dt = None
        if submission.lock_expires_at:
            try:
                exp_dt = datetime.fromisoformat(submission.lock_expires_at)
            except (ValueError, TypeError):
                exp_dt = None

        if model:
            model.submission_url = submission.submission_url
            model.text_content = submission.text_content
            model.created_at = submission.created_at
            model.final_score = submission.final_score
            model.graded_by_staff = submission.graded_by_staff
            model.attempt_number = submission.attempt_number
            model.staff_feedback = submission.staff_feedback
            model.graded_by_user_id = submission.graded_by_user_id
            model.grader_role = submission.grader_role
            model.grade_source = submission.grade_source
            model.locked_by_user_id = submission.locked_by_user_id
            model.locked_at = submission.locked_at
            model.lock_expires_at = exp_dt
            model.rubric_scores_json = submission.rubric_scores_json
            model.published_at = submission.published_at
            model.status = submission.status
            model.review_duty_status = (
                getattr(submission, "review_duty_status", "PENDING") or "PENDING"
            )
            model.review_duty_waived_reason = getattr(
                submission, "review_duty_waived_reason", None
            )
            model.previous_best_score = getattr(submission, "previous_best_score", None)
            model.previous_best_grade_source = getattr(
                submission, "previous_best_grade_source", None
            )
            model.previous_best_published_at = getattr(
                submission, "previous_best_published_at", None
            )
            model.staff_evaluations_json = list(submission.staff_evaluations_json or [])
            flag_modified(model, "staff_evaluations_json")
            flag_modified(model, "rubric_scores_json")
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
                lock_expires_at=exp_dt,
                rubric_scores_json=submission.rubric_scores_json,
                published_at=submission.published_at,
                status=submission.status,
                review_duty_status=getattr(submission, "review_duty_status", "PENDING")
                or "PENDING",
                review_duty_waived_reason=getattr(
                    submission, "review_duty_waived_reason", None
                ),
                previous_best_score=getattr(submission, "previous_best_score", None),
                previous_best_grade_source=getattr(
                    submission, "previous_best_grade_source", None
                ),
                previous_best_published_at=getattr(
                    submission, "previous_best_published_at", None
                ),
                staff_evaluations_json=list(submission.staff_evaluations_json or []),
            )
            self.session.add(model)
        await self.session.flush()

    async def get_peer_submission(
        self, submission_id: str
    ) -> PeerAssignmentSubmission | None:
        model = await self.session.get(PeerAssignmentSubmissionModel, submission_id)
        if not model:
            return None
        return self._to_peer_submission_entity(model)

    async def get_peer_submission_for_update(
        self, submission_id: str
    ) -> PeerAssignmentSubmission | None:
        stmt = (
            select(PeerAssignmentSubmissionModel)
            .where(PeerAssignmentSubmissionModel.id == submission_id)
            .with_for_update()
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
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

    async def get_learning_item_details(self, item_id: str) -> dict[str, Any] | None:
        from src.modules.catalog.infrastructure.models import LearningItemModel

        stmt = select(LearningItemModel).where(LearningItemModel.id == item_id)
        res = await self.session.execute(stmt)
        item = res.scalar_one_or_none()
        if not item:
            return None
        return {
            "id": item.id,
            "title": item.title,
            "item_type": getattr(item.type, "value", str(item.type)),
            "reading_markdown": item.reading_markdown or "",
            "rubric_criteria_json": item.rubric_criteria_json or "",
            "essay_grading_mode": getattr(item, "essay_grading_mode", "PEER_REVIEW")
            or "PEER_REVIEW",
            "required_peer_reviews": int(
                getattr(item, "required_peer_reviews", 3) or 3
            ),
            "cold_start_hours": int(getattr(item, "cold_start_hours", 48) or 48),
            "essay_max_attempts": int(getattr(item, "essay_max_attempts", 3) or 3),
        }

    async def count_user_completed_reviews(
        self, item_id: str, reviewer_user_id: str
    ) -> int:
        stmt = select(func.count(PeerReviewModel.id)).where(
            PeerReviewModel.item_id == item_id,
            PeerReviewModel.reviewer_user_id == reviewer_user_id,
        )
        res = await self.session.execute(stmt)
        return int(res.scalar() or 0)

    async def count_available_pool_submissions(
        self, item_id: str, reviewer_user_id: str
    ) -> int:
        already_reviewed_current_attempt = (
            select(PeerReviewModel.id)
            .where(
                PeerReviewModel.submission_id == PeerAssignmentSubmissionModel.id,
                PeerReviewModel.reviewer_user_id == reviewer_user_id,
                PeerReviewModel.item_id == item_id,
                PeerReviewModel.submission_attempt_number
                == PeerAssignmentSubmissionModel.attempt_number,
            )
            .exists()
        )
        stmt = select(func.count(PeerAssignmentSubmissionModel.id)).where(
            PeerAssignmentSubmissionModel.item_id == item_id,
            PeerAssignmentSubmissionModel.user_id != reviewer_user_id,
            ~already_reviewed_current_attempt,
        )
        res = await self.session.execute(stmt)
        return int(res.scalar() or 0)

    async def get_eligible_peer_submissions_to_review(
        self, item_id: str, reviewer_user_id: str, limit: int = 3
    ) -> list[PeerAssignmentSubmission]:
        now = datetime.now(UTC)
        already_reviewed_current_attempt = (
            select(PeerReviewModel.id)
            .where(
                PeerReviewModel.submission_id == PeerAssignmentSubmissionModel.id,
                PeerReviewModel.reviewer_user_id == reviewer_user_id,
                PeerReviewModel.item_id == item_id,
                PeerReviewModel.submission_attempt_number
                == PeerAssignmentSubmissionModel.attempt_number,
            )
            .exists()
        )
        reviews_count_sub = (
            select(func.count(PeerReviewModel.id))
            .where(
                PeerReviewModel.submission_id == PeerAssignmentSubmissionModel.id,
                PeerReviewModel.submission_attempt_number
                == PeerAssignmentSubmissionModel.attempt_number,
            )
            .scalar_subquery()
        )
        held_by_reviewer_priority = case(
            (PeerAssignmentSubmissionModel.locked_by_user_id == reviewer_user_id, 0),
            else_=1,
        )
        grade_tier_priority = case(
            (
                and_(
                    PeerAssignmentSubmissionModel.graded_by_staff.is_(False),
                    PeerAssignmentSubmissionModel.status
                    != PEER_SUBMISSION_STATUS_PUBLISHED,
                ),
                0,
            ),
            (
                PeerAssignmentSubmissionModel.graded_by_staff.is_(False),
                1,
            ),
            else_=2,
        )
        stmt = (
            select(PeerAssignmentSubmissionModel)
            .where(
                PeerAssignmentSubmissionModel.item_id == item_id,
                PeerAssignmentSubmissionModel.user_id != reviewer_user_id,
                ~already_reviewed_current_attempt,
                or_(
                    PeerAssignmentSubmissionModel.locked_by_user_id.is_(None),
                    PeerAssignmentSubmissionModel.locked_by_user_id == reviewer_user_id,
                    PeerAssignmentSubmissionModel.lock_expires_at < now,
                    and_(
                        PeerAssignmentSubmissionModel.lock_expires_at.is_(None),
                        PeerAssignmentSubmissionModel.locked_at
                        < (
                            now - timedelta(minutes=GRADING_LOCK_TIMEOUT_MINUTES)
                        ).isoformat(),
                    ),
                ),
            )
            .order_by(
                held_by_reviewer_priority.asc(),
                grade_tier_priority.asc(),
                reviews_count_sub.asc(),
                PeerAssignmentSubmissionModel.created_at.asc(),
            )
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_peer_submission_entity(m) for m in models]

    async def claim_submission_lock(
        self,
        submission_id: str,
        user_id: str,
        timeout_minutes: int = GRADING_LOCK_TIMEOUT_MINUTES,
        allow_extend_own: bool = True,
    ) -> bool:
        now = datetime.now(UTC)
        lock_expires = now + timedelta(minutes=timeout_minutes)
        lock_conditions: list[Any] = [
            PeerAssignmentSubmissionModel.locked_by_user_id.is_(None),
            PeerAssignmentSubmissionModel.lock_expires_at < now,
            and_(
                PeerAssignmentSubmissionModel.lock_expires_at.is_(None),
                PeerAssignmentSubmissionModel.locked_at
                < (now - timedelta(minutes=timeout_minutes)).isoformat(),
            ),
        ]
        if allow_extend_own:
            lock_conditions.append(
                PeerAssignmentSubmissionModel.locked_by_user_id == user_id
            )
        stmt = (
            update(PeerAssignmentSubmissionModel)
            .where(
                PeerAssignmentSubmissionModel.id == submission_id,
                PeerAssignmentSubmissionModel.user_id != user_id,
                or_(*lock_conditions),
            )
            .values(
                locked_by_user_id=user_id,
                locked_at=now.isoformat(),
                lock_expires_at=lock_expires,
            )
        )
        res = await self.session.execute(stmt)
        await self.session.flush()
        return int(getattr(res, "rowcount", 0) or 0) > 0

    async def renew_submission_lock(
        self,
        submission_id: str,
        user_id: str,
        timeout_minutes: int = GRADING_LOCK_TIMEOUT_MINUTES,
    ) -> bool:
        sub = await self.session.get(PeerAssignmentSubmissionModel, submission_id)
        if not sub or sub.locked_by_user_id != user_id:
            return False

        now = datetime.now(UTC)
        new_expires = now + timedelta(minutes=timeout_minutes)

        sub.locked_at = now.isoformat()
        sub.lock_expires_at = new_expires
        await self.session.flush()
        return True

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
                lock_expires_at=None,
            )
        )
        res = await self.session.execute(stmt)
        await self.session.flush()
        return int(getattr(res, "rowcount", 0) or 0) > 0

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
        stmt = select(PeerReviewModel).where(
            PeerReviewModel.submission_id == review.submission_id,
            PeerReviewModel.reviewer_user_id == review.reviewer_user_id,
            PeerReviewModel.submission_attempt_number
            == review.submission_attempt_number,
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if model:
            model.rubric_criteria_json = {"items": rubric_data}
            model.total_score = review.total_score
            model.is_outlier = review.is_outlier
        else:
            review_id = (
                review.id
                if review.id and review.id != f"rev-{review.submission_id}"
                else f"rev-{uuid7().hex}"
            )
            model = PeerReviewModel(
                id=review_id,
                submission_id=review.submission_id,
                reviewer_user_id=review.reviewer_user_id,
                item_id=review.item_id,
                submission_attempt_number=review.submission_attempt_number,
                rubric_criteria_json={"items": rubric_data},
                total_score=review.total_score,
                is_outlier=review.is_outlier,
                created_at=review.created_at or "",
            )
            self.session.add(model)
        await self.session.flush()

    @staticmethod
    def _to_peer_review_assignment_entity(
        model: PeerReviewAssignmentModel,
    ) -> PeerReviewAssignment:
        exp_iso = (
            model.expires_at.isoformat()
            if isinstance(model.expires_at, datetime)
            else str(model.expires_at)
        )
        return PeerReviewAssignment(
            id=model.id,
            submission_id=model.submission_id,
            reviewer_user_id=model.reviewer_user_id,
            item_id=model.item_id,
            assigned_at=model.assigned_at,
            expires_at=exp_iso,
            status=model.status,
            submission_attempt_number=getattr(model, "submission_attempt_number", 1)
            or 1,
        )

    async def create_or_get_peer_review_assignment(
        self,
        submission_id: str,
        reviewer_user_id: str,
        item_id: str,
        assigned_at: str,
        expires_at: str,
        submission_attempt_number: int = 1,
    ) -> PeerReviewAssignment:
        stmt = select(PeerReviewAssignmentModel).where(
            PeerReviewAssignmentModel.submission_id == submission_id,
            PeerReviewAssignmentModel.reviewer_user_id == reviewer_user_id,
            PeerReviewAssignmentModel.submission_attempt_number
            == submission_attempt_number,
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()

        now = datetime.now(UTC)
        exp_dt = datetime.fromisoformat(expires_at)
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=UTC)

        if model:
            existing_exp = model.expires_at
            if existing_exp.tzinfo is None:
                existing_exp = existing_exp.replace(tzinfo=UTC)
            if model.status == PEER_ASSIGNMENT_STATUS_ASSIGNED and existing_exp <= now:
                # Rotate expired assignment token so stale review_ids cannot be replayed.
                model.id = f"rev-{uuid7().hex}"
                model.assigned_at = assigned_at
                model.expires_at = exp_dt
            elif model.status != PEER_ASSIGNMENT_STATUS_ASSIGNED:
                model.status = PEER_ASSIGNMENT_STATUS_ASSIGNED
                model.assigned_at = assigned_at
                model.expires_at = exp_dt
            # When status is already ASSIGNED and existing_exp > now, preserve original assigned_at & expires_at
            # to prevent infinite soft-lock renewal via repeated GetPeerReviewsToGrade polling.
        else:
            model = PeerReviewAssignmentModel(
                id=f"rev-{uuid7().hex}",
                submission_id=submission_id,
                reviewer_user_id=reviewer_user_id,
                item_id=item_id,
                submission_attempt_number=submission_attempt_number,
                status=PEER_ASSIGNMENT_STATUS_ASSIGNED,
                assigned_at=assigned_at,
                expires_at=exp_dt,
            )
            self.session.add(model)

        await self.session.flush()
        return self._to_peer_review_assignment_entity(model)

    async def get_peer_review_assignment(
        self, assignment_id: str, reviewer_user_id: str
    ) -> PeerReviewAssignment | None:
        stmt = select(PeerReviewAssignmentModel).where(
            PeerReviewAssignmentModel.id == assignment_id,
            PeerReviewAssignmentModel.reviewer_user_id == reviewer_user_id,
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return self._to_peer_review_assignment_entity(model)

    async def save_peer_review_assignment(
        self, assignment: PeerReviewAssignment
    ) -> None:
        model = await self.session.get(PeerReviewAssignmentModel, assignment.id)
        exp_dt = datetime.fromisoformat(assignment.expires_at)
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=UTC)
        if model:
            model.status = assignment.status
            model.assigned_at = assignment.assigned_at
            model.expires_at = exp_dt
        else:
            model = PeerReviewAssignmentModel(
                id=assignment.id,
                submission_id=assignment.submission_id,
                reviewer_user_id=assignment.reviewer_user_id,
                item_id=assignment.item_id,
                submission_attempt_number=assignment.submission_attempt_number,
                status=assignment.status,
                assigned_at=assignment.assigned_at,
                expires_at=exp_dt,
            )
            self.session.add(model)
        await self.session.flush()

    @staticmethod
    def _to_peer_review_entity(model: PeerReviewModel) -> PeerReview:
        raw_rc = model.rubric_criteria_json or {}
        items: list[Any] = []
        if isinstance(raw_rc, dict):
            if "items" in raw_rc and isinstance(raw_rc["items"], list):
                items = raw_rc["items"]
            else:
                items = [
                    {"criteria_id": k, "score_given": float(v)}
                    for k, v in raw_rc.items()
                    if isinstance(v, (int, float))
                ]
        elif isinstance(raw_rc, list):
            items = raw_rc

        criteria = [
            RubricCriteria(
                criteria_id=str(c.get("criteria_id", "") or ""),
                title=str(c.get("title", "") or ""),
                max_score=float(c.get("max_score", 10.0) or 10.0),
                score_given=float(c.get("score_given", 0.0) or 0.0),
                feedback=str(c.get("feedback", "") or ""),
            )
            for c in items
            if isinstance(c, dict)
        ]
        return PeerReview(
            id=model.id,
            submission_id=model.submission_id,
            reviewer_user_id=model.reviewer_user_id,
            item_id=model.item_id,
            rubric_criteria=criteria,
            total_score=model.total_score,
            is_outlier=model.is_outlier,
            created_at=model.created_at,
            submission_attempt_number=getattr(model, "submission_attempt_number", 1)
            or 1,
        )

    async def get_peer_reviews_by_reviewer(
        self, reviewer_user_id: str, item_id: str
    ) -> list[PeerReview]:
        stmt = select(PeerReviewModel).where(
            PeerReviewModel.reviewer_user_id == reviewer_user_id,
            PeerReviewModel.item_id == item_id,
        )
        res = await self.session.execute(stmt)
        return [self._to_peer_review_entity(m) for m in res.scalars().all()]

    async def get_peer_reviews_for_submission(
        self, submission_id: str, attempt_number: int | None = None
    ) -> list[PeerReview]:
        stmt = select(PeerReviewModel).where(
            PeerReviewModel.submission_id == submission_id
        )
        if attempt_number is not None:
            stmt = stmt.where(
                PeerReviewModel.submission_attempt_number == attempt_number
            )
        res = await self.session.execute(stmt)
        return [self._to_peer_review_entity(m) for m in res.scalars().all()]

    async def get_peer_review_by_id(self, review_id: str) -> PeerReview | None:
        model = await self.session.get(PeerReviewModel, review_id)
        if not model:
            return None
        return self._to_peer_review_entity(model)

    @staticmethod
    def _to_peer_review_report_entity(model: PeerReviewReportModel) -> PeerReviewReport:
        return PeerReviewReport(
            id=model.id,
            peer_review_id=model.peer_review_id,
            submission_id=model.submission_id,
            reporter_user_id=model.reporter_user_id,
            reason=model.reason,
            status=model.status,
            created_at=model.created_at,
            reviewer_id=model.reviewer_id,
            resolution_notes=model.resolution_notes,
        )

    async def save_peer_review_report(self, report: PeerReviewReport) -> None:
        model = await self.session.get(PeerReviewReportModel, report.id)
        if model:
            model.status = report.status
            model.reason = report.reason
            model.reviewer_id = report.reviewer_id
            model.resolution_notes = report.resolution_notes
        else:
            model = PeerReviewReportModel(
                id=report.id,
                peer_review_id=report.peer_review_id,
                submission_id=report.submission_id,
                reporter_user_id=report.reporter_user_id,
                reason=report.reason,
                status=report.status,
                created_at=report.created_at or "",
                reviewer_id=report.reviewer_id,
                resolution_notes=report.resolution_notes,
            )
            self.session.add(model)
        await self.session.flush()

    async def get_peer_review_report_by_user_and_review(
        self, reporter_user_id: str, peer_review_id: str
    ) -> PeerReviewReport | None:
        stmt = select(PeerReviewReportModel).where(
            PeerReviewReportModel.reporter_user_id == reporter_user_id,
            PeerReviewReportModel.peer_review_id == peer_review_id,
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if not model:
            return None
        return self._to_peer_review_report_entity(model)

    async def get_pending_peer_review_reports_for_submission(
        self, submission_id: str
    ) -> list[PeerReviewReport]:
        stmt = select(PeerReviewReportModel).where(
            PeerReviewReportModel.submission_id == submission_id,
            PeerReviewReportModel.status.in_(PENDING_APPEAL_STATUSES),
        )
        res = await self.session.execute(stmt)
        return [self._to_peer_review_report_entity(m) for m in res.scalars().all()]

    async def resolve_pending_peer_review_reports_for_submission(
        self, submission_id: str, reviewer_id: str, resolution_notes: str = ""
    ) -> None:
        stmt = (
            update(PeerReviewReportModel)
            .where(
                PeerReviewReportModel.submission_id == submission_id,
                PeerReviewReportModel.status.in_(PENDING_APPEAL_STATUSES),
            )
            .values(
                status=REPORT_STATUS_RESOLVED,
                reviewer_id=reviewer_id,
                resolution_notes=resolution_notes or None,
            )
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def save_grade_appeal(self, appeal: GradeAppeal) -> None:
        model = await self.session.get(GradeAppealModel, appeal.id)
        if model:
            model.status = appeal.status
            model.appeal_reason = appeal.appeal_reason
            model.reviewer_id = appeal.reviewer_id
            model.final_score = appeal.final_score
            model.rejection_reason = appeal.rejection_reason
        else:
            model = GradeAppealModel(
                id=appeal.id,
                user_id=appeal.user_id,
                submission_id=appeal.submission_id,
                appeal_reason=appeal.appeal_reason,
                status=appeal.status,
                created_at=appeal.created_at or "",
                reviewer_id=appeal.reviewer_id,
                final_score=appeal.final_score,
                rejection_reason=appeal.rejection_reason,
            )
            self.session.add(model)
        await self.session.flush()

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
            reviewer_id=model.reviewer_id,
            final_score=model.final_score,
            rejection_reason=model.rejection_reason,
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

    async def get_course_id_by_bank_id(self, bank_id: str) -> str | None:
        stmt = select(QuestionBankModel.course_id).where(
            QuestionBankModel.id == bank_id
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_course_id_by_question_id(self, question_id: str) -> str | None:
        stmt = (
            select(QuestionBankModel.course_id)
            .join(QuestionModel, QuestionModel.bank_id == QuestionBankModel.id)
            .where(QuestionModel.id == question_id)
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

    async def get_item_rubric_criteria_json(self, item_id: str) -> str | None:
        from src.modules.catalog.infrastructure.models import LearningItemModel

        stmt = select(LearningItemModel.rubric_criteria_json).where(
            LearningItemModel.id == item_id
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_item_reading_markdown(self, item_id: str) -> str:
        from src.modules.catalog.infrastructure.models import LearningItemModel

        stmt = select(LearningItemModel.reading_markdown).where(
            LearningItemModel.id == item_id
        )
        res = await self.session.execute(stmt)
        val = res.scalar_one_or_none()
        return val or ""

    async def list_grading_queue_items(
        self,
        course_id: str = "",
        item_id: str = "",
    ) -> list[dict[str, Any]]:
        from src.modules.catalog.infrastructure.models import (
            CourseModel,
            LearningItemModel,
            LessonModel,
            WeekModuleModel,
        )
        from src.modules.identity.infrastructure.models import UserModel

        stmt = (
            select(
                PeerAssignmentSubmissionModel,
                LearningItemModel.title.label("item_title"),
                CourseModel.id.label("course_id"),
                CourseModel.title.label("course_title"),
                UserModel.full_name.label("student_name"),
                UserModel.avatar_url.label("student_avatar_url"),
                LearningItemModel.essay_grading_mode.label("essay_grading_mode"),
                LearningItemModel.required_peer_reviews.label("required_peer_reviews"),
                LearningItemModel.cold_start_hours.label("cold_start_hours"),
            )
            .join(
                LearningItemModel,
                LearningItemModel.id == PeerAssignmentSubmissionModel.item_id,
            )
            .join(LessonModel, LessonModel.id == LearningItemModel.lesson_id)
            .join(WeekModuleModel, WeekModuleModel.id == LessonModel.week_module_id)
            .join(CourseModel, CourseModel.id == WeekModuleModel.course_id)
            .join(UserModel, UserModel.id == PeerAssignmentSubmissionModel.user_id)
        )
        if course_id:
            stmt = stmt.where(CourseModel.id == course_id)
        elif item_id:
            stmt = stmt.where(PeerAssignmentSubmissionModel.item_id == item_id)
        else:
            return []

        if item_id and course_id:
            stmt = stmt.where(PeerAssignmentSubmissionModel.item_id == item_id)

        stmt = stmt.order_by(PeerAssignmentSubmissionModel.created_at.desc())
        res = await self.session.execute(stmt)
        rows = res.all()

        results: list[dict[str, Any]] = []
        if not rows:
            return results

        now = datetime.now(UTC)
        sub_ids = [row[0].id for row in rows]
        locked_user_ids = {
            row[0].locked_by_user_id for row in rows if row[0].locked_by_user_id
        }

        # Batch 1: Query user names for locked submissions
        user_names: dict[str, str] = {}
        if locked_user_ids:
            user_stmt = select(UserModel.id, UserModel.full_name).where(
                UserModel.id.in_(locked_user_ids)
            )
            u_res = await self.session.execute(user_stmt)
            user_names = {uid: name for uid, name in u_res.all() if name}

        # Batch 2: Query appeals and pending peer review reports for submissions
        appeal_stmt = select(GradeAppealModel).where(
            GradeAppealModel.submission_id.in_(sub_ids)
        )
        app_res = await self.session.execute(appeal_stmt)
        appeals_map: dict[str, GradeAppealModel] = {
            app.submission_id: app for app in app_res.scalars().all()
        }

        report_stmt = select(PeerReviewReportModel).where(
            PeerReviewReportModel.submission_id.in_(sub_ids),
            PeerReviewReportModel.status.in_(PENDING_APPEAL_STATUSES),
        )
        rep_res = await self.session.execute(report_stmt)
        reports_map: dict[str, list[PeerReviewReportModel]] = defaultdict(list)
        for rep in rep_res.scalars().all():
            reports_map[rep.submission_id].append(rep)

        # Batch 3: Query peer reviews for submissions
        rev_stmt = select(PeerReviewModel).where(
            PeerReviewModel.submission_id.in_(sub_ids)
        )
        rev_res = await self.session.execute(rev_stmt)
        reviews_map: dict[str, list[PeerReviewModel]] = defaultdict(list)
        for rev in rev_res.scalars().all():
            reviews_map[rev.submission_id].append(rev)

        for row in rows:
            sub = row[0]
            item_title = row[1] or ""
            c_id = row[2] or ""
            c_title = row[3] or ""
            student_name = row[4] or ""
            student_avatar_url = row[5] or ""
            essay_grading_mode = row[6] or "PEER_REVIEW"
            required_peer_reviews = int(row[7] or REQUIRED_PEER_REVIEWS_COUNT)
            cold_start_hours = int(row[8] or 48)

            # Check locker name and lock expiration
            locked_by_name = ""
            lock_expires_at = ""
            is_currently_locked = False
            if sub.locked_by_user_id:
                exp_dt = sub.lock_expires_at
                if not exp_dt and sub.locked_at:
                    try:
                        lock_dt = datetime.fromisoformat(sub.locked_at)
                        if lock_dt.tzinfo is None:
                            lock_dt = lock_dt.replace(tzinfo=UTC)
                        exp_dt = lock_dt + timedelta(
                            minutes=GRADING_LOCK_TIMEOUT_MINUTES
                        )
                    except (ValueError, TypeError):
                        exp_dt = None
                if exp_dt:
                    if exp_dt.tzinfo is None:
                        exp_dt = exp_dt.replace(tzinfo=UTC)
                    if now < exp_dt:
                        is_currently_locked = True
                        lock_expires_at = exp_dt.isoformat()
                        locked_by_name = (
                            user_names.get(sub.locked_by_user_id)
                            or sub.locked_by_user_id
                        )

            # Check appeals & pending peer review reports
            appeal = appeals_map.get(sub.id)
            pending_reports = reports_map.get(sub.id, [])
            has_unresolved_appeal = bool(appeal and appeal.status != "RESOLVED")
            is_appeal = has_unresolved_appeal or bool(pending_reports)
            if has_unresolved_appeal and appeal:
                appeal_reason = appeal.appeal_reason
            elif pending_reports:
                appeal_reason = f"[REPORT_REVIEW:{pending_reports[0].peer_review_id}] {pending_reports[0].reason}"
            else:
                appeal_reason = ""

            # Check reviews for the submission's current attempt
            current_attempt = getattr(sub, "attempt_number", 1) or 1
            reviews = [
                r
                for r in reviews_map.get(sub.id, [])
                if (getattr(r, "submission_attempt_number", 1) or 1) == current_attempt
            ]
            reviews_count = len(reviews)
            is_outlier = (
                essay_grading_mode == "PEER_REVIEW"
                and reviews_count >= required_peer_reviews
                and any(r.is_outlier for r in reviews)
            )
            peer_score = (
                round(sum(r.total_score for r in reviews) / reviews_count, 2)
                if reviews_count > 0
                else 0.0
            )

            # Determine status
            if is_currently_locked:
                status_str = "CLAIMED"
            elif is_appeal:
                status_str = "APPEALED"
            elif sub.status == "PUBLISHED" or (
                sub.final_score is not None and sub.status != "SUBMITTED"
            ):
                status_str = "GRADED"
            else:
                status_str = "PENDING"

            results.append(
                {
                    "submission_id": sub.id,
                    "item_id": sub.item_id,
                    "item_title": item_title,
                    "course_id": c_id,
                    "course_title": c_title,
                    "student_id": sub.user_id,
                    "student_name": student_name,
                    "student_avatar_url": student_avatar_url,
                    "submitted_at": sub.created_at,
                    "is_outlier": is_outlier,
                    "is_appeal": is_appeal,
                    "appeal_reason": appeal_reason,
                    "locked_by_user_id": sub.locked_by_user_id or ""
                    if is_currently_locked
                    else "",
                    "locked_by_name": locked_by_name,
                    "lock_expires_at": lock_expires_at,
                    "grade_source": (
                        sub.grade_source
                        if (sub.final_score is not None and sub.status != "SUBMITTED")
                        else ("PEER_REVIEW" if is_appeal and peer_score > 0 else None)
                    ),
                    "staff_score": (
                        float(sub.final_score)
                        if sub.final_score is not None
                        and sub.graded_by_staff
                        and sub.status != "SUBMITTED"
                        else 0.0
                    ),
                    "status": status_str,
                    "peer_score": (
                        float(peer_score)
                        if (
                            (sub.final_score is not None and sub.status != "SUBMITTED")
                            or is_appeal
                        )
                        else 0.0
                    ),
                    "peer_reviews_count": reviews_count,
                    "essay_grading_mode": essay_grading_mode,
                    "required_peer_reviews": required_peer_reviews,
                    "cold_start_hours": cold_start_hours,
                }
            )
        return results

    async def get_user_display_profiles(
        self, user_ids: list[str]
    ) -> dict[str, dict[str, str]]:
        if not user_ids:
            return {}
        from src.modules.identity.infrastructure.models import UserModel

        stmt = select(
            UserModel.id, UserModel.full_name, UserModel.avatar_url, UserModel.role
        ).where(UserModel.id.in_(user_ids))
        res = await self.session.execute(stmt)
        return {
            uid: {
                "name": fname or "",
                "avatar_url": avurl or "",
                "role": urole.value if hasattr(urole, "value") else str(urole or ""),
            }
            for uid, fname, avurl, urole in res.all()
        }

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
        num_graded = len(graded_items)
        default_weight = round(1.0 / num_graded, 4) if num_graded > 0 else 0.0

        columns: list[dict[str, Any]] = [
            {
                "item_id": item.id,
                "item_title": item.title,
                "item_type": item.type,
                "weight": default_weight,
                "max_score": 100.0,
            }
            for item in graded_items
        ]

        # 3. Query enrolled students
        progress_query = (
            select(LearningProgressModel, UserModel)
            .join(UserModel, UserModel.id == LearningProgressModel.user_id)
            .where(LearningProgressModel.course_id == course_id)
        )
        count_query = (
            select(func.count(LearningProgressModel.id))
            .select_from(LearningProgressModel)
            .join(UserModel, UserModel.id == LearningProgressModel.user_id)
            .where(LearningProgressModel.course_id == course_id)
        )

        if search_query and search_query.strip():
            term = f"%{search_query.strip()}%"
            filter_search = or_(
                UserModel.full_name.ilike(term),
                UserModel.email.ilike(term),
            )
            progress_query = progress_query.where(filter_search)
            count_query = count_query.where(filter_search)

        if status_filter and status_filter.upper() != "ALL":
            sf = status_filter.upper()
            if sf == "COMPLETED":
                filter_status = LearningProgressModel.completed_at.isnot(None)
            elif sf == "IN_PROGRESS":
                filter_status = and_(
                    LearningProgressModel.overall_progress_percent > 0.0,
                    LearningProgressModel.completed_at.is_(None),
                )
            elif sf == "ACTIVE":
                filter_status = and_(
                    LearningProgressModel.overall_progress_percent == 0.0,
                    LearningProgressModel.completed_at.is_(None),
                )
            else:
                filter_status = None

            if filter_status is not None:
                progress_query = progress_query.where(filter_status)
                count_query = count_query.where(filter_status)

        total_count_res = await self.session.execute(count_query)
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
        quiz_thresholds: dict[str, float] = {}
        lab_scores: dict[tuple[str, str], float] = {}
        lab_timestamps: dict[tuple[str, str], str] = {}
        peer_submissions_map: dict[tuple[str, str], Any] = {}

        if graded_item_ids:
            matrix_stmt = select(
                QuizMatrixModel.item_id, QuizMatrixModel.passing_threshold_percent
            ).where(QuizMatrixModel.item_id.in_(graded_item_ids))
            matrix_rows = (await self.session.execute(matrix_stmt)).all()
            quiz_thresholds = {
                str(mid): float(thresh)
                for mid, thresh in matrix_rows
                if thresh is not None
            }

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
                graded_at = ""
                submission_id = ""

                if key in peer_submissions_map:
                    p_sub = peer_submissions_map[key]
                    submission_id = p_sub.id
                    eff_score, eff_source, eff_pub_at = resolve_peer_effective_grade(
                        status=p_sub.status,
                        final_score=p_sub.final_score,
                        grade_source=p_sub.grade_source,
                        published_at=p_sub.published_at,
                        previous_best_score=getattr(p_sub, "previous_best_score", None),
                        previous_best_grade_source=getattr(
                            p_sub, "previous_best_grade_source", None
                        ),
                        previous_best_published_at=getattr(
                            p_sub, "previous_best_published_at", None
                        ),
                    )
                    if eff_score is not None:
                        score = float(eff_score)
                        is_passed = score >= DEFAULT_PASSING_THRESHOLD_PERCENT
                        graded_at = eff_pub_at or p_sub.created_at or ""
                        provenance = normalize_grade_provenance(eff_source) or "PEER"
                    else:
                        score = 0.0
                        is_passed = False
                        graded_at = ""
                        provenance = "PEER"
                elif key in quiz_scores:
                    score = quiz_scores[key]
                    item_threshold = quiz_thresholds.get(
                        item_id_val, DEFAULT_PASSING_THRESHOLD_PERCENT
                    )
                    is_passed = score >= item_threshold
                    provenance = "AUTO"
                    graded_at = quiz_timestamps.get(key, "")
                elif key in lab_scores:
                    score = lab_scores[key]
                    is_passed = score >= DEFAULT_PASSING_THRESHOLD_PERCENT
                    provenance = "AUTO"
                    graded_at = lab_timestamps.get(key, "")

                total_weighted_grade += item_weight * score

                cells.append(
                    {
                        "item_id": item_id_val,
                        "score": round(score, 2),
                        "is_passed": is_passed,
                        "provenance": provenance,
                        "graded_at": graded_at,
                        "submission_id": submission_id,
                    }
                )

            final_grade = round(total_weighted_grade, 2)
            is_completed = bool(
                lp.completed_at is not None
                or (
                    lp.overall_progress_percent >= 100.0
                    and final_grade >= DEFAULT_PASSING_THRESHOLD_PERCENT
                )
            )
            enrollment_status = (
                "COMPLETED"
                if is_completed
                else ("IN_PROGRESS" if lp.overall_progress_percent > 0 else "ACTIVE")
            )

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

        if status_filter and status_filter.upper() != "ALL":
            rows = [r for r in rows if r["enrollment_status"] == status_filter.upper()]

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
        }

    async def list_admin_assessment_alerts(
        self, limit: int = ADMIN_ASSESSMENT_ALERT_LIMIT
    ) -> tuple[list[AdminAssessmentAlert], int]:
        appeal_stmt = (
            select(
                GradeAppealModel,
                func.count().over().label("total_count"),
            )
            .where(GradeAppealModel.status.in_(PENDING_APPEAL_STATUSES))
            .order_by(GradeAppealModel.created_at.desc())
            .limit(limit)
        )
        appeal_rows = (await self.session.execute(appeal_stmt)).all()
        appeal_total = int(appeal_rows[0].total_count) if appeal_rows else 0

        report_stmt = (
            select(
                PeerReviewReportModel,
                func.count().over().label("total_count"),
            )
            .where(PeerReviewReportModel.status.in_(PENDING_APPEAL_STATUSES))
            .order_by(PeerReviewReportModel.created_at.desc())
            .limit(limit)
        )
        report_rows = (await self.session.execute(report_stmt)).all()
        report_total = int(report_rows[0].total_count) if report_rows else 0

        outlier_stmt = (
            select(
                PeerReviewModel,
                func.count().over().label("total_count"),
            )
            .join(
                PeerAssignmentSubmissionModel,
                PeerAssignmentSubmissionModel.id == PeerReviewModel.submission_id,
            )
            .where(
                PeerReviewModel.is_outlier.is_(True),
                PeerAssignmentSubmissionModel.graded_by_staff.is_(False),
            )
            .order_by(PeerReviewModel.created_at.desc())
            .limit(limit)
        )
        outlier_rows = (await self.session.execute(outlier_stmt)).all()
        outlier_total = int(outlier_rows[0].total_count) if outlier_rows else 0

        alerts: list[AdminAssessmentAlert] = []
        for appeal_model, _ in appeal_rows:
            alerts.append(
                AdminAssessmentAlert(
                    alert_id=appeal_model.id,
                    kind=AdminAssessmentAlertKind.GRADE_APPEAL,
                    submission_id=appeal_model.submission_id,
                    user_id=appeal_model.user_id,
                    reason=appeal_model.appeal_reason or "",
                    total_score=0.0,
                    created_at=appeal_model.created_at or "",
                )
            )

        for report_model, _ in report_rows:
            alerts.append(
                AdminAssessmentAlert(
                    alert_id=report_model.id,
                    kind=AdminAssessmentAlertKind.REPORTED_PEER_REVIEW,
                    submission_id=report_model.submission_id,
                    user_id=report_model.reporter_user_id,
                    reason=report_model.reason or "",
                    total_score=0.0,
                    created_at=report_model.created_at or "",
                )
            )

        for pr_model, _ in outlier_rows:
            alerts.append(
                AdminAssessmentAlert(
                    alert_id=pr_model.id,
                    kind=AdminAssessmentAlertKind.OUTLIER_PEER_REVIEW,
                    submission_id=pr_model.submission_id,
                    user_id=pr_model.reviewer_user_id,
                    reason="",
                    total_score=float(pr_model.total_score or 0.0),
                    created_at=pr_model.created_at or "",
                )
            )

        alerts.sort(key=lambda a: a.created_at, reverse=True)
        return alerts[:limit], appeal_total + report_total + outlier_total
