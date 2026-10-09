from unittest.mock import AsyncMock, MagicMock

import pytest

from src.gen.catalog.v1 import catalog_pb as pb
from src.modules.catalog.presentation.catalog_handler import CatalogHandler


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
