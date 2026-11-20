from datetime import UTC, datetime
from typing import Any

import pytest
from uuid6 import uuid7

from src.modules.assessment.application import AssessmentUseCase
from src.modules.assessment.domain import (
    PEER_ASSIGNMENT_STATUS_ASSIGNED,
    PEER_ASSIGNMENT_STATUS_CANCELLED,
    PEER_SUBMISSION_STATUS_PUBLISHED,
    PENDING_APPEAL_STATUSES,
    REPORT_STATUS_RESOLVED,
    UNLIMITED_ATTEMPTS_SENTINEL,
    AssessmentRepositoryInterface,
    GradeAppeal,
    HonorCodeAgreement,
    LabSubmission,
    PeerAssignmentGradedDomainEvent,
    PeerAssignmentSubmission,
    PeerReview,
    PeerReviewAssignment,
    PeerReviewReport,
    QuizCooldown,
    QuizSubmission,
    RubricCriteria,
)
from src.modules.assessment.infrastructure.sandbox_service import (
    PythonCodeSandboxExecutor,
)


class InMemoryAssessmentRepository(AssessmentRepositoryInterface):
    def __init__(self) -> None:
        self.honor_codes: dict[str, HonorCodeAgreement] = {}
        self.quiz_submissions: list[QuizSubmission] = []
        self.submission_answers: list[Any] = []
        self.cooldowns: dict[str, QuizCooldown] = {}
        self.active_sessions: dict[str, Any] = {}
        self.lab_submissions: list[LabSubmission] = []
        self.peer_submissions: list[PeerAssignmentSubmission] = []
        self.peer_reviews: list[PeerReview] = []
        self.peer_review_assignments: dict[str, PeerReviewAssignment] = {}
        self.grade_appeals: dict[str, GradeAppeal] = {}
        self.peer_review_reports: dict[str, PeerReviewReport] = {}
        self.matrices: dict[str, Any] = {}
        self.item_types: dict[str, str] = {}
        self.rubric_criteria_json_map: dict[str, str] = {}
        self.learning_items_details: dict[str, dict[str, Any]] = {}

    async def save_honor_code(self, agreement: HonorCodeAgreement) -> None:
        self.honor_codes[agreement.id] = agreement

    async def get_honor_code(
        self, user_id: str, item_id: str
    ) -> HonorCodeAgreement | None:
        return self.honor_codes.get(f"{user_id}:{item_id}")

    async def save_quiz_submission(self, submission: QuizSubmission) -> None:
        self.quiz_submissions.append(submission)

    async def get_quiz_submissions(
        self, user_id: str, item_id: str
    ) -> list[QuizSubmission]:
        return [
            s
            for s in self.quiz_submissions
            if s.user_id == user_id and s.item_id == item_id
        ]

    async def get_quiz_submission_by_id(
        self, submission_id: str
    ) -> QuizSubmission | None:
        return next((s for s in self.quiz_submissions if s.id == submission_id), None)

    async def save_quiz_submission_answers(self, answers: list[Any]) -> None:
        self.submission_answers.extend(answers)

    async def get_quiz_submission_answers(self, submission_id: str) -> list[Any]:
        return [a for a in self.submission_answers if a.submission_id == submission_id]

    async def get_quiz_submission_answers_for_user_item(
        self, user_id: str, item_id: str
    ) -> list[Any]:
        sub_ids = {
            s.id
            for s in self.quiz_submissions
            if s.user_id == user_id and s.item_id == item_id
        }
        return [a for a in self.submission_answers if a.submission_id in sub_ids]

    async def get_quiz_cooldown(
        self, user_id: str, item_id: str
    ) -> QuizCooldown | None:
        return self.cooldowns.get(f"{user_id}:{item_id}")

    async def save_quiz_cooldown(self, cooldown: QuizCooldown) -> None:
        self.cooldowns[cooldown.id] = cooldown

    async def get_quiz_active_session(self, user_id: str, item_id: str) -> Any | None:
        return self.active_sessions.get(f"{user_id}:{item_id}")

    async def save_quiz_active_session(self, session: Any) -> None:
        self.active_sessions[session.id] = session

    async def save_lab_submission(self, submission: LabSubmission) -> None:
        self.lab_submissions.append(submission)

    async def get_lab_submissions(
        self, user_id: str, item_id: str
    ) -> list[LabSubmission]:
        return [
            s
            for s in self.lab_submissions
            if s.user_id == user_id and s.item_id == item_id
        ]

    async def save_peer_submission(self, submission: PeerAssignmentSubmission) -> None:
        for i, s in enumerate(self.peer_submissions):
            if s.id == submission.id or (
                s.user_id == submission.user_id and s.item_id == submission.item_id
            ):
                self.peer_submissions[i] = submission
                return
        self.peer_submissions.append(submission)

    async def get_peer_submission(
        self, submission_id: str
    ) -> PeerAssignmentSubmission | None:
        for s in self.peer_submissions:
            if s.id == submission_id:
                return s
        return None

    async def get_user_peer_submission(
        self, user_id: str, item_id: str
    ) -> PeerAssignmentSubmission | None:
        for s in self.peer_submissions:
            if s.user_id == user_id and s.item_id == item_id:
                return s
        return None

    async def get_peer_submissions_for_item(
        self, item_id: str, exclude_user_id: str = ""
    ) -> list[PeerAssignmentSubmission]:
        return [
            s
            for s in self.peer_submissions
            if s.item_id == item_id
            and (not exclude_user_id or s.user_id != exclude_user_id)
        ]

    async def get_learning_item_details(self, item_id: str) -> dict[str, Any] | None:
        if item_id in self.learning_items_details:
            return self.learning_items_details[item_id]
        rubric_json = self.rubric_criteria_json_map.get(item_id, "")
        return {
            "id": item_id,
            "title": f"Learning Item {item_id}",
            "reading_markdown": "Test instructions",
            "rubric_criteria_json": rubric_json,
            "essay_grading_mode": "PEER_REVIEW",
            "required_peer_reviews": 3,
            "cold_start_hours": 48,
            "essay_max_attempts": 3,
        }

    async def count_user_completed_reviews(
        self, item_id: str, reviewer_user_id: str
    ) -> int:
        return sum(
            1
            for r in self.peer_reviews
            if r.item_id == item_id and r.reviewer_user_id == reviewer_user_id
        )

    async def count_available_pool_submissions(
        self, item_id: str, reviewer_user_id: str
    ) -> int:
        reviewed_sub_attempts = {
            (r.submission_id, r.submission_attempt_number)
            for r in self.peer_reviews
            if r.reviewer_user_id == reviewer_user_id and r.item_id == item_id
        }
        return sum(
            1
            for s in self.peer_submissions
            if s.item_id == item_id
            and s.user_id != reviewer_user_id
            and (s.id, s.attempt_number) not in reviewed_sub_attempts
        )

    async def get_eligible_peer_submissions_to_review(
        self, item_id: str, reviewer_user_id: str, limit: int = 3
    ) -> list[PeerAssignmentSubmission]:
        now = datetime.now(UTC)
        reviewed_sub_attempts = {
            (r.submission_id, r.submission_attempt_number)
            for r in self.peer_reviews
            if r.reviewer_user_id == reviewer_user_id and r.item_id == item_id
        }
        eligible = [
            s
            for s in self.peer_submissions
            if s.item_id == item_id
            and s.user_id != reviewer_user_id
            and (s.id, s.attempt_number) not in reviewed_sub_attempts
            and s.can_claim_lock(reviewer_user_id, now)
        ]

        def _rev_count(sub):
            return sum(
                1
                for r in self.peer_reviews
                if r.submission_id == sub.id
                and r.submission_attempt_number == sub.attempt_number
            )

        eligible.sort(
            key=lambda s: (
                0 if s.locked_by_user_id == reviewer_user_id else 1,
                0
                if (
                    not s.graded_by_staff
                    and s.status != PEER_SUBMISSION_STATUS_PUBLISHED
                )
                else (1 if not s.graded_by_staff else 2),
                _rev_count(s),
                s.created_at,
            )
        )
        return eligible[:limit]

    async def save_peer_review(self, review: PeerReview) -> None:
        for idx, existing in enumerate(self.peer_reviews):
            if (
                existing.submission_id == review.submission_id
                and existing.reviewer_user_id == review.reviewer_user_id
                and existing.submission_attempt_number
                == review.submission_attempt_number
            ):
                self.peer_reviews[idx] = review
                return
        self.peer_reviews.append(review)

    async def get_peer_submission_for_update(
        self, submission_id: str
    ) -> PeerAssignmentSubmission | None:
        return await self.get_peer_submission(submission_id)

    async def create_or_get_peer_review_assignment(
        self,
        submission_id: str,
        reviewer_user_id: str,
        item_id: str,
        assigned_at: str,
        expires_at: str,
        submission_attempt_number: int = 1,
    ) -> PeerReviewAssignment:
        now = datetime.now(UTC)
        for existing in self.peer_review_assignments.values():
            if (
                existing.submission_id == submission_id
                and existing.reviewer_user_id == reviewer_user_id
                and existing.submission_attempt_number == submission_attempt_number
            ):
                if (
                    existing.status == PEER_ASSIGNMENT_STATUS_ASSIGNED
                    and not existing.is_active(now)
                ):
                    del self.peer_review_assignments[existing.id]
                    existing.id = f"rev-{uuid7().hex}"
                    existing.assigned_at = assigned_at
                    existing.expires_at = expires_at
                    self.peer_review_assignments[existing.id] = existing
                elif existing.status != PEER_ASSIGNMENT_STATUS_ASSIGNED:
                    existing.status = PEER_ASSIGNMENT_STATUS_ASSIGNED
                    existing.assigned_at = assigned_at
                    existing.expires_at = expires_at
                return existing

        assignment = PeerReviewAssignment(
            id=f"rev-{uuid7().hex}",
            submission_id=submission_id,
            reviewer_user_id=reviewer_user_id,
            item_id=item_id,
            assigned_at=assigned_at,
            expires_at=expires_at,
            status=PEER_ASSIGNMENT_STATUS_ASSIGNED,
            submission_attempt_number=submission_attempt_number,
        )
        self.peer_review_assignments[assignment.id] = assignment
        return assignment

    async def get_peer_review_assignment(
        self, assignment_id: str, reviewer_user_id: str
    ) -> PeerReviewAssignment | None:
        assignment = self.peer_review_assignments.get(assignment_id)
        if not assignment or assignment.reviewer_user_id != reviewer_user_id:
            return None
        return assignment

    async def save_peer_review_assignment(
        self, assignment: PeerReviewAssignment
    ) -> None:
        self.peer_review_assignments[assignment.id] = assignment

    async def get_peer_reviews_by_reviewer(
        self, reviewer_user_id: str, item_id: str
    ) -> list[PeerReview]:
        return [
            r
            for r in self.peer_reviews
            if r.reviewer_user_id == reviewer_user_id and r.item_id == item_id
        ]

    async def get_peer_reviews_for_submission(
        self, submission_id: str, attempt_number: int | None = None
    ) -> list[PeerReview]:
        return [
            r
            for r in self.peer_reviews
            if r.submission_id == submission_id
            and (
                attempt_number is None or r.submission_attempt_number == attempt_number
            )
        ]

    async def get_peer_review_by_id(self, review_id: str) -> PeerReview | None:
        return next((r for r in self.peer_reviews if r.id == review_id), None)

    async def save_peer_review_report(self, report: PeerReviewReport) -> None:
        self.peer_review_reports[report.id] = report

    async def get_peer_review_report_by_user_and_review(
        self, reporter_user_id: str, peer_review_id: str
    ) -> PeerReviewReport | None:
        return next(
            (
                rep
                for rep in self.peer_review_reports.values()
                if rep.reporter_user_id == reporter_user_id
                and rep.peer_review_id == peer_review_id
            ),
            None,
        )

    async def get_pending_peer_review_reports_for_submission(
        self, submission_id: str
    ) -> list[PeerReviewReport]:
        return [
            rep
            for rep in self.peer_review_reports.values()
            if rep.submission_id == submission_id
            and rep.status in PENDING_APPEAL_STATUSES
        ]

    async def resolve_pending_peer_review_reports_for_submission(
        self, submission_id: str, reviewer_id: str, resolution_notes: str = ""
    ) -> None:
        for rep in self.peer_review_reports.values():
            if (
                rep.submission_id == submission_id
                and rep.status in PENDING_APPEAL_STATUSES
            ):
                rep.status = REPORT_STATUS_RESOLVED
                rep.reviewer_id = reviewer_id
                if resolution_notes:
                    rep.resolution_notes = resolution_notes

    async def save_grade_appeal(self, appeal: GradeAppeal) -> None:
        self.grade_appeals[appeal.submission_id] = appeal

    async def get_grade_appeal(self, submission_id: str) -> GradeAppeal | None:
        return self.grade_appeals.get(submission_id)

    async def create_question_bank(
        self, course_id: str, title: str, category: str, description: str
    ):
        from src.modules.assessment.domain import QuestionBank

        return QuestionBank(
            id="bank_test_1",
            course_id=course_id,
            title=title,
            category=category,
            description=description,
        )

    async def list_question_banks(self, course_id: str):
        return []

    async def get_any_questions(self, limit: int = 20):
        return await self.get_questions_by_bank("bank_test_1")

    async def add_question_to_bank(
        self,
        bank_id: str,
        text: str,
        question_type: str,
        difficulty: str,
        explanation: str,
        options_data: list[dict],
        topic: str = "Tổng quan",
    ):
        from src.modules.assessment.domain import Question

        return Question(
            id="q_test_1",
            bank_id=bank_id,
            text=text,
            question_type=question_type,
            difficulty=difficulty,
            explanation=explanation,
        )

    async def delete_question(self, question_id: str) -> bool:
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
    ):
        from src.modules.assessment.domain import Question, QuestionOption

        opts = [
            QuestionOption(
                id=f"opt_{i}",
                question_id=question_id,
                option_text=opt["option_text"],
                is_correct=opt["is_correct"],
                order_index=i,
            )
            for i, opt in enumerate(options_data)
        ]
        return Question(
            id=question_id,
            bank_id="bank_test_1",
            text=text,
            question_type=question_type,
            difficulty=difficulty,
            explanation=explanation,
            options=opts,
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
        max_attempts: int = 3,
        cooldown_hours: int = 8,
    ):
        from src.modules.assessment.domain import QuizMatrix

        matrix = QuizMatrix(
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
        self.matrices[item_id] = matrix
        return matrix

    async def get_item_type(self, item_id: str) -> str:
        return getattr(self, "item_types", {}).get(item_id, "GRADED_QUIZ")

    async def get_quiz_matrix(self, item_id: str):
        if item_id not in self.matrices:
            from src.modules.assessment.domain import QuizMatrix

            self.matrices[item_id] = QuizMatrix(
                item_id=item_id,
                bank_id="qb_default",
                time_limit_minutes=15,
                passing_threshold_percent=80.0,
                easy_count=3,
                medium_count=2,
                hard_count=1,
                shuffle_options=True,
                max_attempts=3,
                cooldown_hours=8,
            )
        return self.matrices.get(item_id)

    async def get_questions_by_bank(self, bank_id: str):
        from src.modules.assessment.domain import Question, QuestionOption

        return [
            Question(
                id=f"q_{i}",
                bank_id=bank_id,
                text=f"Question {i} text",
                question_type="SINGLE_CHOICE",
                difficulty="EASY" if i < 3 else "MEDIUM",
                explanation="Explanation",
                options=[
                    QuestionOption(
                        id=f"opt_{i}_{j}",
                        question_id=f"q_{i}",
                        option_text=f"Option {j}",
                        is_correct=(j == 0),
                        order_index=j,
                    )
                    for j in range(4)
                ],
                created_at="",
            )
            for i in range(5)
        ]

    async def get_course_id_by_item_id(self, item_id: str) -> str | None:
        return "course_test_1"

    async def get_course_id_by_bank_id(self, bank_id: str) -> str | None:
        return getattr(self, "bank_course_map", {}).get(bank_id, "course_test_1")

    async def get_course_id_by_question_id(self, question_id: str) -> str | None:
        return getattr(self, "question_course_map", {}).get(
            question_id, "course_test_1"
        )

    async def get_lab_test_cases_json(self, item_id: str) -> str | None:
        return None

    async def list_admin_assessment_alerts(
        self, limit: int = 20
    ) -> tuple[list[Any], int]:
        return [], 0

    async def get_item_rubric_criteria_json(self, item_id: str) -> str | None:
        if hasattr(self, "rubric_criteria_json_map"):
            return self.rubric_criteria_json_map.get(item_id)
        return getattr(self, "item_rubrics", {}).get(item_id, None)

    async def get_item_reading_markdown(self, item_id: str) -> str:
        return getattr(self, "item_reading_markdowns", {}).get(item_id, "")

    async def claim_submission_lock(
        self,
        submission_id: str,
        user_id: str,
        timeout_minutes: int = 30,
        allow_extend_own: bool = True,
    ) -> bool:
        from datetime import UTC, datetime

        now = datetime.now(UTC)
        sub = await self.get_peer_submission(submission_id)
        if not sub:
            return False
        if (
            not allow_extend_own
            and sub.locked_by_user_id == user_id
            and sub.is_lock_active(now, timeout_minutes=timeout_minutes)
        ):
            return False
        if not sub.can_claim_lock(user_id, now, timeout_minutes=timeout_minutes):
            return False
        sub.claim_lock(user_id, now)
        return True

    async def renew_submission_lock(
        self, submission_id: str, user_id: str, timeout_minutes: int = 30
    ) -> bool:
        from datetime import UTC, datetime

        now = datetime.now(UTC)
        sub = await self.get_peer_submission(submission_id)
        if not sub or sub.locked_by_user_id != user_id:
            return False
        if not sub.is_lock_active(now, timeout_minutes=timeout_minutes):
            return False
        sub.renew_lock(user_id, now)
        return True

    async def release_submission_lock(
        self, submission_id: str, user_id: str | None = None
    ) -> bool:
        sub = await self.get_peer_submission(submission_id)
        if not sub:
            return False
        if user_id and sub.locked_by_user_id and sub.locked_by_user_id != user_id:
            return False
        sub.locked_by_user_id = None
        sub.locked_at = None
        sub.lock_expires_at = None
        return True

    async def claim_staff_grading_lock(
        self,
        submission_id: str,
        staff_user_id: str,
        timeout_minutes: int = 30,
    ) -> bool:
        from datetime import UTC, datetime, timedelta

        now = datetime.now(UTC)
        sub = await self.get_peer_submission(submission_id)
        if not sub or sub.user_id == staff_user_id:
            return False
        if (
            sub.locked_by_user_id
            and sub.locked_by_user_id != staff_user_id
            and sub.is_lock_active(now, timeout_minutes=timeout_minutes)
        ):
            is_staff_locker = (
                sub.locked_by_user_id.startswith(
                    ("user_instructor", "user_admin", "user_ta", "ta_")
                )
                or "ta" in sub.locked_by_user_id.lower()
                or "instructor" in sub.locked_by_user_id.lower()
            )
            if is_staff_locker:
                return False
        sub.locked_by_user_id = staff_user_id
        sub.locked_at = now.isoformat()
        sub.lock_expires_at = (now + timedelta(minutes=timeout_minutes)).isoformat()
        return True

    async def cancel_pending_peer_review_assignments_for_submission(
        self, submission_id: str
    ) -> int:
        count = 0
        for a in self.peer_review_assignments.values():
            if (
                a.submission_id == submission_id
                and a.status == PEER_ASSIGNMENT_STATUS_ASSIGNED
            ):
                a.status = PEER_ASSIGNMENT_STATUS_CANCELLED
                count += 1
        return count

    async def list_grading_queue_items(
        self,
        course_id: str = "",
        item_id: str = "",
    ) -> list[dict[str, Any]]:
        results = []
        for s in self.peer_submissions:
            if item_id and s.item_id != item_id:
                continue
            is_appeal = s.id in self.grade_appeals
            appeal = self.grade_appeals.get(s.id)
            appeal_reason = appeal.appeal_reason if appeal else ""
            revs = [
                r
                for r in self.peer_reviews
                if r.submission_id == s.id
                and r.submission_attempt_number == s.attempt_number
            ]
            is_outlier = any(r.is_outlier for r in revs)
            status_str = "PENDING"
            if s.locked_by_user_id:
                status_str = "CLAIMED"
            elif is_appeal:
                status_str = "APPEALED"
            elif s.status == "PUBLISHED" or (
                s.final_score is not None and s.status != "SUBMITTED"
            ):
                status_str = "GRADED"

            results.append(
                {
                    "submission_id": s.id,
                    "item_id": s.item_id,
                    "item_title": f"Item {s.item_id}",
                    "course_id": course_id or "course_test_1",
                    "course_title": "Test Course",
                    "student_id": s.user_id,
                    "student_name": f"Student {s.user_id}",
                    "student_avatar_url": "",
                    "submitted_at": s.created_at,
                    "is_outlier": is_outlier,
                    "is_appeal": is_appeal,
                    "appeal_reason": appeal_reason,
                    "locked_by_user_id": s.locked_by_user_id or "",
                    "locked_by_name": s.locked_by_user_id or "",
                    "lock_expires_at": "",
                    "grade_source": s.grade_source
                    if s.final_score is not None
                    else ("PEER_REVIEW" if is_appeal else None),
                    "staff_score": float(s.final_score or 0.0),
                    "status": status_str,
                    "peer_score": 0.0,
                    "peer_reviews_count": len(revs),
                }
            )
        return results

    async def get_user_display_profiles(
        self, user_ids: list[str]
    ) -> dict[str, dict[str, str]]:
        return {
            uid: {
                "name": f"Học viên {uid}",
                "avatar_url": "",
            }
            for uid in user_ids
        }

    async def get_course_gradebook_data(
        self,
        course_id: str,
        search_query: str = "",
        status_filter: str = "",
        page_size: int = 50,
        page_token: str = "",
    ) -> dict[str, Any]:
        return {
            "course_id": course_id,
            "course_title": "Test Course",
            "columns": [],
            "rows": [],
            "total_students": 0,
            "next_page_token": "",
        }


@pytest.mark.asyncio
async def test_honor_code_agreement():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)

    ok, msg = await usecase.submit_honor_code("user-1", "item-quiz-1", True)
    assert ok is True
    assert "agreed" in msg.lower()

    agreed = await repo.get_honor_code("user-1", "item-quiz-1")
    assert agreed is not None
    assert agreed.is_agreed is True


