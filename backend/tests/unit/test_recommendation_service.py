from unittest.mock import AsyncMock, MagicMock

import pytest

from src.modules.catalog.domain import CourseStatus
from src.modules.catalog.domain.constants import CATEGORY_LABEL_MAP
from src.modules.catalog.infrastructure.embedding_service import build_course_payload
from src.modules.catalog.infrastructure.models import (
    CourseEmbeddingModel,
    CourseModel,
    LessonModel,
    SpecializationModel,
    WeekModuleModel,
)
from src.modules.catalog.infrastructure.recommendation_service import (
    cosine_similarity,
    get_foundational_course,
    get_recommended_courses,
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

    # Underflow epsilon guard (very tiny norm that could multiply to 0.0)
    assert raw_cosine_similarity([1e-100, 1e-100], [1e-100, 1e-100]) == 0.0

    # Precision clamping
    assert -1.0 <= raw_cosine_similarity([1.0], [1.0000000000001]) <= 1.0


def test_cosine_similarity_normalized():
    v1 = [1.0, 0.0]
    v2 = [1.0, 0.0]
    assert cosine_similarity(v1, v2) == pytest.approx(1.0)

    v_opposite = [-1.0, 0.0]
    assert cosine_similarity(v1, v_opposite) == pytest.approx(0.0)


@pytest.mark.asyncio
async def test_get_foundational_course_beginner_guard():
    session = AsyncMock()
    # Test case sensitivity and whitespace normalization
    course1 = CourseModel(
        id="c-beg1",
        title="Intro Course",
        level="cat-lvl-beg",
        status=CourseStatus.PUBLISHED,
    )
    assert await get_foundational_course(session, course1) is None

    course2 = CourseModel(
        id="c-beg2",
        title="Intro Course 2",
        level="  Beginner  ",
        status=CourseStatus.PUBLISHED,
    )
    assert await get_foundational_course(session, course2) is None

    course3 = CourseModel(
        id="c-beg3",
        title="Intro Course 3",
        level="SƠ CẤP",
        status=CourseStatus.PUBLISHED,
    )
    assert await get_foundational_course(session, course3) is None


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


@pytest.mark.asyncio
async def test_get_recommended_courses_scoring_and_filtering():
    session = AsyncMock()
    current_course = CourseModel(
        id="curr-1",
        title="Current ML Course",
        subject="cat-subj-ai",
        owner_id="instructor-1",
        partner_name="AI Academy",
        average_rating=4.5,
        review_count=10,
        status=CourseStatus.PUBLISHED,
    )

    # Mock embeddings
    session.get.return_value = CourseEmbeddingModel(
        course_id="curr-1",
        embedding=[1.0, 0.0, 0.0],
    )

    # Mock candidates
    cand_high = CourseModel(
        id="cand-high",
        title="Advanced Deep Learning",
        subject="cat-subj-ai",
        owner_id="instructor-1",  # Same author
        partner_name="AI Academy",
        average_rating=4.8,
        review_count=20,
        status=CourseStatus.PUBLISHED,
    )
    cand_low = CourseModel(
        id="cand-low",
        title="Cooking 101",
        subject="cat-subj-other",
        owner_id="instructor-2",
        partner_name="Culinary School",
        average_rating=1.0,
        review_count=1,
        status=CourseStatus.PUBLISHED,
    )
    cand_zero_star = CourseModel(
        id="cand-zero",
        title="Poor Quality Course",
        subject="cat-subj-ai",
        owner_id="instructor-9",
        partner_name="Unknown",
        average_rating=0.0,  # Explicit 0.0 rating
        review_count=5,
        status=CourseStatus.PUBLISHED,
    )

    # Mock DB query for candidates
    mock_courses_res = MagicMock()
    mock_courses_res.scalars.return_value.all.return_value = [
        cand_high,
        cand_low,
        cand_zero_star,
    ]

    # Mock embeddings query
    mock_embs_res = MagicMock()
    mock_embs_res.scalars.return_value.all.return_value = [
        CourseEmbeddingModel(course_id="cand-high", embedding=[0.9, 0.1, 0.0]),
        CourseEmbeddingModel(course_id="cand-low", embedding=[0.0, 1.0, 0.0]),
        CourseEmbeddingModel(course_id="cand-zero", embedding=[0.5, 0.5, 0.0]),
    ]

    session.execute.side_effect = [mock_courses_res, mock_embs_res]

    recs = await get_recommended_courses(session, current_course, target_count=6)

    # Candidate 1 (cand-high) should have highest score and pass threshold
    assert len(recs) >= 1
    assert recs[0].course.id == "cand-high"
    assert recs[0].score > 0.8  # Strong similarity + same author + high rating


def test_build_course_payload_with_category_mapping():
    lesson = LessonModel(id="les-1", title="Giới thiệu PyTorch")
    week = WeekModuleModel(id="wk-1", week_number=1, title="Tuần 1", lessons=[lesson])
    course = CourseModel(
        id="c-test",
        title="Học Máy Nâng Cao",
        partner_name="Đại học Công Nghệ",
        subject="cat-subj-ai",
        level="cat-lvl-adv",
        description="Khóa học đi sâu vào kiến trúc Transformer.",
        week_modules=[week],
    )

    payload = build_course_payload(course)

    # Verify mapped labels appear in payload
    assert CATEGORY_LABEL_MAP["cat-subj-ai"] in payload
    assert CATEGORY_LABEL_MAP["cat-lvl-adv"] in payload
    assert "Đại học Công Nghệ" in payload
    assert "Giới thiệu PyTorch" in payload
