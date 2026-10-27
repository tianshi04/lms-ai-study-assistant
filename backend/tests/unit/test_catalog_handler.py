from unittest.mock import AsyncMock, MagicMock

import pytest

from src.gen.catalog.v1 import catalog_pb as pb
from src.modules.catalog.presentation.catalog_handler import CatalogHandler
from src.shared.auth import CurrentUser


@pytest.mark.asyncio
async def test_handler_list_courses():
    usecase_mock = AsyncMock()
    # Mock return value: (list of courses, next_page_token)
    usecase_mock.list_courses.return_value = ([], "")

    handler = CatalogHandler(usecase_mock)

    # Create request with all filter/sort fields
    request = pb.ListCoursesRequest(
        page_size=10,
        page_token="token",
        search_query="python",
        subject="AI_ML",
        level="BEGINNER",
        sort_by="newest",
    )

    context_mock = MagicMock()

    response = await handler.list_courses(request, context_mock)

    assert response is not None
    usecase_mock.list_courses.assert_called_once_with(
        page_size=10,
        page_token="token",
        search_query="python",
        subject="AI_ML",
        level="BEGINNER",
        sort_by="newest",
        organization_id=None,
        status_filter=pb.CourseStatus.PUBLISHED,
    )


@pytest.mark.asyncio
async def test_handler_list_courses_unspecified():
    usecase_mock = AsyncMock()
    usecase_mock.list_courses.return_value = ([], "")

    handler = CatalogHandler(usecase_mock)

    # Create request with default/unspecified fields
    request = pb.ListCoursesRequest(page_size=10)

    context_mock = MagicMock()

    response = await handler.list_courses(request, context_mock)

    assert response is not None
    usecase_mock.list_courses.assert_called_once_with(
        page_size=10,
        page_token="",
        search_query="",
        subject="",
        level="",
        sort_by="",
        organization_id=None,
        status_filter=pb.CourseStatus.PUBLISHED,
    )


@pytest.mark.asyncio
async def test_handler_list_instructor_courses():
    from src.shared.auth import CurrentUser, set_current_user

    usecase_mock = AsyncMock()
    usecase_mock.list_instructor_courses.return_value = ([], "")

    handler = CatalogHandler(usecase_mock)
    request = pb.ListInstructorCoursesRequest(page_size=50)
    context_mock = MagicMock()

    set_current_user(CurrentUser(id="inst-123", email="inst@test.com"))
    try:
        response = await handler.list_instructor_courses(request, context_mock)
        assert response is not None
        usecase_mock.list_instructor_courses.assert_called_once_with(
            instructor_id="inst-123",
            page_size=50,
            page_token="",
            status_filter=None,
        )
    finally:
        set_current_user(None)


@pytest.mark.asyncio
async def test_handler_list_instructor_courses_null_safety():
    from src.modules.catalog.domain import (
        Course,
        ItemType,
        LearningItem,
        Lesson,
        WeekModule,
    )
    from src.shared.auth import CurrentUser, set_current_user

    # Create learning item with null/none attributes
    item = LearningItem(
        id="item-1",
        title="Sample Item",
        type=ItemType.VIDEO,
    )
    for attr in [
        "estimated_minutes",
        "video_url",
        "vtt_subtitle_url",
        "interactive_transcripts",
        "in_video_quizzes",
        "reading_markdown",
    ]:
        setattr(item, attr, None)

    lesson = Lesson(id="lesson-1", title="Sample Lesson", items=[item])
    setattr(lesson, "estimated_minutes", None)  # noqa: B010

    wm = WeekModule(id="wm-1", week_number=1, title="Week 1", lessons=[lesson])
    setattr(wm, "summary", None)  # noqa: B010

    course_with_nulls = Course(
        id="course-test",
        title="Test Course",
        slug="test-course",
        week_modules=[wm],
    )
    # Explicitly set nullable attributes to None to reproduce runtime HTTP 500 / TypeError
    for attr in [
        "description",
        "partner_name",
        "partner_logo_url",
        "instructor_names",
        "average_rating",
        "review_count",
        "subject",
        "level",
        "financial_aid_enabled",
        "rejection_reason",
        "organization_id",
        "owner_id",
        "co_instructor_ids",
    ]:
        setattr(course_with_nulls, attr, None)

    usecase_mock = AsyncMock()
    usecase_mock.list_instructor_courses.return_value = ([course_with_nulls], "")

    handler = CatalogHandler(usecase_mock)
    request = pb.ListInstructorCoursesRequest(page_size=50)
    context_mock = MagicMock()

    set_current_user(CurrentUser(id="inst-123", email="inst@test.com"))
    try:
        response = await handler.list_instructor_courses(request, context_mock)
        assert response is not None
        assert len(response.courses) == 1
        pb_course = response.courses[0]
        assert pb_course.id == "course-test"
        assert pb_course.average_rating == 0.0
        assert pb_course.review_count == 0
        assert pb_course.description == ""
        assert pb_course.partner_name == ""
        assert len(pb_course.week_modules) == 1
        assert len(pb_course.week_modules[0].lessons) == 1
        assert len(pb_course.week_modules[0].lessons[0].items) == 1
        assert pb_course.week_modules[0].lessons[0].items[0].estimated_minutes == 0
    finally:
        set_current_user(None)


