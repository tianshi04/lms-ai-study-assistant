from typing import Any, Awaitable, Callable

from connectrpc.code import Code
from connectrpc.errors import ConnectError
from connectrpc.interceptor import UnaryInterceptor

from src.shared.auth import CurrentUser, decode_token, set_current_user
from src.shared.auth_policy import AuthPolicyRegistry
from src.shared.infrastructure.auth import (
    BearerTokenResolver,
    CookieTokenResolver,
    TokenResolverChain,
)
from src.shared.infrastructure.logging import reset_user_id, set_user_id


class AuthInterceptor(UnaryInterceptor):
    """ConnectRPC interceptor that validates JWT tokens via strategy chain and populates CurrentUser context based on Protobuf AuthPolicy."""

    def __init__(self, resolver_chain: TokenResolverChain | None = None) -> None:
        super().__init__()
        self._resolver_chain = resolver_chain or TokenResolverChain(
            [BearerTokenResolver(), CookieTokenResolver()]
        )

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

        # Extract metadata from RequestContext
        metadata = (
            getattr(ctx, "request_headers", None)
            or getattr(ctx, "invocation_metadata", None)
            or getattr(ctx, "headers", None)
            or {}
        )

        # Extract organization header if provided
        active_org_id = ""
        if hasattr(metadata, "get"):
            active_org_id = (
                metadata.get("x-organization-id", "")
                or metadata.get("X-Organization-Id", "")
                or metadata.get("x-org-id", "")
            )

        token = self._resolver_chain.resolve(metadata)
        current_user = None

        if token:
            payload = decode_token(token)
            if payload and payload.get("type") == "access" and payload.get("sub"):
                token_org_id = payload.get("active_org_id")
                effective_org_id = active_org_id or token_org_id or None
                current_user = CurrentUser(
                    id=payload.get("sub", ""),
                    email=payload.get("email", ""),
                    role=payload.get("role", "LEARNER"),
                    system_role=payload.get("system_role", "USER"),
                    active_org_id=effective_org_id,
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
        user_id_token = set_user_id(current_user.id) if current_user else None

        try:
            return await call_next(request, ctx)
        finally:
            set_current_user(None)
            if user_id_token is not None:
                reset_user_id(user_id_token)
