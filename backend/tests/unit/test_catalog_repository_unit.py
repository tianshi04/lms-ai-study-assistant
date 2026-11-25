from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.modules.catalog.domain.constants import MAX_FOUNDATIONAL_COURSES_COUNT
from src.modules.catalog.infrastructure.models import CourseModel
from src.modules.catalog.infrastructure.repository import SQLAlchemyCatalogRepository


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def repo(mock_session):
    return SQLAlchemyCatalogRepository(session=mock_session)


@pytest.fixture
def sample_course_model():
    return CourseModel(
        id="c1",
        title="Course 1",
        slug="c-1",
        description="Desc",
        partner_name="Partner",
        partner_logo_url="URL",
        owner_id="user_inst",
        foundational_course_ids=[],
        average_rating=4.5,
        review_count=10,
    )


@pytest.mark.asyncio
async def test_list_foundational_course_candidates(
    repo, mock_session, sample_course_model
):
    executed_stmts = []

    def mock_execute(stmt):
        executed_stmts.append(stmt)
        res = MagicMock()
        stmt_str = str(stmt).lower()
        if "count(" in stmt_str:
            res.scalar.return_value = 1
        elif "from users" in stmt_str or "users.full_name" in stmt_str:
            res.all.return_value = [("user_inst", "Test Instructor")]
        elif "course_embeddings" in stmt_str or "specializations" in stmt_str:
            res.scalar_one_or_none.return_value = None
        else:
            scalars_mock = MagicMock()
            scalars_mock.all.return_value = [sample_course_model]
            res.scalars.return_value = scalars_mock
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
            foundational_ids=[
                f"c_{i}" for i in range(MAX_FOUNDATIONAL_COURSES_COUNT + 1)
            ],
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


@pytest.mark.asyncio
async def test_hydrate_instructor_names_ordering_and_dedup():
    from src.modules.catalog.domain.entities import Course

    mock_session = AsyncMock()
    repo = SQLAlchemyCatalogRepository(mock_session)

    c1 = Course(
        id="c1",
        title="Course 1",
        slug="c-1",
        description="",
        partner_name="",
        partner_logo_url="",
        owner_id="u_owner",
        co_instructor_ids=["u_co1", "u_owner", "u_blank", "u_missing"],
    )
    c2 = Course(
        id="c2",
        title="Course 2",
        slug="c-2",
        description="",
        partner_name="",
        partner_logo_url="",
        owner_id="",
        co_instructor_ids=[],
    )

    with patch(
        "src.modules.identity.infrastructure.repository.IdentityRepository.get_user_names_by_ids",
        new_callable=AsyncMock,
        return_value={
            "u_owner": "  Prof. Andrew Ng  ",
            "u_co1": "Dr. Fei-Fei Li",
            "u_blank": "   ",
        },
    ) as mock_batch_lookup:
        result = await repo._hydrate_instructor_names([c1, c2])

        mock_batch_lookup.assert_awaited_once_with(
            ["u_owner", "u_co1", "u_blank", "u_missing"]
        )
        assert result[0].instructor_names == ["Prof. Andrew Ng", "Dr. Fei-Fei Li"]
        assert result[1].instructor_names == []


@pytest.mark.asyncio
async def test_get_instructor_analytics_empty(repo, mock_session):
    def mock_exec(stmt):
        stmt_str = str(stmt).lower()
        res = MagicMock()
        if "course_reviews" in stmt_str:
            res.one_or_none.return_value = (0.0, 0)
        elif "course_collaborators" in stmt_str:
            scalars_m = MagicMock()
            scalars_m.all.return_value = []
            res.scalars.return_value = scalars_m
        elif "courses.owner_id" in stmt_str:
            res.scalar_one_or_none.return_value = "instructor_1"
        elif "courses.id" in stmt_str:
            res.scalar_one_or_none.return_value = "c1"
        elif "learning_progresses" in stmt_str:
            scalars_m = MagicMock()
            scalars_m.all.return_value = []
            res.scalars.return_value = scalars_m
        else:
            res.scalar_one_or_none.return_value = "c1"
            res.one_or_none.return_value = None
            scalars_m = MagicMock()
            scalars_m.all.return_value = []
            res.scalars.return_value = scalars_m
        return res

    mock_session.execute.side_effect = mock_exec

    analytics = await repo.get_instructor_analytics("c1")
    assert analytics.course_id == "c1"
    assert analytics.total_enrolled_students == 0
    assert analytics.total_learning_hours == 0.0
    assert analytics.students == []