@pytest.mark.asyncio
async def test_handler_get_course_detail_with_recommendations():
    from src.modules.catalog.domain import Course
    from src.modules.catalog.domain.constants import DEFAULT_RECOMMENDED_COURSES_COUNT

    usecase_mock = AsyncMock()
    mock_course = Course(
        id="c-detail",
        title="Detail Course",
        slug="detail-course",
        description="Detail desc",
        partner_name="Test Partner",
        partner_logo_url="",
        instructor_names=["Dr. Test"],
        week_modules=[],
    )
    rec_course = Course(
        id="c-rec",
        title="Rec Course",
        slug="rec-course",
        description="Rec desc",
        partner_name="Rec Partner",
        partner_logo_url="",
        instructor_names=["Dr. Rec"],
        week_modules=[],
    )
    usecase_mock.get_course_detail.return_value = mock_course
    usecase_mock.get_specialization_for_course.return_value = None
    usecase_mock.get_course_recommendations.return_value = (
        None,
        [(rec_course, "⭐ Cùng Giảng viên", 0.88)],
    )

    handler = CatalogHandler(usecase_mock)
    request = pb.GetCourseDetailRequest(id_or_slug="c-detail")
    context_mock = MagicMock()

    response = await handler.get_course_detail(request, context_mock)
    assert response is not None
    assert response.course is not None
    assert response.course.id == "c-detail"
    assert response.foundational_course is None
    assert len(response.recommended_courses) == 1
    assert response.recommended_courses[0].course is not None
    assert response.recommended_courses[0].course.id == "c-rec"
    assert response.recommended_courses[0].badge_label == "⭐ Cùng Giảng viên"
    assert response.recommended_courses[0].score == 0.88
    usecase_mock.get_course_recommendations.assert_called_once_with(
        "c-detail", target_count=DEFAULT_RECOMMENDED_COURSES_COUNT
    )


@pytest.mark.asyncio
async def test_handler_get_course_detail_fallback_on_recommendation_error():
    from src.modules.catalog.domain import Course
    from src.modules.catalog.domain.constants import DEFAULT_RECOMMENDED_COURSES_COUNT

    usecase_mock = AsyncMock()
    mock_course = Course(
        id="c-fallback",
        title="Fallback Course",
        slug="fallback-course",
        description="Desc",
        partner_name="Test",
        partner_logo_url="",
        instructor_names=[],
        week_modules=[],
    )
    usecase_mock.get_course_detail.return_value = mock_course
    usecase_mock.get_course_recommendations.side_effect = RuntimeError(
        "Vector DB unreachable"
    )

    handler = CatalogHandler(usecase_mock)
    request = pb.GetCourseDetailRequest(id_or_slug="c-fallback")
    context_mock = MagicMock()

    response = await handler.get_course_detail(request, context_mock)
    assert response is not None
    assert response.course is not None
    assert response.course.id == "c-fallback"
    assert response.foundational_course is None
    assert len(response.recommended_courses) == 0
    usecase_mock.get_course_recommendations.assert_called_once_with(
        "c-fallback", target_count=DEFAULT_RECOMMENDED_COURSES_COUNT
    )


