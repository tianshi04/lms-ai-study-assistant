import json
from datetime import UTC, datetime
from typing import Any, cast
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.gen.assessment.v1 import assessment_pb as pb
from src.gen.catalog.v1 import catalog_pb
from src.modules.assessment.application import AssessmentUseCase
from src.modules.assessment.domain import (
    PeerAssignmentGradedDomainEvent,
    PeerAssignmentSubmission,
    PeerReview,
    RubricCriteria,
)
from src.modules.assessment.presentation.assessment_handler import AssessmentHandler
from src.modules.catalog.domain import Course, CourseStatus
from src.modules.catalog.presentation.catalog_handler import CatalogHandler
from src.modules.learning.application.learning_event_handler import (
    handle_peer_assignment_graded,
)
from src.shared.auth import CurrentUser
from src.shared.infrastructure.event_bus import EventBus
from tests.unit.test_assessment import InMemoryAssessmentRepository


class InMemoryCatalogRepository:
    def __init__(self) -> None:
        self.courses: dict[str, Course] = {}

    async def get_course_detail(self, course_id: str) -> Course | None:
        return self.courses.get(course_id)


@pytest.fixture
def test_setup():
    repo = InMemoryAssessmentRepository()
    catalog_repo = InMemoryCatalogRepository()

    course = Course(
        id="course_test_1",
        title="Kiến trúc Phần mềm Nâng cao",
        slug="kien-truc-phan-mem-nang-cao",
        owner_id="instructor_owner",
        co_instructor_ids=["co_instructor_1"],
        ta_ids=["ta_assigned_1", "ta_assigned_2"],
        status=CourseStatus.PUBLISHED,
    )
    catalog_repo.courses["course_test_1"] = course

    now_iso = datetime.now(UTC).isoformat()
    sub_1 = PeerAssignmentSubmission(
        id="sub_test_001",
        user_id="student_1",
        item_id="item_peer_1",
        submission_url="https://github.com/student1/project",
        text_content="Bài nộp kiến trúc Clean Architecture",
        created_at=now_iso,
        attempt_number=1,
        status="SUBMITTED",
    )
    repo.peer_submissions.append(sub_1)

    use_case = AssessmentUseCase(
        repository=repo,
        repo_factory=lambda session: repo,
        catalog_repo_factory=lambda session: catalog_repo,
    )
    handler = AssessmentHandler(use_case=use_case)

    return {
        "repo": repo,
        "catalog_repo": catalog_repo,
        "course": course,
        "sub_1": sub_1,
        "use_case": use_case,
        "handler": handler,
    }


@pytest.mark.asyncio
async def test_claim_grading_task_success_and_conflict(test_setup):
    """Test TA 1 claims lock successfully, and TA 2 is blocked from conflicting."""
    handler = test_setup["handler"]
    ta_1 = CurrentUser(id="ta_assigned_1", role="TA", full_name="Trợ giảng 1")
    ta_2 = CurrentUser(id="ta_assigned_2", role="TA", full_name="Trợ giảng 2")

    # 1. TA 1 claims lock
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=ta_1,
    ):
        req = pb.ClaimGradingTaskRequest(submission_id="sub_test_001")
        resp = await handler.claim_grading_task(req, None)
        assert resp.success is True
        assert resp.locked_by_user_id == "ta_assigned_1"
        assert resp.lease_duration_seconds == 1800

    # 2. TA 2 tries to claim same locked submission -> fails with FAILED_PRECONDITION
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=ta_2,
    ):
        req = pb.ClaimGradingTaskRequest(submission_id="sub_test_001")
        with pytest.raises(ConnectError) as exc:
            await handler.claim_grading_task(req, None)
        assert exc.value.code == Code.FAILED_PRECONDITION