@pytest.mark.asyncio
async def test_graded_quiz_pass_and_cooldown_logic():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    user_id = "user-test-quiz"
    item_id = "item-quiz-1"
    await repo.configure_quiz_matrix(
        item_id=item_id,
        bank_id="bank_test_1",
        time_limit_minutes=45,
        passing_threshold_percent=80.0,
        easy_count=3,
        medium_count=2,
        hard_count=0,
        shuffle_options=True,
    )

    correct_answers = [
        q["shuffled_correct_indices"]
        for q in await usecase.generate_quiz_session_questions(repo, item_id, seed=42)
    ]
    wrong_answers = [[(ans[0] + 1) % 4] if ans else [0] for ans in correct_answers]

    # 1. Without Honor Code -> Should fail
    res_no_honor = await usecase.submit_graded_quiz(
        user_id, item_id, question_answers=correct_answers
    )
    assert res_no_honor["passed"] is False
    assert "Cam kết Trung thực" in res_no_honor["answer_explanations"][0]

    # 2. Agree Honor Code
    await usecase.submit_honor_code(user_id, item_id, True)

    # 3. Submit Perfect Score -> 100% Pass
    res_pass = await usecase.submit_graded_quiz(
        user_id, item_id, question_answers=correct_answers
    )
    assert res_pass["score_percent"] == 100.0
    assert res_pass["passed"] is True
    assert res_pass["attempts_left"] == 3
    assert res_pass["cooldown_seconds_left"] == 0

    # 4. Test Graded Quiz failure limit & cooldown
    user_fail = "user-test-cooldown"
    await usecase.submit_honor_code(user_fail, item_id, True)

    # Attempt 1 (Fail)
    r1 = await usecase.submit_graded_quiz(
        user_fail, item_id, question_answers=wrong_answers
    )
    assert r1["passed"] is False
    assert r1["attempts_left"] == 2

    # Attempt 2 (Fail)
    r2 = await usecase.submit_graded_quiz(
        user_fail, item_id, question_answers=wrong_answers
    )
    assert r2["passed"] is False
    assert r2["attempts_left"] == 1

    # Attempt 3 (Fail) -> Cooldown activated
    r3 = await usecase.submit_graded_quiz(
        user_fail, item_id, question_answers=wrong_answers
    )
    assert r3["passed"] is False
    assert r3["attempts_left"] == 0
    assert r3["cooldown_seconds_left"] > 0

    # Blocked by cooldown
    with pytest.raises(ValueError, match="dùng hết số lượt"):
        await usecase.start_graded_quiz_session(user_fail, item_id, force_new=True)

    # 5. Practice Quiz (Type 3) -> Unlimited attempts without Cooldown
    item_practice = "item-practice-1"
    repo.item_types[item_practice] = "PRACTICE_QUIZ"
    await usecase.submit_honor_code(user_fail, item_practice, True)
    r_prac = await usecase.submit_graded_quiz(
        user_fail, item_practice, question_answers=wrong_answers
    )
    assert r_prac["attempts_left"] == 999
    assert r_prac["cooldown_seconds_left"] == 0


@pytest.mark.asyncio
async def test_sandbox_auto_graded_lab():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)

    valid_code = """
def solution(arr):
    return sum(arr)
"""
    test_cases = [
        {
            "input": "solution([1, 2, 3])",
            "expected_output": "6",
            "assertion_code": "assert solution([1, 2, 3]) == 6",
        },
        {
            "input": "solution([-1, 1])",
            "expected_output": "0",
            "assertion_code": "assert solution([-1, 1]) == 0",
        },
        {
            "input": "solution([])",
            "expected_output": "0",
            "assertion_code": "assert solution([]) == 0",
        },
    ]
    res = await usecase.submit_auto_graded_lab(
        "user-1", "item-lab-1", valid_code, "python", test_cases=test_cases
    )
    assert res["score_percent"] == 100.0
    assert res["passed"] is True
    assert res["passed_test_cases"] == 3
    assert "Passed" in res["test_logs"]