@pytest.mark.asyncio
async def test_handler_get_course_detail_with_specialization():
    from src.modules.catalog.domain import Course, Specialization

    usecase_mock = AsyncMock()
    mock_course = Course(
        id="c-econ-1",
        title="Microeconomics",
        slug="microeconomics",
        price=790000.0,
    )
    mock_course_2 = Course(
        id="c-econ-2",
        title="Econometrics",
        slug="econometrics",
        price=1290000.0,
    )
    mock_spec = Specialization(
        id="spec-econ",
        title="Economics Specialization",
        partner_name="NEU",
        course_ids=["c-econ-1", "c-econ-2"],
        courses=[mock_course, mock_course_2],
        bundle_price=1560000.0,
        total_individual_price=2080000.0,
        discount_percent=25,
    )

    usecase_mock.get_course_detail.return_value = mock_course
    usecase_mock.get_course_recommendations.return_value = (None, [])
    usecase_mock.get_specialization_for_course.return_value = mock_spec

    handler = CatalogHandler(usecase_mock)
    request = pb.GetCourseDetailRequest(id_or_slug="c-econ-1")
    context_mock = MagicMock()

    response = await handler.get_course_detail(request, context_mock)
    assert response is not None
    assert response.specialization is not None
    assert response.specialization.id == "spec-econ"
    assert response.specialization.discount_percent == 25
    assert response.specialization.bundle_price == 1560000.0
    assert response.specialization.total_individual_price == 2080000.0
    assert len(response.specialization.courses) == 2


@pytest.mark.asyncio
async def test_handler_create_specialization():
    from src.modules.catalog.domain import Course, Specialization

    usecase_mock = AsyncMock()
    mock_spec = Specialization(
        id="spec-new-01",
        title="AI Engineering Track",
        description="Comprehensive track",
        partner_name="DeepLearning.AI",
        course_ids=["c-1", "c-2"],
        courses=[
            Course(id="c-1", title="AI 1", slug="ai-1", price=1000000.0),
            Course(id="c-2", title="AI 2", slug="ai-2", price=1000000.0),
        ],
        bundle_price=1500000.0,
        total_individual_price=2000000.0,
        discount_percent=25,
        owner_id="inst-1",
    )
    usecase_mock.create_specialization.return_value = mock_spec

    handler = CatalogHandler(usecase_mock)
    instructor_user = CurrentUser(id="inst-1", email="inst@test.com", role="INSTRUCTOR")
    handler._verify_instructor_permission = MagicMock(return_value=instructor_user)

    req = pb.CreateSpecializationRequest(
        title="AI Engineering Track",
        description="Comprehensive track",
        partner_name="DeepLearning.AI",
        course_ids=["c-1", "c-2"],
    )
    ctx = MagicMock()
    res = await handler.create_specialization(req, ctx)

    assert res.specialization is not None
    assert res.specialization.id == "spec-new-01"
    assert res.specialization.bundle_price == 1500000.0
    assert len(res.specialization.courses) == 2
    usecase_mock.create_specialization.assert_called_once()


@pytest.mark.asyncio
async def test_handler_list_instructor_specializations():
    from src.modules.catalog.domain import Specialization

    usecase_mock = AsyncMock()
    mock_spec = Specialization(
        id="spec-1",
        title="Track 1",
        owner_id="inst-1",
    )
    usecase_mock.list_instructor_specializations.return_value = ([mock_spec], "")

    handler = CatalogHandler(usecase_mock)
    instructor_user = CurrentUser(id="inst-1", email="inst@test.com", role="INSTRUCTOR")
    handler._verify_instructor_permission = MagicMock(return_value=instructor_user)

    req = pb.ListInstructorSpecializationsRequest(page_size=20)
    ctx = MagicMock()
    res = await handler.list_instructor_specializations(req, ctx)

    assert len(res.specializations) == 1
    assert res.specializations[0].id == "spec-1"
    usecase_mock.list_instructor_specializations.assert_called_once()


@pytest.mark.asyncio
async def test_handler_delete_specialization():
    usecase_mock = AsyncMock()
    usecase_mock.delete_specialization.return_value = True

    handler = CatalogHandler(usecase_mock)
    instructor_user = CurrentUser(id="inst-1", email="inst@test.com", role="INSTRUCTOR")
    handler._verify_instructor_permission = MagicMock(return_value=instructor_user)

    req = pb.DeleteSpecializationRequest(id="spec-1")
    ctx = MagicMock()
    res = await handler.delete_specialization(req, ctx)

    assert res.success is True
    usecase_mock.delete_specialization.assert_called_once_with(
        specialization_id="spec-1", current_user=instructor_user
    )