@pytest.mark.asyncio
async def test_renew_and_release_grading_task_lock(test_setup):
    """Test renewing lock by lock holder vs stranger, and explicit lock release."""
    handler = test_setup["handler"]
    ta_1 = CurrentUser(id="ta_assigned_1", role="TA", full_name="Trợ giảng 1")
    ta_2 = CurrentUser(id="ta_assigned_2", role="TA", full_name="Trợ giảng 2")

    # Claim lock first by TA 1
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=ta_1,
    ):
        await handler.claim_grading_task(
            pb.ClaimGradingTaskRequest(submission_id="sub_test_001"), None
        )

        # Renew lock by TA 1
        renew_resp = await handler.renew_grading_task_lock(
            pb.RenewGradingTaskLockRequest(
                submission_id="sub_test_001", extend_minutes=30
            ),
            None,
        )
        assert renew_resp.success is True
        assert renew_resp.remaining_seconds == 1800

    # TA 2 tries to renew lock held by TA 1 -> fails
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=ta_2,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.renew_grading_task_lock(
                pb.RenewGradingTaskLockRequest(
                    submission_id="sub_test_001", extend_minutes=30
                ),
                None,
            )
        assert exc.value.code == Code.FAILED_PRECONDITION

    # TA 1 releases lock
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=ta_1,
    ):
        rel_resp = await handler.release_grading_task(
            pb.ReleaseGradingTaskRequest(submission_id="sub_test_001"), None
        )
        assert rel_resp.success is True

    # TA 2 can now claim the lock
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=ta_2,
    ):
        claim_resp = await handler.claim_grading_task(
            pb.ClaimGradingTaskRequest(submission_id="sub_test_001"), None
        )
        assert claim_resp.success is True
        assert claim_resp.locked_by_user_id == "ta_assigned_2"


@pytest.mark.asyncio
async def test_rebac_guard_blocks_unauthorized_ta(test_setup):
    """Test ReBAC Layer 3 guard blocks outside TAs and unauthorized users from grading."""
    handler = test_setup["handler"]
    ta_stranger = CurrentUser(
        id="ta_stranger_99", role="TA", full_name="Trợ giảng Trường Khác"
    )

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=ta_stranger,
    ):
        # 1. claim_grading_task
        with pytest.raises(ConnectError) as exc:
            await handler.claim_grading_task(
                pb.ClaimGradingTaskRequest(submission_id="sub_test_001"), None
            )
        assert exc.value.code == Code.PERMISSION_DENIED

        # 2. list_grading_queue
        with pytest.raises(ConnectError) as exc:
            await handler.list_grading_queue(
                pb.ListGradingQueueRequest(course_id="course_test_1"), None
            )
        assert exc.value.code == Code.PERMISSION_DENIED

        # 3. submit_staff_grading
        with pytest.raises(ConnectError) as exc:
            await handler.submit_staff_grading(
                pb.SubmitStaffGradingRequest(
                    submission_id="sub_test_001", total_score=90.0
                ),
                None,
            )
        assert exc.value.code == Code.PERMISSION_DENIED


@pytest.mark.asyncio
async def test_staff_grading_immediate_publish_and_eventbus(test_setup):
    """Test TA submitting grade publishes immediately and triggers EventBus event chain."""
    handler = test_setup["handler"]
    ta_1 = CurrentUser(id="ta_assigned_1", role="TA", full_name="Trợ giảng 1")

    dispatched_events: list[Any] = []

    async def mock_publish(event: Any) -> None:
        dispatched_events.append(event)

    criteria = [
        pb.RubricCriteria(
            criteria_id="c1",
            title="Clean Architecture",
            max_score=10.0,
            score_given=9.0,
        ),
        pb.RubricCriteria(
            criteria_id="c2",
            title="Test Coverage",
            max_score=10.0,
            score_given=9.0,
        ),
    ]

    with (
        patch.object(EventBus, "publish", side_effect=mock_publish),
        patch(
            "src.modules.assessment.presentation.assessment_handler.require_current_user",
            return_value=ta_1,
        ),
    ):
        submit_req = pb.SubmitStaffGradingRequest(
            submission_id="sub_test_001",
            graded_criteria=criteria,
            total_score=90.0,
            feedback="Kiến trúc tốt, cần thêm integration test",
        )
        submit_resp = await handler.submit_staff_grading(submit_req, None)
        assert submit_resp.success is True
        assert submit_resp.final_score == 90.0

        # EventBus MUST have received PeerAssignmentGradedDomainEvent immediately
        assert len(dispatched_events) == 1
        event = dispatched_events[0]
        assert isinstance(event, PeerAssignmentGradedDomainEvent)
        assert event.user_id == "student_1"
        assert event.final_score == 90.0
        assert event.passed is True