@pytest.mark.asyncio
async def test_peer_review_and_outlier_detection():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)

    # 1. Submit Peer Assignment (author + 2 peer reviewers)
    sub_id, _msg = await usecase.submit_peer_assignment(
        "author-1",
        "item-peer-1",
        "https://github.com/test/repo",
        "My ML project submission text",
    )
    assert sub_id.startswith("peer-")

    await usecase.submit_peer_assignment(
        "rev-1",
        "item-peer-1",
        "https://github.com/test/rev1",
        "Reviewer 1 submission",
    )
    await usecase.submit_peer_assignment(
        "rev-2",
        "item-peer-1",
        "https://github.com/test/rev2",
        "Reviewer 2 submission",
    )

    # 2. Reviewer 1 claims assigned review and grades 100% (30/30)
    queue_1 = await usecase.get_peer_reviews_to_grade("rev-1", "item-peer-1")
    assert len(queue_1) >= 1
    rev1_assignment_id = queue_1[0]["review_id"]
    # Ensure author-1's submission is the one assigned (or pick the one whose url matches)
    if queue_1[0]["submission_url"] != "https://github.com/test/repo":
        # rev-1 got assigned rev-2 or vice versa; release rev-2? Actually author-1 was submitted first so least-reviewed + oldest!
        pass
    assert queue_1[0]["submission_url"] == "https://github.com/test/repo"
    c1 = [
        RubricCriteria("c1", "Quality", 10.0, 10.0, "Giải pháp chính xác và đầy đủ."),
        RubricCriteria("c2", "Docs", 10.0, 10.0, "Trình bày rõ ràng, dễ hiểu."),
        RubricCriteria("c3", "Tests", 10.0, 10.0, "Kiểm thử bao quát tốt."),
    ]
    ok1, msg1 = await usecase.submit_peer_review_grade(rev1_assignment_id, "rev-1", c1)
    assert ok1 is True
    assert "Outlier" not in msg1

    # 3. Reviewer 2 claims assigned review and grades 30% (9/30) -> High delta >30% triggers Outlier Flag!
    queue_2 = await usecase.get_peer_reviews_to_grade("rev-2", "item-peer-1")
    author_item = next(
        item
        for item in queue_2
        if item["submission_url"] == "https://github.com/test/repo"
    )
    c2 = [
        RubricCriteria("c1", "Quality", 10.0, 3.0, "Nội dung còn sơ sài."),
        RubricCriteria("c2", "Docs", 10.0, 3.0, "Thiếu minh chứng cụ thể."),
        RubricCriteria("c3", "Tests", 10.0, 3.0, "Chưa thấy đóng góp nổi bật."),
    ]
    ok2, msg2 = await usecase.submit_peer_review_grade(
        author_item["review_id"], "rev-2", c2
    )
    assert ok2 is True
    assert "Outlier Flagged" in msg2

    # 4. Grade Appeal before PUBLISHED must be rejected; allowed once PUBLISHED
    with pytest.raises(ValueError, match="công bố điểm chính thức"):
        await usecase.submit_grade_appeal("author-1", sub_id, "Scores are inconsistent")

    await usecase.submit_peer_assignment(
        "rev-3",
        "item-peer-1",
        "https://github.com/test/rev3",
        "Reviewer 3 submission",
    )
    queue_3 = await usecase.get_peer_reviews_to_grade("rev-3", "item-peer-1")
    author_item_3 = next(
        item
        for item in queue_3
        if item["submission_url"] == "https://github.com/test/repo"
    )
    c3 = [
        RubricCriteria("c1", "Quality", 10.0, 5.0, "Nội dung đạt mức trung bình."),
        RubricCriteria(
            "c2", "Docs", 10.0, 5.0, "Bố cục tạm ổn nhưng cần chi tiết hơn."
        ),
        RubricCriteria("c3", "Tests", 10.0, 5.0, "Cần bổ sung thêm ví dụ."),
    ]
    await usecase.submit_peer_review_grade(author_item_3["review_id"], "rev-3", c3)

    ok_appeal, status = await usecase.submit_grade_appeal(
        "author-1", sub_id, "Scores are inconsistent"
    )
    assert ok_appeal is True
    assert status == "PENDING"


@pytest.mark.asyncio
async def test_python_code_sandbox_executor():
    executor = PythonCodeSandboxExecutor(timeout_seconds=1.5)

    code = """
name = input()
"""
    test_cases = [
        {
            "input": "Alice",
            "expected_output": "Alice",
            "assertion_code": "assert name == 'Alice'\nassert len(name) == 5",
        }
    ]
    res = await executor.execute_python(code, test_cases)
    assert res.passed is True
    assert res.passed_test_cases == 1

    # Security AST blocking test
    malicious_code = "import os\nos.system('echo hacked')"
    res_sec = await executor.execute_python(
        malicious_code, [{"assertion_code": "assert True"}]
    )
    assert res_sec.passed is False
    assert "Security Violation" in res_sec.test_logs


@pytest.mark.asyncio
async def test_quiz_session_timer_and_timeout():
    from datetime import datetime, timedelta

    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    user_id = "user-timer-test"
    item_id = "item-quiz-timer"

    sess = await usecase.start_graded_quiz_session(
        user_id, item_id, duration_minutes=45
    )
    assert sess["session_id"].startswith("qsess-")
    assert sess["duration_minutes"] == 45

    await usecase.submit_honor_code(user_id, item_id, True)

    # Expired start_time (60 minutes ago)
    expired_start = (datetime.now(UTC) - timedelta(minutes=60)).isoformat()
    res_timeout = await usecase.submit_graded_quiz(
        user_id,
        item_id,
        start_time_iso=expired_start,
        duration_minutes=45,
        question_answers=[[0], [1], [2], [0], [1]],
    )
    assert "tự động nộp bài" in res_timeout["answer_explanations"][0]


@pytest.mark.asyncio
async def test_peer_regrade_fallback_queue():
    from datetime import datetime, timedelta

    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)

    old_time = (datetime.now(UTC) - timedelta(days=6)).isoformat()
    sub_old = PeerAssignmentSubmission(
        id="peer-old-1",
        user_id="user-old",
        item_id="item-peer-queue",
        submission_url="http://example.com",
        text_content="Old submission",
        created_at=old_time,
    )
    await repo.save_peer_submission(sub_old)

    regrade_queue = await usecase.list_peer_submissions_needing_staff_regrade(
        "item-peer-queue"
    )
    assert len(regrade_queue) == 1
    assert regrade_queue[0]["submission_id"] == "peer-old-1"
    assert regrade_queue[0]["needs_staff_regrade"] is True


@pytest.mark.asyncio
async def test_audit_mode_access_blocking():
    try:
        from src.modules.identity.domain import User, UserRole
        from src.modules.identity.infrastructure.repository import IdentityRepository
        from src.shared.infrastructure.database import async_session_scope

        usecase = AssessmentUseCase()

        # Seed audit user (no enterprise key, no approved financial aid)
        audit_user_id = "user_audit_mode_test"
        async with async_session_scope() as session:
            repo = IdentityRepository(session)
            user = User(
                id=audit_user_id,
                email="audit@example.com",
                full_name="Audit Learner",
                role=UserRole.LEARNER,
                avatar_url="",
                password_hash="hash",
                enterprise_seat_key="",
            )
            await repo.save(user)

        # Attempt submitting graded quiz in audit mode -> Should be blocked with PermissionError
        with pytest.raises(PermissionError, match="Audit Mode"):
            await usecase.submit_graded_quiz(
                audit_user_id, "item_quiz_audit", question_answers=[[0], [1]]
            )

        # Attempt submitting peer assignment in audit mode -> Should be blocked with PermissionError
        with pytest.raises(PermissionError, match="Audit Mode"):
            await usecase.submit_peer_assignment(
                audit_user_id, "item_peer_audit", "http://example.com", "text"
            )
    except Exception as e:  # noqa: BLE001
        pytest.skip(f"Skipping audit mode db test: DB not reachable ({e})")


@pytest.mark.asyncio
async def test_audit_mode_practice_vs_graded_quiz():
    """BR_ACCESS_001: Practice Quizzes are open in Audit Mode, Graded Quizzes require Paid Mode."""
    from unittest.mock import AsyncMock, patch

    class MockSQLAlchemyAssessmentRepository(InMemoryAssessmentRepository):
        pass

    repo = MockSQLAlchemyAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    user_id = "user-audit-quiz-test"

    item_practice = "item-practice-audit"
    item_graded = "item-graded-audit"
    repo.item_types[item_practice] = "ITEM_TYPE_PRACTICE_QUIZ"
    repo.item_types[item_graded] = "ITEM_TYPE_GRADED_QUIZ"

    await usecase.submit_honor_code(user_id, item_practice, True)
    await usecase.submit_honor_code(user_id, item_graded, True)

    with patch(
        "src.shared.access_policy.AccessPolicyService.verify_paid_access",
        new=AsyncMock(
            return_value=(
                False,
                "Tài khoản đang ở chế độ Audit Mode (Miễn phí). Vui lòng nâng cấp Paid Mode.",
            )
        ),
    ):
        # 1. Practice Quiz: Audit mode learner MUST BE ALLOWED to submit and receive explanations
        res_practice = await usecase.submit_graded_quiz(
            user_id, item_practice, question_answers=[[0]]
        )
        assert res_practice is not None
        assert "score_percent" in res_practice
        assert res_practice["attempts_left"] == UNLIMITED_ATTEMPTS_SENTINEL

        # 2. Graded Quiz: Audit mode learner MUST BE BLOCKED with PermissionError
        with pytest.raises(PermissionError, match="Audit Mode"):
            await usecase.submit_graded_quiz(
                user_id, item_graded, question_answers=[[0]]
            )


@pytest.mark.asyncio
async def test_quiz_question_pool_and_option_shuffling():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    user_id = "user-shuffled-quiz"
    item_id = "item-shuffled-1"
    await repo.configure_quiz_matrix(
        item_id=item_id,
        bank_id="bank_test_1",
        time_limit_minutes=45,
        passing_threshold_percent=80.0,
        easy_count=3,
        medium_count=2,
        hard_count=0,
        shuffle_options=True,
    )

    # Start session and get N-sampled questions with shuffled options (BR_QUIZ_002)
    session_info = await usecase.start_graded_quiz_session(user_id, item_id)
    assert "questions" in session_info
    questions = session_info["questions"]
    assert len(questions) == 5  # Sampled 5 questions from pool

    session_seed = session_info["session_seed"]
    shuffled_answers = [q["shuffled_correct_indices"] for q in questions]

    # Agree Honor Code
    await usecase.submit_honor_code(user_id, item_id, True)

    # Submit answers matching shuffled indices -> Should pass 100%
    res = await usecase.submit_graded_quiz(
        user_id, item_id, question_answers=shuffled_answers, session_seed=session_seed
    )
    assert res["score_percent"] == 100.0
    assert res["passed"] is True


@pytest.mark.asyncio
async def test_update_and_delete_question():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)

    # Test update_question
    updated_q = await usecase.update_question(
        question_id="q_test_1",
        text="Updated Question text?",
        question_type="SINGLE_CHOICE",
        difficulty="MEDIUM",
        explanation="Simple explanation",
        options_data=[
            {"option_text": "Option A", "is_correct": True},
            {"option_text": "Option B", "is_correct": False},
        ],
    )
    assert updated_q.id == "q_test_1"
    assert updated_q.text == "Updated Question text?"
    assert updated_q.question_type == "SINGLE_CHOICE"
    assert updated_q.difficulty == "MEDIUM"
    assert updated_q.explanation == "Simple explanation"
    assert len(updated_q.options) == 2
    assert updated_q.options[0].option_text == "Option A"
    assert updated_q.options[0].is_correct is True

    # Test delete_question
    success = await usecase.delete_question(question_id="q_test_1")
    assert success is True


@pytest.mark.asyncio
async def test_quiz_submission_empty_question_pool(monkeypatch: pytest.MonkeyPatch):
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    user_id = "user-empty-pool"
    item_id = "item-empty-1"

    await usecase.submit_honor_code(user_id, item_id, True)

    async def mock_empty_questions(
        self: Any, repo_arg: Any, item_id_arg: str, seed: int = 42
    ) -> list[dict[str, Any]]:
        return []

    monkeypatch.setattr(
        usecase,
        "generate_quiz_session_questions",
        mock_empty_questions.__get__(usecase, AssessmentUseCase),
    )

    res = await usecase.submit_graded_quiz(
        user_id, item_id, question_answers=[], session_seed=12345
    )
    assert res["score_percent"] == 0.0
    assert res["passed"] is False
    assert any("rỗng" in exp or "empty" in exp for exp in res["answer_explanations"])


@pytest.mark.asyncio
async def test_graded_quiz_preview_mode():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    user_id = "instructor-test"
    item_id = "item-quiz-1"
    await repo.configure_quiz_matrix(
        item_id=item_id,
        bank_id="bank_test_1",
        time_limit_minutes=45,
        passing_threshold_percent=80.0,
        easy_count=3,
        medium_count=2,
        hard_count=0,
        shuffle_options=True,
    )

    # Start session in preview mode
    sess = await usecase.start_graded_quiz_session(user_id, item_id, preview=True)
    assert sess["session_seed"] > 0
    assert len(sess["questions"]) > 0

    # Submit quiz in preview mode without agreeing to honor code
    res = await usecase.submit_graded_quiz(
        user_id,
        item_id,
        question_answers=[[0], [1], [2], [0], [1]],
        session_seed=sess["session_seed"],
        preview=True,
    )
    assert res["passed"] is not None
    # Verify that in preview mode, no submission is stored in repository
    assert len(repo.quiz_submissions) == 0
    # Verify cooldown seconds is 0 in preview mode
    assert res["cooldown_seconds_left"] == 0
    # Verify attempts_left is max_attempts
    assert res["attempts_left"] == res["max_attempts"]


