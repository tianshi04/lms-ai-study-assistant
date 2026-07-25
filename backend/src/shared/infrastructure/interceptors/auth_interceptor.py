from typing import Any, Awaitable, Callable

from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.interceptor import UnaryInterceptor

from src.shared.auth import CurrentUser, decode_token, set_current_user
from src.shared.auth_policy import AuthPolicyRegistry


class AuthInterceptor(UnaryInterceptor):
    """ConnectRPC interceptor that validates JWT tokens and populates CurrentUser context based on Protobuf AuthPolicy."""

    async def intercept_unary(
        self,
        call_next: Callable[[Any, Any], Awaitable[Any]],
        request: Any,
        ctx: Any,
    ) -> Any:
        # Resolve method path
        method_path = getattr(getattr(ctx, "spec", None), "path", "") or getattr(
            ctx, "path", ""
        )
        if not method_path:
            method_info = getattr(ctx, "method", None)
            if (
                method_info
                and hasattr(method_info, "service_name")
                and hasattr(method_info, "name")
            ):
                method_path = f"/{method_info.service_name}/{method_info.name}"

        is_public = AuthPolicyRegistry.is_public(method_path)

        # Extract authorization header from RequestContext
        metadata = (
            getattr(ctx, "request_headers", None)
            or getattr(ctx, "invocation_metadata", None)
            or getattr(ctx, "headers", None)
            or {}
        )
        auth_header = ""
        if hasattr(metadata, "get"):
            auth_header = metadata.get("authorization", "") or metadata.get(
                "Authorization", ""
            )

        current_user = None
        token = None

        if auth_header:
            raw_header = str(auth_header).strip()
            token = (
                raw_header[7:].strip()
                if raw_header.lower().startswith("bearer ")
                else raw_header
            )
        else:
            cookie_header = ""
            if hasattr(metadata, "get"):
                cookie_header = metadata.get("cookie", "") or metadata.get("Cookie", "")
            if cookie_header:
                from http.cookies import SimpleCookie

                try:
                    cookie = SimpleCookie()
                    cookie.load(str(cookie_header))
                    if "access_token" in cookie:
                        token = cookie["access_token"].value
                except Exception:
                    pass

        if token:
            payload = decode_token(token)
            if payload and payload.get("type") == "access" and payload.get("sub"):
                current_user = CurrentUser(
                    id=payload.get("sub", ""),
                    email=payload.get("email", ""),
                    role=payload.get("role", "LEARNER"),
                )
            elif not is_public:
                raise ConnectError(
                    Code.UNAUTHENTICATED, "Token xác thực không hợp lệ hoặc đã hết hạn"
                )
        elif not is_public:
            raise ConnectError(Code.UNAUTHENTICATED, "Thiếu header Authorization")

        # Validate authorization policy (e.g. ADMIN role check)
        AuthPolicyRegistry.authorize(method_path, current_user)

        set_current_user(current_user)

        try:
            return await call_next(request, ctx)
        finally:
            set_current_user(None)