@pytest.mark.asyncio
async def test_eventbus_triggers_certificate_on_full_completion():
    """Test PeerAssignmentGradedDomainEvent triggers progress recalculation and OpenBadges 2.0 certificate issuance."""
    with (
        patch(
            "src.modules.learning.application.learning_event_handler.LearningUseCase"
        ) as mock_learn_cls,
        patch(
            "src.modules.learning.application.learning_event_handler.CertificateUseCase"
        ) as mock_cert_cls,
    ):
        mock_learning_uc = AsyncMock()
        mock_prog = MagicMock()
        mock_prog.overall_progress_percent = 100.0
        mock_learning_uc.mark_item_complete.return_value = (True, mock_prog)
        mock_learn_cls.return_value = mock_learning_uc

        mock_cert_uc = AsyncMock()
        mock_cert_cls.return_value = mock_cert_uc

        event = PeerAssignmentGradedDomainEvent(
            user_id="learner_graduate",
            course_id="course_test_1",
            item_id="item_peer_1",
            submission_id="sub_graduate",
            final_score=95.0,
            passed=True,
            grader_id="ta_1",
        )

        await handle_peer_assignment_graded(event)

        # Verify progress marked complete
        mock_learning_uc.mark_item_complete.assert_called_once_with(
            user_id="learner_graduate",
            course_id="course_test_1",
            item_id="item_peer_1",
        )
        # Verify Certificate issued
        mock_cert_uc.get_verified_certificate.assert_called_once_with(
            user_id="learner_graduate",
            course_id="course_test_1",
        )


@pytest.mark.asyncio
async def test_list_grading_queue_and_submission_detail(test_setup):
    """Test listing grading queue with filtering and fetching submission details."""
    handler = test_setup["handler"]
    repo = test_setup["repo"]
    owner = CurrentUser(
        id="instructor_owner", role="INSTRUCTOR", full_name="Giảng viên"
    )

    # Add peer review history
    rev = PeerReview(
        id="rev-001",
        submission_id="sub_test_001",
        reviewer_user_id="peer_reviewer_1",
        item_id="item_peer_1",
        rubric_criteria=[
            RubricCriteria(
                criteria_id="c1",
                title="Code Quality",
                max_score=10.0,
                score_given=8.0,
            )
        ],
        total_score=80.0,
        is_outlier=False,
        created_at=datetime.now(UTC).isoformat(),
    )
    repo.peer_reviews.append(rev)

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=owner,
    ):
        # 1. list_grading_queue
        list_req = pb.ListGradingQueueRequest(
            course_id="course_test_1",
            status=pb.GradingQueueStatus.ALL,
        )
        queue_resp = await handler.list_grading_queue(list_req, None)
        assert queue_resp.total_count == 1
        assert len(queue_resp.items) == 1
        assert queue_resp.items[0].submission_id == "sub_test_001"

        # 2. get_grading_submission_detail
        detail_req = pb.GetGradingSubmissionDetailRequest(submission_id="sub_test_001")
        detail_resp = await handler.get_grading_submission_detail(detail_req, None)
        assert detail_resp.submission.submission_id == "sub_test_001"
        assert len(detail_resp.peer_reviews) == 1
        assert detail_resp.peer_reviews[0].review_id == "rev-001"
        assert detail_resp.text_content == "Bài nộp kiến trúc Clean Architecture"