@pytest.mark.asyncio
async def test_anti_cheat_feedback_hidden_on_failure():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    user_id = "learner-test-1"
    item_id = "item-quiz-anti-cheat"
    await repo.save_honor_code(
        HonorCodeAgreement(user_id=user_id, item_id=item_id, is_agreed=True)
    )

    # 1. Start quiz session
    sess = await usecase.start_graded_quiz_session(user_id, item_id)
    assert sess["session_id"] is not None
    # Active session saved atomically
    active = await repo.get_quiz_active_session(user_id, item_id)
    assert active is not None
    assert active.session_seed == sess["session_seed"]

    # 2. Submit wrong answers (fail quiz)
    res = await usecase.submit_graded_quiz(
        user_id,
        item_id,
        question_answers=[[], [], [], [], []],
        session_seed=sess["session_seed"],
    )
    assert res["passed"] is False
    # Anti-cheat check: explanations must NOT reveal the correct option text or correct index
    for exp in res["answer_explanations"]:
        assert "đáp án đúng là" not in exp
    assert len(repo.quiz_submissions) == 1


@pytest.mark.asyncio
async def test_peer_assignment_resubmission_updates_existing():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    user_id = "user_learner_demo"
    item_id = "item-ml-peer-1"

    # 1. First submission
    sub_id1, msg1 = await usecase.submit_peer_assignment(
        user_id,
        item_id,
        "https://github.com/initial/repo",
        "Initial submission text",
    )
    assert sub_id1.startswith("peer-")
    assert "Nộp bài tự luận thành công" in msg1
    assert len(repo.peer_submissions) == 1

    # 2. Resubmission / Update by same user on same item
    sub_id2, msg2 = await usecase.submit_peer_assignment(
        user_id,
        item_id,
        "https://github.com/updated/repo",
        "Updated submission text",
    )
    # Must preserve the same submission ID
    assert sub_id2 == sub_id1
    assert "Nộp bài tự luận thành công" in msg2
    assert len(repo.peer_submissions) == 1

    # 3. Verify repository data was updated
    stored = await repo.get_user_peer_submission(user_id, item_id)
    assert stored is not None
    assert stored.id == sub_id1
    assert stored.submission_url == "https://github.com/updated/repo"
    assert stored.text_content == "Updated submission text"


@pytest.mark.asyncio
async def test_sqlalchemy_assessment_repo_unique_ids():
    from unittest.mock import AsyncMock, MagicMock

    from src.modules.assessment.infrastructure.repository import (
        SQLAlchemyAssessmentRepository,
    )

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    repo = SQLAlchemyAssessmentRepository(session=mock_session)

    # 1. Verify create_question_bank produces full unique IDs
    bank1 = await repo.create_question_bank("course-1", "Bank 1", "PRACTICE", "Desc")
    bank2 = await repo.create_question_bank("course-1", "Bank 2", "PRACTICE", "Desc")
    assert bank1.id != bank2.id
    assert bank1.id.startswith("qbank-")
    assert len(bank1.id) >= 38  # "qbank-" (6) + 32 hex = 38 chars

    # 2. Verify add_question_to_bank produces unique q_id and opt_id
    options = [
        {"option_text": "Opt A", "is_correct": True},
        {"option_text": "Opt B", "is_correct": False},
    ]
    q1 = await repo.add_question_to_bank(
        bank1.id, "Question 1", "SINGLE_CHOICE", "EASY", "", options
    )
    q2 = await repo.add_question_to_bank(
        bank1.id, "Question 2", "SINGLE_CHOICE", "EASY", "", options
    )

    assert q1.id != q2.id
    assert q1.id.startswith("q-")
    assert len(q1.id) >= 34  # "q-" (2) + 32 hex = 34 chars

    # Verify options within question have distinct IDs
    assert len(q1.options) == 2
    assert q1.options[0].id != q1.options[1].id
    assert q1.options[0].id.startswith("opt-")
    assert len(q1.options[0].id) >= 36  # "opt-" (4) + 32 hex = 36 chars


@pytest.mark.asyncio
async def test_sqlalchemy_assessment_repo_update_question_post_commit():
    from unittest.mock import AsyncMock, MagicMock

    from src.modules.assessment.infrastructure.models import QuestionModel
    from src.modules.assessment.infrastructure.repository import (
        SQLAlchemyAssessmentRepository,
    )

    mock_session = AsyncMock()
    q_model = QuestionModel(
        id="q-existing-123",
        bank_id="qbank-123",
        text="Old Text",
        question_type="SINGLE_CHOICE",
        difficulty="EASY",
        explanation="Old exp",
        created_at="2026-08-18T12:00:00Z",
    )
    q_model.options = []

    res_mock = MagicMock()
    res_mock.scalar_one_or_none.return_value = q_model
    mock_session.execute.return_value = res_mock

    repo = SQLAlchemyAssessmentRepository(session=mock_session)
    updated = await repo.update_question(
        question_id="q-existing-123",
        text="Updated Text",
        question_type="MULTIPLE_CHOICE",
        difficulty="HARD",
        explanation="New exp",
        options_data=[
            {"option_text": "New A", "is_correct": True},
            {"option_text": "New B", "is_correct": False},
        ],
    )

    assert updated.id == "q-existing-123"
    assert updated.bank_id == "qbank-123"
    assert updated.text == "Updated Text"
    assert updated.question_type == "MULTIPLE_CHOICE"
    assert updated.difficulty == "HARD"
    assert updated.explanation == "New exp"
    assert len(updated.options) == 2
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_start_quiz_session_force_new_preserves_previous_result():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    user_id = "user-preserve-test"
    item_id = "item-preserve-test"

    # Add question bank with sample questions
    bank = await repo.create_question_bank(
        course_id="course-1",
        title="Sample Bank",
        category="PRACTICE",
        description="Desc",
    )
    bank_id = bank.id

    for i in range(3):
        await repo.add_question_to_bank(
            bank_id=bank_id,
            question_type="SINGLE_CHOICE",
            difficulty="EASY",
            text=f"Question {i + 1}",
            explanation="Explanation",
            options_data=[
                {"option_text": "Correct", "is_correct": True},
                {"option_text": "Wrong", "is_correct": False},
            ],
        )

    await repo.configure_quiz_matrix(
        item_id=item_id,
        bank_id=bank_id,
        time_limit_minutes=15,
        passing_threshold_percent=80.0,
        easy_count=3,
        medium_count=0,
        hard_count=0,
        shuffle_options=False,
        max_attempts=3,
        cooldown_hours=8,
    )

    # Submit an initial quiz attempt
    sess1 = await usecase.start_graded_quiz_session(user_id, item_id, force_new=True)
    assert sess1["has_previous_result"] is False

    await usecase.submit_honor_code(user_id, item_id, True)
    res_sub = await usecase.submit_graded_quiz(
        user_id,
        item_id,
        question_answers=[[0], [0], [0]],
        session_seed=sess1["session_seed"],
    )
    assert res_sub["passed"] is True
    assert res_sub["score_percent"] == 100.0

    # Start a brand new session with force_new=True (retake)
    sess2 = await usecase.start_graded_quiz_session(user_id, item_id, force_new=True)
    assert sess2["has_previous_result"] is True
    assert sess2["previous_result"] is not None
    assert sess2["previous_result"]["score_percent"] == 100.0
    assert sess2["previous_result"]["passed"] is True


@pytest.mark.asyncio
async def test_peer_grading_atomic_soft_lock_lifecycle():
    from datetime import UTC, datetime, timedelta

    from src.shared.auth import CurrentUser

    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    ta1 = CurrentUser(id="ta-1", email="ta1@example.com", role="INSTRUCTOR")
    ta2 = CurrentUser(id="ta-2", email="ta2@example.com", role="INSTRUCTOR")

    # 1. Create a peer submission
    sub = PeerAssignmentSubmission(
        id="sub-task4-lock",
        user_id="student-1",
        item_id="item-lock-test",
        submission_url="http://example.com/repo",
        text_content="My code",
        created_at=datetime.now(UTC).isoformat(),
    )
    await repo.save_peer_submission(sub)

    # 2. TA1 claims the lock -> True
    ok, _msg, data = await usecase.claim_grading_task(
        "sub-task4-lock", "ta-1", current_user=ta1
    )
    assert ok is True
    assert data["locked_by_user_id"] == "ta-1"

    # 3. TA2 attempts to claim the same submission while locked -> False (conflict prevention)
    ok2, msg2, _ = await usecase.claim_grading_task(
        "sub-task4-lock", "ta-2", current_user=ta2
    )
    assert ok2 is False
    assert "đã có khóa hiệu lực" in msg2 or "đang được nhân sự khác" in msg2

    # 4. TA1 renews lock -> True
    ok_renew, _msg_renew, data_renew = await usecase.renew_grading_task_lock(
        "sub-task4-lock", "ta-1", extend_minutes=30, current_user=ta1
    )
    assert ok_renew is True
    assert data_renew["remaining_seconds"] == 1800

    # 5. TA2 attempts to renew TA1's lock -> False
    ok_renew2, _, _ = await usecase.renew_grading_task_lock(
        "sub-task4-lock", "ta-2", extend_minutes=30, current_user=ta2
    )
    assert ok_renew2 is False

    # 6. Simulate lock expiration (> 30 mins)
    sub_loaded = await repo.get_peer_submission("sub-task4-lock")
    assert sub_loaded is not None
    sub_loaded.locked_at = (datetime.now(UTC) - timedelta(minutes=35)).isoformat()
    await repo.save_peer_submission(sub_loaded)

    # 7. Now TA2 can claim expired lock -> True
    ok_claim_exp, _, data_exp = await usecase.claim_grading_task(
        "sub-task4-lock", "ta-2", current_user=ta2
    )
    assert ok_claim_exp is True
    assert data_exp["locked_by_user_id"] == "ta-2"

    # 8. TA2 actively releases lock -> lock is cleared
    ok_rel, _ = await usecase.release_grading_task(
        "sub-task4-lock", "ta-2", current_user=ta2
    )
    assert ok_rel is True
    sub_released = await repo.get_peer_submission("sub-task4-lock")
    assert sub_released is not None
    assert sub_released.locked_by_user_id is None
    assert sub_released.locked_at is None


@pytest.mark.asyncio
async def test_peer_grade_appeal_constraints_and_window():
    from datetime import UTC, datetime, timedelta

    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    now = datetime.now(UTC)

    # 1. Fresh published submission (within 7 days)
    sub = PeerAssignmentSubmission(
        id="sub-appeal-1",
        user_id="student-appeal",
        item_id="item-appeal-test",
        submission_url="http://example.com/repo",
        text_content="My code",
        created_at=now.isoformat(),
        final_score=75.0,
        published_at=now.isoformat(),
        status="PUBLISHED",
    )
    await repo.save_peer_submission(sub)

    # Student appeals successfully
    ok, status = await usecase.submit_grade_appeal(
        "student-appeal", "sub-appeal-1", "Em thấy điểm chưa đúng rubric"
    )
    assert ok is True
    assert status == "PENDING"

    # Attempting second appeal on same submission -> Rejected (MAX_APPEALS_PER_SUBMISSION = 1)
    with pytest.raises(ValueError, match="đã có đơn khiếu nại trước đó"):
        await usecase.submit_grade_appeal(
            "student-appeal", "sub-appeal-1", "Khiếu nại lần 2"
        )

    # Another student trying to appeal -> Rejected with PermissionError
    sub2 = PeerAssignmentSubmission(
        id="sub-appeal-2",
        user_id="student-other",
        item_id="item-appeal-test",
        submission_url="http://example.com",
        text_content="Other",
        created_at=now.isoformat(),
        published_at=now.isoformat(),
    )
    await repo.save_peer_submission(sub2)
    with pytest.raises(PermissionError, match="chính mình"):
        await usecase.submit_grade_appeal(
            "student-intruder", "sub-appeal-2", "Hacking appeal"
        )

    # Submission published 8 days ago (> MAX_APPEAL_WINDOW_DAYS = 7)
    old_time = (now - timedelta(days=8)).isoformat()
    sub_expired = PeerAssignmentSubmission(
        id="sub-appeal-expired",
        user_id="student-late",
        item_id="item-appeal-test",
        submission_url="http://example.com",
        text_content="Old",
        created_at=old_time,
        published_at=old_time,
        final_score=60.0,
        status="PUBLISHED",
    )
    await repo.save_peer_submission(sub_expired)
    with pytest.raises(ValueError, match="quá thời hạn khiếu nại 7 ngày"):
        await usecase.submit_grade_appeal(
            "student-late", "sub-appeal-expired", "Em khiếu nại muộn"
        )


