from dataclasses import dataclass

import pytest
import pytest_asyncio
from sqlalchemy import select

from src.modules.catalog.application.catalog_usecase import CatalogUseCase
from src.modules.catalog.domain.entities import Course
from src.modules.catalog.infrastructure.models import CourseModel
from src.shared.infrastructure.database import async_session_scope


@dataclass
class CourseFilterFixtureData:
    __test__ = False
    courses: list[Course]
    suffix: str
    c1: Course
    c2: Course
    c3: Course


@pytest.fixture
def catalog_usecase():
    return CatalogUseCase()


@pytest_asyncio.fixture
async def setup_test_courses(catalog_usecase: CatalogUseCase):
    import asyncio
    import uuid

    suffix = uuid.uuid4().hex[:6]
    usecase = catalog_usecase
    c1 = await usecase.create_course(
        title=f"Intro to AI Test {suffix}",
        slug=f"intro-ai-test-{suffix}",
        description=f"A beginner course on AI {suffix}",
        partner_name="DeepLearning.AI",
        partner_logo_url="",
        instructor_names=["Andrew Ng"],
        subject="AI_ML",
        level="BEGINNER",
    )
    await asyncio.sleep(0.01)
    c2 = await usecase.create_course(
        title=f"Advanced ML {suffix}",
        slug=f"advanced-ml-test-{suffix}",
        description=f"Deep learning and beyond {suffix}",
        partner_name="DeepLearning.AI",
        partner_logo_url="",
        instructor_names=["Andrew Ng"],
        subject="AI_ML",
        level="ADVANCED",
    )
    await asyncio.sleep(0.01)
    c3 = await usecase.create_course(
        title=f"Web Dev HTML 101 {suffix}",
        slug=f"web-dev-101-test-{suffix}",
        description=f"Learn HTML {suffix} and CSS",
        partner_name="Meta",
        partner_logo_url="",
        instructor_names=["Jane Doe"],
        subject="WEB_DEVELOPMENT",
        level="BEGINNER",
    )

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

    yield CourseFilterFixtureData(
        courses=[c1, c2, c3], suffix=suffix, c1=c1, c2=c2, c3=c3
    )


@pytest.mark.asyncio
async def test_list_courses_no_filter(
    catalog_usecase: CatalogUseCase, setup_test_courses: CourseFilterFixtureData
):
    courses, _ = await catalog_usecase.list_courses(
        search_query=setup_test_courses.suffix, page_size=10
    )
    assert len(courses) == 3
    assert {c.slug for c in courses} == {
        setup_test_courses.c1.slug,
        setup_test_courses.c2.slug,
        setup_test_courses.c3.slug,
    }


@pytest.mark.asyncio
async def test_list_courses_filter_by_subject(
    catalog_usecase: CatalogUseCase, setup_test_courses: CourseFilterFixtureData
):
    courses, _ = await catalog_usecase.list_courses(
        search_query=setup_test_courses.suffix, subject="AI_ML"
    )
    assert len(courses) == 2
    assert {c.slug for c in courses} == {
        setup_test_courses.c1.slug,
        setup_test_courses.c2.slug,
    }
    for c in courses:
        assert c.subject == "AI_ML"


@pytest.mark.asyncio
async def test_list_courses_filter_by_level(
    catalog_usecase: CatalogUseCase, setup_test_courses: CourseFilterFixtureData
):
    courses, _ = await catalog_usecase.list_courses(
        search_query=setup_test_courses.suffix, level="BEGINNER"
    )
    assert len(courses) == 2
    assert {c.slug for c in courses} == {
        setup_test_courses.c1.slug,
        setup_test_courses.c3.slug,
    }
    for c in courses:
        assert c.level == "BEGINNER"


@pytest.mark.asyncio
async def test_list_courses_filter_combined(
    catalog_usecase: CatalogUseCase, setup_test_courses: CourseFilterFixtureData
):
    courses, _ = await catalog_usecase.list_courses(
        search_query=setup_test_courses.suffix, subject="AI_ML", level="ADVANCED"
    )
    assert len(courses) == 1
    assert courses[0].slug == setup_test_courses.c2.slug
    assert courses[0].subject == "AI_ML"
    assert courses[0].level == "ADVANCED"


@pytest.mark.asyncio
async def test_list_courses_search_query(
    catalog_usecase: CatalogUseCase, setup_test_courses: CourseFilterFixtureData
):
    courses, _ = await catalog_usecase.list_courses(
        search_query=f"HTML {setup_test_courses.suffix}"
    )
    assert len(courses) == 1
    assert courses[0].slug == setup_test_courses.c3.slug


@pytest.mark.asyncio
async def test_list_courses_search_no_match(
    catalog_usecase: CatalogUseCase, setup_test_courses: CourseFilterFixtureData
):
    courses, _ = await catalog_usecase.list_courses(
        search_query=f"xyz_nonexistent_{setup_test_courses.suffix}"
    )
    assert len(courses) == 0


@pytest.mark.asyncio
async def test_list_courses_sort_by_rating(
    catalog_usecase: CatalogUseCase, setup_test_courses: CourseFilterFixtureData
):
    courses, _ = await catalog_usecase.list_courses(
        search_query=setup_test_courses.suffix, sort_by="rating"
    )
    assert len(courses) == 3
    ratings = [c.average_rating for c in courses]
    assert ratings == sorted(ratings, reverse=True)
    assert [c.slug for c in courses] == [
        setup_test_courses.c2.slug,
        setup_test_courses.c1.slug,
        setup_test_courses.c3.slug,
    ]


@pytest.mark.asyncio
async def test_list_courses_sort_by_popular(
    catalog_usecase: CatalogUseCase, setup_test_courses: CourseFilterFixtureData
):
    courses, _ = await catalog_usecase.list_courses(
        search_query=setup_test_courses.suffix, sort_by="popular"
    )
    assert len(courses) == 3
    reviews = [c.review_count for c in courses]
    assert reviews == sorted(reviews, reverse=True)
    assert [c.slug for c in courses] == [
        setup_test_courses.c2.slug,
        setup_test_courses.c1.slug,
        setup_test_courses.c3.slug,
    ]


@pytest.mark.asyncio
async def test_list_courses_sort_by_newest(
    catalog_usecase: CatalogUseCase, setup_test_courses: CourseFilterFixtureData
):
    courses, _ = await catalog_usecase.list_courses(
        search_query=setup_test_courses.suffix,
        sort_by="newest",
        status_filter="DRAFT",
        page_size=50,
    )
    assert len(courses) == 3
    ids = [c.id for c in courses]
    assert ids == sorted(ids, reverse=True)
    assert {c.slug for c in courses} == {
        setup_test_courses.c1.slug,
        setup_test_courses.c2.slug,
        setup_test_courses.c3.slug,
    }
