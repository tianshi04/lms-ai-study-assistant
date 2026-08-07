from typing import Any
import pytest
from connectrpc.code import Code
from connectrpc.errors import ConnectError

from src.shared.config import settings
from src.shared.infrastructure.interceptors import ErrorInterceptor


@pytest.mark.asyncio
async def test_error_interceptor_domain_exceptions() -> None:
    interceptor = ErrorInterceptor()

    # 1. ValueError -> INVALID_ARGUMENT
    async def call_val_error(req: Any, ctx: Any) -> Any:
        raise ValueError("Invalid argument format")

    with pytest.raises(ConnectError) as exc_info:
        await interceptor.intercept_unary(call_val_error, None, None)
    assert exc_info.value.code == Code.INVALID_ARGUMENT
    assert exc_info.value.message == "Invalid argument format"

    # 2. PermissionError -> PERMISSION_DENIED
    async def call_perm_error(req: Any, ctx: Any) -> Any:
        raise PermissionError("Access denied")

    with pytest.raises(ConnectError) as exc_info:
        await interceptor.intercept_unary(call_perm_error, None, None)
    assert exc_info.value.code == Code.PERMISSION_DENIED
    assert exc_info.value.message == "Access denied"

    # 3. KeyError -> NOT_FOUND
    async def call_key_error(req: Any, ctx: Any) -> Any:
        raise KeyError("course_id")

    with pytest.raises(ConnectError) as exc_info:
        await interceptor.intercept_unary(call_key_error, None, None)
    assert exc_info.value.code == Code.NOT_FOUND
    assert "'course_id'" in exc_info.value.message


@pytest.mark.asyncio
async def test_error_interceptor_unhandled_exception_in_dev(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "ENV", "development")
    interceptor = ErrorInterceptor()

    async def call_crash(req: Any, ctx: Any) -> Any:
        raise RuntimeError("Database connection crashed")

    with pytest.raises(ConnectError) as exc_info:
        await interceptor.intercept_unary(call_crash, None, None)

    assert exc_info.value.code == Code.INTERNAL
    assert (
        "Lỗi hệ thống nội bộ [RuntimeError]: Database connection crashed"
        in exc_info.value.message
    )


@pytest.mark.asyncio
async def test_error_interceptor_unhandled_exception_in_prod(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "ENV", "production")
    interceptor = ErrorInterceptor()

    async def call_crash(req: Any, ctx: Any) -> Any:
        raise RuntimeError("Sensitive DB string connection error")

    with pytest.raises(ConnectError) as exc_info:
        await interceptor.intercept_unary(call_crash, None, None)

    assert exc_info.value.code == Code.INTERNAL
    # In Prod: detail MUST be sanitized and MUST NOT expose exception message
    assert exc_info.value.message == "Lỗi hệ thống nội bộ"
    assert "Sensitive DB string" not in exc_info.value.message
