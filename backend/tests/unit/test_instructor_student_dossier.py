from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.gen.catalog.v1 import catalog_pb as pb
from src.modules.assessment.infrastructure.models import (
    LabSubmissionModel,
    PeerAssignmentSubmissionModel,
    QuizSubmissionModel,
)
from src.modules.catalog.application.catalog_usecase import CatalogUseCase
from src.modules.catalog.domain import (
    Course,
    CourseStatus,
    InstructorStudentDossier,
    StudentAssessmentSummaryItem,
    StudentCourseDailyLog,
    StudentDayItemLog,
)
from src.modules.catalog.infrastructure.models import LearningItemModel
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.catalog.presentation.catalog_handler import CatalogHandler
from src.modules.learning.infrastructure.models import (
    DailyCourseItemRecordModel,
    LearningItemProgressModel,
    LearningProgressModel,
)
from src.shared.auth import CurrentUser


@pytest.mark.asyncio
async def test_repository_get_instructor_student_dossier_full_breakdown():
    session = AsyncMock()
    repo = SQLAlchemyCatalogRepository(session)
    repo.get_course_id_by_slug_or_id = AsyncMock(return_value="course-1")

    it_v1 = LearningItemModel(
        id="it-v1", title="Bài 1.1: Mở đầu", type="VIDEO", lesson_id="l1"
    )
    it_q1 = LearningItemModel(
        id="it-q1",
        title="Quiz Tuần 1",
        type="GRADED_QUIZ",
        lesson_id="l1",
    )
    it_lab1 = LearningItemModel(
        id="it-lab1",
        title="Lab 1: Cân bằng giá",
        type="CODING_LAB",
        lesson_id="l1",
    )
    it_v2 = LearningItemModel(
        id="it-v2", title="Bài 2.1: Độ hữu dụng", type="VIDEO", lesson_id="l2"
    )
    it_p2 = LearningItemModel(
        id="it-p2",
        title="Tiểu luận Tuần 2",
        type="PEER_REVIEW",
        lesson_id="l2",
    )

    syllabus_rows = [
        (it_v1, 1, "Tuần 1: Cung Cầu"),
        (it_q1, 1, "Tuần 1: Cung Cầu"),
        (it_lab1, 1, "Tuần 1: Cung Cầu"),
        (it_v2, 2, "Tuần 2: Người tiêu dùng"),
        (it_p2, 2, "Tuần 2: Người tiêu dùng"),
    ]

    # Completed 4 items (it_v1, it_q1, it_lab1, it_v2) -> furthest is it_v2 (Week 2),
    # while student recently re-opened it_v1 (Week 1)!
    lp = LearningProgressModel(
        id="stu-1:course-1",
        user_id="stu-1",
        course_id="course-1",
        overall_progress_percent=80.0,
        completed_item_ids=["it-v1", "it-q1", "it-lab1", "it-v2"],
        enrolled_at="2026-12-20T08:00:00+00:00",
        last_accessed_item_id="it-v1",
        last_accessed_at="2027-01-03T10:00:00+00:00",
    )

    q_sub = QuizSubmissionModel(
        id="qs-1",
        user_id="stu-1",
        item_id="it-q1",
        selected_option_indexes=[0],
        score_percent=90.0,
        passed=True,
        created_at="2026-12-29T20:00:00+00:00",
    )
    lab_sub = LabSubmissionModel(
        id="ls-1",
        user_id="stu-1",
        item_id="it-lab1",
        source_code="print(1)",
        score_percent=100.0,
        passed=True,
        total_test_cases=1,
        passed_test_cases=1,
        test_logs="OK",
        created_at="2027-01-02T21:00:00+00:00",
    )
    peer_sub = PeerAssignmentSubmissionModel(
        id="ps-1",
        user_id="stu-1",
        item_id="it-p2",
        submission_url="",
        text_content="Bài tiểu luận",
        created_at="2027-01-03T09:00:00+00:00",
        status="SUBMITTED",
        review_duty_status="PENDING",
    )

    # Total seconds = 180 + 120 = 300s across 4 completed items (< 4 * 300s -> suspicious fast pace!)
    dc_rec1 = DailyCourseItemRecordModel(
        user_id="stu-1",
        course_id="course-1",
        study_date=date(2026, 12, 29),
        item_id="it-v1",
        seconds_spent=180,
        last_studied_at="2026-12-29T20:00:00+00:00",
    )
    dc_rec2 = DailyCourseItemRecordModel(
        user_id="stu-1",
        course_id="course-1",
        study_date=date(2027, 1, 2),
        item_id="it-v2",
        seconds_spent=120,
        last_studied_at="2027-01-02T21:00:00+00:00",
    )

    res_syllabus = MagicMock()
    res_syllabus.all.return_value = syllabus_rows

    res_lp = MagicMock()
    res_lp.scalar_one_or_none.return_value = lp

    res_matrix = MagicMock()
    res_matrix.all.return_value = [("it-q1", 80.0)]

    res_quiz = MagicMock()
    res_quiz.scalars.return_value.all.return_value = [q_sub]

    res_cd = MagicMock()
    res_cd.scalars.return_value.all.return_value = []

    res_lab = MagicMock()
    res_lab.scalars.return_value.all.return_value = [lab_sub]

    res_peer = MagicMock()
    res_peer.scalars.return_value.all.return_value = [peer_sub]

    res_pr_cnt = MagicMock()
    res_pr_cnt.all.return_value = [("it-p2", 1)]

    res_dc = MagicMock()
    res_dc.scalars.return_value.all.return_value = [dc_rec1, dc_rec2]

    session.execute.side_effect = [
        res_syllabus,
        res_lp,
        res_matrix,
        res_quiz,
        res_cd,
        res_lab,
        res_peer,
        res_pr_cnt,
        res_dc,
    ]

    dossier = await repo.get_instructor_student_dossier("course-1", "stu-1")

    assert dossier.enrolled_at == "2026-12-20T08:00:00+00:00"
    assert dossier.furthest_item_title == "Bài 2.1: Độ hữu dụng"
    assert dossier.furthest_week_number == 2
    assert dossier.last_accessed_item_title == "Bài 1.1: Mở đầu"
    assert dossier.last_accessed_week_number == 1
    assert dossier.is_suspicious_fast_pace is True

    assert len(dossier.assessments) == 3
    assert dossier.assessments[0].item_title == "Quiz Tuần 1"
    assert dossier.assessments[0].score == 9.0
    assert dossier.assessments[0].max_score == 10.0
    assert dossier.assessments[0].is_passed is True
    assert dossier.assessments[1].item_title == "Lab 1: Cân bằng giá"
    assert dossier.assessments[1].score == 100.0
    assert dossier.assessments[2].item_title == "Tiểu luận Tuần 2"
    assert dossier.assessments[2].status_note == "Nợ chấm 2 bài bạn học"

    assert len(dossier.daily_logs) == 2
    assert dossier.daily_logs[0].study_date == "2026-12-29"
    assert dossier.daily_logs[0].total_seconds == 180
    assert dossier.daily_logs[0].items[0].item_title == "Bài 1.1: Mở đầu"
    assert dossier.daily_logs[1].study_date == "2027-01-02"