@pytest.mark.asyncio
async def test_peer_resubmission_policy_and_highest_score_wins():
    from src.shared.auth import CurrentUser

    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    staff = CurrentUser(id="instructor-1", email="inst@example.com", role="INSTRUCTOR")

    # 1. First submission (attempt 1)
    sub_id1, _ = await usecase.submit_peer_assignment(
        "student-resub", "item-resub", "http://v1.com", "Content 1"
    )
    sub1 = await repo.get_peer_submission(sub_id1)
    assert sub1 is not None
    assert sub1.attempt_number == 1
    sub1.review_duty_status = "COMPLETED"
    await repo.save_peer_submission(sub1)

    # Staff grades attempt 1 with 85.0
    criteria = [RubricCriteria("c1", "Quality", 10.0, 8.5)]
    await usecase.submit_staff_grading(
        submission_id=sub_id1,
        staff_user_id="instructor-1",
        graded_criteria=criteria,
        total_score=85.0,
        provenance="INSTRUCTOR",
        current_user=staff,
    )
    sub1_graded = await repo.get_peer_submission(sub_id1)
    assert sub1_graded is not None
    assert sub1_graded.final_score == 85.0

    # 2. Resubmission (attempt 2)
    sub_id2, _ = await usecase.submit_peer_assignment(
        "student-resub", "item-resub", "http://v2.com", "Content 2"
    )
    assert sub_id2 == sub_id1
    sub2 = await repo.get_peer_submission(sub_id2)
    assert sub2 is not None
    assert sub2.attempt_number == 2
    assert sub2.status == "SUBMITTED"
    assert sub2.final_score is None
    assert sub2.graded_by_staff is False
    assert sub2.previous_best_score == 85.0

    # While attempt 2 is pending grading, status reports is_graded=False but preserves best_published_score=85.0
    status_pending = await usecase.get_my_peer_submission_status(
        "student-resub", "item-resub"
    )
    assert status_pending["is_graded"] is False
    assert status_pending["final_score"] == 0.0
    assert status_pending["best_published_score"] == 85.0
    assert status_pending["best_grade_source"] == "INSTRUCTOR"

    # Staff grades attempt 2 with lower score (70.0) -> Highest Score Wins maintains 85.0!
    criteria_low = [RubricCriteria("c1", "Quality", 10.0, 7.0)]
    _, _, final_s, _ = await usecase.submit_staff_grading(
        submission_id=sub_id2,
        staff_user_id="instructor-1",
        graded_criteria=criteria_low,
        total_score=70.0,
        current_user=staff,
    )
    assert final_s == 70.0  # Recorded authoritative instructor score for attempt 2!
    sub2_graded = await repo.get_peer_submission(sub_id2)
    assert sub2_graded is not None
    assert sub2_graded.final_score == 70.0
    assert sub2_graded.previous_best_score == 85.0
    eff_score, eff_src, _ = sub2_graded.get_effective_published_grade()
    assert eff_score == 85.0
    assert eff_src == "INSTRUCTOR"

    status_after_low = await usecase.get_my_peer_submission_status(
        "student-resub", "item-resub"
    )
    assert status_after_low["is_graded"] is True
    assert status_after_low["final_score"] == 85.0
    assert status_after_low["best_published_score"] == 85.0

    # 3. Resubmission (attempt 3)
    await usecase.submit_peer_assignment(
        "student-resub", "item-resub", "http://v3.com", "Content 3"
    )
    sub3 = await repo.get_peer_submission(sub_id2)
    assert sub3 is not None
    assert sub3.attempt_number == 3

    # 4. Attempt 4 exceeds MAX_PEER_SUBMISSION_ATTEMPTS (3) -> ValueError
    with pytest.raises(ValueError, match="giới hạn tối đa 3 lần nộp bài"):
        await usecase.submit_peer_assignment(
            "student-resub", "item-resub", "http://v4.com", "Content 4"
        )


@pytest.mark.asyncio
async def test_essay_custom_max_attempts_enforcement():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)

    # Configure learning item with custom essay_max_attempts = 2
    repo.learning_items_details["item-custom-attempts"] = {
        "id": "item-custom-attempts",
        "title": "Tự luận giới hạn 2 lần",
        "reading_markdown": "Đề bài tự luận",
        "rubric_criteria_json": "",
        "essay_grading_mode": "INSTRUCTOR_ONLY",
        "required_peer_reviews": 0,
        "cold_start_hours": 24,
        "essay_max_attempts": 2,
    }

    # Initial status check before any submission
    initial_status = await usecase.get_my_peer_submission_status(
        "student-limit", "item-custom-attempts"
    )
    assert initial_status["max_attempts"] == 2
    assert initial_status["has_submission"] is False

    # Attempt 1 -> Success
    sub_id, _ = await usecase.submit_peer_assignment(
        "student-limit", "item-custom-attempts", "http://v1.com", "Bài nộp lần 1"
    )
    sub1 = await repo.get_peer_submission(sub_id)
    assert sub1 is not None
    assert sub1.attempt_number == 1

    status1 = await usecase.get_my_peer_submission_status(
        "student-limit", "item-custom-attempts"
    )
    assert status1["max_attempts"] == 2
    assert status1["attempt_number"] == 1

    # Attempt 2 -> Resubmission success
    await usecase.submit_peer_assignment(
        "student-limit", "item-custom-attempts", "http://v2.com", "Bài nộp lần 2"
    )
    sub2 = await repo.get_peer_submission(sub_id)
    assert sub2 is not None
    assert sub2.attempt_number == 2

    # Attempt 3 -> Should be rejected since max_attempts = 2
    with pytest.raises(ValueError, match="giới hạn tối đa 2 lần nộp bài"):
        await usecase.submit_peer_assignment(
            "student-limit", "item-custom-attempts", "http://v3.com", "Bài nộp lần 3"
        )


@pytest.mark.asyncio
async def test_staff_grading_immediate_publish_and_event():
    from src.shared.auth import CurrentUser
    from src.shared.infrastructure.event_bus import EventBus

    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    staff = CurrentUser(id="instructor-1", email="inst@example.com", role="INSTRUCTOR")

    sub = PeerAssignmentSubmission(
        id="sub-publish-test",
        user_id="student-publish",
        item_id="item-batch-test",
        submission_url="http://example.com",
        text_content="Direct submission",
        created_at="2026-08-18T10:00:00Z",
    )
    await repo.save_peer_submission(sub)

    received_events = []

    async def _tracker(evt):
        received_events.append(evt)

    EventBus.subscribe(PeerAssignmentGradedDomainEvent, _tracker)

    # Submit staff grading -> Publishes immediately
    criteria = [RubricCriteria("c1", "Quality", 10.0, 9.0)]
    ok, msg, final_s, _ = await usecase.submit_staff_grading(
        submission_id="sub-publish-test",
        staff_user_id="instructor-1",
        graded_criteria=criteria,
        total_score=90.0,
        current_user=staff,
    )
    assert ok is True
    assert final_s == 90.0
    assert "công bố" in msg

    sub_in_db = await repo.get_peer_submission("sub-publish-test")
    assert sub_in_db is not None
    assert sub_in_db.final_score == 90.0
    assert sub_in_db.published_at is not None

    # Immediate published event was dispatched!
    assert len(received_events) == 1
    assert received_events[0].user_id == "student-publish"
    assert received_events[0].final_score == 90.0
    assert received_events[0].passed is True


@pytest.mark.asyncio
async def test_eventbus_auto_progress_and_certificate_flow():
    from unittest.mock import AsyncMock, MagicMock, patch

    from src.modules.learning.application.learning_event_handler import (
        handle_peer_assignment_graded,
    )

    mock_progress = MagicMock()
    mock_progress.overall_progress_percent = 100.0

    with (
        patch(
            "src.modules.learning.application.learning_event_handler.LearningUseCase"
        ) as mock_luc_cls,
        patch(
            "src.modules.learning.application.learning_event_handler.CertificateUseCase"
        ) as mock_cuc_cls,
    ):
        luc_instance = mock_luc_cls.return_value
        luc_instance.mark_item_complete = AsyncMock(return_value=(True, mock_progress))

        cuc_instance = mock_cuc_cls.return_value
        mock_cert = MagicMock()
        mock_cert.certificate_id = "CERT-100-TEST"
        cuc_instance.get_verified_certificate = AsyncMock(return_value=(mock_cert, ""))

        # Fire graded event with 100% pass
        event = PeerAssignmentGradedDomainEvent(
            user_id="learner-cert-100",
            course_id="course-ml",
            item_id="item-capstone",
            submission_id="sub-capstone",
            final_score=95.0,
            passed=True,
            grader_id="ta-1",
        )

        await handle_peer_assignment_graded(event)

        # Verified automatic learning progress update
        luc_instance.mark_item_complete.assert_awaited_once_with(
            user_id="learner-cert-100",
            course_id="course-ml",
            item_id="item-capstone",
        )

        # Verified automatic digital certificate issuance
        cuc_instance.get_verified_certificate.assert_awaited_once_with(
            user_id="learner-cert-100",
            course_id="course-ml",
        )


@pytest.mark.asyncio
async def test_dynamic_rubric_criteria_from_item():
    import json

    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)

    custom_rubrics = [
        {
            "criteria_id": "ux_design",
            "title": "Thiết kế Giao diện UI/UX",
            "max_score": 25.0,
            "description": "Giao diện tuân thủ Design System và có trải nghiệm mượt mà.",
        },
        {
            "criteria_id": "user_research",
            "title": "Nghiên cứu Người dùng",
            "max_score": 15.0,
            "description": "Khảo sát và chân dung người dùng có cơ sở số liệu.",
        },
    ]
    repo.rubric_criteria_json_map = {"item-custom-peer": json.dumps(custom_rubrics)}

    # Submit a peer assignment by another user and by student-reviewer (BR_PEER_001)
    _sub_id, _ = await usecase.submit_peer_assignment(
        "author-peer-1",
        "item-custom-peer",
        "https://figma.com/file/123",
        "Figma UI/UX prototype",
    )
    await usecase.submit_peer_assignment(
        "student-reviewer",
        "item-custom-peer",
        "https://figma.com/file/456",
        "Reviewer own prototype",
    )

    # Get peer reviews to grade for student-reviewer
    reviews_to_grade = await usecase.get_peer_reviews_to_grade(
        user_id="student-reviewer", item_id="item-custom-peer"
    )
    assert len(reviews_to_grade) == 1
    criteria = reviews_to_grade[0]["rubric_criteria"]
    assert len(criteria) == 2
    assert criteria[0].criteria_id == "ux_design"
    assert criteria[0].title == "Thiết kế Giao diện UI/UX"
    assert criteria[0].max_score == 25.0
    assert (
        criteria[0].description
        == "Giao diện tuân thủ Design System và có trải nghiệm mượt mà."
    )
    assert criteria[1].criteria_id == "user_research"
    assert criteria[1].max_score == 15.0


@pytest.mark.asyncio
async def test_self_grading_fraud_prevented(monkeypatch: pytest.MonkeyPatch) -> None:
    from contextlib import asynccontextmanager
    from unittest.mock import AsyncMock

    from src.modules.assessment.application.peer_review_usecase import PeerReviewUseCase

    repo = InMemoryAssessmentRepository()

    @asynccontextmanager
    async def _fake_scope():
        yield None

    monkeypatch.setattr(
        "src.modules.assessment.application.peer_review_usecase.async_session_scope",
        _fake_scope,
    )

    usecase = PeerReviewUseCase()
    usecase._get_repo = AsyncMock(return_value=repo)

    sub = PeerAssignmentSubmission(
        id="sub-fraud-1",
        user_id="student-fraudster",
        item_id="item-test",
        submission_url="https://example.com/fraud",
        text_content="My own work",
        created_at="2026-11-10T00:00:00Z",
    )
    await repo.save_peer_submission(sub)

    valid_rubric = [
        RubricCriteria(
            criteria_id="c1",
            title="Criteria 1",
            max_score=10.0,
            score_given=10.0,
        )
    ]

    # Attempting to self-grade via forged predictable id OR even with an assignment must raise PermissionError
    with pytest.raises(PermissionError):
        await usecase.submit_peer_review_grade(
            review_id="rev-sub-fraud-1",
            reviewer_user_id="student-fraudster",
            graded_criteria=valid_rubric,
        )

    # Even if an assignment record somehow pointed to their own submission, self-grading is blocked
    from datetime import timedelta

    now = datetime.now(UTC)
    self_assign = await repo.create_or_get_peer_review_assignment(
        submission_id="sub-fraud-1",
        reviewer_user_id="student-fraudster",
        item_id="item-test",
        assigned_at=now.isoformat(),
        expires_at=(now + timedelta(minutes=30)).isoformat(),
    )
    with pytest.raises(PermissionError, match="không được phép tự chấm điểm"):
        await usecase.submit_peer_review_grade(
            review_id=self_assign.id,
            reviewer_user_id="student-fraudster",
            graded_criteria=valid_rubric,
        )


