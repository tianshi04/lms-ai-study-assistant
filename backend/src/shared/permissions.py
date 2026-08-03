"""Centralized Resource Authorization Guards for Organization and Course resources (BR_AUTH_001, BR_AUTH_002)."""

from enum import Enum
from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.identity.domain.constants import INTERNAL_SYSTEM_ORG_ID
from src.shared.auth import CurrentUserContext


class OrgRole(str, Enum):
    """Hardcoded static Organization roles."""

    OWNER = "OWNER"
    INSTRUCTOR = "INSTRUCTOR"
    TA = "TA"
    MEMBER = "MEMBER"


class OrgPermission(str, Enum):
    """Fine-grained Organization permission tokens."""

    MANAGE_MEMBERS = "org:manage_members"
    CREATE_COURSE = "org:create_course"
    MANAGE_COURSES = "org:manage_courses"
    VIEW_ANALYTICS = "org:view_analytics"


# Hardcoded Role-Permission Matrix in Backend Code
ROLE_PERMISSIONS: dict[OrgRole, set[OrgPermission]] = {
    OrgRole.OWNER: {
        OrgPermission.MANAGE_MEMBERS,
        OrgPermission.CREATE_COURSE,
        OrgPermission.MANAGE_COURSES,
        OrgPermission.VIEW_ANALYTICS,
    },
    OrgRole.INSTRUCTOR: {
        OrgPermission.CREATE_COURSE,
        OrgPermission.VIEW_ANALYTICS,
    },
    OrgRole.TA: {
        OrgPermission.CREATE_COURSE,
    },
    OrgRole.MEMBER: set(),
}


async def enforce_organization_permission(
    session: AsyncSession,
    user: Optional[CurrentUserContext],
    organization_id: str,
    required_permission: Optional[OrgPermission] = None,
) -> None:
    """Enforces Organization membership and code-hardcoded role permissions (ReBAC).

    Rules:
    1. Unauthenticated users are rejected if accessing private orgs.
    2. Super Admins bypass all org restrictions.
    3. Platform internal org (partner_community) or empty org_id allows public/general access.
    4. Authenticated users must belong to organization_id with active status.
    5. Validates required_permission against backend hardcoded ROLE_PERMISSIONS matrix.
    """
    if not organization_id or organization_id == INTERNAL_SYSTEM_ORG_ID:
        return

    if not user or not user.id:
        raise PermissionError("Vui lòng đăng nhập để truy cập Tổ chức này")

    if user.is_admin:
        return

    from src.modules.identity.infrastructure.models import OrganizationMemberModel

    stmt = select(OrganizationMemberModel).where(
        OrganizationMemberModel.organization_id == organization_id,
        OrganizationMemberModel.user_id == user.id,
        OrganizationMemberModel.status == "ACTIVE",
    )
    result = await session.execute(stmt)
    member = result.scalar_one_or_none()

    if not member:
        raise PermissionError(
            f"Tài khoản của bạn chưa thuộc hoặc không có quyền truy cập Tổ chức '{organization_id}'"
        )

    if required_permission is not None:
        role_str = str(
            getattr(member, "role_id", "") or getattr(member, "role", "")
        ).upper()

        allowed_permissions: set[OrgPermission] = set()
        if "OWNER" in role_str:
            allowed_permissions = ROLE_PERMISSIONS[OrgRole.OWNER]
        elif "INSTRUCTOR" in role_str:
            allowed_permissions = ROLE_PERMISSIONS[OrgRole.INSTRUCTOR]
        elif "TA" in role_str:
            allowed_permissions = ROLE_PERMISSIONS[OrgRole.TA]

        if required_permission not in allowed_permissions:
            raise PermissionError(
                f"Tài khoản của bạn không có quyền '{required_permission.value}' trong Tổ chức này"
            )


class CourseRole(str, Enum):
    """Hardcoded static Course roles."""

    OWNER = "OWNER"
    CO_INSTRUCTOR = "CO_INSTRUCTOR"
    TA = "TA"


class CoursePermission(str, Enum):
    """Fine-grained Course permission tokens."""

    EDIT_DETAILS = "course:edit_details"
    MANAGE_CURRICULUM = "course:manage_curriculum"
    SUBMIT_LAUNCH = "course:submit_launch"
    DELETE_COURSE = "course:delete"
    MANAGE_COLLABORATORS = "course:manage_collaborators"
    GRADE_ASSESSMENTS = "course:grade_assessments"


# Hardcoded Course Role-Permission Matrix in Backend Code
COURSE_ROLE_PERMISSIONS: dict[CourseRole, set[CoursePermission]] = {
    CourseRole.OWNER: {
        CoursePermission.EDIT_DETAILS,
        CoursePermission.MANAGE_CURRICULUM,
        CoursePermission.SUBMIT_LAUNCH,
        CoursePermission.DELETE_COURSE,
        CoursePermission.MANAGE_COLLABORATORS,
        CoursePermission.GRADE_ASSESSMENTS,
    },
    CourseRole.CO_INSTRUCTOR: {
        CoursePermission.EDIT_DETAILS,
        CoursePermission.MANAGE_CURRICULUM,
        CoursePermission.GRADE_ASSESSMENTS,
    },
    CourseRole.TA: {
        CoursePermission.MANAGE_CURRICULUM,
        CoursePermission.GRADE_ASSESSMENTS,
    },
}


def enforce_course_ownership(
    course: Any,
    user: Optional[CurrentUserContext],
    required_permission: Optional[CoursePermission] = None,
    action_name: str = "quản lý khóa học",
    allow_read_only_pending: bool = False,
) -> None:
    """Enforces Course resource ownership, lifecycle states, and fine-grained action permissions.

    Rules:
    1. Unauthenticated users are rejected.
    2. Super Admins possess global editing rights across all courses.
    3. Course owners (owner_id) and co-instructors (co_instructor_ids) have editing rights.
    4. Validates required_permission against COURSE_ROLE_PERMISSIONS matrix.
    5. Delegates lifecycle restriction checks to domain entity (can_edit).
    """
    if not user or not user.id:
        raise PermissionError("Vui lòng đăng nhập để thao tác trên khóa học")

    if user.is_admin:
        return

    if course is None:
        raise ValueError("Khóa học không tồn tại")

    if hasattr(course, "can_edit"):
        if not course.can_edit(user, allow_read_only_pending=allow_read_only_pending):
            raise PermissionError(
                f"Bạn không có quyền {action_name} này vì khóa học đang ở trạng thái không cho phép chỉnh sửa"
            )

    owner_id = getattr(course, "owner_id", "")
    co_instructors = getattr(course, "co_instructor_ids", []) or []
    ta_ids = getattr(course, "ta_ids", []) or []

    is_owner = user.id == owner_id
    is_co_instructor = user.id in co_instructors
    is_ta = user.id in ta_ids

    if not is_owner and not is_co_instructor and not is_ta:
        raise PermissionError(
            f"Bạn không có quyền {action_name} này vì bạn không phải là chủ sở hữu, giảng viên hoặc trợ giảng phụ trách"
        )

    if required_permission is not None:
        user_course_role: Optional[CourseRole] = None
        if is_owner:
            user_course_role = CourseRole.OWNER
        elif is_co_instructor:
            user_course_role = CourseRole.CO_INSTRUCTOR
        elif is_ta:
            user_course_role = CourseRole.TA

        if (
            user_course_role is None
            or required_permission not in COURSE_ROLE_PERMISSIONS[user_course_role]
        ):
            raise PermissionError(
                f"Tài khoản của bạn không có quyền '{required_permission.value}' đối với khóa học này"
            )
