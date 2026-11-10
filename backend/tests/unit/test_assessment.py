from datetime import UTC
from typing import Any

import pytest

from src.modules.assessment.application import AssessmentUseCase
from src.modules.assessment.domain import (
    UNLIMITED_ATTEMPTS_SENTINEL,
    AssessmentRepositoryInterface,
    GradeAppeal,
    HonorCodeAgreement,
    LabSubmission,
    PeerAssignmentGradedDomainEvent,
    PeerAssignmentSubmission,
    PeerReview,
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
        self.grade_appeals: dict[str, GradeAppeal] = {}
        self.matrices: dict[str, Any] = {}
        self.item_types: dict[str, str] = {}
        self.rubric_criteria_json_map: dict[str, str] = {}

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

    async def save_peer_review(self, review: PeerReview) -> None:
        self.peer_reviews.append(review)

    async def get_peer_reviews_by_reviewer(
        self, reviewer_user_id: str, item_id: str
    ) -> list[PeerReview]:
        return [
            r
            for r in self.peer_reviews
            if r.reviewer_user_id == reviewer_user_id and r.item_id == item_id
        ]

    async def get_peer_reviews_for_submission(
        self, submission_id: str
    ) -> list[PeerReview]:
        return [r for r in self.peer_reviews if r.submission_id == submission_id]

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

    async def get_lab_test_cases_json(self, item_id: str) -> str | None:
        return None

    async def get_item_rubric_criteria_json(self, item_id: str) -> str | None:
        return getattr(self, "rubric_criteria_json_map", {}).get(item_id, None)

    async def claim_submission_lock(
        self, submission_id: str, user_id: str, timeout_minutes: int = 30
    ) -> bool:
        from datetime import UTC, datetime

        now = datetime.now(UTC)
        sub = await self.get_peer_submission(submission_id)
        if not sub:
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
        return True

    async def list_grading_queue_items(
        self,
        course_id: str = "",
        item_id: str = "",
        instructor_id: str = "",
    ) -> list[dict[str, Any]]:
        results = []
        for s in self.peer_submissions:
            if item_id and s.item_id != item_id:
                continue
            is_appeal = s.id in self.grade_appeals
            appeal = self.grade_appeals.get(s.id)
            appeal_reason = appeal.appeal_reason if appeal else ""
            revs = [r for r in self.peer_reviews if r.submission_id == s.id]
            is_outlier = any(r.is_outlier for r in revs)
            status_str = "PENDING"
            if s.locked_by_user_id:
                status_str = "CLAIMED"
            elif is_appeal:
                status_str = "APPEALED"
            elif s.final_score is not None:
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
                    "grade_source": s.grade_source or "PEER_REVIEW",
                    "staff_score": float(s.final_score or 0.0),
                    "status": status_str,
                    "peer_score": 0.0,
                    "peer_reviews_count": len(revs),
                }
            )
        return results

    async def get_course_gradebook_data(
        self,
        course_id: str,
        search_query: str = "",
        status_filter: str = "",
        page_size: int = 50,
        page_token: str = "",
    ) -> dict[str, Any]:
        items = list({s.item_id for s in self.peer_submissions})
        num_items = len(items)
        w = round(1.0 / num_items, 4) if num_items > 0 else 0.0
        columns = [
            {
                "item_id": i,
                "item_title": f"Bài tập {i}",
                "item_type": "PEER_ASSIGNMENT",
                "weight": w,
                "max_score": 100.0,
            }
            for i in items
        ]
        user_ids = list({s.user_id for s in self.peer_submissions})
        rows = []
        for uid in user_ids:
            cells = []
            total_score = 0.0
            for col in columns:
                matching = next(
                    (
                        s
                        for s in self.peer_submissions
                        if s.user_id == uid and s.item_id == col["item_id"]
                    ),
                    None,
                )
                score = float(matching.final_score or 0.0) if matching else 0.0
                cells.append(
                    {
                        "item_id": col["item_id"],
                        "score": score,
                        "is_passed": score >= 80.0,
                        "provenance": matching.grade_source if matching else "PEER",
                        "graded_at": matching.published_at if matching else "",
                        "submission_id": matching.id if matching else "",
                    }
                )
                total_score += float(col["weight"]) * score
            rows.append(
                {
                    "user_id": uid,
                    "full_name": f"Học viên {uid}",
                    "email": f"{uid}@example.com",
                    "avatar_url": "",
                    "enrollment_status": "ACTIVE",
                    "final_weighted_grade": round(total_score, 2),
                    "is_course_completed": total_score >= 80.0,
                    "cells": cells,
                }
            )
        return {
            "course_id": course_id,
            "course_title": f"Course {course_id}",
            "columns": columns,
            "rows": rows,
            "total_students": len(rows),
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

    # 1. Submit Peer Assignment
    sub_id, _msg = await usecase.submit_peer_assignment(
        "author-1",
        "item-peer-1",
        "https://github.com/test/repo",
        "My ML project submission text",
    )
    assert sub_id.startswith("peer-")

    # 2. Reviewer 1 grades 100% (30/30)
    c1 = [
        RubricCriteria("c1", "Quality", 10.0, 10.0),
        RubricCriteria("c2", "Docs", 10.0, 10.0),
        RubricCriteria("c3", "Tests", 10.0, 10.0),
    ]
    ok1, msg1 = await usecase.submit_peer_review_grade(sub_id, "rev-1", c1)
    assert ok1 is True
    assert "Outlier" not in msg1

    # 3. Reviewer 2 grades 30% (9/30) -> High delta >30% triggers Outlier Flag!
    c2 = [
        RubricCriteria("c1", "Quality", 10.0, 3.0),
        RubricCriteria("c2", "Docs", 10.0, 3.0),
        RubricCriteria("c3", "Tests", 10.0, 3.0),
    ]
    ok2, msg2 = await usecase.submit_peer_review_grade(sub_id, "rev-2", c2)
    assert ok2 is True
    assert "Outlier Flagged" in msg2

    # 4. Grade Appeal
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
    assert "Assignment submitted successfully" in msg1
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
    assert "Assignment submitted successfully" in msg2
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

    # Staff grades attempt 1 with 85.0
    criteria = [RubricCriteria("c1", "Quality", 10.0, 8.5)]
    await usecase.submit_staff_grading(
        submission_id=sub_id1,
        staff_user_id="instructor-1",
        graded_criteria=criteria,
        total_score=85.0,
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

    # Staff grades attempt 2 with lower score (70.0) -> Highest Score Wins maintains 85.0!
    criteria_low = [RubricCriteria("c1", "Quality", 10.0, 7.0)]
    _, _, final_s, _ = await usecase.submit_staff_grading(
        submission_id=sub_id2,
        staff_user_id="instructor-1",
        graded_criteria=criteria_low,
        total_score=70.0,
        current_user=staff,
    )
    assert final_s == 85.0  # Preserved highest score!
    sub2_graded = await repo.get_peer_submission(sub_id2)
    assert sub2_graded is not None
    assert sub2_graded.final_score == 85.0

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
async def test_course_gradebook_matrix_usecase():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)

    # Seed 2 peer submissions
    sub1 = PeerAssignmentSubmission(
        id="sub-gb-1",
        user_id="student-1",
        item_id="item-proj-1",
        submission_url="http://example.com/1",
        text_content="Content 1",
        created_at="2026-08-18T10:00:00Z",
        final_score=90.0,
        grade_source="TA",
        published_at="2026-08-18T11:00:00Z",
    )
    sub2 = PeerAssignmentSubmission(
        id="sub-gb-2",
        user_id="student-2",
        item_id="item-proj-1",
        submission_url="http://example.com/2",
        text_content="Content 2",
        created_at="2026-08-18T10:00:00Z",
        final_score=70.0,
        grade_source="PEER_REVIEW",
        published_at="2026-08-18T11:00:00Z",
    )
    await repo.save_peer_submission(sub1)
    await repo.save_peer_submission(sub2)

    # Query Gradebook
    gb = await usecase.get_course_gradebook("course-test-gb")
    assert gb["course_id"] == "course-test-gb"
    assert len(gb["columns"]) >= 1
    assert len(gb["rows"]) == 2
    assert gb["rows"][0]["cells"][0]["score"] in (90.0, 70.0)
    assert gb["rows"][0]["cells"][0]["provenance"] in ("TA", "PEER_REVIEW")


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

    # Submit a peer assignment by another user
    _sub_id, _ = await usecase.submit_peer_assignment(
        "author-peer-1",
        "item-custom-peer",
        "https://figma.com/file/123",
        "Figma UI/UX prototype",
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

    # Attempting to self-grade must raise PermissionError
    with pytest.raises(PermissionError, match="không được phép tự chấm điểm"):
        await usecase.submit_peer_review_grade(
            review_id="rev-sub-fraud-1",
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
            review_id="rev-sub-valid-1",
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
            review_id="rev-sub-valid-1",
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
            review_id="rev-sub-valid-1",
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
            review_id="rev-sub-valid-1",
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
            review_id="rev-sub-valid-1",
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
        )
    ]
    # First review succeeds
    ok, _ = await usecase.submit_peer_review_grade(
        review_id="rev-sub-valid-1",
        reviewer_user_id="reviewer-peer",
        graded_criteria=valid_rubric,
    )
    assert ok is True

    # Second review by same reviewer must raise PermissionError
    with pytest.raises(PermissionError, match="đã thực hiện đánh giá"):
        await usecase.submit_peer_review_grade(
            review_id="rev-sub-valid-1",
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

    reviews_to_grade = await usecase.get_peer_reviews_to_grade(
        user_id="reviewer-other", item_id="item-test"
    )
    assert len(reviews_to_grade) == 1
    assert reviews_to_grade[0]["review_id"] == f"rev-{uuid7_sub_id}"

    # Grade submission using the full review_id
    rubric = [
        RubricCriteria(criteria_id="c1", title="Code", max_score=10.0, score_given=9.0)
    ]
    ok, _ = await usecase.submit_peer_review_grade(
        review_id=f"rev-{uuid7_sub_id}",
        reviewer_user_id="reviewer-other",
        graded_criteria=rubric,
    )
    assert ok is True


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