@pytest.mark.asyncio
async def test_repository_student_dossier_fallback_to_item_progress():
    session = AsyncMock()
    repo = SQLAlchemyCatalogRepository(session)
    repo.get_course_id_by_slug_or_id = AsyncMock(return_value="c-fallback")

    it1 = LearningItemModel(id="it-1", title="Video 1", type="VIDEO", lesson_id="l1")
    res_syllabus = MagicMock()
    res_syllabus.all.return_value = [(it1, 1, "Tuần 1")]

    res_lp = MagicMock()
    res_lp.scalar_one_or_none.return_value = LearningProgressModel(
        id="stu-2:c-fallback",
        user_id="stu-2",
        course_id="c-fallback",
        overall_progress_percent=0.0,
        completed_item_ids=[],
        enrolled_at="2026-11-18T00:00:00+00:00",
    )

    res_empty_all = MagicMock()
    res_empty_all.all.return_value = []

    res_empty_scalars = MagicMock()
    res_empty_scalars.scalars.return_value.all.return_value = []

    ip_row = LearningItemProgressModel(
        user_id="stu-2",
        item_id="it-1",
        course_id="c-fallback",
        time_spent_seconds=960,
        last_studied_at=datetime(2026, 11, 20, 14, 0, tzinfo=UTC).isoformat(),
    )
    res_ip = MagicMock()
    res_ip.scalars.return_value.all.return_value = [ip_row]

    session.execute.side_effect = [
        res_syllabus,
        res_lp,
        res_empty_all,  # matrix
        res_empty_scalars,  # quiz
        res_empty_scalars,  # cooldown
        res_empty_scalars,  # lab
        res_empty_scalars,  # peer
        res_empty_all,  # pr counts
        res_empty_scalars,  # daily_course_item_records empty -> triggers fallback
        res_ip,  # learning_item_progresses fallback
    ]

    dossier = await repo.get_instructor_student_dossier("c-fallback", "stu-2")
    assert len(dossier.daily_logs) == 1
    assert dossier.daily_logs[0].study_date == "2026-11-20"
    assert dossier.daily_logs[0].total_seconds == 960
    assert dossier.daily_logs[0].is_streak_qualified is True
    assert dossier.is_suspicious_fast_pace is False


