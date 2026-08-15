from contextvars import ContextVar
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from connectrpc.code import Code
from connectrpc.errors import ConnectError
from uuid6 import uuid7

from src.shared.config import settings

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


@dataclass
class CurrentUserContext:
    """Single Identity Security Context."""

    id: str
    email: str = ""
    full_name: str = ""
    role: str = ""

    @property
    def is_admin(self) -> bool:
        if not self.role:
            return False
        r = self.role.upper()
        return "ADMIN" in r or self.role in ("3", "USER_ROLE_ADMIN")

    @property
    def is_instructor(self) -> bool:
        if not self.role:
            return False
        r = self.role.upper()
        return "INSTRUCTOR" in r or self.role in ("2", "USER_ROLE_INSTRUCTOR")

    @property
    def is_staff(self) -> bool:
        return self.is_admin or self.is_instructor


CurrentUser = CurrentUserContext


_current_user_ctx: ContextVar[CurrentUserContext | None] = ContextVar(
    "current_user", default=None
)


def set_current_user(user: CurrentUserContext | None) -> None:
    _current_user_ctx.set(user)


def get_current_user() -> CurrentUserContext | None:
    return _current_user_ctx.get()


def clear_current_user() -> None:
    _current_user_ctx.set(None)


def require_current_user() -> CurrentUserContext:
    user = get_current_user()
    if not user:
        raise ConnectError(Code.UNAUTHENTICATED, "Vui lòng đăng nhập để tiếp tục")
    return user


def create_access_token(
    user_id: str,
    email: str = "",
    full_name: str = "",
    role: str = "",
    avatar_url: str = "",
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "full_name": full_name,
        "role": str(role),
        "avatar_url": avatar_url,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "jti": str(uuid7()),
        "sub": user_id,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_google_temp_token(
    email: str,
    google_id: str,
    full_name: str = "",
    avatar_url: str = "",
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": google_id,
        "email": email,
        "full_name": full_name,
        "avatar_url": avatar_url,
        "type": "google_temp_registration",
        "iat": now,
        "exp": now + timedelta(minutes=15),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except (jwt.PyJWTError, ValueError, TypeError, AttributeError):
        return None
