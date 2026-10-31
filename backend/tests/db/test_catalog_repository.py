from unittest.mock import AsyncMock, MagicMock

import pytest

from src.modules.catalog.infrastructure.models import (
    CourseModel,
    InteractiveTranscriptModel,
    InVideoQuizModel,
    LearningItemModel,
    LessonModel,
    SpecializationModel,
    WeekModuleModel,
)
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def repo(mock_session):
    return SQLAlchemyCatalogRepository(session=mock_session)


@pytest.fixture
def sample_course_model():
    course = CourseModel(
        id="c1",
        title="Course 1",
        slug="c-1",
        description="Desc",
        partner_name="Partner",
        partner_logo_url="URL",
    )

    transcript = InteractiveTranscriptModel(
        id=1, timestamp_seconds=10, text="Hello", item_id="i1"
    )

    quiz = InVideoQuizModel(
        id=1,
        timestamp_seconds=20,
        question="Q?",
        options=["A", "B"],
        correct_option_index=0,
        explanation="Exp",
        item_id="i1",
    )

    item = LearningItemModel(
        id="i1",
        title="Item 1",
        type="video",
        estimated_minutes=5,
        video_url="v_url",
        vtt_subtitle_url="vtt_url",
        reading_markdown="md",
        interactive_transcripts=[transcript],
        in_video_quizzes=[quiz],
        lesson_id="l1",
    )

    lesson = LessonModel(
        id="l1",
        title="Lesson 1",
        estimated_minutes=10,
        items=[item],
        week_module_id="w1",
    )

    week = WeekModuleModel(
        id="w1",
        week_number=1,
        title="Week 1",
        summary="Sum",
        lessons=[lesson],
        course_id="c1",
    )

    course.week_modules = [week]
    return course


@pytest.mark.asyncio
async def test_list_courses(repo, mock_session, sample_course_model):
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [sample_course_model]
    mock_result.scalars.return_value = mock_scalars
    mock_session.execute.return_value = mock_result

    courses, _token = await repo.list_courses()

    mock_session.execute.assert_awaited_once()
    assert len(courses) == 1
    c = courses[0]
    assert c.id == "c1"
    assert c.title == "Course 1"
    assert len(c.week_modules) == 1
    assert (
        c.week_modules[0].lessons[0].items[0].interactive_transcripts[0].text == "Hello"
    )


@pytest.mark.asyncio
async def test_get_course_detail(repo, mock_session, sample_course_model):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = sample_course_model
    mock_session.execute.return_value = mock_result

    course = await repo.get_course_detail("c1")

    mock_session.execute.assert_awaited_once()
    assert course is not None
    assert course.id == "c1"