@pytest.mark.asyncio
async def test_get_course_gradebook_and_action_tasks(test_setup):
    """Test get_course_gradebook and get_instructor_action_tasks via AssessmentUseCase and CatalogHandler."""
    usecase = test_setup["use_case"]
    owner = CurrentUser(
        id="instructor_owner", role="INSTRUCTOR", full_name="Giảng viên"
    )

    # 1. AssessmentUseCase.get_course_gradebook
    gradebook_resp = await usecase.get_course_gradebook(
        course_id="course_test_1",
        current_user=owner,
    )
    assert gradebook_resp["course_id"] == "course_test_1"
    assert len(gradebook_resp["rows"]) == 1
    assert gradebook_resp["rows"][0]["user_id"] == "student_1"

    # 2. AssessmentUseCase.get_instructor_action_tasks
    tasks_resp = await usecase.get_instructor_action_tasks(
        course_id="course_test_1",
        current_user=owner,
    )
    assert "tasks" in tasks_resp
    assert "total_pending" in tasks_resp

    # 3. Test via CatalogHandler
    mock_catalog_uc = AsyncMock()
    mock_catalog_uc.get_course_detail.return_value = test_setup["course"]
    cat_handler = CatalogHandler(use_case=mock_catalog_uc)

    with (
        patch(
            "src.modules.catalog.presentation.catalog_handler.require_current_user",
            return_value=owner,
        ),
        patch(
            "src.modules.assessment.application.assessment_usecase.AssessmentUseCase.get_course_gradebook",
            return_value=gradebook_resp,
        ),
        patch(
            "src.modules.assessment.application.assessment_usecase.AssessmentUseCase.get_instructor_action_tasks",
            return_value=tasks_resp,
        ),
    ):
        cat_gb_resp = await cat_handler.get_course_gradebook(
            catalog_pb.GetCourseGradebookRequest(course_id="course_test_1"),
            cast(Any, MagicMock()),
        )
        assert cat_gb_resp.course_id == "course_test_1"
        assert len(cat_gb_resp.rows) == 1

        cat_tasks_resp = await cat_handler.get_instructor_action_tasks(
            catalog_pb.GetInstructorActionTasksRequest(course_id="course_test_1"),
            cast(Any, MagicMock()),
        )
        assert cat_tasks_resp.pending_grading_count == 0


@pytest.mark.asyncio
async def test_question_bank_handler_rebac_and_validation(test_setup):
    """Test Question Bank ReBAC ownership enforcement and non-empty string validation."""
    handler = test_setup["handler"]
    owner = CurrentUser(
        id=test_setup["course"].owner_id,
        role="USER_ROLE_INSTRUCTOR",
        full_name="Instructor Owner",
    )
    unauthorized_instructor = CurrentUser(
        id="intruder_instructor",
        role="USER_ROLE_INSTRUCTOR",
        email="intruder@lms.local",
    )

    ctx = cast(Any, MagicMock())

    # 1. create_question_bank validation & ReBAC
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=owner,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.create_question_bank(
                pb.CreateQuestionBankRequest(course_id="  ", title="Valid Title"),
                ctx,
            )
        assert exc.value.code == Code.INVALID_ARGUMENT
        assert "Mã khóa học không được để trống" in exc.value.message

        with pytest.raises(ConnectError) as exc:
            await handler.create_question_bank(
                pb.CreateQuestionBankRequest(course_id="course_test_1", title="  "),
                ctx,
            )
        assert exc.value.code == Code.INVALID_ARGUMENT
        assert "Tiêu đề ngân hàng câu hỏi không được để trống" in exc.value.message

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=unauthorized_instructor,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.create_question_bank(
                pb.CreateQuestionBankRequest(course_id="course_test_1", title="Bank 1"),
                ctx,
            )
        assert exc.value.code == Code.PERMISSION_DENIED

    # 2. configure_quiz_matrix validation & ReBAC
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=owner,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.configure_quiz_matrix(
                pb.ConfigureQuizMatrixRequest(item_id=" ", bank_id="bank_1"),
                ctx,
            )
        assert exc.value.code == Code.INVALID_ARGUMENT
        assert "Mã mục học tập không được để trống" in exc.value.message

        with pytest.raises(ConnectError) as exc:
            await handler.configure_quiz_matrix(
                pb.ConfigureQuizMatrixRequest(item_id="item_peer_1", bank_id="  "),
                ctx,
            )
        assert exc.value.code == Code.INVALID_ARGUMENT
        assert "Mã ngân hàng câu hỏi không được để trống" in exc.value.message

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=unauthorized_instructor,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.configure_quiz_matrix(
                pb.ConfigureQuizMatrixRequest(item_id="item_peer_1", bank_id="bank_1"),
                ctx,
            )
        assert exc.value.code == Code.PERMISSION_DENIED

    # 3. add_question_to_bank validation & ReBAC
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=owner,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.add_question_to_bank(
                pb.AddQuestionToBankRequest(bank_id="   ", text="Question text?"),
                ctx,
            )
        assert exc.value.code == Code.INVALID_ARGUMENT
        assert "Mã ngân hàng câu hỏi không được để trống" in exc.value.message

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=unauthorized_instructor,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.add_question_to_bank(
                pb.AddQuestionToBankRequest(
                    bank_id="bank_test_1", text="Question text?"
                ),
                ctx,
            )
        assert exc.value.code == Code.PERMISSION_DENIED

    # 4. update_question validation & ReBAC
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=owner,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.update_question(
                pb.UpdateQuestionRequest(question_id=" ", text="New text"),
                ctx,
            )
        assert exc.value.code == Code.INVALID_ARGUMENT
        assert "Mã câu hỏi không được để trống" in exc.value.message

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=unauthorized_instructor,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.update_question(
                pb.UpdateQuestionRequest(question_id="q_test_1", text="New text"),
                ctx,
            )
        assert exc.value.code == Code.PERMISSION_DENIED

    # 5. delete_question validation & ReBAC
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=owner,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.delete_question(
                pb.DeleteQuestionRequest(question_id="   "),
                ctx,
            )
        assert exc.value.code == Code.INVALID_ARGUMENT
        assert "Mã câu hỏi không được để trống" in exc.value.message

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=unauthorized_instructor,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.delete_question(
                pb.DeleteQuestionRequest(question_id="q_test_1"),
                ctx,
            )
        assert exc.value.code == Code.PERMISSION_DENIED

    # 6. list_question_banks validation & ReBAC
    learner = CurrentUser(id="student_1", role="LEARNER", full_name="Học viên")
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=learner,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.list_question_banks(
                pb.ListQuestionBanksRequest(course_id="course_test_1"),
                ctx,
            )
        assert exc.value.code == Code.PERMISSION_DENIED

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=owner,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.list_question_banks(
                pb.ListQuestionBanksRequest(course_id="   "),
                ctx,
            )
        assert exc.value.code == Code.INVALID_ARGUMENT

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=unauthorized_instructor,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.list_question_banks(
                pb.ListQuestionBanksRequest(course_id="course_test_1"),
                ctx,
            )
        assert exc.value.code == Code.PERMISSION_DENIED

    # 7. get_quiz_matrix validation & ReBAC
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=learner,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.get_quiz_matrix(
                pb.GetQuizMatrixRequest(item_id="item_peer_1"),
                ctx,
            )
        assert exc.value.code == Code.PERMISSION_DENIED

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=owner,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.get_quiz_matrix(
                pb.GetQuizMatrixRequest(item_id="   "),
                ctx,
            )
        assert exc.value.code == Code.INVALID_ARGUMENT

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=unauthorized_instructor,
    ):
        with pytest.raises(ConnectError) as exc:
            await handler.get_quiz_matrix(
                pb.GetQuizMatrixRequest(item_id="item_peer_1"),
                ctx,
            )
        assert exc.value.code == Code.PERMISSION_DENIED


