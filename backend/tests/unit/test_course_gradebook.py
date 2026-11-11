from unittest.mock import AsyncMock, MagicMock

import pytest

from src.modules.assessment.application.gradebook_usecase import CourseGradebookUseCase
from src.modules.catalog.domain import Course
from src.shared.auth import CurrentUser


@pytest.mark.asyncio
async def test_gradebook_rebac_permission_denied():
    mock_catalog_repo = AsyncMock()
    mock_catalog_repo.get_course_detail.return_value = Course(
        id="course-econ",
        title="Kinh tế vi mô",
        slug="kinh-te-vi-mo",
        owner_id="instructor_owner",
        co_instructor_ids=[],
        ta_ids=[],
    )
    mock_assessment_repo = AsyncMock()

    use_case = CourseGradebookUseCase(
        repo_factory=lambda session: mock_assessment_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
    )

    unauthorized_user = CurrentUser(
        id="other_user",
        email="other@coursera.ai",
        role="USER_ROLE_LEARNER",
    )

    with pytest.raises(PermissionError) as exc_info:
        await use_case.get_course_gradebook(
            course_id="course-econ",
            current_user=unauthorized_user,
        )

    assert "truy cập Sổ điểm" in str(exc_info.value)


@pytest.mark.asyncio
async def test_gradebook_cell_status_and_provenance():
    mock_catalog_repo = AsyncMock()
    mock_catalog_repo.get_course_detail.return_value = Course(
        id="course-econ",
        title="Kinh tế vi mô",
        slug="kinh-te-vi-mo",
        owner_id="instructor_owner",
        co_instructor_ids=[],
        ta_ids=[],
    )

    # Mock assessment repository returning distinct cell states:
    # 1. Unsubmitted: score 0.0, provenance "", submission_id "", graded_at ""
    # 2. Submitted pending review: score 0.0, provenance "PENDING", submission_id "sub-1", graded_at ""
    # 3. Graded: score 95.0, provenance "PEER", submission_id "sub-2", graded_at "2026-11-10T00:00:00Z"
    mock_assessment_repo = AsyncMock()
    mock_assessment_repo.get_course_gradebook_data.return_value = {
        "course_id": "course-econ",
        "course_title": "Kinh tế vi mô",
        "columns": [
            {
                "item_id": "item-quiz-1",
                "item_title": "Quiz 1",
                "item_type": "GRADED_QUIZ",
                "weight": 0.5,
                "max_score": 100.0,
            },
            {
                "item_id": "item-peer-1",
                "item_title": "Peer Case Study",
                "item_type": "PEER_REVIEW",
                "weight": 0.5,
                "max_score": 100.0,
            },
        ],
        "rows": [
            {
                "user_id": "student-1",
                "full_name": "Nguyễn Văn A",
                "email": "a@coursera.ai",
                "avatar_url": "",
                "enrollment_status": "ACTIVE",
                "final_weighted_grade": 47.5,
                "is_course_completed": False,
                "cells": [
                    {
                        "item_id": "item-quiz-1",
                        "score": 95.0,
                        "is_passed": True,
                        "provenance": "AUTO",
                        "graded_at": "2026-11-10T10:00:00Z",
                        "submission_id": "quiz_student-1_item-quiz-1",
                    },
                    {
                        "item_id": "item-peer-1",
                        "score": 0.0,
                        "is_passed": False,
                        "provenance": "PENDING",
                        "graded_at": "",
                        "submission_id": "peer-sub-1",
                    },
                ],
            },
            {
                "user_id": "student-2",
                "full_name": "Vũ Hải Đăng",
                "email": "dang@coursera.ai",
                "avatar_url": "",
                "enrollment_status": "ACTIVE",
                "final_weighted_grade": 0.0,
                "is_course_completed": False,
                "cells": [
                    {
                        "item_id": "item-quiz-1",
                        "score": 0.0,
                        "is_passed": False,
                        "provenance": "",
                        "graded_at": "",
                        "submission_id": "",
                    },
                    {
                        "item_id": "item-peer-1",
                        "score": 0.0,
                        "is_passed": False,
                        "provenance": "",
                        "graded_at": "",
                        "submission_id": "",
                    },
                ],
            },
        ],
        "total_students": 2,
    }

    use_case = CourseGradebookUseCase(
        repo_factory=lambda session: mock_assessment_repo,
        catalog_repo_factory=lambda session: mock_catalog_repo,
    )

    owner = CurrentUser(
        id="instructor_owner",
        email="owner@coursera.ai",
        role="USER_ROLE_INSTRUCTOR",
    )

    data = await use_case.get_course_gradebook(
        course_id="course-econ",
        current_user=owner,
    )

    assert data["course_id"] == "course-econ"
    assert len(data["rows"]) == 2

    # Check student 1 (Quiz graded, Peer pending)
    row1 = data["rows"][0]
    assert row1["cells"][0]["provenance"] == "AUTO"
    assert row1["cells"][0]["score"] == 95.0
    assert row1["cells"][1]["provenance"] == "PENDING"
    assert row1["cells"][1]["graded_at"] == ""

    # Check student 2 (Both unsubmitted)
    row2 = data["rows"][1]
    assert row2["cells"][0]["provenance"] == ""
    assert row2["cells"][0]["submission_id"] == ""
    assert row2["cells"][1]["provenance"] == ""
    assert row2["cells"][1]["submission_id"] == ""


