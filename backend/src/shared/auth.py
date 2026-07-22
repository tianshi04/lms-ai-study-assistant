from contextvars import ContextVar
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import jwt
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.shared.config import settings

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


@dataclass
class CurrentUser:
    id: str
    email: str = ""
    role: str = ""


_current_user_ctx: ContextVar[Optional[CurrentUser]] = ContextVar("current_user", default=None)


def set_current_user(user: Optional[CurrentUser]) -> None:
    _current_user_ctx.set(user)


def get_current_user() -> Optional[CurrentUser]:
    return _current_user_ctx.get()


def clear_current_user() -> None:
    _current_user_ctx.set(None)


def require_current_user() -> CurrentUser:
    user = _current_user_ctx.get()
    if not user or not user.id:
        raise ConnectError(Code.UNAUTHENTICATED, "Vui lòng đăng nhập để thực hiện thao tác này")
    return user


def create_access_token(user_id: str, email: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
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