@pytest.mark.asyncio
async def test_repository_student_dossier_not_enrolled_raises():
    session = AsyncMock()
    repo = SQLAlchemyCatalogRepository(session)
    repo.get_course_id_by_slug_or_id = AsyncMock(return_value="c-1")

    res_syllabus = MagicMock()
    res_syllabus.all.return_value = [
        (
            LearningItemModel(id="it-1", title="Video 1", type="VIDEO", lesson_id="l1"),
            1,
            "Tuần 1",
        )
    ]
    res_lp = MagicMock()
    res_lp.scalar_one_or_none.return_value = None
    session.execute.side_effect = [res_syllabus, res_lp]

    with pytest.raises(ValueError, match="chưa ghi danh"):
        await repo.get_instructor_student_dossier("c-1", "stranger-user")


@pytest.mark.asyncio
async def test_usecase_and_handler_get_instructor_student_dossier():
    mock_repo = AsyncMock()
    mock_repo.get_course_detail.return_value = Course(
        id="c1",
        title="Vi mô",
        slug="vi-mo",
        owner_id="inst-1",
        status=CourseStatus.PUBLISHED,
    )
    sample_dossier = InstructorStudentDossier(
        enrolled_at="2026-11-01T00:00:00Z",
        furthest_item_title="Bài 1",
        furthest_week_number=1,
        final_weighted_grade=85.0,
        assessments=(
            StudentAssessmentSummaryItem(
                item_id="q1",
                week_number=1,
                week_title="Tuần 1",
                item_title="Quiz 1",
                item_type="GRADED_QUIZ",
                weight=1.0,
                score=8.5,
                max_score=10.0,
                is_submitted=True,
                is_passed=True,
                attempts_count=1,
                provenance="AUTO",
                status_note="1 lượt nộp",
            ),
        ),
        daily_logs=(
            StudentCourseDailyLog(
                study_date="2026-11-10",
                total_seconds=1200,
                is_streak_qualified=True,
                items=(
                    StudentDayItemLog(
                        item_id="v1",
                        item_title="Bài 1",
                        item_type="VIDEO",
                        seconds_spent=1200,
                    ),
                ),
            ),
        ),
    )
    mock_repo.get_instructor_student_dossier.return_value = sample_dossier

    use_case = CatalogUseCase(repo_factory=lambda _s: mock_repo)

    with patch(
        "src.modules.catalog.application.course_usecase.async_session_scope"
    ) as mock_scope:
        mock_scope.return_value.__aenter__.return_value = AsyncMock()

        # Validation error on empty student_id
        with pytest.raises(ValueError, match="Thiếu mã"):
            await use_case.get_instructor_student_dossier("c1", "")

        # Unauthorized instructor rejected
        stranger = CurrentUser(id="other-inst", email="o@test.com", role="INSTRUCTOR")
        with pytest.raises(PermissionError):
            await use_case.get_instructor_student_dossier("c1", "stu-1", stranger)

        # Course owner succeeds
        owner = CurrentUser(id="inst-1", email="inst@test.com", role="INSTRUCTOR")
        res = await use_case.get_instructor_student_dossier("c1", "stu-1", owner)
        assert res.final_weighted_grade == 85.0

    # Presentation Handler mapping tests
    mock_uc = AsyncMock()
    handler = CatalogHandler(use_case=mock_uc)
    ctx = MagicMock()

    with patch(
        "src.modules.catalog.presentation.catalog_handler.require_current_user",
        return_value=CurrentUser(id="inst-1", email="inst@test.com", role="INSTRUCTOR"),
    ):
        mock_uc.get_instructor_student_dossier.return_value = sample_dossier
        resp = await handler.get_instructor_student_dossier(
            pb.GetInstructorStudentDossierRequest(course_id="c1", student_id="stu-1"),
            ctx,
        )
        assert resp.final_weighted_grade == pytest.approx(85.0)
        assert len(resp.assessments) == 1
        assert len(resp.daily_logs) == 1

        mock_uc.get_instructor_student_dossier.side_effect = PermissionError("Denied")
        with pytest.raises(ConnectError) as exc_perm:
            await handler.get_instructor_student_dossier(
                pb.GetInstructorStudentDossierRequest(
                    course_id="c1", student_id="stu-1"
                ),
                ctx,
            )
        assert exc_perm.value.code == Code.PERMISSION_DENIED

    # Teaching Assistant with global LEARNER role must not be blocked at handler
    with patch(
        "src.modules.catalog.presentation.catalog_handler.require_current_user",
        return_value=CurrentUser(id="ta-1", email="ta@test.com", role="LEARNER"),
    ):
        mock_uc.get_instructor_student_dossier.side_effect = None
        mock_uc.get_instructor_student_dossier.return_value = sample_dossier
        resp_ta = await handler.get_instructor_student_dossier(
            pb.GetInstructorStudentDossierRequest(course_id="c1", student_id="stu-1"),
            ctx,
        )
        assert resp_ta.final_weighted_grade == pytest.approx(85.0)
