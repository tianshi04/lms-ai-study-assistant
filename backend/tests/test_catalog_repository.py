import pytest
from unittest.mock import AsyncMock, MagicMock
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository
from src.modules.catalog.infrastructure.models import (
    CourseModel,
    WeekModuleModel,
    LessonModel,
    LearningItemModel,
    InteractiveTranscriptModel,
    InVideoQuizModel,
    SpecializationModel,
)


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
        instructor_names=["Inst 1"],
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

    courses, token = await repo.list_courses()

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
    # get_lesson_detail calls get_course_detail
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = sample_course_model
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
async def test_get_lesson_detail_lesson_not_found(
    repo, mock_session, sample_course_model
):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = sample_course_model
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

    def mock_execute_side_effect(stmt):
        mock_res = MagicMock()
        stmt_str = str(stmt).lower()
        if "specializations" in stmt_str:
            mock_res.scalar_one_or_none.return_value = spec_model
        else:
            mock_res.scalar_one_or_none.return_value = sample_course_model
        return mock_res

    mock_session.execute.side_effect = mock_execute_side_effect

    spec, courses = await repo.get_specialization("s1")

    assert spec is not None
    assert spec.id == "s1"
    assert len(courses) == 2
    assert courses[0].id == "c1"
    assert courses[1].id == "c1"


@pytest.mark.asyncio
async def test_get_specialization_not_found(repo, mock_session):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result

    spec, courses = await repo.get_specialization("s1")

    assert spec is None
    assert courses == []
