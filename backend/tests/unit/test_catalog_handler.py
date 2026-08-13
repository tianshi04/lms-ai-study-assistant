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
