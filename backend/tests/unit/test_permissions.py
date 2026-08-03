import pytest
from unittest.mock import AsyncMock, MagicMock

from src.shared.auth import CurrentUserContext
from src.shared.permissions import (
    CoursePermission,
    OrgPermission,
    enforce_course_ownership,
    enforce_organization_permission,
)


@pytest.mark.asyncio
async def test_enforce_organization_permission_public_org():
    session = AsyncMock()
    user = CurrentUserContext(id="user_1", role="LEARNER")

    # Should not raise for partner_community or empty org_id
    await enforce_organization_permission(session, user, "partner_community")
    await enforce_organization_permission(session, user, "")


@pytest.mark.asyncio
@pytest.mark.asyncio
async def test_enforce_organization_permission_unauthenticated():
    session = AsyncMock()

    with pytest.raises(PermissionError):
        await enforce_organization_permission(session, None, "org_custom")


@pytest.mark.asyncio
async def test_enforce_organization_permission_super_admin():
    session = AsyncMock()
    user = CurrentUserContext(id="admin_1", role="ADMIN")

    # Super Admin should bypass checks
    await enforce_organization_permission(
        session, user, "org_custom", OrgPermission.MANAGE_MEMBERS
    )


@pytest.mark.asyncio
async def test_enforce_organization_permission_valid_member():
    session = AsyncMock()
    user = CurrentUserContext(id="instructor_1", role="INSTRUCTOR")

    mock_member = MagicMock()
    mock_member.role_id = "INSTRUCTOR"

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_member
    session.execute.return_value = mock_result

    # Valid permission check
    await enforce_organization_permission(
        session, user, "org_custom", OrgPermission.CREATE_COURSE
    )


@pytest.mark.asyncio
async def test_enforce_organization_permission_missing_permission():
    session = AsyncMock()
    user = CurrentUserContext(id="instructor_1", role="INSTRUCTOR")

    mock_member = MagicMock()
    mock_member.role_id = "INSTRUCTOR"

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_member
    session.execute.return_value = mock_result

    with pytest.raises(PermissionError):
        await enforce_organization_permission(
            session, user, "org_custom", OrgPermission.MANAGE_MEMBERS
        )


@pytest.mark.asyncio
async def test_enforce_organization_permission_non_member():
    session = AsyncMock()
    user = CurrentUserContext(id="stranger_1", role="LEARNER")

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    with pytest.raises(PermissionError):
        await enforce_organization_permission(session, user, "org_custom")


def test_enforce_course_ownership_unauthenticated():
    course = MagicMock()
    with pytest.raises(PermissionError):
        enforce_course_ownership(course, None)


def test_enforce_course_ownership_admin():
    course = MagicMock()
    user = CurrentUserContext(id="admin_1", role="ADMIN")
    enforce_course_ownership(course, user)


def test_enforce_course_ownership_can_edit_true():
    course = MagicMock()
    course.can_edit.return_value = True
    course.owner_id = "owner_1"
    course.co_instructor_ids = []
    user = CurrentUserContext(id="owner_1", role="INSTRUCTOR")
    enforce_course_ownership(course, user)
    course.can_edit.assert_called_once_with(user, allow_read_only_pending=False)


def test_enforce_course_ownership_can_edit_false():
    course = MagicMock()
    course.can_edit.return_value = False
    user = CurrentUserContext(id="stranger_1", role="INSTRUCTOR")
    with pytest.raises(PermissionError):
        enforce_course_ownership(course, user)


def test_enforce_course_ownership_fallback_attributes():
    class CustomCourse:
        owner_id = "owner_123"
        co_instructor_ids = ["co_1", "co_2"]

        def can_edit(self, user, allow_read_only_pending=False):
            return True

    course = CustomCourse()

    # Owner succeeds for all actions
    owner_user = CurrentUserContext(id="owner_123", role="INSTRUCTOR")
    enforce_course_ownership(
        course, owner_user, required_permission=CoursePermission.DELETE_COURSE
    )

    # Co-instructor succeeds for curriculum editing
    co_user = CurrentUserContext(id="co_1", role="INSTRUCTOR")
    enforce_course_ownership(
        course, co_user, required_permission=CoursePermission.MANAGE_CURRICULUM
    )

    # Co-instructor fails when attempting owner-only action (DELETE_COURSE)
    with pytest.raises(PermissionError):
        enforce_course_ownership(
            course, co_user, required_permission=CoursePermission.DELETE_COURSE
        )

    # Stranger fails
    stranger = CurrentUserContext(id="stranger_99", role="INSTRUCTOR")
    with pytest.raises(PermissionError):
        enforce_course_ownership(course, stranger)
