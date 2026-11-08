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

        # 4. release_course_grades
        with pytest.raises(ConnectError) as exc:
            await handler.release_course_grades(
                pb.ReleaseCourseGradesRequest(course_id="course_test_1"), None
            )
        assert exc.value.code == Code.PERMISSION_DENIED


@pytest.mark.asyncio
async def test_staff_grading_draft_vs_batch_release(test_setup):
    """Test saving grade as draft (no event dispatched) vs batch release (triggers event chain)."""
    handler = test_setup["handler"]
    ta_1 = CurrentUser(id="ta_assigned_1", role="TA", full_name="Trợ giảng 1")
    owner = CurrentUser(
        id="instructor_owner", role="INSTRUCTOR", full_name="Giảng viên Phụ trách"
    )

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

    with patch.object(EventBus, "publish", side_effect=mock_publish):
        # 1. TA 1 submits draft grade
        with patch(
            "src.modules.assessment.presentation.assessment_handler.require_current_user",
            return_value=ta_1,
        ):
            submit_req = pb.SubmitStaffGradingRequest(
                submission_id="sub_test_001",
                graded_criteria=criteria,
                total_score=90.0,
                feedback="Kiến trúc tốt, cần thêm integration test",
                is_draft=True,
            )
            submit_resp = await handler.submit_staff_grading(submit_req, None)
            assert submit_resp.success is True
            assert submit_resp.is_draft is True
            assert submit_resp.final_score == 90.0
            # Ensure NO domain event dispatched on draft
            assert len(dispatched_events) == 0

        # 2. Instructor calls release_course_grades to batch release
        with patch(
            "src.modules.assessment.presentation.assessment_handler.require_current_user",
            return_value=owner,
        ):
            rel_req = pb.ReleaseCourseGradesRequest(
                course_id="course_test_1", item_id="item_peer_1"
            )
            rel_resp = await handler.release_course_grades(rel_req, None)
            assert rel_resp.success is True
            assert rel_resp.released_count == 1

            # EventBus MUST have received PeerAssignmentGradedDomainEvent
            assert len(dispatched_events) == 1
            event = dispatched_events[0]
            assert isinstance(event, PeerAssignmentGradedDomainEvent)
            assert event.user_id == "student_1"
            assert event.final_score == 90.0
            assert event.passed is True
            assert event.is_draft is False


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
            is_draft=False,
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
    """Test get_course_gradebook and get_instructor_action_tasks via AssessmentHandler and CatalogHandler."""
    handler = test_setup["handler"]
    owner = CurrentUser(
        id="instructor_owner", role="INSTRUCTOR", full_name="Giảng viên"
    )

    with patch(
        "src.modules.assessment.presentation.assessment_handler.require_current_user",
        return_value=owner,
    ):
        # 1. AssessmentHandler.get_course_gradebook
        gradebook_resp = await handler.get_course_gradebook(
            catalog_pb.GetCourseGradebookRequest(course_id="course_test_1"),
            None,
        )
        assert gradebook_resp["course_id"] == "course_test_1"
        assert len(gradebook_resp["rows"]) == 1
        assert gradebook_resp["rows"][0]["user_id"] == "student_1"

        # 2. AssessmentHandler.get_instructor_action_tasks
        tasks_resp = await handler.get_instructor_action_tasks(
            catalog_pb.GetInstructorActionTasksRequest(course_id="course_test_1"),
            None,
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