@pytest.mark.asyncio
async def test_get_course_detail_not_found(repo, mock_session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    course = await repo.get_course_detail("c1")

    mock_session.execute.assert_awaited_once()
    assert course is None


@pytest.mark.asyncio
async def test_get_lesson_detail(repo, mock_session, sample_course_model):
    sample_lesson_model = sample_course_model.week_modules[0].lessons[0]
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = sample_lesson_model
    mock_session.execute.return_value = mock_result

    lesson = await repo.get_lesson_detail("c1", "l1")

    assert lesson is not None
    assert lesson.id == "l1"
    assert lesson.title == "Lesson 1"


@pytest.mark.asyncio
async def test_get_lesson_detail_course_not_found(repo, mock_session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    lesson = await repo.get_lesson_detail("c1", "l1")

    assert lesson is None


@pytest.mark.asyncio
async def test_get_lesson_detail_lesson_not_found(repo, mock_session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    lesson = await repo.get_lesson_detail("c1", "nonexistent")

    assert lesson is None


@pytest.mark.asyncio
async def test_get_specialization(repo, mock_session, sample_course_model):
    spec_model = SpecializationModel(
        id="s1",
        title="Spec 1",
        description="Desc",
        partner_name="Partner",
        partner_logo_url="URL",
        course_ids=["c1", "c2"],
    )

    sample_course_2 = CourseModel(
        id="c2",
        title="Course 2",
        slug="c-2",
        description="Desc 2",
        partner_name="Partner",
        partner_logo_url="URL",
    )

    def mock_execute_side_effect(stmt):
        mock_res = MagicMock()
        stmt_str = str(stmt).lower()
        if "specializations" in stmt_str:
            mock_res.scalar_one_or_none.return_value = spec_model
        else:
            mock_res.scalars.return_value.all.return_value = [
                sample_course_model,
                sample_course_2,
            ]
            mock_res.scalar_one_or_none.return_value = sample_course_model
        return mock_res

    captured_stmts = []

    def wrapper(stmt):
        captured_stmts.append(stmt)
        return mock_execute_side_effect(stmt)

    mock_session.execute.side_effect = wrapper

    spec, courses = await repo.get_specialization("s1")

    assert spec is not None
    assert spec.id == "s1"
    assert len(courses) == 2
    assert courses[0].id == "c1"
    assert courses[1].id == "c2"
    assert len(captured_stmts) == 2
    assert "courses.status" in str(captured_stmts[1]).lower()


@pytest.mark.asyncio
async def test_get_specialization_not_found(repo, mock_session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    spec, courses = await repo.get_specialization("s1")

    assert spec is None
    assert courses == []


@pytest.mark.asyncio
async def test_list_foundational_course_candidates(
    repo, mock_session, sample_course_model
):
    from unittest.mock import patch

    executed_stmts = []

    def mock_execute(stmt):
        executed_stmts.append(stmt)
        res = MagicMock()
        stmt_str = str(stmt).lower()
        if "count(" in stmt_str:
            res.scalar.return_value = 1
        elif "course_embeddings" in stmt_str or "specializations" in stmt_str:
            res.scalar_one_or_none.return_value = None
        else:
            res.scalars.return_value.all.return_value = [sample_course_model]
            res.scalar_one_or_none.return_value = sample_course_model
        return res

    mock_session.execute.side_effect = mock_execute

    with patch(
        "src.modules.catalog.infrastructure.repository.apply_organization_scope",
        side_effect=lambda stmt, *args, **kwargs: stmt,
    ) as mock_scope:
        courses, _next_token = await repo.list_foundational_course_candidates(
            current_user_id="user_inst",
            course_id="c_other",
            search_query="test%_course",
            page_size=10,
            page_token="0",
        )

        assert len(courses) == 1
        assert courses[0].id == "c1"
        assert mock_scope.call_count >= 2
        # Verify wildcard escaping in statement params
        all_params = [
            str(v)
            for s in executed_stmts
            if hasattr(s, "compile")
            for v in getattr(s.compile(), "params", {}).values()
        ]
        found_escaped = any(r"test\%" in p and r"\_course" in p for p in all_params)
        assert found_escaped


@pytest.mark.asyncio
async def test_validate_foundational_course_ids_rules(repo, mock_session):
    # 1. Test max count
    with pytest.raises(ValueError, match="Số lượng môn học nền tảng tối đa"):
        await repo._validate_foundational_course_ids(
            current_course_id="c_curr",
            current_slug="curr-slug",
            foundational_ids=[f"c_{i}" for i in range(11)],
        )

    # 2. Test self-selection (by ID or slug)
    with pytest.raises(ValueError, match="Khóa học không thể tự chọn chính mình"):
        await repo._validate_foundational_course_ids(
            current_course_id="c_curr",
            current_slug="curr-slug",
            foundational_ids=["c_curr"],
        )

    with pytest.raises(ValueError, match="Khóa học không thể tự chọn chính mình"):
        await repo._validate_foundational_course_ids(
            current_course_id="c_curr",
            current_slug="curr-slug",
            foundational_ids=["curr-slug"],
        )

    # 3. Test non-existent course in DB
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []
    mock_session.execute.return_value = mock_res
    with pytest.raises(ValueError, match="Khóa học nền tảng không tồn tại"):
        await repo._validate_foundational_course_ids(
            current_course_id="c_curr",
            current_slug="curr-slug",
            foundational_ids=["c_nonexistent"],
        )

    # 4. Test circular dependency (A <-> B)
    course_b = CourseModel(
        id="c_b",
        title="Course B",
        slug="course-b",
        description="",
        partner_name="",
        partner_logo_url="",
        foundational_course_ids=["c_curr"],
    )
    mock_res_circ = MagicMock()
    mock_res_circ.scalars.return_value.all.return_value = [course_b]
    mock_session.execute.return_value = mock_res_circ

    with pytest.raises(ValueError, match="Phát hiện quan hệ phụ thuộc vòng"):
        await repo._validate_foundational_course_ids(
            current_course_id="c_curr",
            current_slug="curr-slug",
            foundational_ids=["c_b"],
        )

    # 5. Test valid, deduplication and order preservation
    course_valid_1 = CourseModel(
        id="c_v1",
        title="Course V1",
        slug="course-v1",
        description="",
        partner_name="",
        partner_logo_url="",
        foundational_course_ids=[],
    )
    course_valid_2 = CourseModel(
        id="c_v2",
        title="Course V2",
        slug="course-v2",
        description="",
        partner_name="",
        partner_logo_url="",
        foundational_course_ids=[],
    )
    mock_res_valid = MagicMock()
    mock_res_valid.scalars.return_value.all.return_value = [
        course_valid_1,
        course_valid_2,
    ]
    mock_session.execute.return_value = mock_res_valid

    res = await repo._validate_foundational_course_ids(
        current_course_id="c_curr",
        current_slug="curr-slug",
        foundational_ids=["c_v1", "c_v2", "c_v1"],
    )
    assert res == ["c_v1", "c_v2"]
