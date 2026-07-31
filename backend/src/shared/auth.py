from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import jwt
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.shared.config import settings

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

ADMIN_ROLES = {
    "SUPER_ADMIN",
    "ADMIN",
    "USER_ROLE_SUPER_ADMIN",
    "USER_ROLE_ADMIN",
    "ORGANIZATION ADMIN",
    "ORG_ADMIN",
    "ORG_OWNER",
}

STAFF_ROLES = ADMIN_ROLES | {
    "INSTRUCTOR",
    "TA",
    "USER_ROLE_INSTRUCTOR",
    "USER_ROLE_TA",
    "ORGANIZATION INSTRUCTOR",
    "ORG_INSTRUCTOR",
    "TEACHING ASSISTANT",
}


def is_admin_role(role: str | None) -> bool:
    """Returns True if the role string represents an administrative role."""
    if not role:
        return False
    role_upper = str(role).upper().strip()
    return role_upper in ADMIN_ROLES


def is_staff_role(role: str | None) -> bool:
    """Returns True if the role string represents a staff or admin role."""
    if not role:
        return False
    role_upper = str(role).upper().strip()
    return role_upper in STAFF_ROLES


@dataclass
class CurrentUserContext:
    """Rich security context supporting PBAC and Multi-Org active context."""

    id: str
    email: str = ""
    role: str = ""
    system_role: str = "USER"  # SUPER_ADMIN | USER
    active_org_id: Optional[str] = None
    org_role: Optional[str] = None
    permissions: set[str] = field(default_factory=set)

    def is_admin(self) -> bool:
        if self.is_system_admin() or is_admin_role(self.role):
            return True
        if self.org_role and self.org_role.upper() in (
            "ORGANIZATION ADMIN",
            "ORG_ADMIN",
            "ORG_OWNER",
        ):
            return True
        return False

    def is_staff(self) -> bool:
        if self.is_system_admin() or is_staff_role(self.role):
            return True
        if self.org_role and self.org_role.upper() in (
            "ORGANIZATION ADMIN",
            "ORG_ADMIN",
            "ORG_OWNER",
            "ORGANIZATION INSTRUCTOR",
            "ORG_INSTRUCTOR",
            "TEACHING ASSISTANT",
            "TA",
        ):
            return True
        return False

    def is_system_admin(self) -> bool:
        return self.system_role.upper() == "SUPER_ADMIN" or self.role in (
            "SUPER_ADMIN",
            "USER_ROLE_SUPER_ADMIN",
        )

    def has_permission(self, permission: str) -> bool:
        if self.is_system_admin():
            return True
        return permission in self.permissions

    def require_permission(self, permission: str) -> None:
        if not self.has_permission(permission):
            raise PermissionError(
                f"Yêu cầu quyền '{permission}' để thực hiện thao tác này"
            )

    def require_org_context(self) -> str:
        if not self.active_org_id:
            raise ValueError("Vui lòng chọn Tổ chức để thực hiện thao tác này")
        return self.active_org_id


CurrentUser = CurrentUserContext


_current_user_ctx: ContextVar[Optional[CurrentUserContext]] = ContextVar(
    "current_user", default=None
)


def set_current_user(user: Optional[CurrentUserContext]) -> None:
    _current_user_ctx.set(user)


def get_current_user() -> Optional[CurrentUserContext]:
    return _current_user_ctx.get()


def clear_current_user() -> None:
    _current_user_ctx.set(None)


def require_current_user() -> CurrentUserContext:
    user = _current_user_ctx.get()
    if not user or not user.id:
        raise ConnectError(
            Code.UNAUTHENTICATED, "Vui lòng đăng nhập để thực hiện thao tác này"
        )
    return user


def create_access_token(
    user_id: str,
    email: str,
    role: str,
    full_name: str = "",
    active_org_id: Optional[str] = None,
    system_role: str = "USER",
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "role": role,
        "full_name": full_name,
        "system_role": system_role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    if active_org_id:
        payload["active_org_id"] = active_org_id
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict[str, Any]]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.PyJWTError, Exception):
        return None
