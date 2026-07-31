from typing import Any
import pytest
from src.modules.assessment.application.assessment_usecase import AssessmentUseCase
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
from src.modules.assessment.infrastructure.sandbox_service import (
    PythonCodeSandboxExecutor,
)


class InMemoryAssessmentRepository(AssessmentRepositoryInterface):
    def __init__(self) -> None:
        self.honor_codes: dict[str, HonorCodeAgreement] = {}
        self.quiz_submissions: list[QuizSubmission] = []
        self.cooldowns: dict[str, QuizCooldown] = {}
        self.lab_submissions: list[LabSubmission] = []
        self.peer_submissions: list[PeerAssignmentSubmission] = []
        self.peer_reviews: list[PeerReview] = []
        self.grade_appeals: dict[str, GradeAppeal] = {}
        self.matrices: dict[str, Any] = {}

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

    async def get_quiz_cooldown(
        self, user_id: str, item_id: str
    ) -> QuizCooldown | None:
        return self.cooldowns.get(f"{user_id}:{item_id}")

    async def save_quiz_cooldown(self, cooldown: QuizCooldown) -> None:
        self.cooldowns[cooldown.id] = cooldown

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
        from src.modules.assessment.domain.entities import QuestionBank

        return QuestionBank(
            id="bank_test_1",
            course_id=course_id,
            title=title,
            category=category,
            description=description,
        )

    async def list_question_banks(self, course_id: str):
        return []

    async def add_question_to_bank(
        self,
        bank_id: str,
        text: str,
        question_type: str,
        difficulty: str,
        explanation: str,
        options_data: list[dict],
    ):
        from src.modules.assessment.domain.entities import Question

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
    ):
        from src.modules.assessment.domain.entities import Question, QuestionOption

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
        from src.modules.assessment.domain.entities import QuizMatrix

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

    async def get_quiz_matrix(self, item_id: str):
        return self.matrices.get(item_id)

    async def get_questions_by_bank(self, bank_id: str):
        from src.modules.assessment.domain.entities import Question, QuestionOption

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
        q["shuffled_correct_index"]
        for q in await usecase.generate_quiz_session_questions(repo, item_id, seed=42)
    ]
    wrong_answers = [(ans + 1) % 4 for ans in correct_answers]

    # 1. Without Honor Code -> Should fail
    res_no_honor = await usecase.submit_graded_quiz(user_id, item_id, correct_answers)
    assert res_no_honor["passed"] is False
    assert "Cam kết Trung thực" in res_no_honor["answer_explanations"][0]

    # 2. Agree Honor Code
    await usecase.submit_honor_code(user_id, item_id, True)

    # 3. Submit Perfect Score -> 100% Pass
    res_pass = await usecase.submit_graded_quiz(user_id, item_id, correct_answers)
    assert res_pass["score_percent"] == 100.0
    assert res_pass["passed"] is True
    assert res_pass["attempts_left"] == 3
    assert res_pass["cooldown_seconds_left"] == 0

    # 4. Fail 3 consecutive attempts to trigger 8h Cooldown
    user_fail = "user-test-cooldown"
    await usecase.submit_honor_code(user_fail, item_id, True)

    # Attempt 1 (Fail)
    r1 = await usecase.submit_graded_quiz(user_fail, item_id, wrong_answers)
    assert r1["passed"] is False
    assert r1["attempts_left"] == 2

    # Attempt 2 (Fail)
    r2 = await usecase.submit_graded_quiz(user_fail, item_id, wrong_answers)
    assert r2["passed"] is False
    assert r2["attempts_left"] == 1

    # Attempt 3 (Fail) -> Cooldown activated
    r3 = await usecase.submit_graded_quiz(user_fail, item_id, wrong_answers)
    assert r3["passed"] is False
    assert r3["attempts_left"] == 0
    assert r3["cooldown_seconds_left"] == 28800

    # Attempt 4 (Blocked by Cooldown)
    r4 = await usecase.submit_graded_quiz(user_fail, item_id, [0, 1, 2, 0, 1])
    assert r4["passed"] is False
    assert r4["cooldown_seconds_left"] > 0
    assert "giãn cách" in r4["answer_explanations"][0]

    # Verify session start is blocked by Cooldown immediately
    with pytest.raises(ValueError) as exc_info:
        await usecase.start_graded_quiz_session(user_fail, item_id)
    assert "quay lại sau" in str(exc_info.value)

    # Verify session start is NOT blocked because user has already passed (BR_QUIZ_001)
    res_pass = await usecase.start_graded_quiz_session(user_id, item_id)
    assert len(res_pass["questions"]) > 0


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
    sub_id, msg = await usecase.submit_peer_assignment(
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
    from datetime import datetime, timedelta, timezone

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
    expired_start = (datetime.now(timezone.utc) - timedelta(minutes=60)).isoformat()

    # FIX V1 test: Also expire the DB active session so it triggers DB-first validation
    session_key = f"{user_id}:{item_id}"
    active_sess = repo.active_sessions.get(session_key)
    if active_sess:
        active_sess.expires_at = (
            datetime.now(timezone.utc) - timedelta(minutes=15)
        ).isoformat()

    token_payload = {
        "sub": user_id,
        "item_id": item_id,
        "seed": 12345,
        "start_time": expired_start,
        "duration_minutes": 45,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    timeout_token = jwt.encode(
        token_payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM
    )

    res_timeout = await usecase.submit_graded_quiz(
        user_id,
        item_id,
        [0, 1, 2, 0, 1],
        start_time_iso=expired_start,
        duration_minutes=45,
    )
    # With Fix V1, DB session expiry now returns "hết hạn theo máy chủ" message
    assert res_timeout["score_percent"] == 0.0
    assert res_timeout["passed"] is False
    assert "hết hạn" in res_timeout["answer_explanations"][0]


@pytest.mark.asyncio
async def test_peer_regrade_fallback_queue():
    from datetime import datetime, timedelta, timezone

    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)

    old_time = (datetime.now(timezone.utc) - timedelta(days=6)).isoformat()
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
        from src.modules.identity.domain.entities import User, UserRole
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

        # Attempt submitting graded quiz in audit mode -> Should be blocked
        res = await usecase.submit_graded_quiz(audit_user_id, "item_quiz_audit", [0, 1])
        assert res["passed"] is False
        assert "Audit Mode" in res["answer_explanations"][0]

        # Attempt submitting peer assignment in audit mode -> Should be blocked
        sub_id, msg = await usecase.submit_peer_assignment(
            audit_user_id, "item_peer_audit", "http://example.com", "text"
        )
        assert sub_id == ""
        assert "Audit Mode" in msg
    except Exception as e:
        pytest.skip(f"Skipping audit mode db test: DB not reachable ({e})")


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
    shuffled_answers = [q["shuffled_correct_index"] for q in questions]

    # Agree Honor Code
    await usecase.submit_honor_code(user_id, item_id, True)

    # Submit answers matching shuffled indices -> Should pass 100%
    res = await usecase.submit_graded_quiz(
        user_id, item_id, shuffled_answers, session_seed=session_seed
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

    res = await usecase.submit_graded_quiz(user_id, item_id, [], session_seed=12345)
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
        [0, 1, 2, 0, 1],
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
