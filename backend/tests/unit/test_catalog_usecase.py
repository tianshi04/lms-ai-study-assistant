import pytest
from unittest.mock import AsyncMock, patch

from src.modules.catalog.application.catalog_usecase import CatalogUseCase
from src.modules.catalog.domain.entities import Course, Lesson, Specialization


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def mock_repo():
    repo = AsyncMock()
    # Mock methods returning specific types
    repo.list_courses.return_value = (
        [
            Course(
                id="c1",
                title="Course 1",
                slug="c-1",
                description="",
                partner_name="",
                partner_logo_url="",
                instructor_names=[],
                week_modules=[],
            )
        ],
        "token",
    )
    repo.get_course_detail.return_value = Course(
        id="c1",
        title="Course 1",
        slug="c-1",
        description="",
        partner_name="",
        partner_logo_url="",
        instructor_names=[],
        week_modules=[],
    )
    repo.get_lesson_detail.return_value = Lesson(
        id="l1", title="Lesson 1", estimated_minutes=10, items=[]
    )
    repo.get_specialization.return_value = (
        Specialization(
            id="s1",
            title="Spec 1",
            description="",
            partner_name="",
            partner_logo_url="",
            course_ids=[],
        ),
        [],
    )
    repo.seed_if_empty = AsyncMock()
    return repo


@pytest.fixture
def repo_factory(mock_repo):
    return lambda session: mock_repo


@pytest.fixture
def catalog_usecase(repo_factory):
    return CatalogUseCase(repo_factory=repo_factory)


@pytest.mark.asyncio
@patch("src.modules.catalog.application.catalog_usecase.async_session_scope")
async def test_list_courses(mock_scope, catalog_usecase, mock_repo, mock_session):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    courses, token = await catalog_usecase.list_courses(page_size=5, page_token="pt")

    mock_scope.assert_called_once()
    mock_repo.seed_if_empty.assert_awaited_once()
    mock_repo.list_courses.assert_awaited_once_with(5, "pt")
    assert len(courses) == 1
    assert courses[0].id == "c1"
    assert token == "token"


@pytest.mark.asyncio
@patch("src.modules.catalog.application.catalog_usecase.async_session_scope")
async def test_get_course_detail(mock_scope, catalog_usecase, mock_repo, mock_session):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    course = await catalog_usecase.get_course_detail("c1")

    mock_scope.assert_called_once()
    mock_repo.seed_if_empty.assert_awaited_once()
    mock_repo.get_course_detail.assert_awaited_once_with("c1")
    assert course is not None
    assert course.id == "c1"


@pytest.mark.asyncio
@patch("src.modules.catalog.application.catalog_usecase.async_session_scope")
async def test_get_lesson_detail(mock_scope, catalog_usecase, mock_repo, mock_session):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    lesson = await catalog_usecase.get_lesson_detail("c1", "l1")

    mock_scope.assert_called_once()
    mock_repo.seed_if_empty.assert_awaited_once()
    mock_repo.get_lesson_detail.assert_awaited_once_with("c1", "l1")
    assert lesson is not None
    assert lesson.id == "l1"


@pytest.mark.asyncio
@patch("src.modules.catalog.application.catalog_usecase.async_session_scope")
async def test_get_specialization(mock_scope, catalog_usecase, mock_repo, mock_session):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    spec, courses = await catalog_usecase.get_specialization("s1")

    mock_scope.assert_called_once()
    mock_repo.seed_if_empty.assert_awaited_once()
    mock_repo.get_specialization.assert_awaited_once_with("s1")
    assert spec is not None
    assert spec.id == "s1"
    assert isinstance(courses, list)


@pytest.mark.asyncio
@patch("src.modules.catalog.application.catalog_usecase.async_session_scope")
async def test_without_repo_factory(mock_scope, mock_session):
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__.return_value = mock_session
    mock_scope.return_value = mock_ctx

    usecase = CatalogUseCase()

    with patch(
        "src.modules.catalog.application.catalog_usecase.SQLAlchemyCatalogRepository"
    ) as mock_repo_class:
        mock_repo_instance = AsyncMock()
        mock_repo_instance.list_courses.return_value = ([], "")
        # Remove seed_if_empty from the mock to test the `if callable(seed_fn)` logic branch
        del mock_repo_instance.seed_if_empty

        mock_repo_class.return_value = mock_repo_instance

        courses, token = await usecase.list_courses()

        mock_repo_class.assert_called_once_with(mock_session)
        mock_repo_instance.list_courses.assert_awaited_once()
        assert courses == []
