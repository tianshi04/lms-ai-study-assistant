from unittest.mock import AsyncMock, patch

import pytest

from src.modules.catalog.application import CatalogUseCase
from src.modules.catalog.domain import Course, CourseStatus
from src.modules.identity.domain import User, UserRole
from src.shared.auth import CurrentUserContext


@pytest.mark.asyncio
async def test_add_course_collaborator_success():
    use_case = CatalogUseCase()
    owner_user = CurrentUserContext(id="owner_1", role="INSTRUCTOR")
    mock_course = Course(
        id="course_101",
        title="Test Course",
        slug="test-course",
        description="",
        partner_name="",
        partner_logo_url="",
        instructor_names=["Owner User"],
        owner_id="owner_1",
        co_instructor_ids=[],
        status=CourseStatus.DRAFT,
    )
    mock_target_user = User(
        id="user_222",
        email="co_instructor@example.com",
        full_name="Co Instructor",
        role=UserRole.INSTRUCTOR,
    )

    with (
        patch(
            "src.modules.catalog.infrastructure.repository.SQLAlchemyCatalogRepository.get_course_detail",
            new_callable=AsyncMock,
            return_value=mock_course,
        ),
        patch(
            "src.modules.identity.infrastructure.repository.IdentityRepository.get_by_email",
            new_callable=AsyncMock,
            return_value=mock_target_user,
        ),
        patch(
            "src.modules.catalog.infrastructure.repository.SQLAlchemyCatalogRepository.add_course_collaborator",
            new_callable=AsyncMock,
            return_value=True,
        ) as mock_add,
        patch(
            "src.modules.catalog.infrastructure.repository.SQLAlchemyCatalogRepository.create_audit_log",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch(
            "src.modules.catalog.infrastructure.repository.SQLAlchemyCatalogRepository.list_course_collaborators_with_details",
            new_callable=AsyncMock,
            return_value=[
                {
                    "collaborator_id": "collab_course_101_user_222",
                    "user_id": "user_222",
                    "email": "co_instructor@example.com",
                    "full_name": "Co Instructor",
                    "avatar_url": "",
                    "role": "co_instructor",
                    "added_at": "2026-08-03",
                }
            ],
        ),
    ):
        result = await use_case.add_course_collaborator(
            course_id="course_101",
            email="co_instructor@example.com",
            role="co_instructor",
            current_user=owner_user,
        )

        assert result["collaborator"]["user_id"] == "user_222"
        assert result["collaborator"]["role"] == "co_instructor"
        mock_add.assert_called_once_with("course_101", "user_222", "co_instructor")


@pytest.mark.asyncio
async def test_add_course_collaborator_permission_denied():
    use_case = CatalogUseCase()
    other_user = CurrentUserContext(id="other_999", role="INSTRUCTOR")
    mock_course = Course(
        id="course_101",
        title="Test Course",
        slug="test-course",
        description="",
        partner_name="",
        partner_logo_url="",
        instructor_names=["Owner User"],
        owner_id="owner_1",
        co_instructor_ids=[],
        status=CourseStatus.DRAFT,
    )

    with (
        patch(
            "src.modules.catalog.infrastructure.repository.SQLAlchemyCatalogRepository.get_course_detail",
            new_callable=AsyncMock,
            return_value=mock_course,
        ),
        pytest.raises(PermissionError, match="không phải là Chủ sở hữu"),
    ):
        await use_case.add_course_collaborator(
            course_id="course_101",
            email="ta@example.com",
            role="ta",
            current_user=other_user,
        )


@pytest.mark.asyncio
async def test_list_and_remove_course_collaborator():
    use_case = CatalogUseCase()
    owner_user = CurrentUserContext(id="owner_1", role="INSTRUCTOR")
    mock_course = Course(
        id="course_101",
        title="Test Course",
        slug="test-course",
        description="",
        partner_name="",
        partner_logo_url="",
        instructor_names=["Owner User"],
        owner_id="owner_1",
        co_instructor_ids=["user_222"],
        status=CourseStatus.DRAFT,
    )

    with (
        patch(
            "src.modules.catalog.infrastructure.repository.SQLAlchemyCatalogRepository.get_course_detail",
            new_callable=AsyncMock,
            return_value=mock_course,
        ),
        patch(
            "src.modules.catalog.infrastructure.repository.SQLAlchemyCatalogRepository.list_course_collaborators_with_details",
            new_callable=AsyncMock,
            return_value=[
                {
                    "collaborator_id": "collab_course_101_user_222",
                    "user_id": "user_222",
                    "email": "co_instructor@example.com",
                    "full_name": "Co Instructor",
                    "avatar_url": "",
                    "role": "co_instructor",
                    "added_at": "2026-08-03",
                }
            ],
        ),
    ):
        collabs = await use_case.list_course_collaborators(
            course_id="course_101", current_user=owner_user
        )
        assert len(collabs) == 1
        assert collabs[0]["user_id"] == "user_222"

    with (
        patch(
            "src.modules.catalog.infrastructure.repository.SQLAlchemyCatalogRepository.get_course_detail",
            new_callable=AsyncMock,
            return_value=mock_course,
        ),
        patch(
            "src.modules.catalog.infrastructure.repository.SQLAlchemyCatalogRepository.remove_course_collaborator",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch(
            "src.modules.catalog.infrastructure.repository.SQLAlchemyCatalogRepository.create_audit_log",
            new_callable=AsyncMock,
            return_value=True,
        ),
    ):
        res = await use_case.remove_course_collaborator(
            course_id="course_101", user_id="user_222", current_user=owner_user
        )
        assert res["success"] is True
