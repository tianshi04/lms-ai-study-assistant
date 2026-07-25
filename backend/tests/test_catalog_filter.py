import pytest
import pytest_asyncio
from src.modules.catalog.application.catalog_usecase import CatalogUseCase
from src.modules.catalog.domain.entities import CourseLevel, CourseSubject


@pytest.fixture
def catalog_usecase():
    return CatalogUseCase()


@pytest_asyncio.fixture
async def setup_test_courses(catalog_usecase):
    import uuid

    suffix = uuid.uuid4().hex[:6]
    usecase = catalog_usecase
    c1 = await usecase.create_course(
        title="Intro to AI Test",
        slug=f"intro-ai-test-{suffix}",
        description="A beginner course on AI",
        partner_name="DeepLearning.AI",
        partner_logo_url="",
        instructor_names=["Andrew Ng"],
        subject="COURSE_SUBJECT_AI_ML",
        level="COURSE_LEVEL_BEGINNER",
    )
    c2 = await usecase.create_course(
        title="Advanced ML",
        slug=f"advanced-ml-test-{suffix}",
        description="Deep learning and beyond",
        partner_name="DeepLearning.AI",
        partner_logo_url="",
        instructor_names=["Andrew Ng"],
        subject="COURSE_SUBJECT_AI_ML",
        level="COURSE_LEVEL_ADVANCED",
    )
    c3 = await usecase.create_course(
        title="Web Dev 101",
        slug=f"web-dev-101-test-{suffix}",
        description="Learn HTML and CSS",
        partner_name="Meta",
        partner_logo_url="",
        instructor_names=["Jane Doe"],
        subject="COURSE_SUBJECT_WEB_DEVELOPMENT",
        level="COURSE_LEVEL_BEGINNER",
    )
    from src.shared.infrastructure.database import async_session_scope
    from src.modules.catalog.infrastructure.models import CourseModel
    from sqlalchemy import select

    async with async_session_scope() as session:
        stmt = select(CourseModel).where(CourseModel.id.in_([c1.id, c2.id, c3.id]))
        res = await session.execute(stmt)
        models = res.scalars().all()
        for m in models:
            if m.id == c1.id:
                m.average_rating = 4.5
                m.review_count = 100
            elif m.id == c2.id:
                m.average_rating = 4.8
                m.review_count = 200
            elif m.id == c3.id:
                m.average_rating = 4.2
                m.review_count = 50
        await session.commit()

    yield [c1, c2, c3]


@pytest.mark.asyncio
async def test_list_courses_no_filter(
    catalog_usecase: CatalogUseCase, setup_test_courses
):
    courses, _ = await catalog_usecase.list_courses(page_size=10)
    assert len(courses) >= 3


@pytest.mark.asyncio
async def test_list_courses_filter_by_subject(
    catalog_usecase: CatalogUseCase, setup_test_courses
):
    courses, _ = await catalog_usecase.list_courses(subject="COURSE_SUBJECT_AI_ML")
    assert len(courses) >= 2
    for c in courses:
        assert c.subject == CourseSubject.AI_ML.value or c.subject == "AI_ML"


@pytest.mark.asyncio
async def test_list_courses_filter_by_level(
    catalog_usecase: CatalogUseCase, setup_test_courses
):
    courses, _ = await catalog_usecase.list_courses(level="COURSE_LEVEL_BEGINNER")
    assert len(courses) >= 2
    for c in courses:
        assert c.level == CourseLevel.BEGINNER.value or c.level == "BEGINNER"


@pytest.mark.asyncio
async def test_list_courses_filter_combined(
    catalog_usecase: CatalogUseCase, setup_test_courses
):
    courses, _ = await catalog_usecase.list_courses(
        subject="COURSE_SUBJECT_AI_ML", level="COURSE_LEVEL_ADVANCED"
    )
    assert len(courses) >= 1
    for c in courses:
        assert c.subject in (CourseSubject.AI_ML.value, "AI_ML")
        assert c.level in (CourseLevel.ADVANCED.value, "ADVANCED")


@pytest.mark.asyncio
async def test_list_courses_search_query(
    catalog_usecase: CatalogUseCase, setup_test_courses
):
    courses, _ = await catalog_usecase.list_courses(search_query="HTML")
    assert len(courses) >= 1


@pytest.mark.asyncio
async def test_list_courses_search_no_match(
    catalog_usecase: CatalogUseCase, setup_test_courses
):
    courses, _ = await catalog_usecase.list_courses(search_query="xyz_nonexistent")
    assert len(courses) == 0


@pytest.mark.asyncio
async def test_list_courses_sort_by_rating(
    catalog_usecase: CatalogUseCase, setup_test_courses
):
    courses, _ = await catalog_usecase.list_courses(sort_by="rating")
    assert len(courses) >= 3
    test_courses = [c for c in courses if c.id.startswith("course-")]
    # Ratings should be sorted descending
    ratings = [c.average_rating for c in test_courses]
    assert ratings == sorted(ratings, reverse=True)


@pytest.mark.asyncio
async def test_list_courses_sort_by_popular(
    catalog_usecase: CatalogUseCase, setup_test_courses
):
    courses, _ = await catalog_usecase.list_courses(sort_by="popular")
    assert len(courses) >= 3
    test_courses = [c for c in courses if c.id.startswith("course-")]
    # Reviews should be sorted descending
    reviews = [c.review_count for c in test_courses]
    assert reviews == sorted(reviews, reverse=True)