@pytest.mark.asyncio
async def test_repository_get_course_gradebook_data_cell_states():
    from src.modules.assessment.infrastructure.models import (
        PeerAssignmentSubmissionModel,
    )
    from src.modules.assessment.infrastructure.repository import (
        SQLAlchemyAssessmentRepository,
    )
    from src.modules.catalog.infrastructure.models import (
        CourseModel,
        LearningItemModel,
    )
    from src.modules.identity.infrastructure.models import UserModel
    from src.modules.learning.infrastructure.models import LearningProgressModel

    mock_session = AsyncMock()
    repo = SQLAlchemyAssessmentRepository(session=mock_session)

    mock_course = CourseModel(
        id="course-econ",
        title="Kinh tế học",
        owner_id="instructor_tuan",
    )
    mock_course_res = MagicMock()
    mock_course_res.scalar_one_or_none.return_value = mock_course

    mock_item = LearningItemModel(
        id="item-peer-1",
        title="Case study",
        type="PEER_REVIEW",
    )
    mock_items_res = MagicMock()
    mock_items_res.scalars.return_value.all.return_value = [mock_item]

    mock_collab_res = MagicMock()
    mock_collab_res.scalars.return_value.all.return_value = ["ta_huong"]

    mock_count_res = MagicMock()
    mock_count_res.scalar.return_value = 2

    st1_progress = LearningProgressModel(
        id="lp1",
        user_id="student_1",
        course_id="course-econ",
        overall_progress_percent=50.0,
    )
    st1_user = UserModel(
        id="student_1", full_name="Lê Thị Mai Linh", email="linh.le@coursera.ai"
    )

    st2_progress = LearningProgressModel(
        id="lp2",
        user_id="student_2",
        course_id="course-econ",
        overall_progress_percent=0.0,
    )
    st2_user = UserModel(
        id="student_2", full_name="Vũ Hải Đăng", email="dang.vu@coursera.ai"
    )

    mock_rows_res = MagicMock()
    mock_rows_res.all.return_value = [
        (st1_progress, st1_user),
        (st2_progress, st2_user),
    ]

    peer_sub = PeerAssignmentSubmissionModel(
        id="sub_pending_1",
        user_id="student_1",
        item_id="item-peer-1",
        final_score=None,
        status="PENDING",
        published_at=None,
    )
    mock_quiz_res = MagicMock()
    mock_quiz_res.scalars.return_value.all.return_value = []

    mock_lab_res = MagicMock()
    mock_lab_res.scalars.return_value.all.return_value = []

    mock_peer_res = MagicMock()
    mock_peer_res.scalars.return_value.all.return_value = [peer_sub]

    mock_session.execute.side_effect = [
        mock_course_res,
        mock_items_res,
        mock_collab_res,
        mock_count_res,
        mock_rows_res,
        mock_quiz_res,
        mock_lab_res,
        mock_peer_res,
    ]

    result = await repo.get_course_gradebook_data(course_id="course-econ")

    assert result["course_id"] == "course-econ"
    assert len(result["rows"]) == 2

    # Student 1: Submitted but pending
    cell_st1 = result["rows"][0]["cells"][0]
    assert cell_st1["submission_id"] == "sub_pending_1"
    assert cell_st1["provenance"] == "PENDING"
    assert cell_st1["graded_at"] == ""
    assert cell_st1["score"] == 0.0

    # Student 2: Not submitted
    cell_st2 = result["rows"][1]["cells"][0]
    assert cell_st2["submission_id"] == ""
    assert cell_st2["provenance"] == ""
    assert cell_st2["graded_at"] == ""
    assert cell_st2["score"] == 0.0