@pytest.mark.asyncio
async def test_unbounded_rubric_score_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    from contextlib import asynccontextmanager
    from unittest.mock import AsyncMock

    from src.modules.assessment.application.peer_review_usecase import PeerReviewUseCase

    repo = InMemoryAssessmentRepository()

    @asynccontextmanager
    async def _fake_scope():
        yield None

    monkeypatch.setattr(
        "src.modules.assessment.application.peer_review_usecase.async_session_scope",
        _fake_scope,
    )

    usecase = PeerReviewUseCase()
    usecase._get_repo = AsyncMock(return_value=repo)

    sub = PeerAssignmentSubmission(
        id="sub-valid-1",
        user_id="student-legit",
        item_id="item-test",
        submission_url="https://example.com/legit",
        text_content="Legit work",
        created_at="2026-11-10T00:00:00Z",
    )
    await repo.save_peer_submission(sub)
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="sub-reviewer-peer",
            user_id="reviewer-peer",
            item_id="item-test",
            submission_url="https://example.com/reviewer",
            text_content="Reviewer work",
            created_at="2026-11-10T01:00:00Z",
        )
    )
    queue = await usecase.get_peer_reviews_to_grade(
        user_id="reviewer-peer", item_id="item-test"
    )
    assert len(queue) == 1
    assigned_review_id = queue[0]["review_id"]

    # 1. Negative score rejected
    neg_rubric = [
        RubricCriteria(
            criteria_id="c1",
            title="Criteria 1",
            max_score=10.0,
            score_given=-5.0,
        )
    ]
    with pytest.raises(ValueError, match="không hợp lệ"):
        await usecase.submit_peer_review_grade(
            review_id=assigned_review_id,
            reviewer_user_id="reviewer-peer",
            graded_criteria=neg_rubric,
        )

    # 2. Over-maximum score rejected
    over_rubric = [
        RubricCriteria(
            criteria_id="c1",
            title="Criteria 1",
            max_score=10.0,
            score_given=999.0,
        )
    ]
    with pytest.raises(ValueError, match="không hợp lệ"):
        await usecase.submit_peer_review_grade(
            review_id=assigned_review_id,
            reviewer_user_id="reviewer-peer",
            graded_criteria=over_rubric,
        )

    # 3. NaN score rejected
    nan_rubric = [
        RubricCriteria(
            criteria_id="c1",
            title="Criteria 1",
            max_score=10.0,
            score_given=float("nan"),
        )
    ]
    with pytest.raises(ValueError, match="hữu hạn hợp lệ"):
        await usecase.submit_peer_review_grade(
            review_id=assigned_review_id,
            reviewer_user_id="reviewer-peer",
            graded_criteria=nan_rubric,
        )

    # 4. Infinity score rejected
    inf_rubric = [
        RubricCriteria(
            criteria_id="c1",
            title="Criteria 1",
            max_score=10.0,
            score_given=float("inf"),
        )
    ]
    with pytest.raises(ValueError, match="hữu hạn hợp lệ"):
        await usecase.submit_peer_review_grade(
            review_id=assigned_review_id,
            reviewer_user_id="reviewer-peer",
            graded_criteria=inf_rubric,
        )

    # 5. Non-positive max_score rejected
    zero_max_rubric = [
        RubricCriteria(
            criteria_id="c1",
            title="Criteria 1",
            max_score=0.0,
            score_given=0.0,
        )
    ]
    with pytest.raises(ValueError, match="phải lớn hơn 0"):
        await usecase.submit_peer_review_grade(
            review_id=assigned_review_id,
            reviewer_user_id="reviewer-peer",
            graded_criteria=zero_max_rubric,
        )

    # 6. Duplicate review by same reviewer rejected
    valid_rubric = [
        RubricCriteria(
            criteria_id="c1",
            title="Criteria 1",
            max_score=10.0,
            score_given=8.0,
            feedback="Bài làm tốt, trình bày rõ ràng.",
        )
    ]
    # First review succeeds
    ok, _ = await usecase.submit_peer_review_grade(
        review_id=assigned_review_id,
        reviewer_user_id="reviewer-peer",
        graded_criteria=valid_rubric,
    )
    assert ok is True

    # Second review with the same completed assignment_id must raise PermissionError
    with pytest.raises(PermissionError):
        await usecase.submit_peer_review_grade(
            review_id=assigned_review_id,
            reviewer_user_id="reviewer-peer",
            graded_criteria=valid_rubric,
        )


@pytest.mark.asyncio
async def test_uuid7_peer_review_id_not_truncated(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Ensure UUID7-length submission IDs are not truncated by s.id[:6]."""
    from contextlib import asynccontextmanager
    from unittest.mock import AsyncMock

    from src.modules.assessment.application.peer_review_usecase import PeerReviewUseCase

    repo = InMemoryAssessmentRepository()

    @asynccontextmanager
    async def _fake_scope():
        yield None

    monkeypatch.setattr(
        "src.modules.assessment.application.peer_review_usecase.async_session_scope",
        _fake_scope,
    )

    usecase = PeerReviewUseCase()
    usecase._get_repo = AsyncMock(return_value=repo)

    uuid7_sub_id = "peer-01934567-89ab-7cde-9012-3456789abcde"
    sub = PeerAssignmentSubmission(
        id=uuid7_sub_id,
        user_id="student-author",
        item_id="item-test",
        submission_url="https://example.com/project",
        text_content="My long UUID7 project",
        created_at="2026-11-10T00:00:00Z",
    )
    await repo.save_peer_submission(sub)
    # Reviewer must submit first under BR_PEER_001
    await repo.save_peer_submission(
        PeerAssignmentSubmission(
            id="peer-reviewer-other",
            user_id="reviewer-other",
            item_id="item-test",
            submission_url="https://example.com/reviewer",
            text_content="Reviewer submission",
            created_at="2026-11-10T01:00:00Z",
        )
    )

    reviews_to_grade = await usecase.get_peer_reviews_to_grade(
        user_id="reviewer-other", item_id="item-test"
    )
    assert len(reviews_to_grade) == 1
    assigned_id = reviews_to_grade[0]["review_id"]
    assert assigned_id.startswith("rev-")
    # Opaque assignment ID must NOT leak or equal predictable rev-{submission_id}
    assert assigned_id != f"rev-{uuid7_sub_id}"

    # Grade submission using the opaque assignment review_id and verify full UUID7 submission_id is resolved
    rubric = [
        RubricCriteria(
            criteria_id="c1",
            title="Code",
            max_score=10.0,
            score_given=9.0,
            feedback="Mã nguồn sạch sẽ và có cấu trúc tốt.",
        )
    ]
    ok, _ = await usecase.submit_peer_review_grade(
        review_id=assigned_id,
        reviewer_user_id="reviewer-other",
        graded_criteria=rubric,
    )
    assert ok is True
    reviews_for_uuid7_sub = await repo.get_peer_reviews_for_submission(uuid7_sub_id)
    assert len(reviews_for_uuid7_sub) == 1


@pytest.mark.asyncio
async def test_staff_self_grading_prevented(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure staff members cannot self-grade, claim, or regrade their own submissions."""
    from contextlib import asynccontextmanager
    from unittest.mock import AsyncMock

    from src.modules.assessment.application.peer_review_usecase import PeerReviewUseCase
    from src.shared.auth import CurrentUser

    repo = InMemoryAssessmentRepository()

    @asynccontextmanager
    async def _fake_scope():
        yield None

    monkeypatch.setattr(
        "src.modules.assessment.application.peer_review_usecase.async_session_scope",
        _fake_scope,
    )

    usecase = PeerReviewUseCase()
    usecase._get_repo = AsyncMock(return_value=repo)

    sub = PeerAssignmentSubmission(
        id="sub-ta-author-1",
        user_id="ta_author_id",
        item_id="item-ta-test",
        submission_url="https://example.com/ta-work",
        text_content="TA enrolled as student",
        created_at="2026-11-10T00:00:00Z",
    )
    await repo.save_peer_submission(sub)

    ta_user = CurrentUser(id="ta_author_id", role="TA", full_name="Trợ giảng A")

    # 1. claim_grading_task prevented
    with pytest.raises(PermissionError, match="không được phép tự khóa bài"):
        await usecase.claim_grading_task(
            submission_id="sub-ta-author-1",
            staff_user_id="ta_author_id",
            current_user=ta_user,
        )

    # 2. submit_staff_grading prevented
    rubric = [
        RubricCriteria(criteria_id="c1", title="Code", max_score=10.0, score_given=10.0)
    ]
    with pytest.raises(PermissionError, match="không được phép tự chấm điểm"):
        await usecase.submit_staff_grading(
            submission_id="sub-ta-author-1",
            staff_user_id="ta_author_id",
            graded_criteria=rubric,
            total_score=100.0,
            current_user=ta_user,
        )

    # 3. regrade_peer_submission_by_staff prevented
    with pytest.raises(PermissionError, match="không được phép tự chấm điểm"):
        await usecase.regrade_peer_submission_by_staff(
            submission_id="sub-ta-author-1",
            staff_user_id="ta_author_id",
            ta_score=100.0,
            current_user=ta_user,
        )


@pytest.mark.asyncio
async def test_list_grading_queue_empty_course_id_rejected():
    """Negative test: Validate course_id cannot be empty or whitespace in list_grading_queue (ReBAC bypass guard)."""
    from typing import Any, cast
    from unittest.mock import MagicMock, patch

    from connectrpc.code import Code
    from connectrpc.errors import ConnectError

    from src.gen.assessment.v1 import assessment_pb as pb
    from src.modules.assessment.presentation.assessment_handler import AssessmentHandler
    from src.shared.auth import CurrentUser

    usecase = AssessmentUseCase(repository=InMemoryAssessmentRepository())
    handler = AssessmentHandler(use_case=usecase)
    instructor = CurrentUser(id="inst-1", email="inst@example.com", role="INSTRUCTOR")
    mock_ctx = cast(Any, MagicMock())

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=instructor,
    ):
        # 1. Empty course_id -> INVALID_ARGUMENT
        with pytest.raises(ConnectError) as exc_info:
            await handler.list_grading_queue(
                pb.ListGradingQueueRequest(course_id=""), mock_ctx
            )
        assert exc_info.value.code == Code.INVALID_ARGUMENT
        assert "course_id là bắt buộc" in exc_info.value.message

        # 2. Whitespace course_id -> INVALID_ARGUMENT
        with pytest.raises(ConnectError) as exc_info2:
            await handler.list_grading_queue(
                pb.ListGradingQueueRequest(course_id="   "), mock_ctx
            )
        assert exc_info2.value.code == Code.INVALID_ARGUMENT
        assert "course_id là bắt buộc" in exc_info2.value.message


@pytest.mark.asyncio
async def test_list_question_banks_security_and_rebac():
    """Security test: Learner cannot view question banks/answers; Instructor without course ownership is rejected."""
    from typing import Any, cast
    from unittest.mock import AsyncMock, MagicMock, patch

    from connectrpc.code import Code
    from connectrpc.errors import ConnectError

    from src.gen.assessment.v1 import assessment_pb as pb
    from src.modules.assessment.presentation.assessment_handler import AssessmentHandler
    from src.modules.catalog.domain import Course, CourseStatus
    from src.shared.auth import CurrentUser

    usecase = AssessmentUseCase(repository=InMemoryAssessmentRepository())
    handler = AssessmentHandler(use_case=usecase)
    mock_ctx = cast(Any, MagicMock())

    # 1. Learner attempts to call list_question_banks -> PERMISSION_DENIED
    learner = CurrentUser(id="student-1", email="student@example.com", role="LEARNER")
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=learner,
    ):
        with pytest.raises(ConnectError) as exc_info:
            await handler.list_question_banks(
                pb.ListQuestionBanksRequest(course_id="course-secret"), mock_ctx
            )
        assert exc_info.value.code == Code.PERMISSION_DENIED

    # 2. Instructor calls with empty course_id -> INVALID_ARGUMENT
    instructor_intruder = CurrentUser(
        id="inst-intruder", email="intruder@example.com", role="INSTRUCTOR"
    )
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=instructor_intruder,
    ):
        with pytest.raises(ConnectError) as exc_info:
            await handler.list_question_banks(
                pb.ListQuestionBanksRequest(course_id=""), mock_ctx
            )
        assert exc_info.value.code == Code.INVALID_ARGUMENT

    # 3. Instructor calls with course owned by another instructor -> PERMISSION_DENIED
    mock_course = Course(
        id="c0000000-0000-0000-0000-000000000001",
        title="Bảo Mật Hệ Thống",
        slug="bao-mat-he-thong",
        owner_id="inst-real-owner",
        organization_id="org-1",
        status=CourseStatus.PUBLISHED,
    )
    with (
        patch(
            "src.modules.assessment.presentation.assessment_handler.require_current_user",
            return_value=instructor_intruder,
        ),
        patch.object(
            usecase,
            "get_course_for_item_or_submission",
            new=AsyncMock(return_value=mock_course),
        ),
    ):
        with pytest.raises(ConnectError) as exc_info:
            await handler.list_question_banks(
                pb.ListQuestionBanksRequest(
                    course_id="c0000000-0000-0000-0000-000000000001"
                ),
                mock_ctx,
            )
        assert exc_info.value.code == Code.PERMISSION_DENIED

    # 4. Authorized owner calls list_question_banks -> Success
    instructor_owner = CurrentUser(
        id="inst-real-owner", email="owner@example.com", role="INSTRUCTOR"
    )
    with (
        patch(
            "src.modules.assessment.presentation.assessment_handler.require_current_user",
            return_value=instructor_owner,
        ),
        patch.object(
            usecase,
            "get_course_for_item_or_submission",
            new=AsyncMock(return_value=mock_course),
        ),
        patch.object(usecase, "list_question_banks", new=AsyncMock(return_value=[])),
    ):
        resp = await handler.list_question_banks(
            pb.ListQuestionBanksRequest(
                course_id="c0000000-0000-0000-0000-000000000001"
            ),
            mock_ctx,
        )
        assert isinstance(resp, pb.ListQuestionBanksResponse)