@pytest.mark.asyncio
async def test_staff_grading_score_normalization_and_consistency(test_setup):
    """Test staff grading raw score normalization (24/30 -> 80.0%) and consistency checks."""
    handler = test_setup["handler"]
    owner = CurrentUser(
        id="instructor_owner", role="INSTRUCTOR", full_name="Giảng viên"
    )
    ctx = cast(Any, MagicMock())

    criteria = [
        pb.RubricCriteria(
            criteria_id="c1",
            title="Criterion 1",
            max_score=10.0,
            score_given=8.0,
        ),
        pb.RubricCriteria(
            criteria_id="c2",
            title="Criterion 2",
            max_score=20.0,
            score_given=16.0,
        ),
    ]

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=owner,
    ):
        # 1. Fallback raw sum: given 24/30 with total_score=0 -> normalized to 80.0%
        req = pb.SubmitStaffGradingRequest(
            submission_id="sub_test_001",
            graded_criteria=criteria,
            total_score=0.0,
            feedback="Tốt",
        )
        resp = await handler.submit_staff_grading(req, ctx)
        assert resp.success is True
        assert resp.final_score == 80.0

        # 2. Inconsistent total_score: 50.0 vs criteria sum 80.0% -> INVALID_ARGUMENT
        req_inconsistent = pb.SubmitStaffGradingRequest(
            submission_id="sub_test_001",
            graded_criteria=criteria,
            total_score=50.0,
            feedback="Lệch điểm",
        )
        with pytest.raises(ConnectError) as exc:
            await handler.submit_staff_grading(req_inconsistent, ctx)
        assert exc.value.code == Code.INVALID_ARGUMENT
        assert "không nhất quán" in str(exc.value)


