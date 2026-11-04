from datetime import UTC, datetime

import pytest

from src.modules.assessment.application.quiz_usecase import QuizUseCase
from src.modules.assessment.domain import (
    HonorCodeAgreement,
    Question,
    QuestionOption,
    QuizMatrix,
    QuizSubmission,
    QuizSubmissionAnswer,
    calculate_topic_mastery,
)
from tests.unit.test_assessment import InMemoryAssessmentRepository


class MockAssessmentRepository(InMemoryAssessmentRepository):
    def __init__(self, questions: list[Question]):
        super().__init__()
        self.sample_questions = questions

    async def get_questions_by_bank(self, bank_id: str) -> list[Question]:
        return self.sample_questions

    async def get_any_questions(self, limit: int = 20) -> list[Question]:
        return self.sample_questions


@pytest.fixture
def mock_quiz_repo():
    bank_questions = [
        Question(
            id="q1",
            bank_id="bank_1",
            text="Câu hỏi về Biến và Kiểu dữ liệu",
            topic="Biến & Kiểu dữ liệu",
            explanation="Giải thích biến chi tiết",
            options=[
                QuestionOption(
                    id="o1_1",
                    question_id="q1",
                    option_text="Đáp án đúng",
                    is_correct=True,
                    order_index=0,
                ),
                QuestionOption(
                    id="o1_2",
                    question_id="q1",
                    option_text="Đáp án sai",
                    is_correct=False,
                    order_index=1,
                ),
            ],
        ),
        Question(
            id="q2",
            bank_id="bank_1",
            text="Câu hỏi về Vòng lặp For",
            topic="Cấu trúc điều khiển",
            explanation="Giải thích vòng lặp chi tiết",
            options=[
                QuestionOption(
                    id="o2_1",
                    question_id="q2",
                    option_text="Đáp án đúng",
                    is_correct=True,
                    order_index=0,
                ),
                QuestionOption(
                    id="o2_2",
                    question_id="q2",
                    option_text="Đáp án sai",
                    is_correct=False,
                    order_index=1,
                ),
            ],
        ),
        Question(
            id="q3",
            bank_id="bank_1",
            text="Câu hỏi về Class & OOP",
            topic="Hướng đối tượng",
            explanation="Giải thích OOP chi tiết",
            options=[
                QuestionOption(
                    id="o3_1",
                    question_id="q3",
                    option_text="Đáp án đúng",
                    is_correct=True,
                    order_index=0,
                ),
                QuestionOption(
                    id="o3_2",
                    question_id="q3",
                    option_text="Đáp án sai",
                    is_correct=False,
                    order_index=1,
                ),
            ],
        ),
    ]

    repo = MockAssessmentRepository(bank_questions)
    repo.matrices["item_quiz_1"] = QuizMatrix(
        item_id="item_quiz_1",
        bank_id="bank_1",
        time_limit_minutes=30,
        passing_threshold_percent=80.0,
        easy_count=3,
        medium_count=0,
        hard_count=0,
        shuffle_options=False,
        max_attempts=3,
        cooldown_hours=8,
    )
    repo.item_types["item_quiz_1"] = "GRADED_QUIZ"
    repo.item_types["item_practice_1"] = "PRACTICE_QUIZ"
    return repo


@pytest.mark.asyncio
async def test_calculate_topic_mastery_diagnostics():
    answers = [
        QuizSubmissionAnswer(
            id="a1",
            submission_id="s1",
            question_id="q1",
            question_text="Q1",
            question_type="SINGLE_CHOICE",
            options_json=[],
            selected_option_indices=[0],
            is_correct=True,
            topic="Chủ đề 1",
            explanation="Exp 1",
        ),
        QuizSubmissionAnswer(
            id="a2",
            submission_id="s1",
            question_id="q2",
            question_text="Q2",
            question_type="SINGLE_CHOICE",
            options_json=[],
            selected_option_indices=[0],
            is_correct=True,
            topic="Chủ đề 1",
            explanation="Exp 2",
        ),
        QuizSubmissionAnswer(
            id="a3",
            submission_id="s1",
            question_id="q3",
            question_text="Q3",
            question_type="SINGLE_CHOICE",
            options_json=[],
            selected_option_indices=[1],
            is_correct=False,
            topic="Chủ đề 2",
            explanation="Exp 3",
        ),
    ]

    mastery = calculate_topic_mastery(answers)
    assert len(mastery) == 2

    t1 = next(m for m in mastery if m.topic == "Chủ đề 1")
    assert t1.total_questions == 2
    assert t1.correct_questions == 2
    assert t1.mastery_percent == 100.0
    assert t1.mastery_level == 1

    t2 = next(m for m in mastery if m.topic == "Chủ đề 2")
    assert t2.total_questions == 1
    assert t2.correct_questions == 0
    assert t2.mastery_percent == 0.0
    assert t2.mastery_level == 3


@pytest.mark.asyncio
async def test_submit_quiz_saves_snapshot_answers(mock_quiz_repo):
    uc = QuizUseCase(repository=mock_quiz_repo)
    await uc.submit_honor_code(user_id="user_1", item_id="item_quiz_1", is_agreed=True)

    res = await uc.submit_graded_quiz(
        user_id="user_1",
        item_id="item_quiz_1",
        question_answers=[[0], [0], [1]],
        session_seed=123,
    )
    assert res["score_percent"] > 0

    subs = await mock_quiz_repo.get_quiz_submissions("user_1", "item_quiz_1")
    assert len(subs) == 1
    sub_id = subs[0].id

    saved_answers = await mock_quiz_repo.get_quiz_submission_answers(sub_id)
    assert len(saved_answers) == 3
    assert saved_answers[0].is_correct is True
    assert saved_answers[1].is_correct is True
    assert saved_answers[2].is_correct is False
    assert saved_answers[0].topic != ""
    assert len(saved_answers[0].options_json) == 2


