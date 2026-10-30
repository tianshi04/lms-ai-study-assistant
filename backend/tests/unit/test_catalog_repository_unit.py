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
