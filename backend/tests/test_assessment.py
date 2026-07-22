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
from src.modules.assessment.infrastructure.sandbox_service import PythonCodeSandboxExecutor


class InMemoryAssessmentRepository(AssessmentRepositoryInterface):

    def __init__(self) -> None:
        self.honor_codes: dict[str, HonorCodeAgreement] = {}
        self.quiz_submissions: list[QuizSubmission] = []
        self.cooldowns: dict[str, QuizCooldown] = {}
        self.lab_submissions: list[LabSubmission] = []
        self.peer_submissions: list[PeerAssignmentSubmission] = []
        self.peer_reviews: list[PeerReview] = []
        self.grade_appeals: dict[str, GradeAppeal] = {}

    async def save_honor_code(self, agreement: HonorCodeAgreement) -> None:
        self.honor_codes[agreement.id] = agreement

    async def get_honor_code(self, user_id: str, item_id: str) -> HonorCodeAgreement | None:
        return self.honor_codes.get(f"{user_id}:{item_id}")

    async def save_quiz_submission(self, submission: QuizSubmission) -> None:
        self.quiz_submissions.append(submission)

    async def get_quiz_submissions(self, user_id: str, item_id: str) -> list[QuizSubmission]:
        return [s for s in self.quiz_submissions if s.user_id == user_id and s.item_id == item_id]

    async def get_quiz_cooldown(self, user_id: str, item_id: str) -> QuizCooldown | None:
        return self.cooldowns.get(f"{user_id}:{item_id}")

    async def save_quiz_cooldown(self, cooldown: QuizCooldown) -> None:
        self.cooldowns[cooldown.id] = cooldown

    async def save_lab_submission(self, submission: LabSubmission) -> None:
        self.lab_submissions.append(submission)

    async def get_lab_submissions(self, user_id: str, item_id: str) -> list[LabSubmission]:
        return [s for s in self.lab_submissions if s.user_id == user_id and s.item_id == item_id]

    async def save_peer_submission(self, submission: PeerAssignmentSubmission) -> None:
        self.peer_submissions.append(submission)

    async def get_peer_submission(self, submission_id: str) -> PeerAssignmentSubmission | None:
        for s in self.peer_submissions:
            if s.id == submission_id:
                return s
        return None

    async def get_user_peer_submission(self, user_id: str, item_id: str) -> PeerAssignmentSubmission | None:
        for s in self.peer_submissions:
            if s.user_id == user_id and s.item_id == item_id:
                return s
        return None

    async def get_peer_submissions_for_item(self, item_id: str, exclude_user_id: str) -> list[PeerAssignmentSubmission]:
        return [s for s in self.peer_submissions if s.item_id == item_id and s.user_id != exclude_user_id]

    async def save_peer_review(self, review: PeerReview) -> None:
        self.peer_reviews.append(review)

    async def get_peer_reviews_by_reviewer(self, reviewer_user_id: str, item_id: str) -> list[PeerReview]:
        return [r for r in self.peer_reviews if r.reviewer_user_id == reviewer_user_id and r.item_id == item_id]

    async def get_peer_reviews_for_submission(self, submission_id: str) -> list[PeerReview]:
        return [r for r in self.peer_reviews if r.submission_id == submission_id]

    async def save_grade_appeal(self, appeal: GradeAppeal) -> None:
        self.grade_appeals[appeal.submission_id] = appeal

    async def get_grade_appeal(self, submission_id: str) -> GradeAppeal | None:
        return self.grade_appeals.get(submission_id)


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

    # 1. Without Honor Code -> Should fail
    res_no_honor = await usecase.submit_graded_quiz(user_id, item_id, [0, 1, 2, 0, 1])
    assert res_no_honor["passed"] is False
    assert "Honor Code" in res_no_honor["answer_explanations"][0]

    # 2. Agree Honor Code
    await usecase.submit_honor_code(user_id, item_id, True)

    # 3. Submit Perfect Score -> 100% Pass
    res_pass = await usecase.submit_graded_quiz(user_id, item_id, [0, 1, 2, 0, 1])
    assert res_pass["score_percent"] == 100.0
    assert res_pass["passed"] is True
    assert res_pass["attempts_left"] == 3
    assert res_pass["cooldown_seconds_left"] == 0

    # 4. Fail 3 consecutive attempts to trigger 8h Cooldown
    user_fail = "user-test-cooldown"
    await usecase.submit_honor_code(user_fail, item_id, True)

    # Attempt 1 (Fail)
    r1 = await usecase.submit_graded_quiz(user_fail, item_id, [3, 3, 3, 3, 3])
    assert r1["passed"] is False
    assert r1["attempts_left"] == 2

    # Attempt 2 (Fail)
    r2 = await usecase.submit_graded_quiz(user_fail, item_id, [3, 3, 3, 3, 3])
    assert r2["passed"] is False
    assert r2["attempts_left"] == 1

    # Attempt 3 (Fail) -> Cooldown activated
    r3 = await usecase.submit_graded_quiz(user_fail, item_id, [3, 3, 3, 3, 3])
    assert r3["passed"] is False
    assert r3["attempts_left"] == 0
    assert r3["cooldown_seconds_left"] == 28800

    # Attempt 4 (Blocked by Cooldown)
    r4 = await usecase.submit_graded_quiz(user_fail, item_id, [0, 1, 2, 0, 1])
    assert r4["passed"] is False
    assert r4["cooldown_seconds_left"] > 0
    assert "cooldown period" in r4["answer_explanations"][0]


@pytest.mark.asyncio
async def test_sandbox_auto_graded_lab():
    repo = InMemoryAssessmentRepository()
    usecase = AssessmentUseCase(repository=repo)

    valid_code = """
def solution(arr):
    return sum(arr)
"""
    res = await usecase.submit_auto_graded_lab("user-1", "item-lab-1", valid_code, "python")
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
        "author-1", "item-peer-1", "https://github.com/test/repo", "My ML project submission text"
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
    ok_appeal, status = await usecase.submit_grade_appeal("author-1", sub_id, "Scores are inconsistent")
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

    # Timeout handling
    infinite_loop_code = "import time\ntime.sleep(5)"
    res_timeout = await executor.execute_python(infinite_loop_code, [{"assertion_code": "assert True"}])
    assert res_timeout.passed is False
    assert "[TIMEOUT]" in res_timeout.test_logs
