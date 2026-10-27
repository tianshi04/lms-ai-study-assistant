from unittest.mock import AsyncMock, MagicMock

import pytest

from src.modules.catalog.domain import CourseStatus
from src.modules.catalog.infrastructure.models import (
    CourseModel,
    SpecializationModel,
)
from src.modules.catalog.infrastructure.recommendation_service import (
    cosine_similarity,
    get_foundational_course,
    raw_cosine_similarity,
)


def test_raw_cosine_similarity():
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    assert raw_cosine_similarity(v1, v2) == pytest.approx(1.0)

    v3 = [0.0, 1.0, 0.0]
    assert raw_cosine_similarity(v1, v3) == pytest.approx(0.0)

    # Zero norm safety
    assert raw_cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0
    assert raw_cosine_similarity([], []) == 0.0


def test_cosine_similarity_normalized():
    v1 = [1.0, 0.0]
    v2 = [1.0, 0.0]
    assert cosine_similarity(v1, v2) == pytest.approx(1.0)


@pytest.mark.asyncio
async def test_get_foundational_course_beginner_guard():
    session = AsyncMock()
    course = CourseModel(
        id="c-beg",
        title="Intro Course",
        level="cat-lvl-beg",
        status=CourseStatus.PUBLISHED,
    )
    result = await get_foundational_course(session, course)
    assert result is None


@pytest.mark.asyncio
async def test_get_foundational_course_specialization_root_guard():
    session = AsyncMock()
    spec = SpecializationModel(
        id="spec-1",
        course_ids=["c-first", "c-second"],
    )
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [spec]
    session.execute.return_value = mock_res

    course = CourseModel(
        id="c-first",
        title="First Course in Spec",
        level="cat-lvl-int",
        status=CourseStatus.PUBLISHED,
    )
    result = await get_foundational_course(session, course)
    assert result is None


@pytest.mark.asyncio
async def test_get_foundational_course_specialization_predecessor():
    session = AsyncMock()
    spec = SpecializationModel(
        id="spec-1",
        course_ids=["c-first", "c-second"],
    )
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [spec]
    session.execute.return_value = mock_res

    first_course = CourseModel(
        id="c-first",
        title="First Course",
        level="cat-lvl-beg",
        status=CourseStatus.PUBLISHED,
    )
    session.get.return_value = first_course

    second_course = CourseModel(
        id="c-second",
        title="Second Course",
        level="cat-lvl-int",
        status=CourseStatus.PUBLISHED,
    )
    result = await get_foundational_course(session, second_course)
    assert result is not None
    assert result.id == "c-first"
