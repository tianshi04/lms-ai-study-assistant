from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.shared.auth import CurrentUser


def enforce_course_ownership(
    owner_id: str | None,
    co_instructor_ids: list[str] | None,
    user: CurrentUser,
    action_name: str = "quản lý khóa học",
) -> None:
    """Enforces that current user is super admin/organization admin or the owner/co-instructor of the course."""
    if not user or not user.id:
        raise ConnectError(
            Code.UNAUTHENTICATED, "Vui lòng đăng nhập để thực hiện thao tác này"
        )

    if user.is_admin():
        return

    is_owner = bool(owner_id and user.id == owner_id)
    is_co_instructor = bool(co_instructor_ids and user.id in co_instructor_ids)

    if not is_owner and not is_co_instructor:
        raise ConnectError(
            Code.PERMISSION_DENIED,
            f"Bạn không có quyền {action_name} này vì bạn không phải là chủ sở hữu hoặc giảng viên phụ trách.",
        )
