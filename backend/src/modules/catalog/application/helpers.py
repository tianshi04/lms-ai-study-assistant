"""Application-level helpers and shared guards for Catalog module."""

from src.modules.catalog.domain import (
    Course,
    CourseStatus,
    ICatalogRepository,
)
from src.shared.auth import CurrentUser
from src.shared.permissions import (
    CoursePermission,
    enforce_course_ownership,
)


async def verify_catalog_course_ownership(
    repo: ICatalogRepository,
    course_id: str,
    user: CurrentUser | None,
    action_name: str = "quản lý khóa học",
    allow_read_only_pending: bool = False,
    required_permission: CoursePermission | None = None,
    disallow_published_mutation: bool = False,
) -> Course:
    clean_course_id = course_id.strip() if course_id else ""
    if not clean_course_id:
        raise ValueError("Mã khóa học không được để trống")
    if not user:
        raise PermissionError(f"Bạn không có quyền {action_name}.")

    course = await repo.get_course_detail(clean_course_id)
    if not course:
        raise ValueError("Khóa học không tồn tại")

    enforce_course_ownership(
        course,
        user,
        required_permission=required_permission,
        action_name=action_name,
        allow_read_only_pending=allow_read_only_pending,
    )
    if (
        disallow_published_mutation
        and course.status == CourseStatus.PUBLISHED
        and not getattr(user, "is_admin", False)
    ):
        raise PermissionError(
            f"Không thể {action_name} này vì khóa học đã được xuất bản (PUBLISHED)."
        )
    return course
