from unittest.mock import AsyncMock, MagicMock

import pytest

from src.modules.catalog.domain import CourseStatus
from src.modules.catalog.infrastructure.embedding_service import build_course_payload
from src.modules.catalog.infrastructure.models import (
    CourseModel,
    LessonModel,
    WeekModuleModel,
)
from src.modules.catalog.infrastructure.recommendation_service import (
    cosine_similarity,
    get_foundational_courses,
    get_recommended_courses,
    raw_cosine_similarity,
)


def test_raw_cosine_similarity_edge_cases():
    assert raw_cosine_similarity([], []) == 0.0
    assert raw_cosine_similarity([1.0], [1.0, 2.0]) == 0.0
    assert raw_cosine_similarity([0.0, 0.0], [0.0, 0.0]) == 0.0

    v1 = [1.0, 0.0]
    v2 = [1.0, 0.0]
    assert raw_cosine_similarity(v1, v2) == pytest.approx(1.0)

    v_opposite = [-1.0, 0.0]
    assert raw_cosine_similarity(v1, v_opposite) == pytest.approx(-1.0)


def test_cosine_similarity_normalized():
    v1 = [1.0, 0.0]
    v2 = [1.0, 0.0]
    assert cosine_similarity(v1, v2) == pytest.approx(1.0)

    v_opposite = [-1.0, 0.0]
    assert cosine_similarity(v1, v_opposite) == pytest.approx(0.0)


@pytest.mark.asyncio
async def test_get_foundational_courses_empty_when_unset():
    session = AsyncMock()
    course = CourseModel(
        id="c-main",
        title="Main Course",
        status=CourseStatus.PUBLISHED,
        foundational_course_ids=[],
    )
    assert await get_foundational_courses(session, course) == []


@pytest.mark.asyncio
async def test_get_foundational_courses_published_returns_ordered_list():
    session = AsyncMock()
    p1 = CourseModel(
        id="c-p1",
        title="Foundational Math",
        status=CourseStatus.PUBLISHED,
    )
    p2 = CourseModel(
        id="c-p2",
        title="Basic Python",
        status=CourseStatus.PUBLISHED,
    )
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [p2, p1]
    session.execute.return_value = mock_res

    course = CourseModel(
        id="c-adv",
        title="Advanced AI",
        status=CourseStatus.PUBLISHED,
        foundational_course_ids=["c-p1", "c-p2"],
    )
    result = await get_foundational_courses(session, course)
    assert len(result) == 2
    # Preserves requested order: c-p1 then c-p2
    assert result[0].id == "c-p1"
    assert result[1].id == "c-p2"


@pytest.mark.asyncio
async def test_get_foundational_courses_filters_unpublished():
    session = AsyncMock()
    p1 = CourseModel(
        id="c-p1",
        title="Foundational Math",
        status=CourseStatus.PUBLISHED,
    )
    mock_res = MagicMock()
    # Database query filters by CourseStatus.PUBLISHED, so only p1 is returned by DB
    mock_res.scalars.return_value.all.return_value = [p1]
    session.execute.return_value = mock_res

    course = CourseModel(
        id="c-adv",
        title="Advanced AI",
        status=CourseStatus.PUBLISHED,
        foundational_course_ids=["c-p1", "c-draft"],
    )
    result = await get_foundational_courses(session, course)
    assert len(result) == 1
    assert result[0].id == "c-p1"


@pytest.mark.asyncio
async def test_get_recommended_courses_scoring_and_filtering():
    session = AsyncMock()
    current_course = CourseModel(
        id="c-target",
        title="Deep Learning Specialization",
        subject="AI_DATA_SCIENCE",
        partner_name="DeepLearning.AI",
        owner_id="instructor-1",
        status=CourseStatus.PUBLISHED,
    )

    # Mock no embeddings (fallback subject matching)
    session.get.return_value = None

    c_same_author = CourseModel(
        id="c-same-author",
        title="Neural Networks",
        subject="AI_DATA_SCIENCE",
        partner_name="DeepLearning.AI",
        owner_id="instructor-1",
        status=CourseStatus.PUBLISHED,
        review_count=10,
        average_rating=4.9,
    )
    c_same_partner = CourseModel(
        id="c-same-partner",
        title="Intro to Statistics",
        subject="AI_DATA_SCIENCE",
        partner_name="DeepLearning.AI",
        owner_id="instructor-2",
        status=CourseStatus.PUBLISHED,
        review_count=50,
        average_rating=4.5,
    )
    c_irrelevant = CourseModel(
        id="c-irrelevant",
        title="Music Theory",
        subject="ARTS_HUMANITIES",
        partner_name="Berklee",
        owner_id="instructor-3",
        status=CourseStatus.PUBLISHED,
        review_count=0,
        average_rating=0.0,
    )

    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = [
        c_same_author,
        c_same_partner,
        c_irrelevant,
    ]
    session.execute.return_value = mock_res

    results = await get_recommended_courses(session, current_course, target_count=3)

    assert len(results) >= 2
    # Same author course should rank top due to 0.30 author boost
    assert results[0].course.id == "c-same-author"
    assert results[0].score > results[1].score


def test_build_course_payload():
    course = CourseModel(
        id="c-ml",
        title="Machine Learning Foundations",
        description="Comprehensive introduction to ML",
        partner_name="DeepLearning.AI",
        subject="AI_DATA_SCIENCE",
        level="BEGINNER",
        week_modules=[
            WeekModuleModel(
                id="wm-1",
                course_id="c-ml",
                week_number=1,
                title="Linear Regression",
                lessons=[
                    LessonModel(
                        id="l-1",
                        week_module_id="wm-1",
                        title="Model representation",
                        order_index=1,
                    )
                ],
            )
        ],
    )
    payload = build_course_payload(course)
    assert "Machine Learning Foundations" in payload
    assert "Comprehensive introduction to ML" in payload
    assert "DeepLearning.AI" in payload
    assert "AI_DATA_SCIENCE" in payload
    assert "Linear Regression" in payload
    assert "Model representation" in payload
