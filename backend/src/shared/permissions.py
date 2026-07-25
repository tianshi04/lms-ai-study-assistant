from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.shared.auth import CurrentUser


def enforce_course_ownership(
    owner_id: str,
    co_instructor_ids: list[str],
    user: CurrentUser,
    action_name: str = "quản lý khóa học",
) -> None:
    """Enforces that current user is super admin/partner admin or the owner/co-instructor of the course."""
    if not user or not user.id:
        raise ConnectError(
            Code.UNAUTHENTICATED, "Vui lòng đăng nhập để thực hiện thao tác này"
        )

    user_role = (user.role or "").upper()
    if user_role in (
        "USER_ROLE_SUPER_ADMIN",
        "USER_ROLE_PARTNER_ADMIN",
        "SUPER_ADMIN",
        "ADMIN",
    ):
        return

    # If owner_id is set and user is neither owner nor co-instructor
    if owner_id and user.id != owner_id and user.id not in (co_instructor_ids or []):
        raise ConnectError(
            Code.PERMISSION_DENIED,
            f"Bạn không có quyền {action_name} này vì bạn không phải là chủ sở hữu hoặc giảng viên phụ trách.",
        )