@pytest.mark.asyncio
async def test_peer_review_enrollment_and_report_authorization(test_setup):
    """Test enrollment requirement for peer grading and report ownership enforcement."""
    handler = test_setup["handler"]
    repo = test_setup["repo"]
    use_case = test_setup["use_case"]
    ctx = cast(Any, MagicMock())

    learner_stranger = CurrentUser(
        id="stranger_user", role="LEARNER", full_name="Người lạ"
    )
    learner_owner = CurrentUser(id="student_1", role="LEARNER", full_name="Chủ bài nộp")

    # 1. Non-owner cannot report someone else's submission
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=learner_stranger,
    ):
        report_req = pb.ReportPeerReviewRequest(
            review_id="sub_test_001",
            report_reason="Spam",
        )
        with pytest.raises(ConnectError) as exc:
            await handler.report_peer_review(report_req, ctx)
        assert exc.value.code == Code.PERMISSION_DENIED

    # 2. Empty report reason rejected
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=learner_owner,
    ):
        empty_req = pb.ReportPeerReviewRequest(
            review_id="sub_test_001",
            report_reason="   ",
        )
        with pytest.raises(ConnectError) as exc:
            await handler.report_peer_review(empty_req, ctx)
        assert exc.value.code == Code.INVALID_ARGUMENT

    # 3. Owner can report successfully
    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=learner_owner,
    ):
        valid_req = pb.ReportPeerReviewRequest(
            review_id="sub_test_001",
            report_reason="Lượt chấm không công bằng",
        )
        resp = await handler.report_peer_review(valid_req, ctx)
        assert resp.success is True

    # 4. Non-enrolled user blocked from peer grading
    repo.is_enrolled = lambda user, course: False
    rubrics = [
        RubricCriteria(criteria_id="c1", title="Code", max_score=10.0, score_given=8.0)
    ]
    with pytest.raises(PermissionError) as exc:
        await use_case.submit_peer_review_grade(
            review_id="sub_test_001",
            reviewer_user_id="stranger_user",
            graded_criteria=rubrics,
        )
    assert "cần đăng ký khóa học" in str(exc.value)