@pytest.mark.asyncio
async def test_get_quiz_attempt_history(mock_quiz_repo):
    uc = QuizUseCase(repository=mock_quiz_repo)
    await uc.submit_honor_code(user_id="user_2", item_id="item_quiz_1", is_agreed=True)

    await uc.submit_graded_quiz(
        user_id="user_2",
        item_id="item_quiz_1",
        question_answers=[[0], [1], [1]],
        session_seed=123,
    )

    history = await uc.get_quiz_attempt_history(user_id="user_2", item_id="item_quiz_1")
    assert len(history["attempts"]) == 1
    assert history["attempts"][0]["attempt_number"] == 1
    assert history["attempts"][0]["total_questions"] == 3
    assert history["attempts"][0]["correct_count"] == 1
    assert history["has_passed"] is False
    assert history["attempts_left"] == 2
    assert len(history["aggregate_topic_mastery"]) > 0


@pytest.mark.asyncio
async def test_adaptive_answer_masking_graded_quiz(mock_quiz_repo):
    uc = QuizUseCase(repository=mock_quiz_repo)
    await uc.submit_honor_code(user_id="user_3", item_id="item_quiz_1", is_agreed=True)

    await uc.submit_graded_quiz(
        user_id="user_3",
        item_id="item_quiz_1",
        question_answers=[[0], [1], [1]],
        session_seed=123,
    )
    subs = await mock_quiz_repo.get_quiz_submissions("user_3", "item_quiz_1")
    sub_id = subs[0].id

    detail = await uc.get_quiz_attempt_detail(
        user_id="user_3", submission_id=sub_id, is_staff=False
    )
    assert detail["is_answer_masked"] is True
    for ans in detail["answers"]:
        assert ans["correct_option_indices"] == []
        assert ans["explanation"] == ""
        assert isinstance(ans["is_correct"], bool)
        assert ans["topic"] != ""

    staff_detail = await uc.get_quiz_attempt_detail(
        user_id="staff_1", submission_id=sub_id, is_staff=True
    )
    assert staff_detail["is_answer_masked"] is False
    assert any(len(a["correct_option_indices"]) > 0 for a in staff_detail["answers"])

    mock_quiz_repo.quiz_submissions.append(
        QuizSubmission(
            id="sub_passed",
            user_id="user_3",
            item_id="item_quiz_1",
            selected_option_indexes=[0, 0, 0],
            score_percent=100.0,
            passed=True,
            attempt_number=2,
            created_at=datetime.now(UTC).isoformat(),
        )
    )
    detail_after_pass = await uc.get_quiz_attempt_detail(
        user_id="user_3", submission_id=sub_id, is_staff=False
    )
    assert detail_after_pass["is_answer_masked"] is False


@pytest.mark.asyncio
async def test_rebac_idor_protection(mock_quiz_repo):
    uc = QuizUseCase(repository=mock_quiz_repo)
    sub = QuizSubmission(
        id="sub_private_user",
        user_id="user_victim",
        item_id="item_quiz_1",
        selected_option_indexes=[0],
        score_percent=50.0,
        passed=False,
        attempt_number=1,
        created_at=datetime.now(UTC).isoformat(),
    )
    mock_quiz_repo.quiz_submissions.append(sub)

    with pytest.raises(PermissionError, match="không có quyền xem chi tiết"):
        await uc.get_quiz_attempt_detail(
            user_id="user_attacker", submission_id="sub_private_user", is_staff=False
        )


@pytest.mark.asyncio
async def test_submit_graded_quiz_adaptive_masking_on_failure(mock_quiz_repo):
    uc = QuizUseCase(repository=mock_quiz_repo)
    user_id = "user_fail_test"
    item_id = "item_quiz_1"

    await mock_quiz_repo.save_honor_code(
        HonorCodeAgreement(user_id=user_id, item_id=item_id, is_agreed=True)
    )

    # Start session
    sess = await uc.start_graded_quiz_session(user_id, item_id, force_new=True)
    session_seed = sess["session_seed"]

    # 1. Submit all wrong answers (score = 0%, passed = False)
    res_fail = await uc.submit_graded_quiz(
        user_id,
        item_id,
        question_answers=[[1], [1], [1]],  # Option index 1 is wrong
        session_seed=session_seed,
    )
    assert res_fail["passed"] is False
    assert res_fail["score_percent"] == 0.0
    # Explanations must be masked (no " — Giải thích ...")
    for exp in res_fail["answer_explanations"]:
        assert "Giải thích" not in exp
        assert exp.startswith("Câu ")

    # 2. Start new session and pass (score = 100%, passed = True)
    sess2 = await uc.start_graded_quiz_session(user_id, item_id, force_new=True)
    res_pass = await uc.submit_graded_quiz(
        user_id,
        item_id,
        question_answers=[[0], [0], [0]],  # Option index 0 is correct
        session_seed=sess2["session_seed"],
    )
    assert res_pass["passed"] is True
    assert res_pass["score_percent"] == 100.0
    # Explanations must be revealed once passed
    assert any("Giải thích" in exp for exp in res_pass["answer_explanations"])