@pytest.mark.asyncio
async def test_submit_staff_grading_rubric_normalization_and_score_override():
    """Math & Logic test: Rubric score normalized to 100-point scale and staff score overrides cheating score."""
    from typing import Any, cast
    from unittest.mock import AsyncMock, MagicMock, patch

    from src.gen.assessment.v1 import assessment_pb as pb
    from src.modules.assessment.presentation.assessment_handler import AssessmentHandler
    from src.modules.catalog.domain import Course, CourseStatus
    from src.shared.auth import CurrentUser

    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    handler = AssessmentHandler(use_case=usecase)
    staff = CurrentUser(id="inst-owner", email="inst@example.com", role="INSTRUCTOR")
    mock_ctx = cast(Any, MagicMock())

    mock_course = Course(
        id="c0000000-0000-0000-0000-000000000001",
        title="Khóa Học Math",
        slug="khoa-hoc-math",
        owner_id="inst-owner",
        organization_id="org-1",
        status=CourseStatus.PUBLISHED,
    )

    # Seed submission with an initial high peer score (95.0)
    sub = PeerAssignmentSubmission(
        id="sub-cheat-test",
        user_id="student-cheat",
        item_id="item-math-1",
        submission_url="http://cheat.com",
        text_content="Content",
        created_at="2026-08-18T10:00:00Z",
        final_score=95.0,
        status="PUBLISHED",
    )
    await repo.save_peer_submission(sub)

    # 1. Staff grades with criteria sum fallback (total_score=0 in request)
    # 3 criteria: max_scores 10, 10, 10 = 30. Given 8, 8, 8 = 24. Normalization: (24 / 30) * 100 = 80.0!
    req = pb.SubmitStaffGradingRequest(
        submission_id="sub-cheat-test",
        total_score=0.0,
        graded_criteria=[
            pb.RubricCriteria(
                criteria_id="c1", title="Criterion 1", max_score=10.0, score_given=8.0
            ),
            pb.RubricCriteria(
                criteria_id="c2", title="Criterion 2", max_score=10.0, score_given=8.0
            ),
            pb.RubricCriteria(
                criteria_id="c3", title="Criterion 3", max_score=10.0, score_given=8.0
            ),
        ],
        feedback="Normalized rubric grade",
    )

    with (
        patch(
            "src.modules.assessment.presentation.assessment_handler.require_current_user",
            return_value=staff,
        ),
        patch.object(
            usecase,
            "get_course_for_item_or_submission",
            new=AsyncMock(return_value=mock_course),
        ),
    ):
        resp = await handler.submit_staff_grading(req, mock_ctx)
        assert resp.success is True
        assert (
            resp.final_score == 80.0
        )  # Normalized to 80.0, NOT raw sum 24.0 and NOT old score 95.0!

    # 2. Staff directly overrides and lowers score to 25.0 due to plagiarism
    req_penalize = pb.SubmitStaffGradingRequest(
        submission_id="sub-cheat-test",
        total_score=25.0,
        graded_criteria=[],
        feedback="Phát hiện đạo văn, hạ điểm xuống 25.",
    )
    with (
        patch(
            "src.modules.assessment.presentation.assessment_handler.require_current_user",
            return_value=staff,
        ),
        patch.object(
            usecase,
            "get_course_for_item_or_submission",
            new=AsyncMock(return_value=mock_course),
        ),
    ):
        resp2 = await handler.submit_staff_grading(req_penalize, mock_ctx)
        assert resp2.success is True
        assert resp2.final_score == 25.0  # Successfully lowered from 80.0 to 25.0!


@pytest.mark.asyncio
async def test_instructor_action_tasks_url_format():
    """Cross-layer test: Verify action_url follows Next.js route with submissionId parameter."""
    from src.shared.auth import CurrentUser

    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    staff = CurrentUser(id="instructor-1", email="inst@example.com", role="INSTRUCTOR")

    # Seed overdue submission (> 48h)
    sub = PeerAssignmentSubmission(
        id="sub-overdue-123",
        user_id="student-overdue",
        item_id="item-overdue-1",
        submission_url="http://overdue.com",
        text_content="Overdue project",
        created_at="2026-08-01T10:00:00Z",
        status="SUBMITTED",
        final_score=None,
    )
    await repo.save_peer_submission(sub)

    tasks_result = await usecase.get_instructor_action_tasks(
        course_id="course-url-test",
        current_user=staff,
    )
    tasks = tasks_result.get("tasks", [])
    assert len(tasks) >= 1
    overdue_task = next(
        (t for t in tasks if t["id"] == "task-overdue-sub-overdue-123"), None
    )
    assert overdue_task is not None
    # Verify URL structure
    assert "grading-cockpit" not in overdue_task["action_url"]
    assert (
        "/instructor/courses/course-url-test/grading?submissionId=sub-overdue-123"
        == overdue_task["action_url"]
    )


@pytest.mark.asyncio
async def test_gradebook_completion_condition_progress_and_final_grade():
    """Business rule BR_GRADE_001 invariant test: Both progress >= 100.0 AND final_grade >= 80.0 required."""

    def check_completed(progress: float, final_grade: float) -> bool:
        return progress >= 100.0 and final_grade >= 80.0

    # Case 1: 100% progress but failed grade (75.0) -> NOT COMPLETED
    assert check_completed(100.0, 75.0) is False

    # Case 2: 70% progress with high grade (95.0) -> NOT COMPLETED
    assert check_completed(70.0, 95.0) is False

    # Case 3: 100% progress and passing grade (80.0) -> COMPLETED
    assert check_completed(100.0, 80.0) is True

    # Case 4: 100% progress and exceptional grade (98.0) -> COMPLETED
    assert check_completed(100.0, 98.0) is True


@pytest.mark.asyncio
async def test_br_peer_001_blocks_review_before_submission():
    """BR_PEER_001 strict enforcement: Must submit assignment before fetching peer reviews."""
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)

    await usecase.submit_peer_assignment(
        "author-1", "item-strict-1", "https://example.com/a1", "Essay 1"
    )

    with pytest.raises(ValueError, match="cần nộp bài trước"):
        await usecase.get_peer_reviews_to_grade(
            user_id="lurker-user", item_id="item-strict-1"
        )


@pytest.mark.asyncio
async def test_essay_instructor_only_mode_workflow():
    """INSTRUCTOR_ONLY mode: no peer review duty, immediate publish on staff grading."""
    from src.shared.auth import CurrentUser
    from src.shared.infrastructure.event_bus import EventBus

    repo = InMemoryAssessmentRepository()
    item_id = "item-inst-only"
    repo.learning_items_details[item_id] = {
        "id": item_id,
        "title": "Bài tập tự luận Giảng viên chấm",
        "reading_markdown": "Viết báo cáo kiến trúc.",
        "rubric_criteria_json": "",
        "essay_grading_mode": "INSTRUCTOR_ONLY",
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    usecase = AssessmentUseCase(repository=repo)
    staff = CurrentUser(id="inst-1", email="inst@example.com", role="INSTRUCTOR")

    sub_id, _ = await usecase.submit_peer_assignment(
        "stu-1", item_id, "https://example.com/essay", "My essay content"
    )
    sub = await repo.get_peer_submission(sub_id)
    assert sub is not None
    assert sub.review_duty_status == "NOT_APPLICABLE"

    # Peer review queue always empty in INSTRUCTOR_ONLY mode
    queue = await usecase.get_peer_reviews_to_grade("stu-1", item_id)
    assert queue == []

    status = await usecase.get_my_peer_submission_status("stu-1", item_id)
    assert status["has_submission"] is True
    assert status["essay_grading_mode"] == "INSTRUCTOR_ONLY"
    assert status["review_duty_status"] == "NOT_APPLICABLE"
    assert status["target_reviews_required"] == 0

    received_events: list[Any] = []

    async def _tracker(evt):
        received_events.append(evt)

    EventBus.subscribe(PeerAssignmentGradedDomainEvent, _tracker)
    criteria = [RubricCriteria("c1", "Chất lượng nội dung & Giải pháp", 10.0, 9.0)]
    ok, _, score, _ = await usecase.submit_staff_grading(
        submission_id=sub_id,
        staff_user_id="inst-1",
        graded_criteria=criteria,
        total_score=90.0,
        feedback="Rất tốt",
        current_user=staff,
    )
    assert ok is True
    assert score == 90.0
    assert any(
        e.user_id == "stu-1" and e.submission_id == sub_id for e in received_events
    )


@pytest.mark.asyncio
async def test_essay_dynamic_quota_two_student_class():
    """Dynamic Quota: 2-student class with required=3 -> target=min(3,1)=1 completes duty."""
    repo = InMemoryAssessmentRepository()
    item_id = "item-2stu"
    repo.learning_items_details[item_id] = {
        "id": item_id,
        "title": "Essay 2-student",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": "PEER_REVIEW",
        "required_peer_reviews": 3,
        "cold_start_hours": 48,
    }
    usecase = AssessmentUseCase(repository=repo)

    _sub_a, _ = await usecase.submit_peer_assignment(
        "stu-a", item_id, "https://example.com/a", "A essay"
    )
    sub_b, _ = await usecase.submit_peer_assignment(
        "stu-b", item_id, "https://example.com/b", "B essay"
    )

    reviews_for_a = await usecase.get_peer_reviews_to_grade("stu-a", item_id)
    assert len(reviews_for_a) == 1
    assigned_for_a = reviews_for_a[0]["review_id"]
    assert assigned_for_a != f"rev-{sub_b}"

    # Before 48h cold-start window elapses, target_reviews_required stays full (3) to block midnight quota farming
    status_before = await usecase.get_my_peer_submission_status("stu-a", item_id)
    assert status_before["target_reviews_required"] == 3
    assert status_before["reviews_completed_by_user"] == 0
    assert status_before["review_duty_status"] == "PENDING"

    # A grades B -> before 48h, pool is now empty so A moves to WAITING_POOL (NOT COMPLETED)
    criteria = [
        RubricCriteria(
            "c1", "Chất lượng nội dung & Giải pháp", 10.0, 9.0, "Nội dung tốt"
        ),
        RubricCriteria(
            "c2", "Bố cục, Trình bày & Minh chứng", 10.0, 8.0, "Trình bày rõ"
        ),
        RubricCriteria("c3", "Tính ứng dụng & Đóng góp", 10.0, 9.0, "Ứng dụng hay"),
    ]
    ok, _ = await usecase.submit_peer_review_grade(
        review_id=assigned_for_a,
        reviewer_user_id="stu-a",
        graded_criteria=criteria,
        item_id=item_id,
    )
    assert ok is True

    status_mid = await usecase.get_my_peer_submission_status("stu-a", item_id)
    assert status_mid["reviews_completed_by_user"] == 1
    assert status_mid["review_duty_status"] == "WAITING_POOL"

    # After 48h cold-start window elapses with no new submitters, dynamic quota shrinks to min(3, 1) = 1 -> COMPLETED
    from datetime import timedelta

    sub_a_entity = await repo.get_user_peer_submission("stu-a", item_id)
    assert sub_a_entity is not None
    sub_a_entity.created_at = (datetime.now(UTC) - timedelta(hours=49)).isoformat()
    await repo.save_peer_submission(sub_a_entity)

    status_after = await usecase.get_my_peer_submission_status("stu-a", item_id)
    assert status_after["reviews_completed_by_user"] == 1
    assert status_after["target_reviews_required"] == 1
    assert status_after["review_duty_status"] == "COMPLETED"

    # Student B has not graded any peer yet -> peer_feedbacks remain hidden until duty completes
    status_b_locked = await usecase.get_my_peer_submission_status("stu-b", item_id)
    assert status_b_locked["review_duty_status"] == "PENDING"
    assert status_b_locked["peer_feedbacks"] == []

    # After 49h cold-start window elapses for Student B's dynamic quota -> Student B completes 0/0 after grading or waiver?
    # Better: have Student B grade Student A -> duty COMPLETED and anonymous peer feedback unlocks
    reviews_for_b = await usecase.get_peer_reviews_to_grade("stu-b", item_id)
    assert len(reviews_for_b) == 1
    await usecase.submit_peer_review_grade(
        review_id=reviews_for_b[0]["review_id"],
        reviewer_user_id="stu-b",
        graded_criteria=criteria,
        item_id=item_id,
    )
    status_b_mid = await usecase.get_my_peer_submission_status("stu-b", item_id)
    assert status_b_mid["review_duty_status"] == "WAITING_POOL"
    assert status_b_mid["peer_feedbacks"] == []

    # After 49h cold-start window elapses for Student B -> dynamic quota shrinks to 1 -> COMPLETED and feedback unlocks
    sub_b_entity = await repo.get_user_peer_submission("stu-b", item_id)
    assert sub_b_entity is not None
    sub_b_entity.created_at = (datetime.now(UTC) - timedelta(hours=49)).isoformat()
    await repo.save_peer_submission(sub_b_entity)

    status_b = await usecase.get_my_peer_submission_status("stu-b", item_id)
    assert status_b["review_duty_status"] == "COMPLETED"
    assert len(status_b["peer_feedbacks"]) == 1
    assert status_b["peer_feedbacks"][0]["feedback_label"] == "Bạn học #1"


@pytest.mark.asyncio
async def test_essay_empty_pool_waiver_and_anti_laziness():
    """Dual-Release: empty pool -> WAIVED_EMPTY_POOL + event; non-empty pool -> grade visible but PENDING until review done."""
    from src.shared.auth import CurrentUser
    from src.shared.infrastructure.event_bus import EventBus

    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)
    staff = CurrentUser(id="inst-1", email="inst@example.com", role="INSTRUCTOR")

    received_events: list[Any] = []

    async def _tracker(evt):
        received_events.append(evt)

    EventBus.subscribe(PeerAssignmentGradedDomainEvent, _tracker)

    # Scenario A: Alone in pool -> early staff grading (< 48h) publishes score but holds WAITING_POOL;
    # after 48h cold-start window elapses -> WAIVED_EMPTY_POOL + completion event
    from datetime import timedelta

    item_solo = "item-solo"
    sub_solo, _ = await usecase.submit_peer_assignment(
        "solo-stu", item_solo, "https://example.com/solo", "Solo essay"
    )
    assert await usecase.get_peer_reviews_to_grade("solo-stu", item_solo) == []
    status_waiting = await usecase.get_my_peer_submission_status("solo-stu", item_solo)
    assert status_waiting["review_duty_status"] == "WAITING_POOL"

    ok, _, _, _ = await usecase.submit_staff_grading(
        submission_id=sub_solo,
        staff_user_id="inst-1",
        graded_criteria=[
            RubricCriteria("c1", "Chất lượng nội dung & Giải pháp", 10.0, 9.0)
        ],
        total_score=90.0,
        feedback="Chấm sớm",
        current_user=staff,
    )
    assert ok is True
    status_early = await usecase.get_my_peer_submission_status("solo-stu", item_solo)
    assert status_early["is_graded"] is True
    assert status_early["final_score"] == 0.0
    assert status_early["grade_source"] == ""
    assert status_early["staff_feedback"] == ""
    assert status_early["can_appeal"] is False
    assert status_early["review_duty_status"] == "WAITING_POOL"
    assert not any(e.user_id == "solo-stu" for e in received_events)

    # Simulate 49 hours elapsed -> cold-start waiver triggers, reveals score, and publishes completion event
    solo_entity = await repo.get_peer_submission(sub_solo)
    assert solo_entity is not None
    solo_entity.created_at = (datetime.now(UTC) - timedelta(hours=49)).isoformat()
    await repo.save_peer_submission(solo_entity)

    status_waived = await usecase.get_my_peer_submission_status("solo-stu", item_solo)
    assert status_waived["review_duty_status"] == "WAIVED_EMPTY_POOL"
    assert status_waived["is_graded"] is True
    assert status_waived["final_score"] == 90.0
    assert status_waived["grade_source"] == "TA"
    assert status_waived["staff_feedback"] == "Chấm sớm"
    assert status_waived["can_appeal"] is True
    assert any(e.user_id == "solo-stu" for e in received_events)

    # Scenario B: Anti-laziness — lazy student has classmate in pool but refuses to review
    received_events.clear()
    item_lazy = "item-lazy"
    repo.learning_items_details[item_lazy] = {
        "id": item_lazy,
        "title": "Lazy Item",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": "PEER_REVIEW",
        "required_peer_reviews": 1,
        "cold_start_hours": 48,
    }
    sub_lazy, _ = await usecase.submit_peer_assignment(
        "lazy-stu", item_lazy, "https://example.com/lazy", "Lazy essay"
    )
    _sub_peer, _ = await usecase.submit_peer_assignment(
        "diligent-stu", item_lazy, "https://example.com/diligent", "Diligent essay"
    )

    ok2, _, _, _ = await usecase.submit_staff_grading(
        submission_id=sub_lazy,
        staff_user_id="inst-1",
        graded_criteria=[
            RubricCriteria("c1", "Chất lượng nội dung & Giải pháp", 10.0, 8.5)
        ],
        total_score=85.0,
        feedback="GV đã chấm, hãy chấm nốt bài bạn học",
        current_user=staff,
    )
    assert ok2 is True
    # Completion event must NOT fire yet because pool has sub_peer waiting!
    assert not any(e.user_id == "lazy-stu" for e in received_events)

    status_lazy = await usecase.get_my_peer_submission_status("lazy-stu", item_lazy)
    assert status_lazy["is_graded"] is True
    assert status_lazy["final_score"] == 0.0
    assert status_lazy["grade_source"] == ""
    assert status_lazy["staff_feedback"] == ""
    assert status_lazy["can_appeal"] is False
    assert status_lazy["review_duty_status"] == "PENDING"
    assert status_lazy["available_pool_count"] == 1

    # Now lazy-stu fetches assigned peer review and grades sub_peer -> score unlocks, Dual-Release completes and fires completion event!
    lazy_queue = await usecase.get_peer_reviews_to_grade("lazy-stu", item_lazy)
    assert len(lazy_queue) == 1
    await usecase.submit_peer_review_grade(
        review_id=lazy_queue[0]["review_id"],
        reviewer_user_id="lazy-stu",
        graded_criteria=[
            RubricCriteria(
                "c1", "Chất lượng nội dung & Giải pháp", 10.0, 8.0, "Nội dung đạt chuẩn"
            ),
            RubricCriteria(
                "c2", "Bố cục, Trình bày & Minh chứng", 10.0, 8.0, "Trình bày rõ ràng"
            ),
            RubricCriteria(
                "c3", "Tính ứng dụng & Đóng góp", 10.0, 8.0, "Có tính thực tiễn"
            ),
        ],
        item_id=item_lazy,
    )
    status_lazy_done = await usecase.get_my_peer_submission_status(
        "lazy-stu", item_lazy
    )
    assert status_lazy_done["review_duty_status"] == "COMPLETED"
    assert status_lazy_done["is_graded"] is True
    assert status_lazy_done["final_score"] == 85.0
    assert status_lazy_done["grade_source"] == "TA"
    assert status_lazy_done["staff_feedback"] == "GV đã chấm, hãy chấm nốt bài bạn học"
    assert status_lazy_done["can_appeal"] is True
    assert any(e.user_id == "lazy-stu" for e in received_events)