@pytest.mark.asyncio
async def test_peer_review_custom_non_100_rubric_and_tamper_proofing(test_setup):
    """Test custom non-100 rubric, client payload max_score tamper-proofing, and staff detail mapping."""
    repo = test_setup["repo"]
    use_case = test_setup["use_case"]
    owner = CurrentUser(
        id="instructor_owner", role="INSTRUCTOR", full_name="Giảng viên"
    )

    # 1. Setup custom non-100 rubric (20 + 30 = 50 max points)
    custom_rubrics = [
        {
            "criteria_id": "crit_arch",
            "title": "Architecture & Clean Code",
            "max_score": 20.0,
        },
        {
            "criteria_id": "crit_impl",
            "title": "Feature Completeness",
            "max_score": 30.0,
        },
    ]
    if not hasattr(repo, "rubric_criteria_json_map"):
        repo.rubric_criteria_json_map = {}
    repo.rubric_criteria_json_map["item_custom_50"] = json.dumps(custom_rubrics)

    custom_sub = PeerAssignmentSubmission(
        id="sub_custom_50",
        user_id="student_author",
        item_id="item_custom_50",
        submission_url="https://github.com/student/repo",
        text_content="Báo cáo đồ án",
        created_at=datetime.now(UTC).isoformat(),
        attempt_number=1,
        status="SUBMITTED",
    )
    await repo.save_peer_submission(custom_sub)
    repo.is_enrolled = lambda user, course: True

    # 2. Honest peer grading: 16/20 and 24/30 = 40/50 -> normalized to 80.0%
    honest_rubrics = [
        RubricCriteria(
            criteria_id="crit_arch",
            title="Architecture & Clean Code",
            max_score=20.0,
            score_given=16.0,
        ),
        RubricCriteria(
            criteria_id="crit_impl",
            title="Feature Completeness",
            max_score=30.0,
            score_given=24.0,
        ),
    ]
    ok, _ = await use_case.submit_peer_review_grade(
        review_id="sub_custom_50",
        reviewer_user_id="peer_reviewer_1",
        graded_criteria=honest_rubrics,
    )
    assert ok is True
    reviews = await repo.get_peer_reviews_for_submission("sub_custom_50")
    assert len(reviews) == 1
    assert reviews[0].total_score == 80.0

    # 3. Malicious client tampering: attempts to spoof max_score=1.0 to hack percentage
    spoofed_rubrics = [
        RubricCriteria(
            criteria_id="crit_arch",
            title="Architecture",
            max_score=1.0,
            score_given=18.0,
        ),
        RubricCriteria(
            criteria_id="crit_impl",
            title="Completeness",
            max_score=1.0,
            score_given=27.0,
        ),
    ]
    ok, _ = await use_case.submit_peer_review_grade(
        review_id="sub_custom_50",
        reviewer_user_id="peer_reviewer_2",
        graded_criteria=spoofed_rubrics,
    )
    assert ok is True
    reviews_all = await repo.get_peer_reviews_for_submission("sub_custom_50")
    rev2 = next(r for r in reviews_all if r.reviewer_user_id == "peer_reviewer_2")
    # Expected 45 / 50 = 90.0% (tampered max_score=1.0 ignored, DB max_scores 20.0 and 30.0 used)
    assert rev2.total_score == 90.0
    for crit in rev2.rubric_criteria:
        if crit.criteria_id == "crit_arch":
            assert crit.max_score == 20.0
            assert crit.title == "Architecture & Clean Code"
        elif crit.criteria_id == "crit_impl":
            assert crit.max_score == 30.0
            assert crit.title == "Feature Completeness"

    # 4. Score exceeding DB max_score rejected even if client passes high max_score
    over_score_rubric = [
        RubricCriteria(
            criteria_id="crit_arch",
            title="Architecture",
            max_score=50.0,
            score_given=25.0,
        ),
        RubricCriteria(
            criteria_id="crit_impl",
            title="Completeness",
            max_score=30.0,
            score_given=20.0,
        ),
    ]
    with pytest.raises(ValueError, match="không hợp lệ"):
        await use_case.submit_peer_review_grade(
            review_id="sub_custom_50",
            reviewer_user_id="peer_reviewer_3",
            graded_criteria=over_score_rubric,
        )

    # 5. Invalid criteria_id not in DB rubric rejected
    fake_criteria_rubric = [
        RubricCriteria(
            criteria_id="crit_fake", title="Fake", max_score=10.0, score_given=10.0
        ),
    ]
    with pytest.raises(ValueError, match="không tồn tại trong cấu hình bài tập"):
        await use_case.submit_peer_review_grade(
            review_id="sub_custom_50",
            reviewer_user_id="peer_reviewer_3",
            graded_criteria=fake_criteria_rubric,
        )

    # 6. Staff Detail Mapping: verify get_grading_submission_detail maps original rubric and removes hardcoded 10.0
    custom_sub.assign_grade(
        score=85.0,
        is_staff=True,
        graded_by_user_id=owner.id,
        grader_role="INSTRUCTOR",
        grade_source="TA",
        staff_feedback="Làm rất tốt",
        rubric_scores_json={"crit_arch": 18.0, "crit_impl": 26.0},
    )
    await repo.save_peer_submission(custom_sub)

    detail = await use_case.get_grading_submission_detail(
        "sub_custom_50", current_user=owner
    )
    staff_grading = detail["current_staff_grading"]
    assert staff_grading is not None
    assert len(staff_grading["graded_criteria"]) == 2

    crit_arch_item = next(
        c for c in staff_grading["graded_criteria"] if c.criteria_id == "crit_arch"
    )
    assert crit_arch_item.title == "Architecture & Clean Code"
    assert crit_arch_item.max_score == 20.0
    assert crit_arch_item.score_given == 18.0

    crit_impl_item = next(
        c for c in staff_grading["graded_criteria"] if c.criteria_id == "crit_impl"
    )
    assert crit_impl_item.title == "Feature Completeness"
    assert crit_impl_item.max_score == 30.0
    assert crit_impl_item.score_given == 26.0
