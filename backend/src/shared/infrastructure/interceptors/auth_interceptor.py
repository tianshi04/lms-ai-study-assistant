from typing import Any, Awaitable, Callable

from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.interceptor import UnaryInterceptor

from src.shared.auth import CurrentUser, decode_token, set_current_user

PUBLIC_ENDPOINTS = {
    "/identity.v1.IdentityService/Login",
    "/identity.v1.IdentityService/Register",
    "/identity.v1.IdentityService/RefreshToken",
    "/catalog.v1.CatalogService/GetSpecialization",
    "/catalog.v1.CatalogService/ListCourses",
    "/catalog.v1.CatalogService/GetCourseDetail",
    "/catalog.v1.CatalogService/GetLessonDetail",
    "/certificate.v1.CertificateService/VerifyCertificatePublic",
}


class AuthInterceptor(UnaryInterceptor):
    """ConnectRPC interceptor that validates JWT tokens and populates CurrentUser context."""

    async def intercept_unary(
        self,
        call_next: Callable[[Any, Any], Awaitable[Any]],
        request: Any,
        ctx: Any,
    ) -> Any:
        # Check if the procedure/method is public
        method_path = ""
        method_info = getattr(ctx, "method", None)
        if method_info and hasattr(method_info, "service_name") and hasattr(method_info, "name"):
            method_path = f"/{method_info.service_name}/{method_info.name}"
        else:
            method_path = getattr(ctx, "path", "") or getattr(getattr(ctx, "spec", None), "path", "")

        if method_path in PUBLIC_ENDPOINTS:
            set_current_user(None)
            return await call_next(request, ctx)

        # Extract metadata headers from RequestContext / ctx
        metadata = (
            getattr(ctx, "request_headers", None)
            or getattr(ctx, "invocation_metadata", None)
            or getattr(ctx, "headers", None)
            or {}
        )
        auth_header = ""
        if isinstance(metadata, dict):
            auth_header = metadata.get("authorization", "") or metadata.get("Authorization", "")
        elif hasattr(metadata, "get"):
            auth_header = metadata.get("authorization", "") or metadata.get("Authorization", "")

        if not auth_header:
            raise ConnectError(Code.UNAUTHENTICATED, "Thiếu header Authorization")

        raw_header = str(auth_header).strip()
        token = raw_header[7:].strip() if raw_header.lower().startswith("bearer ") else raw_header

        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise ConnectError(Code.UNAUTHENTICATED, "Token xác thực không hợp lệ hoặc đã hết hạn")

        user_id = payload.get("sub", "")
        if not user_id:
            raise ConnectError(Code.UNAUTHENTICATED, "Token thiếu thông tin user_id")

        current_user = CurrentUser(
            id=user_id,
            email=payload.get("email", ""),
            role=payload.get("role", "LEARNER"),
        )
        set_current_user(current_user)

        try:
            return await call_next(request, ctx)
        finally:
            set_current_user(None)