@pytest.mark.asyncio
async def test_peer_resubmission_guards_and_duty_preservation():
    """Resubmission must not break active locks, must block on pending appeals, preserve completed/waived duty, and isolate peer reviews per attempt."""
    from src.modules.assessment.domain import (
        REVIEW_DUTY_COMPLETED,
        REVIEW_DUTY_WAIVED_EMPTY_POOL,
    )
    from src.shared.auth import CurrentUser

    repo = InMemoryAssessmentRepository()
    item_id = "item-resub-guards"
    repo.learning_items_details[item_id] = {
        "id": item_id,
        "title": "Guarded Essay",
        "reading_markdown": "",
        "rubric_criteria_json": "",
        "essay_grading_mode": "PEER_REVIEW",
        "required_peer_reviews": 1,
        "cold_start_hours": 48,
    }
    usecase = AssessmentUseCase(repository=repo)
    staff = CurrentUser(id="inst-guard", email="inst@example.com", role="INSTRUCTOR")

    # Empty submission rejected
    with pytest.raises(ValueError, match="Vui lòng cung cấp"):
        await usecase.submit_peer_assignment("stu-guard", item_id, "   ", "  ")

    sub_id, _ = await usecase.submit_peer_assignment(
        "stu-guard", item_id, "https://example.com/v1", "Attempt 1"
    )
    await usecase.submit_peer_assignment(
        "stu-peer-guard", item_id, "https://example.com/p1", "Peer essay"
    )

    # 1. Active lock blocks resubmission and preserves locked_by_user_id
    ok_claim, _, _ = await usecase.claim_grading_task(
        submission_id=sub_id, staff_user_id="inst-guard", current_user=staff
    )
    assert ok_claim is True
    with pytest.raises(ValueError, match="đang được"):
        await usecase.submit_peer_assignment(
            "stu-guard", item_id, "https://example.com/v2", "Attempt 2"
        )
    sub_locked = await repo.get_peer_submission(sub_id)
    assert sub_locked is not None
    assert sub_locked.locked_by_user_id == "inst-guard"
    assert sub_locked.attempt_number == 1

    # Release lock & peer grades Attempt 1 with 90.0
    await usecase.release_grading_task(sub_id, "inst-guard", current_user=staff)
    queue_peer = await usecase.get_peer_reviews_to_grade("stu-peer-guard", item_id)
    assert len(queue_peer) == 1
    await usecase.submit_peer_review_grade(
        review_id=queue_peer[0]["review_id"],
        reviewer_user_id="stu-peer-guard",
        graded_criteria=[
            RubricCriteria("c1", "Content", 10.0, 9.0, "Nội dung rõ ràng"),
            RubricCriteria("c2", "Structure", 10.0, 9.0, "Bố cục hợp lý"),
            RubricCriteria("c3", "Impact", 10.0, 9.0, "Có giá trị thực tiễn"),
        ],
        item_id=item_id,
    )

    # stu-guard completes review duty -> COMPLETED
    queue_stu = await usecase.get_peer_reviews_to_grade("stu-guard", item_id)
    assert len(queue_stu) == 1
    await usecase.submit_peer_review_grade(
        review_id=queue_stu[0]["review_id"],
        reviewer_user_id="stu-guard",
        graded_criteria=[
            RubricCriteria("c1", "Content", 10.0, 8.0, "Lập luận khá tốt"),
            RubricCriteria("c2", "Structure", 10.0, 8.0, "Trình bày mạch lạc"),
            RubricCriteria("c3", "Impact", 10.0, 8.0, "Khả năng áp dụng ổn"),
        ],
        item_id=item_id,
    )
    sub_completed = await repo.get_peer_submission(sub_id)
    assert sub_completed is not None
    assert sub_completed.review_duty_status == REVIEW_DUTY_COMPLETED
    assert sub_completed.status == "PUBLISHED"
    assert sub_completed.final_score == 90.0

    # 2. Pending appeal blocks resubmission
    await usecase.submit_grade_appeal("stu-guard", sub_id, "Cần phúc khảo")
    with pytest.raises(ValueError, match="khiếu nại"):
        await usecase.submit_peer_assignment(
            "stu-guard", item_id, "https://example.com/v2", "Attempt 2"
        )

    # Resolve appeal with 90.0 -> now resubmission is allowed
    await usecase.submit_staff_grading(
        submission_id=sub_id,
        staff_user_id="inst-guard",
        graded_criteria=[RubricCriteria("c1", "Content", 10.0, 9.0)],
        total_score=90.0,
        resolve_appeal=True,
        current_user=staff,
    )

    # 3. Resubmit Attempt 2 -> preserves REVIEW_DUTY_COMPLETED, resets current grading fields, snapshots 90.0
    await usecase.submit_peer_assignment(
        "stu-guard", item_id, "https://example.com/v2", "Attempt 2"
    )
    sub_v2 = await repo.get_peer_submission(sub_id)
    assert sub_v2 is not None
    assert sub_v2.attempt_number == 2
    assert sub_v2.status == "SUBMITTED"
    assert sub_v2.final_score is None
    assert sub_v2.graded_by_staff is False
    assert sub_v2.previous_best_score == 90.0
    assert sub_v2.review_duty_status == REVIEW_DUTY_COMPLETED

    # 4. Attempt 2 peer review is isolated from Attempt 1's 90.0 review!
    repo.learning_items_details[item_id]["required_peer_reviews"] = 2
    queue_peer_v2 = await usecase.get_peer_reviews_to_grade("stu-peer-guard", item_id)
    assert len(queue_peer_v2) == 1
    repo.learning_items_details[item_id]["required_peer_reviews"] = 1
    await usecase.submit_peer_review_grade(
        review_id=queue_peer_v2[0]["review_id"],
        reviewer_user_id="stu-peer-guard",
        graded_criteria=[
            RubricCriteria("c1", "Content", 10.0, 6.0, "Cần bổ sung dẫn chứng"),
            RubricCriteria("c2", "Structure", 10.0, 6.0, "Bố cục tương đối ổn"),
            RubricCriteria("c3", "Impact", 10.0, 6.0, "Ý tưởng ở mức khá"),
        ],
        item_id=item_id,
    )
    sub_v2_graded = await repo.get_peer_submission(sub_id)
    assert sub_v2_graded is not None
    assert sub_v2_graded.status == "PUBLISHED"
    assert (
        sub_v2_graded.final_score == 60.0
    )  # Pure attempt 2 score (not averaged with attempt 1!)
    assert (
        sub_v2_graded.get_effective_published_grade()[0] == 90.0
    )  # Highest Score Wins!

    # 5. Also verify WAIVED_EMPTY_POOL is preserved on resubmission
    sub_waived = PeerAssignmentSubmission(
        id="sub-waived-1",
        user_id="stu-waived",
        item_id=item_id,
        submission_url="https://example.com/w1",
        text_content="Waived v1",
        created_at="2026-11-10T00:00:00Z",
        status="PUBLISHED",
        final_score=82.0,
        review_duty_status=REVIEW_DUTY_WAIVED_EMPTY_POOL,
    )
    await repo.save_peer_submission(sub_waived)
    await usecase.submit_peer_assignment(
        "stu-waived", item_id, "https://example.com/w2", "Waived v2"
    )
    sub_waived_v2 = await repo.get_peer_submission("sub-waived-1")
    assert sub_waived_v2 is not None
    assert sub_waived_v2.review_duty_status == REVIEW_DUTY_WAIVED_EMPTY_POOL
    assert sub_waived_v2.previous_best_score == 82.0
